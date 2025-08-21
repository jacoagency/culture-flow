import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

interface AIProvider {
  generateContent(prompt: string, category: string, difficulty: number): Promise<any>;
  generateRecommendations(userPreferences: any, content: any[]): Promise<any>;
}

class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private model: string;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.model = process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229';
  }

  async generateContent(prompt: string, category: string, difficulty: number) {
    try {
      const systemPrompt = `You are an expert cultural educator creating engaging content for a mobile learning app called CulturaFlow.

CATEGORY: ${category}
DIFFICULTY: ${difficulty}/5 (1=beginner, 5=expert)

Create educational content that is:
- Mobile-optimized (easy to read on phones)
- Engaging and interesting
- Culturally accurate and respectful
- Appropriate for the difficulty level
- 150-300 words maximum

Return a JSON object with:
{
  "title": "Catchy title (max 60 chars)",
  "description": "Brief description (max 120 chars)",
  "content": "Main educational content",
  "tags": ["tag1", "tag2", "tag3"],
  "estimatedReadTime": 3,
  "points": 25,
  "imagePrompt": "Description for AI image generation"
}`;

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return JSON.parse(content.text);
      }
      throw new Error('Unexpected response format');
    } catch (error) {
      console.error('Anthropic AI generation error:', error);
      throw new Error('Failed to generate content with Claude');
    }
  }

  async generateRecommendations(userPreferences: any, contentHistory: any[]) {
    try {
      const systemPrompt = `You are an AI recommendation system for CulturaFlow, a cultural learning app.

Analyze the user's learning patterns and preferences to suggest personalized content.

USER PROFILE:
- Preferred categories: ${userPreferences.preferredCategories?.join(', ') || 'None specified'}
- Current level: ${userPreferences.level || 1}
- Learning streak: ${userPreferences.currentStreak || 0} days
- Total points: ${userPreferences.points || 0}

RECENT CONTENT:
${contentHistory.slice(0, 10).map(item => `- ${item.category}: ${item.title} (liked: ${item.liked})`).join('\n')}

Return a JSON array of 5 content recommendations with:
{
  "contentId": "suggested-content-id",
  "category": "category-name",
  "title": "Content title",
  "reason": "Why this is recommended (max 100 chars)",
  "priority": 1-5,
  "estimatedEngagement": 0.1-1.0
}`;

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1000,
        temperature: 0.3,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: 'Generate personalized recommendations based on this user profile.'
        }]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return JSON.parse(content.text);
      }
      throw new Error('Unexpected response format');
    } catch (error) {
      console.error('Anthropic recommendations error:', error);
      throw new Error('Failed to generate recommendations with Claude');
    }
  }
}

class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
  }

  async generateContent(prompt: string, category: string, difficulty: number) {
    try {
      const systemPrompt = `You are an expert cultural educator creating engaging content for a mobile learning app called CulturaFlow.

CATEGORY: ${category}
DIFFICULTY: ${difficulty}/5 (1=beginner, 5=expert)

Create educational content that is:
- Mobile-optimized (easy to read on phones)
- Engaging and interesting
- Culturally accurate and respectful
- Appropriate for the difficulty level
- 150-300 words maximum

Return a JSON object with:
{
  "title": "Catchy title (max 60 chars)",
  "description": "Brief description (max 120 chars)",
  "content": "Main educational content",
  "tags": ["tag1", "tag2", "tag3"],
  "estimatedReadTime": 3,
  "points": 25,
  "imagePrompt": "Description for AI image generation"
}`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        return JSON.parse(content);
      }
      throw new Error('No content generated');
    } catch (error) {
      console.error('OpenAI generation error:', error);
      throw new Error('Failed to generate content with OpenAI');
    }
  }

  async generateRecommendations(userPreferences: any, contentHistory: any[]) {
    try {
      const systemPrompt = `You are an AI recommendation system for CulturaFlow, a cultural learning app.

Analyze the user's learning patterns and preferences to suggest personalized content.

USER PROFILE:
- Preferred categories: ${userPreferences.preferredCategories?.join(', ') || 'None specified'}
- Current level: ${userPreferences.level || 1}
- Learning streak: ${userPreferences.currentStreak || 0} days
- Total points: ${userPreferences.points || 0}

RECENT CONTENT:
${contentHistory.slice(0, 10).map(item => `- ${item.category}: ${item.title} (liked: ${item.liked})`).join('\n')}

Return a JSON array of 5 content recommendations with:
{
  "contentId": "suggested-content-id",
  "category": "category-name",
  "title": "Content title",
  "reason": "Why this is recommended (max 100 chars)",
  "priority": 1-5,
  "estimatedEngagement": 0.1-1.0
}`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate personalized recommendations based on this user profile.' }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        return JSON.parse(content);
      }
      throw new Error('No recommendations generated');
    } catch (error) {
      console.error('OpenAI recommendations error:', error);
      throw new Error('Failed to generate recommendations with OpenAI');
    }
  }
}

// Factory function to create the appropriate AI provider
function createAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase() || 'anthropic';
  
  switch (provider) {
    case 'anthropic':
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY is required when using Anthropic provider');
      }
      return new AnthropicProvider();
    
    case 'openai':
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is required when using OpenAI provider');
      }
      return new OpenAIProvider();
    
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

// Singleton instance
let aiProvider: AIProvider;

export const getAIProvider = (): AIProvider => {
  if (!aiProvider) {
    aiProvider = createAIProvider();
  }
  return aiProvider;
};

// Content generation functions
export const generateCulturalContent = async (
  category: string,
  difficulty: number = 2,
  specificTopic?: string
): Promise<any> => {
  const provider = getAIProvider();
  
  const prompts = {
    history: `Generate fascinating historical content about ${specificTopic || 'an important historical event, figure, or period'}. Include interesting facts and context.`,
    art: `Create engaging content about ${specificTopic || 'a famous artwork, artist, or art movement'}. Explain its significance and cultural impact.`,
    music: `Develop educational content about ${specificTopic || 'a composer, musical genre, or significant musical development'}. Include cultural context and influence.`,
    literature: `Generate compelling content about ${specificTopic || 'a literary work, author, or literary movement'}. Explain its importance and lasting impact.`,
    architecture: `Create informative content about ${specificTopic || 'an architectural style, famous building, or influential architect'}. Include historical and cultural significance.`,
    culture: `Develop interesting content about ${specificTopic || 'a cultural tradition, festival, or social phenomenon'}. Explain its origins and modern relevance.`
  };

  const prompt = prompts[category as keyof typeof prompts] || prompts.history;
  return provider.generateContent(prompt, category, difficulty);
};

export const generatePersonalizedRecommendations = async (
  userId: string,
  userPreferences: any,
  recentContent: any[]
): Promise<any[]> => {
  const provider = getAIProvider();
  return provider.generateRecommendations(userPreferences, recentContent);
};

export default {
  getAIProvider,
  generateCulturalContent,
  generatePersonalizedRecommendations,
};