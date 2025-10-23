#!/bin/bash

# Production deployment script for Poster Campaign Management System

set -e

echo "🚀 Starting production deployment..."

# Configuration
DOCKER_COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file $ENV_FILE not found"
        log_info "Please copy .env.production to .env and configure it"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# Backup database
backup_database() {
    log_info "Creating database backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Check if database container is running
    if docker-compose ps database | grep -q "Up"; then
        docker-compose exec -T database mysqldump \
            -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" \
            > "$BACKUP_DIR/database_backup.sql"
        log_info "Database backup created: $BACKUP_DIR/database_backup.sql"
    else
        log_warn "Database container not running, skipping backup"
    fi
}

# Build and deploy
deploy() {
    log_info "Building and deploying application..."
    
    # Pull latest images
    docker-compose pull
    
    # Build application
    docker-compose build --no-cache
    
    # Stop existing containers
    docker-compose down
    
    # Start new containers
    docker-compose up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to start..."
    sleep 30
    
    # Check health
    check_health
}

# Health check
check_health() {
    log_info "Performing health check..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:3001/health > /dev/null 2>&1; then
            log_info "Health check passed"
            return 0
        fi
        
        log_warn "Health check attempt $attempt/$max_attempts failed, retrying..."
        sleep 10
        ((attempt++))
    done
    
    log_error "Health check failed after $max_attempts attempts"
    return 1
}

# Cleanup old images
cleanup() {
    log_info "Cleaning up old Docker images..."
    docker image prune -f
    docker volume prune -f
}

# Main deployment process
main() {
    log_info "Starting deployment process..."
    
    check_prerequisites
    
    # Create backup if in production
    if [ "$NODE_ENV" = "production" ]; then
        backup_database
    fi
    
    deploy
    
    if check_health; then
        log_info "✅ Deployment completed successfully!"
        cleanup
    else
        log_error "❌ Deployment failed - health check unsuccessful"
        
        # Rollback option
        read -p "Do you want to rollback to previous version? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Rolling back..."
            # Add rollback logic here if needed
        fi
        exit 1
    fi
}

# Run main function
main "$@"