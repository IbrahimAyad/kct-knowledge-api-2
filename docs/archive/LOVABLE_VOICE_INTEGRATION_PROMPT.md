# Lovable Voice AI Integration Prompt for KCT Menswear

## Overview
You are building a voice-enabled AI shopping assistant for KCT Menswear (kctmenswear.com). The assistant uses the KCT Knowledge API to understand customer requests, find products, provide styling recommendations, and navigate the website.

## API Base URL
```
Production: https://kct-knowledge-api-2-production.up.railway.app
```

## Core Voice Features to Implement

### 1. Voice Input/Output Integration
The frontend needs to:
- Capture user voice input using Web Speech API or audio recording
- Send audio to the API for transcription
- Receive text responses and audio responses
- Play synthesized audio back to the user

### 2. API Endpoints to Use

#### Voice Transcription (Speech-to-Text)
```typescript
POST /api/v3/voice/transcribe
Content-Type: multipart/form-data

// Request
{
  audio: File | Blob | base64,  // Audio data
  language: "en-US",            // Optional
  context: "suits,tuxedos,wedding,prom"  // Fashion terms for better accuracy
}

// Response
{
  success: true,
  transcription: {
    text: "I need a burgundy suit for a wedding",
    confidence: 0.95,
    language: "en-US",
    detectedIntent: "browse_products",  // browse_products | styling_advice | sizing_help | price_inquiry | general_inquiry
    fashionTerms: ["burgundy", "suit", "wedding"]
  }
}
```

#### Voice Synthesis (Text-to-Speech)
```typescript
POST /api/v3/voice/synthesize
Content-Type: application/json

// Request
{
  text: "I found 5 burgundy suits perfect for a wedding. The most popular is our Slim-Fit Three-Piece at $259.99.",
  emotion: "friendly",  // neutral | friendly | professional | enthusiastic | empathetic
  speed: 1.0,
  voiceProfile: {
    warmth: 0.8,
    professionalism: 0.9
  }
}

// Response: Audio buffer (MP3)
Headers: {
  Content-Type: audio/mp3,
  X-Audio-Duration: 4.5,
  X-Audio-Cached: false
}
```

#### Full Voice Chat (Recommended - All-in-One)
```typescript
POST /api/v3/voice/chat
Content-Type: multipart/form-data

// Request
{
  audio: File,
  sessionId: "session_123",  // For conversation continuity
  framework: "atelier_ai"    // atelier_ai | restore | precision
}

// Response
{
  success: true,
  sessionId: "session_123",
  transcription: {
    text: "Show me navy suits for prom",
    confidence: 0.94,
    intent: "browse_products"
  },
  response: {
    text: "I found several stunning navy suits perfect for prom...",
    audio: "base64_audio_data",
    duration: 5.2,
    format: "mp3"
  },
  metadata: {
    products: [...],
    suggestedNavigation: "/collections/prom-suits?color=navy"
  }
}
```

### 3. Product & Recommendation Endpoints

#### Get AI Recommendations
```typescript
POST /api/recommendations
Content-Type: application/json

{
  occasion: "wedding",
  style_preference: "modern",
  color_preferences: ["burgundy", "navy"],
  budget_range: { min: 150, max: 400 },
  body_type: "athletic"
}

// Response includes matched products with handles for navigation
```

#### Get Trending Products
```typescript
GET /api/trending

// Returns current trending colors, styles, and products
```

#### Validate Color Combinations
```typescript
POST /api/combinations/validate

{
  suit_color: "burgundy",
  shirt_color: "white",
  tie_color: "gold"
}

// Returns validation score and suggestions
```

#### Get Color Recommendations
```typescript
POST /api/v1/colors/recommendations

{
  suit_color: "navy",
  occasion: "wedding",
  season: "fall"
}
```

### 4. Navigation Actions

Based on the detected intent and entities, navigate the user:

```typescript
// Intent Detection → Navigation Mapping
const navigationMap = {
  // Product browsing
  "browse_products": {
    suits: "/collections/suits",
    tuxedos: "/collections/tuxedos",
    blazers: "/collections/blazers",
    ties: "/collections/ties",
    vests: "/collections/vests",
    shoes: "/collections/shoes",
    accessories: "/collections/accessories"
  },

  // Specific product types
  "prom": "/collections/prom",
  "wedding": "/collections/wedding-suits",
  "groomsmen": "/collections/groomsmen",

  // Color-specific
  "burgundy_suits": "/collections/suits?color=burgundy",
  "navy_suits": "/collections/suits?color=navy",
  "black_tuxedos": "/collections/tuxedos?color=black",

  // Specific product (use handle from API)
  "specific_product": "/products/{handle}"
};
```

### 5. Voice Command Examples to Handle

