# KCT Knowledge API Enhancement - Production Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Configuration](#database-configuration)
4. [Redis Configuration](#redis-configuration)
5. [Application Deployment](#application-deployment)
6. [Performance Optimization](#performance-optimization)
7. [Security Configuration](#security-configuration)
8. [Monitoring and Health Checks](#monitoring-and-health-checks)
9. [Backup and Recovery](#backup-and-recovery)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **Redis**: Version 6.0 or higher
- **Memory**: Minimum 4GB RAM (8GB recommended for production)
- **Storage**: Minimum 50GB available space
- **CPU**: Minimum 2 cores (4 cores recommended)

### Required Services
- Redis server for caching
- Load balancer (nginx recommended)
- Process manager (PM2 recommended)
- SSL certificate for HTTPS

## Environment Setup

### 1. Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (using NodeSource repository)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be 18.0.0+
npm --version   # Should be 8.0.0+

# Install PM2 globally
sudo npm install -g pm2

# Install build essentials
sudo apt-get install -y build-essential
```

### 2. Application Setup

```bash
# Create application directory
sudo mkdir -p /opt/kct-knowledge-api
sudo chown -R $USER:$USER /opt/kct-knowledge-api
cd /opt/kct-knowledge-api

# Clone/copy application files
# (assuming files are already uploaded to server)

# Install dependencies
npm ci --production

# Build application
npm run build
```

### 3. Environment Variables

Create production environment file:

```bash
# Create environment file
sudo nano /opt/kct-knowledge-api/.env.production
```

```env
# Application Configuration
NODE_ENV=production
PORT=3000
API_VERSION=v1

# Security
JWT_SECRET=your-super-secure-jwt-secret-min-256-bits
API_KEY_SECRET=your-api-key-secret
ENCRYPTION_KEY=your-32-character-encryption-key

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_SLOW_DOWN_DELAY_MS=1000

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
REDIS_KEY_PREFIX=kct:api:
REDIS_CLUSTER_MODE=false

# Cache Configuration
CACHE_TTL_DEFAULT=3600
CACHE_TTL_PSYCHOLOGY=7200
CACHE_TTL_CAREER=14400
CACHE_TTL_VENUE=21600
CACHE_TTL_CULTURAL=28800
CACHE_COMPRESSION_ENABLED=true
CACHE_COMPRESSION_THRESHOLD=1024

# Performance Configuration
MAX_CONCURRENT_REQUESTS=100
REQUEST_TIMEOUT_MS=30000
KEEP_ALIVE_TIMEOUT_MS=65000

# Monitoring
ENABLE_PERFORMANCE_MONITORING=true
LOG_LEVEL=warn
LOG_FILE_PATH=/var/log/kct-knowledge-api/app.log
METRICS_COLLECTION_INTERVAL=60000

# Health Check Configuration
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000

# Data Loading Configuration
DATA_RELOAD_INTERVAL_HOURS=24
DATA_VALIDATION_STRICT=true
DATA_BACKUP_ENABLED=true

# Security Headers
HELMET_ENABLED=true
HSTS_MAX_AGE=31536000
CSP_ENABLED=true
```

Set proper permissions:
```bash
sudo chmod 600 /opt/kct-knowledge-api/.env.production
```

## Database Configuration

### Data Directory Setup

```bash
# Create data directories
sudo mkdir -p /opt/kct-knowledge-api/data/{intelligence,training,validation,visual}
sudo chown -R $USER:$USER /opt/kct-knowledge-api/data

# Set proper permissions
sudo chmod -R 755 /opt/kct-knowledge-api/data
```

### Data Migration

```bash
# Copy existing data files
cp -r src/data/* /opt/kct-knowledge-api/data/

# Verify data integrity
npm run validate-data

# Create data backup
tar -czf /backup/kct-data-$(date +%Y%m%d).tar.gz /opt/kct-knowledge-api/data
```

## Redis Configuration

### 1. Install Redis

```bash
# Install Redis
sudo apt-get install -y redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
```

### 2. Redis Production Configuration

```bash
# /etc/redis/redis.conf

# Network
bind 127.0.0.1
port 6379
protected-mode yes

# Security
requirepass your-redis-password
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""
rename-command CONFIG ""

# Memory Management
maxmemory 2gb
maxmemory-policy allkeys-lru
maxmemory-samples 5

# Persistence
save 900 1
save 300 10
save 60 10000
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /var/lib/redis

# Append Only File
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Performance
tcp-keepalive 300
timeout 300
tcp-backlog 511
databases 16

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
syslog-enabled yes
syslog-ident redis
```

### 3. Start and Enable Redis

```bash
# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify Redis is running
redis-cli ping  # Should return PONG

# Test authentication
redis-cli -a your-redis-password ping
```

## Application Deployment

### 1. PM2 Configuration

Create PM2 ecosystem file:

```bash
# Create PM2 configuration
nano /opt/kct-knowledge-api/ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'kct-knowledge-api',
    script: 'dist/server.js',
    cwd: '/opt/kct-knowledge-api',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_file: '/opt/kct-knowledge-api/.env.production',
    
    // Performance tuning
    max_memory_restart: '2G',
    max_restarts: 10,
    min_uptime: '10s',
    
    // Logging
    log_file: '/var/log/kct-knowledge-api/combined.log',
    out_file: '/var/log/kct-knowledge-api/out.log',
    error_file: '/var/log/kct-knowledge-api/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Process management
    autorestart: true,
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'data'],
    
    // Health monitoring
    listen_timeout: 3000,
    kill_timeout: 5000,
    
    // Environment specific
    node_args: '--max-old-space-size=4096'
  }]
};
```

### 2. Create Log Directories

```bash
# Create log directories
sudo mkdir -p /var/log/kct-knowledge-api
sudo chown -R $USER:$USER /var/log/kct-knowledge-api
sudo chmod 755 /var/log/kct-knowledge-api
```

### 3. Deploy with PM2

```bash
# Start application with PM2
cd /opt/kct-knowledge-api
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup

# Verify deployment
pm2 status
pm2 logs kct-knowledge-api --lines 50
```

## Performance Optimization

### 1. Nginx Load Balancer Configuration

```bash
# Install Nginx
sudo apt-get install -y nginx

# Create configuration
sudo nano /etc/nginx/sites-available/kct-knowledge-api
```

```nginx
upstream kct_api {
    least_conn;
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=burst_limit:10m rate=100r/s;

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /path/to/your/certificate.pem;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml;

    # API Routes
    location /api/ {
        # Rate limiting
        limit_req zone=api_limit burst=20 nodelay;
        limit_req zone=burst_limit burst=50 nodelay;

        # Proxy settings
        proxy_pass http://kct_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://kct_api;
        access_log off;
    }

    # Static file serving (if needed)
    location /static/ {
        alias /opt/kct-knowledge-api/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Error pages
    error_page 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/kct-knowledge-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 2. System Optimization

```bash
# Increase file descriptor limits
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Optimize kernel parameters
sudo tee -a /etc/sysctl.conf << EOF
# Network optimization
net.core.somaxconn = 65536
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 65536
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 1200
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216

# Memory optimization
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
EOF

sudo sysctl -p
```

## Security Configuration

### 1. Firewall Setup

```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 3. Security Monitoring

```bash
# Install fail2ban
sudo apt-get install -y fail2ban

# Create jail configuration
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
action = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath = /var/log/nginx/error.log
findtime = 600
bantime = 7200
maxretry = 10

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
```

```bash
sudo systemctl restart fail2ban
```

## Monitoring and Health Checks

### 1. Application Monitoring

```bash
# Install monitoring tools
npm install -g pm2-logrotate

# Configure log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### 2. Health Check Script

Create monitoring script:

```bash
nano /opt/kct-knowledge-api/scripts/health-check.sh
```

```bash
#!/bin/bash

API_URL="http://localhost:3000/health"
LOG_FILE="/var/log/kct-knowledge-api/health-check.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Check API health
response=$(curl -s -o /dev/null -w "%{http_code}" $API_URL)

if [ "$response" = "200" ]; then
    echo "[$TIMESTAMP] API health check: OK" >> $LOG_FILE
else
    echo "[$TIMESTAMP] API health check: FAILED (HTTP $response)" >> $LOG_FILE
    
    # Restart if unhealthy
    pm2 restart kct-knowledge-api
    
    # Send alert (configure your preferred notification method)
    echo "[$TIMESTAMP] Restarted API due to health check failure" >> $LOG_FILE
fi

# Check Redis
redis_response=$(redis-cli -a your-redis-password ping 2>/dev/null)
if [ "$redis_response" = "PONG" ]; then
    echo "[$TIMESTAMP] Redis health check: OK" >> $LOG_FILE
else
    echo "[$TIMESTAMP] Redis health check: FAILED" >> $LOG_FILE
fi

# Check disk space
disk_usage=$(df /opt/kct-knowledge-api | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$disk_usage" -gt 80 ]; then
    echo "[$TIMESTAMP] WARNING: Disk usage is ${disk_usage}%" >> $LOG_FILE
fi

# Check memory usage
memory_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
memory_threshold=85.0
if (( $(echo "$memory_usage > $memory_threshold" | bc -l) )); then
    echo "[$TIMESTAMP] WARNING: Memory usage is ${memory_usage}%" >> $LOG_FILE
fi
```

Make it executable and schedule:
```bash
chmod +x /opt/kct-knowledge-api/scripts/health-check.sh

# Add to crontab (run every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/kct-knowledge-api/scripts/health-check.sh") | crontab -
```

### 3. Performance Monitoring

Create performance monitoring:

```bash
nano /opt/kct-knowledge-api/scripts/performance-monitor.sh
```

```bash
#!/bin/bash

METRICS_FILE="/var/log/kct-knowledge-api/performance.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# API response time
response_time=$(curl -o /dev/null -s -w "%{time_total}" http://localhost:3000/health)

# Redis response time
redis_start=$(date +%s.%N)
redis-cli -a your-redis-password ping > /dev/null 2>&1
redis_end=$(date +%s.%N)
redis_time=$(echo "$redis_end - $redis_start" | bc)

# System metrics
cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
memory_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')

echo "[$TIMESTAMP] API_RESPONSE_TIME:${response_time}s REDIS_RESPONSE_TIME:${redis_time}s CPU:${cpu_usage}% MEMORY:${memory_usage}% LOAD:${load_avg}" >> $METRICS_FILE
```

## Backup and Recovery

### 1. Data Backup Strategy

```bash
# Create backup script
nano /opt/kct-knowledge-api/scripts/backup.sh
```

```bash
#!/bin/bash

BACKUP_DIR="/backup/kct-knowledge-api"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup application data
tar -czf "$BACKUP_DIR/data-$TIMESTAMP.tar.gz" -C /opt/kct-knowledge-api/data .

# Backup Redis data
redis-cli -a your-redis-password --rdb "$BACKUP_DIR/redis-$TIMESTAMP.rdb"

# Backup configuration
tar -czf "$BACKUP_DIR/config-$TIMESTAMP.tar.gz" \
    /opt/kct-knowledge-api/.env.production \
    /opt/kct-knowledge-api/ecosystem.config.js \
    /etc/nginx/sites-available/kct-knowledge-api

# Remove old backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.rdb" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $TIMESTAMP"
```

Schedule daily backups:
```bash
chmod +x /opt/kct-knowledge-api/scripts/backup.sh

# Add to crontab (run daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/kct-knowledge-api/scripts/backup.sh") | crontab -
```

### 2. Recovery Procedures

Create recovery script:
```bash
nano /opt/kct-knowledge-api/scripts/recover.sh
```

```bash
#!/bin/bash

if [ $# -ne 1 ]; then
    echo "Usage: $0 <backup_timestamp>"
    echo "Example: $0 20231201_020000"
    exit 1
fi

BACKUP_TIMESTAMP=$1
BACKUP_DIR="/backup/kct-knowledge-api"

echo "Starting recovery from backup: $BACKUP_TIMESTAMP"

# Stop services
pm2 stop kct-knowledge-api
sudo systemctl stop redis-server

# Restore data
if [ -f "$BACKUP_DIR/data-$BACKUP_TIMESTAMP.tar.gz" ]; then
    echo "Restoring application data..."
    rm -rf /opt/kct-knowledge-api/data/*
    tar -xzf "$BACKUP_DIR/data-$BACKUP_TIMESTAMP.tar.gz" -C /opt/kct-knowledge-api/data/
else
    echo "Data backup not found!"
    exit 1
fi

# Restore Redis data
if [ -f "$BACKUP_DIR/redis-$BACKUP_TIMESTAMP.rdb" ]; then
    echo "Restoring Redis data..."
    sudo cp "$BACKUP_DIR/redis-$BACKUP_TIMESTAMP.rdb" /var/lib/redis/dump.rdb
    sudo chown redis:redis /var/lib/redis/dump.rdb
else
    echo "Redis backup not found!"
fi

# Restore configuration
if [ -f "$BACKUP_DIR/config-$BACKUP_TIMESTAMP.tar.gz" ]; then
    echo "Restoring configuration..."
    sudo tar -xzf "$BACKUP_DIR/config-$BACKUP_TIMESTAMP.tar.gz" -C /
fi

# Start services
sudo systemctl start redis-server
sleep 5
pm2 start kct-knowledge-api

echo "Recovery completed!"
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Application Won't Start

```bash
# Check PM2 logs
pm2 logs kct-knowledge-api --lines 100

# Check if port is in use
sudo netstat -tulpn | grep :3000

# Check environment variables
pm2 env kct-knowledge-api

# Restart application
pm2 restart kct-knowledge-api
```

#### 2. Redis Connection Issues

```bash
# Check Redis status
sudo systemctl status redis-server

# Test Redis connection
redis-cli -a your-redis-password ping

# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log

# Restart Redis
sudo systemctl restart redis-server
```

#### 3. High Memory Usage

```bash
# Check memory usage by process
ps aux --sort=-%mem | head

# Check PM2 memory usage
pm2 monit

# Restart application if memory leak suspected
pm2 restart kct-knowledge-api --update-env

# Clear Redis cache if needed
redis-cli -a your-redis-password FLUSHALL
```

#### 4. Performance Issues

```bash
# Check system load
htop

# Check nginx logs for errors
sudo tail -f /var/log/nginx/error.log

# Monitor API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/health

# Check Redis performance
redis-cli -a your-redis-password --latency-history -h localhost -p 6379
```

#### 5. SSL Certificate Issues

```bash
# Check certificate expiration
openssl x509 -in /path/to/certificate.pem -text -noout | grep "Not After"

# Renew Let's Encrypt certificate
sudo certbot renew

# Test SSL configuration
sudo nginx -t
```

### Log Analysis

#### Application Logs
```bash
# View real-time logs
pm2 logs kct-knowledge-api --follow

# Search for errors
grep -i "error" /var/log/kct-knowledge-api/error.log

# Analyze performance logs
tail -f /var/log/kct-knowledge-api/performance.log
```

#### System Logs
```bash
# Check system messages
sudo journalctl -f

# Check nginx access logs
sudo tail -f /var/log/nginx/access.log

# Check fail2ban logs
sudo tail -f /var/log/fail2ban.log
```

## Post-Deployment Verification

### 1. Functional Testing

```bash
# Test health endpoint
curl -i http://localhost:3000/health

# Test API endpoints
curl -X POST http://localhost:3000/api/v1/intelligence/psychology/analyze \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"test","session_duration":15000,"choices_viewed":25,"page_views":12}'

# Test performance
ab -n 100 -c 10 http://localhost:3000/health
```

### 2. Security Verification

```bash
# Test SSL configuration
nmap --script ssl-enum-ciphers -p 443 yourdomain.com

# Check security headers
curl -I https://yourdomain.com

# Verify firewall rules
sudo ufw status verbose
```

### 3. Monitoring Setup Verification

```bash
# Check PM2 status
pm2 status

# Verify cron jobs
crontab -l

# Test backup script
/opt/kct-knowledge-api/scripts/backup.sh

# Test health check script
/opt/kct-knowledge-api/scripts/health-check.sh
```

## Maintenance Tasks

### Daily Tasks
- Monitor application logs for errors
- Check system resource usage
- Verify backup completion
- Review performance metrics

### Weekly Tasks
- Update system packages
- Review and rotate logs
- Check SSL certificate expiration
- Performance optimization review

### Monthly Tasks
- Security updates
- Backup restoration testing
- Performance benchmarking
- Capacity planning review

---

## Support and Documentation

For additional support or questions about deployment:

1. Check application logs first
2. Review this deployment guide
3. Consult the API documentation
4. Contact the development team

**Remember**: Always test deployments in a staging environment before applying to production!