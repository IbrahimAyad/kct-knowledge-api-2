/**
 * Real-time Chat Service - Phase 2
 * WebSocket support, typing indicators, real-time sentiment monitoring, and conversation handoff
 */

import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../utils/logger';
import { cacheService } from './cache-service';
import { nlpIntelligenceService } from './nlp-intelligence-service';
import { contextAwarenessEngine } from './context-awareness-engine';
import { responseGenerationSystem } from './response-generation-system';
import { chatIntegrationService } from './chat-integration-service';

export interface WebSocketConnection {
  id: string;
  sessionId: string;
  customerId?: string;
  socket: WebSocket;
  isActive: boolean;
  lastActivity: Date;
  typing: boolean;
  capabilities: string[];
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    connectionTime: Date;
  };
}

export interface TypingIndicator {
  sessionId: string;
  isTyping: boolean;
  timestamp: Date;
  estimatedResponseTime?: number;
}

export interface RealtimeSentimentUpdate {
  sessionId: string;
  currentSentiment: {
    overall: 'positive' | 'negative' | 'neutral';
    emotional_state: string;
    confidence: number;
    urgency_level: string;
  };
  sentimentTrend: {
    direction: 'improving' | 'declining' | 'stable';
    velocity: number;
    historical_points: Array<{ timestamp: Date; sentiment: number }>;
  };
  alerts: Array<{
    type: 'escalation_needed' | 'satisfaction_drop' | 'engagement_loss';
    severity: 'low' | 'medium' | 'high';
    message: string;
  }>;
}

export interface ConversationHandoff {
  sessionId: string;
  handoffType: 'human_agent' | 'specialist' | 'manager' | 'technical_support';
  reason: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  context: {
    conversation_summary: string;
    customer_sentiment: string;
    issues_identified: string[];
    attempted_solutions: string[];
  };
  assignedAgent?: {
    id: string;
    name: string;
    specialty: string;
    availability: 'available' | 'busy' | 'away';
  };
  transferTime: Date;
  transferStatus: 'pending' | 'accepted' | 'completed' | 'failed';
}

export interface RealtimeNotification {
  id: string;
  sessionId: string;
  type: 'follow_up' | 'reminder' | 'promotion' | 'service_update';
  priority: 'low' | 'medium' | 'high';
  message: string;
  scheduledFor: Date;
  deliveredAt?: Date;
  actionRequired?: string;
  metadata: Record<string, any>;
}

class RealtimeChatService {
  private wss: WebSocketServer | null = null;
  private connections: Map<string, WebSocketConnection> = new Map();
  private sessionConnections: Map<string, string> = new Map(); // sessionId -> connectionId
  private typingIndicators: Map<string, TypingIndicator> = new Map();
  private sentimentMonitoring: Map<string, RealtimeSentimentUpdate> = new Map();
  private handoffQueue: Map<string, ConversationHandoff> = new Map();
  private notificationQueue: Map<string, RealtimeNotification[]> = new Map();
  private initialized = false;

