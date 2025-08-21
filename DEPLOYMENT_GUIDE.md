# CulturaFlow Deployment Guide

Complete end-to-end deployment guide for CulturaFlow mobile app and backend services.

## 📋 Prerequisites

### Development Tools
- **Node.js**: v18+ installed
- **npm**: v9+ or yarn v3+
- **Expo CLI**: `npm install -g @expo/cli`
- **EAS CLI**: `npm install -g eas-cli`
- **Docker**: Latest version installed
- **Git**: Latest version installed

### Accounts Required
- **Apple Developer Account**: $99/year (for iOS deployment)
- **Google Play Developer Account**: $25 one-time fee (for Android)
- **Expo Account**: Free (for EAS Build & Submit)
- **Sentry Account**: Free tier available (for monitoring)
- **Docker Hub Account**: Free tier available (for backend deployment)

## 🚀 Quick Start

### 1. Environment Setup
```bash
# Clone the repository
git clone <repository-url>
cd duolingo_culture

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Copy environment files
cp .env.example .env.development
cp backend/.env.example backend/.env.development

# Configure your environment variables
# Edit .env.development and backend/.env.development
```

### 2. Local Development
```bash
# Start backend services
cd backend
npm run docker:dev
npm run db:deploy:dev
npm run dev

# In another terminal, start frontend
cd ..
npm start
```

## 🔧 Configuration Setup

### Frontend Configuration

#### 1. Update Project Details
Edit `app.config.js`:
```javascript
export default {
  expo: {
    name: 'CulturaFlow',
    slug: 'cultura-flow',
    // Update with your Expo project ID
    extra: {
      eas: {
        projectId: 'YOUR_EXPO_PROJECT_ID',
      },
    },
  },
};
```

#### 2. Configure EAS Project
```bash
# Login to Expo
eas login

# Create new project (if not exists)
eas project:create

# Update eas.json with your project details
```

Edit `eas.json`:
```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "YOUR_APPLE_ID",
        "ascAppId": "YOUR_ASC_APP_ID",
        "appleTeamId": "YOUR_APPLE_TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-service-account.json"
      }
    }
  }
}
```

### Backend Configuration

#### 1. Environment Variables
Configure environment files for each stage:

**.env.development**:
```env
NODE_ENV=development
DATABASE_URL=postgresql://culturaflow:password@localhost:5432/culturaflow
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-development-jwt-secret
OPENAI_API_KEY=your-openai-api-key
```

**.env.staging**:
```env
NODE_ENV=staging
DATABASE_URL=postgresql://user:pass@staging-db:5432/culturaflow
REDIS_URL=redis://staging-redis:6379
JWT_SECRET=your-staging-jwt-secret
SENTRY_DSN=your-staging-sentry-dsn
```

**.env.production**:
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db:5432/culturaflow
REDIS_URL=redis://prod-redis:6379
JWT_SECRET=your-production-jwt-secret
SENTRY_DSN=your-production-sentry-dsn
```

## 📱 Mobile App Deployment

### iOS Deployment

#### 1. Apple Developer Setup
1. **Create App Identifier**:
   - Login to Apple Developer Portal
   - Create App ID: `com.culturaflow.app`
   - Enable required capabilities (Push Notifications, In-App Purchase)

2. **Configure App Store Connect**:
   - Create new app in App Store Connect
   - Set app name: "CulturaFlow"
   - Choose category: Education
   - Set up pricing (Free with IAP)

#### 2. Build and Submit
```bash
# Configure environment for production
export APP_ENV=production

# Build for iOS
eas build --platform ios --profile production-ios

# Submit to App Store (after build completes)
eas submit --platform ios
```

#### 3. App Store Optimization
- Upload screenshots (see `store-metadata/generate-screenshots.md`)
- Configure app description and keywords
- Set up privacy policy and terms of service
- Configure in-app purchases

### Android Deployment

#### 1. Google Play Setup
1. **Create Application**:
   - Login to Google Play Console
   - Create new app: "CulturaFlow"
   - Package name: `com.culturaflow.app`
   - Category: Education

2. **Configure Service Account**:
   - Create service account in Google Cloud Console
   - Download JSON key file as `google-play-service-account.json`
   - Grant permissions in Google Play Console

#### 2. Build and Submit
```bash
# Build for Android
eas build --platform android --profile production-android

# Submit to Google Play
eas submit --platform android
```

#### 3. Release Management
1. **Internal Testing**: Test with team
2. **Alpha Release**: Closed testing group
3. **Beta Release**: Open testing or closed testing
4. **Production Release**: Public release

## 🖥️ Backend Deployment

### Staging Environment
```bash
# Deploy to staging
cd backend
npm run deploy:staging

# Verify deployment
curl http://staging-api.culturaflow.com/health
```

### Production Environment
```bash
# Deploy to production
cd backend
npm run deploy:prod

# Verify deployment
curl https://api.culturaflow.com/health
```

### Database Migration
```bash
# Run migrations on production
cd backend
npm run db:deploy:prod

