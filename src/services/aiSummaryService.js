// AI Summary Service using Xenova Transformers
class AISummaryService {
  constructor() {
    this.pipeline = null;
    this.isInitialized = false;
    this.isLoading = false;
  }

  async initialize() {
    if (this.isInitialized || this.isLoading) {
      return this.isInitialized;
    }

    this.isLoading = true;
    console.log('🤖 Initializing AI Summary Service...');

    try {
      // Dynamically import the transformers library
      const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers/dist/transformers.min.js');
      
      // Initialize the text2text-generation pipeline with flan-t5-small model
      this.pipeline = await pipeline('text2text-generation', 'Xenova/flan-t5-small');
      
      this.isInitialized = true;
      this.isLoading = false;
      console.log('✅ AI Summary Service initialized successfully');
      
      return true;
    } catch (error) {
      this.isLoading = false;
      console.error('❌ Failed to initialize AI Summary Service:', error);
      throw error;
    }
  }

  async generateSummary(text, maxLength = 150) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!text || text.trim().length === 0) {
      throw new Error('No text provided for summarization');
    }

    try {
      console.log('📝 Generating AI summary for text:', text.substring(0, 100) + '...');
      
      // Create a prompt for summarization
      const prompt = `Summarize the following text in a concise way:\n\n"${text}"\n\nSummary:`;
      
      // Generate summary using the pipeline
      const output = await this.pipeline(prompt);
      
      if (output && output[0] && output[0].generated_text) {
        let summary = output[0].generated_text.trim();
        
        // Clean up the summary (remove quotes if present)
        summary = summary.replace(/^["']|["']$/g, '');
        
        // Truncate if too long
        if (summary.length > maxLength) {
          summary = summary.substring(0, maxLength) + '...';
        }
        
        console.log('✅ AI summary generated successfully:', summary);
        return summary;
      } else {
        throw new Error('No summary generated from the model');
      }
    } catch (error) {
      console.error('❌ Error generating AI summary:', error);
      throw error;
    }
  }

  async isAvailable() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isLoading: this.isLoading,
      hasPipeline: !!this.pipeline
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AISummaryService;
} else if (typeof window !== 'undefined') {
  window.AISummaryService = AISummaryService;
}
