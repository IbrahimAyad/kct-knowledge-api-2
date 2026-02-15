import { v4 as uuidv4 } from 'uuid';
import { databaseService } from '../config/database';
import { logger } from '../utils/logger';
import { 
  ConversationMessage, 
  MessageRole, 
  ResponseLayer,
  ConversationContext
} from '../types/chat';

export class MessageService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await databaseService.initialize();
      this.initialized = true;
      logger.info('✅ MessageService initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize MessageService:', error);
      throw error;
    }
  }

  async addMessage(
    conversationId: string,
    role: MessageRole,
    content: string,
    intent?: string,
    confidenceScore?: number,
    responseLayer?: ResponseLayer,
    context?: Record<string, any>
  ): Promise<ConversationMessage> {
    if (!this.initialized) {
      await this.initialize();
    }

    const messageId = uuidv4();
    const timestamp = new Date();

    try {
      const sql = `
        INSERT INTO conversation_messages 
        (id, conversation_id, role, content, intent, confidence_score, response_layer, context, timestamp) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await databaseService.execute(sql, [
        messageId,
        conversationId,
        role,
        content,
        intent || null,
        confidenceScore || null,
        responseLayer || null,
        context ? JSON.stringify(context) : null,
        timestamp.toISOString()
      ]);

      const message: ConversationMessage = {
        id: messageId,
        conversationId,
        role,
        content,
        intent,
        confidenceScore,
        responseLayer,
        context,
        timestamp
      };

      logger.info(`✅ Added ${role} message to conversation ${conversationId}`, {
        messageId,
        contentLength: content.length,
        intent,
        confidenceScore
      });

      return message;
    } catch (error) {
      logger.error(`❌ Failed to add message to conversation ${conversationId}:`, error);
      throw new Error('Failed to add message');
    }
  }

  async getConversationHistory(
    conversationId: string,
    limit?: number,
    offset?: number
  ): Promise<ConversationMessage[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      let sql = `
        SELECT * FROM conversation_messages 
        WHERE conversation_id = ? 
        ORDER BY timestamp ASC
      `;
      
      const params: any[] = [conversationId];

      if (limit) {
        sql += ' LIMIT ?';
        params.push(limit);
        
        if (offset) {
          sql += ' OFFSET ?';
          params.push(offset);
        }
      }

      const rows = await databaseService.query(sql, params);

      return rows.map(row => ({
        id: row.id,
        conversationId: row.conversation_id,
        role: row.role as MessageRole,
        content: row.content,
        intent: row.intent,
        confidenceScore: row.confidence_score,
        responseLayer: row.response_layer as ResponseLayer,
        context: typeof row.context === 'string' && row.context ? JSON.parse(row.context) : row.context,
        timestamp: new Date(row.timestamp)
      }));
    } catch (error) {
      logger.error(`❌ Failed to get conversation history for ${conversationId}:`, error);
      throw new Error('Failed to retrieve conversation history');
    }
  }

  async getRecentMessages(
    conversationId: string,
    count: number = 10
  ): Promise<ConversationMessage[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const sql = `
        SELECT * FROM conversation_messages 
        WHERE conversation_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `;

      const rows = await databaseService.query(sql, [conversationId, count]);

      return rows
        .map(row => ({
          id: row.id,
          conversationId: row.conversation_id,
          role: row.role as MessageRole,
          content: row.content,
          intent: row.intent,
          confidenceScore: row.confidence_score,
          responseLayer: row.response_layer as ResponseLayer,
          context: typeof row.context === 'string' && row.context ? JSON.parse(row.context) : row.context,
          timestamp: new Date(row.timestamp)
        }))
        .reverse(); // Reverse to get chronological order
    } catch (error) {
      logger.error(`❌ Failed to get recent messages for ${conversationId}:`, error);
      throw new Error('Failed to retrieve recent messages');
    }
  }

  async buildConversationContext(
    conversationId: string,
    sessionId: string,
    customerId?: string
  ): Promise<ConversationContext> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Get conversation details
      const conversationSql = `
        SELECT * FROM conversations WHERE id = ?
      `;
      const conversationRows = await databaseService.query(conversationSql, [conversationId]);
      
      if (conversationRows.length === 0) {
        throw new Error('Conversation not found');
      }

      const conversation = conversationRows[0];

      // Get conversation history
      const conversationHistory = await this.getRecentMessages(conversationId, 20);

      // Get customer preferences if customer ID is provided
      let customerPreferences: Record<string, any> = {};
      if (customerId) {
        const preferencesSql = `
          SELECT preference_key, preference_value, confidence_score 
          FROM customer_preferences 
          WHERE customer_id = ?
        `;
        const preferencesRows = await databaseService.query(preferencesSql, [customerId]);
        
        preferencesRows.forEach(row => {
          try {
            customerPreferences[row.preference_key] = typeof row.preference_value === 'string' 
              ? JSON.parse(row.preference_value)
              : row.preference_value;
          } catch {
            customerPreferences[row.preference_key] = row.preference_value;
          }
        });
      }

      // Parse session context
      let sessionContext: Record<string, any> = {};
      try {
        sessionContext = typeof conversation.context === 'string' 
          ? JSON.parse(conversation.context)
          : conversation.context || {};
      } catch {
        sessionContext = {};
      }

      const context: ConversationContext = {
        customerId,
        sessionId,
        frameworkType: conversation.framework_type,
        currentStage: conversation.current_stage,
        conversationHistory,
        customerPreferences,
        sessionContext
      };

      return context;
    } catch (error) {
      logger.error(`❌ Failed to build conversation context for ${conversationId}:`, error);
      throw new Error('Failed to build conversation context');
    }
  }

  async getMessagesByIntent(
    intent: string,
    limit: number = 50
  ): Promise<ConversationMessage[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const sql = `
        SELECT * FROM conversation_messages 
        WHERE intent = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `;

      const rows = await databaseService.query(sql, [intent, limit]);

      return rows.map(row => ({
        id: row.id,
        conversationId: row.conversation_id,
        role: row.role as MessageRole,
        content: row.content,
        intent: row.intent,
        confidenceScore: row.confidence_score,
        responseLayer: row.response_layer as ResponseLayer,
        context: typeof row.context === 'string' && row.context ? JSON.parse(row.context) : row.context,
        timestamp: new Date(row.timestamp)
      }));
    } catch (error) {
      logger.error(`❌ Failed to get messages by intent ${intent}:`, error);
      throw new Error('Failed to retrieve messages by intent');
    }
  }

  async getMessageStats(
    conversationId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
    averageResponseTime: number;
    intentDistribution: Array<{ intent: string; count: number }>;
  }> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const conditions: string[] = ['1=1'];
      const params: any[] = [];

      if (conversationId) {
        conditions.push('conversation_id = ?');
        params.push(conversationId);
      }

      if (startDate) {
        conditions.push('timestamp >= ?');
        params.push(startDate.toISOString());
      }

      if (endDate) {
        conditions.push('timestamp <= ?');
        params.push(endDate.toISOString());
      }

      const whereClause = conditions.join(' AND ');

      // Total messages by role
      const roleStatsResult = await databaseService.query(`
        SELECT 
          role,
          COUNT(*) as count
        FROM conversation_messages 
        WHERE ${whereClause}
        GROUP BY role
      `, params);

      let totalMessages = 0;
      let userMessages = 0;
      let assistantMessages = 0;

      roleStatsResult.forEach(row => {
        totalMessages += row.count;
        if (row.role === 'user') {
          userMessages = row.count;
        } else if (row.role === 'assistant') {
          assistantMessages = row.count;
        }
      });

      // Intent distribution
      const intentResult = await databaseService.query(`
        SELECT 
          intent,
          COUNT(*) as count
        FROM conversation_messages 
        WHERE ${whereClause} AND intent IS NOT NULL
        GROUP BY intent
        ORDER BY count DESC
        LIMIT 10
      `, params);

      const intentDistribution = intentResult.map(row => ({
        intent: row.intent,
        count: row.count
      }));

      return {
        totalMessages,
        userMessages,
        assistantMessages,
        averageResponseTime: 0, // This would require more complex timing analysis
        intentDistribution
      };
    } catch (error) {
      logger.error('❌ Failed to get message stats:', error);
      throw new Error('Failed to retrieve message statistics');
    }
  }

  async deleteConversationMessages(conversationId: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const sql = 'DELETE FROM conversation_messages WHERE conversation_id = ?';
      await databaseService.execute(sql, [conversationId]);
      
      logger.info(`✅ Deleted all messages for conversation ${conversationId}`);
    } catch (error) {
      logger.error(`❌ Failed to delete messages for conversation ${conversationId}:`, error);
      throw new Error('Failed to delete conversation messages');
    }
  }

  async getHealthCheck(): Promise<{ status: string; totalMessages: number; timestamp: string }> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const result = await databaseService.query('SELECT COUNT(*) as total FROM conversation_messages');
      
      return {
        status: 'healthy',
        totalMessages: result[0]?.total || 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('❌ Message service health check failed:', error);
      return {
        status: 'unhealthy',
        totalMessages: 0,
        timestamp: new Date().toISOString()
      };
    }
  }
}

export const messageService = new MessageService();