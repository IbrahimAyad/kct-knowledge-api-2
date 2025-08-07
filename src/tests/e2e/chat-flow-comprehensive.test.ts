/**
 * Comprehensive End-to-End Chat Flow Tests - Phase 4
 * Testing all frameworks: Atelier AI, RESTORE™, PRECISION™
 */

import request from 'supertest';
import { Server } from 'http';
import WebSocket from 'ws';
import { setupTestApp } from '../helpers/test-app-factory';
import { logger } from '../../utils/logger';

interface ChatSession {
  sessionId: string;
  customerId?: string;
  framework?: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    metadata?: any;
  }>;
  satisfactionScore?: number;
  conversionOutcome?: boolean;
}

interface TestScenario {
  name: string;
  framework: 'atelier' | 'restore' | 'precision';
  userProfile: {
    type: 'new_customer' | 'returning_customer' | 'vip_customer';
    occasion?: string;
    budget?: string;
    urgency?: 'low' | 'medium' | 'high';
  };
  conversationFlow: Array<{
    userInput: string;
    expectedIntent?: string;
    expectedFramework?: string;
    expectedSatisfactionRange?: [number, number];
    shouldTriggerHandoff?: boolean;
  }>;
  expectedOutcomes: {
    minSatisfactionScore: number;
    shouldConvert: boolean;
    maxResponseTime: number;
    expectedFrameworkTransitions?: string[];
  };
}

