# Backend Voice Setup - KCT Knowledge API

## Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| voice-service.ts | ✅ Ready | Full STT/TTS implementation |
| voice-routes.ts | ✅ Ready | API endpoints defined |
| Server wiring | ❌ Missing | Routes not imported in server.ts |
| Navigation endpoint | ❌ Missing | Need to add page routing |
| Product search | ❌ Missing | Need Shopify product search |
| WebSocket streaming | ❌ Missing | Real-time voice not implemented |

---

## Tasks to Complete

### 1. Wire Up Voice Routes in server.ts

Add to `src/server.ts`:

```typescript
// At the top with other imports
import voiceRouter from './routes/voice-routes';

// After other route registrations (around line 860)
app.use("/api/v3/voice", voiceRouter);

// Add to console.log output
console.log(`\n🎤 VOICE ENDPOINTS:`);
console.log(`  - Transcribe: POST /api/v3/voice/transcribe`);
console.log(`  - Synthesize: POST /api/v3/voice/synthesize`);
console.log(`  - Voice Chat: POST /api/v3/voice/chat`);
console.log(`  - Streaming: GET /api/v3/voice/stream/:sessionId`);
```

### 2. Add Navigation Intent Handler

Create `src/services/navigation-service.ts`:

```typescript
export interface NavigationIntent {
  action: 'navigate' | 'search' | 'filter' | 'add_to_cart' | 'none';
  destination?: string;
  searchQuery?: string;
  filters?: Record<string, string>;
  productHandle?: string;
}

export function parseNavigationIntent(
  text: string,
  detectedIntent: string,
  entities: Record<string, any>
): NavigationIntent {
  const lowerText = text.toLowerCase();

  // Product category navigation
  const categoryMap: Record<string, string> = {
    'suit': '/collections/suits',
    'suits': '/collections/suits',
    'tuxedo': '/collections/tuxedos',
    'tuxedos': '/collections/tuxedos',
    'blazer': '/collections/blazers',
    'blazers': '/collections/blazers',
    'tie': '/collections/ties',
    'ties': '/collections/ties',
    'bowtie': '/collections/bowties',
    'vest': '/collections/vests',
    'vests': '/collections/vests',
    'shoe': '/collections/shoes',
    'shoes': '/collections/shoes',
    'accessory': '/collections/accessories',
    'accessories': '/collections/accessories',
    'prom': '/collections/prom',
    'wedding': '/collections/wedding-suits',
    'groomsmen': '/collections/groomsmen'
  };

  // Color filters
  const colorMap: Record<string, string> = {
    'burgundy': 'burgundy',
    'wine': 'burgundy',
    'navy': 'navy',
    'navy blue': 'navy',
    'black': 'black',
    'charcoal': 'charcoal',
    'grey': 'grey',
    'gray': 'grey',
    'sage': 'sage-green',
    'sage green': 'sage-green',
    'emerald': 'emerald-green',
    'green': 'green',
    'brown': 'brown',
    'chocolate': 'chocolate-brown',
    'blue': 'blue',
    'light blue': 'light-blue',
    'royal blue': 'royal-blue',
    'white': 'white',
    'ivory': 'ivory',
    'pink': 'pink',
    'blush': 'blush',
    'gold': 'gold',
    'lavender': 'lavender',
    'red': 'red'
  };

  // Find category
  let destination = '';
  let filters: Record<string, string> = {};

  for (const [keyword, path] of Object.entries(categoryMap)) {
    if (lowerText.includes(keyword)) {
      destination = path;
      break;
    }
  }

  // Find color
  for (const [keyword, color] of Object.entries(colorMap)) {
    if (lowerText.includes(keyword)) {
      filters.color = color;
      break;
    }
  }

  // Occasion filters
  if (lowerText.includes('prom')) filters.occasion = 'prom';
  if (lowerText.includes('wedding')) filters.occasion = 'wedding';
  if (lowerText.includes('formal') || lowerText.includes('black tie')) filters.occasion = 'formal';
  if (lowerText.includes('business')) filters.occasion = 'business';

  // Special pages
  if (lowerText.includes('size') || lowerText.includes('measurement')) {
    return { action: 'navigate', destination: '/pages/size-guide' };
  }
  if (lowerText.includes('contact') || lowerText.includes('store')) {
    return { action: 'navigate', destination: '/pages/contact' };
  }
  if (lowerText.includes('cart')) {
    return { action: 'navigate', destination: '/cart' };
  }
  if (lowerText.includes('checkout')) {
    return { action: 'navigate', destination: '/checkout' };
  }
  if (lowerText.includes('trending') || lowerText.includes('popular')) {
    return { action: 'navigate', destination: '/collections/trending' };
  }

  // Build final URL with filters
  if (destination) {
    if (Object.keys(filters).length > 0) {
      const queryParams = new URLSearchParams(filters).toString();
      destination = `${destination}?${queryParams}`;
    }
    return { action: 'navigate', destination, filters };
  }

  return { action: 'none' };
}
```

