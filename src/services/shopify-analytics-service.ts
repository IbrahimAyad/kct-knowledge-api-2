/**
 * Shopify Analytics Service
 * Fetches sales, orders, and product data from Shopify Admin API
 */

import '@shopify/shopify-api/adapters/node';
import { shopifyApi, ApiVersion } from '@shopify/shopify-api';

export interface ShopifySalesMetrics {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  totalProducts: number;
  totalCustomers: number;
}

export interface ShopifyOrder {
  id: string;
  orderNumber: number;
  totalPrice: number;
  createdAt: string;
  customerEmail: string | null;
  lineItems: Array<{
    productId: string;
    title: string;
    quantity: number;
    price: number;
  }>;
}

export interface ShopifyTopProduct {
  productId: string;
  title: string;
  totalSales: number;
  totalQuantity: number;
}

export class ShopifyAnalyticsService {
  private shopify: any = null;
  private accessToken: string;
  private shop: string;
  private initialized = false;

  constructor() {
    const shopDomain = process.env.SHOPIFY_STORE_URL;
    this.accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '';
    this.shop = shopDomain ? shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';
  }

  /**
   * Lazy initialization
   */
  private initialize() {
    if (this.initialized) return;

    if (!this.shop || !this.accessToken) {
      throw new Error('SHOPIFY_STORE_URL and SHOPIFY_ADMIN_ACCESS_TOKEN must be set');
    }

    try {
      // Initialize Shopify API for v12+ custom apps
      // For admin API access tokens, we use apiKey (any string) and apiSecretKey (access token)
      this.shopify = shopifyApi({
        apiKey: 'custom-app', // Can be any string for custom apps
        apiSecretKey: this.accessToken,
        adminApiAccessToken: this.accessToken,
        apiVersion: ApiVersion.January24,
        isEmbeddedApp: false,
        hostName: this.shop,
      });
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Shopify Analytics Service:', error);
      throw error;
    }
  }

  /**
   * Create GraphQL client for queries
   */
  private getGraphQLClient() {
    if (!this.shopify) {
      this.initialize();
    }
    return new (this.shopify as any).clients.Graphql({
      session: {
        shop: this.shop,
        accessToken: this.accessToken,
      },
    });
  }

  /**
   * Get sales metrics for a date range
   */
  async getSalesMetrics(
    startDate: string,
    endDate: string
  ): Promise<ShopifySalesMetrics> {
    try {
      const client = this.getGraphQLClient();

      // Query orders within date range
      const ordersQuery = `
        query getOrders($query: String!) {
          orders(first: 250, query: $query) {
            edges {
              node {
                id
                totalPriceSet {
                  shopMoney {
                    amount
                  }
                }
                createdAt
              }
            }
          }
        }
      `;

      const dateQuery = `created_at:>=${startDate} AND created_at:<=${endDate}`;

      const ordersResponse = await client.query({
        data: {
          query: ordersQuery,
          variables: { query: dateQuery },
        },
      });

      const orders = ordersResponse.body.data.orders.edges;
      const totalOrders = orders.length;
      const totalSales = orders.reduce((sum: number, edge: any) => {
        return sum + parseFloat(edge.node.totalPriceSet.shopMoney.amount);
      }, 0);

      const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

      // Get total products and customers (all time)
      const statsQuery = `
        query getShopStats {
          products(first: 1) {
            pageInfo {
              hasNextPage
            }
          }
          customers(first: 1) {
            pageInfo {
              hasNextPage
            }
          }
          productsCount: productsCount {
            count
          }
          customersCount: customersCount {
            count
          }
        }
      `;

      const statsResponse = await client.query({
        data: { query: statsQuery },
      });

      return {
        totalSales: Math.round(totalSales * 100) / 100,
        totalOrders,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        totalProducts: statsResponse.body.data.productsCount?.count || 0,
        totalCustomers: statsResponse.body.data.customersCount?.count || 0,
      };
    } catch (error) {
      console.error('Error fetching Shopify sales metrics:', error);
      throw error;
    }
  }

