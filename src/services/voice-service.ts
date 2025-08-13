/**
 * Voice Service for KCT Fashion Consultation
 * Handles Speech-to-Text, Text-to-Speech, and voice interactions
 */

import { logger } from '../utils/logger';
import { cacheService } from './cache-service';

export interface VoiceConfig {
  sttProvider: 'openai' | 'browser' | 'google';
  ttsProvider: 'elevenlabs' | 'openai' | 'browser' | 'custom';
  voiceProfile: VoiceProfile;
  audioSettings: AudioSettings;
}

export interface VoiceProfile {
  voiceId: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  accent: string;
  age: 'young' | 'middle' | 'mature';
  personality: {
    warmth: number; // 0-1
    professionalism: number; // 0-1
    enthusiasm: number; // 0-1
    sophistication: number; // 0-1
  };
  fashionExpertise: {
    formalWear: number; // 0-1
    casualWear: number; // 0-1
    luxury: number; // 0-1
    trending: number; // 0-1
  };
}

export interface AudioSettings {
  sampleRate: number;
  bitDepth: number;
  channels: number;
  format: 'mp3' | 'wav' | 'ogg' | 'webm';
  streaming: boolean;
  noiseReduction: boolean;
  echoCancellation: boolean;
}

export interface TranscriptionRequest {
  audio: Buffer | Blob | string; // base64 or URL
  language?: string;
  context?: string[]; // Fashion-specific terms for better accuracy
  enablePunctuation?: boolean;
  enableSpeakerDiarization?: boolean;
}

export interface TranscriptionResponse {
  text: string;
  confidence: number;
  language: string;
  segments?: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  detectedIntent?: string;
  fashionTerms?: string[];
}

export interface SynthesisRequest {
  text: string;
  voiceProfile?: Partial<VoiceProfile>;
  emotion?: 'neutral' | 'friendly' | 'professional' | 'enthusiastic' | 'empathetic';
  speed?: number; // 0.5-2.0
  pitch?: number; // 0.5-2.0
  emphasis?: Array<{
    text: string;
    level: 'strong' | 'moderate' | 'subtle';
  }>;
  ssml?: boolean;
}

export interface SynthesisResponse {
  audio: Buffer | string; // Binary or base64
  duration: number;
  format: string;
  cached: boolean;
}

export interface VoiceInteraction {
  sessionId: string;
  userId?: string;
  timestamp: Date;
  transcription: TranscriptionResponse;
  synthesis: SynthesisResponse;
  context: {
    framework: 'atelier_ai' | 'restore' | 'precision';
    topic: string;
    sentiment: string;
  };
}

class VoiceService {
  private config: VoiceConfig;
  private openaiApiKey: string;
  private elevenLabsApiKey: string;
  private voiceProfiles: Map<string, VoiceProfile>;
  private audioContext: AudioContext | null = null;
  private fashionVocabulary: Set<string>;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    this.elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY || '';
    
    // Default KCT voice profile
    this.config = {
      sttProvider: 'openai',
      ttsProvider: 'elevenlabs',
      voiceProfile: this.createDefaultVoiceProfile(),
      audioSettings: {
        sampleRate: 44100,
        bitDepth: 16,
        channels: 1,
        format: 'mp3',
        streaming: true,
        noiseReduction: true,
        echoCancellation: true
      }
    };

