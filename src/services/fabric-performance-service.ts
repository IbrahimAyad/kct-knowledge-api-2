/**
 * Fabric Performance Service
 *
 * Provides fabric performance data for intelligent recommendations.
 * Wired in Sprint 1, Section 1.3
 */

import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import { logger } from '../utils/logger';

export interface FabricPerformance {
  fabric_type: string;
  durability: number;
  wrinkle_resistance: number;
  breathability: number;
  shape_retention: number;
  moisture_management: number;
  lifespan_years: number;
  care_difficulty: number;
  cost_range: string;
}

export interface FabricPhotographyPerformance {
  fabric_type: string;
  fair_skin: number;
  medium_skin: number;
  dark_skin: number;
  olive_skin: number;
  camera_flash: number;
  natural_light: number;
  studio_light: number;
  color_accuracy: number;
}

export interface SuitConstruction {
  construction_type: string;
  lifespan_years: number;
  shape_retention: number;
  breathability: number;
  alteration_capability: number;
  cost_premium: number;
  dry_cleaning_durability: number;
  professional_suitability: number;
}

class FabricPerformanceService {
  private fabricPerformance: FabricPerformance[] = [];
  private photographyPerformance: FabricPhotographyPerformance[] = [];
  private constructionData: SuitConstruction[] = [];
  private initialized = false;

  /**
   * Initialize service by loading CSV data
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load fabric performance data
      this.fabricPerformance = await this.loadCSV<FabricPerformance>(
        'research/fabric/fabric_performance_real_world.csv',
        (row) => ({
          fabric_type: row.Fabric_Type,
          durability: parseInt(row.Durability_Rating) || 0,
          wrinkle_resistance: parseInt(row.Wrinkle_Resistance) || 0,
          breathability: parseInt(row.Breathability) || 0,
          shape_retention: parseInt(row.Shape_Retention) || 0,
          moisture_management: parseInt(row.Moisture_Management) || 0,
          lifespan_years: parseInt(row.Professional_Lifespan_Years) || 0,
          care_difficulty: parseInt(row.Care_Difficulty) || 0,
          cost_range: row.Cost_Per_Yard_Range || 'Unknown',
        })
      );

      // Load photography performance data
      this.photographyPerformance = await this.loadCSV<FabricPhotographyPerformance>(
        'research/fabric/fabric_photography_performance.csv',
        (row) => ({
          fabric_type: row.Fabric_Type,
          fair_skin: parseInt(row.Fair_Skin_Rating) || 0,
          medium_skin: parseInt(row.Medium_Skin_Rating) || 0,
          dark_skin: parseInt(row.Dark_Skin_Rating) || 0,
          olive_skin: parseInt(row.Olive_Skin_Rating) || 0,
          camera_flash: parseInt(row.Camera_Flash_Performance) || 0,
          natural_light: parseInt(row.Natural_Light_Performance) || 0,
          studio_light: parseInt(row.Studio_Light_Performance) || 0,
          color_accuracy: parseInt(row.Color_Accuracy_Retention) || 0,
        })
      );

      // Load construction data
      this.constructionData = await this.loadCSV<SuitConstruction>(
        'research/fabric/suit_construction_lifespan.csv',
        (row) => ({
          construction_type: row.Construction_Type,
          lifespan_years: parseInt(row.Expected_Lifespan_Years) || 0,
          shape_retention: parseInt(row.Shape_Retention_Over_Time) || 0,
          breathability: parseInt(row.Breathability_Rating) || 0,
          alteration_capability: parseInt(row.Alteration_Capability) || 0,
          cost_premium: parseFloat(row.Cost_Premium_Factor) || 1.0,
          dry_cleaning_durability: parseInt(row.Dry_Cleaning_Durability) || 0,
          professional_suitability: parseInt(row.Professional_Wear_Suitability) || 0,
        })
      );

      this.initialized = true;
      logger.info('FabricPerformanceService initialized with real CSV data');
    } catch (error) {
      logger.warn('Failed to initialize FabricPerformanceService:', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Load and parse CSV file
   */
  private async loadCSV<T>(relativePath: string, transform: (row: any) => T): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const results: T[] = [];
      const filePath = path.join(__dirname, '../data', relativePath);

