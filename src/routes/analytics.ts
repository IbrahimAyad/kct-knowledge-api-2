/**
 * Analytics API Routes
 * Unified dashboard combining GA4, Shopify, and recommendation data
 */

import express, { Request, Response } from 'express';
import { ga4AnalyticsService } from '../services/ga4-analytics-service';
import { shopifyAnalyticsService } from '../services/shopify-analytics-service';
import { recommendationAnalyticsService } from '../services/recommendation-analytics-service';
import { supabaseAnalyticsService } from '../services/supabase-analytics-service';
import { ipGeolocationService } from '../services/ip-geolocation-service';
import { databaseService } from '../config/database';
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
 * Track analytics events from frontend (flexible format)
 * Stores in Railway PostgreSQL and optionally Redis for backward compatibility
 */
router.post(
  '/track',
  EndpointRateLimits.ANALYTICS,
  validateBody(analyticsTrackSchema),
  async (req: Request, res: Response) => {
    try {
      // Log raw payload for debugging
      console.log('📊 Analytics track payload:', JSON.stringify(req.body).substring(0, 200));

      const {
        eventType,
        sessionId,
        userId,
        userEmail,
        pageUrl,
        data,
        timestamp,
        // Legacy fields for backward compatibility
        productId,
        productTitle,
        occasion,
        source,
      } = req.body;

      // Handle timestamp - can be string (ISO) or number (unix ms)
      const eventTimestamp = timestamp
        ? (typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp)
        : Date.now();
      const userAgent = req.headers['user-agent'] || '';

      // Extract IP and geolocate
      const ipAddress = ipGeolocationService.extractIP(req);
      const geoData = await ipGeolocationService.geolocate(ipAddress);

      // Prepare event data - merge new flexible format with legacy fields
      const eventData: any = data || {};
      if (productId) eventData.productId = productId;
      if (productTitle) eventData.productTitle = productTitle;
      if (occasion) eventData.occasion = occasion;
      if (source) eventData.source = source;

      // Use userId/userEmail from request body (Lovable format)
      const finalUserId = userId || (data as any)?.userId || undefined;
      const finalUserEmail = userEmail || (data as any)?.userEmail || undefined;

      // Store in Railway PostgreSQL (primary storage)
      try {
        await databaseService.execute(
          `INSERT INTO analytics_events
           (event_type, session_id, user_id, customer_email, page_url, user_agent, ip_address, city, country, event_data, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            eventType,
            sessionId,
            finalUserId,
            finalUserEmail,
            pageUrl || '',
            userAgent,
            ipAddress,
            geoData?.city || null,
            geoData?.country || null,
            JSON.stringify(eventData),
            eventTimestamp
          ]
        );
      } catch (dbError) {
        console.error('Failed to store event in Railway PostgreSQL:', dbError);
        // Don't fail the request if database is unavailable
      }

      // Track legacy product events in Redis (backward compatibility)
      if (productId && ['view', 'click', 'add_to_cart', 'purchase'].includes(eventType)) {
        try {
          await recommendationAnalyticsService.trackEvent({
            eventType: eventType as any,
            productId,
            productTitle: productTitle || '',
            occasion,
            source: source || 'web',
            sessionId,
            timestamp: eventTimestamp,
          });
        } catch (redisError) {
          console.error('Failed to track event in Redis:', redisError);
          // Continue without Redis tracking
        }
      }

      res.json({
        success: true,
        message: 'Event tracked successfully',
        data: {
          eventType,
          sessionId,
          timestamp: new Date(eventTimestamp).toISOString(),
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
 * GET /api/analytics/top-products
 * Top products with views, add-to-cart, purchases, and revenue
 */
router.get(
  '/top-products',
  EndpointRateLimits.ANALYTICS,
  CacheStrategies.SHORT(),
  async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const limit = parseInt(req.query.limit as string) || 10;

      const warnings: string[] = [];

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Try to get GA4 product views first
      let ga4Products: any[] = [];
      try {
        ga4Products = await ga4AnalyticsService.getTopProductsByViews(
          `${days}daysAgo`,
          'today',
          limit
        );
      } catch (error) {
        console.warn('GA4 product views unavailable:', error);
        warnings.push('GA4 product views unavailable');
      }

      // Get Shopify top products (by revenue)
      let shopifyProducts: any[] = [];
      try {
        shopifyProducts = await shopifyAnalyticsService.getTopProducts(
          startDateStr,
          endDateStr,
          limit
        );
      } catch (error) {
        console.warn('Shopify product data unavailable:', error);
        warnings.push('Shopify product data unavailable');
      }

      // Merge data - prioritize products with both GA4 and Shopify data
      const productMap = new Map<string, any>();

      // Add Shopify products first (revenue and purchase data is critical)
      shopifyProducts.forEach(product => {
        productMap.set(product.productId, {
          id: product.productId,
          name: product.title,
          views: 0,
          add_to_cart: 0,
          purchases: product.totalQuantity,
          revenue: product.totalSales,
        });
      });

      // Enhance with GA4 view/cart data if available
      ga4Products.forEach(product => {
        const existing = productMap.get(product.itemId);
        if (existing) {
          existing.views = product.views;
          existing.add_to_cart = product.addToCarts;
        } else {
          // GA4 only product (has views but maybe no purchases yet)
          productMap.set(product.itemId, {
            id: product.itemId,
            name: product.itemName,
            views: product.views,
            add_to_cart: product.addToCarts,
            purchases: product.purchases,
            revenue: product.revenue,
          });
        }
      });

      // Convert to array and sort by revenue
      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);

      res.json({
        success: true,
        data: topProducts,
        warnings: warnings.length > 0 ? warnings : undefined,
      });
    } catch (error) {
      console.error('Error fetching top products:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch top products',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/analytics/traffic-sources
 * Traffic source breakdown with sessions and revenue
 */
router.get(
  '/traffic-sources',
  EndpointRateLimits.ANALYTICS,
  CacheStrategies.SHORT(),
  async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 7;

      const trafficSources = await ga4AnalyticsService.getTrafficSources(
        `${days}daysAgo`,
        'today',
        20 // Get top 20 sources
      );

      res.json({
        success: true,
        data: trafficSources,
      });
    } catch (error) {
      console.error('Error fetching traffic sources:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch traffic sources',
        warnings: ['GA4 data unavailable'],
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

/**
 * GET /api/analytics/device-conversion
 * Mobile vs Desktop behavior and conversion rates
 * Combines GA4 device metrics with Supabase event data
 */
router.get(
  '/device-conversion',
  EndpointRateLimits.ANALYTICS,
  CacheStrategies.SHORT(),
  async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const warnings: string[] = [];

      // Get GA4 device metrics
      let ga4Devices: any = { desktop: 0, mobile: 0, tablet: 0 };
      try {
        ga4Devices = await ga4AnalyticsService.getDeviceMetrics(`${days}daysAgo`, 'today');
      } catch (error) {
        console.warn('GA4 device metrics unavailable:', error);
        warnings.push('GA4 device metrics unavailable');
      }

      // Get Supabase device breakdown
      let supabaseDevices: any = { desktop: 0, mobile: 0, tablet: 0, unknown: 0 };
      try {
        supabaseDevices = await supabaseAnalyticsService.getDeviceBreakdown(days);
      } catch (error) {
        console.warn('Supabase device metrics unavailable:', error);
        warnings.push('Supabase device breakdown unavailable');
      }

      // Get conversion funnel from Supabase
      let funnel: any = { page_views: 0, product_views: 0, add_to_carts: 0, purchases: 0 };
      try {
        funnel = await supabaseAnalyticsService.getConversionFunnel(days);
      } catch (error) {
        console.warn('Conversion funnel unavailable:', error);
        warnings.push('Conversion funnel data unavailable');
      }

      // Calculate conversion rates
      const conversionRate = funnel.page_views > 0
        ? ((funnel.purchases / funnel.page_views) * 100).toFixed(2)
        : '0.00';

      const addToCartRate = funnel.page_views > 0
        ? ((funnel.add_to_carts / funnel.page_views) * 100).toFixed(2)
        : '0.00';

      const purchaseRate = funnel.add_to_carts > 0
        ? ((funnel.purchases / funnel.add_to_carts) * 100).toFixed(2)
        : '0.00';

      // Merge device data from both sources
      const deviceData = {
        desktop: {
          users_ga4: ga4Devices.desktop,
          sessions_supabase: supabaseDevices.desktop,
          total_users: ga4Devices.desktop + supabaseDevices.desktop,
        },
        mobile: {
          users_ga4: ga4Devices.mobile,
          sessions_supabase: supabaseDevices.mobile,
          total_users: ga4Devices.mobile + supabaseDevices.mobile,
        },
        tablet: {
          users_ga4: ga4Devices.tablet,
          sessions_supabase: supabaseDevices.tablet,
          total_users: ga4Devices.tablet + supabaseDevices.tablet,
        },
      };

      res.json({
        success: true,
        data: {
          device_breakdown: deviceData,
          conversion_funnel: {
            page_views: funnel.page_views,
            product_views: funnel.product_views,
            add_to_carts: funnel.add_to_carts,
            purchases: funnel.purchases,
          },
          conversion_rates: {
            overall_conversion: parseFloat(conversionRate),
            add_to_cart_rate: parseFloat(addToCartRate),
            purchase_completion_rate: parseFloat(purchaseRate),
          },
        },
        warnings: warnings.length > 0 ? warnings : undefined,
      });
    } catch (error) {
      console.error('Error fetching device conversion data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch device conversion data',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/analytics/attribution
 * Marketing attribution and ROI analysis
 * Combines GA4 traffic sources with Shopify revenue data
 */
router.get(
  '/attribution',
  EndpointRateLimits.ANALYTICS,
  CacheStrategies.SHORT(),
  async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const warnings: string[] = [];

      // Calculate date range for Shopify
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Get GA4 traffic sources
      let trafficSources: any[] = [];
      try {
        trafficSources = await ga4AnalyticsService.getTrafficSources(`${days}daysAgo`, 'today', 20);
      } catch (error) {
        console.warn('GA4 traffic sources unavailable:', error);
        warnings.push('GA4 traffic sources unavailable');
      }

      // Get Shopify revenue metrics
      let shopifyMetrics: any = { totalSales: 0, totalOrders: 0, averageOrderValue: 0 };
      try {
        shopifyMetrics = await shopifyAnalyticsService.getSalesMetrics(startDateStr, endDateStr);
      } catch (error) {
        console.warn('Shopify metrics unavailable:', error);
        warnings.push('Shopify revenue data unavailable');
      }

      // Calculate ROI metrics for each traffic source
      const attributionData = trafficSources.map(source => {
        const revenuePerSession = source.sessions > 0
          ? (source.revenue / source.sessions)
          : 0;

        const conversionRate = source.sessions > 0
          ? ((source.revenue > 0 ? 1 : 0) / source.sessions * 100)
          : 0;

        return {
          source: source.source,
          medium: source.medium,
          sessions: source.sessions,
          revenue: source.revenue,
          revenue_per_session: parseFloat(revenuePerSession.toFixed(2)),
          conversion_rate: parseFloat(conversionRate.toFixed(2)),
        };
      });

      // Sort by revenue
      attributionData.sort((a, b) => b.revenue - a.revenue);

      // Calculate total metrics
      const totalSessions = trafficSources.reduce((sum, s) => sum + s.sessions, 0);
      const totalRevenue = trafficSources.reduce((sum, s) => sum + s.revenue, 0);

      res.json({
        success: true,
        data: {
          traffic_sources: attributionData,
          summary: {
            total_sessions: totalSessions,
            total_revenue_attributed: totalRevenue,
            total_shopify_revenue: shopifyMetrics.totalSales,
            total_orders: shopifyMetrics.totalOrders,
            average_order_value: shopifyMetrics.averageOrderValue,
            attribution_coverage: totalSessions > 0
              ? parseFloat(((totalRevenue / shopifyMetrics.totalSales) * 100).toFixed(2))
              : 0,
          },
        },
        warnings: warnings.length > 0 ? warnings : undefined,
      });
    } catch (error) {
      console.error('Error fetching attribution data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch attribution data',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/analytics/customer-journey
 * Customer journey timeline reconstruction
 * Uses Supabase events + GA4 multi-session tracking
 */
router.get(
  '/customer-journey',
  EndpointRateLimits.ANALYTICS,
  async (req: Request, res: Response) => {
    try {
      const sessionId = req.query.sessionId as string;
      const days = parseInt(req.query.days as string) || 7;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'sessionId query parameter is required',
        });
      }

      const warnings: string[] = [];

      // Get journey from Supabase (primary source)
      let journey: any[] = [];
      try {
        journey = await supabaseAnalyticsService.getSessionJourney(sessionId);
      } catch (error) {
        console.warn('Supabase journey unavailable:', error);
        warnings.push('Supabase session journey unavailable');
      }

      // Get journey from Railway PostgreSQL (if available)
      let railwayEvents: any[] = [];
      try {
        railwayEvents = await databaseService.query(
          `SELECT event_type, page_url, event_data, timestamp, created_at
           FROM analytics_events
           WHERE session_id = ?
           ORDER BY timestamp ASC`,
          [sessionId]
        );
      } catch (error) {
        console.warn('Railway journey unavailable:', error);
        warnings.push('Railway session journey unavailable');
      }

      // Merge journeys from both sources
      const allEvents = [
        ...journey.map(event => ({
          timestamp: event.timestamp,
          event_type: event.event_type,
          page_url: event.page_url,
          event_data: event.event_data,
          source: 'supabase',
        })),
        ...railwayEvents.map(event => ({
          timestamp: new Date(event.created_at).toISOString(),
          event_type: event.event_type,
          page_url: event.page_url,
          event_data: typeof event.event_data === 'string'
            ? JSON.parse(event.event_data)
            : event.event_data,
          source: 'railway',
        })),
      ];

      // Sort by timestamp and deduplicate
      const uniqueEvents = allEvents
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .filter((event, index, arr) => {
          // Keep event if it's the first or different from previous
          if (index === 0) return true;
          const prev = arr[index - 1];
          return event.timestamp !== prev.timestamp || event.event_type !== prev.event_type;
        });

      // Calculate journey metrics
      const duration = uniqueEvents.length > 1
        ? new Date(uniqueEvents[uniqueEvents.length - 1].timestamp).getTime() -
          new Date(uniqueEvents[0].timestamp).getTime()
        : 0;

      const pageViews = uniqueEvents.filter(e => e.event_type === 'page_view').length;
      const interactions = uniqueEvents.filter(e => e.event_type !== 'page_view').length;

      res.json({
        success: true,
        data: {
          session_id: sessionId,
          journey: uniqueEvents,
          metrics: {
            total_events: uniqueEvents.length,
            page_views: pageViews,
            interactions: interactions,
            duration_ms: duration,
            duration_minutes: parseFloat((duration / 60000).toFixed(2)),
            avg_time_per_page: pageViews > 0
              ? parseFloat((duration / pageViews / 1000).toFixed(2))
              : 0,
          },
        },
        warnings: warnings.length > 0 ? warnings : undefined,
      });
    } catch (error) {
      console.error('Error fetching customer journey:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch customer journey',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/analytics/geographic
 * Geographic analytics - traffic and conversions by location
 */
router.get(
  '/geographic',
  EndpointRateLimits.ANALYTICS,
  CacheStrategies.SHORT(),
  async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Query Railway PostgreSQL for geographic data
      const results = await databaseService.query(
        `SELECT
          country,
          city,
          COUNT(*) as total_events,
          COUNT(DISTINCT session_id) as unique_sessions,
          COUNT(CASE WHEN event_type = 'page_view' THEN 1 END) as page_views,
          COUNT(CASE WHEN event_type = 'product_view' THEN 1 END) as product_views,
          COUNT(CASE WHEN event_type = 'add_to_cart' THEN 1 END) as add_to_carts,
          COUNT(CASE WHEN event_type = 'purchase' THEN 1 END) as purchases
         FROM analytics_events
         WHERE created_at >= ?
           AND country IS NOT NULL
         GROUP BY country, city
         ORDER BY total_events DESC`,
        [startDate.toISOString()]
      );

      // Aggregate by country
      const countryStats: Record<string, any> = {};
      const cityStats: any[] = [];

      results.forEach((row: any) => {
        const country = row.country || 'Unknown';
        const city = row.city || 'Unknown';

        // Country aggregation
        if (!countryStats[country]) {
          countryStats[country] = {
            country,
            total_events: 0,
            unique_sessions: 0,
            page_views: 0,
            product_views: 0,
            add_to_carts: 0,
            purchases: 0,
            cities: [],
          };
        }

        countryStats[country].total_events += parseInt(row.total_events);
        countryStats[country].page_views += parseInt(row.page_views);
        countryStats[country].product_views += parseInt(row.product_views);
        countryStats[country].add_to_carts += parseInt(row.add_to_carts);
        countryStats[country].purchases += parseInt(row.purchases);

        // City stats
        cityStats.push({
          country,
          city,
          total_events: parseInt(row.total_events),
          unique_sessions: parseInt(row.unique_sessions),
          page_views: parseInt(row.page_views),
          product_views: parseInt(row.product_views),
          add_to_carts: parseInt(row.add_to_carts),
          purchases: parseInt(row.purchases),
          conversion_rate: row.page_views > 0
            ? ((parseInt(row.purchases) / parseInt(row.page_views)) * 100).toFixed(2) + '%'
            : '0%',
        });
      });

      // Calculate conversion rates for countries
      const countries = Object.values(countryStats).map((country: any) => ({
        ...country,
        conversion_rate: country.page_views > 0
          ? ((country.purchases / country.page_views) * 100).toFixed(2) + '%'
          : '0%',
      }));

      res.json({
        success: true,
        data: {
          summary: {
            total_countries: countries.length,
            total_cities: cityStats.length,
            timeframe: `${days} days`,
          },
          by_country: countries.slice(0, 20), // Top 20 countries
          by_city: cityStats.slice(0, 50), // Top 50 cities
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error fetching geographic analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch geographic analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
