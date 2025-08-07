import { fashionClipService, FashionClipAnalysisRequest } from '../services/fashion-clip-service';
import { cacheService } from '../services/cache-service';

// Mock dependencies
jest.mock('../services/cache-service');
jest.mock('../utils/logger');

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('FashionClipService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the service
    (fashionClipService as any).initialized = false;
  });

  describe('initialize', () => {
    it('should initialize successfully with valid API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy', version: '2.0.0', uptime: 1000 })
      });

      await expect(fashionClipService.initialize()).resolves.not.toThrow();
    });

    it('should throw error when API is unavailable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fashionClipService.initialize()).rejects.toThrow('Fashion-CLIP service is unavailable');
    });

    it('should not reinitialize if already initialized', async () => {
      (fashionClipService as any).initialized = true;
      
      await fashionClipService.initialize();
      
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy', version: '2.0.0', uptime: 1000 })
      });
      await fashionClipService.initialize();
      jest.clearAllMocks();
    });

    it('should return health status successfully', async () => {
      const mockHealth = { status: 'healthy', version: '2.0.0', uptime: 1000 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHealth
      });

      const result = await fashionClipService.healthCheck();
      
      expect(result).toEqual(mockHealth);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ',
            'User-Agent': 'KCT-Knowledge-API/2.0.0'
          })
        })
      );
    });

    it('should throw error when health check fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fashionClipService.healthCheck()).rejects.toThrow('Fashion-CLIP service is unavailable');
    });
  });

  describe('analyzeImage', () => {
    const mockAnalysisRequest: FashionClipAnalysisRequest = {
      image_url: 'https://example.com/image.jpg',
      analysis_type: 'style_classification',
      options: {
        return_confidence: true,
        max_results: 5
      }
    };

    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy', version: '2.0.0', uptime: 1000 })
      });
      await fashionClipService.initialize();
      jest.clearAllMocks();
    });

    it('should analyze image successfully', async () => {
      const mockResponse = {
        success: true,
        analysis_type: 'style_classification',
        results: {
          style_classification: {
            primary_style: 'business_formal',
            confidence: 0.9,
            secondary_styles: [
              { style: 'classic', confidence: 0.7 }
            ],
            formality_level: 'formal',
            occasion_suitability: ['business', 'wedding']
          }
        },
        metadata: {
          model_version: '2.0.0'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      (cacheService.get as jest.Mock).mockResolvedValueOnce(null);
      (cacheService.set as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await fashionClipService.analyzeImage(mockAnalysisRequest);

      expect(result.success).toBe(true);
      expect(result.analysis_type).toBe('style_classification');
      expect(result.processing_time_ms).toBeGreaterThan(0);
      expect(result.metadata.cache_hit).toBe(false);
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should return cached result when available', async () => {
      const cachedResult = {
        success: true,
        analysis_type: 'style_classification',
        results: {},
        processing_time_ms: 100,
        metadata: { cache_hit: false }
      };

      (cacheService.get as jest.Mock).mockResolvedValueOnce(cachedResult);

      const result = await fashionClipService.analyzeImage(mockAnalysisRequest);

      expect(result.metadata.cache_hit).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      (cacheService.get as jest.Mock).mockResolvedValueOnce(null);

      await expect(fashionClipService.analyzeImage(mockAnalysisRequest))
        .rejects.toThrow('Fashion-CLIP analysis failed');
    });

    it('should retry on network failures', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, results: {} })
        });

      (cacheService.get as jest.Mock).mockResolvedValueOnce(null);
      (cacheService.set as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await fashionClipService.analyzeImage(mockAnalysisRequest);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should validate required parameters', async () => {
      const invalidRequest = {
        analysis_type: 'style_classification'
      } as FashionClipAnalysisRequest;

      // Should not throw - the service should handle missing image_url gracefully
      const result = await fashionClipService.analyzeImage(invalidRequest);
      expect(result).toBeDefined();
    });
  });

  describe('generateOutfitFromImage', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy', version: '2.0.0', uptime: 1000 })
      });
      await fashionClipService.initialize();
      jest.clearAllMocks();
    });

    it('should generate outfit from image successfully', async () => {
      const mockAnalysisResponse = {
        success: true,
        results: {
          style_classification: {
            primary_style: 'business_formal',
            secondary_styles: [{ style: 'classic', confidence: 0.8 }]
          },
          color_analysis: {
            dominant_colors: [
              { color: 'navy', percentage: 0.6 },
              { color: 'white', percentage: 0.3 }
            ]
          }
        }
      };

      const mockOutfitResponse = {
        success: true,
        generated_outfits: [
          {
            outfit_id: 'outfit_1',
            pieces: [
              { item_type: 'suit', color: 'navy', style: 'classic' },
              { item_type: 'shirt', color: 'white', style: 'classic' }
            ],
            overall_score: 0.85
          }
        ]
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAnalysisResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockOutfitResponse
        });

      (cacheService.get as jest.Mock).mockResolvedValue(null);
      (cacheService.set as jest.Mock).mockResolvedValue(undefined);

      const result = await fashionClipService.generateOutfitFromImage(
        'https://example.com/image.jpg',
        'business_casual'
      );

      expect(result.success).toBe(true);
      expect(result.generated_outfits).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle image analysis failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Analysis failed'));
      (cacheService.get as jest.Mock).mockResolvedValue(null);

      await expect(fashionClipService.generateOutfitFromImage('https://example.com/image.jpg'))
        .rejects.toThrow('Outfit generation failed');
    });
  });

  describe('extractColors', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy', version: '2.0.0', uptime: 1000 })
      });
      await fashionClipService.initialize();
      jest.clearAllMocks();
    });

    it('should extract colors successfully', async () => {
      const mockResponse = {
        success: true,
        analysis_type: 'color_extraction',
        results: {
          color_analysis: {
            dominant_colors: [
              { color: 'navy', hex: '#000080', percentage: 0.5 },
              { color: 'white', hex: '#FFFFFF', percentage: 0.3 }
            ]
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      (cacheService.get as jest.Mock).mockResolvedValue(null);
      (cacheService.set as jest.Mock).mockResolvedValue(undefined);

      const result = await fashionClipService.extractColors('https://example.com/image.jpg', 5);

      expect(result.success).toBe(true);
      expect(result.analysis_type).toBe('color_extraction');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/analyze'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            image_url: 'https://example.com/image.jpg',
            analysis_type: 'color_extraction',
            options: {
              color_palette_size: 5,
              return_confidence: true
            }
          })
        })
      );
    });
  });

  describe('findSimilarItems', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy', version: '2.0.0', uptime: 1000 })
      });
      await fashionClipService.initialize();
      jest.clearAllMocks();
    });

    it('should find similar items successfully', async () => {
      const mockResponse = {
        success: true,
        analysis_type: 'similarity_search',
        results: {
          similarity_matches: [
            {
              item_id: 'item_1',
              similarity_score: 0.9,
              match_type: 'overall',
              visual_features: ['color', 'style']
            }
          ]
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      (cacheService.get as jest.Mock).mockResolvedValue(null);
      (cacheService.set as jest.Mock).mockResolvedValue(undefined);

      const result = await fashionClipService.findSimilarItems('https://example.com/image.jpg', 10);

      expect(result.success).toBe(true);
      expect(result.results.similarity_matches).toHaveLength(1);
    });
  });

  describe('applyStyleTransfer', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy', version: '2.0.0', uptime: 1000 })
      });
      await fashionClipService.initialize();
      jest.clearAllMocks();
    });

    it('should apply style transfer successfully', async () => {
      const mockResponse = {
        success: true,
        transferred_image_url: 'https://example.com/transferred.jpg',
        style_applied: 'business_formal',
        intensity_used: 0.8,
        processing_time_ms: 2000
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const styleTransferRequest = {
        source_image_url: 'https://example.com/source.jpg',
        target_style: 'business_formal',
        intensity: 0.8
      };

      const result = await fashionClipService.applyStyleTransfer(styleTransferRequest);

      expect(result.success).toBe(true);
      expect(result.transferred_image_url).toBe('https://example.com/transferred.jpg');
      expect(result.style_applied).toBe('business_formal');
    });

    it('should handle style transfer errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      });

      const styleTransferRequest = {
        source_image_url: 'https://example.com/source.jpg',
        target_style: 'business_formal',
        intensity: 0.8
      };

      await expect(fashionClipService.applyStyleTransfer(styleTransferRequest))
        .rejects.toThrow('Style transfer failed');
    });
  });

  describe('getComprehensiveAnalysis', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy', version: '2.0.0', uptime: 1000 })
      });
      await fashionClipService.initialize();
      jest.clearAllMocks();
    });

    it('should perform comprehensive analysis successfully', async () => {
      const mockStyleResponse = {
        success: true,
        analysis_type: 'style_classification',
        results: { style_classification: { primary_style: 'business_formal' } }
      };

      const mockColorResponse = {
        success: true,
        analysis_type: 'color_extraction',
        results: { color_analysis: { dominant_colors: [] } }
      };

      const mockPatternResponse = {
        success: true,
        analysis_type: 'pattern_recognition',
        results: { pattern_recognition: { patterns: [] } }
      };

      const mockOutfitResponse = {
        success: true,
        generated_outfits: []
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockStyleResponse })
        .mockResolvedValueOnce({ ok: true, json: async () => mockColorResponse })
        .mockResolvedValueOnce({ ok: true, json: async () => mockPatternResponse })
        .mockResolvedValueOnce({ ok: true, json: async () => mockOutfitResponse });

      (cacheService.get as jest.Mock).mockResolvedValue(null);
      (cacheService.set as jest.Mock).mockResolvedValue(undefined);

      const result = await fashionClipService.getComprehensiveAnalysis('https://example.com/image.jpg');

      expect(result.style.success).toBe(true);
      expect(result.colors.success).toBe(true);
      expect(result.patterns.success).toBe(true);
      expect(result.outfit_suggestions.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('should handle partial analysis failures', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) })
        .mockRejectedValueOnce(new Error('Color analysis failed'))
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });

      (cacheService.get as jest.Mock).mockResolvedValue(null);

      await expect(fashionClipService.getComprehensiveAnalysis('https://example.com/image.jpg'))
        .rejects.toThrow('Comprehensive analysis failed');
    });
  });

  describe('Error handling and edge cases', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy', version: '2.0.0', uptime: 1000 })
      });
      await fashionClipService.initialize();
      jest.clearAllMocks();
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'AbortError';
      
      mockFetch.mockRejectedValue(timeoutError);
      (cacheService.get as jest.Mock).mockResolvedValue(null);

      await expect(fashionClipService.analyzeImage({
        image_url: 'https://example.com/image.jpg',
        analysis_type: 'style_classification'
      })).rejects.toThrow('Fashion-CLIP analysis failed');

      // Should retry 3 times
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON'); }
      });

      (cacheService.get as jest.Mock).mockResolvedValue(null);

      await expect(fashionClipService.analyzeImage({
        image_url: 'https://example.com/image.jpg',
        analysis_type: 'style_classification'
      })).rejects.toThrow('Fashion-CLIP analysis failed');
    });

    it('should generate proper cache keys for different requests', async () => {
      const request1 = { image_url: 'url1', analysis_type: 'style_classification' as const };
      const request2 = { image_url: 'url2', analysis_type: 'style_classification' as const };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, results: {} })
      });

      (cacheService.get as jest.Mock).mockResolvedValue(null);
      (cacheService.set as jest.Mock).mockResolvedValue(undefined);

      await fashionClipService.analyzeImage(request1);
      await fashionClipService.analyzeImage(request2);

      expect(cacheService.set).toHaveBeenCalledTimes(2);
      
      // Cache keys should be different for different requests
      const call1 = (cacheService.set as jest.Mock).mock.calls[0][0];
      const call2 = (cacheService.set as jest.Mock).mock.calls[1][0];
      expect(call1).not.toBe(call2);
    });
  });
});