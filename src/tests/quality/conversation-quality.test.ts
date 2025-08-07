/**
 * Conversation Quality Tests - Phase 4
 * Automated scoring and validation for conversation quality
 */

import { logger } from '../../utils/logger';
import { setupTestApp } from '../helpers/test-app-factory';
import request from 'supertest';

interface ConversationQualityMetrics {
  coherence: number;           // 0-1: Logical flow and consistency
  relevance: number;           // 0-1: Responses match user intent
  helpfulness: number;         // 0-1: Practical value to user
  empathy: number;             // 0-1: Emotional appropriateness
  completeness: number;        // 0-1: Thorough coverage of topic
  clarity: number;             // 0-1: Clear and understandable
  professionalism: number;     // 0-1: Brand-appropriate tone
  actionability: number;       // 0-1: Provides clear next steps
}

interface QualityTestScenario {
  name: string;
  category: 'product_inquiry' | 'complaint' | 'sizing_help' | 'occasion_advice' | 'pricing' | 'policy';
  conversationFlow: Array<{
    userMessage: string;
    expectedQualities: Partial<ConversationQualityMetrics>;
    mustContain?: string[];
    mustNotContain?: string[];
    expectedFramework?: string;
    contextRequirements?: string[];
  }>;
  overallQualityThresholds: ConversationQualityMetrics;
}

interface QualityAssessment {
  scenario: string;
  conversationId: string;
  stepAssessments: Array<{
    stepNumber: number;
    userMessage: string;
    aiResponse: string;
    qualityScores: ConversationQualityMetrics;
    issues: string[];
    strengths: string[];
    suggestions: string[];
  }>;
  overallQuality: ConversationQualityMetrics;
  passed: boolean;
  failureReasons: string[];
}

class ConversationQualityAnalyzer {
  
  /**
   * Analyze conversation quality using multiple criteria
   */
  async analyzeConversation(
    userMessage: string,
    aiResponse: string,
    context: any,
    expectedQualities?: Partial<ConversationQualityMetrics>
  ): Promise<{
    scores: ConversationQualityMetrics;
    issues: string[];
    strengths: string[];
    suggestions: string[];
  }> {
    
    const scores: ConversationQualityMetrics = {
      coherence: this.assessCoherence(userMessage, aiResponse, context),
      relevance: this.assessRelevance(userMessage, aiResponse),
      helpfulness: this.assessHelpfulness(userMessage, aiResponse),
      empathy: this.assessEmpathy(userMessage, aiResponse),
      completeness: this.assessCompleteness(userMessage, aiResponse),
      clarity: this.assessClarity(aiResponse),
      professionalism: this.assessProfessionalism(aiResponse),
      actionability: this.assessActionability(aiResponse)
    };

    const issues: string[] = [];
    const strengths: string[] = [];
    const suggestions: string[] = [];

    // Identify issues and strengths
    Object.entries(scores).forEach(([metric, score]) => {
      if (score < 0.5) {
        issues.push(`Low ${metric} score: ${score.toFixed(2)}`);
        suggestions.push(this.getSuggestion(metric as keyof ConversationQualityMetrics, score));
      } else if (score > 0.8) {
        strengths.push(`High ${metric} score: ${score.toFixed(2)}`);
      }
    });

    // Additional context-specific analysis
    this.analyzeContextualQuality(userMessage, aiResponse, context, issues, strengths, suggestions);

    return { scores, issues, strengths, suggestions };
  }

  private assessCoherence(userMessage: string, aiResponse: string, context: any): number {
    let score = 0.7; // Base score

    // Check if response follows logically from user message
    if (this.isResponseRelevantToMessage(userMessage, aiResponse)) {
      score += 0.2;
    }

    // Check context continuity
    if (context.conversation_history && this.maintainsContextualCoherence(aiResponse, context)) {
      score += 0.1;
    }

    // Penalize contradictions
    if (this.containsContradictions(aiResponse)) {
      score -= 0.3;
    }

    return Math.max(0, Math.min(1, score));
  }

