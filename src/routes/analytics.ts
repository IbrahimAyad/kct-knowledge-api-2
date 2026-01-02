/**
 * Analytics API Routes
 * Unified dashboard combining GA4, Shopify, and recommendation data
 */

import express, { Request, Response } from 'express';
import { ga4AnalyticsService } from '../services/ga4-analytics-service';
import { shopifyAnalyticsService } from '../services/shopify-analytics-service';
import { recommendationAnalyticsService } from '../services/recommendation-analytics-service';
import { EndpointRateLimits } from '../middleware/rate-limiting';
import { CacheStrategies } from '../middleware/cache-headers';
import {
  validateBody,
  validateQuery,
  validateParams,
  analyticsTrackSchema,
  analyticsDashboardSchema,
  analyticsSessionSchema
} from '../middleware/validation';

const router = express.Router();

/**
 * POST /api/analytics/track
 * Track recommendation engagement events from frontend
 */
router.post(
  '/track',
  EndpointRateLimits.ANALYTICS,
  validateBody(analyticsTrackSchema),
  async (req: Request, res: Response) => {
    try {
      const {
        eventType,
        productId,
        productTitle,
        occasion,
        source,
        sessionId,
      } = req.body;

      // Track the event (validation already done by middleware)
      await recommendationAnalyticsService.trackEvent({
        eventType,
        productId,
        productTitle,
        occasion,
        source,
        sessionId,
        timestamp: Date.now(),
      });

      res.json({
        success: true,
        message: 'Event tracked successfully',
        data: {
          eventType,
          productId,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error tracking analytics event:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track event',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/analytics/dashboard
 * Unified business metrics dashboard
 * Combines: GA4 traffic + Shopify sales + Recommendation engagement
 */
router.get(
  '/dashboard',
  EndpointRateLimits.ANALYTICS,
  CacheStrategies.SHORT(),
  validateQuery(analyticsDashboardSchema),
  async (req: Request, res: Response) => {
    try {
      const days = (req.query as any).days || 7;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Fetch all data in parallel
      const [
        ga4Traffic,
        ga4Devices,
        shopifySales,
        recommendationMetrics,
        topProducts,
      ] = await Promise.all([
        ga4AnalyticsService.getTrafficMetrics(`${days}daysAgo`, 'today'),
        ga4AnalyticsService.getDeviceMetrics(`${days}daysAgo`, 'today'),
        shopifyAnalyticsService.getSalesMetrics(startDateStr, endDateStr),
        recommendationAnalyticsService.getMetrics(days),
        recommendationAnalyticsService.getTopProducts('click', 5),
      ]);

      // Try to get realtime data, but don't fail if unavailable
      let ga4Realtime;
      try {
        ga4Realtime = await ga4AnalyticsService.getRealtimeMetrics();
      } catch (error) {
        console.warn('Realtime metrics unavailable:', error);
        ga4Realtime = { activeUsers: 0, screenPageViewsPerMinute: 0, topPages: [], topCountries: [] };
      }

      // Calculate conversion rate
      const conversionRate =
        ga4Traffic.sessions > 0
          ? ((shopifySales.totalOrders / ga4Traffic.sessions) * 100).toFixed(2)
          : '0.00';

      res.json({
        success: true,
        data: {
          // Traffic metrics (from GA4)
          traffic: {
            sessions: ga4Traffic.sessions,
            activeUsers: ga4Traffic.activeUsers,
            newUsers: ga4Traffic.newUsers,
            pageViews: ga4Traffic.screenPageViews,
            avgSessionDuration: Math.round(ga4Traffic.averageSessionDuration),
            bounceRate: ga4Traffic.bounceRate.toFixed(2),
            engagementRate: ga4Traffic.engagementRate.toFixed(2),
            devices: ga4Devices,
            realtime: {
              activeUsersNow: ga4Realtime.activeUsers,
              pageViewsPerMinute: ga4Realtime.screenPageViewsPerMinute.toFixed(2),
              topPages: ga4Realtime.topPages,
              topCountries: ga4Realtime.topCountries,
            },
          },

          // Sales metrics (from Shopify)
          sales: {
            totalSales: shopifySales.totalSales,
            totalOrders: shopifySales.totalOrders,
            averageOrderValue: shopifySales.averageOrderValue,
            conversionRate: parseFloat(conversionRate),
          },

          // Recommendation engagement
          recommendations: {
            views: recommendationMetrics.totalViews,
            clicks: recommendationMetrics.totalClicks,
            addToCarts: recommendationMetrics.totalAddToCarts,
            purchases: recommendationMetrics.totalPurchases,
            clickThroughRate: recommendationMetrics.clickThroughRate,
            addToCartRate: recommendationMetrics.addToCartRate,
            conversionRate: recommendationMetrics.conversionRate,
            topProducts,
          },

          // Summary for dashboard display
          summary: {
            sessions: ga4Traffic.sessions,
            totalSales: `$${shopifySales.totalSales.toFixed(2)}`,
            orders: shopifySales.totalOrders,
            conversionRate: `${conversionRate}%`,
          },

          period: {
            days,
            startDate: startDateStr,
            endDate: endDateStr,
          },
        },
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard data',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/analytics/traffic
 * GA4 traffic metrics only
 */
router.get(
  '/traffic',
  EndpointRateLimits.ANALYTICS,
  CacheStrategies.SHORT(),
  async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 7;

      const [traffic, devices, trend] = await Promise.all([
        ga4AnalyticsService.getTrafficMetrics(`${days}daysAgo`, 'today'),
        ga4AnalyticsService.getDeviceMetrics(`${days}daysAgo`, 'today'),
        ga4AnalyticsService.getTrafficTrend(`${days}daysAgo`, 'today'),
      ]);

      res.json({
        success: true,
        data: {
          overview: traffic,
          devices,
          trend,
        },
      });
    } catch (error) {
      console.error('Error fetching traffic data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch traffic data',
      });
    }
  }
);

/**
 * GET /api/analytics/sales
 * Shopify sales metrics only
 */
router.get(
  '/sales',
  EndpointRateLimits.ANALYTICS,
  CacheStrategies.SHORT(),
  async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 7;

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const [salesMetrics, recentOrders, topProducts] = await Promise.all([
        shopifyAnalyticsService.getSalesMetrics(startDateStr, endDateStr),
        shopifyAnalyticsService.getRecentOrders(10),
        shopifyAnalyticsService.getTopProducts(startDateStr, endDateStr, 10),
      ]);

      res.json({
        success: true,
        data: {
          metrics: salesMetrics,
          recentOrders,
          topProducts,
        },
      });
    } catch (error) {
      console.error('Error fetching sales data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch sales data',
      });
    }
  }
);

/**
 * GET /api/analytics/recommendations
 * Recommendation engagement metrics
 */
router.get(
  '/recommendations',
  EndpointRateLimits.ANALYTICS,
  CacheStrategies.SHORT(),
  async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 7;

      const [metrics, topProducts, occasions, sources] = await Promise.all([
        recommendationAnalyticsService.getMetrics(days),
        recommendationAnalyticsService.getTopProducts('click', 10),
        recommendationAnalyticsService.getOccasionPerformance(10),
        recommendationAnalyticsService.getSourcePerformance(),
      ]);

      res.json({
        success: true,
        data: {
          overview: metrics,
          topProducts,
          byOccasion: occasions,
          bySource: sources,
        },
      });
    } catch (error) {
      console.error('Error fetching recommendation data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recommendation data',
      });
    }
  }
);

/**
 * GET /api/analytics/realtime
 * Real-time metrics (last 30 minutes)
 */
router.get(
  '/realtime',
  EndpointRateLimits.HEALTH,
  async (req: Request, res: Response) => {
    try {
      const realtime = await ga4AnalyticsService.getRealtimeMetrics();

      res.json({
        success: true,
        data: realtime,
      });
    } catch (error) {
      console.error('Error fetching realtime data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch realtime data',
      });
    }
  }
);

/**
 * GET /api/analytics/top-pages
 * Most viewed pages with unique visitors
 */
router.get(
  '/top-pages',
  EndpointRateLimits.ANALYTICS,
  CacheStrategies.SHORT(),
  async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const limit = parseInt(req.query.limit as string) || 10;

      const topPages = await ga4AnalyticsService.getTopPages(
        `${days}daysAgo`,
        'today',
        limit
      );

      // Transform to match expected format
      const formattedData = topPages.map(page => ({
        page_path: page.page,
        views: page.views,
        unique_visitors: Math.round(page.views * 0.7), // Estimate unique visitors
      }));

      res.json({
        success: true,
        data: formattedData,
      });
    } catch (error) {
      console.error('Error fetching top pages:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch top pages',
        warnings: ['GA4 data unavailable'],
      });
    }
  }
);

