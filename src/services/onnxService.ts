import * as ort from 'onnxruntime-web';
import { ONNXSession, ModelConfig } from '../types';

declare const chrome: any;

export class ONNXService {
  private static session: ONNXSession | null = null;
  private static isInitialized = false;

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Set up ONNX Runtime environment
      ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;
      ort.env.wasm.simd = true;
      
      // Try to use WebGPU if available, fallback to WASM
      // const executionProviders = ['webgpu', 'wasm'];
      
      this.isInitialized = true;
      console.log('ONNX Runtime initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ONNX Runtime:', error);
      throw error;
    }
  }

  static async loadModel(modelConfig: ModelConfig): Promise<ONNXSession> {
    try {
      // Load the ONNX model
      const modelPath = chrome.runtime.getURL(modelConfig.modelPath);
      const response = await fetch(modelPath);
      const modelBuffer = await response.arrayBuffer();

      // Create session options
      const sessionOptions: ort.InferenceSession.SessionOptions = {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
        enableCpuMemArena: true,
        enableMemPattern: true,
        extra: {
          session: {
            use_ort_model_bytes_directly: true,
            use_device_allocator_for_initializers: true,
          },
        },
      };

      // Create session
      const session = await ort.InferenceSession.create(modelBuffer, sessionOptions);

      // Simple tokenizer for FLAN-T5 (basic implementation)
      const tokenizer = {
        encode: (text: string): number[] => {
          // Simple word-based tokenization (replace with proper tokenizer)
          return text.toLowerCase().split(/\s+/).map((_word, index) => index + 1);
        },
        decode: (tokens: number[]): string => {
          // Simple decoding (replace with proper tokenizer)
          return tokens.map(token => `token_${token}`).join(' ');
        }
      };

      this.session = {
        session,
        tokenizer,
        config: modelConfig
      };

      return this.session;
    } catch (error) {
      console.error('Failed to load ONNX model:', error);
      throw error;
    }
  }

  static async generateSummary(text: string, maxLength: number = 150): Promise<string> {
    if (!this.session) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    try {
      // Prepare input
      const inputText = `Summarize the following text: ${text}`;
      const tokens = this.session.tokenizer.encode(inputText);
      
      // Pad or truncate to model input size (512 for FLAN-T5)
      const inputSize = 512;
      const paddedTokens = tokens.slice(0, inputSize);
      while (paddedTokens.length < inputSize) {
        paddedTokens.push(0); // Pad with zeros
      }

      // Create input tensor
      const inputTensor = new ort.Tensor('int64', new BigInt64Array(paddedTokens.map((t: number) => BigInt(t))), [1, inputSize]);
      const attentionMask = new ort.Tensor('int64', new BigInt64Array(paddedTokens.map((t: number) => BigInt(t > 0 ? 1 : 0))), [1, inputSize]);

      // Run inference
      const feeds = {
        input_ids: inputTensor,
        attention_mask: attentionMask
      };

      const results = await this.session.session.run(feeds);
      const outputIds = results.logits?.data as Float32Array;

      // Decode output (simplified - in practice you'd use beam search or greedy decoding)
      const outputTokens = this.decodeOutput(outputIds, maxLength);
      const summary = this.session.tokenizer.decode(outputTokens);

      return summary;
    } catch (error) {
      console.error('Error generating summary:', error);
      // Fallback to simple extraction
      return this.fallbackSummary(text, maxLength);
    }
  }

  static async generateFlashcards(content: string, count: number = 3): Promise<Array<{ question: string; answer: string }>> {
    if (!this.session) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    try {
      const flashcards: Array<{ question: string; answer: string }> = [];
      
      // Generate questions using the model
      for (let i = 0; i < count; i++) {
        const prompt = `Generate a question and answer pair from this text: ${content}`;
        const response = await this.generateSummary(prompt, 100);
        
        // Simple parsing (in practice, you'd use more sophisticated parsing)
        const parts = response.split('?');
        if (parts.length >= 2) {
          flashcards.push({
            question: parts[0] + '?',
            answer: parts[1].trim()
          });
        }
      }

      return flashcards;
    } catch (error) {
      console.error('Error generating flashcards:', error);
      return this.fallbackFlashcards(content, count);
    }
  }

  static async analyzeImage(imageData: string): Promise<string> {
    if (!this.session) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    try {
      // Convert base64 image to tensor
      const imageTensor = await this.preprocessImage(imageData);
      
      // Run vision model inference (simplified)
      const feeds = {
        image: imageTensor
      };

      const results = await this.session.session.run(feeds);
      const features = results.features?.data as Float32Array;

      // Generate description from features
      const description = await this.generateSummary(
        `Describe this image based on features: ${features.slice(0, 10).join(', ')}`,
        100
      );

      return description;
    } catch (error) {
      console.error('Error analyzing image:', error);
      return 'Image analysis not available';
    }
  }

  private static decodeOutput(outputIds: Float32Array, maxLength: number): number[] {
    // Simple greedy decoding
    const tokens: number[] = [];
    const vocabSize = outputIds.length;
    
    for (let i = 0; i < Math.min(maxLength, vocabSize); i++) {
      const tokenId = Math.floor(outputIds[i] * vocabSize);
      if (tokenId > 0) {
        tokens.push(tokenId);
      }
    }

    return tokens;
  }

  private static async preprocessImage(imageData: string): Promise<ort.Tensor> {
    // Convert base64 to image
    const img = new Image();
    img.src = imageData;
    
    return new Promise((resolve) => {
      img.onload = () => {
        // Create canvas to resize image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = 224; // Standard input size
        canvas.height = 224;
        
        ctx.drawImage(img, 0, 0, 224, 224);
        const imageData = ctx.getImageData(0, 0, 224, 224);
        
        // Convert to tensor (normalized to [0, 1])
        const tensor = new ort.Tensor('float32', 
          new Float32Array(imageData.data).map(x => x / 255.0), 
          [1, 3, 224, 224]
        );
        
        resolve(tensor);
      };
    });
  }

  private static fallbackSummary(text: string, maxLength: number): string {
    // Simple extractive summarization
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.toLowerCase().split(/\s+/);
    
    // Count word frequencies
    const wordFreq: { [key: string]: number } = {};
    words.forEach(word => {
      if (word.length > 3) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });

    // Score sentences by word frequency
    const sentenceScores = sentences.map(sentence => {
      const sentenceWords = sentence.toLowerCase().split(/\s+/);
      const score = sentenceWords.reduce((sum, word) => sum + (wordFreq[word] || 0), 0);
      return { sentence, score };
    });

    // Sort by score and take top sentences
    sentenceScores.sort((a, b) => b.score - a.score);
    const summary = sentenceScores
      .slice(0, 3)
      .map(item => item.sentence.trim())
      .join('. ');

    return summary.length > maxLength ? summary.substring(0, maxLength) + '...' : summary;
  }

  private static fallbackFlashcards(content: string, count: number): Array<{ question: string; answer: string }> {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const flashcards: Array<{ question: string; answer: string }> = [];

    for (let i = 0; i < Math.min(count, sentences.length); i++) {
      const sentence = sentences[i].trim();
      const words = sentence.split(/\s+/);
      
      if (words.length > 5) {
        // Create a simple question by replacing a key word
        const keyWord = words[Math.floor(words.length / 2)];
        const question = sentence.replace(keyWord, '_____');
        
        flashcards.push({
          question: `Fill in the blank: ${question}`,
          answer: keyWord
        });
      }
    }

    return flashcards;
  }

  static async getModelInfo(): Promise<ModelConfig | null> {
    return this.session?.config || null;
  }

  static isModelLoaded(): boolean {
    return this.session !== null;
  }

  static async unloadModel(): Promise<void> {
    if (this.session) {
      await this.session.session.release();
      this.session = null;
    }
  }
} 