#!/bin/bash

# Production setup script for Poster Campaign Management System

set -e

echo "🔧 Setting up production environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Generate secure random string
generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Setup directories
setup_directories() {
    log_step "Setting up directory structure..."
    
    # Create necessary directories
    sudo mkdir -p /var/lib/poster-campaign/uploads
    sudo mkdir -p /var/log/poster-campaign
    sudo mkdir -p /etc/poster-campaign
    
    # Set permissions
    sudo chown -R $USER:$USER /var/lib/poster-campaign
    sudo chown -R $USER:$USER /var/log/poster-campaign
    sudo chmod -R 755 /var/lib/poster-campaign
    sudo chmod -R 755 /var/log/poster-campaign
    
    log_info "Directories created and configured"
}

# Setup SSL certificates
setup_ssl() {
    log_step "Setting up SSL certificates..."
    
    mkdir -p nginx/ssl
    
    if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/private.key" ]; then
        log_warn "SSL certificates not found"
        
        read -p "Do you want to generate self-signed certificates for testing? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # Generate self-signed certificate
            openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                -keyout nginx/ssl/private.key \
                -out nginx/ssl/cert.pem \
                -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
            
            log_info "Self-signed certificates generated"
            log_warn "Remember to replace with proper certificates for production!"
        else
            log_info "Please place your SSL certificates in nginx/ssl/"
            log_info "  - Certificate: nginx/ssl/cert.pem"
            log_info "  - Private key: nginx/ssl/private.key"
        fi
    else
        log_info "SSL certificates found"
    fi
}

# Setup environment file
setup_environment() {
    log_step "Setting up environment configuration..."
    
    if [ ! -f ".env" ]; then
        log_info "Creating production environment file..."
        
        # Copy template
        cp .env.production .env
        
        # Generate secrets
        JWT_ACCESS_SECRET=$(generate_secret)
        JWT_REFRESH_SECRET=$(generate_secret)
        DB_PASSWORD=$(generate_secret)
        DB_ROOT_PASSWORD=$(generate_secret)
        
        # Update environment file
        sed -i "s/your_very_secure_jwt_access_secret_minimum_32_characters/$JWT_ACCESS_SECRET/g" .env
        sed -i "s/your_very_secure_jwt_refresh_secret_minimum_32_characters/$JWT_REFRESH_SECRET/g" .env
        sed -i "s/your_secure_production_password/$DB_PASSWORD/g" .env
        
        # Add additional variables
        echo "" >> .env
        echo "# Generated secrets" >> .env
        echo "DB_ROOT_PASSWORD=$DB_ROOT_PASSWORD" >> .env
        
        log_info "Environment file created with generated secrets"
        log_warn "Please review and update .env file with your specific configuration"
    else
        log_info "Environment file already exists"
    fi
}

# Setup database initialization
setup_database() {
    log_step "Setting up database initialization..."
    
    mkdir -p database/init
    
    cat > database/init/01-init.sql << EOF
-- Production database initialization
CREATE DATABASE IF NOT EXISTS poster_campaign_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create application user
CREATE USER IF NOT EXISTS 'poster_campaign_user'@'%' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON poster_campaign_production.* TO 'poster_campaign_user'@'%';

-- Security settings
DELETE FROM mysql.user WHERE User='';
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';

FLUSH PRIVILEGES;
EOF
    
    log_info "Database initialization script created"
}

# Setup systemd service (optional)
setup_systemd() {
    log_step "Setting up systemd service..."
    
    read -p "Do you want to create a systemd service for auto-start? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo tee /etc/systemd/system/poster-campaign.service > /dev/null << EOF
[Unit]
Description=Poster Campaign Management System
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$(pwd)
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF
        
        sudo systemctl daemon-reload
        sudo systemctl enable poster-campaign.service
        
        log_info "Systemd service created and enabled"
    fi
}

# Setup log rotation
setup_logrotate() {
    log_step "Setting up log rotation..."
    
    sudo tee /etc/logrotate.d/poster-campaign > /dev/null << EOF
/var/log/poster-campaign/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        docker-compose exec app kill -USR1 1 2>/dev/null || true
    endscript
}
EOF
    
    log_info "Log rotation configured"
}

# Setup firewall rules
setup_firewall() {
    log_step "Setting up firewall rules..."
    
    if command -v ufw &> /dev/null; then
        read -p "Do you want to configure UFW firewall rules? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo ufw allow 22/tcp    # SSH
            sudo ufw allow 80/tcp    # HTTP
            sudo ufw allow 443/tcp   # HTTPS
            sudo ufw --force enable
            
            log_info "Firewall rules configured"
        fi
    else
        log_warn "UFW not found, please configure firewall manually"
    fi
}

# Main setup process
main() {
    log_info "Starting production setup..."
    
    # Check if running as root
    if [ "$EUID" -eq 0 ]; then
        log_error "Please do not run this script as root"
        exit 1
    fi
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    setup_directories
    setup_ssl
    setup_environment
    setup_database
    setup_systemd
    setup_logrotate
    setup_firewall
    
    log_info "✅ Production setup completed!"
    echo
    log_info "Next steps:"
    echo "  1. Review and update the .env file"
    echo "  2. Place your SSL certificates in nginx/ssl/"
    echo "  3. Run './scripts/deploy.sh' to deploy the application"
    echo "  4. Configure your domain DNS to point to this server"
}

# Run main function
main "$@"