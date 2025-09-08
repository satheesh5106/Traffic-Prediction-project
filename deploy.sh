#!/bin/bash

# TrafficAI Deployment Script
# This script handles the complete deployment process for the TrafficAI application

set -e  # Exit on any error

echo "🚀 Starting TrafficAI Deployment Process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    # Check for Python for ML server
    if ! command -v python3 &> /dev/null; then
        print_warning "Python 3 is not installed. ML server functionality will not be available."
    else
        print_status "Python version: $(python3 --version)"
    fi
    
    print_success "All dependencies are available"
}

# Install dependencies
install_dependencies() {
    print_status "Installing main project dependencies..."
    npm install
    
    print_status "Installing Backend dependencies..."
    cd Backend
    npm install
    
    # Set up database
    if command -v npx &> /dev/null; then
        print_status "Setting up database with Prisma..."
        npx prisma generate
        npx prisma migrate dev --name init --skip-seed
    else
        print_warning "npx not found. Skipping database setup."
    fi
    cd ..
    
    print_status "Installing Netlify Functions dependencies..."
    cd netlify/functions
    npm install
    cd ../..
    
    # Install ML server dependencies if Python is available
    if command -v python3 &> /dev/null; then
        print_status "Setting up ML server environment..."
        
        # Check if virtual environment exists
        if [ ! -d "./ml_env" ]; then
            print_status "Creating Python virtual environment"
            python3 -m venv ml_env
        fi
        
        # Activate virtual environment and install dependencies
        if [ -f "requirements.txt" ]; then
            print_status "Installing ML server dependencies"
            source ml_env/bin/activate
            pip install -r requirements.txt
            deactivate
        else
            print_warning "requirements.txt not found. Skipping ML dependencies installation."
        fi
    fi
    
    print_success "All dependencies installed successfully"
}

# Build the project
build_project() {
    print_status "Building the project..."
    
    # Build the main Next.js application
    npm run build
    
    # Build the backend if needed
    if [ -f "Backend/package.json" ] && grep -q '"build"' Backend/package.json; then
        print_status "Building Backend..."
        cd Backend
        npm run build
        cd ..
    fi
    
    print_success "Project built successfully"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    # Run main project tests if available
    if grep -q '"test"' package.json; then
        npm test
    else
        print_warning "No tests found in main project"
    fi
    
    # Run backend tests if available
    if [ -f "Backend/package.json" ] && grep -q '"test"' Backend/package.json; then
        print_status "Running Backend tests..."
        cd Backend
        npm test
        cd ..
    fi
    
    # Run netlify functions tests if available
    if [ -f "netlify/functions/package.json" ] && grep -q '"test"' netlify/functions/package.json; then
        print_status "Running Netlify Functions tests..."
        cd netlify/functions
        npm test
        cd ../..
    fi
    
    print_success "Tests completed"
}

# Deploy to Netlify
deploy_to_netlify() {
    print_status "Deploying to Netlify..."
    
    if command -v netlify &> /dev/null; then
        # Check if already logged in
        if netlify status &> /dev/null; then
            print_status "Deploying to production..."
            netlify deploy --prod
        else
            print_warning "Please login to Netlify first: netlify login"
            print_status "Deploying as draft..."
            netlify deploy
        fi
    else
        print_warning "Netlify CLI not found. Installing..."
        npm install -g netlify-cli
        print_status "Please run 'netlify login' and then run this script again"
        exit 1
    fi
    
    print_success "Deployment completed"
}