# Create backup before major updates
npm run db:backup
```

## 🔄 CI/CD Pipeline

### GitHub Actions Setup

#### 1. Configure Secrets
Add these secrets in GitHub repository settings:
```
EXPO_TOKEN=your-expo-access-token
DOCKER_USERNAME=your-docker-username
DOCKER_PASSWORD=your-docker-password
EXPO_APPLE_ID=your-apple-id
EXPO_ASC_APP_ID=your-app-store-connect-app-id
```

#### 2. Automated Workflows
The CI/CD pipeline automatically:
- ✅ Tests frontend and backend code
- ✅ Builds mobile apps for staging/production
- ✅ Deploys backend services
- ✅ Runs database migrations
- ✅ Submits to app stores (manual trigger)

#### 3. Manual Release
```bash
# Trigger manual release via GitHub Actions
# Go to Actions → Release Build & Deploy
# Select parameters and run workflow
```

## 📊 Monitoring Setup

### Sentry Configuration
1. **Create Sentry Projects**:
   - Frontend project for React Native
   - Backend project for Node.js

2. **Configure DSNs**:
```env
# Frontend
SENTRY_DSN=your-frontend-sentry-dsn

# Backend  
SENTRY_DSN=your-backend-sentry-dsn
```

3. **Set Up Alerts**:
   - Error rate > 1%
   - Performance degradation
   - New error types

### Health Monitoring
- **Backend Health**: `/health` endpoint
- **Database Health**: Connection and query performance
- **External APIs**: OpenAI API status
- **User Metrics**: DAU, MAU, retention

## 🔐 Security Checklist

### Pre-Production Security
- [ ] All secrets properly configured in environment variables
- [ ] API rate limiting enabled and tested
- [ ] CORS properly configured for production domains
- [ ] Database security (SSL, connection limits)
- [ ] Input validation on all endpoints
- [ ] Authentication and authorization working
- [ ] HTTPS enforced in production
- [ ] Sensitive data not logged
- [ ] Error messages don't expose internal details

### App Store Security
- [ ] App privacy labels configured
- [ ] Data usage descriptions clear
- [ ] Required permissions justified
- [ ] Code obfuscation enabled for production
- [ ] Certificate pinning implemented
- [ ] Local storage encryption

## 📈 Performance Optimization

### Mobile App
- **Bundle Size**: Keep under 500KB initial bundle
- **Startup Time**: Target under 3 seconds
- **Memory Usage**: Monitor and optimize heavy screens
- **Offline Support**: Cache critical content
- **Image Optimization**: Use appropriate formats and sizes

### Backend API
- **Response Time**: P95 under 200ms for critical endpoints
- **Database Queries**: Optimize slow queries (>100ms)
- **Caching**: Implement Redis for frequently accessed data
- **Rate Limiting**: Protect against abuse
- **Load Testing**: Test under expected production load

## 🚨 Rollback Procedures

### Mobile App Rollback
```bash
# If critical issue found after release
# 1. Create hotfix branch
# 2. Build and test fix
# 3. Submit expedited review to app stores
# 4. Consider removing app temporarily if severe
```

### Backend Rollback
```bash
# Quick rollback to previous version
cd backend
docker-compose -f docker-compose.production.yml down
docker pull culturaflow/backend:previous-stable-tag
docker-compose -f docker-compose.production.yml up -d

# Database rollback (if needed)
npm run migrate:reset
# Restore from backup
```

## 📞 Support and Troubleshooting

### Common Issues

#### Build Failures
- **Metro bundling errors**: Clear cache with `npx expo start --clear`
- **Dependency conflicts**: Remove `node_modules` and reinstall
- **EAS build timeout**: Increase resource class in `eas.json`

#### Deployment Issues
- **Database connection**: Verify DATABASE_URL and network access
- **Docker build fails**: Check Dockerfile and build context
- **Health check fails**: Verify service dependencies are running

#### App Store Rejections
- **Privacy Policy**: Ensure policy is accessible and complete
- **App Description**: Remove marketing speak, focus on functionality
- **Screenshots**: Ensure they show actual app functionality
- **Permissions**: Justify all requested permissions

### Getting Help
- **Documentation**: Refer to Expo and React Native docs
- **Community**: Stack Overflow, Discord communities
- **Support**: Create issues in project repository
- **Emergency**: Contact development team directly

## 📊 Success Metrics

### Launch Targets (30 Days)
- 🎯 1,000+ downloads
- 🎯 4.0+ star rating
- 🎯 <2% crash rate
- 🎯 50%+ day-1 retention

### Growth Targets (6 Months)
- 🎯 50,000+ downloads  
- 🎯 4.5+ star rating
- 🎯 Top 10 education category
- 🎯 30%+ monthly retention

---

## Quick Command Reference

### Development
```bash
npm start                    # Start Expo dev server
npm run android             # Start Android emulator
npm run ios                 # Start iOS simulator
npm test                    # Run tests
npm run type-check          # TypeScript check
```

### Building
```bash
eas build --profile development    # Dev build
eas build --profile preview        # Preview build
eas build --profile production     # Production build
```

### Deployment
```bash
eas submit --platform ios          # Submit to App Store
eas submit --platform android      # Submit to Google Play
npm run deploy:staging             # Deploy backend to staging
npm run deploy:prod                # Deploy backend to production
```

For detailed information, refer to individual configuration files and documentation in the project.