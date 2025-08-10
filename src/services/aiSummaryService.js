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
      
      // Initialize the summarization pipeline (defaults to sshleifer/distilbart-cnn-12-6)
      this.pipeline = await pipeline('summarization');
      
      this.isInitialized = true;
      this.isLoading = false;
      console.log('✅ AI Summary Service initialized successfully with summarization pipeline');
      
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
      
      // Use the summarization pipeline directly with the text
      // The pipeline will automatically handle the summarization task
      const output = await this.pipeline(text, {
        max_length: maxLength,
        min_length: 30,
        do_sample: false
      });
      
      if (output && output[0] && output[0].summary_text) {
        let summary = output[0].summary_text.trim();
        
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
      hasPipeline: !!this.pipeline,
      pipelineType: 'summarization'
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AISummaryService;
} else if (typeof window !== 'undefined') {
  window.AISummaryService = AISummaryService;
}
