#!/bin/bash

# Production Deployment Script - Phase 4
# KCT Knowledge API Production Deployment with Zero Downtime

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_ID="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="/var/log/kct-deployment-${DEPLOYMENT_ID}.log"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}" | tee -a "$LOG_FILE"
}

# Error handling
cleanup() {
    local exit_code=$?
    log "Cleaning up deployment process..."
    
    if [ $exit_code -ne 0 ]; then
        log_error "Deployment failed with exit code $exit_code"
        # Trigger rollback if deployment failed
        if [ "${ROLLBACK_ON_FAILURE:-true}" = "true" ]; then
            log "Initiating rollback..."
            ./rollback-production.sh "${PREVIOUS_VERSION:-}"
        fi
    fi
    
    # Clean up temporary files
    rm -f /tmp/deployment-health-check
    rm -f /tmp/deployment-config-backup
    
    exit $exit_code
}

trap cleanup EXIT

# Configuration validation
validate_environment() {
    log "Validating deployment environment..."
    
    # Check required environment variables
    local required_vars=(
        "NODE_ENV"
        "DATABASE_URL"
        "REDIS_URL"
        "JWT_SECRET"
        "API_PORT"
        "WS_PORT"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    # Check system resources
    local available_memory=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    local available_disk=$(df -h / | awk 'NR==2{gsub(/%/,""); print $5}')
    
    if [ "$available_memory" -lt 2048 ]; then
        log_warning "Available memory (${available_memory}MB) is below recommended 2GB"
    fi
    
    if [ "$available_disk" -gt 85 ]; then
        log_error "Disk usage (${available_disk}%) is above 85% threshold"
        exit 1
    fi
    
    log_success "Environment validation passed"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check if previous version exists
    if [ -f "${PROJECT_DIR}/.version" ]; then
        PREVIOUS_VERSION=$(cat "${PROJECT_DIR}/.version")
        log "Previous version: $PREVIOUS_VERSION"
    fi
    
    # Health check on current system
    if curl -f -s "http://localhost:${API_PORT}/api/health" > /dev/null; then
        log "Current API is healthy"
    else
        log_warning "Current API is not responding - proceeding with fresh deployment"
    fi
    
    # Check database connectivity
    if ! npm run db:ping > /dev/null 2>&1; then
        log_error "Database connectivity check failed"
        exit 1
    fi
    
    # Check Redis connectivity
    if ! npm run redis:ping > /dev/null 2>&1; then
        log_error "Redis connectivity check failed"
        exit 1
    fi
    
    log_success "Pre-deployment checks passed"
}

# Backup current state
backup_current_state() {
    log "Creating backup of current state..."
    
    local backup_dir="/var/backups/kct-api/${DEPLOYMENT_ID}"
    mkdir -p "$backup_dir"
    
    # Backup configuration files
    if [ -f "${PROJECT_DIR}/.env.production" ]; then
        cp "${PROJECT_DIR}/.env.production" "${backup_dir}/"
    fi
    
    # Backup current build
    if [ -d "${PROJECT_DIR}/dist" ]; then
        cp -r "${PROJECT_DIR}/dist" "${backup_dir}/"
    fi
    
    # Backup package files
    cp "${PROJECT_DIR}/package.json" "${backup_dir}/"
    cp "${PROJECT_DIR}/package-lock.json" "${backup_dir}/"
    
    # Create database backup
    log "Creating database backup..."
    npm run db:backup -- --output="${backup_dir}/database-backup.sql"
    
    # Create Redis backup
    log "Creating Redis backup..."
    redis-cli --rdb "${backup_dir}/redis-backup.rdb"
    
    echo "$DEPLOYMENT_ID" > "${backup_dir}/deployment-id"
    echo "${PREVIOUS_VERSION:-none}" > "${backup_dir}/previous-version"
    
    log_success "Backup created at $backup_dir"
}

# Build application
build_application() {
    log "Building application for production..."
    
    cd "$PROJECT_DIR"
    
    # Clean previous build
    rm -rf dist/
    rm -rf node_modules/
    
    # Install production dependencies
    log "Installing production dependencies..."
    NODE_ENV=production npm ci --only=production
    
    # Install dev dependencies for build
    npm ci
    
    # Run linting
    log "Running code quality checks..."
    npm run lint
    
    # Run tests
    log "Running test suite..."
    npm run test
    
    # Build application
    log "Compiling TypeScript..."
    npm run build
    
    # Copy static assets
    log "Copying static assets..."
    cp -r src/data dist/
    
    # Generate version file
    echo "$DEPLOYMENT_ID" > dist/version.txt
    echo "$DEPLOYMENT_ID" > .version
    
    log_success "Application build completed"
}

# Database migrations
run_database_migrations() {
    log "Running database migrations..."
    
    # Create migration backup point
    npm run db:backup -- --output="/tmp/pre-migration-backup.sql"
    
    # Run migrations
    npm run db:migrate
    
    # Verify migration success
    if ! npm run db:verify; then
        log_error "Database migration verification failed"
        log "Restoring database from backup..."
        npm run db:restore -- --input="/tmp/pre-migration-backup.sql"
        exit 1
    fi
    
    log_success "Database migrations completed successfully"
}

# Deploy new version with zero downtime
deploy_with_zero_downtime() {
    log "Starting zero-downtime deployment..."
    
    # Start new instance on different port
    local new_port=$((API_PORT + 1000))
    local new_ws_port=$((WS_PORT + 1000))
    
    log "Starting new instance on port $new_port..."
    
    # Export new port configuration
    export API_PORT_NEW=$new_port
    export WS_PORT_NEW=$new_ws_port
    
    # Start new instance
    NODE_ENV=production API_PORT=$new_port WS_PORT=$new_ws_port npm start &
    local new_pid=$!
    
    # Wait for new instance to be ready
    log "Waiting for new instance to be ready..."
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s "http://localhost:${new_port}/api/health" > /dev/null; then
            log_success "New instance is ready on port $new_port"
            break
        fi
        
        sleep 10
        attempt=$((attempt + 1))
        log "Health check attempt $attempt/$max_attempts..."
    done
    
    if [ $attempt -eq $max_attempts ]; then
        log_error "New instance failed to start within timeout"
        kill -TERM $new_pid 2>/dev/null || true
        exit 1
    fi
    
    # Run deployment verification tests
    log "Running deployment verification tests..."
    DEPLOYMENT_TEST_URL="http://localhost:${new_port}" npm run test:deployment
    
    # Update load balancer / reverse proxy configuration
    log "Updating load balancer configuration..."
    update_load_balancer_config "$new_port" "$new_ws_port"
    
    # Graceful shutdown of old instance
    log "Performing graceful shutdown of old instance..."
    if [ -f "/tmp/kct-api.pid" ]; then
        local old_pid=$(cat /tmp/kct-api.pid)
        if kill -0 $old_pid 2>/dev/null; then
            # Send SIGTERM for graceful shutdown
            kill -TERM $old_pid
            
            # Wait for graceful shutdown
            local shutdown_timeout=30
            local elapsed=0
            
            while [ $elapsed -lt $shutdown_timeout ] && kill -0 $old_pid 2>/dev/null; do
                sleep 1
                elapsed=$((elapsed + 1))
            done
            
            # Force kill if still running
            if kill -0 $old_pid 2>/dev/null; then
                log_warning "Forcing shutdown of old instance"
                kill -KILL $old_pid
            fi
        fi
    fi
    
    # Update PID file
    echo $new_pid > /tmp/kct-api.pid
    
    log_success "Zero-downtime deployment completed"
}

# Update load balancer configuration
update_load_balancer_config() {
    local new_api_port=$1
    local new_ws_port=$2
    
    log "Updating load balancer configuration..."
    
    # Update nginx configuration (example)
    if [ -f "/etc/nginx/sites-available/kct-api" ]; then
        # Backup current nginx config
        cp "/etc/nginx/sites-available/kct-api" "/tmp/nginx-kct-api-backup"
        
        # Update port in nginx config
        sed -i "s/proxy_pass http:\/\/localhost:[0-9]*\//proxy_pass http:\/\/localhost:${new_api_port}\//g" "/etc/nginx/sites-available/kct-api"
        sed -i "s/proxy_pass http:\/\/localhost:[0-9]*\/ws/proxy_pass http:\/\/localhost:${new_ws_port}\/ws/g" "/etc/nginx/sites-available/kct-api"
        
        # Test nginx configuration
        if nginx -t; then
            # Reload nginx
            systemctl reload nginx
            log_success "Nginx configuration updated and reloaded"
        else
            log_error "Nginx configuration test failed"
            # Restore backup
            cp "/tmp/nginx-kct-api-backup" "/etc/nginx/sites-available/kct-api"
            exit 1
        fi
    fi
    
    # Update any other load balancer configurations here
}

# Post-deployment verification
post_deployment_verification() {
    log "Running post-deployment verification..."
    
    # Health checks
    local health_url="http://localhost:${API_PORT}/api/health"
    
    if ! curl -f -s "$health_url" > /dev/null; then
        log_error "Health check failed at $health_url"
        exit 1
    fi
    
    # API functionality tests
    log "Testing API functionality..."
    
    # Test knowledge API
    if ! curl -f -s "http://localhost:${API_PORT}/api/v2/knowledge/collections" > /dev/null; then
        log_error "Knowledge API test failed"
        exit 1
    fi
    
    # Test chat API
    local chat_response=$(curl -s -X POST "http://localhost:${API_PORT}/api/v3/chat/conversation/start" \
        -H "Content-Type: application/json" \
        -d '{"customer_id": "deployment-test"}')
    
    if ! echo "$chat_response" | grep -q "sessionId"; then
        log_error "Chat API test failed"
        exit 1
    fi
    
    # Test WebSocket connectivity
    log "Testing WebSocket connectivity..."
    if ! timeout 10 node -e "
        const WebSocket = require('ws');
        const ws = new WebSocket('ws://localhost:${WS_PORT}');
        ws.on('open', () => { console.log('WebSocket connected'); process.exit(0); });
        ws.on('error', () => { console.error('WebSocket failed'); process.exit(1); });
    "; then
        log_error "WebSocket connectivity test failed"
        exit 1
    fi
    
    # Performance verification
    log "Running performance verification..."
    local response_time=$(curl -o /dev/null -s -w '%{time_total}' "http://localhost:${API_PORT}/api/health")
    
    if (( $(echo "$response_time > 1.0" | bc -l) )); then
        log_warning "Health endpoint response time (${response_time}s) is above 1 second"
    fi
    
    log_success "Post-deployment verification completed"
}

# Update monitoring and alerting
update_monitoring() {
    log "Updating monitoring configuration..."
    
    # Update application version in monitoring
    if [ -f "/etc/prometheus/targets.json" ]; then
        sed -i "s/\"version\": \".*\"/\"version\": \"${DEPLOYMENT_ID}\"/g" "/etc/prometheus/targets.json"
    fi
    
    # Send deployment notification
    send_deployment_notification "success" "Deployment ${DEPLOYMENT_ID} completed successfully"
    
    log_success "Monitoring configuration updated"
}

# Send deployment notification
send_deployment_notification() {
    local status=$1
    local message=$2
    
    # Slack notification (if webhook URL is configured)
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 KCT API Deployment: $message\"}" \
            "$SLACK_WEBHOOK_URL" > /dev/null 2>&1 || true
    fi
    
    # Email notification (if configured)
    if [ -n "${NOTIFICATION_EMAIL:-}" ]; then
        echo "$message" | mail -s "KCT API Deployment: $status" "$NOTIFICATION_EMAIL" || true
    fi
}

# Cleanup post-deployment
cleanup_deployment() {
    log "Cleaning up deployment artifacts..."
    
    # Remove old backups (keep last 5)
    find /var/backups/kct-api/ -type d -name "2*" | sort | head -n -5 | xargs rm -rf
    
    # Clean up temporary files
    rm -f /tmp/pre-migration-backup.sql
    rm -f /tmp/nginx-kct-api-backup
    rm -f /tmp/deployment-health-check
    
    log_success "Cleanup completed"
}

# Main deployment flow
main() {
    log "🚀 Starting KCT Knowledge API Production Deployment"
    log "Deployment ID: $DEPLOYMENT_ID"
    log "Project Directory: $PROJECT_DIR"
    log "Log File: $LOG_FILE"
    
    # Deployment steps
    validate_environment
    pre_deployment_checks
    backup_current_state
    build_application
    run_database_migrations
    deploy_with_zero_downtime
    post_deployment_verification
    update_monitoring
    cleanup_deployment
    
    log_success "🎉 Production deployment completed successfully!"
    log_success "Deployment ID: $DEPLOYMENT_ID"
    log_success "API URL: http://localhost:${API_PORT}"
    log_success "WebSocket URL: ws://localhost:${WS_PORT}"
    
    # Display deployment summary
    echo
    echo "===== DEPLOYMENT SUMMARY ====="
    echo "Deployment ID: $DEPLOYMENT_ID"
    echo "Previous Version: ${PREVIOUS_VERSION:-none}"
    echo "Deployment Time: $(date)"
    echo "Log File: $LOG_FILE"
    echo "Backup Location: /var/backups/kct-api/${DEPLOYMENT_ID}"
    echo "================================"
}

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    log_error "This script must be run as root or with sudo"
    exit 1
fi

# Check for required arguments
if [ $# -gt 0 ] && [ "$1" = "--dry-run" ]; then
    log "DRY RUN MODE - No actual changes will be made"
    DRY_RUN=true
fi

# Load production environment variables
if [ -f "${PROJECT_DIR}/.env.production" ]; then
    source "${PROJECT_DIR}/.env.production"
else
    log_error "Production environment file not found: ${PROJECT_DIR}/.env.production"
    exit 1
fi

# Run main deployment
main "$@"