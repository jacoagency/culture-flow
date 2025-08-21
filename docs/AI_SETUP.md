# 🤖 AI Configuration for CulturaFlow

CulturaFlow soporta múltiples proveedores de AI para la generación de contenido cultural y recomendaciones personalizadas.

## 🧠 LLM Actual: Claude Sonnet 4

Actualmente estás usando **Claude Sonnet 4** (`claude-sonnet-4-20250514`) para el desarrollo de esta aplicación.

## 🔧 Configuración de AI Providers

### 1. Anthropic Claude (Recomendado)

```bash
# En backend/.env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your-anthropic-api-key-here
ANTHROPIC_MODEL=claude-3-sonnet-20240229
```

**Modelos Disponibles:**
- `claude-3-opus-20240229` - Más potente, más caro
- `claude-3-sonnet-20240229` - Balance perfecto (recomendado)
- `claude-3-haiku-20240307` - Más rápido, menos costo

### 2. OpenAI GPT (Alternativa)

```bash
# En backend/.env
AI_PROVIDER=openai
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4-turbo-preview
```

**Modelos Disponibles:**
- `gpt-4-turbo-preview` - Más potente
- `gpt-3.5-turbo` - Más económico

## 🚀 Setup Rápido

### Opción 1: Usar Claude (Recomendado)

1. **Obtén tu API key:**
   ```bash
   # Visita: https://console.anthropic.com/
   # Crea una cuenta y genera tu API key
   ```

2. **Configura las variables:**
   ```bash
   cd backend
   cp .env.example .env
   
   # Edita .env:
   AI_PROVIDER=anthropic
   ANTHROPIC_API_KEY=tu-api-key-aqui
   ANTHROPIC_MODEL=claude-3-sonnet-20240229
   ```

3. **Instala dependencias:**
   ```bash
   npm install @anthropic-ai/sdk
   ```

### Opción 2: Usar OpenAI

1. **Obtén tu API key:**
   ```bash
   # Visita: https://platform.openai.com/api-keys
   # Genera tu API key
   ```

2. **Configura las variables:**
   ```bash
   cd backend
   cp .env.example .env
   
   # Edita .env:
   AI_PROVIDER=openai
   OPENAI_API_KEY=tu-api-key-aqui
   OPENAI_MODEL=gpt-4-turbo-preview
   ```

3. **Instala dependencias:**
   ```bash
   npm install openai
   ```

## 📊 Uso de AI en CulturaFlow

### 1. Generación de Contenido Cultural

El AI genera contenido educativo para 6 categorías:

- **🏛️ Historia:** Eventos históricos, personajes, civilizaciones
- **🎨 Arte:** Pinturas, esculturas, movimientos artísticos
- **🎵 Música:** Compositores, géneros, historia musical
- **📚 Literatura:** Autores, obras, movimientos literarios
- **🏗️ Arquitectura:** Estilos, edificios famosos, arquitectos
- **🎭 Cultura:** Tradiciones, festivales, fenómenos culturales

### 2. Sistema de Recomendaciones

El AI analiza:
- Preferencias del usuario
- Historial de contenido consumido
- Patrones de interacción
- Nivel de dificultad preferido

### 3. Personalización Inteligente

- **Adaptación de dificultad:** Contenido ajustado al nivel del usuario
- **Recomendaciones contextuales:** Basadas en horario y comportamiento
- **Diversidad cultural:** Exposición balanceada a diferentes culturas
- **Progresión adaptativa:** Incremento gradual de complejidad

## 🔒 Mejores Prácticas

### 1. Seguridad
```bash
# NUNCA hagas commit de las API keys
echo ".env" >> .gitignore

# Usa variables de entorno en producción
export ANTHROPIC_API_KEY="your-key-here"
```

### 2. Rate Limiting
```bash
# Configura límites apropiados
RATE_LIMIT_AI_REQUESTS=50  # Por minuto
RATE_LIMIT_AI_WINDOW=60000 # 1 minuto
```

### 3. Caching
```bash
# Cache responses para optimizar costos
AI_CACHE_TTL=3600  # 1 hora
AI_CACHE_ENABLED=true
```

### 4. Monitoreo
```bash
# Trackea uso y costos
AI_USAGE_TRACKING=true
AI_COST_ALERTS=true
AI_DAILY_LIMIT=100  # $ por día
```

## 🧪 Testing Local

```bash
# Test la configuración de AI
cd backend
npm run test:ai

# Genera contenido de prueba
curl -X POST http://localhost:3000/api/v1/admin/generate-content \
  -H "Content-Type: application/json" \
  -d '{"category":"history","difficulty":2,"topic":"Renaissance"}'
```

## 📈 Monitoreo de Uso

### Dashboard de AI
```bash
# Endpoint para estadísticas
GET /api/v1/admin/ai-stats

# Respuesta:
{
  "provider": "anthropic",
  "model": "claude-3-sonnet-20240229",
  "requests_today": 245,
  "tokens_used": 125000,
  "estimated_cost": 15.50,
  "cache_hit_rate": 0.75
}
```

### Alertas de Costos
```bash
# Configura alertas automáticas
AI_COST_ALERT_THRESHOLD=50  # $50 por día
AI_COST_ALERT_EMAIL=admin@culturaflow.com
```

## 🚨 Troubleshooting

### Error: "API Key Invalid"
```bash
# Verifica tu API key
export ANTHROPIC_API_KEY="your-key"
node -e "console.log(process.env.ANTHROPIC_API_KEY)"
```

### Error: "Rate Limit Exceeded"
```bash
# Reduce frecuencia de requests
AI_REQUEST_DELAY=2000  # 2 segundos entre requests
AI_BATCH_SIZE=5        # Procesar en lotes pequeños
```

### Error: "Model Not Found"
```bash
# Verifica el nombre del modelo
ANTHROPIC_MODEL=claude-3-sonnet-20240229  # Correcto
ANTHROPIC_MODEL=claude-sonnet-4-20250514  # Solo disponible via API web
```

## 🔄 Cambio de Proveedor

Para cambiar de Claude a OpenAI o viceversa:

```bash
# 1. Actualiza las variables de entorno
AI_PROVIDER=openai  # o anthropic

# 2. Instala las dependencias necesarias
npm install openai  # o @anthropic-ai/sdk

# 3. Reinicia el servidor
npm run dev

# 4. Verifica que funcione
curl http://localhost:3000/api/v1/health/ai
```

---

**📋 Checklist de Setup:**
- [ ] API key configurada
- [ ] Variables de entorno establecidas
- [ ] Dependencias instaladas
- [ ] Rate limiting configurado
- [ ] Monitoreo activado
- [ ] Tests pasando

**🎯 Para Producción:**
- [ ] API keys en secrets manager
- [ ] Rate limits de producción
- [ ] Monitoring y alertas
- [ ] Backup de configuración
- [ ] Documentación actualizada