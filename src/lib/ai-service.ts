import { geminiService } from './gemini';
import { openaiService } from './openai';
import { mockAIService } from './mock-ai';

export type AIProvider = 'gemini' | 'openai' | 'mock' | 'auto';

class AIService {
  private async getAvailableProvider(): Promise<'gemini' | 'openai' | 'mock'> {
    console.log('🔍 Determining best available AI provider...');
    
    // Check OpenAI first since it's more reliable when available
    if (process.env.OPENAI_API_KEY && 
        process.env.OPENAI_API_KEY !== 'your-openai-key-here') {
      try {
        console.log('🧪 Testing OpenAI...');
        await openaiService.generateText('Hi');
        console.log('✅ OpenAI is available');
        return 'openai';
      } catch (error: any) {
        console.log('❌ OpenAI not available:', error.message.substring(0, 100));
        
        // If it's just a quota issue, we still prefer OpenAI over mock
        if (error.message.includes('quota') || error.message.includes('429')) {
          console.log('⚠️ OpenAI quota exceeded, trying Gemini as fallback...');
        }
      }
    }

    // Check Gemini as fallback - but don't test if we know quota is exhausted
    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY && 
        process.env.GOOGLE_GENERATIVE_AI_API_KEY !== 'YOUR_NEW_API_KEY_HERE') {
      
      // Quick quota check without making API call
      const quotaStatus = this.checkGeminiQuota();
      if (!quotaStatus.canMakeRequest) {
        console.log(`⚠️ Gemini quota exhausted (${quotaStatus.used}/${quotaStatus.limit}), using mock service`);
        console.log(`💡 Quota resets in ${quotaStatus.resetTime}`);
        return 'mock';
      }
      
      try {
        console.log('🧪 Testing Gemini availability...');
        await geminiService.generateText('Hi');
        console.log('✅ Gemini is available');
        return 'gemini';
      } catch (error: any) {
        console.log('❌ Gemini not available:', error.message.substring(0, 100));
        
        // If it's a quota issue, log helpful info
        if (error.message.includes('quota') || error.message.includes('429')) {
          console.log('⚠️ Gemini quota exceeded during test, will use mock for now');
          console.log('💡 Your API key works! Just hit the daily limit (20 requests/day)');
        }
      }
    }