      if (!fs.existsSync(filePath)) {
        reject(new Error(`CSV file not found: ${filePath}`));
        return;
      }

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data: any) => {
          try {
            results.push(transform(data));
          } catch (error) {
            logger.warn('Error transforming CSV row:', { error: error instanceof Error ? error.message : String(error) });
          }
        })
        .on('end', () => resolve(results))
        .on('error', (error: Error) => reject(error));
    });
  }

  /**
   * Get fabric performance by fabric type
   */
  async getFabricPerformance(fabricType: string): Promise<FabricPerformance | null> {
    if (!this.initialized) await this.initialize();

    const normalized = fabricType.toLowerCase().trim();
    const match = this.fabricPerformance.find(
      (f) => f.fabric_type.toLowerCase().includes(normalized) || normalized.includes(f.fabric_type.toLowerCase())
    );

    return match || null;
  }

  /**
   * Get best fabrics for specific criteria
   */
  async getBestFabricsFor(criteria: {
    breathability?: number;
    durability?: number;
    wrinkle_resistance?: number;
    max_care_difficulty?: number;
  }): Promise<FabricPerformance[]> {
    if (!this.initialized) await this.initialize();

    return this.fabricPerformance.filter((fabric) => {
      if (criteria.breathability && fabric.breathability < criteria.breathability) return false;
      if (criteria.durability && fabric.durability < criteria.durability) return false;
      if (criteria.wrinkle_resistance && fabric.wrinkle_resistance < criteria.wrinkle_resistance) return false;
      if (criteria.max_care_difficulty && fabric.care_difficulty > criteria.max_care_difficulty) return false;
      return true;
    });
  }

  /**
   * Get photography performance for fabric/color combination
   */
  async getPhotographyPerformance(fabricColor: string): Promise<FabricPhotographyPerformance | null> {
    if (!this.initialized) await this.initialize();

    const normalized = fabricColor.toLowerCase().trim();
    const match = this.photographyPerformance.find(
      (p) => p.fabric_type.toLowerCase().includes(normalized) || normalized.includes(p.fabric_type.toLowerCase())
    );

    return match || null;
  }

  /**
   * Get suit construction recommendations
   */
  async getConstructionRecommendations(budget: 'budget' | 'mid' | 'premium' | 'luxury'): Promise<SuitConstruction[]> {
    if (!this.initialized) await this.initialize();

    if (budget === 'luxury') {
      return this.constructionData.filter((c) => c.construction_type.includes('Full Canvas'));
    } else if (budget === 'premium') {
      return this.constructionData.filter((c) => c.construction_type.includes('Canvas'));
    } else if (budget === 'mid') {
      return this.constructionData.filter((c) => c.construction_type.includes('Half Canvas') || c.construction_type.includes('Fused (High'));
    } else {
      return this.constructionData.filter((c) => c.construction_type.includes('Fused'));
    }
  }

  /**
   * Get fabric recommendations based on use case
   */
  async getFabricRecommendationsFor(useCase: {
    occasion?: 'wedding' | 'business' | 'casual' | 'formal';
    climate?: 'hot' | 'mild' | 'cold';
    budget?: 'budget' | 'mid' | 'premium' | 'luxury';
    photography?: boolean;
  }): Promise<{
    recommended: FabricPerformance[];
    reasoning: string[];
  }> {
    if (!this.initialized) await this.initialize();

    const criteria: any = {};
    const reasoning: string[] = [];

    // Climate-based recommendations
    if (useCase.climate === 'hot') {
      criteria.breathability = 8;
      reasoning.push('High breathability for hot climate');
    } else if (useCase.climate === 'cold') {
      criteria.durability = 7;
      reasoning.push('Durable fabrics for cold weather');
    }

    // Occasion-based recommendations
    if (useCase.occasion === 'business' || useCase.occasion === 'formal') {
      criteria.wrinkle_resistance = 6;
      criteria.max_care_difficulty = 8;
      reasoning.push('Wrinkle-resistant for professional appearance');
    }

    // Section 3.5: Photography considerations - actually filter by photo performance
    let recommended = await this.getBestFabricsFor(criteria);

    if (useCase.photography) {
      // Filter and sort fabrics by photography performance
      const fabricsWithPhotoScores = recommended
        .map(fabric => {
          const photoData = this.photographyPerformance.find(
            p => p.fabric_type.toLowerCase() === fabric.fabric_type.toLowerCase() ||
                 fabric.fabric_type.toLowerCase().includes(p.fabric_type.toLowerCase())
          );

          if (photoData) {
            // Calculate average photo score across all conditions
            const avgScore = (
              photoData.camera_flash +
              photoData.natural_light +
              photoData.studio_light +
              photoData.color_accuracy
            ) / 4;

            return { fabric, photoScore: avgScore };
          }

          return { fabric, photoScore: 0 };
        })
        .filter(item => item.photoScore >= 6) // Only fabrics with decent photo performance (6+/10)
        .sort((a, b) => b.photoScore - a.photoScore); // Sort by photo score descending

      if (fabricsWithPhotoScores.length > 0) {
        recommended = fabricsWithPhotoScores.map(item => item.fabric);
        reasoning.push(`Filtered for photography: ${fabricsWithPhotoScores.length} fabrics with photo performance score ≥6/10`);
      } else {
        reasoning.push('Photography filtering applied (no specific photo performance threshold)');
      }
    }

    return {
      recommended: recommended.slice(0, 5), // Top 5
      reasoning,
    };
  }

  /**
   * Get comprehensive fabric context for recommendations
   */
  async getFabricContext(fabricType?: string, useCase?: string): Promise<{
    performance: FabricPerformance | null;
    insights: string[];
  }> {
    if (!this.initialized) await this.initialize();

    const insights: string[] = [];
    let performance: FabricPerformance | null = null;

    if (fabricType) {
      performance = await this.getFabricPerformance(fabricType);

      if (performance) {
        if (performance.breathability >= 8) {
          insights.push(`${performance.fabric_type} offers excellent breathability`);
        }
        if (performance.durability >= 8) {
          insights.push(`${performance.fabric_type} is highly durable (${performance.lifespan_years} year lifespan)`);
        }
        if (performance.wrinkle_resistance >= 8) {
          insights.push(`${performance.fabric_type} resists wrinkles well`);
        }
        if (performance.care_difficulty <= 5) {
          insights.push(`${performance.fabric_type} is easy to care for`);
        } else if (performance.care_difficulty >= 8) {
          insights.push(`${performance.fabric_type} requires professional care`);
        }
      }
    }

    return { performance, insights };
  }
}

// Export singleton instance
export const fabricPerformanceService = new FabricPerformanceService();
