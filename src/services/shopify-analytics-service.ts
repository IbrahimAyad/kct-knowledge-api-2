/**
 * Shopify Analytics Service
 * Fetches sales, orders, and product data from Shopify Admin API
 * Uses direct GraphQL calls to avoid SDK compatibility issues
 */

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
  private accessToken: string;
  private shop: string;
  private graphqlUrl: string;

  constructor() {
    const shopDomain = process.env.SHOPIFY_STORE_URL;
    this.accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '';
    this.shop = shopDomain ? shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';
    this.graphqlUrl = `https://${this.shop}/admin/api/2024-01/graphql.json`;
  }

  /**
   * Execute GraphQL query directly against Shopify Admin API
   */
  private async executeGraphQL(query: string, variables?: any): Promise<any> {
    if (!this.shop || !this.accessToken) {
      throw new Error('SHOPIFY_STORE_URL and SHOPIFY_ADMIN_ACCESS_TOKEN must be set');
    }

    const response = await fetch(this.graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.accessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
    }

    const result: any = await response.json();

    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data;
  }

  /**
   * Get sales metrics for a date range
   */
  async getSalesMetrics(
    startDate: string,
    endDate: string
  ): Promise<ShopifySalesMetrics> {
    try {
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

      const ordersData = await this.executeGraphQL(ordersQuery, { query: dateQuery });

      const orders = ordersData.orders.edges;
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

      const statsData = await this.executeGraphQL(statsQuery);

      return {
        totalSales: Math.round(totalSales * 100) / 100,
        totalOrders,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        totalProducts: statsData.productsCount?.count || 0,
        totalCustomers: statsData.customersCount?.count || 0,
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

      const data = await this.executeGraphQL(query, { limit });

      return data.orders.edges.map((edge: any) => ({
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

      const data = await this.executeGraphQL(query, { query: dateQuery });

      // Aggregate product sales
      const productSales = new Map<string, { title: string; quantity: number; sales: number }>();

      data.orders.edges.forEach((order: any) => {
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

      const data = await this.executeGraphQL(query, { query: dateQuery });

      // Count purchases per product
      const purchases = new Map<string, number>();

      data.orders.edges.forEach((order: any) => {
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

      const data = await this.executeGraphQL(query);

      return data.shop;
    } catch (error) {
      console.error('Error fetching shop info:', error);
      throw error;
    }
  }
}

// Singleton instance
export const shopifyAnalyticsService = new ShopifyAnalyticsService();
