#!/bin/bash

# 🔍 Fleetify Deployment Verification Script
# Verifies that all services are running correctly after deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration - update these URLs with your actual deployed URLs
FRONTEND_URL="${FRONTEND_URL:-https://your-frontend-domain.vercel.app}"
BACKEND_URL="${BACKEND_URL:-https://your-backend-domain.railway.app}"
SUPABASE_URL="${SUPABASE_URL:-https://your-project.supabase.co}"

# Timeout settings
TIMEOUT=30
RETRY_COUNT=3
RETRY_DELAY=5

# Results tracking
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED_CHECKS++))
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED_CHECKS++))
}

header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

# Helper function to perform HTTP request with retries
check_http() {
    local url="$1"
    local description="$2"
    local expected_status="${3:-200}"

    ((TOTAL_CHECKS++))

    log "Checking $description at $url"

    for i in $(seq 1 $RETRY_COUNT); do
        if curl -f -s -w "%{http_code}" --max-time $TIMEOUT "$url" | grep -q "$expected_status"; then
            success "$description - HTTP $expected_status"
            return 0
        else
            if [ $i -lt $RETRY_COUNT ]; then
                warning "$description failed, retrying in $RETRY_DELAY seconds... (Attempt $i/$RETRY_COUNT)"
                sleep $RETRY_DELAY
            fi
        fi
    done

    error "$description - Failed after $RETRY_COUNT attempts"
    return 1
}

# Check frontend health
check_frontend() {
    header "Frontend Verification"

    # Check main page
    check_http "$FRONTEND_URL" "Frontend homepage"

    # Check if frontend is serving correctly (not error page)
    if curl -s "$FRONTEND_URL" | grep -q "<html"; then
        success "Frontend serving HTML content"
        ((PASSED_CHECKS++))
    else
        error "Frontend not serving HTML content"
        ((FAILED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))

    # Check static assets
    check_http "$FRONTEND_URL/manifest.json" "Frontend manifest"

    log "Frontend verification completed"
}

# Check backend health
check_backend() {
    header "Backend Verification"

    # Check health endpoint
    check_http "$BACKEND_URL/health" "Backend health endpoint"

    # Check API documentation
    check_http "$BACKEND_URL/api-docs" "Backend API documentation" "200"

    # Check API response format
    if curl -s "$BACKEND_URL/health" | grep -q '"status":"healthy"'; then
        success "Backend health response format correct"
        ((PASSED_CHECKS++))
    else
        error "Backend health response format incorrect"
        ((FAILED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))

    log "Backend verification completed"
}

# Check database connectivity
check_database() {
    header "Database Verification"

    # Test Supabase connection
    check_http "$SUPABASE_URL/rest/v1/" "Supabase REST API"

    # Check if Supabase is responding correctly
    if curl -s -H "apikey: $SUPABASE_ANON_KEY" "$SUPABASE_URL/rest/v1/" | grep -q "version"; then
        success "Supabase API responding correctly"
        ((PASSED_CHECKS++))
    else
        error "Supabase API not responding correctly"
        ((FAILED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))

    log "Database verification completed"
}

# Check CORS configuration
check_cors() {
    header "CORS Configuration Verification"

    # Test CORS preflight request
    if curl -s -X OPTIONS -H "Origin: $FRONTEND_URL" -H "Access-Control-Request-Method: GET" \
           -H "Access-Control-Request-Headers: Content-Type" -w "%{http_code}" \
           "$BACKEND_URL/api/test" | grep -q "200\|204"; then
        success "CORS preflight request working"
        ((PASSED_CHECKS++))
    else
        error "CORS preflight request failing"
        ((FAILED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))

    # Test CORS headers
    cors_header=$(curl -s -X OPTIONS -H "Origin: $FRONTEND_URL" "$BACKEND_URL/api/test" | \
                  grep -i "access-control-allow-origin" || echo "")
    if [ -n "$cors_header" ]; then
        success "CORS headers present in response"
        ((PASSED_CHECKS++))
    else
        error "CORS headers missing in response"
        ((FAILED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))

    log "CORS verification completed"
}

# Check SSL certificates
check_ssl() {
    header "SSL Certificate Verification"

    for url in "$FRONTEND_URL" "$BACKEND_URL"; do
        domain=$(echo "$url" | sed 's|https://||' | sed 's|/.*||')

        if echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | \
           openssl x509 -noout -dates 2>/dev/null | grep -q "notAfter"; then
            expiry=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | \
                     openssl x509 -noout -dates 2>/dev/null | grep "notAfter" | cut -d= -f2)
            success "SSL certificate valid for $domain (expires: $expiry)"
            ((PASSED_CHECKS++))
        else
            error "SSL certificate issue for $domain"
            ((FAILED_CHECKS++))
        fi
        ((TOTAL_CHECKS++))
    done

    log "SSL verification completed"
}