| User Says | Detected Intent | Action |
|-----------|----------------|--------|
| "Show me burgundy suits" | browse_products | Navigate to /collections/suits?color=burgundy |
| "I need a tuxedo for prom" | browse_products | Navigate to /collections/prom-tuxedos |
| "What colors go with a navy suit?" | styling_advice | Call /api/v1/colors/recommendations |
| "How much is the slim fit burgundy suit?" | price_inquiry | Call /api/recommendations + show price |
| "What size should I get?" | sizing_help | Navigate to /pages/size-guide |
| "Add this to my cart" | cart_action | Add current product to cart |
| "Show me matching ties" | complete_look | Call /api/products/complete-the-look |
| "What's trending right now?" | trending | Call /api/trending + navigate |

### 6. Frontend Implementation Structure

```typescript
// VoiceAssistant.tsx
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'https://kct-knowledge-api-2-production.up.railway.app';

export function VoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Start recording
  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processVoiceInput(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  };

  // Stop recording
  const stopListening = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
  };

  // Process voice with API
  const processVoiceInput = async (audioBlob: Blob) => {
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('sessionId', getSessionId());
      formData.append('framework', 'atelier_ai');

      const res = await fetch(`${API_BASE}/api/v3/voice/chat`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (data.success) {
        setTranscript(data.transcription.text);
        setResponse(data.response.text);

        // Play audio response
        if (data.response.audio) {
          playAudioResponse(data.response.audio);
        }

        // Handle navigation based on intent
        handleNavigation(data.transcription.intent, data.metadata);
      }
    } catch (err) {
      console.error('Voice processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Play audio response
  const playAudioResponse = (base64Audio: string) => {
    const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
    audio.play();
  };

  // Handle navigation based on intent
  const handleNavigation = (intent: string, metadata: any) => {
    if (metadata?.suggestedNavigation) {
      // Delay navigation slightly so user hears response
      setTimeout(() => {
        navigate(metadata.suggestedNavigation);
      }, 2000);
    }

    // Or handle specific intents
    switch (intent) {
      case 'browse_products':
        if (metadata?.category) {
          navigate(`/collections/${metadata.category}`);
        }
        break;
      case 'sizing_help':
        navigate('/pages/size-guide');
        break;
      case 'cart_action':
        // Add to cart logic
        break;
    }
  };

  return (
    <div className="voice-assistant">
      <button
        onClick={isListening ? stopListening : startListening}
        className={`mic-button ${isListening ? 'listening' : ''}`}
      >
        {isListening ? '🎤 Listening...' : '🎙️ Ask KCT'}
      </button>

      {isProcessing && <div className="processing">Processing...</div>}

      {transcript && (
        <div className="transcript">
          <strong>You said:</strong> {transcript}
        </div>
      )}

      {response && (
        <div className="response">
          <strong>KCT:</strong> {response}
        </div>
      )}
    </div>
  );
}
```

### 7. Conversation Memory

The API maintains session context. Use consistent `sessionId` to:
- Remember customer preferences
- Track conversation history
- Provide contextual follow-ups

```typescript
// Generate/retrieve session ID
function getSessionId(): string {
  let sessionId = localStorage.getItem('kct_voice_session');
  if (!sessionId) {
    sessionId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('kct_voice_session', sessionId);
  }
  return sessionId;
}
```

### 8. Product Data Structure

Products returned from API include:
```typescript
{
  title: "Men's Slim-Fit Burgundy Three-Piece Suit",
  handle: "mens-slim-fit-burgundy-three-piece-suit",  // Use for navigation
  price: 259.99,
  type: "Suit",
  color: "burgundy",
  occasions: ["wedding", "formal", "prom"]
}

// Navigate to product:
navigate(`/products/${product.handle}`);
```

### 9. Available Colors in Inventory
- Burgundy/Wine
- Navy
- Black
- Charcoal/Grey
- Sage Green
- Emerald Green
- Chocolate Brown
- Light Blue/Powder Blue
- Royal Blue
- White/Ivory
- Blush Pink
- Gold
- Lavender
- Red

### 10. Voice UI/UX Best Practices

1. **Visual feedback** - Show listening state, processing state
2. **Audio feedback** - Play subtle sound when starting/stopping recording
3. **Fallback** - Provide text input option if voice fails
4. **Interrupt handling** - Allow user to stop assistant mid-speech
5. **Error handling** - Graceful fallback if API unavailable
6. **Mobile optimization** - Large tap target for mic button
7. **Accessibility** - Provide text alternatives for all audio

### 11. Required Environment Variables (Lovable)

```
VITE_KCT_API_URL=https://kct-knowledge-api-2-production.up.railway.app
```

### 12. CORS - Already Configured

The API already allows:
- `*.lovable.app` domains
- `kctmenswear.com`
- `localhost` for development

---

## Summary

1. Use `/api/v3/voice/chat` for full voice conversations
2. Parse `detectedIntent` to determine navigation
3. Use product `handle` for direct product page navigation
4. Maintain `sessionId` for conversation continuity
5. Play audio responses for a natural experience
6. Fall back to text if voice unavailable
