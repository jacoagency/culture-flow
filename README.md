# 🎓 CulturaFlow - Educational Culture App

**Transform scrolling time into productive cultural learning**

CulturaFlow is a mobile-first educational app that turns mindless social media scrolling into meaningful cultural education. Learn about history, art, music, literature, and more through an engaging, TikTok-style interface powered by AI-generated content.

---

## 🌟 Features

### 📱 **Mobile-First Experience**
- **Infinite Scroll Feed** - TikTok-style vertical scrolling with educational content
- **Swipe Gestures** - Natural mobile interactions for learning
- **Dark/Light Mode** - Automatic theme switching with user preferences
- **Offline Support** - Download content for learning without internet

### 🎮 **Gamification System**
- **Points & Levels** - Earn points for every piece of content consumed
- **Daily Streaks** - Build learning habits with streak tracking
- **Achievement System** - Unlock badges for learning milestones
- **Progress Tracking** - Visual progress bars and statistics

### 🧠 **AI-Powered Content**
- **Smart Recommendations** - Personalized content based on interests and behavior
- **Automatic Generation** - Fresh cultural content created by AI systems
- **Difficulty Adaptation** - Content adjusts to your learning level
- **Multi-Format Learning** - Text, images, quizzes, and interactive content

### 🏛️ **Cultural Categories**
- **🏛️ History** - Historical events, figures, and civilizations
- **🎨 Art** - Paintings, sculptures, and artistic movements
- **🎵 Music** - Composers, genres, and musical history
- **📚 Literature** - Authors, works, and literary movements
- **🏗️ Architecture** - Architectural styles and famous buildings
- **🎭 Culture** - Traditions, festivals, and cultural phenomena

### 📊 **Analytics & Progress**
- **Learning Analytics** - Track time spent and topics mastered
- **Personal Dashboard** - Visual overview of learning progress
- **Achievement Gallery** - Display earned badges and accomplishments
- **Social Features** - Compare progress with friends (optional)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator or Android Emulator
- Expo Go app on your mobile device (optional)

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd duolingo_culture
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the development server**
```bash
npm start
```

4. **Run on your preferred platform**
```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Web browser
npm run web
```

### Backend Setup

1. **Navigate to backend directory**
```bash
cd backend
```

2. **Install backend dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start with Docker (recommended)**
```bash
docker-compose up -d
```

5. **Initialize database**
```bash
npm run migrate
npm run seed
```

---

## 🏗️ Architecture

### Frontend (React Native + Expo)
```
src/
├── components/       # Reusable UI components
├── screens/         # Screen components
├── navigation/      # Navigation configuration
├── services/        # API and external services
├── hooks/          # Custom React hooks
├── contexts/       # React contexts (Auth, Theme)
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── data/           # Mock data and constants
```

### Backend (Node.js + PostgreSQL)
```
backend/
├── src/
│   ├── controllers/  # Request handlers
│   ├── services/     # Business logic
│   ├── middleware/   # Express middleware
│   ├── routes/       # API routes
│   ├── utils/        # Helper functions
│   └── types/        # TypeScript types
├── prisma/          # Database schema & migrations
├── config/          # Configuration files
└── docker/          # Docker configuration
```

---

## 🧪 Testing

### Frontend Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Backend Tests
```bash
cd backend

# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

---

## 📦 Deployment

### Development Build
```bash
# Build development version
npm run build:dev
```

### Production Build
```bash
# Build for production
npm run build:prod

# Build for specific platforms
npm run build:ios
npm run build:android
```

### App Store Deployment
```bash
# Submit to iOS App Store
npm run submit:ios

# Submit to Google Play Store
npm run submit:android
```

---

## 🔧 Configuration

### Environment Variables

**Frontend (.env)**
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

**Backend (.env)**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/culturaflow
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=your_openai_key
JWT_SECRET=your_jwt_secret
```

### App Configuration (app.json)
```json
{
  "expo": {
    "name": "CulturaFlow",
    "slug": "culturaflow",
    "version": "1.0.0",
    "platforms": ["ios", "android"]
  }
}
```

---

## 📱 Demo Account

Try the app with our demo account:

- **Email:** `demo@culturaflow.com`
- **Password:** `password123`

The demo account comes pre-loaded with sample progress, achievements, and personalized recommendations.

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Style
- **Frontend:** ESLint + Prettier
- **Backend:** ESLint + Prettier
- **Commits:** Conventional Commits format

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🎯 Roadmap

### Phase 1: Core Features ✅
- [x] Basic UI and navigation
- [x] User authentication
- [x] Content feed and categories
- [x] Gamification system
- [x] Basic AI integration

### Phase 2: Enhanced Learning 🚧
- [ ] Advanced AI recommendations
- [ ] Social learning features
- [ ] Offline content sync
- [ ] Multi-language support

### Phase 3: Community & Scale 📋
- [ ] User-generated content
- [ ] Community features
- [ ] Advanced analytics
- [ ] Enterprise features

---

## 🆘 Support

- **Documentation:** Check our [docs folder](./docs/)
- **Issues:** Report bugs on [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions:** Join conversations in [GitHub Discussions](https://github.com/your-repo/discussions)
- **Email:** support@culturaflow.com

---

## 🏆 Team

Built with ❤️ by the CulturaFlow team

- **Frontend Development:** React Native + TypeScript experts
- **Backend Development:** Node.js + PostgreSQL specialists
- **AI Integration:** Machine learning and content generation
- **UI/UX Design:** Mobile-first design principles
- **DevOps:** CI/CD and deployment automation

---

**Made with React Native + Expo • Node.js + PostgreSQL • OpenAI**

*Transform your screen time into learning time* 📚✨