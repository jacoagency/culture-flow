-- Supabase Database Setup for CulturaFlow App - VERSIÓN CORREGIDA
-- Execute this in Supabase SQL Editor

-- Create user profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    total_time_spent INTEGER DEFAULT 0, -- in minutes
    content_completed INTEGER DEFAULT 0,
    preferred_categories TEXT[] DEFAULT '{}',
    learning_goal INTEGER DEFAULT 15, -- minutes per day
    notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create cultural content table
CREATE TABLE IF NOT EXISTS public.cultural_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    content_type VARCHAR(20) CHECK (content_type IN ('article', 'video', 'audio', 'interactive', 'quiz')) NOT NULL,
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
    duration_minutes INTEGER DEFAULT 5,
    points_reward INTEGER DEFAULT 10,
    content_url TEXT,
    image_url TEXT,
    audio_url TEXT,
    video_url TEXT,
    facts TEXT[] DEFAULT '{}',
    quiz_questions JSONB,
    tags TEXT[] DEFAULT '{}',
    language VARCHAR(10) DEFAULT 'es',
    region VARCHAR(50),
    historical_period VARCHAR(100),
    is_trending BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create user interactions table
CREATE TABLE IF NOT EXISTS public.user_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content_id UUID REFERENCES public.cultural_content(id) ON DELETE CASCADE NOT NULL,
    interaction_type VARCHAR(20) CHECK (interaction_type IN ('view', 'like', 'save', 'share', 'complete')) NOT NULL,
    time_spent INTEGER, -- in seconds
    progress DECIMAL(5,2) DEFAULT 0, -- percentage 0-100
    score INTEGER, -- for quizzes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Unique constraint to prevent duplicate interactions of same type
    UNIQUE(user_id, content_id, interaction_type)
);

-- Create user achievements table
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    achievement_type VARCHAR(50) NOT NULL,
    achievement_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT,
    points_awarded INTEGER DEFAULT 0,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    UNIQUE(user_id, achievement_type, achievement_name)
);

-- Create content recommendations table
CREATE TABLE IF NOT EXISTS public.content_recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content_id UUID REFERENCES public.cultural_content(id) ON DELETE CASCADE NOT NULL,
    recommendation_score DECIMAL(3,2) DEFAULT 0.5, -- 0-1 score
    reason TEXT,
    clicked BOOLEAN DEFAULT false,
    dismissed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_level ON public.user_profiles(level);
CREATE INDEX IF NOT EXISTS idx_cultural_content_category ON public.cultural_content(category);
CREATE INDEX IF NOT EXISTS idx_cultural_content_difficulty ON public.cultural_content(difficulty);
CREATE INDEX IF NOT EXISTS idx_cultural_content_trending ON public.cultural_content(is_trending);
CREATE INDEX IF NOT EXISTS idx_cultural_content_created_at ON public.cultural_content(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON public.user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_content_id ON public.user_interactions(content_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON public.user_interactions(interaction_type);

-- Create RLS policies
-- User profiles: users can only access their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Cultural content: all authenticated users can read
CREATE POLICY "Authenticated users can read content" ON public.cultural_content
    FOR SELECT USING (auth.role() = 'authenticated');

-- User interactions: users can only access their own interactions
CREATE POLICY "Users can view own interactions" ON public.user_interactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interactions" ON public.user_interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interactions" ON public.user_interactions
    FOR UPDATE USING (auth.uid() = user_id);

-- User achievements: users can only view their own achievements
CREATE POLICY "Users can view own achievements" ON public.user_achievements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements" ON public.user_achievements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Content recommendations: users can only view their own recommendations
CREATE POLICY "Users can view own recommendations" ON public.content_recommendations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own recommendations" ON public.content_recommendations
    FOR UPDATE USING (auth.uid() = user_id);

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cultural_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_recommendations ENABLE ROW LEVEL SECURITY;

-- Create functions for common operations
-- Function to increment counter fields
CREATE OR REPLACE FUNCTION increment_counter(
    table_name TEXT,
    row_id UUID,
    field_name TEXT,
    increment_by INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('UPDATE %I SET %I = %I + $1 WHERE id = $2', table_name, field_name, field_name)
    USING increment_by, row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment user points
CREATE OR REPLACE FUNCTION increment_user_points(
    user_id UUID,
    points_to_add INTEGER
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.user_profiles 
    SET points = points + points_to_add,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = user_id;
    
    -- Check for level up (every 1000 points = 1 level)
    UPDATE public.user_profiles 
    SET level = (points / 1000) + 1
    WHERE id = user_id AND level < (points / 1000) + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user streak
CREATE OR REPLACE FUNCTION update_user_streak(user_id UUID)
RETURNS VOID AS $$
DECLARE
    last_interaction_date DATE;
    today DATE := CURRENT_DATE;
BEGIN
    -- Get last interaction date
    SELECT DATE(MAX(created_at)) INTO last_interaction_date
    FROM public.user_interactions
    WHERE user_interactions.user_id = update_user_streak.user_id
    AND interaction_type = 'complete';
    
    -- Update streak logic
    IF last_interaction_date = today - INTERVAL '1 day' THEN
        -- Continue streak
        UPDATE public.user_profiles 
        SET current_streak = current_streak + 1,
            best_streak = GREATEST(best_streak, current_streak + 1),
            updated_at = TIMEZONE('utc'::text, NOW())
        WHERE id = user_id;
    ELSIF last_interaction_date = today THEN
        -- Same day, no change needed
        NULL;
    ELSE
        -- Reset streak
        UPDATE public.user_profiles 
        SET current_streak = 1,
            updated_at = TIMEZONE('utc'::text, NOW())
        WHERE id = user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language plpgsql;

-- Apply the trigger to relevant tables
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cultural_content_updated_at BEFORE UPDATE ON public.cultural_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Success message
SELECT 'Base de datos configurada exitosamente! Ahora ejecuta supabase_seed_data.sql' as mensaje;