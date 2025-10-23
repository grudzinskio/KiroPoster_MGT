# PowerShell deployment script for Windows

param(
    [switch]$SkipBackup,
    [switch]$SkipHealthCheck
)

# Configuration
$ErrorActionPreference = "Stop"
$DockerComposeFile = "docker-compose.yml"
$EnvFile = ".env"

# Colors for output
function Write-Info($message) {
    Write-Host "[INFO] $message" -ForegroundColor Green
}

function Write-Warn($message) {
    Write-Host "[WARN] $message" -ForegroundColor Yellow
}

function Write-Error($message) {
    Write-Host "[ERROR] $message" -ForegroundColor Red
}

# Check prerequisites
function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "Docker is not installed or not in PATH"
        exit 1
    }
    
    if (!(Get-Command docker-compose -ErrorAction SilentlyContinue)) {
        Write-Error "Docker Compose is not installed or not in PATH"
        exit 1
    }
    
    if (!(Test-Path $EnvFile)) {
        Write-Error "Environment file $EnvFile not found"
        Write-Info "Please copy .env.production to .env and configure it"
        exit 1
    }
    
    Write-Info "Prerequisites check passed"
}

# Backup database
function Backup-Database {
    if ($SkipBackup) {
        Write-Info "Skipping database backup"
        return
    }
    
    Write-Info "Creating database backup..."
    
    $BackupDir = "backups\$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    
    # Check if database container is running
    $dbStatus = docker-compose ps database 2>$null
    if ($dbStatus -match "Up") {
        $env = Get-Content $EnvFile | ConvertFrom-StringData
        docker-compose exec -T database mysqldump -u"$($env.DB_USER)" -p"$($env.DB_PASSWORD)" "$($env.DB_NAME)" > "$BackupDir\database_backup.sql"
        Write-Info "Database backup created: $BackupDir\database_backup.sql"
    } else {
        Write-Warn "Database container not running, skipping backup"
    }
}

# Deploy application
function Deploy-Application {
    Write-Info "Building and deploying application..."
    
    # Pull latest images
    docker-compose pull
    
    # Build application
    docker-compose build --no-cache
    
    # Stop existing containers
    docker-compose down
    
    # Start new containers
    docker-compose up -d
    
    # Wait for services to be ready
    Write-Info "Waiting for services to start..."
    Start-Sleep -Seconds 30
}

# Health check
function Test-Health {
    if ($SkipHealthCheck) {
        Write-Info "Skipping health check"
        return $true
    }
    
    Write-Info "Performing health check..."
    
    $maxAttempts = 30
    $attempt = 1
    
    while ($attempt -le $maxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Info "Health check passed"
                return $true
            }
        } catch {
            # Continue to retry
        }
        
        Write-Warn "Health check attempt $attempt/$maxAttempts failed, retrying..."
        Start-Sleep -Seconds 10
        $attempt++
    }
    
    Write-Error "Health check failed after $maxAttempts attempts"
    return $false
}

# Cleanup old images
function Remove-OldImages {
    Write-Info "Cleaning up old Docker images..."
    docker image prune -f
    docker volume prune -f
}

# Main deployment process
function Start-Deployment {
    Write-Info "Starting deployment process..."
    
    Test-Prerequisites
    
    # Create backup if in production
    $nodeEnv = (Get-Content $EnvFile | Where-Object { $_ -match "NODE_ENV=" }) -replace "NODE_ENV=", ""
    if ($nodeEnv -eq "production") {
        Backup-Database
    }
    
    Deploy-Application
    
    if (Test-Health) {
        Write-Info "✅ Deployment completed successfully!"
        Remove-OldImages
    } else {
        Write-Error "❌ Deployment failed - health check unsuccessful"
        
        $rollback = Read-Host "Do you want to rollback to previous version? (y/N)"
        if ($rollback -eq "y" -or $rollback -eq "Y") {
            Write-Info "Rolling back..."
            # Add rollback logic here if needed
        }
        exit 1
    }
}

# Run main function
try {
    Start-Deployment
} catch {
    Write-Error "Deployment failed: $($_.Exception.Message)"
    exit 1
}