  private assessRelevance(userMessage: string, aiResponse: string): number {
    let score = 0.6; // Base score

    // Check if response directly addresses user's question/need
    const userIntent = this.extractUserIntent(userMessage);
    if (this.responseAddressesIntent(aiResponse, userIntent)) {
      score += 0.3;
    }

    // Check for topic alignment
    const userTopics = this.extractTopics(userMessage);
    const responseTopics = this.extractTopics(aiResponse);
    const topicOverlap = this.calculateTopicOverlap(userTopics, responseTopics);
    score += topicOverlap * 0.1;

    return Math.max(0, Math.min(1, score));
  }

  private assessHelpfulness(userMessage: string, aiResponse: string): number {
    let score = 0.5; // Base score

    // Contains specific product recommendations
    if (/\b(recommend|suggest|perfect for|ideal|great choice)\b/i.test(aiResponse)) {
      score += 0.2;
    }

    // Provides specific details or guidance
    if (/\b(here's how|steps|process|specifically|exactly)\b/i.test(aiResponse)) {
      score += 0.2;
    }

    // Offers additional relevant information
    if (/\b(also|additionally|furthermore|you might also)\b/i.test(aiResponse)) {
      score += 0.1;
    }

    // Penalize vague responses
    if (/\b(maybe|perhaps|possibly|generally|typically)\b/i.test(aiResponse) && aiResponse.length < 100) {
      score -= 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }

  private assessEmpathy(userMessage: string, aiResponse: string): number {
    let score = 0.6; // Base score

    // Detect emotional context in user message
    const userEmotion = this.detectEmotion(userMessage);
    
    if (userEmotion === 'frustrated' || userEmotion === 'angry') {
      // Should acknowledge and address frustration
      if (/\b(understand|sorry|apologize|frustrating|difficult)\b/i.test(aiResponse)) {
        score += 0.3;
      } else {
        score -= 0.4; // Major penalty for not addressing frustration
      }
    }

    if (userEmotion === 'excited' || userEmotion === 'happy') {
      // Should match positive energy
      if (/\b(great|wonderful|excited|perfect|amazing)\b/i.test(aiResponse)) {
        score += 0.2;
      }
    }

    if (userEmotion === 'anxious' || userEmotion === 'worried') {
      // Should provide reassurance
      if (/\b(don't worry|assured|confident|take care|support)\b/i.test(aiResponse)) {
        score += 0.3;
      }
    }

    return Math.max(0, Math.min(1, score));
  }

  private assessCompleteness(userMessage: string, aiResponse: string): number {
    let score = 0.6; // Base score

    const userQuestions = this.extractQuestions(userMessage);
    const responseAnswers = this.countAnsweredQuestions(aiResponse, userQuestions);
    
    if (userQuestions.length > 0) {
      score = responseAnswers / userQuestions.length;
    }

    // Bonus for providing comprehensive information
    if (aiResponse.length > 150 && this.containsComprehensiveInformation(aiResponse)) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  private assessClarity(aiResponse: string): number {
    let score = 0.7; // Base score

    // Penalize overly complex sentences
    const avgSentenceLength = this.calculateAverageSentenceLength(aiResponse);
    if (avgSentenceLength > 25) {
      score -= 0.2;
    }

    // Reward clear structure (bullet points, numbering)
    if (/\b(first|second|third|\d+\.|\*|\-)\b/i.test(aiResponse)) {
      score += 0.1;
    }

    // Penalize jargon without explanation
    const jargonCount = this.countUnexplainedJargon(aiResponse);
    score -= jargonCount * 0.05;

    // Reward clear explanations
    if (/\b(this means|in other words|simply put|to explain)\b/i.test(aiResponse)) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  private assessProfessionalism(aiResponse: string): number {
    let score = 0.8; // Base score (assume professional by default)

    // Penalize casual/informal language
    if (/\b(yeah|yep|nah|dude|gonna|wanna|ain't)\b/i.test(aiResponse)) {
      score -= 0.3;
    }

    // Penalize inappropriate humor
    if (this.containsInappropriateHumor(aiResponse)) {
      score -= 0.4;
    }

    // Reward professional courtesy
    if (/\b(please|thank you|appreciate|happy to help|glad to assist)\b/i.test(aiResponse)) {
      score += 0.1;
    }

    // Check grammar and spelling (simplified check)
    if (this.hasBasicGrammarErrors(aiResponse)) {
      score -= 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }

  private assessActionability(aiResponse: string): number {
    let score = 0.5; // Base score

    // Contains clear next steps
    if (/\b(next step|you can|I recommend|please|should|would suggest)\b/i.test(aiResponse)) {
      score += 0.2;
    }

    // Contains specific instructions
    if (/\b(click|visit|call|email|schedule|book)\b/i.test(aiResponse)) {
      score += 0.2;
    }

    // Provides options
    if (/\b(option|choice|either|alternatively|you could)\b/i.test(aiResponse)) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  // Helper methods
  private isResponseRelevantToMessage(userMessage: string, aiResponse: string): boolean {
    const userKeywords = this.extractKeywords(userMessage);
    const responseKeywords = this.extractKeywords(aiResponse);
    const overlap = userKeywords.filter(kw => responseKeywords.includes(kw));
    return overlap.length > 0;
  }

  private maintainsContextualCoherence(aiResponse: string, context: any): boolean {
    // Check if response references or builds upon previous conversation
    return context.conversation_history?.length > 0 && 
           (aiResponse.includes('as mentioned') || 
            aiResponse.includes('building on') ||
            aiResponse.includes('following up'));
  }

  private containsContradictions(aiResponse: string): boolean {
    // Simple contradiction detection
    const contradictoryPairs = [
      ['always', 'never'],
      ['all', 'none'],
      ['definitely', 'maybe'],
      ['required', 'optional']
    ];
    
    return contradictoryPairs.some(pair => 
      aiResponse.toLowerCase().includes(pair[0]) && 
      aiResponse.toLowerCase().includes(pair[1])
    );
  }

  private extractUserIntent(userMessage: string): string {
    const intentKeywords = {
      'product_inquiry': ['looking for', 'need', 'want', 'searching'],
      'sizing_help': ['size', 'fit', 'measurements', 'too big', 'too small'],
      'complaint': ['problem', 'issue', 'wrong', 'disappointed', 'unhappy'],
      'pricing': ['cost', 'price', 'expensive', 'cheap', 'afford'],
      'policy': ['return', 'exchange', 'refund', 'policy', 'warranty']
    };

    for (const [intent, keywords] of Object.entries(intentKeywords)) {
      if (keywords.some(kw => userMessage.toLowerCase().includes(kw))) {
        return intent;
      }
    }

    return 'general';
  }

  private responseAddressesIntent(aiResponse: string, userIntent: string): boolean {
    const intentResponses = {
      'product_inquiry': ['recommend', 'suggest', 'perfect', 'collection', 'options'],
      'sizing_help': ['size', 'fit', 'measure', 'chart', 'alterations'],
      'complaint': ['sorry', 'understand', 'resolve', 'fix', 'apologize'],
      'pricing': ['price', 'cost', '$', 'budget', 'payment'],
      'policy': ['policy', 'return', 'exchange', 'refund', 'days']
    };

    const expectedKeywords = intentResponses[userIntent as keyof typeof intentResponses] || [];
    return expectedKeywords.some(kw => aiResponse.toLowerCase().includes(kw));
  }

  private extractTopics(text: string): string[] {
    const topics: string[] = [];
    const topicKeywords = {
      'suits': ['suit', 'suits', 'formal', 'business'],
      'tuxedos': ['tuxedo', 'tux', 'black tie', 'formal'],
      'wedding': ['wedding', 'marriage', 'bride', 'groom'],
      'sizing': ['size', 'fit', 'measurements', 'alterations'],
      'colors': ['color', 'colour', 'black', 'navy', 'gray'],
      'occasions': ['event', 'occasion', 'party', 'ceremony']
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(kw => text.toLowerCase().includes(kw))) {
        topics.push(topic);
      }
    }

    return topics;
  }

  private calculateTopicOverlap(topics1: string[], topics2: string[]): number {
    const overlap = topics1.filter(topic => topics2.includes(topic));
    return topics1.length > 0 ? overlap.length / topics1.length : 0;
  }

  private detectEmotion(text: string): string {
    const emotionKeywords = {
      'frustrated': ['frustrated', 'annoyed', 'angry', 'upset', 'mad'],
      'excited': ['excited', 'thrilled', 'amazing', 'fantastic', 'love'],
      'anxious': ['worried', 'nervous', 'concerned', 'anxious', 'stressed'],
      'happy': ['happy', 'pleased', 'satisfied', 'great', 'wonderful']
    };

    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      if (keywords.some(kw => text.toLowerCase().includes(kw))) {
        return emotion;
      }
    }

    return 'neutral';
  }

  private extractQuestions(text: string): string[] {
    // Simple question extraction based on question marks and question words
    const sentences = text.split(/[.!?]+/);
    return sentences.filter(sentence => 
      sentence.includes('?') || 
      /\b(what|when|where|why|how|which|who|can|could|would|should|do|does|is|are)\b/i.test(sentence.trim())
    );
  }

  private countAnsweredQuestions(response: string, questions: string[]): number {
    // Simple heuristic: if response contains keywords from questions, assume answered
    let answeredCount = 0;
    
    for (const question of questions) {
      const questionKeywords = this.extractKeywords(question);
      const responseKeywords = this.extractKeywords(response);
      const hasOverlap = questionKeywords.some(kw => responseKeywords.includes(kw));
      
      if (hasOverlap) {
        answeredCount++;
      }
    }

    return answeredCount;
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction (remove stop words and extract nouns/verbs)
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    return words.filter(word => !stopWords.includes(word) && word.length > 2);
  }

  private containsComprehensiveInformation(response: string): boolean {
    // Check for comprehensive coverage indicators
    const comprehensiveIndicators = [
      'also', 'additionally', 'furthermore', 'moreover',
      'first', 'second', 'third', 'finally',
      'options', 'choices', 'alternatives',
      'details', 'specifics', 'information'
    ];
    
    return comprehensiveIndicators.some(indicator => 
      response.toLowerCase().includes(indicator)
    );
  }

  private calculateAverageSentenceLength(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return 0;
    
    const totalWords = sentences.reduce((sum, sentence) => {
      return sum + (sentence.match(/\b\w+\b/g) || []).length;
    }, 0);
    
    return totalWords / sentences.length;
  }

  private countUnexplainedJargon(text: string): number {
    const jargonTerms = [
      'lapels', 'notched', 'peaked', 'shawl', 'vents', 'quarters',
      'canvassed', 'half-canvas', 'fused', 'basting', 'suppression'
    ];
    
    let jargonCount = 0;
    for (const term of jargonTerms) {
      if (text.toLowerCase().includes(term)) {
        // Check if explained (has definition or clarification nearby)
        const termIndex = text.toLowerCase().indexOf(term);
        const surroundingText = text.substring(Math.max(0, termIndex - 50), termIndex + 100);
        
        if (!/\b(means|refers to|is|are|which is|that is)\b/i.test(surroundingText)) {
          jargonCount++;
        }
      }
    }
    
    return jargonCount;
  }

  private containsInappropriateHumor(response: string): boolean {
    // Check for potentially inappropriate humor markers
    const inappropriateMarkers = [
      'joke', 'funny', 'laugh', 'hilarious', 'haha', 'lol'
    ];
    
    return inappropriateMarkers.some(marker => 
      response.toLowerCase().includes(marker)
    );
  }

  private hasBasicGrammarErrors(response: string): boolean {
    // Very basic grammar error detection
    const commonErrors = [
      /\bi is\b/, // should be "it is" or "I am"
      /\byour welcome\b/i, // should be "you're welcome"
      /\bits ok\b/i, // should be "it's ok"
      /\bcant\b/i // should be "can't"
    ];
    
    return commonErrors.some(error => error.test(response));
  }

  private analyzeContextualQuality(
    userMessage: string, 
    aiResponse: string, 
    context: any, 
    issues: string[], 
    strengths: string[], 
    suggestions: string[]
  ): void {
    // Framework-specific quality checks
    if (context.framework_used === 'restore' && this.detectEmotion(userMessage) === 'frustrated') {
      if (!aiResponse.toLowerCase().includes('understand') && !aiResponse.toLowerCase().includes('sorry')) {
        issues.push('RESTORE framework should show more empathy for frustrated customers');
        suggestions.push('Include empathetic language like "I understand your frustration"');
      }
    }
    
    if (context.framework_used === 'precision' && userMessage.toLowerCase().includes('premium')) {
      if (!aiResponse.toLowerCase().includes('exclusive') && !aiResponse.toLowerCase().includes('luxury')) {
        issues.push('PRECISION framework should emphasize exclusivity for premium inquiries');
        suggestions.push('Highlight luxury and exclusive aspects of products');
      }
    }
  }

  private getSuggestion(metric: keyof ConversationQualityMetrics, score: number): string {
    const suggestions: Record<keyof ConversationQualityMetrics, string> = {
      coherence: 'Ensure responses follow logically from user input and maintain context',
      relevance: 'Address the user\'s specific question or need more directly',
      helpfulness: 'Provide more specific, actionable advice and recommendations',
      empathy: 'Better acknowledge and respond to the user\'s emotional state',
      completeness: 'Address all aspects of the user\'s question more thoroughly',
      clarity: 'Use simpler language and clearer structure in responses',
      professionalism: 'Maintain formal, business-appropriate tone and language',
      actionability: 'Include specific next steps or actions the user can take'
    };

    return suggestions[metric];
  }
}

describe('Conversation Quality Assessment', () => {
  let app: any;
  let server: any;
  let qualityAnalyzer: ConversationQualityAnalyzer;

  const qualityTestScenarios: QualityTestScenario[] = [
    {
      name: 'Wedding Suit Consultation',
      category: 'product_inquiry',
      conversationFlow: [
        {
          userMessage: "Hi, I need help finding the perfect wedding suit for my beach wedding in July",
          expectedQualities: {
            relevance: 0.8,
            helpfulness: 0.7,
            clarity: 0.8,
            professionalism: 0.8
          },
          mustContain: ['wedding', 'beach', 'July'],
          expectedFramework: 'atelier'
        },
        {
          userMessage: "What colors would work best for a sunset ceremony?",
          expectedQualities: {
            relevance: 0.8,
            helpfulness: 0.8,
            completeness: 0.7
          },
          mustContain: ['color', 'sunset'],
          contextRequirements: ['previous wedding context']
        }
      ],
      overallQualityThresholds: {
        coherence: 0.8,
        relevance: 0.8,
        helpfulness: 0.7,
        empathy: 0.7,
        completeness: 0.7,
        clarity: 0.8,
        professionalism: 0.9,
        actionability: 0.6
      }
    },
    {
      name: 'Customer Complaint Resolution',
      category: 'complaint',
      conversationFlow: [
        {
          userMessage: "I'm really upset! The suit I ordered for my son's graduation doesn't fit at all and the event is tomorrow!",
          expectedQualities: {
            empathy: 0.9,
            helpfulness: 0.8,
            actionability: 0.9,
            professionalism: 0.8
          },
          mustContain: ['understand', 'help', 'resolve'],
          mustNotContain: ['sorry for your inconvenience', 'that\'s unfortunate'],
          expectedFramework: 'restore'
        },
        {
          userMessage: "This is unacceptable! I trusted you with something so important.",
          expectedQualities: {
            empathy: 0.9,
            coherence: 0.8,
            actionability: 0.9
          },
          contextRequirements: ['acknowledge previous issue', 'show understanding']
        }
      ],
      overallQualityThresholds: {
        coherence: 0.8,
        relevance: 0.8,
        helpfulness: 0.8,
        empathy: 0.9,
        completeness: 0.7,
        clarity: 0.8,
        professionalism: 0.8,
        actionability: 0.9
      }
    },
    {
      name: 'Premium Customer Consultation',
      category: 'product_inquiry',
      conversationFlow: [
        {
          userMessage: "I'm looking for your most exclusive formal wear. Price is not a concern, I want the absolute best quality.",
          expectedQualities: {
            relevance: 0.8,
            helpfulness: 0.8,
            professionalism: 0.9,
            completeness: 0.8
          },
          mustContain: ['exclusive', 'premium', 'quality'],
          expectedFramework: 'precision'
        },
        {
          userMessage: "Tell me about your custom tailoring services and what makes your suits special.",
          expectedQualities: {
            completeness: 0.9,
            helpfulness: 0.9,
            professionalism: 0.9
          },
          mustContain: ['custom', 'tailoring', 'special']
        }
      ],
      overallQualityThresholds: {
        coherence: 0.8,
        relevance: 0.8,
        helpfulness: 0.8,
        empathy: 0.7,
        completeness: 0.8,
        clarity: 0.8,
        professionalism: 0.9,
        actionability: 0.7
      }
    }
  ];

  beforeAll(async () => {
    ({ app, server } = await setupTestApp());
    qualityAnalyzer = new ConversationQualityAnalyzer();
    
    // Wait for services to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Quality Metrics Validation', () => {
    qualityTestScenarios.forEach((scenario) => {
      describe(`${scenario.name}`, () => {
        let conversationId: string;
        let assessments: QualityAssessment;

        beforeEach(async () => {
          // Start conversation
          const response = await request(app)
            .post('/api/v3/chat/conversation/start')
            .send({
              customer_id: `quality_test_${scenario.category}`,
              context: {
                test_scenario: scenario.name,
                quality_assessment: true
              }
            })
            .expect(201);

          conversationId = response.body.sessionId;

          assessments = {
            scenario: scenario.name,
            conversationId,
            stepAssessments: [],
            overallQuality: {
              coherence: 0,
              relevance: 0,
              helpfulness: 0,
              empathy: 0,
              completeness: 0,
              clarity: 0,
              professionalism: 0,
              actionability: 0
            },
            passed: false,
            failureReasons: []
          };
        });

        it('should meet quality thresholds for each conversation step', async () => {
          for (let i = 0; i < scenario.conversationFlow.length; i++) {
            const step = scenario.conversationFlow[i];

            const response = await request(app)
              .post('/api/v3/chat/conversation/message')
              .send({
                session_id: conversationId,
                message: step.userMessage,
                context: {
                  step_number: i + 1,
                  quality_test: true
                }
              })
              .expect(200);

            // Analyze conversation quality
            const qualityAnalysis = await qualityAnalyzer.analyzeConversation(
              step.userMessage,
              response.body.message,
              response.body.context,
              step.expectedQualities
            );

            // Validate must-contain requirements
            if (step.mustContain) {
              for (const requiredText of step.mustContain) {
                expect(response.body.message.toLowerCase()).toContain(requiredText.toLowerCase());
              }
            }

            // Validate must-not-contain requirements
            if (step.mustNotContain) {
              for (const forbiddenText of step.mustNotContain) {
                expect(response.body.message.toLowerCase()).not.toContain(forbiddenText.toLowerCase());
              }
            }

            // Validate expected framework
            if (step.expectedFramework) {
              expect(response.body.framework_used).toBe(step.expectedFramework);
            }

            // Validate quality scores against expected values
            if (step.expectedQualities) {
              Object.entries(step.expectedQualities).forEach(([metric, expectedScore]) => {
                const actualScore = qualityAnalysis.scores[metric as keyof ConversationQualityMetrics];
                expect(actualScore).toBeGreaterThanOrEqual(expectedScore);
              });
            }

            // Store step assessment
            assessments.stepAssessments.push({
              stepNumber: i + 1,
              userMessage: step.userMessage,
              aiResponse: response.body.message,
              qualityScores: qualityAnalysis.scores,
              issues: qualityAnalysis.issues,
              strengths: qualityAnalysis.strengths,
              suggestions: qualityAnalysis.suggestions
            });

            logger.info(`✅ Step ${i + 1} quality assessment completed`, {
              scenario: scenario.name,
              qualityScores: qualityAnalysis.scores,
              issues: qualityAnalysis.issues.length,
              strengths: qualityAnalysis.strengths.length
            });
          }
        });

        it('should meet overall conversation quality thresholds', async () => {
          // Calculate overall quality from all steps
          const allScores = assessments.stepAssessments.map(s => s.qualityScores);
          
          if (allScores.length > 0) {
            assessments.overallQuality = {
              coherence: allScores.reduce((sum, s) => sum + s.coherence, 0) / allScores.length,
              relevance: allScores.reduce((sum, s) => sum + s.relevance, 0) / allScores.length,
              helpfulness: allScores.reduce((sum, s) => sum + s.helpfulness, 0) / allScores.length,
              empathy: allScores.reduce((sum, s) => sum + s.empathy, 0) / allScores.length,
              completeness: allScores.reduce((sum, s) => sum + s.completeness, 0) / allScores.length,
              clarity: allScores.reduce((sum, s) => sum + s.clarity, 0) / allScores.length,
              professionalism: allScores.reduce((sum, s) => sum + s.professionalism, 0) / allScores.length,
              actionability: allScores.reduce((sum, s) => sum + s.actionability, 0) / allScores.length
            };
          }

          // Validate against thresholds
          Object.entries(scenario.overallQualityThresholds).forEach(([metric, threshold]) => {
            const actualScore = assessments.overallQuality[metric as keyof ConversationQualityMetrics];
            
            if (actualScore < threshold) {
              assessments.failureReasons.push(`${metric} score ${actualScore.toFixed(2)} below threshold ${threshold}`);
            }

            expect(actualScore).toBeGreaterThanOrEqual(threshold);
          });

          assessments.passed = assessments.failureReasons.length === 0;

          logger.info(`✅ Overall quality assessment for ${scenario.name}`, {
            passed: assessments.passed,
            overallQuality: assessments.overallQuality,
            failureReasons: assessments.failureReasons
          });
        });

        it('should maintain consistent quality across conversation', async () => {
          const stepScores = assessments.stepAssessments.map(s => s.qualityScores);
          
          if (stepScores.length > 1) {
            // Check that quality doesn't degrade significantly between steps
            for (let i = 1; i < stepScores.length; i++) {
              const previousScore = stepScores[i - 1];
              const currentScore = stepScores[i];

              // Quality should not drop by more than 0.2 in any metric
              Object.keys(previousScore).forEach(metric => {
                const degradation = previousScore[metric as keyof ConversationQualityMetrics] - 
                                   currentScore[metric as keyof ConversationQualityMetrics];
                
                if (degradation > 0.2) {
                  logger.warn(`Quality degradation detected in ${metric}:`, {
                    step: i + 1,
                    degradation: degradation.toFixed(2)
                  });
                }

                expect(degradation).toBeLessThanOrEqual(0.3); // Allow some variation
              });
            }
          }
        });
      });
    });
  });

  describe('Framework-Specific Quality Tests', () => {
    it('should maintain RESTORE framework quality standards for complaints', async () => {
      const response = await request(app)
        .post('/api/v3/chat/conversation/start')
        .send({
          customer_id: 'restore_quality_test',
          context: { urgency: 'high', issue_type: 'complaint' }
        });

      const sessionId = response.body.sessionId;

      const messageResponse = await request(app)
        .post('/api/v3/chat/conversation/message')
        .send({
          session_id: sessionId,
          message: "I'm extremely frustrated with the poor quality of my recent order!"
        });

      const qualityAnalysis = await qualityAnalyzer.analyzeConversation(
        "I'm extremely frustrated with the poor quality of my recent order!",
        messageResponse.body.message,
        messageResponse.body.context
      );

      // RESTORE framework should excel in empathy for complaints
      expect(qualityAnalysis.scores.empathy).toBeGreaterThanOrEqual(0.8);
      expect(qualityAnalysis.scores.actionability).toBeGreaterThanOrEqual(0.7);
      expect(messageResponse.body.framework_used).toBe('restore');
    });

    it('should maintain PRECISION framework quality standards for luxury inquiries', async () => {
      const response = await request(app)
        .post('/api/v3/chat/conversation/start')
        .send({
          customer_id: 'precision_quality_test',
          context: { customer_tier: 'vip', budget: 'luxury' }
        });

      const sessionId = response.body.sessionId;

      const messageResponse = await request(app)
        .post('/api/v3/chat/conversation/message')
        .send({
          session_id: sessionId,
          message: "Show me your most exclusive and expensive formal wear collection"
        });

      const qualityAnalysis = await qualityAnalyzer.analyzeConversation(
        "Show me your most exclusive and expensive formal wear collection",
        messageResponse.body.message,
        messageResponse.body.context
      );

      // PRECISION framework should excel in professionalism and completeness
      expect(qualityAnalysis.scores.professionalism).toBeGreaterThanOrEqual(0.9);
      expect(qualityAnalysis.scores.completeness).toBeGreaterThanOrEqual(0.8);
      expect(messageResponse.body.framework_used).toBe('precision');
    });
  });

  describe('Quality Regression Tests', () => {
    it('should maintain quality standards under various message types', async () => {
      const messageTypes = [
        { type: 'short_query', message: "Suit?", minClarity: 0.6 },
        { type: 'long_query', message: "I'm looking for a three-piece navy blue suit in size 42 regular for my brother's wedding next month in Chicago, preferably something that's not too expensive but still looks professional and fits well with a summer outdoor ceremony theme", minCompleteness: 0.7 },
        { type: 'emotional', message: "I'm so excited about finding the perfect tuxedo for prom!", minEmpathy: 0.7 },
        { type: 'technical', message: "What's the difference between half-canvas and full-canvas construction?", minClarity: 0.8 }
      ];

      for (const { type, message, ...qualityReqs } of messageTypes) {
        const response = await request(app)
          .post('/api/v3/chat/conversation/start')
          .send({ customer_id: `quality_regression_${type}` });

        const sessionId = response.body.sessionId;

        const messageResponse = await request(app)
          .post('/api/v3/chat/conversation/message')
          .send({
            session_id: sessionId,
            message: message
          });

        const qualityAnalysis = await qualityAnalyzer.analyzeConversation(
          message,
          messageResponse.body.message,
          messageResponse.body.context
        );

        // Check specific quality requirements for this message type
        Object.entries(qualityReqs).forEach(([metric, minScore]) => {
          const actualScore = qualityAnalysis.scores[metric.replace('min', '').toLowerCase() as keyof ConversationQualityMetrics];
          expect(actualScore).toBeGreaterThanOrEqual(minScore as number);
        });

        logger.info(`✅ Quality regression test passed for ${type}`, {
          qualityScores: qualityAnalysis.scores
        });
      }
    });
  });
});