  /**
   * Initialize the Real-time Chat Service
   */
  async initialize(port: number = 8080): Promise<void> {
    if (this.initialized) return;

    try {
      logger.info('⚡ Initializing Real-time Chat Service...');

      // Create WebSocket server
      this.wss = new WebSocketServer({ 
        port: port,
        perMessageDeflate: {
          zlibDeflateOptions: {
            level: 3
          }
        }
      });

      // Set up WebSocket event handlers
      this.setupWebSocketHandlers();

      // Start background processes
      this.startBackgroundProcesses();

      this.initialized = true;
      logger.info(`✅ Real-time Chat Service initialized on port ${port}`);

    } catch (error) {
      logger.error('❌ Failed to initialize Real-time Chat Service:', error);
      throw error;
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private setupWebSocketHandlers(): void {
    if (!this.wss) return;

    this.wss.on('connection', (ws: WebSocket, request) => {
      const connectionId = this.generateConnectionId();
      const ipAddress = request.socket.remoteAddress;
      const userAgent = request.headers['user-agent'];

      logger.info(`🔌 New WebSocket connection: ${connectionId}`);

      // Create connection object
      const connection: WebSocketConnection = {
        id: connectionId,
        sessionId: '', // Will be set on authentication
        socket: ws,
        isActive: true,
        lastActivity: new Date(),
        typing: false,
        capabilities: ['messaging', 'typing_indicators', 'file_upload'],
        metadata: {
          userAgent,
          ipAddress,
          connectionTime: new Date()
        }
      };

      this.connections.set(connectionId, connection);

      // Set up message handlers
      ws.on('message', async (data) => {
        await this.handleWebSocketMessage(connectionId, data);
      });

      ws.on('close', () => {
        this.handleDisconnection(connectionId);
      });

      ws.on('error', (error) => {
        logger.error(`WebSocket error for connection ${connectionId}:`, error);
        this.handleDisconnection(connectionId);
      });

      // Send welcome message
      this.sendToConnection(connectionId, {
        type: 'connection_established',
        connectionId: connectionId,
        capabilities: connection.capabilities,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleWebSocketMessage(connectionId: string, data: any): Promise<void> {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) return;

      connection.lastActivity = new Date();

      let message;
      try {
        message = JSON.parse(data.toString());
      } catch {
        this.sendError(connectionId, 'Invalid JSON message format');
        return;
      }

      switch (message.type) {
        case 'authenticate':
          await this.handleAuthentication(connectionId, message);
          break;

        case 'chat_message':
          await this.handleChatMessage(connectionId, message);
          break;

        case 'typing_start':
          await this.handleTypingStart(connectionId, message);
          break;

        case 'typing_stop':
          await this.handleTypingStop(connectionId, message);
          break;

        case 'request_handoff':
          await this.handleHandoffRequest(connectionId, message);
          break;

        case 'ping':
          this.sendToConnection(connectionId, { type: 'pong', timestamp: new Date().toISOString() });
          break;

        default:
          this.sendError(connectionId, `Unknown message type: ${message.type}`);
      }

    } catch (error) {
      logger.error(`Error handling WebSocket message for ${connectionId}:`, error);
      this.sendError(connectionId, 'Internal server error processing message');
    }
  }

  /**
   * Handle authentication
   */
  private async handleAuthentication(connectionId: string, message: any): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const { sessionId, customerId, authToken } = message;

    // Validate authentication (simplified for demo)
    if (!sessionId) {
      this.sendError(connectionId, 'Session ID is required');
      return;
    }

    // Update connection with session info
    connection.sessionId = sessionId;
    connection.customerId = customerId;

    // Map session to connection
    this.sessionConnections.set(sessionId, connectionId);

    // Initialize real-time monitoring for this session
    await this.initializeSessionMonitoring(sessionId);

    this.sendToConnection(connectionId, {
      type: 'authenticated',
      sessionId: sessionId,
      customerId: customerId,
      timestamp: new Date().toISOString()
    });

    logger.info(`✅ WebSocket authenticated for session: ${sessionId}`);
  }

  /**
   * Handle chat message
   */
  private async handleChatMessage(connectionId: string, message: any): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.sessionId) {
      this.sendError(connectionId, 'Connection not authenticated');
      return;
    }

    const { content, attachments, metadata } = message;

    try {
      // Stop typing indicator
      await this.handleTypingStop(connectionId, { sessionId: connection.sessionId });

      // Show AI typing indicator
      await this.showAITyping(connection.sessionId);

      // Process message through existing chat pipeline
      const nlpAnalysis = await nlpIntelligenceService.analyzeMessage({
        message: content,
        conversation_history: [], // Would get from context
        customer_context: metadata
      });

      // Update real-time sentiment monitoring
      await this.updateSentimentMonitoring(connection.sessionId, nlpAnalysis);

      // Get enhanced context
      const enhancedContext = await contextAwarenessEngine.buildEnhancedContext(
        connection.sessionId,
        [], // Would get conversation history
        connection.customerId
      );

      // Generate response
      const response = await responseGenerationSystem.generateResponse(
        nlpAnalysis.intent,
        enhancedContext,
        nlpAnalysis
      );

      // Hide AI typing indicator
      await this.hideAITyping(connection.sessionId);

      // Send response
      this.sendToConnection(connectionId, {
        type: 'chat_response',
        sessionId: connection.sessionId,
        message: response.message,
        confidence: response.confidence,
        suggested_actions: response.suggested_actions,
        metadata: response.metadata,
        timestamp: new Date().toISOString()
      });

      // Check for handoff triggers
      await this.checkHandoffTriggers(connection.sessionId, nlpAnalysis, response);

      logger.info(`💬 Processed real-time message for session: ${connection.sessionId}`);

    } catch (error) {
      await this.hideAITyping(connection.sessionId);
      logger.error(`Error processing chat message for ${connectionId}:`, error);
      this.sendError(connectionId, 'Failed to process message');
    }
  }

  /**
   * Handle typing start
   */
  private async handleTypingStart(connectionId: string, message: any): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.sessionId) return;

    connection.typing = true;

    const typingIndicator: TypingIndicator = {
      sessionId: connection.sessionId,
      isTyping: true,
      timestamp: new Date()
    };

    this.typingIndicators.set(connection.sessionId, typingIndicator);

    // Broadcast typing indicator to other connected clients (if any)
    this.broadcastTypingIndicator(connection.sessionId, typingIndicator);

    logger.debug(`⌨️ User typing started for session: ${connection.sessionId}`);
  }

