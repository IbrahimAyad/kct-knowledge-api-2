#!/bin/bash

# Production Rollback Script - Phase 4
# KCT Knowledge API Production Rollback with Zero Downtime

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ROLLBACK_ID="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="/var/log/kct-rollback-${ROLLBACK_ID}.log"

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
    log "Cleaning up rollback process..."
    
    if [ $exit_code -ne 0 ]; then
        log_error "Rollback failed with exit code $exit_code"
        send_rollback_notification "failed" "Rollback ${ROLLBACK_ID} failed - manual intervention required"
    fi
    
    # Clean up temporary files
    rm -f /tmp/rollback-health-check
    rm -f /tmp/rollback-config-temp
    
    exit $exit_code
}

trap cleanup EXIT

# Display usage information
usage() {
    echo "Usage: $0 [OPTIONS] [TARGET_VERSION]"
    echo
    echo "Options:"
    echo "  --list-versions    List available versions to rollback to"
    echo "  --dry-run         Show what would be done without making changes"
    echo "  --force           Force rollback even if health checks fail"
    echo "  --help            Show this help message"
    echo
    echo "Examples:"
    echo "  $0 --list-versions"
    echo "  $0 20241201-143022"
    echo "  $0 --dry-run 20241201-143022"
    echo
}

# List available versions
list_available_versions() {
    log "Available versions for rollback:"
    echo
    
    if [ ! -d "/var/backups/kct-api" ]; then
        log_error "No backups directory found at /var/backups/kct-api"
        return 1
    fi
    
    local versions=($(ls -1 /var/backups/kct-api/ | sort -r | head -10))
    
    if [ ${#versions[@]} -eq 0 ]; then
        log_error "No backup versions found"
        return 1
    fi
    
    echo "Recent backup versions (most recent first):"
    echo "=========================================="
    
    for version in "${versions[@]}"; do
        local backup_dir="/var/backups/kct-api/$version"
        if [ -f "$backup_dir/deployment-id" ]; then
            local deployment_id=$(cat "$backup_dir/deployment-id")
            local previous_version="unknown"
            
            if [ -f "$backup_dir/previous-version" ]; then
                previous_version=$(cat "$backup_dir/previous-version")
            fi
            
            local backup_time=$(stat -c %y "$backup_dir" | cut -d' ' -f1-2)
            
            echo "Version: $version"
            echo "  Deployment ID: $deployment_id"
            echo "  Previous Version: $previous_version"
            echo "  Backup Time: $backup_time"
            echo "  Backup Size: $(du -sh "$backup_dir" | cut -f1)"
            echo
        fi
    done
}

# Validate rollback target
validate_rollback_target() {
    local target_version=$1
    
    log "Validating rollback target: $target_version"
    
    local backup_dir="/var/backups/kct-api/$target_version"
    
    if [ ! -d "$backup_dir" ]; then
        log_error "Backup directory not found: $backup_dir"
        return 1
    fi
    
    # Validate backup integrity
    local required_files=(
        "package.json"
        "dist"
        "database-backup.sql"
        "deployment-id"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -e "$backup_dir/$file" ]; then
            log_error "Required backup file missing: $file"
            return 1
        fi
    done
    
    # Check backup age (warn if older than 30 days)
    local backup_age=$(( ($(date +%s) - $(stat -c %Y "$backup_dir")) / 86400 ))
    if [ $backup_age -gt 30 ]; then
        log_warning "Backup is $backup_age days old - this may cause compatibility issues"
        
        if [ "${FORCE_ROLLBACK:-false}" != "true" ]; then
            read -p "Continue with rollback? (y/N): " -r
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log "Rollback cancelled by user"
                exit 1
            fi
        fi
    fi
    
    log_success "Rollback target validation passed"
}

# Pre-rollback checks
pre_rollback_checks() {
    log "Running pre-rollback checks..."
    
    # Check current system health
    local current_health=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/api/health" || echo "000")
    
    if [ "$current_health" = "200" ]; then
        log "Current system is healthy (HTTP 200)"
    else
        log_warning "Current system is unhealthy (HTTP $current_health)"
        
        if [ "${FORCE_ROLLBACK:-false}" != "true" ]; then
            log "Use --force flag to proceed with rollback anyway"
            exit 1
        fi
    fi
    
    # Check database connectivity
    if ! npm run db:ping > /dev/null 2>&1; then
        log_error "Database connectivity check failed"
        
        if [ "${FORCE_ROLLBACK:-false}" != "true" ]; then
            exit 1
        fi
    fi
    
    # Check Redis connectivity
    if ! npm run redis:ping > /dev/null 2>&1; then
        log_error "Redis connectivity check failed"
        
        if [ "${FORCE_ROLLBACK:-false}" != "true" ]; then
            exit 1
        fi
    fi
    
    # Check system resources
    local available_memory=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    if [ "$available_memory" -lt 1024 ]; then
        log_warning "Available memory (${available_memory}MB) is below 1GB - rollback may be slow"
    fi
    
    log_success "Pre-rollback checks completed"
}

# Create rollback backup
create_rollback_backup() {
    log "Creating backup of current state before rollback..."
    
    local rollback_backup_dir="/var/backups/kct-api/rollback-${ROLLBACK_ID}"
    mkdir -p "$rollback_backup_dir"
    
    # Backup current configuration
    if [ -f "${PROJECT_DIR}/.env.production" ]; then
        cp "${PROJECT_DIR}/.env.production" "${rollback_backup_dir}/"
    fi
    
    # Backup current build
    if [ -d "${PROJECT_DIR}/dist" ]; then
        cp -r "${PROJECT_DIR}/dist" "${rollback_backup_dir}/"
    fi
    
    # Backup current version info
    if [ -f "${PROJECT_DIR}/.version" ]; then
        cp "${PROJECT_DIR}/.version" "${rollback_backup_dir}/"
    fi
    
    # Create database backup
    log "Creating database backup before rollback..."
    npm run db:backup -- --output="${rollback_backup_dir}/pre-rollback-database.sql"
    
    # Create Redis backup
    log "Creating Redis backup before rollback..."
    redis-cli --rdb "${rollback_backup_dir}/pre-rollback-redis.rdb" || true
    
    echo "$ROLLBACK_ID" > "${rollback_backup_dir}/rollback-id"
    echo "$(date)" > "${rollback_backup_dir}/rollback-timestamp"
    
    log_success "Rollback backup created at $rollback_backup_dir"
}

# Restore application files
restore_application_files() {
    local target_version=$1
    local backup_dir="/var/backups/kct-api/$target_version"
    
    log "Restoring application files from $target_version..."
    
    cd "$PROJECT_DIR"
    
    # Stop current application
    if [ -f "/tmp/kct-api.pid" ]; then
        local current_pid=$(cat /tmp/kct-api.pid)
        if kill -0 $current_pid 2>/dev/null; then
            log "Stopping current application (PID: $current_pid)..."
            kill -TERM $current_pid
            
            # Wait for graceful shutdown
            local shutdown_timeout=30
            local elapsed=0
            
            while [ $elapsed -lt $shutdown_timeout ] && kill -0 $current_pid 2>/dev/null; do
                sleep 1
                elapsed=$((elapsed + 1))
            done
            
            # Force kill if still running
            if kill -0 $current_pid 2>/dev/null; then
                log_warning "Forcing shutdown of current application"
                kill -KILL $current_pid
            fi
        fi
    fi
    
    # Clean current build
    rm -rf dist/
    rm -rf node_modules/
    
    # Restore files from backup
    log "Restoring build files..."
    cp -r "${backup_dir}/dist" ./
    
    log "Restoring package files..."
    cp "${backup_dir}/package.json" ./
    
    if [ -f "${backup_dir}/package-lock.json" ]; then
        cp "${backup_dir}/package-lock.json" ./
    fi
    
    # Install dependencies
    log "Installing dependencies..."
    NODE_ENV=production npm ci --only=production
    
    # Restore environment configuration if available
    if [ -f "${backup_dir}/.env.production" ]; then
        log "Restoring environment configuration..."
        cp "${backup_dir}/.env.production" ./
    fi
    
    # Update version file
    if [ -f "${backup_dir}/deployment-id" ]; then
        cp "${backup_dir}/deployment-id" .version
    fi
    
    log_success "Application files restored successfully"
}

# Restore database
restore_database() {
    local target_version=$1
    local backup_dir="/var/backups/kct-api/$target_version"
    
    log "Restoring database from $target_version..."
    
    local db_backup_file="${backup_dir}/database-backup.sql"
    
    if [ ! -f "$db_backup_file" ]; then
        log_error "Database backup file not found: $db_backup_file"
        return 1
    fi
    
    # Create a safety backup of current database
    log "Creating safety backup of current database..."
    npm run db:backup -- --output="/tmp/rollback-safety-backup-${ROLLBACK_ID}.sql"
    
    # Restore database
    log "Restoring database from backup..."
    npm run db:restore -- --input="$db_backup_file"
    
    # Verify database restoration
    if ! npm run db:verify; then
        log_error "Database restoration verification failed"
        log "Restoring current database from safety backup..."
        npm run db:restore -- --input="/tmp/rollback-safety-backup-${ROLLBACK_ID}.sql"
        return 1
    fi
    
    log_success "Database restored successfully"
}

# Restore Redis data
restore_redis() {
    local target_version=$1
    local backup_dir="/var/backups/kct-api/$target_version"
    
    log "Restoring Redis data from $target_version..."
    
    local redis_backup_file="${backup_dir}/redis-backup.rdb"
    
    if [ ! -f "$redis_backup_file" ]; then
        log_warning "Redis backup file not found - skipping Redis restore"
        return 0
    fi
    
    # Stop Redis service
    log "Stopping Redis service..."
    systemctl stop redis || service redis-server stop || true
    
    # Backup current Redis data
    if [ -f "/var/lib/redis/dump.rdb" ]; then
        cp "/var/lib/redis/dump.rdb" "/tmp/rollback-redis-safety-backup-${ROLLBACK_ID}.rdb"
    fi
    
    # Restore Redis data
    cp "$redis_backup_file" "/var/lib/redis/dump.rdb"
    chown redis:redis "/var/lib/redis/dump.rdb" || true
    
    # Start Redis service
    log "Starting Redis service..."
    systemctl start redis || service redis-server start || true
    
    # Wait for Redis to be ready
    sleep 5
    
    # Verify Redis connectivity
    if redis-cli ping | grep -q "PONG"; then
        log_success "Redis restored and running successfully"
    else
        log_error "Redis restoration failed"
        return 1
    fi
}

# Start restored application
start_restored_application() {
    log "Starting restored application..."
    
    cd "$PROJECT_DIR"
    
    # Load production environment
    if [ -f ".env.production" ]; then
        source ".env.production"
    fi
    
    # Start application
    NODE_ENV=production npm start &
    local new_pid=$!
    
    # Save PID
    echo $new_pid > /tmp/kct-api.pid
    
    # Wait for application to be ready
    log "Waiting for application to be ready..."
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s "http://localhost:${API_PORT}/api/health" > /dev/null; then
            log_success "Restored application is ready and healthy"
            break
        fi
        
        sleep 10
        attempt=$((attempt + 1))
        log "Health check attempt $attempt/$max_attempts..."
    done
    
    if [ $attempt -eq $max_attempts ]; then
        log_error "Restored application failed to start within timeout"
        kill -TERM $new_pid 2>/dev/null || true
        return 1
    fi
    
    log_success "Application started successfully (PID: $new_pid)"
}

# Post-rollback verification
post_rollback_verification() {
    log "Running post-rollback verification..."
    
    # Health checks
    local health_url="http://localhost:${API_PORT}/api/health"
    local health_response=$(curl -s "$health_url" || echo "")
    
    if [ -z "$health_response" ]; then
        log_error "Health check failed - no response from $health_url"
        return 1
    fi
    
    # API functionality tests
    log "Testing API functionality..."
    
    # Test knowledge API
    if ! curl -f -s "http://localhost:${API_PORT}/api/v2/knowledge/collections" > /dev/null; then
        log_error "Knowledge API test failed"
        return 1
    fi
    
    # Test chat API
    local chat_response=$(curl -s -X POST "http://localhost:${API_PORT}/api/v3/chat/conversation/start" \
        -H "Content-Type: application/json" \
        -d '{"customer_id": "rollback-test"}' || echo "")
    
    if ! echo "$chat_response" | grep -q "sessionId"; then
        log_error "Chat API test failed"
        return 1
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
        return 1
    fi
    
    log_success "Post-rollback verification completed successfully"
}

# Update monitoring
update_monitoring_after_rollback() {
    local target_version=$1
    
    log "Updating monitoring after rollback..."
    
    # Update application version in monitoring
    if [ -f "/etc/prometheus/targets.json" ]; then
        sed -i "s/\"version\": \".*\"/\"version\": \"${target_version}\"/g" "/etc/prometheus/targets.json"
    fi
    
    # Send rollback notification
    send_rollback_notification "success" "Rollback to version ${target_version} completed successfully"
    
    log_success "Monitoring configuration updated"
}

# Send rollback notification
send_rollback_notification() {
    local status=$1
    local message=$2
    
    # Slack notification (if webhook URL is configured)
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        local color="good"
        if [ "$status" = "failed" ]; then
            color="danger"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🔄 KCT API Rollback: $message\", \"color\":\"$color\"}" \
            "$SLACK_WEBHOOK_URL" > /dev/null 2>&1 || true
    fi
    
    # Email notification (if configured)
    if [ -n "${NOTIFICATION_EMAIL:-}" ]; then
        echo "$message" | mail -s "KCT API Rollback: $status" "$NOTIFICATION_EMAIL" || true
    fi
}

# Cleanup post-rollback
cleanup_rollback() {
    log "Cleaning up rollback artifacts..."
    
    # Remove temporary safety backups older than 24 hours
    find /tmp -name "rollback-safety-backup-*.sql" -mtime +1 -delete 2>/dev/null || true
    find /tmp -name "rollback-redis-safety-backup-*.rdb" -mtime +1 -delete 2>/dev/null || true
    
    log_success "Rollback cleanup completed"
}

# Main rollback function
perform_rollback() {
    local target_version=$1
    
    log "🔄 Starting KCT Knowledge API Production Rollback"
    log "Rollback ID: $ROLLBACK_ID"
    log "Target Version: $target_version"
    log "Log File: $LOG_FILE"
    
    # Rollback steps
    validate_rollback_target "$target_version"
    pre_rollback_checks
    create_rollback_backup
    restore_application_files "$target_version"
    restore_database "$target_version"
    restore_redis "$target_version"
    start_restored_application
    post_rollback_verification
    update_monitoring_after_rollback "$target_version"
    cleanup_rollback
    
    log_success "🎉 Production rollback completed successfully!"
    log_success "Rollback ID: $ROLLBACK_ID"
    log_success "Restored Version: $target_version"
    log_success "API URL: http://localhost:${API_PORT}"
    log_success "WebSocket URL: ws://localhost:${WS_PORT}"
    
    # Display rollback summary
    echo
    echo "===== ROLLBACK SUMMARY ====="
    echo "Rollback ID: $ROLLBACK_ID"
    echo "Target Version: $target_version"
    echo "Rollback Time: $(date)"
    echo "Log File: $LOG_FILE"
    echo "Rollback Backup: /var/backups/kct-api/rollback-${ROLLBACK_ID}"
    echo "============================="
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --list-versions)
            list_available_versions
            exit 0
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE_ROLLBACK=true
            shift
            ;;
        --help)
            usage
            exit 0
            ;;
        -*)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
        *)
            TARGET_VERSION=$1
            shift
            ;;
    esac
done

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    log_error "This script must be run as root or with sudo"
    exit 1
fi

# Load production environment variables
if [ -f "${PROJECT_DIR}/.env.production" ]; then
    source "${PROJECT_DIR}/.env.production"
else
    log_error "Production environment file not found: ${PROJECT_DIR}/.env.production"
    exit 1
fi

# Check if target version is provided
if [ -z "${TARGET_VERSION:-}" ]; then
    log_error "Target version not specified"
    echo
    usage
    echo
    list_available_versions
    exit 1
fi

# Dry run mode
if [ "${DRY_RUN:-false}" = "true" ]; then
    log "DRY RUN MODE - Showing what would be done:"
    log "1. Validate rollback target: $TARGET_VERSION"
    log "2. Run pre-rollback checks"
    log "3. Create backup of current state"
    log "4. Restore application files from backup"
    log "5. Restore database from backup"
    log "6. Restore Redis data from backup"
    log "7. Start restored application"
    log "8. Run post-rollback verification"
    log "9. Update monitoring configuration"
    log "10. Clean up rollback artifacts"
    exit 0
fi

# Perform the rollback
perform_rollback "$TARGET_VERSION"