    // Fallback to mock service
    console.log('🎭 Using mock AI service as fallback');
    return 'mock';
  }

  private checkGeminiQuota(): { canMakeRequest: boolean; used: number; limit: number; resetTime: string } {
    try {
      // Simple quota tracking without external dependencies
      const fs = require('fs');
      const path = require('path');
      const quotaFile = path.join(process.cwd(), '.quota-tracker.json');
      
      if (!fs.existsSync(quotaFile)) {
        return { canMakeRequest: true, used: 0, limit: 100, resetTime: 'tonight' };
      }
      
      const data = JSON.parse(fs.readFileSync(quotaFile, 'utf8'));
      const today = new Date().toDateString();
      
      // Reset if it's a new day
      if (data.date !== today) {
        return { canMakeRequest: true, used: 0, limit: 100, resetTime: 'tonight' };
      }
      
      const remaining = Math.max(0, 100 - data.count);
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const hoursUntilReset = Math.ceil((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60));
      
      return {
        canMakeRequest: remaining > 0,
        used: data.count,
        limit: 100,
        resetTime: `${hoursUntilReset} hours`
      };
    } catch (error) {
      // If quota tracking fails, assume we can make requests
      return { canMakeRequest: true, used: 0, limit: 100, resetTime: 'tonight' };
    }
  }

  async generateText(prompt: string, systemInstruction?: string, providerType: AIProvider = 'auto'): Promise<string> {
    let selectedProvider = providerType;
    if (selectedProvider === 'auto') {
      selectedProvider = await this.getAvailableProvider();
    }

    switch (selectedProvider) {
      case 'gemini':
        return geminiService.generateText(prompt, systemInstruction);
      case 'openai':
        return openaiService.generateText(prompt, systemInstruction);
      case 'mock':
        return mockAIService.generateText(prompt, systemInstruction);
      default:
        return mockAIService.generateText(prompt, systemInstruction);
    }
  }

  async generateChatResponse(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options: {
      maxTokens?: number;
      temperature?: number;
      provider?: AIProvider;
    } = {}
  ): Promise<string> {
    let selectedProvider = options.provider || 'auto';
    
    // If forcing a specific provider, don't test availability first
    if (selectedProvider !== 'auto') {
      console.log(`🎯 Forcing provider: ${selectedProvider}`);
      switch (selectedProvider) {
        case 'gemini':
          return geminiService.generateChatResponse(messages);
        case 'openai':
          return openaiService.generateChatResponse(messages, options);
        case 'mock':
          return mockAIService.generateChatResponse(messages, options);
        default:
          return mockAIService.generateChatResponse(messages, options);
      }
    }
    
    // Only test availability for 'auto' mode
    selectedProvider = await this.getAvailableProvider();

    switch (selectedProvider) {
      case 'gemini':
        return geminiService.generateChatResponse(messages);
      case 'openai':
        return openaiService.generateChatResponse(messages, options);
      case 'mock':
        return mockAIService.generateChatResponse(messages, options);
      default:
        return mockAIService.generateChatResponse(messages, options);
    }
  }

  async composeEmail(
    prompt: string,
    context?: string,
    tone: 'professional' | 'casual' | 'friendly' | 'formal' = 'professional',
    length: 'short' | 'medium' | 'long' = 'medium',
    providerType: AIProvider = 'auto'
  ): Promise<string> {
    let selectedProvider = providerType;
    
    // If forcing a specific provider, don't test availability first
    if (selectedProvider !== 'auto') {
      console.log(`🎯 Forcing provider: ${selectedProvider}`);
      switch (selectedProvider) {
        case 'gemini':
          return geminiService.composeEmail(prompt, context, tone, length);
        case 'openai':
          return openaiService.composeEmail(prompt, context, tone, length);
        case 'mock':
          return mockAIService.composeEmail(prompt, context, tone, length);
        default:
          return mockAIService.composeEmail(prompt, context, tone, length);
      }
    }
    
    // Only test availability for 'auto' mode
    selectedProvider = await this.getAvailableProvider();

    switch (selectedProvider) {
      case 'gemini':
        return geminiService.composeEmail(prompt, context, tone, length);
      case 'openai':
        return openaiService.composeEmail(prompt, context, tone, length);
      case 'mock':
        return mockAIService.composeEmail(prompt, context, tone, length);
      default:
        return mockAIService.composeEmail(prompt, context, tone, length);
    }
  }

  async summarizeEmails(
    emailsText: string,
    summaryType: 'brief' | 'detailed' | 'action_items' = 'brief',
    providerType: AIProvider = 'auto'
  ): Promise<string> {
    let selectedProvider = providerType;
    if (selectedProvider === 'auto') {
      selectedProvider = await this.getAvailableProvider();
    }

    switch (selectedProvider) {
      case 'gemini':
        return geminiService.summarizeEmails(emailsText, summaryType);
      case 'openai':
        return openaiService.summarizeEmails(emailsText, summaryType);
      case 'mock':
        return mockAIService.summarizeEmails(emailsText, summaryType);
      default:
        return mockAIService.summarizeEmails(emailsText, summaryType);
    }
  }

  async analyzeEmailSentiment(
    emailContent: string, 
    subject: string,
    providerType: AIProvider = 'auto'
  ): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
    tone: string;
    key_emotions: string[];
    urgency: 'low' | 'medium' | 'high';
    summary: string;
  }> {
    let selectedProvider = providerType;
    if (selectedProvider === 'auto') {
      selectedProvider = await this.getAvailableProvider();
    }

    switch (selectedProvider) {
      case 'gemini':
        return geminiService.analyzeEmailSentiment(emailContent, subject);
      case 'openai':
        return openaiService.analyzeEmailSentiment(emailContent, subject);
      case 'mock':
        return mockAIService.analyzeEmailSentiment(emailContent, subject);
      default:
        return mockAIService.analyzeEmailSentiment(emailContent, subject);
    }
  }

  async generateEmbedding(
    text: string,
    providerType: AIProvider = 'auto'
  ): Promise<number[]> {
    let selectedProvider = providerType;
    if (selectedProvider === 'auto') {
      selectedProvider = await this.getAvailableProvider();
    }

    switch (selectedProvider) {
      case 'gemini':
        return geminiService.generateEmbedding(text);
      case 'openai':
        return openaiService.generateEmbedding(text);
      case 'mock':
        return mockAIService.generateEmbedding(text);
      default:
        return mockAIService.generateEmbedding(text);
    }
  }

  async generateContextualReply(
    originalEmail: {
      subject: string;
      body: string;
      senderName: string;
      senderEmail: string;
    },
    conversationHistory: Array<{
      subject: string;
      body: string;
      senderName: string;
      senderEmail: string;
      sentAt: Date;
    }>,
    recentHistory: Array<{
      subject: string;
      body: string;
      senderName: string;
      sentAt: Date;
    }>,
    tone: 'professional' | 'casual' | 'friendly' | 'formal' = 'professional',
    providerType: AIProvider = 'auto'
  ): Promise<string> {
    let selectedProvider = providerType;
    if (selectedProvider === 'auto') {
      selectedProvider = await this.getAvailableProvider();
    }

    switch (selectedProvider) {
      case 'gemini':
        return geminiService.generateContextualReply(originalEmail, conversationHistory, recentHistory, tone);
      case 'openai':
        return openaiService.generateContextualReply(originalEmail, conversationHistory, recentHistory, tone);
      case 'mock':
        return mockAIService.generateContextualReply(originalEmail, conversationHistory, recentHistory, tone);
      default:
        return mockAIService.generateContextualReply(originalEmail, conversationHistory, recentHistory, tone);
    }
  }

  async getProviderStatus(): Promise<{
    gemini: { available: boolean; error?: string };
    openai: { available: boolean; error?: string };
    mock: { available: boolean; error?: string };
    recommended: 'gemini' | 'openai' | 'mock';
  }> {
    const status = {
      gemini: { available: false, error: undefined as string | undefined },
      openai: { available: false, error: undefined as string | undefined },
      mock: { available: true, error: undefined as string | undefined },
      recommended: 'mock' as 'gemini' | 'openai' | 'mock',
    };

    // Test Gemini
    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY && 
        process.env.GOOGLE_GENERATIVE_AI_API_KEY !== 'YOUR_NEW_API_KEY_HERE') {
      try {
        console.log('🧪 Testing Gemini availability...');
        await geminiService.generateText('Hi');
        status.gemini.available = true;
        status.recommended = 'gemini';
        console.log('✅ Gemini is available and set as recommended');
      } catch (error: any) {
        console.log('❌ Gemini test failed:', error.message);
        
        // Provide specific error messages for different scenarios
        if (error.message.includes('429') || error.message.includes('quota')) {
          status.gemini.error = 'Quota exceeded - resets in 24 hours';
          console.log('⚠️ Gemini quota exceeded, will try other providers');
        } else if (error.message.includes('API_KEY_INVALID')) {
          status.gemini.error = 'Invalid API key';
        } else if (error.message.includes('404')) {
          status.gemini.error = 'Model not accessible';
        } else {
          status.gemini.error = error.message.substring(0, 100) + '...';
        }
      }
    } else {
      status.gemini.error = 'API key not configured';
    }

    // Test OpenAI
    if (process.env.OPENAI_API_KEY && 
        process.env.OPENAI_API_KEY !== 'your-openai-key-here') {
      try {
        console.log('🧪 Testing OpenAI availability...');
        await openaiService.generateText('Hi');
        status.openai.available = true;
        // Only set as recommended if Gemini is not available
        if (!status.gemini.available) {
          status.recommended = 'openai';
          console.log('✅ OpenAI set as recommended (Gemini unavailable)');
        }
      } catch (error: any) {
        console.log('❌ OpenAI test failed:', error.message);
        
        if (error.message.includes('429') || error.message.includes('quota')) {
          status.openai.error = 'Quota exceeded - check billing';
        } else if (error.message.includes('401')) {
          status.openai.error = 'Invalid API key';
        } else {
          status.openai.error = error.message.substring(0, 100) + '...';
        }
      }
    } else {
      status.openai.error = 'API key not configured';
    }

    // If both providers are unavailable due to quota, recommend mock with explanation
    if (!status.gemini.available && !status.openai.available) {
      console.log('⚠️ Both AI providers unavailable, using mock service');
      status.recommended = 'mock';
    }

    return status;
  }
}

export const aiService = new AIService();