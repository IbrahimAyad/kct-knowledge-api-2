import { v4 as uuidv4 } from 'uuid';
import { databaseService } from '../config/database';
import { logger } from '../utils/logger';
import { 
  ConversationSession, 
  ConversationStatus, 
  ConversationFeedback,
  ConversationAnalytics,
  FrameworkType 
} from '../types/chat';

export class ConversationService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await databaseService.initialize();
      await databaseService.createTables();
      this.initialized = true;
      logger.info('✅ ConversationService initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize ConversationService:', error);
      throw error;
    }
  }

  async startConversation(
    customerId?: string,
    context: Record<string, any> = {}
  ): Promise<ConversationSession> {
    if (!this.initialized) {
      await this.initialize();
    }

    const sessionId = uuidv4();
    const conversationId = uuidv4();
    
    const conversation: Omit<ConversationSession, 'id' | 'startedAt'> = {
      customerId,
      sessionId,
      context,
      status: 'active' as ConversationStatus
    };

    try {
      const sql = `
        INSERT INTO conversations 
        (id, customer_id, session_id, context, status) 
        VALUES (?, ?, ?, ?, ?)
      `;
      
      await databaseService.execute(sql, [
        conversationId,
        customerId || null,
        sessionId,
        JSON.stringify(context),
        'active'
      ]);

      const newConversation: ConversationSession = {
        id: conversationId,
        ...conversation,
        startedAt: new Date()
      };

      logger.info(`✅ Started conversation: ${sessionId}`, {
        conversationId,
        customerId,
        sessionId
      });

      return newConversation;
    } catch (error) {
      logger.error(`❌ Failed to start conversation:`, error);
      throw new Error('Failed to start conversation');
    }
  }

  async getConversation(sessionId: string): Promise<ConversationSession | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const sql = `
        SELECT * FROM conversations 
        WHERE session_id = ? AND status = 'active'
      `;
      
      const rows = await databaseService.query(sql, [sessionId]);
      
      if (rows.length === 0) {
        return null;
      }

      const row = rows[0];
      return {
        id: row.id,
        customerId: row.customer_id,
        sessionId: row.session_id,
        frameworkType: row.framework_type as FrameworkType,
        currentStage: row.current_stage,
        context: typeof row.context === 'string' ? JSON.parse(row.context) : row.context,
        startedAt: new Date(row.started_at),
        endedAt: row.ended_at ? new Date(row.ended_at) : undefined,
        status: row.status as ConversationStatus,
        satisfactionScore: row.satisfaction_score,
        conversionOutcome: row.conversion_outcome
      };
    } catch (error) {
      logger.error(`❌ Failed to get conversation ${sessionId}:`, error);
      throw new Error('Failed to retrieve conversation');
    }
  }

  async updateConversation(
    sessionId: string, 
    updates: Partial<Pick<ConversationSession, 'frameworkType' | 'currentStage' | 'context' | 'status'>>
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const setParts: string[] = [];
      const values: any[] = [];

      if (updates.frameworkType !== undefined) {
        setParts.push('framework_type = ?');
        values.push(updates.frameworkType);
      }
      
      if (updates.currentStage !== undefined) {
        setParts.push('current_stage = ?');
        values.push(updates.currentStage);
      }
      
      if (updates.context !== undefined) {
        setParts.push('context = ?');
        values.push(JSON.stringify(updates.context));
      }
      
      if (updates.status !== undefined) {
        setParts.push('status = ?');
        values.push(updates.status);
      }

      if (setParts.length === 0) {
        return;
      }

      setParts.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(sessionId);

      const sql = `
        UPDATE conversations 
        SET ${setParts.join(', ')} 
        WHERE session_id = ?
      `;

      await databaseService.execute(sql, values);

      logger.info(`✅ Updated conversation ${sessionId}`, updates);
    } catch (error) {
      logger.error(`❌ Failed to update conversation ${sessionId}:`, error);
      throw new Error('Failed to update conversation');
    }
  }

  async endConversation(
    sessionId: string, 
    feedback?: ConversationFeedback
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const updates = {
        status: 'completed' as ConversationStatus,
        endedAt: new Date(),
        satisfactionScore: feedback?.satisfactionScore,
        conversionOutcome: feedback?.conversionOutcome
      };

      const sql = `
        UPDATE conversations 
        SET status = ?, ended_at = ?, satisfaction_score = ?, conversion_outcome = ?, updated_at = ?
        WHERE session_id = ?
      `;

      await databaseService.execute(sql, [
        updates.status,
        updates.endedAt.toISOString(),
        updates.satisfactionScore || null,
        updates.conversionOutcome || null,
        new Date().toISOString(),
        sessionId
      ]);

      // Record feedback as outcome if provided
      if (feedback) {
        await this.recordOutcome(sessionId, 'satisfaction', feedback.satisfactionScore, {
          feedback: feedback.feedback,
          conversionOutcome: feedback.conversionOutcome,
          issueResolved: feedback.issueResolved
        });
      }

      logger.info(`✅ Ended conversation ${sessionId}`, { feedback });
    } catch (error) {
      logger.error(`❌ Failed to end conversation ${sessionId}:`, error);
      throw new Error('Failed to end conversation');
    }
  }

  async recordOutcome(
    sessionId: string,
    outcomeType: 'conversion' | 'satisfaction' | 'resolution' | 'escalation',
    outcomeValue: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Get conversation ID from session ID
      const conversation = await this.getConversation(sessionId);
      if (!conversation) {
        throw new Error(`Conversation not found: ${sessionId}`);
      }

      const sql = `
        INSERT INTO conversation_outcomes 
        (id, conversation_id, outcome_type, outcome_value, metadata) 
        VALUES (?, ?, ?, ?, ?)
      `;

      await databaseService.execute(sql, [
        uuidv4(),
        conversation.id,
        outcomeType,
        outcomeValue,
        metadata ? JSON.stringify(metadata) : null
      ]);

      logger.info(`✅ Recorded outcome for ${sessionId}: ${outcomeType} = ${outcomeValue}`);
    } catch (error) {
      logger.error(`❌ Failed to record outcome for ${sessionId}:`, error);
      throw new Error('Failed to record conversation outcome');
    }
  }

  async getConversationAnalytics(
    startDate?: Date,
    endDate?: Date,
    customerId?: string
  ): Promise<ConversationAnalytics> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const conditions: string[] = ['1=1'];
      const params: any[] = [];

      if (startDate) {
        conditions.push('started_at >= ?');
        params.push(startDate.toISOString());
      }

      if (endDate) {
        conditions.push('started_at <= ?');
        params.push(endDate.toISOString());
      }

      if (customerId) {
        conditions.push('customer_id = ?');
        params.push(customerId);
      }

      const whereClause = conditions.join(' AND ');

      // Total conversations
      const totalResult = await databaseService.query(
        `SELECT COUNT(*) as total FROM conversations WHERE ${whereClause}`,
        params
      );
      const totalConversations = totalResult[0]?.total || 0;

      // Average satisfaction score
      const satisfactionResult = await databaseService.query(
        `SELECT AVG(satisfaction_score) as avg_satisfaction 
         FROM conversations 
         WHERE ${whereClause} AND satisfaction_score IS NOT NULL`,
        params
      );
      const averageSatisfactionScore = satisfactionResult[0]?.avg_satisfaction || 0;

      // Conversion rate
      const conversionResult = await databaseService.query(
        `SELECT 
           COUNT(*) as total,
           SUM(CASE WHEN conversion_outcome = 1 THEN 1 ELSE 0 END) as conversions
         FROM conversations 
         WHERE ${whereClause} AND conversion_outcome IS NOT NULL`,
        params
      );
      const conversionData = conversionResult[0];
      const conversionRate = conversionData?.total > 0 
        ? (conversionData.conversions / conversionData.total) * 100 
        : 0;

      // Average resolution time
      const resolutionResult = await databaseService.query(
        `SELECT AVG(
           CASE 
             WHEN ended_at IS NOT NULL 
             THEN (julianday(ended_at) - julianday(started_at)) * 24 * 60
             ELSE NULL 
           END
         ) as avg_resolution_minutes
         FROM conversations 
         WHERE ${whereClause} AND ended_at IS NOT NULL`,
        params
      );
      const averageResolutionTime = resolutionResult[0]?.avg_resolution_minutes || 0;

      // Framework usage
      const frameworkResult = await databaseService.query(
        `SELECT framework_type, COUNT(*) as count
         FROM conversations 
         WHERE ${whereClause} AND framework_type IS NOT NULL
         GROUP BY framework_type`,
        params
      );

      const frameworkUsage: Record<FrameworkType, number> = {
        atelier_ai: 0,
        restore: 0,
        precision: 0
      };

      frameworkResult.forEach(row => {
        if (row.framework_type in frameworkUsage) {
          frameworkUsage[row.framework_type as FrameworkType] = row.count;
        }
      });

      return {
        totalConversations,
        averageSatisfactionScore: Number(averageSatisfactionScore) || 0,
        conversionRate,
        averageResolutionTime,
        commonIntents: [], // This would require message analysis - to be implemented
        frameworkUsage
      };
    } catch (error) {
      logger.error('❌ Failed to get conversation analytics:', error);
      throw new Error('Failed to retrieve conversation analytics');
    }
  }

  async getActiveConversations(): Promise<ConversationSession[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const sql = `
        SELECT * FROM conversations 
        WHERE status = 'active' 
        ORDER BY started_at DESC
      `;
      
      const rows = await databaseService.query(sql);
      
      return rows.map(row => ({
        id: row.id,
        customerId: row.customer_id,
        sessionId: row.session_id,
        frameworkType: row.framework_type as FrameworkType,
        currentStage: row.current_stage,
        context: typeof row.context === 'string' ? JSON.parse(row.context) : row.context,
        startedAt: new Date(row.started_at),
        endedAt: row.ended_at ? new Date(row.ended_at) : undefined,
        status: row.status as ConversationStatus,
        satisfactionScore: row.satisfaction_score,
        conversionOutcome: row.conversion_outcome
      }));
    } catch (error) {
      logger.error('❌ Failed to get active conversations:', error);
      throw new Error('Failed to retrieve active conversations');
    }
  }

  async getHealthCheck(): Promise<{ status: string; activeConversations: number; timestamp: string }> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const activeResult = await databaseService.query(
        'SELECT COUNT(*) as active_count FROM conversations WHERE status = ?',
        ['active']
      );

      return {
        status: 'healthy',
        activeConversations: activeResult[0]?.active_count || 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('❌ Conversation service health check failed:', error);
      return {
        status: 'unhealthy',
        activeConversations: 0,
        timestamp: new Date().toISOString()
      };
    }
  }
}

export const conversationService = new ConversationService();