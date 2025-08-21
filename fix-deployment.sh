#!/bin/bash

# TrafficAI Deployment Fix Script
# Resolves environment variable issues and provides deployment alternatives

set -e

echo "🔧 TrafficAI Deployment Fix"
echo "=========================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Deployment failed due to missing environment variables.${NC}"
echo -e "${YELLOW}Choose a solution:${NC}\n"

echo "1. 🚀 Quick Setup with Netlify CLI (Recommended)"
echo "2. 📝 Manual Environment Variable Guide"
echo "3. 🧪 Deploy with Mock Data (Testing)"
echo "4. 📋 Show Required Variables List"
echo "5. 🔍 Check Current Environment"
echo "6. ❌ Exit"

echo -e "\n${BLUE}Enter your choice (1-6):${NC} "
read choice

case $choice in
    1)
        echo -e "\n${GREEN}Starting interactive environment setup...${NC}"
        ./setup-env.sh
        ;;
    2)
        echo -e "\n${BLUE}=== Manual Setup Guide ===${NC}"
        echo -e "\n${YELLOW}1. Go to Netlify Dashboard:${NC}"
        echo "   - Visit: https://app.netlify.com/"
        echo "   - Select your site → Site settings → Environment variables"
        echo -e "\n${YELLOW}2. Add these variables:${NC}"
        echo "   FIREBASE_PROJECT_ID=your-firebase-project-id"
        echo "   FIREBASE_PRIVATE_KEY=\"-----BEGIN PRIVATE KEY-----\\nYour-Key\\n-----END PRIVATE KEY-----\""
        echo "   FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com"
        echo "   HERE_API_KEY=your-here-maps-api-key"
        echo "   ORS_API_KEY=your-openrouteservice-api-key"
        echo "   ONESIGNAL_APP_ID=your-onesignal-app-id"
        echo "   ONESIGNAL_REST_API_KEY=your-onesignal-rest-key"
        echo -e "\n${YELLOW}3. Redeploy:${NC}"
        echo "   npm run deploy"
        echo -e "\n${BLUE}📖 See ENV_SETUP_GUIDE.md for detailed instructions${NC}"
        ;;
    3)
        echo -e "\n${YELLOW}Creating mock environment for testing...${NC}"
        
        # Create temporary .env file with mock data
        cat > .env.local << EOF
FIREBASE_PROJECT_ID=trafficai-demo
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMOCK_PRIVATE_KEY_FOR_TESTING\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-mock@trafficai-demo.iam.gserviceaccount.com
HERE_API_KEY=mock_here_api_key_for_testing
ORS_API_KEY=mock_ors_api_key_for_testing
ONESIGNAL_APP_ID=mock-onesignal-app-id
ONESIGNAL_REST_API_KEY=mock_onesignal_rest_key
NODE_ENV=development
EOF
        
        echo -e "${GREEN}✓ Mock environment created${NC}"
        echo -e "${YELLOW}⚠️  This is for testing only - replace with real API keys for production${NC}"
        
        # Deploy with mock environment
        echo -e "\n${BLUE}Deploying with mock data...${NC}"
        npm run build
        echo -e "${GREEN}✓ Build successful with mock environment${NC}"
        echo -e "\n${YELLOW}To deploy to production:${NC}"
        echo "1. Set real API keys using option 1 or 2"
        echo "2. Run: npm run deploy"
        ;;
    4)
        echo -e "\n${BLUE}=== Required Environment Variables ===${NC}"
        echo -e "\n${RED}Missing Variables:${NC}"
        echo "❌ FIREBASE_PROJECT_ID"
        echo "❌ FIREBASE_PRIVATE_KEY"
        echo "❌ FIREBASE_CLIENT_EMAIL"
        echo "❌ HERE_API_KEY"
        echo "❌ ORS_API_KEY"
        echo "❌ ONESIGNAL_APP_ID"
        echo "❌ ONESIGNAL_REST_API_KEY"
        
        echo -e "\n${BLUE}Optional Variables:${NC}"
        echo "⚪ OPEN_METEO_API_URL (default: https://api.open-meteo.com/v1)"
        echo "⚪ NODE_ENV (default: production)"
        echo "⚪ NETLIFY_FUNCTIONS_URL (auto-detected)"
        
        echo -e "\n${GREEN}📖 See ENV_SETUP_GUIDE.md for how to get these keys${NC}"
        ;;
    5)
        echo -e "\n${BLUE}=== Current Environment Check ===${NC}"
        
        # Check if Netlify CLI is available
        if command -v netlify &> /dev/null; then
            echo -e "${GREEN}✓ Netlify CLI installed${NC}"
            
            # Check if logged in
            if netlify status &> /dev/null; then
                echo -e "${GREEN}✓ Netlify authenticated${NC}"
                
                # Check if site is linked
                if [ -f ".netlify/state.json" ]; then
                    echo -e "${GREEN}✓ Site linked to Netlify${NC}"
                    
                    # List current environment variables
                    echo -e "\n${BLUE}Current environment variables:${NC}"
                    netlify env:list || echo -e "${YELLOW}No environment variables set${NC}"
                else
                    echo -e "${YELLOW}⚠️  Site not linked to Netlify${NC}"
                    echo "Run: netlify link"
                fi
            else
                echo -e "${YELLOW}⚠️  Not authenticated with Netlify${NC}"
                echo "Run: netlify login"
            fi
        else
            echo -e "${RED}❌ Netlify CLI not installed${NC}"
            echo "Install: npm install -g netlify-cli"
        fi
        
        # Check local environment
        echo -e "\n${BLUE}Local environment files:${NC}"
        [ -f ".env" ] && echo -e "${GREEN}✓ .env${NC}" || echo -e "${YELLOW}⚪ .env (not found)${NC}"
        [ -f ".env.local" ] && echo -e "${GREEN}✓ .env.local${NC}" || echo -e "${YELLOW}⚪ .env.local (not found)${NC}"
        [ -f ".env.production" ] && echo -e "${GREEN}✓ .env.production${NC}" || echo -e "${YELLOW}⚪ .env.production (template)${NC}"
        ;;
    6)
        echo -e "${BLUE}Exiting...${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice. Please run the script again.${NC}"
        exit 1
        ;;
esac

echo -e "\n${GREEN}🎯 Next Steps:${NC}"
echo "1. Set up your API keys (if not done)"
echo "2. Test locally: npm run netlify:dev"
echo "3. Deploy: npm run deploy"
echo "4. Test deployment: npm run deploy:test"

echo -e "\n${BLUE}📚 Additional Resources:${NC}"
echo "• ENV_SETUP_GUIDE.md - Detailed setup instructions"
echo "• DEPLOYMENT.md - Complete deployment guide"
echo "• test-deployment.js - Test your deployed functions"

echo -e "\n${GREEN}🚀 TrafficAI deployment fix complete!${NC}"