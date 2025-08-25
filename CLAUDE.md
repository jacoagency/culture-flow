# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CulturaFlow is a React Native/Expo educational app focused on cultural learning, similar to Duolingo but for cultural content. It features a TikTok-style feed, gamification system, and Supabase backend integration.

## Development Commands

### Start Development Server
```bash
# Start Expo development server (uses port 8000)
npm start

# Web development (localhost:8000)
npm run web

# iOS Simulator
npm run ios

# Android Emulator  
npm run android
```

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Architecture & Structure

### Core Architecture Patterns

**Two-Phase Authentication Strategy**: The app implements a non-blocking authentication flow where users can access the app immediately with basic auth data while user profiles are fetched in the background. This prevents loading screens and improves UX.

**Supabase Integration**: Uses Supabase for authentication, database, and real-time features with Row Level Security (RLS) enabled. The app supports both web and mobile platforms with platform-specific configuration.

**Navigation Structure**: Nested navigation with Stack (main navigation) containing Tabs (bottom navigation). Main screens are accessible via tabs, with modal-style detail screens in the stack.

**State Management**: React Context for authentication state, custom hooks for data management, and Supabase real-time subscriptions for live updates.

### Key Components & Services

**Authentication Flow** (`src/contexts/AuthContext.tsx` + `src/services/supabaseAuth.ts`):
- Uses a two-phase approach: immediate basic user creation from auth data, followed by background profile creation/fetch
- Prevents blocking on profile operations that could cause loading issues
- Handles auth state changes with Supabase's onAuthStateChange listener
- Creates user profiles in `user_profiles` table with gamification data (points, level, streaks)

**Content Management** (`src/services/supabaseContent.ts` + `src/hooks/useContent.ts`):
- Handles cultural content CRUD operations
- Implements recommendation algorithms based on user preferences and interactions
- Supports content categories: Arte, Historia, Música, Literatura, Gastronomía, Tradiciones, Ciencia, Geografía
- Real-time content loading with infinite scroll patterns

**Gamification System** (`src/hooks/useProgressData.ts`):
- Points system based on user interactions (views, likes, saves, completions)
- Level progression calculated from total points
- Daily/weekly streak tracking with reset logic
- Achievement system with unlockable badges
- Progress analytics by category and time periods

**Mobile Connectivity** (`src/utils/connectivity.ts` + `src/config/supabase.ts`):
- Platform-aware Supabase client configuration
- Mobile-specific network security configurations (iOS Info.plist, Android network config)
- Environment variable handling for web vs mobile (Expo Constants vs process.env)
- Connectivity testing utilities for debugging connection issues

### Database Schema

**Core Tables**:
- `user_profiles`: Extended user data with gamification (points, level, streaks, preferences)
- `cultural_content`: Cultural articles, quizzes, and educational content
- `user_interactions`: User engagement tracking (likes, saves, views, completions)
- `user_achievements`: Unlocked achievements and badges
- `content_recommendations`: Personalized content suggestions

**Row Level Security (RLS)**: All tables have RLS policies ensuring users can only access their own data or public content.

## Critical Implementation Details

### Supabase Configuration

The app uses platform-specific credential loading in `src/config/supabase.ts`:
- **Web**: Uses `process.env.EXPO_PUBLIC_*` variables
- **Mobile**: Uses `Constants.expoConfig.extra.*` from `app.json`
- **Fallback**: Environment variables if Expo constants unavailable

Mobile network configuration requires:
- iOS: NSAppTransportSecurity domains in `app.json`
- Android: Network security config XML file
- Proper HTTPS/TLS settings for Supabase domains

### Authentication Implementation

**Critical**: The authentication system uses a two-phase approach to prevent blocking:

1. **Phase 1**: Immediate user creation from Supabase auth response
2. **Phase 2**: Background profile creation/fetch without blocking login

This pattern is implemented in `AuthContext.tsx` lines 46-70 and prevents the "loading forever" issues that occurred with blocking profile operations.

### Data Consistency

**Important**: The app transitioned from mock data to real Supabase integration. Ensure:
- No `Math.random()` calls for generating fake data
- All screens use real user data from `useAuth()` and `useProgressData()`
- Progress calculations are based on actual user interactions, not generated values

### Navigation Flow

```
Stack Navigator (AppNavigator)
├── main (TabNavigator)
│   ├── feed (FeedScreen)
│   ├── explore (ExploreScreen)
│   ├── progress (ProgressScreen)
│   └── profile (ProfileScreen)
└── content-detail (ContentDetailScreen)
```

Content cards navigate to detail screens using:
```typescript
navigation.navigate('content-detail' as never, { contentId, content } as never);
```

## Environment Setup

### Required Environment Variables
```env
EXPO_PUBLIC_SUPABASE_URL=https://jehxmrcveflxygeoqqjo.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[anon_key]
```

### Mobile Configuration
Environment variables for mobile are configured in `app.json` under `expo.extra`:
```json
{
  "extra": {
    "supabaseUrl": "https://jehxmrcveflxygeoqqjo.supabase.co",
    "supabaseAnonKey": "[anon_key]"
  }
}
```

### Database Setup
Execute SQL files in order:
1. `supabase_cleanup_simple.sql` (clean existing data)  
2. `supabase_setup_fixed.sql` (create tables and RLS policies)
3. `supabase_seed_data.sql` (add initial content)

## Common Issues & Solutions

### Mobile "Could not connect to server" Error
This indicates Supabase connectivity issues. Check:
- Environment variables are properly configured in `app.json`
- iOS network security allows Supabase domains
- Android network security config exists and is referenced
- Run connectivity test with `src/utils/connectivity.ts`

### Authentication Loading Issues  
If auth gets stuck loading, verify:
- Two-phase auth implementation is not blocking on profile operations
- RLS policies allow user profile creation
- Supabase auth is properly configured (email confirmation disabled for development)

### Hardcoded Data Still Showing
Ensure screens use real data sources:
- `ProgressScreen`: Uses `useProgressData()` hook
- `ProfileScreen`: Uses `useAuth()` for user data
- No `mockUser` imports or `Math.random()` calls

### Port Conflicts
Expo is configured to use port 8000. If conflicts occur:
```bash
pkill -f "expo start"  # Kill existing processes
npm start              # Restart on port 8000
```

## Testing Strategy

The app includes comprehensive testing setup:
- Jest configuration for React Native testing
- Testing Library React Native for component testing
- Mock implementations for Supabase and external services
- Test utilities in `src/__tests__/setup.ts`

Key areas to test:
- Authentication flows and state management
- Content loading and recommendation logic
- Gamification calculations and progress tracking
- Navigation between screens and content details