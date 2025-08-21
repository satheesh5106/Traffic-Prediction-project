#!/bin/bash

# TrafficAI Environment Setup Script
# This script helps set up environment variables for Netlify deployment

set -e

echo "🔧 TrafficAI Environment Setup"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Netlify CLI not found. Installing..."
    npm install -g netlify-cli
fi

# Function to set environment variable
set_env_var() {
    local var_name=$1
    local var_description=$2
    local is_secret=${3:-true}
    
    echo -e "\n${BLUE}Setting up: ${var_name}${NC}"
    echo -e "${YELLOW}Description: ${var_description}${NC}"
    
    if [ "$is_secret" = true ]; then
        echo -n "Enter value (hidden): "
        read -s var_value
        echo
    else
        echo -n "Enter value: "
        read var_value
    fi
    
    if [ -n "$var_value" ]; then
        netlify env:set "$var_name" "$var_value"
        echo -e "${GREEN}✓ ${var_name} set successfully${NC}"
    else
        echo -e "${RED}✗ Skipped ${var_name}${NC}"
    fi
}

# Check if user is logged in to Netlify
echo "Checking Netlify authentication..."
if ! netlify status &> /dev/null; then
    echo -e "${YELLOW}Please log in to Netlify:${NC}"
    netlify login
fi

# Link to site if not already linked
if [ ! -f ".netlify/state.json" ]; then
    echo -e "${YELLOW}Linking to Netlify site...${NC}"
    netlify link
fi

echo -e "\n${GREEN}Setting up required environment variables...${NC}"

# Firebase Configuration
echo -e "\n${BLUE}=== Firebase Configuration ===${NC}"
set_env_var "FIREBASE_PROJECT_ID" "Your Firebase project ID" false
set_env_var "FIREBASE_PRIVATE_KEY" "Firebase service account private key (include -----BEGIN/END PRIVATE KEY-----)"
set_env_var "FIREBASE_CLIENT_EMAIL" "Firebase service account email" false

# HERE Maps API
echo -e "\n${BLUE}=== HERE Maps API ===${NC}"
set_env_var "HERE_API_KEY" "HERE Maps API key for traffic data"

# OpenRouteService
echo -e "\n${BLUE}=== OpenRouteService ===${NC}"
set_env_var "ORS_API_KEY" "OpenRouteService API key for routing"

# OneSignal
echo -e "\n${BLUE}=== OneSignal Push Notifications ===${NC}"
set_env_var "ONESIGNAL_APP_ID" "OneSignal App ID" false
set_env_var "ONESIGNAL_REST_API_KEY" "OneSignal REST API Key"

# Optional environment variables
echo -e "\n${YELLOW}=== Optional Configuration ===${NC}"
echo "Setting up optional environment variables (press Enter to skip)..."

set_env_var "OPEN_METEO_API_URL" "Open-Meteo API URL (default: https://api.open-meteo.com/v1)" false
set_env_var "NODE_ENV" "Node environment (default: production)" false
set_env_var "NETLIFY_FUNCTIONS_URL" "Netlify functions URL (auto-detected)" false

echo -e "\n${GREEN}✅ Environment setup completed!${NC}"
echo -e "\n${BLUE}Next steps:${NC}"
echo "1. Verify variables: netlify env:list"
echo "2. Deploy your site: npm run deploy"
echo "3. Test deployment: npm run deploy:test"

echo -e "\n${YELLOW}Would you like to deploy now? (y/n)${NC}"
read -n 1 deploy_now
echo

if [ "$deploy_now" = "y" ] || [ "$deploy_now" = "Y" ]; then
    echo -e "${GREEN}Starting deployment...${NC}"
    npm run deploy
else
    echo -e "${BLUE}You can deploy later using: npm run deploy${NC}"
fi

echo -e "\n${GREEN}🚀 Setup complete! Your TrafficAI backend is ready to deploy.${NC}"