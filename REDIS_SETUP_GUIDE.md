# Redis Setup Guide for KCT Knowledge API

## Quick Start

### 1. Install Redis

#### macOS (using Homebrew):
```bash
brew install redis
```

#### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install redis-server
```

#### Windows:
Download from https://redis.io/download or use WSL with Linux instructions.

### 2. Start Redis
```bash
# Start Redis server
redis-server

# Or start as background service (macOS)
brew services start redis

# Or start as systemd service (Linux)
sudo systemctl start redis-server
```

### 3. Verify Installation
```bash
# Test Redis connection
redis-cli ping
# Should return: PONG
```

### 4. Configure Environment
Create `.env` file in project root:
```env
# Copy from .env.example and configure
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### 5. Start the API
```bash
npm run build
npm start
```

## Production Configuration

### Redis Configuration (`/etc/redis/redis.conf`)

```conf
# Memory Management
maxmemory 512mb
maxmemory-policy allkeys-lru

# Security
requirepass your-secure-password-here
bind 127.0.0.1

# Persistence
save 900 1
save 300 10
save 60 10000

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Performance
tcp-keepalive 300
timeout 0
```

### Environment Variables for Production
```env
NODE_ENV=production
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password
REDIS_DB=0
CACHE_DEFAULT_TTL=3600
ENABLE_COMPRESSION=true
MEMORY_WARNING_THRESHOLD=512
MEMORY_CRITICAL_THRESHOLD=1024
```

## Testing the Cache Implementation

### 1. Health Checks
```bash
# Check overall health
curl http://localhost:3000/health

# Check cache health
curl http://localhost:3000/health/cache

# Check performance metrics
curl http://localhost:3000/health/metrics

# Check system health
curl http://localhost:3000/health/system
```

### 2. Test Cache Performance
```bash
# First request (cache miss)
time curl http://localhost:3000/api/v1/colors

# Second request (cache hit - should be faster)
time curl http://localhost:3000/api/v1/colors
```

### 3. Monitor Cache Headers
```bash
# Check cache headers
curl -I http://localhost:3000/api/v1/colors
# Look for: X-Cache: HIT or MISS, X-Response-Time, etc.
```

## Monitoring and Maintenance

### Redis CLI Commands
```bash
# Connect to Redis
redis-cli

# Check memory usage
> INFO memory

# Check cache hit/miss stats
> INFO stats

# List all keys
> KEYS *

# Check specific key
> GET kct:color:families

# Monitor real-time commands
> MONITOR

# Check connected clients
> CLIENT LIST
```

### Performance Monitoring
```bash
# Monitor Redis performance
redis-cli --latency

# Monitor memory usage
redis-cli --bigkeys

# Real-time monitoring
redis-cli --stat
```

## Troubleshooting

### Common Issues

#### 1. Redis Connection Failed
```bash
# Check if Redis is running
redis-cli ping

# Start Redis if not running
redis-server

# Check logs
tail -f /var/log/redis/redis-server.log
```

#### 2. High Memory Usage
```bash
# Check memory usage
redis-cli INFO memory

# Clear all cache (use with caution)
redis-cli FLUSHDB

# Check large keys
redis-cli --bigkeys
```

#### 3. Slow Performance
```bash
# Check slow queries
redis-cli SLOWLOG GET 10

# Monitor latency
redis-cli --latency-history

# Check configuration
redis-cli CONFIG GET "*"
```

#### 4. Cache Not Working
- Verify Redis connection in app logs
- Check environment variables
- Verify API endpoints return cache headers
- Check TTL values in cache service

### Performance Optimization

#### 1. Memory Optimization
```bash
# Set memory policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Enable key expiration
redis-cli CONFIG SET maxmemory 512mb
```

#### 2. Connection Optimization
```conf
# In redis.conf
tcp-keepalive 300
timeout 0
tcp-backlog 511
```

#### 3. Persistence Settings
```conf
# For performance (less persistence)
save ""

# For durability (more persistence)
save 900 1
save 300 10
save 60 10000
```

## Development Workflow

### 1. Local Development
```bash
# Start Redis
redis-server

# Start API in development mode
npm run dev

# Monitor cache in separate terminal
redis-cli MONITOR
```

### 2. Testing
```bash
# Run tests (note: requires Redis running)
npm test

# Run specific cache tests
npm test -- --testPathPattern=cache.test.ts
```

### 3. Cache Management
```bash
# Clear development cache
redis-cli -n 0 FLUSHDB

# Clear test cache
redis-cli -n 1 FLUSHDB

# Warm up cache
curl http://localhost:3000/api/v1/colors
curl http://localhost:3000/api/v1/profiles
```

## Security Considerations

### Production Security
1. **Password Protection**: Always set `requirepass` in production
2. **Network Security**: Bind to specific interfaces, use firewalls
3. **Access Control**: Limit Redis commands if possible
4. **Encryption**: Use TLS for Redis connections in production
5. **Regular Updates**: Keep Redis updated to latest stable version

### Example Secure Configuration
```conf
# Security
requirepass your-very-secure-password
bind 127.0.0.1
protected-mode yes
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""
```

## Monitoring Dashboard Setup

### Redis Insights (Recommended)
1. Download from https://redislabs.com/redis-enterprise/redis-insight/
2. Connect to your Redis instance
3. Monitor performance, memory usage, and key patterns

### Command Line Monitoring
```bash
# Create monitoring script
cat > monitor-redis.sh << 'EOF'
#!/bin/bash
while true; do
    echo "=== $(date) ==="
    redis-cli INFO stats | grep -E "(keyspace_hits|keyspace_misses|used_memory_human)"
    redis-cli INFO replication
    echo ""
    sleep 10
done
EOF

chmod +x monitor-redis.sh
./monitor-redis.sh
```

This guide provides everything needed to set up and monitor Redis for the KCT Knowledge API caching implementation.