  /**
   * Get recent orders with details
   */
  async getRecentOrders(limit: number = 10): Promise<ShopifyOrder[]> {
    try {
      const client = this.getGraphQLClient();

      const query = `
        query getRecentOrders($limit: Int!) {
          orders(first: $limit, reverse: true, sortKey: CREATED_AT) {
            edges {
              node {
                id
                name
                totalPriceSet {
                  shopMoney {
                    amount
                  }
                }
                createdAt
                customer {
                  email
                }
                lineItems(first: 10) {
                  edges {
                    node {
                      product {
                        id
                        title
                      }
                      quantity
                      originalUnitPriceSet {
                        shopMoney {
                          amount
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await client.query({
        data: {
          query,
          variables: { limit },
        },
      });

      return response.body.data.orders.edges.map((edge: any) => ({
        id: edge.node.id,
        orderNumber: parseInt(edge.node.name.replace('#', '')),
        totalPrice: parseFloat(edge.node.totalPriceSet.shopMoney.amount),
        createdAt: edge.node.createdAt,
        customerEmail: edge.node.customer?.email || null,
        lineItems: edge.node.lineItems.edges.map((item: any) => ({
          productId: item.node.product?.id || '',
          title: item.node.product?.title || 'Unknown',
          quantity: item.node.quantity,
          price: parseFloat(item.node.originalUnitPriceSet.shopMoney.amount),
        })),
      }));
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      throw error;
    }
  }

  /**
   * Get top selling products
   */
  async getTopProducts(
    startDate: string,
    endDate: string,
    limit: number = 10
  ): Promise<ShopifyTopProduct[]> {
    try {
      const client = this.getGraphQLClient();

      // Get all orders in date range with line items
      const query = `
        query getOrdersForProducts($query: String!) {
          orders(first: 250, query: $query) {
            edges {
              node {
                lineItems(first: 50) {
                  edges {
                    node {
                      product {
                        id
                        title
                      }
                      quantity
                      originalUnitPriceSet {
                        shopMoney {
                          amount
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const dateQuery = `created_at:>=${startDate} AND created_at:<=${endDate}`;

      const response = await client.query({
        data: {
          query,
          variables: { query: dateQuery },
        },
      });

      // Aggregate product sales
      const productSales = new Map<string, { title: string; quantity: number; sales: number }>();

      response.body.data.orders.edges.forEach((order: any) => {
        order.node.lineItems.edges.forEach((item: any) => {
          if (!item.node.product) return;

          const productId = item.node.product.id;
          const quantity = item.node.quantity;
          const sales = parseFloat(item.node.originalUnitPriceSet.shopMoney.amount) * quantity;

          if (productSales.has(productId)) {
            const existing = productSales.get(productId)!;
            existing.quantity += quantity;
            existing.sales += sales;
          } else {
            productSales.set(productId, {
              title: item.node.product.title,
              quantity,
              sales,
            });
          }
        });
      });

      // Convert to array and sort by sales
      const topProducts = Array.from(productSales.entries())
        .map(([productId, data]) => ({
          productId,
          title: data.title,
          totalSales: Math.round(data.sales * 100) / 100,
          totalQuantity: data.quantity,
        }))
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, limit);

      return topProducts;
    } catch (error) {
      console.error('Error fetching top products:', error);
      throw error;
    }
  }

  /**
   * Get conversion data (products viewed vs purchased)
   * Note: Requires frontend to send product view events to API
   */
  async getConversionData(productIds: string[]): Promise<Map<string, number>> {
    try {
      const client = this.getGraphQLClient();

      // Get purchase count for each product (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const query = `
        query getProductOrders($query: String!) {
          orders(first: 250, query: $query) {
            edges {
              node {
                lineItems(first: 50) {
                  edges {
                    node {
                      product {
                        id
                      }
                      quantity
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const dateQuery = `created_at:>=${startDate} AND created_at:<=${endDate}`;

      const response = await client.query({
        data: {
          query,
          variables: { query: dateQuery },
        },
      });

      // Count purchases per product
      const purchases = new Map<string, number>();

      response.body.data.orders.edges.forEach((order: any) => {
        order.node.lineItems.edges.forEach((item: any) => {
          if (!item.node.product) return;
          const productId = item.node.product.id;
          purchases.set(productId, (purchases.get(productId) || 0) + item.node.quantity);
        });
      });

      return purchases;
    } catch (error) {
      console.error('Error fetching conversion data:', error);
      return new Map();
    }
  }

  /**
   * Get shop information
   */
  async getShopInfo() {
    try {
      const client = this.getGraphQLClient();

      const query = `
        query {
          shop {
            name
            email
            currencyCode
            timezoneAbbreviation
          }
        }
      `;

      const response = await client.query({
        data: { query },
      });

      return response.body.data.shop;
    } catch (error) {
      console.error('Error fetching shop info:', error);
      throw error;
    }
  }
}

// Singleton instance
export const shopifyAnalyticsService = new ShopifyAnalyticsService();