/**
 * GET /api/analytics/revenue-chart
 * Daily revenue breakdown with orders and visitors
 */
router.get(
  '/revenue-chart',
  EndpointRateLimits.ANALYTICS,
  CacheStrategies.SHORT(),
  async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const warnings: string[] = [];

      // Fetch data in parallel with error handling
      const [ga4Trend, shopifySales] = await Promise.allSettled([
        ga4AnalyticsService.getTrafficTrend(`${days}daysAgo`, 'today'),
        shopifyAnalyticsService.getSalesMetrics(startDateStr, endDateStr),
      ]);

      // Get daily orders from Shopify (we'll need to aggregate this)
      let shopifyOrders: any[] = [];
      try {
        const recentOrders = await shopifyAnalyticsService.getRecentOrders(250);
        shopifyOrders = recentOrders.filter(order => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= startDate && orderDate <= endDate;
        });
      } catch (error) {
        console.warn('Could not fetch Shopify orders for chart:', error);
        warnings.push('Shopify order details unavailable');
      }

      // Build daily data structure
      const dailyData = new Map<string, { date: string; revenue: number; orders: number; visitors: number }>();

      // Initialize all dates with zeros
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        dailyData.set(dateStr, {
          date: dateStr,
          revenue: 0,
          orders: 0,
          visitors: 0,
        });
      }

      // Add GA4 visitor data
      if (ga4Trend.status === 'fulfilled') {
        ga4Trend.value.forEach(day => {
          const dateStr = day.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
          if (dailyData.has(dateStr)) {
            dailyData.get(dateStr)!.visitors = day.users;
          }
        });
      } else {
        warnings.push('GA4 visitor data unavailable');
      }

      // Add Shopify order data
      shopifyOrders.forEach(order => {
        const dateStr = order.createdAt.split('T')[0];
        if (dailyData.has(dateStr)) {
          const day = dailyData.get(dateStr)!;
          day.revenue += order.totalPrice;
          day.orders += 1;
        }
      });

      // Convert to array and sort by date
      const chartData = Array.from(dailyData.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(day => ({
          ...day,
          revenue: Math.round(day.revenue * 100) / 100,
        }));

      res.json({
        success: true,
        data: chartData,
        warnings: warnings.length > 0 ? warnings : undefined,
      });
    } catch (error) {
      console.error('Error fetching revenue chart data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch revenue chart data',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/analytics/recent-orders
 * Recent orders from Shopify Admin API
 */
router.get(
  '/recent-orders',
  EndpointRateLimits.ANALYTICS,
  CacheStrategies.SHORT(),
  async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;

      const recentOrders = await shopifyAnalyticsService.getRecentOrders(limit);

      // Format for frontend
      const formattedOrders = recentOrders.map(order => ({
        id: order.id,
        order_number: `#${order.orderNumber}`,
        total: order.totalPrice,
        status: 'fulfilled', // Shopify doesn't return status in current query, default to fulfilled
        customer_email: order.customerEmail || 'Guest',
        created_at: order.createdAt,
        items: order.lineItems.length,
      }));

      res.json({
        success: true,
        data: formattedOrders,
      });
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recent orders',
        warnings: ['Shopify data unavailable'],
      });
    }
  }
);

