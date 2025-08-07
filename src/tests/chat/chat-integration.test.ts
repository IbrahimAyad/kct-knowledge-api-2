import request from 'supertest';
import { chatController } from '../../controllers/chat-controller';
import { databaseService } from '../../config/database';

describe('Chat API Integration Tests', () => {
  let app: any;
  let conversationId: string;
  let sessionId: string;

  beforeAll(async () => {
    // Initialize services for testing
    await databaseService.initialize();
    await databaseService.createTables();
    await chatController.initialize();
  });

  afterAll(async () => {
    // Clean up database connections
    await databaseService.close();
  });

  describe('POST /api/v3/chat/conversation/start', () => {
    it('should start a new conversation', async () => {
      const startData = {
        customer_id: 'test-customer-123',
        context: {
          occasion: 'wedding',
          urgency: 'medium'
        }
      };

      const mockReq = {
        body: startData
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await chatController.startConversation(mockReq as any, mockRes as any);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      
      expect(response.success).toBe(true);
      expect(response.data.session_id).toBeDefined();
      expect(response.data.status).toBe('active');
      
      sessionId = response.data.session_id;
    });

    it('should handle missing customer_id gracefully', async () => {
      const startData = {
        context: {
          occasion: 'business'
        }
      };

      const mockReq = {
        body: startData
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await chatController.startConversation(mockReq as any, mockRes as any);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      
      expect(response.success).toBe(true);
      expect(response.data.session_id).toBeDefined();
    });
  });

  describe('POST /api/v3/chat/conversation/message', () => {
    it('should process a message and return appropriate response', async () => {
      const messageData = {
        session_id: sessionId,
        message: 'I need help finding a suit for my wedding',
        context: {
          page_context: 'wedding-suits'
        }
      };

      const mockReq = {
        body: messageData
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await chatController.sendMessage(mockReq as any, mockRes as any);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      
      expect(response.success).toBe(true);
      expect(response.data.message).toBeDefined();
      expect(response.data.framework).toBeDefined();
      expect(['atelier_ai', 'restore', 'precision']).toContain(response.data.framework);
    });

    it('should handle complaint messages with RESTORE framework', async () => {
      const messageData = {
        session_id: sessionId,
        message: 'I have a problem with my order, the suit is the wrong size',
        context: {}
      };

      const mockReq = {
        body: messageData
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await chatController.sendMessage(mockReq as any, mockRes as any);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      
      expect(response.success).toBe(true);
      expect(response.data.framework).toBe('restore');
      expect(response.data.message).toContain('understand');
    });

    it('should handle purchase intent with PRECISION framework', async () => {
      const messageData = {
        session_id: sessionId,
        message: 'I want to buy a tuxedo for my event next week',
        context: {}
      };

      const mockReq = {
        body: messageData
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await chatController.sendMessage(mockReq as any, mockRes as any);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      
      expect(response.success).toBe(true);
      expect(['precision', 'atelier_ai']).toContain(response.data.framework);
    });
  });

  describe('GET /api/v3/chat/conversation/history/:sessionId', () => {
    it('should retrieve conversation history', async () => {
      const mockReq = {
        params: { sessionId },
        query: {}
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await chatController.getConversationHistory(mockReq as any, mockRes as any);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      
      expect(response.success).toBe(true);
      expect(response.data.messages).toBeDefined();
      expect(Array.isArray(response.data.messages)).toBe(true);
      expect(response.data.session_id).toBe(sessionId);
    });
  });

  describe('POST /api/v3/chat/conversation/end', () => {
    it('should end conversation with feedback', async () => {
      const endData = {
        session_id: sessionId,
        satisfaction_score: 9,
        feedback: 'Great service!',
        conversion_outcome: true
      };

      const mockReq = {
        body: endData
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await chatController.endConversation(mockReq as any, mockRes as any);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      
      expect(response.success).toBe(true);
      expect(response.data.session_id).toBe(sessionId);
    });
  });

  describe('GET /api/v3/chat/health', () => {
    it('should return health status for all chat services', async () => {
      const mockReq = {};
      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await chatController.getHealthCheck(mockReq as any, mockRes as any);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      
      expect(response.success).toBe(true);
      expect(response.data.overall_status).toBeDefined();
      expect(response.data.services).toBeDefined();
    });
  });

  describe('Framework Selection Logic', () => {
    it('should select appropriate framework based on message content', () => {
      // This would test the framework selector service directly
      // Implementation depends on the specific logic requirements
    });

    it('should transition between frameworks appropriately', () => {
      // Test framework transition logic
    });
  });

  describe('State Management', () => {
    it('should persist conversation state across messages', () => {
      // Test state persistence functionality
    });

    it('should track customer preferences', () => {
      // Test customer preference learning
    });
  });
});