-- Personal Development App Migration
-- This script migrates the cultural learning app to a personal development platform

-- =============================================
-- 1. CREATE NEW TABLES FOR PERSONAL DEVELOPMENT
-- =============================================

-- Create personal development themes table
CREATE TABLE IF NOT EXISTS personal_development_themes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7), -- Hex color code
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user survey responses table for onboarding
CREATE TABLE IF NOT EXISTS user_survey_responses (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    age_range VARCHAR(20),
    location VARCHAR(100),
    occupation VARCHAR(100),
    theme_ratings JSONB, -- Store 1-10 ratings for each theme
    priority_themes INTEGER[], -- Array of theme IDs (top 3)
    learning_style VARCHAR(50), -- 'reading', 'interactive', 'video'
    daily_commitment_minutes INTEGER,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Add survey completion status to user profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS survey_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Create theme progress tracking table
CREATE TABLE IF NOT EXISTS user_theme_progress (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    theme_id INTEGER REFERENCES personal_development_themes(id) ON DELETE CASCADE,
    level INTEGER DEFAULT 1,
    experience_points INTEGER DEFAULT 0,
    content_completed INTEGER DEFAULT 0,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, theme_id)
);

-- =============================================
-- 2. INSERT PERSONAL DEVELOPMENT THEMES
-- =============================================

INSERT INTO personal_development_themes (name, description, icon, color, order_index) VALUES
('Familia y vínculos cercanos', 'Fortalece las relaciones con tu familia y seres queridos más cercanos', 'heart', '#e74c3c', 1),
('Amistades y vida social', 'Desarrolla habilidades sociales y cultiva amistades significativas', 'users', '#3498db', 2),
('Espiritualidad o sentido trascendente', 'Explora tu propósito y conexión con algo más grande', 'compass', '#9b59b6', 3),
('Trabajo y vocación', 'Desarrolla tu carrera profesional y encuentra tu vocación', 'briefcase', '#2c3e50', 4),
('Conocimiento e intelecto', 'Expande tu mente y desarrolla nuevas habilidades intelectuales', 'book', '#e67e22', 5),
('Salud física', 'Cuida tu cuerpo y desarrolla hábitos de vida saludables', 'activity', '#27ae60', 6),
('Salud mental y emocional', 'Fortalece tu bienestar emocional y salud mental', 'brain', '#f39c12', 7),
('Amor y sexualidad', 'Desarrolla relaciones románticas saludables y plenas', 'heart-hands', '#e91e63', 8),
('Ocio y disfrute', 'Encuentra equilibrio a través del descanso y actividades placenteras', 'smile', '#00bcd4', 9),
('Entorno y pertenencia', 'Conecta con tu comunidad y crea un entorno que te nutra', 'home', '#4caf50', 10);

-- =============================================
-- 3. UPDATE EXISTING CONTENT TABLE
-- =============================================

-- Add theme_id to content table and remove old cultural categories
ALTER TABLE cultural_content 
ADD COLUMN IF NOT EXISTS theme_id INTEGER REFERENCES personal_development_themes(id),
ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(20) DEFAULT 'beginner', -- beginner, intermediate, advanced
ADD COLUMN IF NOT EXISTS estimated_duration INTEGER DEFAULT 5; -- minutes to complete

-- Update content type to be more generic
ALTER TABLE cultural_content 
ALTER COLUMN type TYPE VARCHAR(50);

-- =============================================
-- 4. MIGRATE EXISTING CULTURAL CONTENT TO THEMES
-- =============================================

-- Map existing cultural categories to new themes
UPDATE cultural_content SET theme_id = 5, difficulty_level = 'intermediate' WHERE category = 'Arte';
UPDATE cultural_content SET theme_id = 5, difficulty_level = 'intermediate' WHERE category = 'Historia';
UPDATE cultural_content SET theme_id = 9, difficulty_level = 'beginner' WHERE category = 'Música';
UPDATE cultural_content SET theme_id = 5, difficulty_level = 'intermediate' WHERE category = 'Literatura';
UPDATE cultural_content SET theme_id = 6, difficulty_level = 'beginner' WHERE category = 'Gastronomía';
UPDATE cultural_content SET theme_id = 10, difficulty_level = 'intermediate' WHERE category = 'Tradiciones';
UPDATE cultural_content SET theme_id = 5, difficulty_level = 'advanced' WHERE category = 'Ciencia';
UPDATE cultural_content SET theme_id = 5, difficulty_level = 'intermediate' WHERE category = 'Geografía';

