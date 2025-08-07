import { aiScoringSystem, OutfitBundle, ScoringRequest } from '../services/ai-scoring-system';
import { colorService } from '../services/color-service';
import { styleProfileService } from '../services/style-profile-service';
import { conversionService } from '../services/conversion-service';
import { trendingAnalysisService } from '../services/trending-analysis-service';
import { cacheService } from '../services/cache-service';

// Mock dependencies
jest.mock('../services/color-service');
jest.mock('../services/style-profile-service');
jest.mock('../services/conversion-service');
jest.mock('../services/trending-analysis-service');
jest.mock('../services/cache-service');
jest.mock('../utils/logger');

const mockColorService = colorService as jest.Mocked<typeof colorService>;
const mockStyleProfileService = styleProfileService as jest.Mocked<typeof styleProfileService>;
const mockConversionService = conversionService as jest.Mocked<typeof conversionService>;
const mockTrendingAnalysisService = trendingAnalysisService as jest.Mocked<typeof trendingAnalysisService>;
const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;

describe('AIScoringSystem', () => {
  const mockBundle: OutfitBundle = {
    bundle_id: 'bundle_001',
    name: 'Classic Business Bundle',
    pieces: [
      {
        item_id: 'suit_001',
        item_type: 'suit',
        color: 'navy',
        pattern: 'solid',
        fabric: 'wool',
        style: 'classic',
        size_range: ['40R', '42R'],
        price: 400,
        availability: 'in_stock',
        brand: 'KCT'
      },
      {
        item_id: 'shirt_001',
        item_type: 'shirt',
        color: 'white',
        pattern: 'solid',
        fabric: 'cotton',
        style: 'classic',
        size_range: ['M', 'L'],
        price: 80,
        availability: 'in_stock',
        brand: 'KCT'
      }
    ],
    occasion: 'business_formal',
    season: 'year_round',
    formality_level: 'business_formal',
    target_demographics: {
      age_range: '25-40',
      style_preference: 'classic',
      budget_range: { min: 400, max: 800 },
      body_types: ['athletic', 'regular']
    },
    total_price: 480,
    final_price: 450
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset initialization status
    (aiScoringSystem as any).initialized = false;
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      mockColorService.initialize = jest.fn().mockResolvedValueOnce(undefined);
      mockStyleProfileService.initialize = jest.fn().mockResolvedValueOnce(undefined);
      mockConversionService.initialize = jest.fn().mockResolvedValueOnce(undefined);
      mockTrendingAnalysisService.initialize.mockResolvedValueOnce(undefined);

      await expect(aiScoringSystem.initialize()).resolves.not.toThrow();
      
      expect(mockTrendingAnalysisService.initialize).toHaveBeenCalledTimes(1);
    });

    it('should not reinitialize if already initialized', async () => {
      (aiScoringSystem as any).initialized = true;
      
      await aiScoringSystem.initialize();
      
      expect(mockTrendingAnalysisService.initialize).not.toHaveBeenCalled();
    });

    it('should handle initialization failures', async () => {
      mockTrendingAnalysisService.initialize.mockRejectedValueOnce(new Error('Init failed'));

      await expect(aiScoringSystem.initialize()).rejects.toThrow('Init failed');
    });
  });

  describe('scoreBundle', () => {
    const mockContext = {
      target_customer: {
        age: 30,
        style_preference: 'classic',
        budget_range: { min: 400, max: 800 }
      }
    };

    beforeEach(async () => {
      mockTrendingAnalysisService.initialize.mockResolvedValueOnce(undefined);
      await aiScoringSystem.initialize();
      jest.clearAllMocks();
    });

    it('should score bundle successfully', async () => {
      mockCacheService.get.mockResolvedValueOnce(null);
      mockCacheService.set.mockResolvedValueOnce(undefined);
      
      // Mock conversion service response
      mockConversionService.predictConversionRate.mockResolvedValueOnce({
        predicted_rate: 0.15,
        confidence: 0.8,
        factors: []
      });

      // Mock trending analysis service
      mockTrendingAnalysisService.getTrendingCombinations.mockResolvedValueOnce([
        { combination: 'navy_suit_white_shirt', score: 0.8 }
      ]);

      const result = await aiScoringSystem.scoreBundle(mockBundle, undefined, mockContext);

      expect(result.success).toBe(true);
      expect(result.bundle_id).toBe('bundle_001');
      expect(result.overall_score).toBeGreaterThan(0);
      expect(result.overall_score).toBeLessThanOrEqual(1);
      expect(result.confidence_level).toBeGreaterThan(0);
      
      // Check score breakdown structure
      expect(result.score_breakdown.conversion_probability).toBeDefined();
      expect(result.score_breakdown.style_coherence).toBeDefined();
      expect(result.score_breakdown.price_optimization).toBeDefined();
      
      expect(result.performance_predictions).toBeDefined();
      expect(result.optimization_suggestions).toBeDefined();
      expect(result.competitive_analysis).toBeDefined();
      expect(result.risk_assessment).toBeDefined();

      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should return cached score when available', async () => {
      const cachedScore = {
        bundle_id: 'bundle_001',
        overall_score: 0.8,
        confidence_level: 0.9
      };

      mockCacheService.get.mockResolvedValueOnce(cachedScore);

      const result = await aiScoringSystem.scoreBundle(mockBundle);

      expect(result).toEqual(cachedScore);
      expect(mockConversionService.predictConversionRate).not.toHaveBeenCalled();
    });

    it('should handle custom scoring criteria', async () => {
      mockCacheService.get.mockResolvedValueOnce(null);
      mockCacheService.set.mockResolvedValueOnce(undefined);
      
      mockConversionService.predictConversionRate.mockResolvedValueOnce({
        predicted_rate: 0.12,
        confidence: 0.7
      });

      mockTrendingAnalysisService.getTrendingCombinations.mockResolvedValueOnce([]);

      const customCriteria = {
        conversion_weight: 0.5,
        style_coherence_weight: 0.3,
        price_optimization_weight: 0.2
      };

      const result = await aiScoringSystem.scoreBundle(mockBundle, customCriteria, mockContext);

      expect(result.success).toBe(true);
      expect(result.overall_score).toBeGreaterThan(0);
    });

    it('should handle conversion service failures gracefully', async () => {
      mockCacheService.get.mockResolvedValueOnce(null);
      mockCacheService.set.mockResolvedValueOnce(undefined);
      
      mockConversionService.predictConversionRate.mockRejectedValueOnce(new Error('Service unavailable'));
      mockTrendingAnalysisService.getTrendingCombinations.mockResolvedValueOnce([]);

      const result = await aiScoringSystem.scoreBundle(mockBundle, undefined, mockContext);

      expect(result.success).toBe(true);
      // Should use fallback values for conversion probability
      expect(result.score_breakdown.conversion_probability.score).toBe(0.6);
      expect(result.score_breakdown.conversion_probability.confidence).toBe(0.5);
    });

    it('should handle trending analysis service failures gracefully', async () => {
      mockCacheService.get.mockResolvedValueOnce(null);
      mockCacheService.set.mockResolvedValueOnce(undefined);
      
      mockConversionService.predictConversionRate.mockResolvedValueOnce({
        predicted_rate: 0.15,
        confidence: 0.8
      });

      mockTrendingAnalysisService.getTrendingCombinations.mockRejectedValueOnce(new Error('Service error'));

      const result = await aiScoringSystem.scoreBundle(mockBundle, undefined, mockContext);

      expect(result.success).toBe(true);
      // Should use fallback values for trend alignment
      expect(result.score_breakdown.trend_alignment.score).toBe(0.6);
      expect(result.score_breakdown.trend_alignment.confidence).toBe(0.5);
    });

    it('should auto-initialize if not initialized', async () => {
      (aiScoringSystem as any).initialized = false;
      mockTrendingAnalysisService.initialize.mockResolvedValueOnce(undefined);
      mockCacheService.get.mockResolvedValueOnce(null);
      mockConversionService.predictConversionRate.mockResolvedValueOnce({
        predicted_rate: 0.15,
        confidence: 0.8
      });

      await aiScoringSystem.scoreBundle(mockBundle);

      expect(mockTrendingAnalysisService.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('scoreBundles', () => {
    const mockBundles: OutfitBundle[] = [
      { ...mockBundle, bundle_id: 'bundle_001' },
      { ...mockBundle, bundle_id: 'bundle_002', name: 'Modern Business Bundle' },
      { ...mockBundle, bundle_id: 'bundle_003', name: 'Casual Friday Bundle' }
    ];

    const mockScoringRequest: ScoringRequest = {
      bundles: mockBundles,
      context: {
        target_customer: {
          age: 30,
          style_preference: 'classic',
          budget_range: { min: 400, max: 800 }
        }
      }
    };

    beforeEach(async () => {
      mockTrendingAnalysisService.initialize.mockResolvedValueOnce(undefined);
      await aiScoringSystem.initialize();
      jest.clearAllMocks();
    });

    it('should score multiple bundles successfully', async () => {
      // Mock individual bundle scoring
      jest.spyOn(aiScoringSystem, 'scoreBundle')
        .mockResolvedValueOnce({
          bundle_id: 'bundle_001',
          overall_score: 0.8,
          confidence_level: 0.9,
          score_breakdown: {} as any,
          performance_predictions: {} as any,
          optimization_suggestions: [],
          competitive_analysis: {} as any,
          risk_assessment: {} as any
        })
        .mockResolvedValueOnce({
          bundle_id: 'bundle_002',
          overall_score: 0.7,
          confidence_level: 0.8,
          score_breakdown: {} as any,
          performance_predictions: {} as any,
          optimization_suggestions: [],
          competitive_analysis: {} as any,
          risk_assessment: {} as any
        })
        .mockResolvedValueOnce({
          bundle_id: 'bundle_003',
          overall_score: 0.6,
          confidence_level: 0.7,
          score_breakdown: {} as any,
          performance_predictions: {} as any,
          optimization_suggestions: [],
          competitive_analysis: {} as any,
          risk_assessment: {} as any
        });

      const result = await aiScoringSystem.scoreBundles(mockScoringRequest);

      expect(result.success).toBe(true);
      expect(result.scored_bundles).toHaveLength(3);
      expect(result.summary.total_bundles_scored).toBe(3);
      expect(result.summary.average_score).toBeCloseTo(0.7, 1);
      expect(result.summary.top_performers).toContain('bundle_001');
      expect(result.summary.needs_optimization).toContain('bundle_003');
      expect(result.summary.processing_time_ms).toBeGreaterThan(0);
      
      expect(result.insights.market_trends).toBeDefined();
      expect(result.insights.optimization_opportunities).toBeDefined();
      expect(result.insights.revenue_potential).toBeGreaterThan(0);

      expect(aiScoringSystem.scoreBundle).toHaveBeenCalledTimes(3);
    });

    it('should handle empty bundle list', async () => {
      const emptyRequest = { ...mockScoringRequest, bundles: [] };

      const result = await aiScoringSystem.scoreBundles(emptyRequest);

      expect(result.success).toBe(true);
      expect(result.scored_bundles).toHaveLength(0);
      expect(result.summary.total_bundles_scored).toBe(0);
      expect(result.summary.average_score).toBe(0);
    });

    it('should handle individual bundle scoring failures', async () => {
      jest.spyOn(aiScoringSystem, 'scoreBundle')
        .mockResolvedValueOnce({
          bundle_id: 'bundle_001',
          overall_score: 0.8,
          confidence_level: 0.9,
          score_breakdown: {} as any,
          performance_predictions: {} as any,
          optimization_suggestions: [],
          competitive_analysis: {} as any,
          risk_assessment: {} as any
        })
        .mockRejectedValueOnce(new Error('Scoring failed'))
        .mockResolvedValueOnce({
          bundle_id: 'bundle_003',
          overall_score: 0.6,
          confidence_level: 0.7,
          score_breakdown: {} as any,
          performance_predictions: {} as any,
          optimization_suggestions: [],
          competitive_analysis: {} as any,
          risk_assessment: {} as any
        });

      // Should fail because Promise.all doesn't handle partial failures
      await expect(aiScoringSystem.scoreBundles(mockScoringRequest))
        .rejects.toThrow('Bulk scoring failed');
    });

    it('should process bundles in parallel', async () => {
      const startTime = Date.now();
      const delay = 100;

      jest.spyOn(aiScoringSystem, 'scoreBundle')
        .mockImplementation(async (bundle) => {
          await new Promise(resolve => setTimeout(resolve, delay));
          return {
            bundle_id: bundle.bundle_id,
            overall_score: 0.7,
            confidence_level: 0.8,
            score_breakdown: {} as any,
            performance_predictions: {} as any,
            optimization_suggestions: [],
            competitive_analysis: {} as any,
            risk_assessment: {} as any
          };
        });

      await aiScoringSystem.scoreBundles(mockScoringRequest);

      const totalTime = Date.now() - startTime;
      // Should be significantly less than sequential processing (3 * delay)
      expect(totalTime).toBeLessThan(3 * delay * 0.8); // Allow for some overhead
    });
  });

  describe('getOptimizationRecommendations', () => {
    beforeEach(async () => {
      mockTrendingAnalysisService.initialize.mockResolvedValueOnce(undefined);
      await aiScoringSystem.initialize();
      jest.clearAllMocks();
    });

    it('should generate optimization recommendations', async () => {
      const mockCurrentScore = {
        bundle_id: 'bundle_001',
        overall_score: 0.6,
        score_breakdown: {
          price_optimization: { score: 0.5 },
          style_coherence: { score: 0.7 },
          trend_alignment: { score: 0.4 }
        }
      };

      jest.spyOn(aiScoringSystem, 'scoreBundle').mockResolvedValueOnce(mockCurrentScore as any);

      const result = await aiScoringSystem.getOptimizationRecommendations(
        mockBundle,
        0.8,
        { target_customer: { budget_range: { min: 400, max: 800 } } }
      );

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      
      result.forEach(optimization => {
        expect(optimization.optimization_type).toBeDefined();
        expect(optimization.current_score).toBeDefined();
        expect(optimization.potential_score).toBeGreaterThan(optimization.current_score);
        expect(optimization.changes_required).toBeInstanceOf(Array);
        expect(['low', 'medium', 'high']).toContain(optimization.estimated_effort);
        expect(optimization.expected_roi).toBeGreaterThan(0);
      });
    });

    it('should only suggest optimizations that improve score', async () => {
      const mockHighScore = {
        bundle_id: 'bundle_001',
        overall_score: 0.9,
        score_breakdown: {
          price_optimization: { score: 0.9 },
          style_coherence: { score: 0.9 },
          trend_alignment: { score: 0.9 }
        }
      };

      jest.spyOn(aiScoringSystem, 'scoreBundle').mockResolvedValueOnce(mockHighScore as any);

      const result = await aiScoringSystem.getOptimizationRecommendations(
        mockBundle,
        0.8
      );

      // Should return empty array or very few optimizations for high-scoring bundle
      expect(result.length).toBeLessThanOrEqual(1);
    });

    it('should handle optimization simulation failures', async () => {
      jest.spyOn(aiScoringSystem, 'scoreBundle').mockRejectedValueOnce(new Error('Scoring failed'));

      await expect(aiScoringSystem.getOptimizationRecommendations(mockBundle, 0.8))
        .rejects.toThrow('Optimization recommendations failed');
    });
  });

  describe('Scoring calculations', () => {
    beforeEach(async () => {
      mockTrendingAnalysisService.initialize.mockResolvedValueOnce(undefined);
      await aiScoringSystem.initialize();
      jest.clearAllMocks();
    });

    it('should calculate weighted overall score correctly', async () => {
      mockCacheService.get.mockResolvedValueOnce(null);
      mockCacheService.set.mockResolvedValueOnce(undefined);
      
      mockConversionService.predictConversionRate.mockResolvedValueOnce({
        predicted_rate: 0.20, // High conversion rate
        confidence: 0.9
      });

      mockTrendingAnalysisService.getTrendingCombinations.mockResolvedValueOnce([]);

      const customWeights = {
        conversion_weight: 1.0,
        style_coherence_weight: 0.0,
        price_optimization_weight: 0.0,
        seasonal_relevance_weight: 0.0,
        trend_alignment_weight: 0.0,
        customer_match_weight: 0.0,
        inventory_efficiency_weight: 0.0,
        cross_sell_potential_weight: 0.0
      };

      const result = await aiScoringSystem.scoreBundle(mockBundle, customWeights);

      // Score should be heavily influenced by conversion probability
      expect(result.overall_score).toBeCloseTo(0.8, 1); // 0.20 / 0.25 = 0.8
    });

    it('should handle score normalization correctly', async () => {
      mockCacheService.get.mockResolvedValueOnce(null);
      mockCacheService.set.mockResolvedValueOnce(undefined);
      
      mockConversionService.predictConversionRate.mockResolvedValueOnce({
        predicted_rate: 0.30, // Very high conversion rate
        confidence: 0.9
      });

      mockTrendingAnalysisService.getTrendingCombinations.mockResolvedValueOnce([]);

      const result = await aiScoringSystem.scoreBundle(mockBundle);

      // Overall score should be capped at 1.0
      expect(result.overall_score).toBeLessThanOrEqual(1.0);
      expect(result.overall_score).toBeGreaterThan(0);
    });

    it('should calculate confidence levels appropriately', async () => {
      mockCacheService.get.mockResolvedValueOnce(null);
      mockCacheService.set.mockResolvedValueOnce(undefined);
      
      mockConversionService.predictConversionRate.mockResolvedValueOnce({
        predicted_rate: 0.15,
        confidence: 0.9 // High confidence
      });

      mockTrendingAnalysisService.getTrendingCombinations.mockResolvedValueOnce([]);

      const result = await aiScoringSystem.scoreBundle(mockBundle);

      expect(result.confidence_level).toBeGreaterThan(0);
      expect(result.confidence_level).toBeLessThanOrEqual(1.0);
      
      // High individual confidences should result in high overall confidence
      expect(result.confidence_level).toBeGreaterThan(0.5);
    });
  });

  describe('Performance and edge cases', () => {
    beforeEach(async () => {
      mockTrendingAnalysisService.initialize.mockResolvedValueOnce(undefined);
      await aiScoringSystem.initialize();
      jest.clearAllMocks();
    });

    it('should handle bundles with missing pieces gracefully', async () => {
      const bundleWithMissingPieces = {
        ...mockBundle,
        pieces: [] // Empty pieces array
      };

      mockCacheService.get.mockResolvedValueOnce(null);
      mockCacheService.set.mockResolvedValueOnce(undefined);
      mockConversionService.predictConversionRate.mockResolvedValueOnce({
        predicted_rate: 0.10,
        confidence: 0.5
      });

      const result = await aiScoringSystem.scoreBundle(bundleWithMissingPieces);

      expect(result.success).toBe(true);
      expect(result.overall_score).toBeGreaterThan(0);
    });

    it('should handle bundles with extreme prices', async () => {
      const expensiveBundle = {
        ...mockBundle,
        total_price: 5000,
        final_price: 4500
      };

      mockCacheService.get.mockResolvedValueOnce(null);
      mockCacheService.set.mockResolvedValueOnce(undefined);
      mockConversionService.predictConversionRate.mockResolvedValueOnce({
        predicted_rate: 0.05, // Low conversion for expensive item
        confidence: 0.8
      });

      const result = await aiScoringSystem.scoreBundle(expensiveBundle);

      expect(result.success).toBe(true);
      expect(result.score_breakdown.price_optimization.score).toBeDefined();
    });

    it('should generate different cache keys for different contexts', async () => {
      const context1 = { target_customer: { age: 25 } };
      const context2 = { target_customer: { age: 35 } };

      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockConversionService.predictConversionRate.mockResolvedValue({
        predicted_rate: 0.15,
        confidence: 0.8
      });

      await aiScoringSystem.scoreBundle(mockBundle, undefined, context1);
      await aiScoringSystem.scoreBundle(mockBundle, undefined, context2);

      expect(mockCacheService.set).toHaveBeenCalledTimes(2);
      
      const cacheKey1 = mockCacheService.set.mock.calls[0][0];
      const cacheKey2 = mockCacheService.set.mock.calls[1][0];
      
      expect(cacheKey1).not.toBe(cacheKey2);
    });

    it('should handle concurrent scoring requests', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockConversionService.predictConversionRate.mockResolvedValue({
        predicted_rate: 0.15,
        confidence: 0.8
      });

      const promises = Array.from({ length: 5 }, (_, i) => 
        aiScoringSystem.scoreBundle({ ...mockBundle, bundle_id: `bundle_${i}` })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.bundle_id).toBe(`bundle_${index}`);
      });
    });
  });
});