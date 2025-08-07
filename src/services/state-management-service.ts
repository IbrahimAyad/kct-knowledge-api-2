import { v4 as uuidv4 } from 'uuid';
import { databaseService } from '../config/database';
import { logger } from '../utils/logger';
import { 
  ConversationState, 
  CustomerPreference,
  ConversationContext
} from '../types/chat';

export class StateManagementService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await databaseService.initialize();
      this.initialized = true;
      logger.info('✅ StateManagementService initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize StateManagementService:', error);
      throw error;
    }
  }

  // ============ Conversation State Management ============

  async setState(
    conversationId: string,
    stateKey: string,
    stateValue: any
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Use UPSERT logic - check if state exists first
      const existingState = await this.getState(conversationId, stateKey);
      
      if (existingState) {
        // Update existing state
        const sql = `
          UPDATE conversation_state 
          SET state_value = ?, updated_at = ?
          WHERE conversation_id = ? AND state_key = ?
        `;
        
        await databaseService.execute(sql, [
          JSON.stringify(stateValue),
          new Date().toISOString(),
          conversationId,
          stateKey
        ]);
      } else {
        // Insert new state
        const sql = `
          INSERT INTO conversation_state 
          (id, conversation_id, state_key, state_value) 
          VALUES (?, ?, ?, ?)
        `;

        await databaseService.execute(sql, [
          uuidv4(),
          conversationId,
          stateKey,
          JSON.stringify(stateValue)
        ]);
      }

      logger.debug(`✅ Set state ${stateKey} for conversation ${conversationId}`, {
        stateKey,
        stateValue: typeof stateValue === 'object' ? Object.keys(stateValue) : stateValue
      });
    } catch (error) {
      logger.error(`❌ Failed to set state ${stateKey} for conversation ${conversationId}:`, error);
      throw new Error('Failed to set conversation state');
    }
  }

  async getState(conversationId: string, stateKey: string): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const sql = `
        SELECT state_value FROM conversation_state 
        WHERE conversation_id = ? AND state_key = ?
      `;

      const rows = await databaseService.query(sql, [conversationId, stateKey]);
      
      if (rows.length === 0) {
        return null;
      }

      const stateValue = rows[0].state_value;
      
      try {
        return typeof stateValue === 'string' ? JSON.parse(stateValue) : stateValue;
      } catch {
        return stateValue;
      }
    } catch (error) {
      logger.error(`❌ Failed to get state ${stateKey} for conversation ${conversationId}:`, error);
      throw new Error('Failed to get conversation state');
    }
  }

  async getAllStates(conversationId: string): Promise<Record<string, any>> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const sql = `
        SELECT state_key, state_value FROM conversation_state 
        WHERE conversation_id = ?
      `;

      const rows = await databaseService.query(sql, [conversationId]);
      
      const states: Record<string, any> = {};
      
      rows.forEach(row => {
        try {
          states[row.state_key] = typeof row.state_value === 'string' 
            ? JSON.parse(row.state_value)
            : row.state_value;
        } catch {
          states[row.state_key] = row.state_value;
        }
      });

      return states;
    } catch (error) {
      logger.error(`❌ Failed to get all states for conversation ${conversationId}:`, error);
      throw new Error('Failed to get conversation states');
    }
  }

  async deleteState(conversationId: string, stateKey: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const sql = `
        DELETE FROM conversation_state 
        WHERE conversation_id = ? AND state_key = ?
      `;

      await databaseService.execute(sql, [conversationId, stateKey]);
      
      logger.debug(`✅ Deleted state ${stateKey} for conversation ${conversationId}`);
    } catch (error) {
      logger.error(`❌ Failed to delete state ${stateKey} for conversation ${conversationId}:`, error);
      throw new Error('Failed to delete conversation state');
    }
  }

  async clearConversationStates(conversationId: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const sql = 'DELETE FROM conversation_state WHERE conversation_id = ?';
      await databaseService.execute(sql, [conversationId]);
      
      logger.info(`✅ Cleared all states for conversation ${conversationId}`);
    } catch (error) {
      logger.error(`❌ Failed to clear states for conversation ${conversationId}:`, error);
      throw new Error('Failed to clear conversation states');
    }
  }

  // ============ Customer Preference Management ============

  async setCustomerPreference(
    customerId: string,
    preferenceKey: string,
    preferenceValue: any,
    learnedFromConversationId?: string,
    confidenceScore?: number
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Check if preference already exists
      const existingPreference = await this.getCustomerPreference(customerId, preferenceKey);
      
      if (existingPreference) {
        // Update existing preference
        const sql = `
          UPDATE customer_preferences 
          SET preference_value = ?, learned_from_conversation_id = ?, 
              confidence_score = ?, updated_at = ?
          WHERE customer_id = ? AND preference_key = ?
        `;
        
        await databaseService.execute(sql, [
          JSON.stringify(preferenceValue),
          learnedFromConversationId || null,
          confidenceScore || null,
          new Date().toISOString(),
          customerId,
          preferenceKey
        ]);
      } else {
        // Insert new preference
        const sql = `
          INSERT INTO customer_preferences 
          (id, customer_id, preference_key, preference_value, learned_from_conversation_id, confidence_score) 
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        await databaseService.execute(sql, [
          uuidv4(),
          customerId,
          preferenceKey,
          JSON.stringify(preferenceValue),
          learnedFromConversationId || null,
          confidenceScore || null
        ]);
      }

      logger.info(`✅ Set preference ${preferenceKey} for customer ${customerId}`, {
        preferenceKey,
        confidenceScore,
        learnedFromConversationId
      });
    } catch (error) {
      logger.error(`❌ Failed to set preference ${preferenceKey} for customer ${customerId}:`, error);
      throw new Error('Failed to set customer preference');
    }
  }

  async getCustomerPreference(customerId: string, preferenceKey: string): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const sql = `
        SELECT preference_value, confidence_score FROM customer_preferences 
        WHERE customer_id = ? AND preference_key = ?
      `;

      const rows = await databaseService.query(sql, [customerId, preferenceKey]);
      
      if (rows.length === 0) {
        return null;
      }

      const preferenceValue = rows[0].preference_value;
      
      try {
        return typeof preferenceValue === 'string' ? JSON.parse(preferenceValue) : preferenceValue;
      } catch {
        return preferenceValue;
      }
    } catch (error) {
      logger.error(`❌ Failed to get preference ${preferenceKey} for customer ${customerId}:`, error);
      throw new Error('Failed to get customer preference');
    }
  }

  async getAllCustomerPreferences(customerId: string): Promise<Record<string, any>> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const sql = `
        SELECT preference_key, preference_value, confidence_score FROM customer_preferences 
        WHERE customer_id = ?
      `;

      const rows = await databaseService.query(sql, [customerId]);
      
      const preferences: Record<string, any> = {};
      
      rows.forEach(row => {
        try {
          preferences[row.preference_key] = {
            value: typeof row.preference_value === 'string' 
              ? JSON.parse(row.preference_value)
              : row.preference_value,
            confidence: row.confidence_score
          };
        } catch {
          preferences[row.preference_key] = {
            value: row.preference_value,
            confidence: row.confidence_score
          };
        }
      });

      return preferences;
    } catch (error) {
      logger.error(`❌ Failed to get preferences for customer ${customerId}:`, error);
      throw new Error('Failed to get customer preferences');
    }
  }

  async deleteCustomerPreference(customerId: string, preferenceKey: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const sql = `
        DELETE FROM customer_preferences 
        WHERE customer_id = ? AND preference_key = ?
      `;

      await databaseService.execute(sql, [customerId, preferenceKey]);
      
      logger.info(`✅ Deleted preference ${preferenceKey} for customer ${customerId}`);
    } catch (error) {
      logger.error(`❌ Failed to delete preference ${preferenceKey} for customer ${customerId}:`, error);
      throw new Error('Failed to delete customer preference');
    }
  }

  // ============ Context Enhancement ============

  async enhanceContext(
    baseContext: ConversationContext,
    additionalData?: Record<string, any>
  ): Promise<ConversationContext> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const enhancedContext: ConversationContext = { ...baseContext };

      // Get all conversation states
      const conversationStates = await this.getAllStates(baseContext.sessionId);
      enhancedContext.sessionContext = {
        ...enhancedContext.sessionContext,
        ...conversationStates
      };

      // If customer ID is available, get all preferences
      if (baseContext.customerId) {
        const preferences = await this.getAllCustomerPreferences(baseContext.customerId);
        enhancedContext.customerPreferences = {
          ...enhancedContext.customerPreferences,
          ...preferences
        };
      }

      // Merge any additional data
      if (additionalData) {
        enhancedContext.sessionContext = {
          ...enhancedContext.sessionContext,
          ...additionalData
        };
      }

      return enhancedContext;
    } catch (error) {
      logger.error('❌ Failed to enhance conversation context:', error);
      // Return original context if enhancement fails
      return baseContext;
    }
  }

  async updateContextFromLearning(
    conversationId: string,
    customerId: string | undefined,
    insights: Record<string, any>
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Update conversation state with insights
      for (const [key, value] of Object.entries(insights)) {
        if (key.startsWith('context_')) {
          await this.setState(conversationId, key, value);
        } else if (key.startsWith('preference_') && customerId) {
          // Extract preference info and save to customer preferences
          const preferenceKey = key.replace('preference_', '');
          await this.setCustomerPreference(
            customerId,
            preferenceKey,
            value,
            conversationId,
            0.8 // Default confidence for learned preferences
          );
        }
      }

      logger.info(`✅ Updated context from learning for conversation ${conversationId}`, {
        insightKeys: Object.keys(insights),
        customerId
      });
    } catch (error) {
      logger.error(`❌ Failed to update context from learning for conversation ${conversationId}:`, error);
      throw new Error('Failed to update context from learning');
    }
  }

  async getStateHistory(conversationId: string, stateKey: string): Promise<Array<{ value: any; timestamp: Date }>> {
    // This would require a state history table - for now, return current state
    const currentState = await this.getState(conversationId, stateKey);
    return currentState ? [{ value: currentState, timestamp: new Date() }] : [];
  }

  async getHealthCheck(): Promise<{ status: string; totalStates: number; totalPreferences: number; timestamp: string }> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const statesResult = await databaseService.query('SELECT COUNT(*) as total FROM conversation_state');
      const preferencesResult = await databaseService.query('SELECT COUNT(*) as total FROM customer_preferences');
      
      return {
        status: 'healthy',
        totalStates: statesResult[0]?.total || 0,
        totalPreferences: preferencesResult[0]?.total || 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('❌ State management service health check failed:', error);
      return {
        status: 'unhealthy',
        totalStates: 0,
        totalPreferences: 0,
        timestamp: new Date().toISOString()
      };
    }
  }
}

export const stateManagementService = new StateManagementService();