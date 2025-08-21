const express = require('express');
const cors = require('cors');
const app = express();

// Middleware más completo
app.use(cors({
  origin: ['http://localhost:8083', 'http://localhost:19006', 'http://localhost:3000', 'http://192.168.1.76:8083'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  console.log('Health check called');
  res.json({ status: 'ok', message: 'CulturaFlow Backend is running!' });
});

// Auth endpoints - TODAS las rutas que necesita el frontend
app.post('/api/v1/auth/login', (req, res) => {
  console.log('Login attempt:', req.body);
  const { email, password } = req.body;
  
  if (email === 'demo@culturaflow.com' && password === 'password123') {
    res.json({
      success: true,
      data: {
        user: {
          id: 1,
          name: 'Usuario Demo',
          email: 'demo@culturaflow.com',
          level: 5,
          points: 250,
          streak: 7,
          preferredCategories: ['history', 'art', 'music']
        },
        tokens: {
          accessToken: 'demo-jwt-token-123',
          refreshToken: 'demo-refresh-token-456'
        }
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Credenciales incorrectas'
    });
  }
});

app.post('/api/v1/auth/register', (req, res) => {
  console.log('Register attempt:', req.body);
  const { name, email, password, preferredCategories } = req.body;
  
  res.json({
    success: true,
    data: {
      user: {
        id: Date.now(),
        name,
        email,
        level: 1,
        points: 0,
        streak: 0,
        preferredCategories: preferredCategories || ['history']
      },
      tokens: {
        accessToken: 'new-user-token-' + Date.now(),
        refreshToken: 'new-user-refresh-' + Date.now()
      }
    }
  });
});

// Refresh token endpoint
app.post('/api/v1/auth/refresh', (req, res) => {
  res.json({
    success: true,
    data: {
      tokens: {
        accessToken: 'refreshed-token-' + Date.now(),
        refreshToken: 'new-refresh-' + Date.now()
      }
    }
  });
});

// Logout endpoint
app.post('/api/v1/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// Auth me endpoint
app.get('/api/v1/auth/me', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 1,
      name: 'Usuario Demo',
      email: 'demo@culturaflow.com',
      level: 5,
      points: 250,
      streak: 7,
      preferredCategories: ['history', 'art', 'music']
    }
  });
});

// User profile endpoint
app.get('/api/v1/users/profile', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 1,
      name: 'Usuario Demo',
      email: 'demo@culturaflow.com',
      level: 5,
      points: 250,
      streak: 7,
      preferredCategories: ['history', 'art', 'music']
    }
  });
});

// Content endpoints - Feed for mobile
app.get('/api/v1/content/feed', (req, res) => {
  console.log('📱 Feed request:', req.query);
  const { page = 1, limit = 20 } = req.query;
  const mockCards = [
    {
      id: 1,
      category: 'history',
      difficulty: 'beginner',
      title: 'La Torre Eiffel',
      content: '¿En qué año se construyó la Torre Eiffel?',
      type: 'multiple_choice',
      options: ['1887', '1889', '1891', '1885'],
      correctAnswer: 1,
      explanation: 'La Torre Eiffel fue construida en 1889.',
      points: 10
    }
  ];
  
  res.json({
    success: true,
    data: { 
      cards: mockCards, 
      total: mockCards.length,
      page: parseInt(page),
      hasMore: false 
    }
  });
});

// Also support /content/cards endpoint
app.get('/api/v1/content/cards', (req, res) => {
  console.log('📱 Cards request:', req.query);
  const { page = 1, limit = 20 } = req.query;
  const mockCards = [
    {
      id: 1,
      category: 'history',
      difficulty: 'beginner',
      title: 'La Torre Eiffel',
      content: '¿En qué año se construyó la Torre Eiffel?',
      type: 'multiple_choice',
      options: ['1887', '1889', '1891', '1885'],
      correctAnswer: 1,
      explanation: 'La Torre Eiffel fue construida en 1889.',
      points: 10
    },
    {
      id: 2,
      category: 'art',
      difficulty: 'beginner',
      title: 'La Mona Lisa',
      content: '¿Quién pintó la famosa Mona Lisa?',
      type: 'multiple_choice',
      options: ['Picasso', 'Leonardo da Vinci', 'Van Gogh', 'Monet'],
      correctAnswer: 1,
      explanation: 'Leonardo da Vinci pintó la Mona Lisa.',
      points: 10
    },
    {
      id: 3,
      category: 'music',
      difficulty: 'beginner',
      title: 'Beethoven',
      content: '¿Quién compuso la Novena Sinfonía?',
      type: 'multiple_choice',
      options: ['Mozart', 'Bach', 'Beethoven', 'Chopin'],
      correctAnswer: 2,
      explanation: 'Ludwig van Beethoven compuso la Novena Sinfonía.',
      points: 10
    }
  ];
  
  res.json({
    success: true,
    data: { 
      cards: mockCards, 
      total: mockCards.length,
      page: parseInt(page),
      hasMore: false 
    }
  });
});

// Catch all OPTIONS requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:8083');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('404 - Route not found:', req.method, req.originalUrl);
  res.status(404).json({ success: false, error: 'Route not found' });
});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 CulturaFlow Backend running on http://192.168.1.76:${PORT}`);
  console.log('✅ CORS enabled for mobile and web');
  console.log('📱 iPhone can now connect!');
  console.log('📚 All endpoints ready!');
});