  /**
   * Handle typing stop
   */
  private async handleTypingStop(connectionId: string, message: any): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.sessionId) return;

    connection.typing = false;

    const typingIndicator: TypingIndicator = {
      sessionId: connection.sessionId,
      isTyping: false,
      timestamp: new Date()
    };

    this.typingIndicators.set(connection.sessionId, typingIndicator);

    // Broadcast typing indicator to other connected clients (if any)
    this.broadcastTypingIndicator(connection.sessionId, typingIndicator);

    logger.debug(`⌨️ User typing stopped for session: ${connection.sessionId}`);
  }

  /**
   * Handle handoff request
   */
  private async handleHandoffRequest(connectionId: string, message: any): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.sessionId) return;

    const { handoffType, reason, urgency } = message;

    const handoff: ConversationHandoff = {
      sessionId: connection.sessionId,
      handoffType: handoffType || 'human_agent',
      reason: reason || 'Customer requested human assistance',
      urgency: urgency || 'medium',
      context: {
        conversation_summary: 'Customer requested handoff to human agent',
        customer_sentiment: 'neutral',
        issues_identified: [reason],
        attempted_solutions: []
      },
      transferTime: new Date(),
      transferStatus: 'pending'
    };

    this.handoffQueue.set(connection.sessionId, handoff);

    // Notify customer
    this.sendToConnection(connectionId, {
      type: 'handoff_initiated',
      sessionId: connection.sessionId,
      handoffType: handoff.handoffType,
      estimatedWaitTime: '2-5 minutes',
      message: 'I\'m connecting you with a human specialist who can better assist you.',
      timestamp: new Date().toISOString()
    });

    // Simulate agent assignment (in production, this would integrate with workforce management)
    setTimeout(() => {
      this.simulateAgentAssignment(connection.sessionId);
    }, 3000);

    logger.info(`🤝 Handoff requested for session: ${connection.sessionId}`);
  }

  /**
   * Show AI typing indicator
   */
  private async showAITyping(sessionId: string): Promise<void> {
    const connectionId = this.sessionConnections.get(sessionId);
    if (!connectionId) return;

    const estimatedResponseTime = this.calculateEstimatedResponseTime(sessionId);

    this.sendToConnection(connectionId, {
      type: 'ai_typing_start',
      sessionId: sessionId,
      estimatedResponseTime: estimatedResponseTime,
      timestamp: new Date().toISOString()
    });

    logger.debug(`🤖 AI typing started for session: ${sessionId}`);
  }

  /**
   * Hide AI typing indicator
   */
  private async hideAITyping(sessionId: string): Promise<void> {
    const connectionId = this.sessionConnections.get(sessionId);
    if (!connectionId) return;

    this.sendToConnection(connectionId, {
      type: 'ai_typing_stop',
      sessionId: sessionId,
      timestamp: new Date().toISOString()
    });

    logger.debug(`🤖 AI typing stopped for session: ${sessionId}`);
  }

  /**
   * Initialize session monitoring
   */
  private async initializeSessionMonitoring(sessionId: string): Promise<void> {
    const sentimentUpdate: RealtimeSentimentUpdate = {
      sessionId: sessionId,
      currentSentiment: {
        overall: 'neutral',
        emotional_state: 'engaged',
        confidence: 0.5,
        urgency_level: 'low'
      },
      sentimentTrend: {
        direction: 'stable',
        velocity: 0,
        historical_points: []
      },
      alerts: []
    };

    this.sentimentMonitoring.set(sessionId, sentimentUpdate);
  }

  /**
   * Update real-time sentiment monitoring
   */
  private async updateSentimentMonitoring(sessionId: string, nlpAnalysis: any): Promise<void> {
    const currentMonitoring = this.sentimentMonitoring.get(sessionId);
    if (!currentMonitoring) return;

    const previousSentiment = currentMonitoring.currentSentiment;
    const newSentiment = {
      overall: nlpAnalysis.sentiment.overall_sentiment,
      emotional_state: nlpAnalysis.sentiment.emotional_state,
      confidence: nlpAnalysis.sentiment.confidence,
      urgency_level: nlpAnalysis.sentiment.urgency_level
    };

    // Calculate sentiment trend
    const sentimentScore = this.calculateSentimentScore(newSentiment);
    const previousScore = this.calculateSentimentScore(previousSentiment);
    const velocity = sentimentScore - previousScore;

    // Update historical points
    currentMonitoring.sentimentTrend.historical_points.push({
      timestamp: new Date(),
      sentiment: sentimentScore
    });

    // Keep only last 10 points
    if (currentMonitoring.sentimentTrend.historical_points.length > 10) {
      currentMonitoring.sentimentTrend.historical_points.shift();
    }

    // Update trend direction
    currentMonitoring.sentimentTrend.direction = 
      velocity > 0.1 ? 'improving' : 
      velocity < -0.1 ? 'declining' : 'stable';
    currentMonitoring.sentimentTrend.velocity = velocity;

    // Update current sentiment
    currentMonitoring.currentSentiment = newSentiment;

    // Check for alerts
    const alerts = this.generateSentimentAlerts(currentMonitoring);
    currentMonitoring.alerts = alerts;

    // Update monitoring data
    this.sentimentMonitoring.set(sessionId, currentMonitoring);

    // Send real-time update if there are alerts
    if (alerts.length > 0) {
      await this.sendSentimentAlert(sessionId, currentMonitoring);
    }

    logger.debug(`📊 Sentiment updated for session ${sessionId}: ${newSentiment.overall} (${newSentiment.emotional_state})`);
  }

  /**
   * Check for handoff triggers
   */
  private async checkHandoffTriggers(sessionId: string, nlpAnalysis: any, response: any): Promise<void> {
    const sentiment = nlpAnalysis.sentiment;
    const shouldHandoff = 
      sentiment.emotional_state === 'frustrated' && sentiment.confidence > 0.8 ||
      sentiment.overall_sentiment === 'negative' && sentiment.urgency_level === 'critical' ||
      nlpAnalysis.intent.requiresEscalation ||
      response.confidence < 0.3;

    if (shouldHandoff) {
      const handoff: ConversationHandoff = {
        sessionId: sessionId,
        handoffType: 'human_agent',
        reason: this.determineHandoffReason(nlpAnalysis, response),
        urgency: sentiment.urgency_level as any,
        context: {
          conversation_summary: 'System detected need for human intervention',
          customer_sentiment: sentiment.emotional_state,
          issues_identified: this.extractIssues(nlpAnalysis),
          attempted_solutions: [response.message]
        },
        transferTime: new Date(),
        transferStatus: 'pending'
      };

      this.handoffQueue.set(sessionId, handoff);

      // Notify customer proactively
      const connectionId = this.sessionConnections.get(sessionId);
      if (connectionId) {
        this.sendToConnection(connectionId, {
          type: 'handoff_suggested',
          sessionId: sessionId,
          reason: 'I want to make sure you get the best possible help',
          message: 'Would you like me to connect you with one of our human specialists?',
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`🚨 Automatic handoff triggered for session: ${sessionId}`);
    }
  }

  /**
   * Simulate agent assignment (production would integrate with workforce management)
   */
  private async simulateAgentAssignment(sessionId: string): Promise<void> {
    const handoff = this.handoffQueue.get(sessionId);
    if (!handoff) return;

    // Simulate finding available agent
    handoff.assignedAgent = {
      id: 'agent_001',
      name: 'Sarah Johnson',
      specialty: 'Formal Menswear Specialist',
      availability: 'available'
    };

    handoff.transferStatus = 'accepted';
    this.handoffQueue.set(sessionId, handoff);

    // Notify customer
    const connectionId = this.sessionConnections.get(sessionId);
    if (connectionId) {
      this.sendToConnection(connectionId, {
        type: 'agent_assigned',
        sessionId: sessionId,
        agent: handoff.assignedAgent,
        message: `${handoff.assignedAgent.name} is now available to assist you with your ${handoff.assignedAgent.specialty.toLowerCase()} needs.`,
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`👤 Agent assigned for session: ${sessionId} - ${handoff.assignedAgent.name}`);
  }

  /**
   * Send sentiment alert
   */
  private async sendSentimentAlert(sessionId: string, monitoring: RealtimeSentimentUpdate): Promise<void> {
    const connectionId = this.sessionConnections.get(sessionId);
    if (!connectionId) return;

    // Only send high priority alerts to customer
    const highPriorityAlerts = monitoring.alerts.filter(alert => alert.severity === 'high');
    
    if (highPriorityAlerts.length > 0) {
      // In production, this might trigger internal notifications rather than customer-facing ones
      logger.warn(`🚨 High priority sentiment alert for session ${sessionId}:`, highPriorityAlerts);
    }
  }

  /**
   * Start background processes
   */
  private startBackgroundProcesses(): void {
    // Cleanup inactive connections every 5 minutes
    setInterval(() => {
      this.cleanupInactiveConnections();
    }, 5 * 60 * 1000);

    // Process notification queue every minute
    setInterval(() => {
      this.processNotificationQueue();
    }, 60 * 1000);

    // Clear old typing indicators every 30 seconds
    setInterval(() => {
      this.clearStaleTypingIndicators();
    }, 30 * 1000);

    logger.info('⚙️ Background processes started');
  }

  /**
   * Utility methods
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private calculateEstimatedResponseTime(sessionId: string): number {
    // Base response time + complexity factor
    return 2000 + Math.random() * 3000; // 2-5 seconds
  }

  private calculateSentimentScore(sentiment: any): number {
    let score = 0.5; // neutral baseline
    
    if (sentiment.overall === 'positive') score += 0.3;
    if (sentiment.overall === 'negative') score -= 0.3;
    
    if (sentiment.emotional_state === 'excited') score += 0.2;
    if (sentiment.emotional_state === 'frustrated') score -= 0.4;
    if (sentiment.emotional_state === 'anxious') score -= 0.2;
    
    return Math.max(0, Math.min(1, score));
  }

  private generateSentimentAlerts(monitoring: RealtimeSentimentUpdate): Array<any> {
    const alerts: Array<any> = [];
    const { currentSentiment, sentimentTrend } = monitoring;

    // Check for escalation needs
    if (currentSentiment.emotional_state === 'frustrated' && currentSentiment.confidence > 0.8) {
      alerts.push({
        type: 'escalation_needed',
        severity: 'high',
        message: 'Customer showing signs of frustration - consider human handoff'
      });
    }

    // Check for satisfaction drops
    if (sentimentTrend.direction === 'declining' && Math.abs(sentimentTrend.velocity) > 0.3) {
      alerts.push({
        type: 'satisfaction_drop',
        severity: 'medium',
        message: 'Customer satisfaction declining rapidly'
      });
    }

    // Check for engagement loss
    if (currentSentiment.urgency_level === 'low' && sentimentTrend.direction === 'declining') {
      alerts.push({
        type: 'engagement_loss',
        severity: 'low',
        message: 'Customer engagement may be waning'
      });
    }

    return alerts;
  }

  private determineHandoffReason(nlpAnalysis: any, response: any): string {
    if (nlpAnalysis.sentiment.emotional_state === 'frustrated') {
      return 'Customer frustration detected';
    }
    if (nlpAnalysis.intent.requiresEscalation) {
      return 'Customer explicitly requested escalation';
    }
    if (response.confidence < 0.3) {
      return 'Low confidence in AI response';
    }
    return 'Automatic handoff triggered';
  }

  private extractIssues(nlpAnalysis: any): string[] {
    const issues: string[] = [];
    
    if (nlpAnalysis.intent.category === 'complaint') {
      issues.push('Customer complaint');
    }
    if (nlpAnalysis.sentiment.emotional_state === 'frustrated') {
      issues.push('Customer frustration');
    }
    if (nlpAnalysis.sentiment.urgency_level === 'critical') {
      issues.push('Urgent request');
    }
    
    return issues;
  }

  private broadcastTypingIndicator(sessionId: string, indicator: TypingIndicator): void {
    // In a multi-agent system, this would broadcast to other agents/supervisors
    logger.debug(`📡 Broadcasting typing indicator for session: ${sessionId}`);
  }

  private sendToConnection(connectionId: string, message: any): void {
    const connection = this.connections.get(connectionId);
    if (connection && connection.socket.readyState === WebSocket.OPEN) {
      connection.socket.send(JSON.stringify(message));
    }
  }

  private sendError(connectionId: string, error: string): void {
    this.sendToConnection(connectionId, {
      type: 'error',
      error: error,
      timestamp: new Date().toISOString()
    });
  }

  private handleDisconnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.isActive = false;
      
      // Clean up session mapping
      if (connection.sessionId) {
        this.sessionConnections.delete(connection.sessionId);
        this.typingIndicators.delete(connection.sessionId);
      }
      
      this.connections.delete(connectionId);
      logger.info(`🔌 WebSocket disconnected: ${connectionId}`);
    }
  }

  private cleanupInactiveConnections(): void {
    const now = new Date();
    const timeout = 30 * 60 * 1000; // 30 minutes

    for (const [connectionId, connection] of this.connections.entries()) {
      if (now.getTime() - connection.lastActivity.getTime() > timeout) {
        logger.info(`🧹 Cleaning up inactive connection: ${connectionId}`);
        connection.socket.terminate();
        this.handleDisconnection(connectionId);
      }
    }
  }

  private clearStaleTypingIndicators(): void {
    const now = new Date();
    const timeout = 5 * 1000; // 5 seconds

    for (const [sessionId, indicator] of this.typingIndicators.entries()) {
      if (indicator.isTyping && now.getTime() - indicator.timestamp.getTime() > timeout) {
        indicator.isTyping = false;
        this.typingIndicators.set(sessionId, indicator);
        
        // Broadcast stopped typing
        this.broadcastTypingIndicator(sessionId, indicator);
      }
    }
  }

  private async processNotificationQueue(): Promise<void> {
    const now = new Date();
    
    for (const [sessionId, notifications] of this.notificationQueue.entries()) {
      const dueNotifications = notifications.filter(n => n.scheduledFor <= now && !n.deliveredAt);
      
      for (const notification of dueNotifications) {
        const connectionId = this.sessionConnections.get(sessionId);
        if (connectionId) {
          this.sendToConnection(connectionId, {
            type: 'notification',
            notification: {
              id: notification.id,
              type: notification.type,
              message: notification.message,
              priority: notification.priority,
              actionRequired: notification.actionRequired
            },
            timestamp: new Date().toISOString()
          });
          
          notification.deliveredAt = new Date();
        }
      }
      
      // Remove delivered notifications
      const remainingNotifications = notifications.filter(n => !n.deliveredAt);
      if (remainingNotifications.length === 0) {
        this.notificationQueue.delete(sessionId);
      } else {
        this.notificationQueue.set(sessionId, remainingNotifications);
      }
    }
  }

  /**
   * Schedule a follow-up notification
   */
  async scheduleNotification(notification: RealtimeNotification): Promise<void> {
    const sessionNotifications = this.notificationQueue.get(notification.sessionId) || [];
    sessionNotifications.push(notification);
    this.notificationQueue.set(notification.sessionId, sessionNotifications);

    logger.info(`📅 Notification scheduled for session ${notification.sessionId}: ${notification.type}`);
  }

  /**
   * Get real-time session status
   */
  async getSessionStatus(sessionId: string): Promise<{
    connected: boolean;
    typing: boolean;
    sentiment: any;
    handoff_status: string;
    agent_assigned?: any;
  }> {
    const connectionId = this.sessionConnections.get(sessionId);
    const typing = this.typingIndicators.get(sessionId);
    const sentiment = this.sentimentMonitoring.get(sessionId);
    const handoff = this.handoffQueue.get(sessionId);

    return {
      connected: !!connectionId && this.connections.get(connectionId)?.isActive === true,
      typing: typing?.isTyping || false,
      sentiment: sentiment?.currentSentiment || null,
      handoff_status: handoff?.transferStatus || 'none',
      agent_assigned: handoff?.assignedAgent || null
    };
  }

  /**
   * Send manual message to session
   */
  async sendMessageToSession(sessionId: string, message: any): Promise<boolean> {
    const connectionId = this.sessionConnections.get(sessionId);
    if (!connectionId) return false;

    this.sendToConnection(connectionId, {
      type: 'system_message',
      sessionId: sessionId,
      ...message,
      timestamp: new Date().toISOString()
    });

    return true;
  }

  /**
   * Get health check for real-time service
   */
  async getHealthCheck(): Promise<{
    status: string;
    websocket_server: boolean;
    active_connections: number;
    active_sessions: number;
    handoff_queue_size: number;
  }> {
    return {
      status: this.initialized ? 'healthy' : 'initializing',
      websocket_server: !!this.wss,
      active_connections: this.connections.size,
      active_sessions: this.sessionConnections.size,
      handoff_queue_size: this.handoffQueue.size
    };
  }

  /**
   * Shutdown the service gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('🔄 Shutting down Real-time Chat Service...');

    // Close all connections
    for (const connection of this.connections.values()) {
      connection.socket.close(1000, 'Server shutting down');
    }

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }

    // Clear all data structures
    this.connections.clear();
    this.sessionConnections.clear();
    this.typingIndicators.clear();
    this.sentimentMonitoring.clear();
    this.handoffQueue.clear();
    this.notificationQueue.clear();

    this.initialized = false;
    logger.info('✅ Real-time Chat Service shutdown complete');
  }
}

export const realtimeChatService = new RealtimeChatService();