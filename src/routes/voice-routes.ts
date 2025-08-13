/**
 * Voice Routes
 * Handles voice transcription, synthesis, and streaming endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { voiceService } from '../services/voice-service';
import { chatService } from '../services/chat-integration-service';
import { logger } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rate-limit';

const router = Router();

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/mpeg'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio format'));
    }
  }
});

/**
 * @route POST /api/v3/voice/transcribe
 * @desc Transcribe audio to text
 * @access Protected
 */
router.post('/transcribe',
  authMiddleware,
  rateLimitMiddleware({ 
    windowMs: 60000, // 1 minute
    max: 30 // 30 requests per minute
  }),
  upload.single('audio'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { language, context } = req.body;
      const audioFile = req.file;

      if (!audioFile && !req.body.audio) {
        return res.status(400).json({
          success: false,
          error: 'No audio data provided'
        });
      }

      // Prepare audio data
      const audioData = audioFile ? audioFile.buffer : req.body.audio;

      // Transcribe audio
      const transcription = await voiceService.transcribe({
        audio: audioData,
        language,
        context: context ? context.split(',') : undefined,
        enablePunctuation: true
      });

      // Log for analytics
      logger.info('Voice transcription completed', {
        userId: (req as any).user?.id,
        confidence: transcription.confidence,
        detectedIntent: transcription.detectedIntent,
        fashionTerms: transcription.fashionTerms
      });

      res.json({
        success: true,
        transcription
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/v3/voice/synthesize
 * @desc Convert text to speech
 * @access Protected
 */
router.post('/synthesize',
  authMiddleware,
  rateLimitMiddleware({ 
    windowMs: 60000,
    max: 50
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { 
        text, 
        emotion, 
        speed, 
        pitch,
        voiceProfile,
        format = 'mp3' 
      } = req.body;

      if (!text) {
        return res.status(400).json({
          success: false,
          error: 'No text provided for synthesis'
        });
      }

      // Synthesize speech
      const synthesis = await voiceService.synthesize({
        text,
        emotion,
        speed,
        pitch,
        voiceProfile,
        emphasis: req.body.emphasis
      });

      // Set appropriate headers
      res.set({
        'Content-Type': `audio/${synthesis.format}`,
        'Content-Length': synthesis.audio.length.toString(),
        'X-Audio-Duration': synthesis.duration.toString(),
        'X-Audio-Cached': synthesis.cached.toString()
      });

      // Send audio data
      if (synthesis.audio instanceof Buffer) {
        res.send(synthesis.audio);
      } else {
        // Base64 encoded
        res.send(Buffer.from(synthesis.audio, 'base64'));
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/v3/voice/chat
 * @desc Voice-based chat interaction
 * @access Protected
 */
router.post('/chat',
  authMiddleware,
  rateLimitMiddleware({ 
    windowMs: 60000,
    max: 20
  }),
  upload.single('audio'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, framework } = req.body;
      const audioFile = req.file;

      if (!audioFile && !req.body.audio) {
        return res.status(400).json({
          success: false,
          error: 'No audio data provided'
        });
      }

      // Step 1: Transcribe audio
      const audioData = audioFile ? audioFile.buffer : req.body.audio;
      const transcription = await voiceService.transcribe({
        audio: audioData,
        enablePunctuation: true
      });

      // Step 2: Process with chat service
      const chatResponse = await chatService.processMessage({
        sessionId: sessionId || `voice-${Date.now()}`,
        message: transcription.text,
        framework: framework || 'atelier_ai',
        context: {
          inputMethod: 'voice',
          detectedIntent: transcription.detectedIntent,
          confidence: transcription.confidence
        }
      });

      // Step 3: Synthesize response
      const synthesis = await voiceService.synthesize({
        text: chatResponse.response,
        emotion: this.determineEmotion(chatResponse),
        voiceProfile: req.body.voiceProfile
      });

      res.json({
        success: true,
        sessionId: chatResponse.sessionId,
        transcription: {
          text: transcription.text,
          confidence: transcription.confidence,
          intent: transcription.detectedIntent
        },
        response: {
          text: chatResponse.response,
          audio: synthesis.audio.toString('base64'),
          duration: synthesis.duration,
          format: synthesis.format
        },
        metadata: chatResponse.metadata
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v3/voice/stream/:sessionId
 * @desc WebSocket endpoint for real-time voice streaming
 * @access Protected
 */
router.get('/stream/:sessionId', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'WebSocket endpoint for voice streaming',
    websocketUrl: `/ws/voice/${req.params.sessionId}`,
    protocols: ['audio-stream-v1'],
    instructions: {
      connect: 'Use WebSocket client to connect to the URL',
      authenticate: 'Send auth token in first message',
      stream: 'Send audio chunks as binary frames',
      receive: 'Receive transcriptions and audio responses'
    }
  });
});

/**
 * @route GET /api/v3/voice/languages
 * @desc Get supported languages and voices
 * @access Public
 */
router.get('/languages', async (req: Request, res: Response) => {
  res.json({
    success: true,
    languages: [
      { code: 'en-US', name: 'English (US)', voices: ['alloy', 'nova', 'shimmer'] },
      { code: 'en-GB', name: 'English (UK)', voices: ['onyx'] },
      { code: 'es-ES', name: 'Spanish', voices: ['nova'] },
      { code: 'fr-FR', name: 'French', voices: ['shimmer'] },
      { code: 'de-DE', name: 'German', voices: ['alloy'] },
      { code: 'it-IT', name: 'Italian', voices: ['nova'] }
    ],
    defaultLanguage: 'en-US',
    features: {
      realTimeTranscription: true,
      emotionControl: true,
      customVoices: true,
      ssmlSupport: true
    }
  });
});

/**
 * @route POST /api/v3/voice/feedback
 * @desc Submit voice interaction feedback
 * @access Protected
 */
router.post('/feedback',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { 
        sessionId, 
        transcriptionAccuracy, 
        voiceQuality, 
        responseRelevance,
        overallSatisfaction,
        comments 
      } = req.body;

      // Store feedback for improving voice services
      logger.info('Voice feedback received', {
        sessionId,
        userId: (req as any).user?.id,
        scores: {
          transcriptionAccuracy,
          voiceQuality,
          responseRelevance,
          overallSatisfaction
        },
        comments
      });

      res.json({
        success: true,
        message: 'Thank you for your feedback'
      });
    } catch (error) {
      next(error);
    }
  }
);

// Helper function to determine emotion based on chat response
function determineEmotion(chatResponse: any): string {
  if (chatResponse.metadata?.sentiment === 'positive') return 'enthusiastic';
  if (chatResponse.metadata?.framework === 'restore') return 'empathetic';
  if (chatResponse.metadata?.framework === 'precision') return 'professional';
  return 'friendly';
}

export default router;