### 3. Add Product Search Endpoint

Create `src/routes/product-routes.ts`:

```typescript
import { Router, Request, Response } from 'express';

const router = Router();

// Product search with voice-friendly response
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, color, occasion, type, limit = 10 } = req.query;

    // Get products from catalog mapping
    const products = await searchProducts({
      query: q as string,
      color: color as string,
      occasion: occasion as string,
      type: type as string,
      limit: parseInt(limit as string)
    });

    res.json({
      success: true,
      count: products.length,
      products,
      voiceSummary: generateVoiceSummary(products)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

// Get product by handle
router.get('/:handle', async (req: Request, res: Response) => {
  const { handle } = req.params;
  // Lookup product from catalog
  // Return product details
});

function generateVoiceSummary(products: any[]): string {
  if (products.length === 0) {
    return "I couldn't find any products matching your request.";
  }
  if (products.length === 1) {
    return `I found the ${products[0].title} for $${products[0].price}.`;
  }
  return `I found ${products.length} options. The most popular is the ${products[0].title} at $${products[0].price}.`;
}

export default router;
```

### 4. Update Voice Chat Response with Navigation

Update `src/routes/voice-routes.ts` line ~195:

```typescript
// After chatResponse is received, add:
import { parseNavigationIntent } from '../services/navigation-service';

// Inside /chat endpoint:
const navigation = parseNavigationIntent(
  transcription.text,
  transcription.detectedIntent || '',
  chatResponse.metadata?.entities || {}
);

res.json({
  success: true,
  sessionId: chatResponse.sessionId,
  transcription: { ... },
  response: { ... },
  metadata: {
    ...chatResponse.metadata,
    navigation: navigation,
    suggestedNavigation: navigation.destination
  }
});
```

### 5. Add WebSocket Support for Streaming (Optional - Phase 2)

Create `src/websocket/voice-stream.ts`:

```typescript
import { WebSocketServer, WebSocket } from 'ws';
import { voiceService } from '../services/voice-service';

export function setupVoiceWebSocket(server: any) {
  const wss = new WebSocketServer({ server, path: '/ws/voice' });

  wss.on('connection', (ws: WebSocket, req) => {
    const sessionId = req.url?.split('/').pop();

    ws.on('message', async (data: Buffer) => {
      try {
        // Transcribe audio chunk
        const transcription = await voiceService.transcribe({
          audio: data,
          enablePunctuation: true
        });

        // Send back transcription
        ws.send(JSON.stringify({
          type: 'transcription',
          data: transcription
        }));

        // If sentence complete, process and respond
        if (transcription.text.endsWith('.') || transcription.text.endsWith('?')) {
          // Process with chat service
          // Synthesize response
          // Send audio back
        }
      } catch (error) {
        ws.send(JSON.stringify({ type: 'error', error: 'Processing failed' }));
      }
    });
  });
}
```

### 6. Environment Variables Needed

Already in `.env.example`:
```
OPENAI_API_KEY=sk-proj-xxx
ELEVEN_LABS_API_KEY=sk_xxx
ELEVEN_LABS_DEFAULT_VOICE_ID=xxx
VOICE_STT_PROVIDER=openai
VOICE_TTS_PROVIDER=elevenlabs
```

---

## Quick Start (Minimal Changes)

1. **Add voice routes to server.ts** (5 min)
2. **Test endpoints** with Postman
3. **Deploy to Railway**
4. **Test with Lovable frontend**

---

## Testing Commands

```bash
# Test transcription
curl -X POST https://your-api.railway.app/api/v3/voice/transcribe \
  -F "audio=@test-audio.webm" \
  -F "language=en-US"

# Test synthesis
curl -X POST https://your-api.railway.app/api/v3/voice/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, welcome to KCT Menswear!", "emotion": "friendly"}' \
  --output response.mp3

# Test full chat
curl -X POST https://your-api.railway.app/api/v3/voice/chat \
  -F "audio=@test-audio.webm" \
  -F "sessionId=test123" \
  -F "framework=atelier_ai"
```

---

## Deployment Notes

1. Railway will auto-deploy on push to main
2. Ensure OPENAI_API_KEY and ELEVEN_LABS_API_KEY are set in Railway env
3. Voice synthesis costs ~$0.30 per 1000 characters with ElevenLabs
4. Consider caching common responses to reduce costs
