/**
 * IP Geolocation Service
 * Uses ip-api.com (free, no API key required, 45 req/min)
 */

import { logger } from '../utils/logger';

export interface GeoLocation {
  ip: string;
  city: string;
  country: string;
  countryCode: string;
  region: string;
  timezone: string;
  lat?: number;
  lon?: number;
}

class IpGeolocationService {
  private cache: Map<string, { data: GeoLocation; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly API_URL = 'http://ip-api.com/json';

  /**
   * Get geolocation data for an IP address
   */
  async geolocate(ip: string): Promise<GeoLocation | null> {
    try {
      // Skip private/local IPs
      if (this.isPrivateIP(ip)) {
        logger.debug(`Skipping geolocation for private IP: ${ip}`);
        return null;
      }

      // Check cache
      const cached = this.cache.get(ip);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }

      // Fetch from ip-api.com
      const response = await fetch(`${this.API_URL}/${ip}?fields=status,message,country,countryCode,region,city,lat,lon,timezone,query`);

      if (!response.ok) {
        logger.error(`IP geolocation API error: ${response.status}`);
        return null;
      }

      const data = await response.json() as any;

      if (data.status === 'fail') {
        logger.warn(`IP geolocation failed for ${ip}: ${data.message}`);
        return null;
      }

      const geoData: GeoLocation = {
        ip: data.query || ip,
        city: data.city || 'Unknown',
        country: data.country || 'Unknown',
        countryCode: data.countryCode || '',
        region: data.region || '',
        timezone: data.timezone || '',
        lat: data.lat,
        lon: data.lon,
      };

      // Cache the result
      this.cache.set(ip, { data: geoData, timestamp: Date.now() });

      // Clean old cache entries (keep last 1000)
      if (this.cache.size > 1000) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
          this.cache.delete(firstKey);
        }
      }

      return geoData;
    } catch (error) {
      logger.error('IP geolocation error:', error);
      return null;
    }
  }

  /**
   * Extract IP from Express request
   */
  extractIP(req: any): string {
    // Railway uses x-forwarded-for header
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      // Take first IP if comma-separated
      const ips = forwarded.split(',').map((ip: string) => ip.trim());
      return ips[0];
    }

    return req.ip || req.connection?.remoteAddress || 'unknown';
  }

  /**
   * Check if IP is private/local
   */
  private isPrivateIP(ip: string): boolean {
    if (ip === 'unknown' || ip === '::1' || ip === '127.0.0.1') {
      return true;
    }

    // Check for private IPv4 ranges
    const parts = ip.split('.');
    if (parts.length === 4) {
      const first = parseInt(parts[0]);
      const second = parseInt(parts[1]);

      // 10.0.0.0/8
      if (first === 10) return true;

      // 172.16.0.0/12
      if (first === 172 && second >= 16 && second <= 31) return true;

      // 192.168.0.0/16
      if (first === 192 && second === 168) return true;
    }

    return false;
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const ipGeolocationService = new IpGeolocationService();
