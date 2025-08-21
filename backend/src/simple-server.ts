import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:8083', 'http://localhost:19006', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'CulturaFlow Backend is running!' });
});

// Simple auth endpoints for testing
app.post('/api/v1/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Demo accounts
  if (email === 'demo@culturaflow.com' && password === 'password123') {
    return res.json({
      success: true,
      user: {
        id: 1,
        name: 'Usuario Demo',
        email: 'demo@culturaflow.com',
        level: 5,
        points: 250,
        streak: 7,
        preferredCategories: ['history', 'art', 'music']
      },
      token: 'demo-jwt-token-123',
      refreshToken: 'demo-refresh-token-456'
    });
  }
  
  if (email === 'test@culturaflow.com' && password === 'test123') {
    return res.json({
      success: true,
      user: {
        id: 2,
        name: 'Test User',
        email: 'test@culturaflow.com',
        level: 1,
        points: 0,
        streak: 0,
        preferredCategories: ['culture', 'literature']
      },
      token: 'test-jwt-token-789',
      refreshToken: 'test-refresh-token-012'
    });
  }
  
  return res.status(401).json({
    success: false,
    error: 'Credenciales incorrectas'
  });
});

app.post('/api/v1/auth/register', async (req, res) => {
  const { name, email, password, preferredCategories } = req.body;
  
  // Simple registration (no real DB)
  res.json({
    success: true,
    user: {
      id: Date.now(),
      name,
      email,
      level: 1,
      points: 0,
      streak: 0,
      preferredCategories: preferredCategories || ['history']
    },
    token: `new-user-token-${Date.now()}`,
    refreshToken: `new-user-refresh-${Date.now()}`
  });
});

// Cultural cards endpoint (with mock AI-generated content)
app.get('/api/v1/content/cards', async (req, res) => {
  const { category = 'history', difficulty = 'beginner', limit = 5 } = req.query;
  
  // Mock cultural cards
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
      explanation: 'La Torre Eiffel fue construida en 1889 para la Exposición Universal de París.',
      points: 10,
      culturalFact: 'La Torre Eiffel iba a ser temporal, pero se convirtió en el símbolo de París.'
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
      explanation: 'Leonardo da Vinci pintó la Mona Lisa entre 1503 y 1519.',
      points: 10,
      culturalFact: 'La Mona Lisa está en el Museo del Louvre desde 1797.'
    },
    {
      id: 3,
      category: 'music',
      difficulty: 'beginner',
      title: 'La Novena Sinfonía',
      content: '¿Quién compuso la Novena Sinfonía?',
      type: 'multiple_choice',
      options: ['Mozart', 'Bach', 'Beethoven', 'Chopin'],
      correctAnswer: 2,
      explanation: 'Ludwig van Beethoven compuso su Novena Sinfonía en 1824.',
      points: 10,
      culturalFact: 'Beethoven estaba completamente sordo cuando compuso esta sinfonía.'
    },
    {
      id: 4,
      category: 'literature',
      difficulty: 'beginner',
      title: 'Don Quijote',
      content: '¿Quién escribió "Don Quijote de la Mancha"?',
      type: 'multiple_choice',
      options: ['García Lorca', 'Miguel de Cervantes', 'Lope de Vega', 'Calderón'],
      correctAnswer: 1,
      explanation: 'Miguel de Cervantes escribió Don Quijote, publicado en 1605.',
      points: 10,
      culturalFact: 'Don Quijote es considerada la primera novela moderna.'
    },
    {
      id: 5,
      category: 'architecture',
      difficulty: 'beginner',
      title: 'Machu Picchu',
      content: '¿En qué país se encuentra Machu Picchu?',
      type: 'multiple_choice',
      options: ['Colombia', 'Ecuador', 'Perú', 'Bolivia'],
      correctAnswer: 2,
      explanation: 'Machu Picchu se encuentra en Perú, fue construida por los incas.',
      points: 10,
      culturalFact: 'Machu Picchu fue declarada Patrimonio de la Humanidad en 1983.'
    }
  ];
  
  // Filter by category if specified
  const filteredCards = category === 'all' 
    ? mockCards 
    : mockCards.filter(card => card.category === category);
  
  res.json({
    success: true,
    cards: filteredCards.slice(0, parseInt(limit as string)),
    total: filteredCards.length
  });
});

// Submit answer endpoint
app.post('/api/v1/interactions', async (req, res) => {
  const { cardId, selectedAnswer, userId } = req.body;
  
  // Mock response - assume answer is correct for demo
  const isCorrect = Math.random() > 0.3; // 70% chance of being correct
  const pointsEarned = isCorrect ? 10 : 0;
  
  res.json({
    success: true,
    correct: isCorrect,
    pointsEarned,
    explanation: isCorrect 
      ? '¡Correcto! Has ganado 10 puntos.' 
      : 'Incorrecto, pero sigue intentando.',
    userProgress: {
      totalPoints: 100 + pointsEarned,
      currentStreak: isCorrect ? 8 : 0,
      level: 3
    }
  });
});

// User progress endpoint
app.get('/api/v1/users/:userId/progress', async (req, res) => {
  res.json({
    success: true,
    progress: {
      level: 5,
      points: 250,
      streak: 7,
      achievements: [
        { id: 1, name: 'Primer Paso', description: 'Completaste tu primera pregunta', unlockedAt: new Date() },
        { id: 2, name: 'Racha de 7', description: 'Mantuviste una racha de 7 días', unlockedAt: new Date() }
      ],
      categoryProgress: {
        history: { level: 2, points: 80 },
        art: { level: 3, points: 120 },
        music: { level: 1, points: 50 }
      }
    }
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CulturaFlow Backend running on http://localhost:${PORT}`);
  console.log(`✅ CORS enabled for frontend at http://localhost:8083`);
  console.log(`📚 Ready for cultural learning!`);
});

export default app;