import { Request, Response } from 'express';
import { fashionClipService, FashionClipAnalysisRequest, StyleTransferRequest, OutfitGenerationRequest } from '../services/fashion-clip-service';
import { visualAnalysisEngine } from '../services/visual-analysis-engine';
import { colorExtractionService } from '../services/color-extraction-service';
import { createApiResponse } from '../utils/data-loader';
import { logger } from '../utils/logger';

/**
 * Analyze image using Fashion-CLIP for style classification, color extraction, or pattern recognition
 */
export const analyzeImage = async (req: Request, res: Response) => {
  try {
    const {
      image_url,
      image_base64,
      analysis_type,
      options
    } = req.body as FashionClipAnalysisRequest;

    if (!image_url && !image_base64) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'Either image_url or image_base64 is required'
      ));
    }

    if (!analysis_type) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'analysis_type is required'
      ));
    }

    const validAnalysisTypes = ['style_classification', 'color_extraction', 'pattern_recognition', 'outfit_matching', 'similarity_search'];
    if (!validAnalysisTypes.includes(analysis_type)) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        `Invalid analysis_type. Must be one of: ${validAnalysisTypes.join(', ')}`
      ));
    }

    const result = await fashionClipService.analyzeImage({
      image_url,
      image_base64,
      analysis_type,
      options
    });

    res.json(createApiResponse(true, result));
  } catch (error) {
    logger.error('Fashion-CLIP image analysis failed:', error);
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Image analysis failed'
    ));
  }
};

/**
 * Perform comprehensive visual analysis using the visual analysis engine
 */
export const comprehensiveVisualAnalysis = async (req: Request, res: Response) => {
  try {
    const {
      image_url,
      image_base64,
      analysis_depth = 'comprehensive',
      context
    } = req.body;

    if (!image_url && !image_base64) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'Either image_url or image_base64 is required'
      ));
    }

    const validDepths = ['basic', 'comprehensive', 'advanced'];
    if (!validDepths.includes(analysis_depth)) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        `Invalid analysis_depth. Must be one of: ${validDepths.join(', ')}`
      ));
    }

    const result = await visualAnalysisEngine.analyzeImage({
      image_url,
      image_base64,
      analysis_depth,
      context
    });

    res.json(createApiResponse(true, result));
  } catch (error) {
    logger.error('Comprehensive visual analysis failed:', error);
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Visual analysis failed'
    ));
  }
};

/**
 * Generate outfit recommendations from image
 */
export const imageToOutfit = async (req: Request, res: Response) => {
  try {
    const {
      image_url,
      image_base64,
      target_occasion,
      budget_constraints,
      style_preferences,
      fit_preferences
    } = req.body;

    if (!image_url && !image_base64) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'Either image_url or image_base64 is required'
      ));
    }

    if (!target_occasion) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'target_occasion is required'
      ));
    }

    const result = await visualAnalysisEngine.imageToOutfit({
      image_url,
      image_base64,
      target_occasion,
      budget_constraints,
      style_preferences,
      fit_preferences
    });

    res.json(createApiResponse(true, result));
  } catch (error) {
    logger.error('Image to outfit generation failed:', error);
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Outfit generation failed'
    ));
  }
};

/**
 * Extract and analyze colors from image
 */
export const extractImageColors = async (req: Request, res: Response) => {
  try {
    const {
      image_url,
      image_base64,
      extraction_options,
      analysis_options,
      context
    } = req.body;

    if (!image_url && !image_base64) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'Either image_url or image_base64 is required'
      ));
    }

    if (!extraction_options) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'extraction_options is required'
      ));
    }

    if (!analysis_options) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'analysis_options is required'
      ));
    }

    const result = await colorExtractionService.extractColors({
      image_url,
      image_base64,
      extraction_options,
      analysis_options,
      context
    });

    res.json(createApiResponse(true, result));
  } catch (error) {
    logger.error('Color extraction failed:', error);
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Color extraction failed'
    ));
  }
};

/**
 * Find matching colors for given primary colors
 */
export const findMatchingColors = async (req: Request, res: Response) => {
  try {
    const {
      primary_colors,
      matching_criteria,
      constraints
    } = req.body;

    if (!primary_colors || !Array.isArray(primary_colors) || primary_colors.length === 0) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'primary_colors array is required and cannot be empty'
      ));
    }

    if (!matching_criteria) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'matching_criteria is required'
      ));
    }

    const result = await colorExtractionService.findMatchingColors({
      primary_colors,
      matching_criteria,
      constraints
    });

    res.json(createApiResponse(true, result));
  } catch (error) {
    logger.error('Color matching failed:', error);
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Color matching failed'
    ));
  }
};

