-- SCRIPT SÚPER SIMPLE PARA LIMPIAR - SIN COMPLICACIONES
-- Ejecuta esto para limpiar las tablas que tienes

-- Eliminar tablas existentes (en orden para evitar problemas de dependencias)
DROP TABLE IF EXISTS public.user_recommendations CASCADE;
DROP TABLE IF EXISTS public.user_streaks CASCADE;
DROP TABLE IF EXISTS public.user_progress CASCADE;
DROP TABLE IF EXISTS public.user_analytics CASCADE;
DROP TABLE IF EXISTS public.user_achievements CASCADE;
DROP TABLE IF EXISTS public.content_interactions CASCADE;
DROP TABLE IF EXISTS public.content_queue CASCADE;
DROP TABLE IF EXISTS public.cultural_content CASCADE;
DROP TABLE IF EXISTS public.achievements CASCADE;
DROP TABLE IF EXISTS public.app_config CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Eliminar tablas de nuestro nuevo sistema también (por si acaso)
DROP TABLE IF EXISTS public.content_recommendations CASCADE;

-- Mensaje de confirmación
SELECT 'TODAS LAS TABLAS ELIMINADAS EXITOSAMENTE! Ahora ejecuta supabase_setup.sql' as mensaje;