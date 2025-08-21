import { PrismaClient, ContentCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const sampleContent = [
  {
    title: "The Renaissance: Birth of Modern Art",
    description: "Explore how the Renaissance period revolutionized art, introducing perspective, humanism, and new techniques that shaped Western culture.",
    content: {
      sections: [
        {
          type: "text",
          content: "The Renaissance marked a pivotal moment in art history, transitioning from medieval traditions to innovative approaches that emphasized realism and human emotion."
        },
        {
          type: "image",
          url: "/images/renaissance-art.jpg",
          caption: "Famous Renaissance artworks showcasing perspective and humanism"
        }
      ],
      quiz: [
        {
          question: "Which technique was perfected during the Renaissance?",
          options: ["Linear perspective", "Abstract expressionism", "Pointillism", "Cubism"],
          correctAnswer: 0
        }
      ]
    },
    category: ContentCategory.ART,
    subcategory: "Renaissance Art",
    difficulty: 2,
    estimatedTime: 180,
    tags: ["renaissance", "art history", "perspective", "humanism"],
    language: "en",
    isFeatured: true,
  },
  {
    title: "Ancient Greek Philosophy: Foundation of Western Thought",
    description: "Discover the philosophical ideas of Socrates, Plato, and Aristotle that continue to influence modern thinking.",
    content: {
      sections: [
        {
          type: "text",
          content: "Ancient Greek philosophers laid the groundwork for Western philosophy, introducing concepts of ethics, logic, and metaphysics that remain relevant today."
        }
      ],
      quiz: [
        {
          question: "Who was known for the Socratic method?",
          options: ["Plato", "Aristotle", "Socrates", "Epicurus"],
          correctAnswer: 2
        }
      ]
    },
    category: ContentCategory.PHILOSOPHY,
    subcategory: "Ancient Philosophy",
    difficulty: 3,
    estimatedTime: 240,
    tags: ["philosophy", "ancient greece", "socrates", "logic"],
    language: "en",
    isFeatured: true,
  },
  {
    title: "Baroque Architecture: Drama in Stone",
    description: "Learn about the ornate and dramatic architectural style that emerged in 17th century Europe.",
    content: {
      sections: [
        {
          type: "text",
          content: "Baroque architecture emphasized grandeur, drama, and emotional intensity through elaborate ornamentation and dynamic forms."
        }
      ]
    },
    category: ContentCategory.ARCHITECTURE,
    subcategory: "Baroque",
    difficulty: 2,
    estimatedTime: 150,
    tags: ["baroque", "architecture", "17th century", "ornamentation"],
    language: "en",
  },
  {
    title: "Jazz Origins: From New Orleans to the World",
    description: "Trace the roots of jazz music from its origins in New Orleans to its global influence.",
    content: {
      sections: [
        {
          type: "text",
          content: "Jazz emerged in New Orleans in the late 19th century, blending African American musical traditions with European harmonies."
        }
      ]
    },
    category: ContentCategory.MUSIC,
    subcategory: "Jazz",
    difficulty: 2,
    estimatedTime: 200,
    tags: ["jazz", "music history", "new orleans", "african american"],
    language: "en",
    isFeatured: true,
  },
  {
    title: "Shakespeare's Globe: Theater Revolution",
    description: "Explore how Shakespeare and the Globe Theatre transformed English drama and literature.",
    content: {
      sections: [
        {
          type: "text",
          content: "The Globe Theatre served as the stage for many of Shakespeare's greatest works, revolutionizing English drama."
        }
      ]
    },
    category: ContentCategory.LITERATURE,
    subcategory: "Elizabethan Drama",
    difficulty: 3,
    estimatedTime: 220,
    tags: ["shakespeare", "theater", "literature", "elizabethan"],
    language: "en",
  }
];

const achievements = [
  {
    name: "First Steps",
    description: "Complete your first cultural content",
    category: "beginner",
    icon: "🎯",
    points: 50,
    rarity: "common",
    condition: { type: "complete_content", count: 1 },
  },
  {
    name: "Art Enthusiast",
    description: "Complete 10 art-related content pieces",
    category: "art",
    icon: "🎨",
    points: 200,
    rarity: "rare",
    condition: { type: "complete_category", category: "ART", count: 10 },
  },
  {
    name: "Philosophy Scholar",
    description: "Complete 5 philosophy content pieces",
    category: "philosophy",
    icon: "💭",
    points: 150,
    rarity: "rare",
    condition: { type: "complete_category", category: "PHILOSOPHY", count: 5 },
  },
  {
    name: "Daily Learner",
    description: "Maintain a 7-day learning streak",
    category: "streak",
    icon: "🔥",
    points: 300,
    rarity: "epic",
    condition: { type: "daily_streak", count: 7 },
  },
  {
    name: "Culture Master",
    description: "Complete content from all 10 categories",
    category: "master",
    icon: "👑",
    points: 1000,
    rarity: "legendary",
    condition: { type: "complete_all_categories", count: 10 },
  }
];

async function createSampleUsers() {
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const users = [
    {
      email: 'demo@culturaflow.com',
      username: 'demo_user',
      password: hashedPassword,
      firstName: 'Demo',
      lastName: 'User',
      isVerified: true,
      language: 'en',
    },
    {
      email: 'admin@culturaflow.com',
      username: 'admin',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      isVerified: true,
      language: 'en',
    }
  ];

  for (const userData of users) {
    const user = await prisma.user.create({
      data: userData,
    });

    // Create user profile
    await prisma.userProfile.create({
      data: {
        userId: user.id,
        interests: ['art', 'history', 'philosophy'],
        learningGoals: ['daily_learning', 'cultural_knowledge'],
        preferredCategories: ['ART', 'HISTORY', 'PHILOSOPHY'],
        difficultyLevel: 2,
        dailyGoalMinutes: 30,
      },
    });

    // Create user streak
    await prisma.userStreak.create({
      data: {
        userId: user.id,
        category: 'daily',
        currentStreak: 0,
        longestStreak: 0,
      },
    });

    console.log(`Created user: ${user.email}`);
  }
}

async function seed() {
  try {
    console.log('🌱 Starting database seed...');

    // Clean existing data in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('🧹 Cleaning existing data...');
      await prisma.userRecommendation.deleteMany();
      await prisma.userAnalytics.deleteMany();
      await prisma.userAchievement.deleteMany();
      await prisma.achievement.deleteMany();
      await prisma.userStreak.deleteMany();
      await prisma.userProgress.deleteMany();
      await prisma.contentInteraction.deleteMany();
      await prisma.userSession.deleteMany();
      await prisma.userProfile.deleteMany();
      await prisma.culturalContent.deleteMany();
      await prisma.user.deleteMany();
    }

    // Create achievements
    console.log('🏆 Creating achievements...');
    for (const achievementData of achievements) {
      await prisma.achievement.create({
        data: achievementData,
      });
    }

    // Create cultural content
    console.log('📚 Creating cultural content...');
    for (const contentData of sampleContent) {
      await prisma.culturalContent.create({
        data: contentData,
      });
    }

    // Create sample users
    console.log('👤 Creating sample users...');
    await createSampleUsers();

    // Create app configuration
    console.log('⚙️ Creating app configuration...');
    const appConfigs = [
      {
        key: 'app_version',
        value: { version: '1.0.0', build: 1 },
        description: 'Current app version',
      },
      {
        key: 'maintenance_mode',
        value: { enabled: false, message: 'App is under maintenance' },
        description: 'Maintenance mode settings',
      },
      {
        key: 'feature_flags',
        value: { 
          recommendations: true, 
          ai_content: true, 
          social_features: false 
        },
        description: 'Feature flags for app functionality',
      }
    ];

    for (const config of appConfigs) {
      await prisma.appConfig.create({
        data: config,
      });
    }

    console.log('✅ Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`- ${achievements.length} achievements created`);
    console.log(`- ${sampleContent.length} content pieces created`);
    console.log(`- 2 sample users created`);
    console.log(`- ${appConfigs.length} app configs created`);
    
    console.log('\n🔑 Sample login credentials:');
    console.log('Email: demo@culturaflow.com');
    console.log('Password: password123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seed if called directly
if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default seed;