/**
 * Generate outfit using Fashion-CLIP
 */
export const generateOutfit = async (req: Request, res: Response) => {
  try {
    const {
      base_item,
      occasion,
      budget_range,
      style_preferences,
      body_type,
      color_preferences,
      avoid_patterns
    } = req.body as OutfitGenerationRequest;

    if (!occasion) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'occasion is required'
      ));
    }

    const result = await fashionClipService.generateOutfit({
      base_item,
      occasion,
      budget_range,
      style_preferences,
      body_type,
      color_preferences,
      avoid_patterns
    });

    res.json(createApiResponse(true, result));
  } catch (error) {
    logger.error('Outfit generation failed:', error);
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Outfit generation failed'
    ));
  }
};

/**
 * Apply style transfer to an image
 */
export const applyStyleTransfer = async (req: Request, res: Response) => {
  try {
    const {
      source_image_url,
      source_image_base64,
      target_style,
      intensity = 0.8,
      preserve_colors = false,
      target_formality
    } = req.body as StyleTransferRequest;

    if (!source_image_url && !source_image_base64) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'Either source_image_url or source_image_base64 is required'
      ));
    }

    if (!target_style) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'target_style is required'
      ));
    }

    if (intensity < 0.1 || intensity > 1.0) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'intensity must be between 0.1 and 1.0'
      ));
    }

    const result = await fashionClipService.applyStyleTransfer({
      source_image_url,
      source_image_base64,
      target_style,
      intensity,
      preserve_colors,
      target_formality
    });

    res.json(createApiResponse(true, result));
  } catch (error) {
    logger.error('Style transfer failed:', error);
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Style transfer failed'
    ));
  }
};

/**
 * Find visually similar items
 */
export const findSimilarItems = async (req: Request, res: Response) => {
  try {
    const { image_url, image_base64, max_results = 10, similarity_threshold = 0.75 } = req.body;

    if (!image_url && !image_base64) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'Either image_url or image_base64 is required'
      ));
    }

    if (max_results < 1 || max_results > 50) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'max_results must be between 1 and 50'
      ));
    }

    if (similarity_threshold < 0.1 || similarity_threshold > 1.0) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'similarity_threshold must be between 0.1 and 1.0'
      ));
    }

    const result = await visualAnalysisEngine.findVisualSimilarItems(
      image_url || '',
      max_results,
      similarity_threshold
    );

    res.json(createApiResponse(true, result));
  } catch (error) {
    logger.error('Similar items search failed:', error);
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Similar items search failed'
    ));
  }
};

/**
 * Analyze style transfer possibilities
 */
export const analyzeStyleTransfer = async (req: Request, res: Response) => {
  try {
    const { source_image_url, source_image_base64, target_style } = req.body;

    if (!source_image_url && !source_image_base64) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'Either source_image_url or source_image_base64 is required'
      ));
    }

    if (!target_style) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'target_style is required'
      ));
    }

    const result = await visualAnalysisEngine.analyzeStyleTransfer(
      source_image_url || '',
      target_style
    );

    res.json(createApiResponse(true, result));
  } catch (error) {
    logger.error('Style transfer analysis failed:', error);
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Style transfer analysis failed'
    ));
  }
};

/**
 * Get color palette for specific occasion
 */
export const getOccasionColorPalette = async (req: Request, res: Response) => {
  try {
    const { occasion } = req.params;
    const { base_colors, style_preference } = req.query;

    if (!occasion) {
      return res.status(400).json(createApiResponse(
        false,
        undefined,
        'occasion parameter is required'
      ));
    }

    const baseColorsArray = base_colors ? (base_colors as string).split(',') : undefined;
    
    const result = await colorExtractionService.getOccasionColorPalette(
      occasion,
      baseColorsArray,
      style_preference as string
    );

    res.json(createApiResponse(true, result));
  } catch (error) {
    logger.error('Occasion color palette generation failed:', error);
    res.status(500).json(createApiResponse(
      false,
      undefined,
      error instanceof Error ? error.message : 'Color palette generation failed'
    ));
  }
};

/**
 * Get Fashion-CLIP service health status
 */
export const getFashionClipHealth = async (req: Request, res: Response) => {
  try {
    const health = await fashionClipService.healthCheck();
    res.json(createApiResponse(true, health));
  } catch (error) {
    logger.error('Fashion-CLIP health check failed:', error);
    res.status(503).json(createApiResponse(
      false,
      undefined,
      'Fashion-CLIP service is unavailable'
    ));
  }
};