# CulturaFlow Backend API

A comprehensive, scalable backend system for CulturaFlow - a mobile-first cultural education app similar to Duolingo, built with Node.js, Express, TypeScript, PostgreSQL, and Redis.

## 🌟 Features

### 🔐 Authentication & Security
- **JWT-based authentication** with refresh tokens
- **Password strength validation** and secure hashing
- **Rate limiting** with user-specific controls
- **Mobile-optimized security headers**
- **Session management** with Redis caching
- **Input validation** with Zod schemas

### 📚 Cultural Content Management
- **Multi-category content system** (History, Art, Music, Literature, etc.)
- **Difficulty-based content organization** (1-5 levels)
- **Rich content support** (text, images, audio, quizzes)
- **Multilingual content support**
- **Content search and filtering**
- **Trending content algorithms**

### 🎮 Gamification System
- **Points and XP system** with configurable rewards
- **Daily/weekly streaks** with automatic tracking
- **Achievement system** with rarity levels (common → legendary)
- **Progress tracking** with completion rates
- **User statistics** and analytics dashboard

### 🤖 AI-Powered Recommendations
- **Personalized content suggestions** using multiple algorithms:
  - Collaborative filtering based on similar users
  - Content-based recommendations using user preferences
  - AI-generated suggestions via OpenAI
  - Trending content analysis
- **Real-time recommendation scoring**
- **A/B testing support** for recommendation algorithms

### 📱 Mobile Optimization
- **Image compression** and optimization for mobile
- **Intelligent caching** with Redis for fast responses
- **Pagination** optimized for mobile feeds
- **Bandwidth-conscious API responses**
- **Offline-first data structures**

### 📊 Analytics & Insights
- **User behavior tracking** and session analytics
- **Content performance metrics**
- **Learning progress analytics**
- **Recommendation effectiveness tracking**

## 🏗️ Architecture

```
├── src/
│   ├── config/          # Database, Redis, and app configuration
│   ├── controllers/     # Request handlers and business logic
│   ├── middleware/      # Authentication, security, validation
│   ├── models/         # Database models (Prisma)
│   ├── routes/         # API route definitions
│   ├── services/       # Business logic and external integrations
│   ├── utils/          # Utilities, validation, logging
│   └── types/          # TypeScript type definitions
├── prisma/             # Database schema and migrations
├── scripts/            # Database seeding and maintenance
└── docker/             # Docker configuration
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

### Environment Setup

1. **Clone and install dependencies:**
```bash
cd backend
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Database setup:**
```bash
# Generate Prisma client
npm run generate

# Run database migrations
npm run migrate:dev

# Seed with sample data
npm run seed
```

4. **Start development server:**
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### Docker Setup (Recommended)

```bash
# Start all services (PostgreSQL, Redis, API, Nginx)
docker-compose up -d

# View logs
docker-compose logs -f api

# Run database migrations in container
docker-compose exec api npx prisma migrate deploy

# Seed database
docker-compose exec api npm run seed
```

## 📖 API Documentation

### Base URL
```
Development: http://localhost:3000/api/v1
Production: https://api.culturaflow.com/api/v1
```

### Authentication
All protected endpoints require a Bearer token:
```http
Authorization: Bearer <access_token>
```

## 🔑 API Endpoints

### Authentication (`/auth`)

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "securePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "language": "en"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123!",
  "deviceInfo": {
    "deviceType": "ios",
    "appVersion": "1.0.0"
  }
}
```

#### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

### User Management (`/users`)

#### Get User Profile
```http
GET /users/profile
Authorization: Bearer <token>
```

#### Update Profile
```http
PUT /users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "bio": "Cultural enthusiast",
  "interests": ["art", "history"],
  "preferredCategories": ["ART", "HISTORY"],
  "difficultyLevel": 2
}
```

#### Get User Statistics
```http
GET /users/stats
Authorization: Bearer <token>
```

### Cultural Content (`/content`)

#### Get Content Feed
```http
GET /content/feed?page=1&limit=20&category=ART&difficulty=2
Authorization: Bearer <token> (optional for personalization)
```

#### Get Content by ID
```http
GET /content/:contentId
Authorization: Bearer <token> (optional)
```

#### Search Content
```http
GET /content/search?q=renaissance&category=ART&page=1&limit=20
```

#### Get Trending Content
```http
GET /content/trending?period=24h&category=MUSIC&limit=10
```

### Interactions (`/interactions`)

#### Record Content Interaction
```http
POST /interactions
Authorization: Bearer <token>
Content-Type: application/json