# Performance checks
check_performance() {
    header "Performance Verification"

    # Frontend load time
    frontend_load_time=$(curl -s -o /dev/null -w "%{time_total}" "$FRONTEND_URL")
    if (( $(echo "$frontend_load_time < 3.0" | bc -l) )); then
        success "Frontend load time: ${frontend_load_time}s (< 3s)"
        ((PASSED_CHECKS++))
    else
        warning "Frontend load time: ${frontend_load_time}s (> 3s)"
        ((FAILED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))

    # Backend response time
    backend_response_time=$(curl -s -o /dev/null -w "%{time_total}" "$BACKEND_URL/health")
    if (( $(echo "$backend_response_time < 1.0" | bc -l) )); then
        success "Backend response time: ${backend_response_time}s (< 1s)"
        ((PASSED_CHECKS++))
    else
        warning "Backend response time: ${backend_response_time}s (> 1s)"
        ((FAILED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))

    log "Performance verification completed"
}

# Security checks
check_security() {
    header "Security Verification"

    # Check security headers on frontend
    security_headers=$(curl -s -I "$FRONTEND_URL" | grep -E "(X-Frame-Options|X-Content-Type-Options|X-XSS-Protection)")
    if [ -n "$security_headers" ]; then
        success "Security headers present on frontend"
        ((PASSED_CHECKS++))
    else
        warning "Some security headers missing on frontend"
        ((FAILED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))

    # Check for HTTPS enforcement
    if curl -s -I "$FRONTEND_URL" | grep -i "Location:" | grep -q "https://"; then
        success "HTTPS redirection working"
        ((PASSED_CHECKS++))
    else
        warning "HTTPS redirection may not be configured"
        ((FAILED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))

    log "Security verification completed"
}

# Generate report
generate_report() {
    header "Deployment Verification Report"
    echo "=================================="
    echo "Date: $(date)"
    echo "Frontend URL: $FRONTEND_URL"
    echo "Backend URL: $BACKEND_URL"
    echo ""
    echo "Results Summary:"
    echo "- Total Checks: $TOTAL_CHECKS"
    echo "- Passed: $PASSED_CHECKS"
    echo "- Failed: $FAILED_CHECKS"
    echo ""

    # Calculate success rate
    if [ $TOTAL_CHECKS -gt 0 ]; then
        success_rate=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
        echo "Success Rate: ${success_rate}%"
        echo ""

        if [ $success_rate -ge 90 ]; then
            success "🎉 Deployment verification PASSED! System is healthy."
        elif [ $success_rate -ge 70 ]; then
            warning "⚠️  Deployment verification WARNING! Some issues detected."
        else
            error "❌ Deployment verification FAILED! Major issues detected."
        fi
    fi

    echo ""
    echo "For detailed troubleshooting, check the logs above."
}

# Main function
main() {
    log "🔍 Starting Fleetify Deployment Verification"
    echo "============================================="

    # Check if required environment variables are set
    if [ -z "$SUPABASE_ANON_KEY" ]; then
        error "SUPABASE_ANON_KEY environment variable is required"
        exit 1
    fi

    # Run all verification checks
    check_frontend
    check_backend
    check_database
    check_cors
    check_ssl
    check_performance
    check_security

    # Generate final report
    generate_report

    # Exit with appropriate code
    if [ $FAILED_CHECKS -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Parse command line arguments
case "${1:-all}" in
    "all")
        main
        ;;
    "frontend")
        check_frontend
        generate_report
        ;;
    "backend")
        check_backend
        generate_report
        ;;
    "database")
        check_database
        generate_report
        ;;
    "cors")
        check_cors
        generate_report
        ;;
    "ssl")
        check_ssl
        generate_report
        ;;
    "performance")
        check_performance
        generate_report
        ;;
    "security")
        check_security
        generate_report
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [check-type]"
        echo ""
        echo "Check types:"
        echo "  all           Run all verification checks (default)"
        echo "  frontend      Verify frontend deployment"
        echo "  backend       Verify backend deployment"
        echo "  database      Verify database connectivity"
        echo "  cors          Verify CORS configuration"
        echo "  ssl           Verify SSL certificates"
        echo "  performance   Check performance metrics"
        echo "  security      Verify security configurations"
        echo "  help          Show this help message"
        exit 0
        ;;
    *)
        error "Unknown check type: $1"
        echo "Use '$0 help' for available check types"
        exit 1
        ;;
esac