# Start development server
start_dev_server() {
    print_status "Starting development server..."
    
    # Check if we should start the backend as well
    if [ "$1" = "--with-backend" ] || [ "$1" = "--full" ]; then
        print_status "Starting Backend server in background..."
        cd Backend
        npm run dev &
        BACKEND_PID=$!
        cd ..
    fi
    
    # Check if we should start the ML servers as well
    if [ "$1" = "--with-ml" ] || [ "$1" = "--full" ]; then
        if [ -d "./ml_env" ] && command -v python3 &> /dev/null; then
            print_status "Starting ML servers in background..."
            source ml_env/bin/activate
            
            # Start ML traffic server
            if [ -f "ml_server.py" ]; then
                python3 ml_server.py &
                ML_SERVER_PID=$!
                print_status "ML Traffic server started"
            fi
            
            # Start ML incident server
            if [ -f "ml_incident.py" ]; then
                python3 ml_incident.py &
                ML_INCIDENT_PID=$!
                print_status "ML Incident server started"
            fi
            
            deactivate
        else
            print_warning "ML environment not found. Skipping ML servers."
        fi
    fi
    
    # Function to cleanup background processes
    cleanup() {
        print_status "Stopping servers..."
        if [ -n "$BACKEND_PID" ]; then
            kill $BACKEND_PID 2>/dev/null || true
        fi
        if [ -n "$ML_SERVER_PID" ]; then
            kill $ML_SERVER_PID 2>/dev/null || true
        fi
        if [ -n "$ML_INCIDENT_PID" ]; then
            kill $ML_INCIDENT_PID 2>/dev/null || true
        fi
        exit
    }
    
    # Set trap to cleanup on script exit
    trap cleanup EXIT INT TERM
    
    # Start the main development server
    npm run dev
}

# Main deployment function
main() {
    case "$1" in
        "install")
            check_dependencies
            install_dependencies
            ;;
        "build")
            check_dependencies
            build_project
            ;;
        "test")
            check_dependencies
            run_tests
            ;;
        "deploy")
            check_dependencies
            install_dependencies
            build_project
            run_tests
            deploy_to_netlify
            ;;
        "dev")
            check_dependencies
            start_dev_server "$2"
            ;;
        "full")
            check_dependencies
            install_dependencies
            build_project
            run_tests
            deploy_to_netlify
            ;;
        "ml")
            if command -v python3 &> /dev/null; then
                print_status "Starting ML servers only..."
                if [ -d "./ml_env" ]; then
                    source ml_env/bin/activate
                    
                    # Start ML traffic server
                    if [ -f "ml_server.py" ]; then
                        python3 ml_server.py &
                        ML_SERVER_PID=$!
                        print_status "ML Traffic server started"
                    fi
                    
                    # Start ML incident server
                    if [ -f "ml_incident.py" ]; then
                        python3 ml_incident.py &
                        ML_INCIDENT_PID=$!
                        print_status "ML Incident server started"
                    fi
                    
                    # Function to cleanup background processes
                    cleanup() {
                        print_status "Stopping ML servers..."
                        if [ -n "$ML_SERVER_PID" ]; then
                            kill $ML_SERVER_PID 2>/dev/null || true
                        fi
                        if [ -n "$ML_INCIDENT_PID" ]; then
                            kill $ML_INCIDENT_PID 2>/dev/null || true
                        fi
                        deactivate
                        exit
                    }
                    
                    # Set trap to cleanup on script exit
                    trap cleanup EXIT INT TERM
                    
                    # Wait for user to press Ctrl+C
                    print_status "ML servers running. Press Ctrl+C to stop."
                    wait
                else
                    print_error "ML environment not found. Run 'install' first."
                    exit 1
                fi
            else
                print_error "Python 3 is required for ML servers."
                exit 1
            fi
            ;;
        *)
            echo "TrafficAI Deployment Script"
            echo ""
            echo "Usage: $0 {install|build|test|deploy|dev|ml|full}"
            echo ""
            echo "Commands:"
            echo "  install    - Install all dependencies"
            echo "  build      - Build the project"
            echo "  test       - Run tests"
            echo "  deploy     - Deploy to Netlify (requires build)"
            echo "  dev        - Start development server"
            echo "             Use 'dev --with-backend' to start only backend"
            echo "             Use 'dev --with-ml' to start only ML servers"
            echo "             Use 'dev --full' to start all servers"
            echo "  ml         - Start only ML servers"
            echo "  full       - Complete deployment process (install, build, test, deploy)"
            echo ""
            echo "Examples:"
            echo "  $0 install"
            echo "  $0 dev --full"
            echo "  $0 ml"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"