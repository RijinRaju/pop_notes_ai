export interface Note {
  id: string;
  title: string;
  content: string;
  summary: string;
  url: string;
  tags: string[];
  folder: string;
  createdAt: Date;
  updatedAt: Date;
  type: 'text' | 'screenshot' | 'pdf' | 'docx';
  metadata: {
    pageTitle?: string;
    selection?: string;
    imageData?: string;
    feedback?: 'positive' | 'negative' | null;
    modelVersion?: string;
  };
}

export interface Flashcard {
  id: string;
  noteId: string;
  question: string;
  answer: string;
  createdAt: Date;
  nextReview: Date;
  interval: number;
  easeFactor: number;
  reviewCount: number;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: 'summarization' | 'explanation' | 'question' | 'custom';
  isDefault: boolean;
  createdAt: Date;
}

export interface ModelConfig {
  id: string;
  name: string;
  version: string;
  modelPath: string;
  quantization: 'int8' | 'fp16' | 'fp32';
  parameters: number;
  isActive: boolean;
  lastUsed: Date;
}

export interface UserSettings {
  id: string;
  encryptionKey: string;
  autoTagging: boolean;
  autoFolderCreation: boolean;
  spacedRepetitionEnabled: boolean;
  defaultPromptTemplate: string;
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
}

export interface AIFeedback {
  id: string;
  noteId: string;
  feedback: 'positive' | 'negative';
  timestamp: Date;
  userComment?: string;
}

export interface SearchResult {
  note: Note;
  score: number;
  matchedFields: string[];
}

export interface ONNXSession {
  session: any;
  tokenizer: any;
  config: ModelConfig;
}

export interface SelectionData {
  text: string;
  rect: DOMRect;
  imageData?: string;
  element: HTMLElement;
}

export interface Message {
  type: 'CREATE_NOTE' | 'GET_NOTES' | 'DELETE_NOTE' | 'SEARCH_NOTES' | 'CREATE_FLASHCARD' | 'GET_FLASHCARDS' | 'AI_SUMMARY' | 'SCREENSHOT_SUMMARY' | 'PDF_PARSE' | 'DOCX_PARSE';
  payload: any;
  response?: any;
} 