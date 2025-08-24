# Configuración de Supabase para CulturaFlow

## 📋 Pasos para configurar Supabase

### 1. Configurar la Base de Datos

1. **Ve a tu proyecto de Supabase**: https://supabase.com/dashboard/project/jehxmrcveflxygeoqqjo

2. **Ejecuta el setup de la base de datos**:
   - Ve a **SQL Editor** en tu dashboard de Supabase
   - Ejecuta el contenido del archivo `supabase_setup.sql` 
   - Esto creará todas las tablas, índices, políticas RLS y funciones necesarias

3. **Poblar con datos iniciales**:
   - Después del setup, ejecuta el contenido del archivo `supabase_seed_data.sql`
   - Esto agregará contenido cultural inicial para que la app funcione inmediatamente

### 2. Configurar Autenticación

1. **Ve a Authentication > Settings**
2. **Configura las siguientes opciones**:
   - Enable email confirmations: `Disabled` (para desarrollo)
   - Enable phone confirmations: `Disabled`
   - Enable secure email change: `Enabled`

### 3. Configurar Storage (Opcional)

Si quieres subir imágenes:

1. **Ve a Storage**
2. **Crea un bucket llamado** `content-images`
3. **Configura las políticas**:
   ```sql
   -- Permitir lectura pública de imágenes
   CREATE POLICY "Public Access" ON storage.objects
   FOR SELECT USING ( bucket_id = 'content-images' );
   
   -- Permitir subida para usuarios autenticados
   CREATE POLICY "Authenticated users can upload" ON storage.objects
   FOR INSERT WITH CHECK ( bucket_id = 'content-images' AND auth.role() = 'authenticated' );
   ```

### 4. Verificar Variables de Entorno

El archivo `.env` ya está configurado con:
```
EXPO_PUBLIC_SUPABASE_URL=https://jehxmrcveflxygeoqqjo.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplaHhtcmN2ZWZseHlnZW9xcWpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc2NTA0MjcsImV4cCI6MjA1MzIyNjQyN30.nKpOJ8S4VQO8rORvSmLRZPNB5_JFXdGtxeBBL5JfKpo
```

### 5. Probar la Aplicación

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Ejecutar la app**:
   ```bash
   npm start
   ```

3. **Crear una cuenta de prueba**:
   - Usa cualquier email válido
   - La confirmación por email está deshabilitada para desarrollo
   - El usuario se creará automáticamente en la tabla `user_profiles`

### 6. Verificar el Funcionamiento

Después de configurar todo, deberías poder:

✅ **Registrarte/Iniciar sesión** con email y contraseña
✅ **Ver contenido cultural** en el feed principal  
✅ **Explorar categorías** (Arte, Historia, Música, etc.)
✅ **Buscar contenido** por título, descripción o tags
✅ **Ganar puntos** al interactuar con contenido
✅ **Ver tu progreso** en la pantalla de perfil

## 🗃️ Estructura de la Base de Datos

### Tablas Principales:

- **`user_profiles`**: Perfiles de usuario con puntos, nivel, rachas
- **`cultural_content`**: Todo el contenido cultural (artículos, videos, quizzes)
- **`user_interactions`**: Interacciones del usuario (likes, saves, vistas, completados)
- **`user_achievements`**: Logros desbloqueados por el usuario
- **`content_recommendations`**: Recomendaciones personalizadas

### Categorías de Contenido:

- 🎨 **Arte y Arquitectura**
- 🏛️ **Historia**
- 🎵 **Música**
- 📚 **Literatura**
- 🍽️ **Gastronomía**
- 🎭 **Tradiciones**
- 🔬 **Ciencia y Tecnología**
- 🗺️ **Geografía Cultural**

## 🔧 Funcionalidades Implementadas

### Autenticación con Supabase Auth
- Registro y login seguro
- Manejo automático de sesiones
- Row Level Security (RLS) habilitado

### Feed Inteligente
- Algoritmo de recomendaciones basado en preferencias
- Contenido trending mezclado
- Filtrado por nivel de usuario
- Carga infinita

### Sistema de Gamificación
- Puntos por interacciones
- Niveles basados en puntos
- Sistema de rachas diarias
- Logros desbloqueables

### Exploración de Contenido
- 8 categorías culturales
- Búsqueda avanzada
- Contenido destacado
- Vista previa de tarjetas

### Seguimiento de Progreso
- Estadísticas detalladas
- Progreso por categoría
- Metas diarias y semanales
- Historial de actividad

## 📱 Próximos Pasos para Despliegue

### Para Android/iOS:
```bash
# Configurar EAS Build
npm install -g @expo/cli
npx create-expo-app --template
eas login
eas build --platform all
```

### Variables de Entorno para Producción:
- Considera usar un proyecto Supabase separado para producción
- Actualiza las URLs y keys en el archivo `.env`
- Habilita confirmación por email para usuarios reales

## 🆘 Solución de Problemas Comunes

### Error de CORS
- ✅ **Solucionado**: Ahora usamos Supabase directamente, no hay problemas de CORS

### Error de Autenticación
- Verifica que las tablas estén creadas correctamente
- Revisa que RLS esté habilitado
- Confirma que las políticas de seguridad estén activas

### Contenido no carga
- Ejecuta el script `supabase_seed_data.sql` para agregar contenido inicial
- Verifica que el usuario tenga preferencias configuradas

### Problemas con el Build
- Asegúrate de que todas las dependencias estén instaladas
- Verifica que el polyfill de URL esté importado en App.tsx

---

¡Tu app CulturaFlow está lista para funcionar con Supabase! 🎉