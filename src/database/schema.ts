import Dexie, { Table } from 'dexie';
import { Note, Flashcard, PromptTemplate, ModelConfig, UserSettings, AIFeedback } from '../types';

export class AINoteDatabase extends Dexie {
  notes!: Table<Note>;
  flashcards!: Table<Flashcard>;
  promptTemplates!: Table<PromptTemplate>;
  modelConfigs!: Table<ModelConfig>;
  userSettings!: Table<UserSettings>;
  aiFeedback!: Table<AIFeedback>;

  constructor() {
    super('AINoteDatabase');
    
    this.version(4).stores({
      notes: 'id, url, tags, folder, createdAt, type',
      flashcards: 'id, noteId, nextReview, createdAt',
      promptTemplates: 'id, category, isDefault',
      modelConfigs: 'id, isActive',
      userSettings: 'id',
      aiFeedback: 'id, noteId, timestamp'
    });

  
  }
}

export const db = new AINoteDatabase();

// Encryption utilities
export class EncryptionService {
  private static async generateKey(password: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('ai-note-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  static async encrypt(data: string, password: string): Promise<string> {
    const key = await this.generateKey(password);
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(data)
    );

    const encryptedArray = new Uint8Array(encrypted);
    const combined = new Uint8Array(iv.length + encryptedArray.length);
    combined.set(iv);
    combined.set(encryptedArray, iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  static async decrypt(encryptedData: string, password: string): Promise<string> {
    const key = await this.generateKey(password);
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );

    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  }
}

// Database service with encryption
export class DatabaseService {
  private static encryptionKey: string = '';

  static setEncryptionKey(key: string) {
    this.encryptionKey = key;
  }

  static async saveNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> {
    const newNote: Note = {
      ...note,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (this.encryptionKey) {
      newNote.content = await EncryptionService.encrypt(newNote.content, this.encryptionKey);
      newNote.summary = await EncryptionService.encrypt(newNote.summary, this.encryptionKey);
    }

    await db.notes.add(newNote);
    return newNote;
  }

  static async getNotes(): Promise<Note[]> {
    const notes = await db.notes.toArray();
    
    if (this.encryptionKey) {
      return Promise.all(
        notes.map(async (note: Note) => ({
          ...note,
          content: await EncryptionService.decrypt(note.content, this.encryptionKey),
          summary: await EncryptionService.decrypt(note.summary, this.encryptionKey)
        }))
      );
    }

    return notes;
  }

  static async deleteNote(id: string): Promise<void> {
    await db.notes.delete(id);
    // Also delete associated flashcards
    await db.flashcards.where('noteId').equals(id).delete();
  }

  static async searchNotes(query: string): Promise<Note[]> {
    const notes = await this.getNotes();
    const searchTerm = query.toLowerCase();
    
    return notes.filter(note => 
      note.title.toLowerCase().includes(searchTerm) ||
      note.content.toLowerCase().includes(searchTerm) ||
      note.summary.toLowerCase().includes(searchTerm) ||
      note.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  static async saveFlashcard(flashcard: Omit<Flashcard, 'id' | 'createdAt'>): Promise<Flashcard> {
    const newFlashcard: Flashcard = {
      ...flashcard,
      id: crypto.randomUUID(),
      createdAt: new Date()
    };

    await db.flashcards.add(newFlashcard);
    return newFlashcard;
  }

  static async getFlashcards(): Promise<Flashcard[]> {
    return db.flashcards.toArray();
  }

  static async getDueFlashcards(): Promise<Flashcard[]> {
    const now = new Date();
    return db.flashcards.where('nextReview').belowOrEqual(now).toArray();
  }

  static async updateFlashcardReview(id: string, easeFactor: number, interval: number): Promise<void> {
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    await db.flashcards.update(id, {
      easeFactor,
      interval,
      nextReview,
      reviewCount: ((await db.flashcards.get(id))?.reviewCount || 0) + 1
    });
  }

  static async savePromptTemplate(template: Omit<PromptTemplate, 'id' | 'createdAt'>): Promise<PromptTemplate> {
    const newTemplate: PromptTemplate = {
      ...template,
      id: crypto.randomUUID(),
      createdAt: new Date()
    };

    await db.promptTemplates.add(newTemplate);
    return newTemplate;
  }

  static async getPromptTemplates(): Promise<PromptTemplate[]> {
    return db.promptTemplates.toArray();
  }

  static async saveUserSettings(settings: UserSettings): Promise<void> {
    await db.userSettings.put(settings);
  }

  static async getUserSettings(): Promise<UserSettings | undefined> {
    return db.userSettings.get('default');
  }

  static async saveAIFeedback(feedback: Omit<AIFeedback, 'id'>): Promise<AIFeedback> {
    const newFeedback: AIFeedback = {
      ...feedback,
      id: crypto.randomUUID()
    };

    await db.aiFeedback.add(newFeedback);
    return newFeedback;
  }
} 