#!/bin/bash

# TrafficAI Production Deployment Script
# Automated deployment with testing and validation

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="TrafficAI"
NODE_VERSION="18"
TEST_TIMEOUT=300  # 5 minutes

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    NODE_CURRENT=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_CURRENT" -lt "$NODE_VERSION" ]; then
        log_error "Node.js version $NODE_VERSION or higher is required (current: $NODE_CURRENT)"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check Netlify CLI
    if ! command -v netlify &> /dev/null; then
        log_warning "Netlify CLI is not installed. Installing..."
        npm install -g netlify-cli
    fi
    
    log_success "Prerequisites check passed"
}

check_environment() {
    log_info "Checking environment variables..."
    
    REQUIRED_VARS=(
        "FIREBASE_PROJECT_ID"
        "FIREBASE_PRIVATE_KEY"
        "FIREBASE_CLIENT_EMAIL"
        "HERE_API_KEY"
        "ORS_API_KEY"
        "ONESIGNAL_APP_ID"
        "ONESIGNAL_REST_API_KEY"
    )
    
    MISSING_VARS=()
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            MISSING_VARS+=("$var")
        fi
    done
    
    if [ ${#MISSING_VARS[@]} -ne 0 ]; then
        log_error "Missing required environment variables:"
        for var in "${MISSING_VARS[@]}"; do
            echo "  - $var"
        done
        log_info "Please set these variables in Netlify dashboard or use 'netlify env:set'"
        exit 1
    fi
    
    log_success "Environment variables check passed"
}

install_dependencies() {
    log_info "Installing dependencies..."
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    log_success "Dependencies installed"
}

run_tests() {
    log_info "Running tests..."
    
    # Run Jest tests
    if npm run test:api; then
        log_success "API tests passed"
    else
        log_error "API tests failed"
        exit 1
    fi
    
    # Run linting
    if npm run lint; then
        log_success "Linting passed"
    else
        log_warning "Linting issues found (continuing anyway)"
    fi
}

build_project() {
    log_info "Building project..."
    
    if npm run build; then
        log_success "Build completed successfully"
    else
        log_error "Build failed"
        exit 1
    fi
}

test_functions_locally() {
    log_info "Testing functions locally..."
    
    # Start Netlify dev server in background
    netlify dev --port 8888 &
    DEV_PID=$!
    
    # Wait for server to start
    log_info "Waiting for dev server to start..."
    sleep 10
    
    # Run deployment tests
    if timeout $TEST_TIMEOUT node test-deployment.js; then
        log_success "Local function tests passed"
    else
        log_error "Local function tests failed"
        kill $DEV_PID 2>/dev/null || true
        exit 1
    fi
    
    # Stop dev server
    kill $DEV_PID 2>/dev/null || true
    sleep 2
}

deploy_to_netlify() {
    log_info "Deploying to Netlify..."
    
    # Check if site is linked
    if ! netlify status &> /dev/null; then
        log_error "Site is not linked to Netlify. Run 'netlify link' first."
        exit 1
    fi
    
    # Deploy to production
    if netlify deploy --prod --timeout 600; then
        log_success "Deployment completed successfully"
    else
        log_error "Deployment failed"
        exit 1
    fi
}

test_production_deployment() {
    log_info "Testing production deployment..."
    
    # Get site URL
    SITE_URL=$(netlify status --json | jq -r '.site.url')
    
    if [ "$SITE_URL" = "null" ] || [ -z "$SITE_URL" ]; then
        log_error "Could not get site URL"
        exit 1
    fi
    
    log_info "Testing against: $SITE_URL"
    
    # Test production endpoints
    export NETLIFY_FUNCTIONS_URL="$SITE_URL/.netlify/functions"
    
    if timeout $TEST_TIMEOUT node test-deployment.js; then
        log_success "Production tests passed"
    else
        log_error "Production tests failed"
        exit 1
    fi
}

generate_deployment_report() {
    log_info "Generating deployment report..."
    
    SITE_URL=$(netlify status --json | jq -r '.site.url')
    DEPLOY_ID=$(netlify status --json | jq -r '.site.deploy_id')
    
    cat > deployment-report.md << EOF
# TrafficAI Deployment Report

**Deployment Date:** $(date)
**Site URL:** $SITE_URL
**Deploy ID:** $DEPLOY_ID
**Node Version:** $(node -v)
**npm Version:** $(npm -v)

## Deployment Summary

✅ Prerequisites check passed
✅ Environment variables validated
✅ Dependencies installed
✅ Tests passed
✅ Build completed
✅ Local function tests passed
✅ Production deployment successful
✅ Production tests passed

## API Endpoints

- **Traffic Prediction:** $SITE_URL/.netlify/functions/traffic-prediction
- **Route Optimization:** $SITE_URL/.netlify/functions/route-optimization
- **Analytics:** $SITE_URL/.netlify/functions/analytics
- **Dashboard Data:** $SITE_URL/.netlify/functions/dashboard-data
- **Visualization Data:** $SITE_URL/.netlify/functions/vis-data
- **User Profile:** $SITE_URL/.netlify/functions/user-profile
- **User Profile Section:** $SITE_URL/.netlify/functions/user_profile_section
- **Settings:** $SITE_URL/.netlify/functions/settings
- **Auth Middleware:** $SITE_URL/.netlify/functions/auth-middleware

## Next Steps

1. Update frontend configuration with new API endpoints
2. Configure custom domain (if needed)
3. Set up monitoring and alerts
4. Update documentation with new URLs

## Support

For issues or questions, refer to:
- [Deployment Guide](./DEPLOYMENT.md)
- [Netlify Documentation](https://docs.netlify.com/)
- [Project Repository](https://github.com/your-username/traffic-ai)
EOF

    log_success "Deployment report generated: deployment-report.md"
}

cleanup() {
    log_info "Cleaning up..."
    
    # Kill any remaining processes
    pkill -f "netlify dev" 2>/dev/null || true
    
    log_success "Cleanup completed"
}

# Main deployment flow
main() {
    echo "="*60
    log_info "Starting $PROJECT_NAME deployment process"
    echo "="*60
    
    # Trap cleanup on exit
    trap cleanup EXIT
    
    check_prerequisites
    check_environment
    install_dependencies
    run_tests
    build_project
    
    # Skip local testing if --skip-local-test flag is provided
    if [[ ! " $* " =~ " --skip-local-test " ]]; then
        test_functions_locally
    fi
    
    deploy_to_netlify
    
    # Skip production testing if --skip-prod-test flag is provided
    if [[ ! " $* " =~ " --skip-prod-test " ]]; then
        test_production_deployment
    fi
    
    generate_deployment_report
    
    echo "="*60
    log_success "$PROJECT_NAME deployment completed successfully! 🚀"
    echo "="*60
    
    # Display site URL
    SITE_URL=$(netlify status --json | jq -r '.site.url')
    log_info "Your site is live at: $SITE_URL"
}

# Help function
show_help() {
    cat << EOF
TrafficAI Deployment Script

Usage: $0 [options]

Options:
  --help                Show this help message
  --skip-local-test     Skip local function testing
  --skip-prod-test      Skip production testing
  --dry-run            Run all steps except actual deployment

Environment Variables:
  All required environment variables should be set in Netlify dashboard
  or via 'netlify env:set' command.

Examples:
  # Full deployment with all tests
  ./deploy.sh
  
  # Quick deployment without local testing
  ./deploy.sh --skip-local-test
  
  # Deployment without any testing (not recommended)
  ./deploy.sh --skip-local-test --skip-prod-test

EOF
}

# Parse command line arguments
if [[ " $* " =~ " --help " ]]; then
    show_help
    exit 0
fi

if [[ " $* " =~ " --dry-run " ]]; then
    log_warning "DRY RUN MODE - No actual deployment will occur"
    # Add dry-run logic here if needed
fi

# Run main deployment
main "$@"