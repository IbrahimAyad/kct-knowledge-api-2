export type FrameworkType = 'atelier_ai' | 'restore' | 'precision';
export type ConversationStatus = 'active' | 'completed' | 'abandoned';
export type MessageRole = 'user' | 'assistant';
export type ResponseLayer = 1 | 2 | 3;

export interface ConversationSession {
  id: string;
  customerId?: string;
  sessionId: string;
  frameworkType?: FrameworkType;
  currentStage?: string;
  context: Record<string, any>;
  startedAt: Date;
  endedAt?: Date;
  status: ConversationStatus;
  satisfactionScore?: number;
  conversionOutcome?: boolean;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  intent?: string;
  confidenceScore?: number;
  responseLayer?: ResponseLayer;
  context?: Record<string, any>;
  timestamp: Date;
}

export interface ConversationContext {
  customerId?: string;
  sessionId: string;
  frameworkType?: FrameworkType;
  currentStage?: string;
  conversationHistory: ConversationMessage[];
  customerPreferences: Record<string, any>;
  sessionContext: Record<string, any>;
  pageContext?: {
    currentPage: string;
    userAction: string;
    productContext?: any;
  };
}

export interface Intent {
  category: string;
  subcategory?: string;
  confidence: number;
  entities: Record<string, any>;
  requiresEscalation?: boolean;
}

export interface ChatResponse {
  message: string;
  confidence: number;
  layer: ResponseLayer;
  suggestedActions?: string[];
  framework: FrameworkType;
  stage?: string;
  nextStage?: string;
  metadata: Record<string, any>;
}

export interface ConversationFeedback {
  satisfactionScore: number;
  feedback?: string;
  conversionOutcome?: boolean;
  issueResolved?: boolean;
}

export interface ConversationAnalytics {
  totalConversations: number;
  averageSatisfactionScore: number;
  conversionRate: number;
  averageResolutionTime: number;
  commonIntents: Array<{ intent: string; count: number }>;
  frameworkUsage: Record<FrameworkType, number>;
}

// Framework-specific interfaces

export interface AtelierAIConfig {
  personality: {
    brand: 'Sterling Crown';
    philosophy: 'Luxury is a mindset, not a price tag';
    tone: 'professional' | 'friendly' | 'luxury';
    knowledgeLevel: 'expert';
  };
  responsePatterns: {
    greeting: string[];
    discovery: string[];
    recommendation: string[];
    objectionHandling: string[];
  };
}

export interface RESTOREStage {
  name: string;
  duration: { min: number; max: number };
  satisfactionTarget: number;
  patterns: string[];
  questions?: string[];
  solutions?: string[];
}

export interface RESTOREFramework {
  empathetic_discovery: RESTOREStage;
  diagnostic_excellence: RESTOREStage;
  comprehensive_resolution: RESTOREStage;
  proactive_value_restoration: RESTOREStage;
  relationship_acceleration: RESTOREStage;
  loyalty_acceleration: RESTOREStage;
}

export interface PRECISIONStage {
  name: string;
  duration: { min: number; max: number };
  conversionTarget: number;
  techniques: string[];
  triggers: string[];
}

export interface PRECISIONFramework {
  value_first_discovery: PRECISIONStage;
  strategic_needs_architecture: PRECISIONStage;
  invisible_objection_preemption: PRECISIONStage;
  value_stacking_presentation: PRECISIONStage;
  assumptive_completion: PRECISIONStage;
}

export interface FrameworkSelector {
  selectFramework(context: ConversationContext, intent: Intent): FrameworkType;
  shouldTransition(
    currentFramework: FrameworkType,
    currentStage: string,
    intent: Intent,
    context: ConversationContext
  ): { shouldTransition: boolean; newFramework?: FrameworkType; newStage?: string };
}

export interface ConversationState {
  id: string;
  conversationId: string;
  stateKey: string;
  stateValue: any;
  updatedAt: Date;
}

export interface CustomerPreference {
  id: string;
  customerId: string;
  preferenceKey: string;
  preferenceValue: any;
  learnedFromConversationId?: string;
  confidenceScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationOutcome {
  id: string;
  conversationId: string;
  outcomeType: 'conversion' | 'satisfaction' | 'resolution' | 'escalation';
  outcomeValue: number;
  metadata?: Record<string, any>;
  recordedAt: Date;
}