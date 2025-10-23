# Production Deployment Guide

This guide covers the production deployment of the Poster Campaign Management System.

## Prerequisites

- Ubuntu 20.04+ or similar Linux distribution
- Docker and Docker Compose installed
- Domain name configured (for SSL certificates)
- At least 2GB RAM and 20GB disk space

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd poster-campaign-management
   ```

2. **Run the setup script**
   ```bash
   chmod +x scripts/setup-production.sh
   ./scripts/setup-production.sh
   ```

3. **Configure environment**
   ```bash
   # Edit the generated .env file
   nano .env
   ```

4. **Deploy the application**
   ```bash
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh
   ```

## Manual Setup

### 1. Environment Configuration

Copy the production environment template:
```bash
cp backend/.env.production .env
```

Update the following variables in `.env`:

#### Required Variables
- `FRONTEND_URL`: Your domain URL (e.g., https://your-domain.com)
- `DB_PASSWORD`: Secure database password
- `JWT_ACCESS_SECRET`: 32+ character secret for JWT tokens
- `JWT_REFRESH_SECRET`: 32+ character secret for refresh tokens

#### Optional Variables
- `LOG_LEVEL`: Set to `warn` or `error` for production
- `SMTP_*`: Email configuration for notifications
- `REDIS_URL`: Redis connection string for caching

### 2. SSL Certificates

Place your SSL certificates in the `nginx/ssl/` directory:
- `nginx/ssl/cert.pem`: SSL certificate
- `nginx/ssl/private.key`: Private key

For Let's Encrypt certificates:
```bash
# Install certbot
sudo apt install certbot

# Generate certificates
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/private.key
```

### 3. Directory Structure

Create necessary directories:
```bash
sudo mkdir -p /var/lib/poster-campaign/uploads
sudo mkdir -p /var/log/poster-campaign
sudo chown -R $USER:$USER /var/lib/poster-campaign
sudo chown -R $USER:$USER /var/log/poster-campaign
```

### 4. Database Setup

The database will be automatically initialized on first run. To manually initialize:

```bash
# Start only the database
docker-compose up -d database

# Wait for database to be ready
sleep 30

# Run migrations
docker-compose exec app npm run db:migrate

# Seed initial data
docker-compose exec app npm run db:seed
```

### 5. Deploy Application

```bash
# Build and start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app
```

## Configuration Details

### Docker Compose Services

- **app**: Main application container (Node.js + React)
- **database**: MariaDB database
- **redis**: Redis cache
- **nginx**: Reverse proxy and static file server

### Nginx Configuration

The Nginx configuration includes:
- SSL/TLS termination
- Security headers
- Rate limiting
- Static file serving
- Reverse proxy to Node.js app

### Security Features

- HTTPS enforcement
- Security headers (HSTS, CSP, etc.)
- Rate limiting on API endpoints
- File upload restrictions
- Input sanitization
- SQL injection prevention

### Monitoring

Health check endpoint: `https://your-domain.com/health`

Metrics endpoint (internal): `http://localhost:9090/metrics`

### Logging

Logs are stored in:
- Application logs: `/var/log/poster-campaign/app.log`
- Nginx logs: Docker container logs
- Database logs: Docker container logs

View logs:
```bash
# Application logs
docker-compose logs -f app

# All services
docker-compose logs -f

# Specific service
docker-compose logs -f nginx
```

## Maintenance

### Backup Database

```bash
# Create backup
docker-compose exec database mysqldump -u poster_campaign_user -p poster_campaign_production > backup.sql

# Restore backup
docker-compose exec -T database mysql -u poster_campaign_user -p poster_campaign_production < backup.sql
```

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and deploy
./scripts/deploy.sh
```

### Scale Services

```bash
# Scale application containers
docker-compose up -d --scale app=3
```

### SSL Certificate Renewal

For Let's Encrypt certificates:
```bash
# Renew certificates
sudo certbot renew

# Copy new certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/private.key

# Reload nginx
docker-compose exec nginx nginx -s reload
```

## Troubleshooting

### Common Issues

1. **Port conflicts**
   ```bash
   # Check what's using port 80/443
   sudo netstat -tulpn | grep :80
   sudo netstat -tulpn | grep :443
   ```

2. **Database connection issues**
   ```bash
   # Check database logs
   docker-compose logs database
   
   # Test connection
   docker-compose exec app npm run db:migrate
   ```

3. **File upload issues**
   ```bash
   # Check upload directory permissions
   ls -la /var/lib/poster-campaign/uploads
   
   # Fix permissions
   sudo chown -R $USER:$USER /var/lib/poster-campaign
   ```

4. **SSL certificate issues**
   ```bash
   # Test SSL configuration
   openssl s_client -connect your-domain.com:443
   
   # Check certificate expiry
   openssl x509 -in nginx/ssl/cert.pem -text -noout | grep "Not After"
   ```

### Performance Tuning

1. **Database optimization**
   - Increase `innodb_buffer_pool_size` for large datasets
   - Configure connection pooling in `knexfile.ts`

2. **Application optimization**
   - Increase Node.js memory limit: `NODE_OPTIONS="--max-old-space-size=2048"`
   - Enable Redis caching for frequently accessed data

3. **Nginx optimization**
   - Enable gzip compression
   - Configure proper cache headers
   - Increase worker connections

### Monitoring and Alerts

Set up monitoring for:
- Application health (`/health` endpoint)
- Database connectivity
- Disk space usage
- Memory usage
- SSL certificate expiry

Example monitoring script:
```bash
#!/bin/bash
# Simple health check script
curl -f https://your-domain.com/health || echo "Health check failed" | mail -s "Alert" admin@your-domain.com
```

## Security Considerations

1. **Regular Updates**
   - Keep Docker images updated
   - Update application dependencies
   - Apply OS security patches

2. **Access Control**
   - Use strong passwords
   - Implement proper user roles
   - Regular security audits

3. **Network Security**
   - Configure firewall rules
   - Use VPN for administrative access
   - Monitor access logs

4. **Data Protection**
   - Regular database backups
   - Encrypt sensitive data
   - Secure file storage

## Support

For issues and questions:
1. Check the application logs
2. Review this deployment guide
3. Check the project documentation
4. Contact the development team