    this.voiceProfiles = new Map();
    this.fashionVocabulary = new Set();
    this.initializeFashionVocabulary();
  }

  private createDefaultVoiceProfile(): VoiceProfile {
    return {
      voiceId: 'kct-fashion-consultant',
      name: 'KCT Fashion Consultant',
      gender: 'neutral',
      accent: 'neutral_american',
      age: 'middle',
      personality: {
        warmth: 0.8,
        professionalism: 0.9,
        enthusiasm: 0.7,
        sophistication: 0.95
      },
      fashionExpertise: {
        formalWear: 1.0,
        casualWear: 0.8,
        luxury: 0.95,
        trending: 0.85
      }
    };
  }

  private initializeFashionVocabulary(): void {
    // Common fashion terms for better transcription accuracy
    const terms = [
      // Brands
      'Armani', 'Hugo Boss', 'Canali', 'Zegna', 'Brioni', 'Tom Ford',
      'Hermès', 'Versace', 'Dolce & Gabbana', 'Prada', 'Gucci',
      
      // Fabrics
      'cashmere', 'merino', 'vicuña', 'mohair', 'tweed', 'flannel',
      'herringbone', 'pinstripe', 'glen plaid', 'windowpane', 'sharkskin',
      
      // Styles
      'double-breasted', 'peak lapel', 'notch lapel', 'shawl collar',
      'French cuffs', 'spread collar', 'cutaway collar', 'tab collar',
      
      // Fit terms
      'slim fit', 'tailored fit', 'classic fit', 'modern fit',
      'drop 6', 'drop 8', 'bespoke', 'made-to-measure',
      
      // Colors
      'charcoal', 'navy', 'midnight blue', 'burgundy', 'oxblood'
    ];
    
    terms.forEach(term => this.fashionVocabulary.add(term.toLowerCase()));
  }

  /**
   * Initialize voice service
   */
  async initialize(): Promise<void> {
    try {
      logger.info('🎤 Initializing Voice Service...');
      
      // Initialize audio context for browser-based processing
      if (typeof window !== 'undefined') {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Test API connections
      if (this.config.sttProvider === 'openai' && this.openaiApiKey) {
        await this.testOpenAIConnection();
      }
      
      if (this.config.ttsProvider === 'elevenlabs' && this.elevenLabsApiKey) {
        await this.testElevenLabsConnection();
      }
      
      logger.info('✅ Voice Service initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize Voice Service:', error);
      // Fall back to browser APIs
      this.config.sttProvider = 'browser';
      this.config.ttsProvider = 'browser';
    }
  }

  /**
   * Transcribe audio to text
   */
  async transcribe(request: TranscriptionRequest): Promise<TranscriptionResponse> {
    const startTime = Date.now();
    
    try {
      let response: TranscriptionResponse;
      
      switch (this.config.sttProvider) {
        case 'openai':
          response = await this.transcribeWithOpenAI(request);
          break;
        case 'browser':
          response = await this.transcribeWithBrowserAPI(request);
          break;
        default:
          throw new Error(`Unsupported STT provider: ${this.config.sttProvider}`);
      }
      
      // Enhance with fashion term detection
      response.fashionTerms = this.detectFashionTerms(response.text);
      
      // Detect intent from transcription
      response.detectedIntent = await this.detectIntent(response.text);
      
      logger.info(`🎤 Transcription completed in ${Date.now() - startTime}ms`);
      return response;
      
    } catch (error) {
      logger.error('Transcription failed:', error);
      // Fallback to browser API
      if (this.config.sttProvider !== 'browser') {
        return this.transcribeWithBrowserAPI(request);
      }
      throw error;
    }
  }

  /**
   * Synthesize text to speech
   */
  async synthesize(request: SynthesisRequest): Promise<SynthesisResponse> {
    const cacheKey = `voice:tts:${this.generateCacheKey(request)}`;
    
    try {
      // Check cache first for common responses
      const cached = await cacheService.get<SynthesisResponse>(cacheKey);
      if (cached) {
        cached.cached = true;
        return cached;
      }
      
      let response: SynthesisResponse;
      
      // Apply SSML if needed
      if (request.ssml || this.needsSSML(request.text)) {
        request.text = this.generateSSML(request.text, request);
        request.ssml = true;
      }
      
      switch (this.config.ttsProvider) {
        case 'elevenlabs':
          response = await this.synthesizeWithElevenLabs(request);
          break;
        case 'openai':
          response = await this.synthesizeWithOpenAI(request);
          break;
        case 'browser':
          response = await this.synthesizeWithBrowserAPI(request);
          break;
        default:
          throw new Error(`Unsupported TTS provider: ${this.config.ttsProvider}`);
      }
      
      // Cache common responses
      if (this.isCacheable(request.text)) {
        await cacheService.set(cacheKey, response, 86400); // 24 hours
      }
      
      return response;
      
    } catch (error) {
      logger.error('Synthesis failed:', error);
      // Fallback to browser API
      if (this.config.ttsProvider !== 'browser') {
        return this.synthesizeWithBrowserAPI(request);
      }
      throw error;
    }
  }

  /**
   * OpenAI Whisper transcription
   */
  private async transcribeWithOpenAI(request: TranscriptionRequest): Promise<TranscriptionResponse> {
    const formData = new FormData();
    
    // Handle different audio input types
    if (request.audio instanceof Buffer) {
      formData.append('file', new Blob([request.audio]), 'audio.webm');
    } else if (request.audio instanceof Blob) {
      formData.append('file', request.audio, 'audio.webm');
    } else {
      // Base64 string
      const buffer = Buffer.from(request.audio, 'base64');
      formData.append('file', new Blob([buffer]), 'audio.webm');
    }
    
    formData.append('model', 'whisper-1');
    formData.append('language', request.language || 'en');
    
    // Add fashion context as prompt for better accuracy
    if (request.context && request.context.length > 0) {
      formData.append('prompt', request.context.join(', '));
    }
    
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`
      },
      body: formData
    });
    
    const data = await response.json();
    
    return {
      text: data.text,
      confidence: 0.95, // Whisper doesn't provide confidence scores
      language: request.language || 'en',
      segments: data.segments
    };
  }

  /**
   * Browser Speech Recognition API
   */
  private async transcribeWithBrowserAPI(request: TranscriptionRequest): Promise<TranscriptionResponse> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !('webkitSpeechRecognition' in window)) {
        reject(new Error('Browser Speech Recognition not available'));
        return;
      }
      
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = request.language || 'en-US';
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        const confidence = event.results[0][0].confidence;
        
        resolve({
          text: transcript,
          confidence,
          language: request.language || 'en-US'
        });
      };
      
      recognition.onerror = (event: any) => {
        reject(new Error(`Speech recognition error: ${event.error}`));
      };
      
      // Convert audio to play through speaker (required for browser API)
      // This is a limitation of browser Speech API
      recognition.start();
    });
  }

  /**
   * ElevenLabs voice synthesis
   */
  private async synthesizeWithElevenLabs(request: SynthesisRequest): Promise<SynthesisResponse> {
    const voiceId = this.selectVoiceId(request);
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': this.elevenLabsApiKey
      },
      body: JSON.stringify({
        text: request.text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: this.mapEmotionToStability(request.emotion),
          similarity_boost: 0.75,
          style: this.mapEmotionToStyle(request.emotion),
          use_speaker_boost: true
        }
      })
    });
    
    const audioBuffer = await response.arrayBuffer();
    
    return {
      audio: Buffer.from(audioBuffer),
      duration: this.estimateDuration(request.text),
      format: 'mp3',
      cached: false
    };
  }

  /**
   * OpenAI TTS synthesis
   */
  private async synthesizeWithOpenAI(request: SynthesisRequest): Promise<SynthesisResponse> {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'tts-1-hd',
        input: request.text,
        voice: this.mapToOpenAIVoice(request.voiceProfile),
        response_format: 'mp3',
        speed: request.speed || 1.0
      })
    });
    
    const audioBuffer = await response.arrayBuffer();
    
    return {
      audio: Buffer.from(audioBuffer),
      duration: this.estimateDuration(request.text),
      format: 'mp3',
      cached: false
    };
  }

  /**
   * Browser Speech Synthesis API
   */
  private async synthesizeWithBrowserAPI(request: SynthesisRequest): Promise<SynthesisResponse> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        reject(new Error('Browser Speech Synthesis not available'));
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(request.text);
      utterance.rate = request.speed || 1.0;
      utterance.pitch = request.pitch || 1.0;
      
      // Select appropriate voice
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => 
        v.lang.startsWith('en') && 
        v.name.includes('Premium')
      ) || voices[0];
      
      utterance.voice = preferredVoice;
      
      // Record audio (requires additional setup)
      // For now, return a placeholder
      utterance.onend = () => {
        resolve({
          audio: 'browser-tts-placeholder',
          duration: this.estimateDuration(request.text),
          format: 'browser',
          cached: false
        });
      };
      
      utterance.onerror = (event) => {
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };
      
      speechSynthesis.speak(utterance);
    });
  }

  /**
   * Generate SSML for fashion terms
   */
  private generateSSML(text: string, request: SynthesisRequest): string {
    let ssml = `<speak>`;
    
    // Add emphasis for fashion brands
    text = text.replace(/\b(Armani|Hermès|Versace|Zegna|Brioni)\b/g, 
      '<emphasis level="moderate">$1</emphasis>');
    
    // Proper pronunciation for fashion terms
    text = text.replace(/Hermès/g, '<phoneme ph="ɛərˈmɛz">Hermès</phoneme>');
    text = text.replace(/Versace/g, '<phoneme ph="vərˈsɑːtʃeɪ">Versace</phoneme>');
    
    // Add pauses for readability
    text = text.replace(/\. /g, '.<break time="300ms"/> ');
    text = text.replace(/, /g, ',<break time="150ms"/> ');
    
    // Apply custom emphasis
    if (request.emphasis) {
      request.emphasis.forEach(({ text: emphText, level }) => {
        const emphLevel = level === 'strong' ? 'strong' : level === 'moderate' ? 'moderate' : 'reduced';
        text = text.replace(new RegExp(`\\b${emphText}\\b`, 'g'), 
          `<emphasis level="${emphLevel}">${emphText}</emphasis>`);
      });
    }
    
    ssml += text;
    ssml += `</speak>`;
    
    return ssml;
  }

  /**
   * Detect fashion terms in text
   */
  private detectFashionTerms(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const detectedTerms: string[] = [];
    
    words.forEach(word => {
      if (this.fashionVocabulary.has(word)) {
        detectedTerms.push(word);
      }
    });
    
    return [...new Set(detectedTerms)];
  }

  /**
   * Detect user intent from transcription
   */
  private async detectIntent(text: string): Promise<string> {
    const lowerText = text.toLowerCase();
    
    // Shopping intents
    if (lowerText.includes('show') || lowerText.includes('find') || lowerText.includes('looking for')) {
      return 'browse_products';
    }
    
    // Styling advice
    if (lowerText.includes('match') || lowerText.includes('wear') || lowerText.includes('style')) {
      return 'styling_advice';
    }
    
    // Size/fit questions
    if (lowerText.includes('size') || lowerText.includes('fit') || lowerText.includes('measure')) {
      return 'sizing_help';
    }
    
    // Price/budget
    if (lowerText.includes('price') || lowerText.includes('cost') || lowerText.includes('budget')) {
      return 'price_inquiry';
    }
    
    return 'general_inquiry';
  }

  /**
   * Helper methods
   */
  private needsSSML(text: string): boolean {
    // Check if text contains fashion brands or terms needing special pronunciation
    return /Hermès|Versace|Dolce & Gabbana|vicuña/.test(text);
  }

  private isCacheable(text: string): boolean {
    // Cache common responses and greetings
    return text.length < 200 && !text.includes('${'); // No dynamic content
  }

  private selectVoiceId(request: SynthesisRequest): string {
    // Select ElevenLabs voice based on context
    if (request.emotion === 'professional') {
      return process.env.ELEVEN_LABS_PROFESSIONAL_VOICE_ID || 'voice_id';
    }
    return process.env.ELEVEN_LABS_DEFAULT_VOICE_ID || 'voice_id';
  }

  private mapEmotionToStability(emotion?: string): number {
    const emotionMap: Record<string, number> = {
      'neutral': 0.75,
      'friendly': 0.6,
      'professional': 0.85,
      'enthusiastic': 0.5,
      'empathetic': 0.7
    };
    return emotionMap[emotion || 'neutral'] || 0.75;
  }

  private mapEmotionToStyle(emotion?: string): number {
    const emotionMap: Record<string, number> = {
      'neutral': 0.5,
      'friendly': 0.7,
      'professional': 0.3,
      'enthusiastic': 0.8,
      'empathetic': 0.6
    };
    return emotionMap[emotion || 'neutral'] || 0.5;
  }

  private mapToOpenAIVoice(profile?: Partial<VoiceProfile>): string {
    if (!profile) return 'alloy';
    
    // Map voice characteristics to OpenAI voices
    if (profile.gender === 'male' && profile.age === 'mature') return 'onyx';
    if (profile.gender === 'female' && profile.personality?.warmth > 0.7) return 'nova';
    if (profile.personality?.professionalism > 0.8) return 'alloy';
    
    return 'shimmer';
  }

  private estimateDuration(text: string): number {
    // Rough estimate: 150 words per minute
    const words = text.split(/\s+/).length;
    return (words / 150) * 60;
  }

  private generateCacheKey(request: any): string {
    const str = JSON.stringify(request, Object.keys(request).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Test connections
   */
  private async testOpenAIConnection(): Promise<void> {
    // Test with a simple request
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error('OpenAI API connection failed');
    }
  }

  private async testElevenLabsConnection(): Promise<void> {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': this.elevenLabsApiKey
      }
    });
    
    if (!response.ok) {
      throw new Error('ElevenLabs API connection failed');
    }
  }
}

export const voiceService = new VoiceService();