describe('End-to-End Chat Flow Tests - All Frameworks', () => {
  let app: any;
  let server: Server;
  let wsServer: WebSocket.Server;
  let wsClient: WebSocket;

  const testScenarios: TestScenario[] = [
    // Atelier AI Framework Test
    {
      name: 'Atelier AI - Wedding Suit Consultation',
      framework: 'atelier',
      userProfile: {
        type: 'new_customer',
        occasion: 'wedding',
        budget: 'luxury',
        urgency: 'medium'
      },
      conversationFlow: [
        {
          userInput: "Hi, I need help finding the perfect wedding suit",
          expectedIntent: 'wedding_consultation',
          expectedFramework: 'atelier',
          expectedSatisfactionRange: [0.7, 1.0]
        },
        {
          userInput: "I'm getting married in 3 months and want something luxurious but not too flashy",
          expectedIntent: 'style_preferences',
          expectedSatisfactionRange: [0.8, 1.0]
        },
        {
          userInput: "What would you recommend for a beach wedding in the afternoon?",
          expectedIntent: 'occasion_specific_advice',
          expectedSatisfactionRange: [0.8, 1.0]
        },
        {
          userInput: "That sounds perfect! Can you show me some options?",
          expectedIntent: 'product_request',
          expectedSatisfactionRange: [0.8, 1.0]
        }
      ],
      expectedOutcomes: {
        minSatisfactionScore: 0.85,
        shouldConvert: true,
        maxResponseTime: 3000,
        expectedFrameworkTransitions: ['atelier']
      }
    },

    // RESTORE™ Framework Test
    {
      name: 'RESTORE™ - Customer Complaint Resolution',
      framework: 'restore',
      userProfile: {
        type: 'returning_customer',
        urgency: 'high'
      },
      conversationFlow: [
        {
          userInput: "I'm really frustrated! The suit I ordered doesn't fit properly and my event is tomorrow!",
          expectedIntent: 'complaint_urgent',
          expectedFramework: 'restore',
          expectedSatisfactionRange: [0.3, 0.6] // Low initially due to frustration
        },
        {
          userInput: "I can't believe this happened. I trusted you with my most important day.",
          expectedIntent: 'emotional_distress',
          expectedSatisfactionRange: [0.4, 0.7] // Should start improving
        },
        {
          userInput: "What can you do to fix this?",
          expectedIntent: 'solution_request',
          expectedSatisfactionRange: [0.6, 0.8] // Further improvement
        },
        {
          userInput: "That would actually work perfectly. Thank you for understanding.",
          expectedIntent: 'satisfaction_recovery',
          expectedSatisfactionRange: [0.8, 1.0] // Full recovery
        }
      ],
      expectedOutcomes: {
        minSatisfactionScore: 0.9, // Should achieve high satisfaction through RESTORE™
        shouldConvert: true,
        maxResponseTime: 2000,
        expectedFrameworkTransitions: ['restore']
      }
    },

    // PRECISION™ Framework Test
    {
      name: 'PRECISION™ - High-Value Sales Conversion',
      framework: 'precision',
      userProfile: {
        type: 'vip_customer',
        budget: 'premium',
        urgency: 'low'
      },
      conversationFlow: [
        {
          userInput: "I'm looking for something special for a corporate gala",
          expectedIntent: 'high_value_inquiry',
          expectedFramework: 'precision',
          expectedSatisfactionRange: [0.7, 0.9]
        },
        {
          userInput: "Price isn't a concern, I want the best you have",
          expectedIntent: 'premium_customer',
          expectedSatisfactionRange: [0.8, 1.0]
        },
        {
          userInput: "Tell me more about your most exclusive options",
          expectedIntent: 'luxury_exploration',
          expectedSatisfactionRange: [0.8, 1.0]
        },
        {
          userInput: "I'm interested. What's the process for getting fitted?",
          expectedIntent: 'purchase_intent',
          expectedSatisfactionRange: [0.9, 1.0]
        }
      ],
      expectedOutcomes: {
        minSatisfactionScore: 0.9,
        shouldConvert: true,
        maxResponseTime: 2500,
        expectedFrameworkTransitions: ['precision']
      }
    },

    // Multi-Framework Transition Test
    {
      name: 'Framework Transition - Problem to Sale',
      framework: 'restore', // Starts with problem
      userProfile: {
        type: 'returning_customer',
        urgency: 'medium'
      },
      conversationFlow: [
        {
          userInput: "I had an issue with my last order but I'd like to try again",
          expectedIntent: 'concern_with_interest',
          expectedFramework: 'restore',
          expectedSatisfactionRange: [0.5, 0.7]
        },
        {
          userInput: "The quality wasn't what I expected for the price I paid",
          expectedIntent: 'quality_concern',
          expectedSatisfactionRange: [0.6, 0.8]
        },
        {
          userInput: "I appreciate you addressing my concerns. Now I'm looking for a new suit for a promotion celebration",
          expectedIntent: 'transition_to_sales',
          expectedFramework: 'precision', // Should transition here
          expectedSatisfactionRange: [0.8, 1.0]
        },
        {
          userInput: "What would you recommend for someone who values quality and fit above all?",
          expectedIntent: 'premium_inquiry',
          expectedSatisfactionRange: [0.8, 1.0]
        }
      ],
      expectedOutcomes: {
        minSatisfactionScore: 0.85,
        shouldConvert: true,
        maxResponseTime: 3000,
        expectedFrameworkTransitions: ['restore', 'precision']
      }
    }
  ];

  beforeAll(async () => {
    ({ app, server } = await setupTestApp());
    
    // Wait for services to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
      wsClient.close();
    }
    if (server) {
      server.close();
    }
  });

  describe('Framework-Specific Flow Tests', () => {
    testScenarios.forEach((scenario) => {
      describe(`${scenario.name}`, () => {
        let chatSession: ChatSession;
        let wsConnection: WebSocket;

        beforeEach(async () => {
          // Start a new chat session
          const response = await request(app)
            .post('/api/v3/chat/conversation/start')
            .send({
              customer_id: `test_${scenario.userProfile.type}_${Date.now()}`,
              context: {
                occasion: scenario.userProfile.occasion,
                urgency: scenario.userProfile.urgency,
                preferred_framework: scenario.framework
              }
            })
            .expect(201);

          chatSession = {
            sessionId: response.body.sessionId,
            customerId: response.body.customerId,
            messages: []
          };

          // Establish WebSocket connection for real-time testing
          wsConnection = new WebSocket(`ws://localhost:8080`);
          await new Promise((resolve) => {
            wsConnection.on('open', () => {
              // Authenticate WebSocket
              wsConnection.send(JSON.stringify({
                type: 'authenticate',
                sessionId: chatSession.sessionId,
                customerId: chatSession.customerId
              }));
              resolve(void 0);
            });
          });
        });

        afterEach(() => {
          if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
            wsConnection.close();
          }
        });

        it('should execute the full conversation flow successfully', async () => {
          const conversationResults: any[] = [];

          for (let i = 0; i < scenario.conversationFlow.length; i++) {
            const step = scenario.conversationFlow[i];
            const startTime = Date.now();

            // Send message via API
            const response = await request(app)
              .post('/api/v3/chat/conversation/message')
              .send({
                session_id: chatSession.sessionId,
                message: step.userInput,
                context: {
                  step_number: i + 1,
                  test_scenario: scenario.name
                }
              })
              .expect(200);

            const responseTime = Date.now() - startTime;
            
            // Validate response structure
            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('confidence');
            expect(response.body).toHaveProperty('intent');
            expect(response.body).toHaveProperty('framework_used');
            
            // Validate response time
            expect(responseTime).toBeLessThan(scenario.expectedOutcomes.maxResponseTime);

            // Validate intent recognition (if specified)
            if (step.expectedIntent) {
              expect(response.body.intent.category).toContain(step.expectedIntent.split('_')[0]);
            }

            // Validate framework selection (if specified)
            if (step.expectedFramework) {
              expect(response.body.framework_used).toBe(step.expectedFramework);
            }

            // Validate satisfaction score range (if specified)
            if (step.expectedSatisfactionRange) {
              const satisfaction = response.body.satisfaction_prediction;
              expect(satisfaction).toBeGreaterThanOrEqual(step.expectedSatisfactionRange[0]);
              expect(satisfaction).toBeLessThanOrEqual(step.expectedSatisfactionRange[1]);
            }

            // Store conversation step
            chatSession.messages.push({
              role: 'user',
              content: step.userInput,
              timestamp: new Date()
            });

            chatSession.messages.push({
              role: 'assistant',
              content: response.body.message,
              timestamp: new Date(),
              metadata: {
                intent: response.body.intent,
                confidence: response.body.confidence,
                framework: response.body.framework_used,
                satisfaction: response.body.satisfaction_prediction
              }
            });

            conversationResults.push({
              step: i + 1,
              userInput: step.userInput,
              response: response.body,
              responseTime,
              satisfaction: response.body.satisfaction_prediction
            });

            // Small delay between messages to simulate realistic conversation
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          // Validate overall conversation outcomes
          const finalSatisfaction = conversationResults[conversationResults.length - 1].satisfaction;
          expect(finalSatisfaction).toBeGreaterThanOrEqual(scenario.expectedOutcomes.minSatisfactionScore);

          // Check framework transitions
          const frameworksUsed = conversationResults.map(r => r.response.framework_used);
          scenario.expectedOutcomes.expectedFrameworkTransitions?.forEach(expectedFramework => {
            expect(frameworksUsed).toContain(expectedFramework);
          });

          logger.info(`✅ Conversation flow completed for ${scenario.name}`, {
            finalSatisfaction,
            frameworksUsed: [...new Set(frameworksUsed)],
            averageResponseTime: conversationResults.reduce((sum, r) => sum + r.responseTime, 0) / conversationResults.length
          });
        });

        it('should handle real-time WebSocket interactions correctly', async () => {
          let messagesReceived: any[] = [];
          let typingIndicatorsReceived: any[] = [];

          // Set up WebSocket message handlers
          wsConnection.on('message', (data) => {
            const message = JSON.parse(data.toString());
            if (message.type === 'chat_response') {
              messagesReceived.push(message);
            } else if (message.type.includes('typing')) {
              typingIndicatorsReceived.push(message);
            }
          });

          // Send a message via WebSocket
          wsConnection.send(JSON.stringify({
            type: 'chat_message',
            content: scenario.conversationFlow[0].userInput,
            metadata: {
              test_scenario: scenario.name,
              websocket_test: true
            }
          }));

          // Wait for response
          await new Promise(resolve => setTimeout(resolve, 3000));

          // Validate WebSocket response
          expect(messagesReceived.length).toBeGreaterThan(0);
          expect(typingIndicatorsReceived.length).toBeGreaterThan(0);

          const lastMessage = messagesReceived[messagesReceived.length - 1];
          expect(lastMessage.sessionId).toBe(chatSession.sessionId);
          expect(lastMessage.message).toBeDefined();
          expect(lastMessage.confidence).toBeGreaterThan(0);

          logger.info(`✅ WebSocket interaction completed for ${scenario.name}`, {
            messagesReceived: messagesReceived.length,
            typingIndicators: typingIndicatorsReceived.length
          });
        });

        it('should maintain conversation context throughout the flow', async () => {
          const contextCheckpoints: any[] = [];

          for (let i = 0; i < Math.min(3, scenario.conversationFlow.length); i++) {
            const step = scenario.conversationFlow[i];

            const response = await request(app)
              .post('/api/v3/chat/conversation/message')
              .send({
                session_id: chatSession.sessionId,
                message: step.userInput
              })
              .expect(200);

            // Check that context is being maintained
            expect(response.body.context).toBeDefined();
            expect(response.body.context.conversation_history_length).toBe(i * 2 + 1); // Messages accumulate
            
            if (i > 0) {
              // Ensure context from previous messages is referenced
              expect(response.body.context.previous_intents).toBeDefined();
            }

            contextCheckpoints.push({
              step: i + 1,
              historyLength: response.body.context.conversation_history_length,
              contextKeys: Object.keys(response.body.context)
            });
          }

          logger.info(`✅ Context maintained throughout conversation for ${scenario.name}`, {
            contextCheckpoints
          });
        });
      });
    });
  });

  describe('Cross-Framework Integration Tests', () => {
    it('should handle framework transitions smoothly', async () => {
      // Start with a customer service issue (RESTORE™)
      let response = await request(app)
        .post('/api/v3/chat/conversation/start')
        .send({
          customer_id: 'cross_framework_test',
          context: { urgency: 'high', issue_type: 'complaint' }
        })
        .expect(201);

      const sessionId = response.body.sessionId;

      // First message: complaint (should trigger RESTORE™)
      response = await request(app)
        .post('/api/v3/chat/conversation/message')
        .send({
          session_id: sessionId,
          message: "I'm unhappy with my recent purchase and need this resolved"
        })
        .expect(200);

      expect(response.body.framework_used).toBe('restore');

      // Second message: problem resolved, now interested in new purchase (should transition to PRECISION™)
      response = await request(app)
        .post('/api/v3/chat/conversation/message')
        .send({
          session_id: sessionId,
          message: "Thanks for resolving that. Now I'm actually looking for a new tuxedo for a gala"
        })
        .expect(200);

      expect(response.body.framework_used).toBe('precision');

      // Validate smooth transition
      expect(response.body.context.framework_transition).toBeDefined();
      expect(response.body.satisfaction_prediction).toBeGreaterThan(0.7);
    });

    it('should escalate to human when framework confidence is low', async () => {
      const response = await request(app)
        .post('/api/v3/chat/conversation/start')
        .send({
          customer_id: 'escalation_test'
        })
        .expect(201);

      const sessionId = response.body.sessionId;

      // Send a complex message that might trigger escalation
      const messageResponse = await request(app)
        .post('/api/v3/chat/conversation/message')
        .send({
          session_id: sessionId,
          message: "I need help with a very specific alteration request for a vintage suit that involves custom fabric matching and precise measurements for a film production"
        })
        .expect(200);

      // Should either handle it with high confidence or suggest escalation
      if (messageResponse.body.confidence < 0.4) {
        expect(messageResponse.body.suggested_actions).toContainEqual(
          expect.objectContaining({ type: 'escalate_to_human' })
        );
      }
    });
  });

  describe('Performance and Reliability Tests', () => {
    it('should maintain performance under concurrent conversations', async () => {
      const concurrentSessions = 10;
      const promises: Promise<any>[] = [];

      for (let i = 0; i < concurrentSessions; i++) {
        const promise = async () => {
          const startResponse = await request(app)
            .post('/api/v3/chat/conversation/start')
            .send({
              customer_id: `concurrent_test_${i}`
            });

          const sessionId = startResponse.body.sessionId;

          const messageResponse = await request(app)
            .post('/api/v3/chat/conversation/message')
            .send({
              session_id: sessionId,
              message: `Test message from session ${i} for performance testing`
            });

          return {
            sessionId,
            responseTime: Date.now(),
            success: messageResponse.status === 200
          };
        };

        promises.push(promise());
      }

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // All should have different session IDs
      const sessionIds = results.map(r => r.sessionId);
      expect(new Set(sessionIds).size).toBe(concurrentSessions);

      logger.info(`✅ Performance test completed with ${concurrentSessions} concurrent sessions`);
    });

    it('should recover gracefully from service interruptions', async () => {
      // Start a conversation
      const response = await request(app)
        .post('/api/v3/chat/conversation/start')
        .send({
          customer_id: 'recovery_test'
        })
        .expect(201);

      const sessionId = response.body.sessionId;

      // Send a message
      await request(app)
        .post('/api/v3/chat/conversation/message')
        .send({
          session_id: sessionId,
          message: "Initial message"
        })
        .expect(200);

      // Simulate recovery after interruption (session should still be valid)
      const recoveryResponse = await request(app)
        .get(`/api/v3/chat/conversation/history/${sessionId}`)
        .expect(200);

      expect(recoveryResponse.body.messages).toBeDefined();
      expect(recoveryResponse.body.messages.length).toBeGreaterThan(0);
    });
  });

  describe('Quality Assurance Tests', () => {
    it('should maintain response quality metrics across all frameworks', async () => {
      const qualityTests = [
        { framework: 'atelier', message: "Help me choose a wedding suit", expectedMinConfidence: 0.8 },
        { framework: 'restore', message: "I'm having issues with my order", expectedMinConfidence: 0.7 },
        { framework: 'precision', message: "I want your best luxury options", expectedMinConfidence: 0.8 }
      ];

      for (const test of qualityTests) {
        const response = await request(app)
          .post('/api/v3/chat/conversation/start')
          .send({
            customer_id: `quality_test_${test.framework}`,
            context: { preferred_framework: test.framework }
          })
          .expect(201);

        const sessionId = response.body.sessionId;

        const messageResponse = await request(app)
          .post('/api/v3/chat/conversation/message')
          .send({
            session_id: sessionId,
            message: test.message
          })
          .expect(200);

        expect(messageResponse.body.confidence).toBeGreaterThanOrEqual(test.expectedMinConfidence);
        expect(messageResponse.body.framework_used).toBe(test.framework);
        expect(messageResponse.body.message.length).toBeGreaterThan(50); // Meaningful response
      }
    });

    it('should validate response appropriateness and safety', async () => {
      const response = await request(app)
        .post('/api/v3/chat/conversation/start')
        .send({
          customer_id: 'safety_test'
        })
        .expect(201);

      const sessionId = response.body.sessionId;

      const messageResponse = await request(app)
        .post('/api/v3/chat/conversation/message')
        .send({
          session_id: sessionId,
          message: "Tell me about your pricing and business information"
        })
        .expect(200);

      // Response should be safe and appropriate
      expect(messageResponse.body.safety_check).toBeDefined();
      expect(messageResponse.body.safety_check.is_safe).toBe(true);
      
      // Should not contain sensitive business information
      const message = messageResponse.body.message.toLowerCase();
      const restrictedTerms = ['internal', 'confidential', 'profit', 'cost', 'margin'];
      restrictedTerms.forEach(term => {
        expect(message).not.toContain(term);
      });
    });
  });
});