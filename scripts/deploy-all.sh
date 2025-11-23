#!/bin/bash

# 🚀 Fleetify Complete Deployment Script
# Deploys both frontend and backend to production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_DIR="."
BACKEND_DIR="../fleetify-backend"  # Adjust path as needed
ENVIRONMENT="production"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
        exit 1
    fi

    # Check Git
    if ! command -v git &> /dev/null; then
        error "Git is not installed"
        exit 1
    fi

    # Check Vercel CLI (optional)
    if command -v vercel &> /dev/null; then
        log "Vercel CLI found"
    else
        warning "Vercel CLI not found. Install with: npm install -g vercel"
    fi

    success "Prerequisites check completed"
}

# Check environment variables
check_environment() {
    log "Checking environment variables..."

    required_vars=(
        "VITE_SUPABASE_URL"
        "VITE_SUPABASE_ANON_KEY"
        "VITE_ENCRYPTION_SECRET"
    )

    missing_vars=()

    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -ne 0 ]; then
        error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        error "Please set these variables and try again"
        exit 1
    fi

    success "Environment variables check completed"
}

# Frontend deployment
deploy_frontend() {
    log "Starting frontend deployment..."

    cd "$FRONTEND_DIR"

    # Install dependencies
    log "Installing frontend dependencies..."
    npm ci

    # Run tests
    log "Running frontend tests..."
    npm test --if-present

    # Build application
    log "Building frontend application..."
    npm run build

    # Deploy to Vercel
    if command -v vercel &> /dev/null; then
        log "Deploying to Vercel..."
        vercel --prod
        success "Frontend deployed to Vercel"
    else
        warning "Vercel CLI not found. Please deploy manually or install Vercel CLI"
    fi

    cd - > /dev/null
}

# Backend deployment
deploy_backend() {
    log "Starting backend deployment..."

    if [ ! -d "$BACKEND_DIR" ]; then
        error "Backend directory not found: $BACKEND_DIR"
        exit 1
    fi

    cd "$BACKEND_DIR"

    # Install dependencies
    log "Installing backend dependencies..."
    npm ci

    # Run tests
    log "Running backend tests..."
    npm test --if-present

    # Build application
    log "Building backend application..."
    npm run build

    # Deploy to Railway (assuming Railway CLI is configured)
    if command -v railway &> /dev/null; then
        log "Deploying to Railway..."
        railway up
        success "Backend deployed to Railway"
    else
        warning "Railway CLI not found. Please deploy manually or install Railway CLI"
    fi

    cd - > /dev/null
}

# Health checks
health_checks() {
    log "Running health checks..."

    # Get deployed URLs (you'll need to configure these)
    FRONTEND_URL="${FRONTEND_URL:-https://fleetify.vercel.app}"
    BACKEND_URL="${BACKEND_URL:-https://fleetify-api.railway.app}"

    # Check frontend health
    if curl -f -s "$FRONTEND_URL" > /dev/null; then
        success "Frontend health check passed: $FRONTEND_URL"
    else
        error "Frontend health check failed: $FRONTEND_URL"
    fi

    # Check backend health
    if curl -f -s "$BACKEND_URL/health" > /dev/null; then
        success "Backend health check passed: $BACKEND_URL"
    else
        error "Backend health check failed: $BACKEND_URL"
    fi
}

# Deployment summary
deployment_summary() {
    log "Deployment Summary"
    echo "=================="
    echo "Environment: $ENVIRONMENT"
    echo "Frontend: $FRONTEND_URL"
    echo "Backend: $BACKEND_URL"
    echo "Database: Supabase"
    echo "Deployment completed at: $(date)"
}

# Rollback function
rollback() {
    log "Initiating rollback..."

    # Frontend rollback
    cd "$FRONTEND_DIR"
    if command -v vercel &> /dev/null; then
        log "Rolling back frontend..."
        vercel rollback
        success "Frontend rollback completed"
    fi

    # Backend rollback
    cd "$BACKEND_DIR"
    if command -v railway &> /dev/null; then
        log "Rolling back backend..."
        railway rollback
        success "Backend rollback completed"
    fi

    cd - > /dev/null
}

# Main deployment function
main() {
    log "🚀 Starting Fleetify Deployment Process"
    echo "======================================="

    # Parse command line arguments
    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            check_environment
            deploy_frontend
            deploy_backend
            health_checks
            deployment_summary
            ;;
        "frontend-only")
            check_prerequisites
            check_environment
            deploy_frontend
            ;;
        "backend-only")
            check_prerequisites
            deploy_backend
            ;;
        "health-check")
            health_checks
            ;;
        "rollback")
            rollback
            ;;
        "help"|"-h"|"--help")
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  deploy          Deploy both frontend and backend (default)"
            echo "  frontend-only   Deploy only frontend"
            echo "  backend-only    Deploy only backend"
            echo "  health-check    Run health checks on deployed services"
            echo "  rollback        Rollback to previous deployment"
            echo "  help            Show this help message"
            exit 0
            ;;
        *)
            error "Unknown command: $1"
            echo "Use '$0 help' for available commands"
            exit 1
            ;;
    esac

    success "🎉 Deployment process completed successfully!"
}

# Trap to handle script interruption
trap 'error "Deployment interrupted"; exit 1' INT

# Run main function
main "$@"