-- Update content titles and descriptions to be more personal development focused
UPDATE cultural_content SET 
    title = CASE category
        WHEN 'Arte' THEN 'Desarrolla tu creatividad y expresión artística'
        WHEN 'Historia' THEN 'Aprende de la historia para crecer personalmente'
        WHEN 'Música' THEN 'La música como herramienta de bienestar'
        WHEN 'Literatura' THEN 'Lectura para el crecimiento personal'
        WHEN 'Gastronomía' THEN 'Alimentación consciente y saludable'
        WHEN 'Tradiciones' THEN 'Conecta con tu identidad y raíces'
        WHEN 'Ciencia' THEN 'Desarrolla pensamiento crítico y curiosidad'
        WHEN 'Geografía' THEN 'Amplía tu perspectiva del mundo'
        ELSE title
    END;

-- =============================================
-- 5. CREATE RLS POLICIES FOR NEW TABLES
-- =============================================

-- Enable RLS on new tables
ALTER TABLE personal_development_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_theme_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for personal_development_themes (public read access)
CREATE POLICY "Anyone can view themes" ON personal_development_themes
    FOR SELECT USING (true);

-- RLS policies for user_survey_responses (users can only access their own)
CREATE POLICY "Users can view own survey responses" ON user_survey_responses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own survey responses" ON user_survey_responses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own survey responses" ON user_survey_responses
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for user_theme_progress (users can only access their own)
CREATE POLICY "Users can view own theme progress" ON user_theme_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own theme progress" ON user_theme_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own theme progress" ON user_theme_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_user_survey_responses_user_id ON user_survey_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_theme_progress_user_id ON user_theme_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_theme_progress_theme_id ON user_theme_progress(theme_id);
CREATE INDEX IF NOT EXISTS idx_cultural_content_theme_id ON cultural_content(theme_id);
CREATE INDEX IF NOT EXISTS idx_personal_development_themes_order ON personal_development_themes(order_index);

-- =============================================
-- 7. CREATE HELPER FUNCTIONS
-- =============================================

-- Function to initialize theme progress for new users
CREATE OR REPLACE FUNCTION initialize_user_theme_progress(user_uuid UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO user_theme_progress (user_id, theme_id, level, experience_points)
    SELECT user_uuid, id, 1, 0
    FROM personal_development_themes
    ON CONFLICT (user_id, theme_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate theme level from experience points
CREATE OR REPLACE FUNCTION calculate_theme_level(exp_points INTEGER)
RETURNS INTEGER AS $$
BEGIN
    -- Level progression: Level 1 = 0-99 XP, Level 2 = 100-299 XP, Level 3 = 300-599 XP, etc.
    RETURN GREATEST(1, FLOOR(SQRT(exp_points / 100)) + 1);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user theme level when experience points change
CREATE OR REPLACE FUNCTION update_theme_level()
RETURNS trigger AS $$
BEGIN
    NEW.level := calculate_theme_level(NEW.experience_points);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_theme_level
    BEFORE UPDATE ON user_theme_progress
    FOR EACH ROW
    WHEN (OLD.experience_points IS DISTINCT FROM NEW.experience_points)
    EXECUTE FUNCTION update_theme_level();

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- Add some sample personal development content
INSERT INTO cultural_content (title, description, content, type, theme_id, difficulty_level, estimated_duration) VALUES
('Construyendo relaciones familiares sólidas', 'Aprende estrategias para fortalecer los vínculos con tu familia', 'Las relaciones familiares son la base de nuestro bienestar emocional. Aquí encontrarás técnicas de comunicación, resolución de conflictos y creación de momentos de calidad que fortalecerán estos vínculos esenciales.', 'article', 1, 'beginner', 8),
('El arte de hacer amigos auténticos', 'Desarrolla habilidades para crear y mantener amistades significativas', 'La amistad es un arte que se puede aprender. Descubre cómo ser un mejor amigo, establecer límites saludables y crear conexiones profundas y duraderas.', 'article', 2, 'intermediate', 10),
('Encontrando tu propósito de vida', 'Reflexiona sobre tu misión personal y valores fundamentales', 'El propósito da sentido a nuestras acciones. A través de ejercicios de reflexión y autoconocimiento, explorarás qué te motiva verdaderamente y cómo alinear tu vida con tus valores más profundos.', 'interactive', 3, 'advanced', 15);