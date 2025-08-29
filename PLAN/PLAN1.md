# Personal Development App Migration Plan

## Overview
Transform the cultural learning app into a personal development platform focusing on 10 life areas with user onboarding, dashboard, themes, and progress tracking.

## 📊 Database Migration Strategy

### 1. New Personal Development Schema
- Create **personal_development_themes** table with the 10 life areas
- Update **content** table to reference themes instead of cultural categories
- Add **user_survey_responses** table for onboarding data
- Update **user_profiles** with survey completion status

### 2. Ten Life Development Areas
1. **Familia y vínculos cercanos** - Family & Close Relationships
2. **Amistades y vida social** - Friendships & Social Life  
3. **Espiritualidad o sentido trascendente** - Spirituality & Purpose
4. **Trabajo y vocación** - Work & Career
5. **Conocimiento e intelecto** - Knowledge & Learning
6. **Salud física** - Physical Health
7. **Salud mental y emocional** - Mental & Emotional Health
8. **Amor y sexualidad** - Love & Sexuality
9. **Ocio y disfrute** - Recreation & Enjoyment
10. **Entorno y pertenencia** - Environment & Belonging

## 🎯 Navigation Structure Update

### New Tab Structure
- **Dashboard** (replacing Feed) - Overview of user progress
- **Temas** (replacing Explore) - Browse themes and content
- **Configuraciones** (replacing Progress) - Settings with theme progress
- **Perfil** (keeping Profile) - User profile and achievements

## 🚀 User Onboarding System

### Survey Questions for New Users
1. Basic demographics (age, location, occupation)
2. Current life satisfaction ratings for each theme (1-10)
3. Top 3 priority areas for improvement
4. Preferred learning style (reading, interactive, video)
5. Daily time commitment goal

### Onboarding Flow
- First-time users see survey after authentication
- Survey data saved to database
- Redirected to dashboard with personalized content
- Survey completion tracked in user profile

## 📱 Screen Updates

### Dashboard Screen (New)
- User welcome with name and progress summary
- Daily streak counter and motivational message
- Quick access to recommended content
- Progress overview across all 10 themes

### Temas Screen (Theme Browser)
- Grid/list view of 10 life areas
- Each theme shows progress percentage and level
- Filter by completion status or difficulty
- Search functionality for specific topics

### Configuraciones Screen (Settings + Progress)
- Theme progress tracking with visual progress bars
- User preferences and notification settings
- Account settings
- Progress analytics and insights

### Profile Screen (Enhanced)
- Real user data from database
- Achievement badges and milestones
- Personal statistics and insights
- Edit profile functionality

## 🏗️ Implementation Steps

1. **Database Migration** - Update Supabase schema with new tables
2. **Content Migration** - Transform existing content to new themes
3. **Navigation Update** - Modify tabs and screen routing
4. **Onboarding System** - Create survey component and logic
5. **Dashboard Creation** - Build new main screen
6. **Theme Browser** - Update explore screen for themes
7. **Settings Enhancement** - Combine settings with progress tracking
8. **Profile Enhancement** - Add real user data integration
9. **Progress System** - Implement theme-based leveling
10. **Content Cards** - Update for personal development focus

## ⚡ Key Features

- **Theme Progress Tracking** - Users level up in each of the 10 areas
- **Personalized Content** - Based on survey responses and preferences  
- **Achievement System** - Badges for milestones and consistency
- **Daily Streaks** - Motivation through habit tracking
- **Real User Data** - All screens use actual Supabase data
- **One-time Onboarding** - Survey only appears for new users

This migration maintains the existing technical architecture while completely transforming the user experience and content focus to personal development across 10 key life areas.