/**
 * GET /api/analytics/session/:sessionId
 * Get attribution journey for a session
 */
router.get(
  '/session/:sessionId',
  EndpointRateLimits.GENERAL,
  validateParams(analyticsSessionSchema),
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      const journey = await recommendationAnalyticsService.getSessionJourney(
        sessionId
      );

      res.json({
        success: true,
        data: {
          sessionId,
          events: journey,
          totalEvents: journey.length,
        },
      });
    } catch (error) {
      console.error('Error fetching session journey:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch session journey',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/analytics/health
 * Analytics system health check
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const checks: any = {
      ga4: { status: 'unknown' },
      shopify: { status: 'unknown' },
      redis: { status: 'unknown' },
    };

    // Test GA4 connection (use traffic metrics instead of realtime)
    try {
      await ga4AnalyticsService.getTrafficMetrics('7daysAgo', 'today');
      checks.ga4 = { status: 'healthy', message: 'GA4 API connected' };
    } catch (error) {
      checks.ga4 = {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'GA4 connection failed',
      };
    }

    // Test Shopify connection
    try {
      await shopifyAnalyticsService.getShopInfo();
      checks.shopify = { status: 'healthy', message: 'Shopify API connected' };
    } catch (error) {
      checks.shopify = {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Shopify connection failed',
      };
    }

    // Test Redis connection
    try {
      const metrics = await recommendationAnalyticsService.getMetrics(1);
      checks.redis = {
        status: 'healthy',
        message: 'Redis connected',
        sampleData: metrics,
      };
    } catch (error) {
      checks.redis = {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Redis connection failed',
      };
    }

    const allHealthy = Object.values(checks).every(
      (check: any) => check.status === 'healthy'
    );

    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Health check failed',
    });
  }
});

export default router;
