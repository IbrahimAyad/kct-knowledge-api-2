/**
 * Google Analytics 4 Data API Service
 * Fetches traffic and user behavior data from GA4
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data';

export interface GA4TrafficMetrics {
  sessions: number;
  activeUsers: number;
  newUsers: number;
  screenPageViews: number;
  averageSessionDuration: number;
  bounceRate: number;
  engagementRate: number;
}

export interface GA4DeviceMetrics {
  desktop: number;
  mobile: number;
  tablet: number;
}

export interface GA4TopPage {
  page: string;
  views: number;
  avgTimeOnPage: number;
}

export interface GA4RealtimeMetrics {
  activeUsers: number;
  screenPageViewsPerMinute: number;
  topPages: string[];
  topCountries: { country: string; users: number; }[];
}

export class GA4AnalyticsService {
  private analyticsDataClient: BetaAnalyticsDataClient;
  private propertyId: string;

  constructor() {
    // Initialize with service account credentials from environment
    this.analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: this.getCredentials(),
    });
    this.propertyId = `properties/${process.env.GA4_PROPERTY_ID}`;
  }

  /**
   * Get service account credentials from environment
   */
  private getCredentials() {
    // Option 1: Use service account JSON file path
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return undefined; // SDK will auto-load from file path
    }

    // Option 2: Use service account JSON from environment variable
    if (process.env.GA4_SERVICE_ACCOUNT_JSON) {
      try {
        return JSON.parse(process.env.GA4_SERVICE_ACCOUNT_JSON);
      } catch (error) {
        console.error('Failed to parse GA4_SERVICE_ACCOUNT_JSON:', error);
      }
    }

    // Option 3: Individual credentials
    if (process.env.GA4_CLIENT_EMAIL && process.env.GA4_PRIVATE_KEY) {
      return {
        client_email: process.env.GA4_CLIENT_EMAIL,
        private_key: process.env.GA4_PRIVATE_KEY.replace(/\\n/g, '\n'),
      };
    }

    throw new Error('GA4 credentials not configured. Set GOOGLE_APPLICATION_CREDENTIALS, GA4_SERVICE_ACCOUNT_JSON, or GA4_CLIENT_EMAIL + GA4_PRIVATE_KEY');
  }

  /**
   * Get traffic metrics for a date range
   */
  async getTrafficMetrics(
    startDate: string = '7daysAgo',
    endDate: string = 'today'
  ): Promise<GA4TrafficMetrics> {
    try {
      const [response] = await this.analyticsDataClient.runReport({
        property: this.propertyId,
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'newUsers' },
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
          { name: 'engagementRate' },
        ],
      });

      const row = response.rows?.[0];
      if (!row || !row.metricValues) {
        return this.getEmptyTrafficMetrics();
      }

      return {
        sessions: parseInt(row.metricValues[0]?.value || '0'),
        activeUsers: parseInt(row.metricValues[1]?.value || '0'),
        newUsers: parseInt(row.metricValues[2]?.value || '0'),
        screenPageViews: parseInt(row.metricValues[3]?.value || '0'),
        averageSessionDuration: parseFloat(row.metricValues[4]?.value || '0'),
        bounceRate: parseFloat(row.metricValues[5]?.value || '0'),
        engagementRate: parseFloat(row.metricValues[6]?.value || '0'),
      };
    } catch (error) {
      console.error('Error fetching GA4 traffic metrics:', error);
      throw error;
    }
  }

  /**
   * Get device breakdown
   */
  async getDeviceMetrics(
    startDate: string = '7daysAgo',
    endDate: string = 'today'
  ): Promise<GA4DeviceMetrics> {
    try {
      const [response] = await this.analyticsDataClient.runReport({
        property: this.propertyId,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }],
      });

      const metrics: GA4DeviceMetrics = {
        desktop: 0,
        mobile: 0,
        tablet: 0,
      };

      response.rows?.forEach((row) => {
        const device = row.dimensionValues?.[0]?.value?.toLowerCase();
        const users = parseInt(row.metricValues?.[0]?.value || '0');

        if (device === 'desktop') {
          metrics.desktop = users;
        } else if (device === 'mobile') {
          metrics.mobile = users;
        } else if (device === 'tablet') {
          metrics.tablet = users;
        }
      });

      return metrics;
    } catch (error) {
      console.error('Error fetching GA4 device metrics:', error);
      throw error;
    }
  }

  /**
   * Get top pages by views
   */
  async getTopPages(
    startDate: string = '7daysAgo',
    endDate: string = 'today',
    limit: number = 10
  ): Promise<GA4TopPage[]> {
    try {
      const [response] = await this.analyticsDataClient.runReport({
        property: this.propertyId,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
        ],
        orderBys: [
          {
            metric: { metricName: 'screenPageViews' },
            desc: true,
          },
        ],
        limit,
      });

      return (
        response.rows?.map((row) => ({
          page: row.dimensionValues?.[0]?.value || '',
          views: parseInt(row.metricValues?.[0]?.value || '0'),
          avgTimeOnPage: parseFloat(row.metricValues?.[1]?.value || '0'),
        })) || []
      );
    } catch (error) {
      console.error('Error fetching GA4 top pages:', error);
      throw error;
    }
  }

  /**
   * Get real-time metrics (last 30 minutes)
   */
  async getRealtimeMetrics(): Promise<GA4RealtimeMetrics> {
    try {
      // Active users in last 30 minutes
      const [usersResponse] = await this.analyticsDataClient.runRealtimeReport({
        property: this.propertyId,
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViewsPerMinute' },
        ],
      });

      // Top pages realtime
      const [pagesResponse] = await this.analyticsDataClient.runRealtimeReport({
        property: this.propertyId,
        dimensions: [{ name: 'unifiedScreenName' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [
          {
            metric: { metricName: 'activeUsers' },
            desc: true,
          },
        ],
        limit: 5,
      });

      // Top countries realtime
      const [countriesResponse] = await this.analyticsDataClient.runRealtimeReport({
        property: this.propertyId,
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [
          {
            metric: { metricName: 'activeUsers' },
            desc: true,
          },
        ],
        limit: 10,
      });

      const activeUsers = parseInt(
        usersResponse.rows?.[0]?.metricValues?.[0]?.value || '0'
      );
      const screenPageViewsPerMinute = parseFloat(
        usersResponse.rows?.[0]?.metricValues?.[1]?.value || '0'
      );

      const topPages =
        pagesResponse.rows?.map(
          (row) => row.dimensionValues?.[0]?.value || ''
        ) || [];

      const topCountries =
        countriesResponse.rows?.map((row) => ({
          country: row.dimensionValues?.[0]?.value || 'Unknown',
          users: parseInt(row.metricValues?.[0]?.value || '0'),
        })) || [];

      return {
        activeUsers,
        screenPageViewsPerMinute,
        topPages,
        topCountries,
      };
    } catch (error) {
      console.error('Error fetching GA4 realtime metrics:', error);
      throw error;
    }
  }

  /**
   * Get traffic trend (daily breakdown)
   */
  async getTrafficTrend(
    startDate: string = '30daysAgo',
    endDate: string = 'today'
  ): Promise<Array<{ date: string; sessions: number; users: number }>> {
    try {
      const [response] = await this.analyticsDataClient.runReport({
        property: this.propertyId,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      });

      return (
        response.rows?.map((row) => ({
          date: row.dimensionValues?.[0]?.value || '',
          sessions: parseInt(row.metricValues?.[0]?.value || '0'),
          users: parseInt(row.metricValues?.[1]?.value || '0'),
        })) || []
      );
    } catch (error) {
      console.error('Error fetching GA4 traffic trend:', error);
      throw error;
    }
  }

  /**
   * Get e-commerce metrics (if configured in GA4)
   */
  async getEcommerceMetrics(
    startDate: string = '7daysAgo',
    endDate: string = 'today'
  ) {
    try {
      const [response] = await this.analyticsDataClient.runReport({
        property: this.propertyId,
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'ecommercePurchases' },
          { name: 'purchaseRevenue' },
          { name: 'addToCarts' },
          { name: 'checkouts' },
          { name: 'itemsViewed' },
        ],
      });

      const row = response.rows?.[0];
      if (!row || !row.metricValues) {
        return {
          purchases: 0,
          revenue: 0,
          addToCarts: 0,
          checkouts: 0,
          itemViews: 0,
        };
      }

      return {
        purchases: parseInt(row.metricValues[0]?.value || '0'),
        revenue: parseFloat(row.metricValues[1]?.value || '0'),
        addToCarts: parseInt(row.metricValues[2]?.value || '0'),
        checkouts: parseInt(row.metricValues[3]?.value || '0'),
        itemViews: parseInt(row.metricValues[4]?.value || '0'),
      };
    } catch (error) {
      // E-commerce metrics might not be configured
      console.warn('GA4 e-commerce metrics not available:', error);
      return {
        purchases: 0,
        revenue: 0,
        addToCarts: 0,
        checkouts: 0,
        itemViews: 0,
      };
    }
  }

  /**
   * Empty metrics for fallback
   */
  private getEmptyTrafficMetrics(): GA4TrafficMetrics {
    return {
      sessions: 0,
      activeUsers: 0,
      newUsers: 0,
      screenPageViews: 0,
      averageSessionDuration: 0,
      bounceRate: 0,
      engagementRate: 0,
    };
  }
}

// Singleton instance
export const ga4AnalyticsService = new GA4AnalyticsService();
