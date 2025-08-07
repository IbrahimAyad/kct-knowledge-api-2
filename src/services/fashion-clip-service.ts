import { logger } from "../utils/logger";
import { cacheService } from "./cache-service";

export interface FashionClipAnalysisRequest {
  image_url?: string;
  image_base64?: string;
  analysis_type: 'style_classification' | 'color_extraction' | 'pattern_recognition' | 'outfit_matching' | 'similarity_search';
  options?: {
    return_confidence?: boolean;
    max_results?: number;
    style_categories?: string[];
    color_palette_size?: number;
  };
}

export interface FashionClipAnalysisResponse {
  success: boolean;
  analysis_type: string;
  results: {
    style_classification?: {
      primary_style: string;
      confidence: number;
      secondary_styles: Array<{
        style: string;
        confidence: number;
      }>;
      formality_level: 'casual' | 'business_casual' | 'formal' | 'black_tie';
      occasion_suitability: string[];
    };
    color_analysis?: {
      dominant_colors: Array<{
        color: string;
        hex: string;
        percentage: number;
        color_family: string;
      }>;
      color_harmony: {
        scheme: string;
        compatibility_score: number;
      };
      seasonal_analysis: {
        season: 'spring' | 'summer' | 'fall' | 'winter';
        confidence: number;
      };
    };
    pattern_recognition?: {
      patterns: Array<{
        type: string;
        confidence: number;
        area_coverage: number;
      }>;
      texture_analysis: {
        primary_texture: string;
        fabric_type_prediction: string;
        formality_indicator: number;
      };
    };
    outfit_recommendations?: {
      complementary_pieces: Array<{
        item_type: string;
        colors: string[];
        style_match_score: number;
        reasoning: string;
      }>;
      complete_outfits: Array<{
        pieces: string[];
        occasion: string;
        style_coherence_score: number;
        price_tier: 'budget' | 'mid_range' | 'premium' | 'luxury';
      }>;
    };
    similarity_matches?: Array<{
      item_id: string;
      similarity_score: number;
      match_type: 'style' | 'color' | 'pattern' | 'overall';
      visual_features: string[];
    }>;
  };
  processing_time_ms: number;
  metadata: {
    model_version: string;
    analysis_timestamp: string;
    cache_hit: boolean;
  };
}

export interface StyleTransferRequest {
  source_image_url?: string;
  source_image_base64?: string;
  target_style: string;
  intensity: number; // 0.1 to 1.0
  preserve_colors?: boolean;
  target_formality?: 'casual' | 'business_casual' | 'formal' | 'black_tie';
}

export interface StyleTransferResponse {
  success: boolean;
  transferred_image_url: string;
  style_applied: string;
  intensity_used: number;
  style_metrics: {
    style_transfer_score: number;
    color_preservation_score: number;
    formality_shift: number;
  };
  processing_time_ms: number;
}

export interface OutfitGenerationRequest {
  base_item?: {
    type: 'suit' | 'blazer' | 'shirt' | 'pants' | 'shoes';
    color: string;
    style: string;
  };
  occasion: string;
  budget_range?: {
    min: number;
    max: number;
  };
  style_preferences?: string[];
  body_type?: string;
  color_preferences?: string[];
  avoid_patterns?: string[];
}

export interface OutfitGenerationResponse {
  success: boolean;
  generated_outfits: Array<{
    outfit_id: string;
    pieces: Array<{
      item_type: string;
      color: string;
      pattern: string;
      style: string;
      required: boolean;
      price_estimate: number;
    }>;
    total_estimated_price: number;
    style_coherence_score: number;
    occasion_suitability_score: number;
    visual_harmony_score: number;
    overall_score: number;
    styling_notes: string[];
    alternative_pieces: Array<{
      item_type: string;
      alternatives: Array<{
        color: string;
        style: string;
        price_impact: number;
      }>;
    }>;
  }>;
  metadata: {
    generation_algorithm: string;
    model_version: string;
    timestamp: string;
  };
}

class FashionClipService {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;
  private retryAttempts: number;

