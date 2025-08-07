import { visualAnalysisEngine, VisualAnalysisRequest } from '../services/visual-analysis-engine';
import { fashionClipService } from '../services/fashion-clip-service';
import { colorService } from '../services/color-service';
import { styleProfileService } from '../services/style-profile-service';
import { cacheService } from '../services/cache-service';

// Mock dependencies
jest.mock('../services/fashion-clip-service');
jest.mock('../services/color-service');
jest.mock('../services/style-profile-service');
jest.mock('../services/cache-service');
jest.mock('../utils/logger');

const mockFashionClipService = fashionClipService as jest.Mocked<typeof fashionClipService>;
const mockColorService = colorService as jest.Mocked<typeof colorService>;
const mockStyleProfileService = styleProfileService as jest.Mocked<typeof styleProfileService>;
const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;

describe('VisualAnalysisEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset initialization status
    (visualAnalysisEngine as any).initialized = false;
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      mockFashionClipService.initialize.mockResolvedValueOnce(undefined);

      await expect(visualAnalysisEngine.initialize()).resolves.not.toThrow();
      expect(mockFashionClipService.initialize).toHaveBeenCalledTimes(1);
    });

    it('should not reinitialize if already initialized', async () => {
      (visualAnalysisEngine as any).initialized = true;
      
      await visualAnalysisEngine.initialize();
      
      expect(mockFashionClipService.initialize).not.toHaveBeenCalled();
    });

    it('should handle initialization failures', async () => {
      mockFashionClipService.initialize.mockRejectedValueOnce(new Error('Init failed'));

      await expect(visualAnalysisEngine.initialize()).rejects.toThrow('Init failed');
    });
  });

  describe('analyzeImage', () => {
    const mockRequest: VisualAnalysisRequest = {
      image_url: 'https://example.com/image.jpg',
      analysis_depth: 'comprehensive',
      context: {
        occasion: 'business_formal',
        customer_profile: { age: 30, style: 'classic' }
      }
    };

    const mockFashionClipAnalysis = {
      style: {
        results: {
          style_classification: {
            primary_style: 'business_formal',
            confidence: 0.9,
            formality_level: 'formal',
            occasion_suitability: ['business', 'formal_event']
          }
        }
      },
      colors: {
        results: {
          color_analysis: {
            dominant_colors: [
              { color: 'navy', hex: '#000080', percentage: 0.6, color_family: 'blue' },
              { color: 'white', hex: '#FFFFFF', percentage: 0.3, color_family: 'neutral' }
            ]
          }
        }
      },
      patterns: {
        results: {
          pattern_recognition: {
            patterns: [
              { type: 'solid', confidence: 0.9, area_coverage: 1.0 }
            ],
            texture_analysis: {
              primary_texture: 'smooth',
              fabric_type_prediction: 'wool',
              formality_indicator: 0.8
            }
          }
        }
      },
      outfit_suggestions: {
        generated_outfits: [
          {
            outfit_id: 'outfit_1',
            pieces: [
              { item_type: 'suit', color: 'navy', style: 'classic', required: true, price_estimate: 400 }
            ],
            overall_score: 0.85,
            style_coherence_score: 0.9,
            visual_harmony_score: 0.8,
            occasion_suitability_score: 0.9
          }
        ]
      }
    };

    beforeEach(async () => {
      mockFashionClipService.initialize.mockResolvedValueOnce(undefined);
      await visualAnalysisEngine.initialize();
      jest.clearAllMocks();
    });

    it('should analyze image successfully with comprehensive analysis', async () => {
      mockCacheService.get.mockResolvedValueOnce(null);
      mockCacheService.set.mockResolvedValueOnce(undefined);
      mockFashionClipService.getComprehensiveAnalysis.mockResolvedValueOnce(mockFashionClipAnalysis);

      const result = await visualAnalysisEngine.analyzeImage(mockRequest);

      expect(result.success).toBe(true);
      expect(result.style_analysis.primary_style).toBe('business_formal');
      expect(result.color_analysis.dominant_colors).toHaveLength(2);
      expect(result.outfit_recommendations.complete_outfits).toBeDefined();
      expect(result.processing_metadata.analysis_time_ms).toBeGreaterThan(0);
      expect(result.processing_metadata.cache_status).toBe('miss');
      
      expect(mockFashionClipService.getComprehensiveAnalysis).toHaveBeenCalledWith('https://example.com/image.jpg');
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should return cached result when available', async () => {
      const cachedResult = {
        success: true,
        style_analysis: { primary_style: 'cached_style' },
        processing_metadata: { cache_status: 'hit' }
      };

      mockCacheService.get.mockResolvedValueOnce(cachedResult);

      const result = await visualAnalysisEngine.analyzeImage(mockRequest);

      expect(result.processing_metadata.cache_status).toBe('hit');
      expect(mockFashionClipService.getComprehensiveAnalysis).not.toHaveBeenCalled();
    });

    it('should handle basic analysis depth', async () => {
      const basicRequest = { ...mockRequest, analysis_depth: 'basic' as const };
      
      mockCacheService.get.mockResolvedValueOnce(null);
      mockCacheService.set.mockResolvedValueOnce(undefined);
      mockFashionClipService.getComprehensiveAnalysis.mockResolvedValueOnce(mockFashionClipAnalysis);

      const result = await visualAnalysisEngine.analyzeImage(basicRequest);

      expect(result.success).toBe(true);
      expect(result.body_type_analysis).toBeUndefined(); // Should not include advanced analysis
    });

    it('should handle advanced analysis depth', async () => {
      const advancedRequest = { ...mockRequest, analysis_depth: 'advanced' as const };
      
      mockCacheService.get.mockResolvedValueOnce(null);
      mockCacheService.set.mockResolvedValueOnce(undefined);
      mockFashionClipService.getComprehensiveAnalysis.mockResolvedValueOnce(mockFashionClipAnalysis);

      const result = await visualAnalysisEngine.analyzeImage(advancedRequest);

      expect(result.success).toBe(true);
      expect(result.body_type_analysis).toBeDefined(); // Should include advanced analysis
    });

    it('should handle Fashion-CLIP service failures', async () => {
      mockCacheService.get.mockResolvedValueOnce(null);
      mockFashionClipService.getComprehensiveAnalysis.mockRejectedValueOnce(new Error('Analysis failed'));

      await expect(visualAnalysisEngine.analyzeImage(mockRequest))
        .rejects.toThrow('Visual analysis failed');
    });

    it('should handle missing image URL', async () => {
      const requestWithoutUrl = { ...mockRequest, image_url: undefined };
      
      mockCacheService.get.mockResolvedValueOnce(null);
      mockFashionClipService.getComprehensiveAnalysis.mockResolvedValueOnce(mockFashionClipAnalysis);

      const result = await visualAnalysisEngine.analyzeImage(requestWithoutUrl);
      
      expect(result.success).toBe(true);
      expect(mockFashionClipService.getComprehensiveAnalysis).toHaveBeenCalledWith('');
    });
  });

  describe('imageToOutfit', () => {
    const mockImageToOutfitRequest = {
      image_url: 'https://example.com/image.jpg',
      target_occasion: 'business_formal',
      budget_constraints: {
        min_budget: 300,
        max_budget: 800,
        priority_items: ['suit', 'shirt']
      },
      style_preferences: {
        preferred_styles: ['classic', 'modern'],
        avoid_styles: ['trendy'],
        color_preferences: ['navy', 'white'],
        pattern_tolerance: 'minimal' as const
      }
    };

    const mockAnalysisResult = {
      success: true,
      style_analysis: {
        primary_style: 'business_formal',
        occasion_suitability: [
          { occasion: 'business', suitability_score: 0.9 }
        ]
      },
      color_analysis: {
        dominant_colors: [
          { color: 'navy', percentage: 0.6 },
          { color: 'white', percentage: 0.3 }
        ]
      },
      body_type_analysis: {
        inferred_body_type: 'athletic'
      }
    };

    const mockOutfitSuggestions = {
      success: true,
      generated_outfits: [
        {
          outfit_id: 'outfit_1',
          pieces: [
            { item_type: 'suit', color: 'navy', style: 'classic' }
          ],
          styling_notes: ['Professional look']
        }
      ]
    };

    beforeEach(async () => {
      mockFashionClipService.initialize.mockResolvedValueOnce(undefined);
      await visualAnalysisEngine.initialize();
      jest.clearAllMocks();
    });

    it('should generate outfit from image successfully', async () => {
      // Mock the analyzeImage method
      jest.spyOn(visualAnalysisEngine, 'analyzeImage').mockResolvedValueOnce(mockAnalysisResult as any);
      mockFashionClipService.generateOutfit.mockResolvedValueOnce(mockOutfitSuggestions);

      const result = await visualAnalysisEngine.imageToOutfit(mockImageToOutfitRequest);

      expect(result.success).toBe(true);
      expect(result.generated_outfits).toHaveLength(1);
      expect(result.generated_outfits[0].styling_notes).toContain('Professional look');
      
      expect(mockFashionClipService.generateOutfit).toHaveBeenCalledWith({
        occasion: 'business_formal',
        budget_range: { min: 300, max: 800 },
        style_preferences: ['business'],
        color_preferences: ['navy', 'white'],
        body_type: 'athletic'
      });
    });

    it('should handle image analysis failure', async () => {
      jest.spyOn(visualAnalysisEngine, 'analyzeImage').mockRejectedValueOnce(new Error('Analysis failed'));

      await expect(visualAnalysisEngine.imageToOutfit(mockImageToOutfitRequest))
        .rejects.toThrow('Image to outfit failed');
    });

    it('should handle outfit generation failure', async () => {
      jest.spyOn(visualAnalysisEngine, 'analyzeImage').mockResolvedValueOnce(mockAnalysisResult as any);
      mockFashionClipService.generateOutfit.mockRejectedValueOnce(new Error('Generation failed'));

      await expect(visualAnalysisEngine.imageToOutfit(mockImageToOutfitRequest))
        .rejects.toThrow('Image to outfit failed');
    });

    it('should work with minimal request parameters', async () => {
      const minimalRequest = {
        image_url: 'https://example.com/image.jpg',
        target_occasion: 'casual'
      };

      jest.spyOn(visualAnalysisEngine, 'analyzeImage').mockResolvedValueOnce(mockAnalysisResult as any);
      mockFashionClipService.generateOutfit.mockResolvedValueOnce(mockOutfitSuggestions);

      const result = await visualAnalysisEngine.imageToOutfit(minimalRequest);

      expect(result.success).toBe(true);
      expect(mockFashionClipService.generateOutfit).toHaveBeenCalledWith({
        occasion: 'casual',
        budget_range: undefined,
        style_preferences: ['business'],
        color_preferences: ['navy', 'white'],
        body_type: 'athletic'
      });
    });
  });

  describe('analyzeStyleTransfer', () => {
    const mockSourceAnalysis = {
      style_analysis: {
        primary_style: 'casual',
        style_family: 'relaxed',
        formality_level: 'casual'
      },
      color_analysis: {
        dominant_colors: [
          { color: 'blue' },
          { color: 'white' }
        ]
      },
      pattern_texture_analysis: {
        patterns: [
          { type: 'solid' }
        ]
      }
    };

    const mockTargetStyleProfile = {
      key_pieces: ['suit', 'dress_shirt', 'tie'],
      color_palette: ['navy', 'white', 'gray'],
      pattern_preferences: ['solid', 'subtle_stripe']
    };

    beforeEach(async () => {
      mockFashionClipService.initialize.mockResolvedValueOnce(undefined);
      await visualAnalysisEngine.initialize();
      jest.clearAllMocks();
    });

    it('should analyze style transfer successfully', async () => {
      jest.spyOn(visualAnalysisEngine, 'analyzeImage').mockResolvedValueOnce(mockSourceAnalysis as any);
      mockStyleProfileService.getProfile.mockResolvedValueOnce(mockTargetStyleProfile);

      const result = await visualAnalysisEngine.analyzeStyleTransfer(
        'https://example.com/source.jpg',
        'business_formal'
      );

      expect(result.source_style.identified_style).toBe('casual');
      expect(result.target_style.desired_style).toBe('business_formal');
      expect(result.transformation_plan.feasibility_score).toBeGreaterThan(0);
      
      expect(mockStyleProfileService.getProfile).toHaveBeenCalledWith('business_formal');
    });

    it('should handle source analysis failure', async () => {
      jest.spyOn(visualAnalysisEngine, 'analyzeImage').mockRejectedValueOnce(new Error('Analysis failed'));

      await expect(visualAnalysisEngine.analyzeStyleTransfer(
        'https://example.com/source.jpg',
        'business_formal'
      )).rejects.toThrow('Style transfer analysis failed');
    });

    it('should handle missing target style profile', async () => {
      jest.spyOn(visualAnalysisEngine, 'analyzeImage').mockResolvedValueOnce(mockSourceAnalysis as any);
      mockStyleProfileService.getProfile.mockResolvedValueOnce(null);

      const result = await visualAnalysisEngine.analyzeStyleTransfer(
        'https://example.com/source.jpg',
        'unknown_style'
      );

      expect(result.target_style.transformation_elements).toEqual([]);
      expect(result.target_style.color_adjustments).toEqual([]);
    });
  });

  describe('findVisualSimilarItems', () => {
    const mockSimilarityResults = {
      results: {
        similarity_matches: [
          {
            item_id: 'item_1',
            similarity_score: 0.9,
            match_type: 'overall',
            visual_features: ['color', 'style']
          },
          {
            item_id: 'item_2',
            similarity_score: 0.8,
            match_type: 'color',
            visual_features: ['color']
          },
          {
            item_id: 'item_3',
            similarity_score: 0.6,
            match_type: 'style',
            visual_features: ['style']
          }
        ]
      }
    };

    beforeEach(async () => {
      mockFashionClipService.initialize.mockResolvedValueOnce(undefined);
      await visualAnalysisEngine.initialize();
      jest.clearAllMocks();
    });

    it('should find similar items successfully', async () => {
      mockFashionClipService.findSimilarItems.mockResolvedValueOnce(mockSimilarityResults);

      const result = await visualAnalysisEngine.findVisualSimilarItems(
        'https://example.com/image.jpg',
        10,
        0.75
      );

      expect(result).toHaveLength(2); // Only items with score >= 0.75
      expect(result[0].similarity_score).toBe(0.9);
      expect(result[1].similarity_score).toBe(0.8);
      expect(result[0].match_aspects).toEqual(['color', 'style']);
      
      expect(mockFashionClipService.findSimilarItems).toHaveBeenCalledWith(
        'https://example.com/image.jpg',
        10
      );
    });

    it('should handle no similarity matches', async () => {
      const emptyResults = { results: { similarity_matches: null } };
      mockFashionClipService.findSimilarItems.mockResolvedValueOnce(emptyResults);

      const result = await visualAnalysisEngine.findVisualSimilarItems(
        'https://example.com/image.jpg'
      );

      expect(result).toEqual([]);
    });

    it('should filter by similarity threshold', async () => {
      mockFashionClipService.findSimilarItems.mockResolvedValueOnce(mockSimilarityResults);

      const result = await visualAnalysisEngine.findVisualSimilarItems(
        'https://example.com/image.jpg',
        10,
        0.85
      );

      expect(result).toHaveLength(1); // Only items with score >= 0.85
      expect(result[0].similarity_score).toBe(0.9);
    });

    it('should sort results by similarity score', async () => {
      const unorderedResults = {
        results: {
          similarity_matches: [
            { item_id: 'item_1', similarity_score: 0.7, visual_features: [] },
            { item_id: 'item_2', similarity_score: 0.9, visual_features: [] },
            { item_id: 'item_3', similarity_score: 0.8, visual_features: [] }
          ]
        }
      };

      mockFashionClipService.findSimilarItems.mockResolvedValueOnce(unorderedResults);

      const result = await visualAnalysisEngine.findVisualSimilarItems(
        'https://example.com/image.jpg',
        10,
        0.5
      );

      expect(result[0].similarity_score).toBe(0.9);
      expect(result[1].similarity_score).toBe(0.8);
      expect(result[2].similarity_score).toBe(0.7);
    });

    it('should handle API failures', async () => {
      mockFashionClipService.findSimilarItems.mockRejectedValueOnce(new Error('API error'));

      await expect(visualAnalysisEngine.findVisualSimilarItems('https://example.com/image.jpg'))
        .rejects.toThrow('Visual similarity search failed');
    });
  });

  describe('Cache key generation', () => {
    beforeEach(async () => {
      mockFashionClipService.initialize.mockResolvedValueOnce(undefined);
      await visualAnalysisEngine.initialize();
      jest.clearAllMocks();
    });

    it('should generate different cache keys for different requests', async () => {
      const request1 = {
        image_url: 'https://example.com/image1.jpg',
        analysis_depth: 'basic' as const
      };

      const request2 = {
        image_url: 'https://example.com/image2.jpg',
        analysis_depth: 'basic' as const
      };

      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockFashionClipService.getComprehensiveAnalysis.mockResolvedValue({
        style: { results: {} },
        colors: { results: {} },
        patterns: { results: {} },
        outfit_suggestions: { generated_outfits: [] }
      });

      await visualAnalysisEngine.analyzeImage(request1);
      await visualAnalysisEngine.analyzeImage(request2);

      expect(mockCacheService.set).toHaveBeenCalledTimes(2);
      
      const cacheKey1 = mockCacheService.set.mock.calls[0][0];
      const cacheKey2 = mockCacheService.set.mock.calls[1][0];
      
      expect(cacheKey1).not.toBe(cacheKey2);
      expect(cacheKey1).toContain('visual-analysis:');
      expect(cacheKey2).toContain('visual-analysis:');
    });

    it('should generate same cache key for identical requests', async () => {
      const request = {
        image_url: 'https://example.com/image.jpg',
        analysis_depth: 'basic' as const,
        context: { occasion: 'business' }
      };

      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockFashionClipService.getComprehensiveAnalysis.mockResolvedValue({
        style: { results: {} },
        colors: { results: {} },
        patterns: { results: {} },
        outfit_suggestions: { generated_outfits: [] }
      });

      await visualAnalysisEngine.analyzeImage(request);
      await visualAnalysisEngine.analyzeImage({ ...request }); // Same request

      const cacheKey1 = mockCacheService.set.mock.calls[0][0];
      const cacheKey2 = mockCacheService.set.mock.calls[1][0];
      
      expect(cacheKey1).toBe(cacheKey2);
    });
  });

  describe('Error handling and edge cases', () => {
    beforeEach(async () => {
      mockFashionClipService.initialize.mockResolvedValueOnce(undefined);
      await visualAnalysisEngine.initialize();
      jest.clearAllMocks();
    });

    it('should handle cache service failures gracefully', async () => {
      mockCacheService.get.mockRejectedValueOnce(new Error('Cache error'));
      mockCacheService.set.mockResolvedValueOnce(undefined);
      mockFashionClipService.getComprehensiveAnalysis.mockResolvedValueOnce({
        style: { results: { style_classification: { primary_style: 'test' } } },
        colors: { results: { color_analysis: { dominant_colors: [] } } },
        patterns: { results: { pattern_recognition: { patterns: [] } } },
        outfit_suggestions: { generated_outfits: [] }
      });

      const result = await visualAnalysisEngine.analyzeImage({
        image_url: 'https://example.com/image.jpg',
        analysis_depth: 'basic'
      });

      expect(result.success).toBe(true);
      // Should continue despite cache error
    });

    it('should handle empty analysis results', async () => {
      mockCacheService.get.mockResolvedValueOnce(null);
      mockCacheService.set.mockResolvedValueOnce(undefined);
      mockFashionClipService.getComprehensiveAnalysis.mockResolvedValueOnce({
        style: { results: {} },
        colors: { results: {} },
        patterns: { results: {} },
        outfit_suggestions: { generated_outfits: [] }
      });

      const result = await visualAnalysisEngine.analyzeImage({
        image_url: 'https://example.com/image.jpg',
        analysis_depth: 'basic'
      });

      expect(result.success).toBe(true);
      expect(result.style_analysis.primary_style).toBe('unknown');
      expect(result.color_analysis.dominant_colors).toEqual([]);
    });

    it('should auto-initialize if not initialized', async () => {
      (visualAnalysisEngine as any).initialized = false;
      mockFashionClipService.initialize.mockResolvedValueOnce(undefined);
      mockCacheService.get.mockResolvedValueOnce(null);
      mockFashionClipService.getComprehensiveAnalysis.mockResolvedValueOnce({
        style: { results: {} },
        colors: { results: {} },
        patterns: { results: {} },
        outfit_suggestions: { generated_outfits: [] }
      });

      await visualAnalysisEngine.analyzeImage({
        image_url: 'https://example.com/image.jpg',
        analysis_depth: 'basic'
      });

      expect(mockFashionClipService.initialize).toHaveBeenCalledTimes(1);
    });
  });
});