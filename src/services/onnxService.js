import { pipeline } from '@xenova/transformers';

class ONNXService {
  constructor() {
    this.isInitialized = false;
    this.pipe = null;
    this.modelName = 'Xenova/flan-t5-small';
    this.maxInputLength = 512;
    this.maxOutputLength = 150;
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Xenova Transformers Service...');
      console.log('📁 Model:', this.modelName);
      
      // Load the text2text-generation pipeline
      console.log('📦 Loading pipeline...');
      this.pipe = await pipeline('text2text-generation', this.modelName);
      
      this.isInitialized = true;
      console.log('🎉 Xenova Transformers Service initialized successfully');
      console.log('📊 Final status:', this.getModelInfo());
    } catch (error) {
      console.error('❌ Failed to initialize Xenova Transformers Service:', error);
      // Still mark as initialized for fallback functionality
      this.isInitialized = true;
      console.log('🔄 Using fallback mode due to initialization errors');
    }
  }

  async generateSummary(text) {
    console.log('🎯 generateSummary called with text length:', text.length);
    
    // Try Xenova transformers first if available
    if (this.pipe && this.isInitialized) {
      try {
        console.log('🤖 Using Xenova transformers for summarization...');
        return await this.generateSummaryWithTransformers(text);
      } catch (transformersError) {
        console.warn('⚠️ Xenova transformers failed, falling back to extractive:', transformersError.message);
      }
    }
    
    // Fallback to extractive summarization
    console.log('🔄 Using fallback summarization');
    return this.fallbackSummarization(text);
  }

  async generateSummaryWithTransformers(text) {
    try {
      console.log('📝 Generating AI summary with Xenova transformers for text:', text.substring(0, 100) + '...');
      
      // Truncate input text to model limits
      const truncatedText = text.length > this.maxInputLength ? text.substring(0, this.maxInputLength) + '...' : text;
      console.log('✂️ Truncated text length:', truncatedText.length);
      
      // Create the prompt for summarization
      const prompt = `Summarize: "${truncatedText}"`;
      console.log('📤 Sending prompt to model:', prompt.substring(0, 100) + '...');
      
      // Generate summary using the pipeline
      const output = await this.pipe(prompt, {
        max_length: this.maxOutputLength,
        do_sample: false,
        temperature: 0.7
      });
      
      console.log('📥 Raw model output:', output);
      
      // Extract the generated text
      let summary = '';
      if (output && output[0] && output[0].generated_text) {
        summary = output[0].generated_text;
      } else if (output && output.generated_text) {
        summary = output.generated_text;
      } else if (typeof output === 'string') {
        summary = output;
      } else {
        throw new Error('Unexpected output format from model');
      }
      
      // Clean and process the summary
      const cleanedSummary = this.cleanSummary(summary);
      console.log('✨ Final cleaned summary:', cleanedSummary);
      
      return cleanedSummary;
    } catch (error) {
      console.error('❌ Failed to generate summary with Xenova transformers:', error);
      throw new Error(`Transformers summarization failed: ${error.message}`);
    }
  }

  cleanSummary(summary) {
    if (!summary) return 'No summary generated.';
    
    // Remove the prompt prefix if it's included in the output
    let cleaned = summary.replace(/^Summarize:\s*/i, '').trim();
    
    // Remove quotes if they wrap the entire summary
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
        (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.slice(1, -1).trim();
    }
    
    // Ensure the summary ends with proper punctuation
    if (cleaned && !cleaned.match(/[.!?]$/)) {
      cleaned += '.';
    }
    
    // If summary is too short, return a fallback
    if (cleaned.length < 10) {
      return 'Summary too short, using fallback method.';
    }
    
    return cleaned;
  }

  fallbackSummarization(text) {
    try {
      console.log('🔄 Using fallback extractive summarization...');
      
      // Split text into sentences
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      if (sentences.length <= 3) {
        return text; // Return original text if it's already short
      }
      
      // Take first 2-3 sentences as summary
      const summarySentences = sentences.slice(0, Math.min(3, Math.ceil(sentences.length * 0.3)));
      const summary = summarySentences.join('. ') + '.';
      
      console.log('📝 Fallback summary generated:', summary);
      return summary;
    } catch (error) {
      console.error('❌ Fallback summarization failed:', error);
      // Return first 200 characters as last resort
      return text.length > 200 ? text.substring(0, 200) + '...' : text;
    }
  }

  isReady() {
    return this.isInitialized && this.pipe !== null;
  }

  getModelInfo() {
    return {
      model: this.modelName,
      isInitialized: this.isInitialized,
      pipeline: this.pipe ? 'Loaded' : 'Not loaded',
      maxInputLength: this.maxInputLength,
      maxOutputLength: this.maxOutputLength,
      method: this.pipe ? 'Xenova Transformers' : 'Fallback Only'
    };
  }

  async testModelCompatibility() {
    try {
      console.log('🧪 Testing Xenova transformers compatibility...');
      
      if (!this.pipe) {
        throw new Error('Pipeline not loaded');
      }
      
      // Test with a simple prompt
      const testText = 'Hello world.';
      const testPrompt = `Summarize: "${testText}"`;
      
      console.log('📤 Test prompt:', testPrompt);
      const output = await this.pipe(testPrompt, { max_length: 10 });
      
      console.log('📥 Test output:', output);
      
      if (output && (output[0]?.generated_text || output.generated_text)) {
        console.log('✅ Model compatibility test passed');
        return true;
      } else {
        throw new Error('Unexpected output format');
      }
    } catch (error) {
      console.error('❌ Model compatibility test failed:', error);
      return false;
    }
  }
}

export default new ONNXService(); 