  constructor() {
    this.baseUrl = process.env.FASHION_CLIP_API_URL || 'https://fashion-clip-kct-production.up.railway.app';
    this.apiKey = process.env.FASHION_CLIP_API_KEY || '';
    this.timeout = 30000; // 30 seconds
    this.retryAttempts = 3;
  }

  /**
   * Initialize the Fashion-CLIP service
   */
  async initialize(): Promise<void> {
    try {
      logger.info('🎨 Initializing Fashion-CLIP service...');
      
      // Test connection to Fashion-CLIP API
      await this.healthCheck();
      
      logger.info('✅ Fashion-CLIP service initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize Fashion-CLIP service:', error);
      throw error;
    }
  }

  /**
   * Health check for Fashion-CLIP API
   */
  async healthCheck(): Promise<{ status: string; version: string; uptime: number }> {
    try {
      const response = await this.makeRequest('/health');
      return response;
    } catch (error) {
      logger.error('Fashion-CLIP health check failed:', error);
      throw new Error('Fashion-CLIP service is unavailable');
    }
  }

  /**
   * Analyze image using Fashion-CLIP
   */
  async analyzeImage(request: FashionClipAnalysisRequest): Promise<FashionClipAnalysisResponse> {
    const cacheKey = `fashion-clip:analysis:${this.generateCacheKey(request)}`;
    
    try {
      // Check cache first
      const cached = await cacheService.get<FashionClipAnalysisResponse>(cacheKey);
      if (cached) {
        logger.info('Fashion-CLIP analysis cache hit');
        cached.metadata.cache_hit = true;
        return cached;
      }

      logger.info(`Analyzing image with Fashion-CLIP: ${request.analysis_type}`);
      
      const startTime = Date.now();
      const response = await this.makeRequest('/analyze', {
        method: 'POST',
        body: JSON.stringify(request)
      });

      const result: FashionClipAnalysisResponse = {
        ...response,
        processing_time_ms: Date.now() - startTime,
        metadata: {
          ...response.metadata,
          cache_hit: false,
          analysis_timestamp: new Date().toISOString()
        }
      };

      // Cache the result for 1 hour
      await cacheService.set(cacheKey, result, 3600);

      logger.info(`Fashion-CLIP analysis completed in ${result.processing_time_ms}ms`);
      return result;

    } catch (error) {
      logger.error('Fashion-CLIP analysis failed:', error);
      throw new Error(`Fashion-CLIP analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate outfit recommendations from visual input
   */
  async generateOutfitFromImage(imageUrl: string, occasion?: string): Promise<OutfitGenerationResponse> {
    try {
      logger.info('Generating outfit from image using Fashion-CLIP');

      // First, analyze the image to understand style and colors
      const analysis = await this.analyzeImage({
        image_url: imageUrl,
        analysis_type: 'style_classification',
        options: {
          return_confidence: true,
          max_results: 5
        }
      });

      // Then generate outfit based on the analysis
      const outfitRequest: OutfitGenerationRequest = {
        occasion: occasion || 'business_casual',
        style_preferences: analysis.results.style_classification?.secondary_styles.map(s => s.style) || [],
        color_preferences: analysis.results.color_analysis?.dominant_colors.map(c => c.color) || []
      };

      return await this.generateOutfit(outfitRequest);

    } catch (error) {
      logger.error('Outfit generation from image failed:', error);
      throw new Error(`Outfit generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate complete outfit recommendations
   */
  async generateOutfit(request: OutfitGenerationRequest): Promise<OutfitGenerationResponse> {
    const cacheKey = `fashion-clip:outfit-generation:${this.generateCacheKey(request)}`;
    
    try {
      // Check cache first
      const cached = await cacheService.get<OutfitGenerationResponse>(cacheKey);
      if (cached) {
        logger.info('Outfit generation cache hit');
        return cached;
      }

      logger.info('Generating outfit with Fashion-CLIP');
      
      const response = await this.makeRequest('/generate-outfit', {
        method: 'POST',
        body: JSON.stringify(request)
      });

      // Cache the result for 30 minutes
      await cacheService.set(cacheKey, response, 1800);

      logger.info(`Generated ${response.generated_outfits.length} outfit options`);
      return response;

    } catch (error) {
      logger.error('Outfit generation failed:', error);
      throw new Error(`Outfit generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Apply style transfer to an image
   */
  async applyStyleTransfer(request: StyleTransferRequest): Promise<StyleTransferResponse> {
    try {
      logger.info(`Applying style transfer: ${request.target_style}`);
      
      const response = await this.makeRequest('/style-transfer', {
        method: 'POST',
        body: JSON.stringify(request)
      });

      logger.info(`Style transfer completed in ${response.processing_time_ms}ms`);
      return response;

    } catch (error) {
      logger.error('Style transfer failed:', error);
      throw new Error(`Style transfer failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Find visually similar items
   */
  async findSimilarItems(imageUrl: string, maxResults: number = 10): Promise<FashionClipAnalysisResponse> {
    return await this.analyzeImage({
      image_url: imageUrl,
      analysis_type: 'similarity_search',
      options: {
        max_results: maxResults,
        return_confidence: true
      }
    });
  }

  /**
   * Extract colors from image
   */
  async extractColors(imageUrl: string, paletteSize: number = 5): Promise<FashionClipAnalysisResponse> {
    return await this.analyzeImage({
      image_url: imageUrl,
      analysis_type: 'color_extraction',
      options: {
        color_palette_size: paletteSize,
        return_confidence: true
      }
    });
  }

  /**
   * Classify style from image
   */
  async classifyStyle(imageUrl: string): Promise<FashionClipAnalysisResponse> {
    return await this.analyzeImage({
      image_url: imageUrl,
      analysis_type: 'style_classification',
      options: {
        return_confidence: true,
        max_results: 5
      }
    });
  }

  /**
   * Recognize patterns and textures
   */
  async recognizePatterns(imageUrl: string): Promise<FashionClipAnalysisResponse> {
    return await this.analyzeImage({
      image_url: imageUrl,
      analysis_type: 'pattern_recognition',
      options: {
        return_confidence: true
      }
    });
  }

  /**
   * Get comprehensive visual analysis
   */
  async getComprehensiveAnalysis(imageUrl: string): Promise<{
    style: FashionClipAnalysisResponse;
    colors: FashionClipAnalysisResponse;
    patterns: FashionClipAnalysisResponse;
    outfit_suggestions: OutfitGenerationResponse;
  }> {
    try {
      logger.info('Performing comprehensive visual analysis');

      const [style, colors, patterns] = await Promise.all([
        this.classifyStyle(imageUrl),
        this.extractColors(imageUrl),
        this.recognizePatterns(imageUrl)
      ]);

      // Generate outfit suggestions based on the analysis
      const outfitSuggestions = await this.generateOutfitFromImage(imageUrl);

      return {
        style,
        colors,
        patterns,
        outfit_suggestions: outfitSuggestions
      };

    } catch (error) {
      logger.error('Comprehensive analysis failed:', error);
      throw new Error(`Comprehensive analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Make HTTP request to Fashion-CLIP API with retry logic
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultOptions: RequestInit = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'User-Agent': 'KCT-Knowledge-API/2.0.0'
      },
      timeout: this.timeout,
      ...options
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        logger.debug(`Fashion-CLIP API request (attempt ${attempt}): ${options.method || 'GET'} ${endpoint}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...defaultOptions,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (attempt > 1) {
          logger.info(`Fashion-CLIP API request succeeded on attempt ${attempt}`);
        }

        return data;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(`Fashion-CLIP API request failed (attempt ${attempt}/${this.retryAttempts}):`, lastError.message);

        if (attempt < this.retryAttempts) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Fashion-CLIP API request failed after all retries');
  }

  /**
   * Generate cache key from request object
   */
  private generateCacheKey(request: any): string {
    const str = JSON.stringify(request, Object.keys(request).sort());
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

export const fashionClipService = new FashionClipService();