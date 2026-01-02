/**
 * Supabase Analytics Service
 * Query customer analytics events from Supabase PostgreSQL (361K+ events)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

export interface SupabaseAnalyticsEvent {
  id: string;
  session_id: string;
  customer_id?: string;
  event_type: string;
  event_data: any;
  page_url: string;
  user_agent: string;
  ip_address?: string;
  created_at: string;
}

export interface DeviceBreakdown {
  desktop: number;
  mobile: number;
  tablet: number;
  unknown: number;
}

export interface CustomerJourneyStep {
  timestamp: string;
  event_type: string;
  page_url: string;
  event_data: any;
}

export class SupabaseAnalyticsService {
  private client: SupabaseClient | null = null;
  private initialized = false;

  /**
   * Lazy initialization
   */
  private getClient(): SupabaseClient {
    if (!this.client) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase credentials not configured (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
      }

      this.client = createClient(supabaseUrl, supabaseKey);
      this.initialized = true;
      logger.info('✅ Supabase Analytics client initialized');
    }

    return this.client;
  }

  /**
   * Get total event count
   */
  async getTotalEventCount(): Promise<number> {
    try {
      const { count, error } = await this.getClient()
        .from('analytics_events')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    } catch (error) {
      logger.error('Error fetching total event count:', error);
      return 0;
    }
  }

  /**
   * Get event breakdown by type
   */
  async getEventBreakdown(days: number = 7): Promise<Record<string, number>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await this.getClient()
        .from('analytics_events')
        .select('event_type')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const breakdown: Record<string, number> = {};
      data?.forEach((event: any) => {
        breakdown[event.event_type] = (breakdown[event.event_type] || 0) + 1;
      });

      return breakdown;
    } catch (error) {
      logger.error('Error fetching event breakdown:', error);
      return {};
    }
  }

  /**
   * Get device breakdown from user agents
   */
  async getDeviceBreakdown(days: number = 7): Promise<DeviceBreakdown> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await this.getClient()
        .from('analytics_events')
        .select('user_agent')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const breakdown: DeviceBreakdown = {
        desktop: 0,
        mobile: 0,
        tablet: 0,
        unknown: 0,
      };

      data?.forEach((event: any) => {
        const ua = (event.user_agent || '').toLowerCase();

        if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
          breakdown.mobile++;
        } else if (ua.includes('tablet') || ua.includes('ipad')) {
          breakdown.tablet++;
        } else if (ua.includes('mozilla') || ua.includes('chrome') || ua.includes('safari')) {
          breakdown.desktop++;
        } else {
          breakdown.unknown++;
        }
      });

      return breakdown;
    } catch (error) {
      logger.error('Error fetching device breakdown:', error);
      return { desktop: 0, mobile: 0, tablet: 0, unknown: 0 };
    }
  }

  /**
   * Get customer journey for a session
   */
  async getSessionJourney(sessionId: string): Promise<CustomerJourneyStep[]> {
    try {
      const { data, error } = await this.getClient()
        .from('analytics_events')
        .select('created_at, event_type, page_url, event_data')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data?.map((event: any) => ({
        timestamp: event.created_at,
        event_type: event.event_type,
        page_url: event.page_url,
        event_data: event.event_data,
      })) || [];
    } catch (error) {
      logger.error('Error fetching session journey:', error);
      return [];
    }
  }

  /**
   * Get top pages by views
   */
  async getTopPagesByViews(days: number = 7, limit: number = 10): Promise<Array<{ page_url: string; views: number }>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await this.getClient()
        .from('analytics_events')
        .select('page_url')
        .eq('event_type', 'page_view')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      // Count page views
      const pageViews: Record<string, number> = {};
      data?.forEach((event: any) => {
        const url = event.page_url || 'unknown';
        pageViews[url] = (pageViews[url] || 0) + 1;
      });

      // Convert to array and sort
      return Object.entries(pageViews)
        .map(([page_url, views]) => ({ page_url, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, limit);
    } catch (error) {
      logger.error('Error fetching top pages:', error);
      return [];
    }
  }

  /**
   * Get unique sessions count
   */
  async getUniqueSessions(days: number = 7): Promise<number> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await this.getClient()
        .from('analytics_events')
        .select('session_id')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const uniqueSessions = new Set(data?.map((event: any) => event.session_id));
      return uniqueSessions.size;
    } catch (error) {
      logger.error('Error fetching unique sessions:', error);
      return 0;
    }
  }

  /**
   * Get events by type and date range
   */
  async getEventsByType(eventType: string, days: number = 7): Promise<SupabaseAnalyticsEvent[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await this.getClient()
        .from('analytics_events')
        .select('*')
        .eq('event_type', eventType)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error(`Error fetching ${eventType} events:`, error);
      return [];
    }
  }

  /**
   * Get conversion funnel metrics
   */
  async getConversionFunnel(days: number = 7): Promise<{
    page_views: number;
    product_views: number;
    add_to_carts: number;
    purchases: number;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await this.getClient()
        .from('analytics_events')
        .select('event_type')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const funnel = {
        page_views: 0,
        product_views: 0,
        add_to_carts: 0,
        purchases: 0,
      };

      data?.forEach((event: any) => {
        if (event.event_type === 'page_view') funnel.page_views++;
        if (event.event_type === 'product_view') funnel.product_views++;
        if (event.event_type === 'add_to_cart') funnel.add_to_carts++;
        if (event.event_type === 'purchase') funnel.purchases++;
      });

      return funnel;
    } catch (error) {
      logger.error('Error fetching conversion funnel:', error);
      return { page_views: 0, product_views: 0, add_to_carts: 0, purchases: 0 };
    }
  }
}

// Singleton instance
export const supabaseAnalyticsService = new SupabaseAnalyticsService();
