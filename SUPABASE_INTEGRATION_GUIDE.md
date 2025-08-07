# Supabase Integration Guide for KCT Knowledge API

## Current Architecture

### **Main KCT Platform**
- **Uses Supabase for**: Authentication, User Management, Orders
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth

### **Knowledge API** 
- **Uses PostgreSQL for**: Chat conversations, Intelligence data
- **Database**: Standalone PostgreSQL (or SQLite)
- **Auth**: API Key based

## Integration Options

### Option 1: Keep Separate (Recommended) ✅

**Current setup works well because:**
- Knowledge API remains independent microservice
- Can scale chat separately from main platform
- No changes needed to existing systems
- Different performance requirements

**Integration points:**
```typescript
// Main platform calls Knowledge API
const chatResponse = await fetch('https://api.kct.com/api/v3/chat/conversation/start', {
  headers: {
    'X-API-Key': 'kct-menswear-api-2024-secret',
    'X-Customer-ID': user.id // Pass Supabase user ID
  }
});
```

### Option 2: Migrate Chat to Supabase

If you want everything in Supabase, here's what's needed:

## 📋 Supabase Migration Steps

### 1. Create Chat Tables in Supabase

```sql
-- Run in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Conversations table
CREATE TABLE public.chat_conversations (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES auth.users(id),
    framework_type VARCHAR(50),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    satisfaction_score DECIMAL(3,2),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE public.chat_messages (
    message_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.chat_conversations(session_id) ON DELETE CASCADE,
    sender VARCHAR(50) NOT NULL CHECK (sender IN ('user', 'ai', 'system')),
    message TEXT NOT NULL,
    intent VARCHAR(100),
    entities JSONB,
    sentiment DECIMAL(3,2),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation state
CREATE TABLE public.chat_conversation_state (
    session_id UUID PRIMARY KEY REFERENCES public.chat_conversations(session_id) ON DELETE CASCADE,
    current_stage VARCHAR(100),
    context JSONB DEFAULT '{}',
    topic_history JSONB DEFAULT '[]',
    customer_preferences JSONB DEFAULT '{}',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer preferences (linked to Supabase users)
CREATE TABLE public.chat_customer_preferences (
    customer_id UUID PRIMARY KEY REFERENCES auth.users(id),
    style_preferences JSONB DEFAULT '{}',
    communication_preferences JSONB DEFAULT '{}',
    purchase_history JSONB DEFAULT '[]',
    behavioral_patterns JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation outcomes
CREATE TABLE public.chat_conversation_outcomes (
    session_id UUID PRIMARY KEY REFERENCES public.chat_conversations(session_id) ON DELETE CASCADE,
    converted BOOLEAN DEFAULT FALSE,
    revenue DECIMAL(10,2),
    items_purchased JSONB,
    follow_up_scheduled BOOLEAN DEFAULT FALSE,
    resolution_achieved BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX idx_chat_conversations_customer_id ON public.chat_conversations(customer_id);
CREATE INDEX idx_chat_conversations_start_time ON public.chat_conversations(start_time);

-- Row Level Security (RLS)
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_customer_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversation_outcomes ENABLE ROW LEVEL SECURITY;

-- Policies for customer access to their own data
CREATE POLICY "Customers can view own conversations" ON public.chat_conversations
    FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Customers can view own messages" ON public.chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chat_conversations 
            WHERE session_id = chat_messages.session_id 
            AND customer_id = auth.uid()
        )
    );

CREATE POLICY "Customers can view own preferences" ON public.chat_customer_preferences
    FOR ALL USING (auth.uid() = customer_id);

-- Service role can access everything (for API)
CREATE POLICY "Service role full access conversations" ON public.chat_conversations
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access messages" ON public.chat_messages
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_conversations_updated_at BEFORE UPDATE ON public.chat_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_customer_preferences_updated_at BEFORE UPDATE ON public.chat_customer_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Update Knowledge API Configuration

```typescript
// src/config/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service key for server

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database types
export interface ChatConversation {
  session_id: string;
  customer_id: string;
  framework_type: string;
  start_time: string;
  end_time?: string;
  satisfaction_score?: number;
  metadata?: any;
}

export interface ChatMessage {
  message_id: string;
  session_id: string;
  sender: 'user' | 'ai' | 'system';
  message: string;
  intent?: string;
  entities?: any;
  sentiment?: number;
  metadata?: any;
  created_at: string;
}
```

### 3. Update Services to Use Supabase

```typescript
// src/services/supabase-conversation-service.ts
import { supabase } from '../config/supabase';

export class SupabaseConversationService {
  async createConversation(customerId?: string): Promise<any> {
    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({
        customer_id: customerId,
        framework_type: 'atelier_ai',
        metadata: {}
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async addMessage(sessionId: string, sender: string, message: string, analysis: any): Promise<any> {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        sender,
        message,
        intent: analysis.intent,
        entities: analysis.entities,
        sentiment: analysis.sentiment
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getConversationHistory(sessionId: string): Promise<any> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }
}
```

### 4. Environment Variables

```env
# Add to Knowledge API .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

## 🔐 Security Considerations

### **Row Level Security (RLS)**
- Customers can only see their own conversations
- Service role (API) has full access
- Anonymous users blocked

### **API Authentication Flow**
```typescript
// Main platform passes Supabase auth token
const response = await fetch('https://api.kct.com/api/v3/chat/message', {
  headers: {
    'Authorization': `Bearer ${supabaseAuthToken}`,
    'X-API-Key': 'kct-menswear-api-2024-secret'
  }
});
```

## 📊 Benefits of Supabase Integration

### **Pros**:
1. **Unified User Management**: Single source of truth for users
2. **Real-time Subscriptions**: Live chat updates via Supabase
3. **Built-in Auth**: Leverage Supabase auth system
4. **Single Database**: Easier backups and management
5. **Cross-Platform Analytics**: Unified customer view

### **Cons**:
1. **Coupling**: Knowledge API becomes dependent on Supabase
2. **Performance**: Single database for everything
3. **Complexity**: More complex deployment
4. **Cost**: All data in Supabase (potential higher costs)

## 🚀 Recommendation

**For Production Launch**: Keep systems separate initially
- Faster to deploy
- Less risk
- Can migrate later if needed

**For Long-term**: Consider Supabase integration if you want:
- Unified customer profiles
- Real-time chat features
- Simplified infrastructure
- Single billing/management

## Migration Timeline (If Chosen)

1. **Week 1**: Create Supabase schema
2. **Week 2**: Update Knowledge API services
3. **Week 3**: Test integration
4. **Week 4**: Migrate existing data
5. **Week 5**: Deploy and monitor

The system works great as-is, but Supabase integration would provide tighter coupling with the main platform if desired.