{
  "contentId": "content_id",
  "type": "LIKE",
  "value": { "liked": true }
}
```

#### Update Progress
```http
POST /interactions/progress
Authorization: Bearer <token>
Content-Type: application/json

{
  "contentId": "content_id",
  "status": "COMPLETED",
  "timeSpent": 120,
  "score": 85,
  "completionRate": 1.0
}
```

#### Get Saved Content
```http
GET /interactions/saved/content?page=1&limit=20
Authorization: Bearer <token>
```

### Recommendations (`/recommendations`)

#### Get Personalized Recommendations
```http
GET /recommendations?limit=20&refresh=false
Authorization: Bearer <token>
```

#### Track Recommendation Interaction
```http
POST /recommendations/interact
Authorization: Bearer <token>
Content-Type: application/json

{
  "contentId": "content_id",
  "action": "click"
}
```

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": [
    {
      "field": "fieldName",
      "message": "Validation error message"
    }
  ]
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment | `development` | No |
| `PORT` | Server port | `3000` | No |
| `DATABASE_URL` | PostgreSQL connection string | - | Yes |
| `REDIS_URL` | Redis connection string | - | No |
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `JWT_REFRESH_SECRET` | Refresh token secret | - | Yes |
| `OPENAI_API_KEY` | OpenAI API key for recommendations | - | Yes |
| `AWS_ACCESS_KEY_ID` | AWS credentials for S3 | - | No |
| `CLOUDINARY_*` | Cloudinary credentials | - | No |

### Database Schema

The API uses PostgreSQL with Prisma ORM. Key entities:

- **Users**: User accounts and authentication
- **UserProfiles**: User preferences and settings
- **CulturalContent**: Educational content with categories
- **UserProgress**: Learning progress tracking
- **ContentInteractions**: User interactions (likes, saves, views)
- **Achievements**: Gamification achievements
- **UserStreaks**: Daily/weekly learning streaks
- **UserRecommendations**: AI-generated recommendations

## 🚀 Deployment

### Production Deployment with Docker

1. **Set production environment variables**
2. **Build and deploy:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Health Checks

The API includes comprehensive health checks:
```http
GET /health
```

Returns service status for database, Redis, and overall system health.

## 🔒 Security Features

### Security Headers
- **Helmet.js** for security headers
- **CORS** configuration for cross-origin requests
- **Rate limiting** per user and IP
- **Request size limiting**
- **Input sanitization**

### Authentication Security
- **BCrypt** password hashing with salt rounds
- **JWT** with short expiration times
- **Refresh token rotation**
- **Session invalidation**
- **Password strength validation**

### Mobile Security
- **Token blacklisting**
- **Device tracking**
- **Suspicious activity detection**
- **Cache-Control headers** for sensitive data

## 📈 Performance Optimizations

### Caching Strategy
- **Redis caching** for user feeds and recommendations
- **Query result caching** for expensive operations
- **Session caching** for authentication
- **Content caching** with TTL

### Database Optimization
- **Connection pooling**
- **Query optimization** with indexes
- **Pagination** for large datasets
- **Eager loading** for related data

### Mobile Optimization
- **Image compression** with Sharp
- **Response compression** with gzip
- **Minimal payload** design
- **Batch operations** support

## 🧪 Testing

Run tests with:
```bash
npm run test
npm run test:watch
```

## 📝 API Rate Limits

- **General API**: 100 requests per 15 minutes
- **Authentication**: 10 requests per 15 minutes
- **Content Creation**: 20 requests per hour
- **File Upload**: 10 requests per hour
- **Feed/Content**: 60 requests per minute

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

## 🆘 Support

For questions and support:
- **Documentation**: Check this README and API docs
- **Issues**: Create GitHub issues for bugs
- **Email**: support@culturaflow.com

Built with ❤️ for cultural education and mobile learning.