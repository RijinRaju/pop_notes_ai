import Dexie from 'dexie';

export class AINoteDatabase extends Dexie {
  constructor() {
    super('AINoteDatabase');
    
    this.version(5).stores({
      notes: 'id, url, tags, folder, createdAt, updatedAt, type',
      flashcards: 'id, noteId, nextReview, createdAt',
      promptTemplates: 'id, category, isDefault',
      modelConfigs: 'id, isActive',
      userSettings: 'id',
      aiFeedback: 'id, noteId, timestamp'
    });
    
    console.log('AINoteDatabase initialized with version 5');
  }
}

export const db = new AINoteDatabase();

// Encryption utilities
export class EncryptionService {
  static async generateKey(password) {
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

  static async encrypt(data, password) {
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

  static async decrypt(encryptedData, password) {
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
  constructor() {
    this.encryptionKey = '';
  }

  setEncryptionKey(key) {
    console.log('Setting encryption key:', key ? 'key provided' : 'no key');
    this.encryptionKey = key;
  }

  async saveNote(note) {
    try {
      console.log('DatabaseService.saveNote called with:', note);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      
      const noteToSave = {
        ...note,
        id,
        createdAt: now,
        updatedAt: now
      };

      console.log('Note to save:', noteToSave);

      if (this.encryptionKey) {
        console.log('Encrypting note content...');
        noteToSave.content = await EncryptionService.encrypt(note.content, this.encryptionKey);
      }

      console.log('Adding note to database...');
      await db.notes.add(noteToSave);
      console.log('Note added successfully to database');
      
      return noteToSave;
    } catch (error) {
      console.error('Error in saveNote:', error);
      throw error;
    }
  }

  async getNotes() {
    try {
      console.log('DatabaseService.getNotes called');
      
      // Try to get notes ordered by updatedAt first
      let notes;
      try {
        notes = await db.notes.orderBy('updatedAt').reverse().toArray();
        console.log('Retrieved notes with updatedAt ordering:', notes);
      } catch (error) {
        console.log('Failed to order by updatedAt, trying without ordering:', error);
        // Fallback: get all notes without ordering
        notes = await db.notes.toArray();
        console.log('Retrieved notes without ordering:', notes);
      }
      
      if (this.encryptionKey) {
        console.log('Decrypting notes...');
        const decryptedNotes = await Promise.all(notes.map(async (note) => {
          try {
            return {
              ...note,
              content: await EncryptionService.decrypt(note.content, this.encryptionKey)
            };
          } catch (error) {
            console.error('Error decrypting note:', error);
            return note; // Return original note if decryption fails
          }
        }));
        console.log('Decrypted notes:', decryptedNotes);
        return decryptedNotes;
      }
      
      return notes;
    } catch (error) {
      console.error('Error in getNotes:', error);
      throw error;
    }
  }

  async updateNote(id, updates) {
    try {
      console.log('DatabaseService.updateNote called with id:', id, 'updates:', updates);
      const noteToUpdate = { ...updates, updatedAt: new Date().toISOString() };
      
      if (this.encryptionKey && updates.content) {
        console.log('Encrypting updated content...');
        noteToUpdate.content = await EncryptionService.encrypt(updates.content, this.encryptionKey);
      }

      console.log('Updating note in database...');
      await db.notes.update(id, noteToUpdate);
      console.log('Note updated successfully');
    } catch (error) {
      console.error('Error in updateNote:', error);
      throw error;
    }
  }

  async deleteNote(id) {
    try {
      console.log('DatabaseService.deleteNote called with id:', id);
      await db.notes.delete(id);
      console.log('Note deleted successfully');
    } catch (error) {
      console.error('Error in deleteNote:', error);
      throw error;
    }
  }

  async searchNotes(query) {
    try {
      console.log('DatabaseService.searchNotes called with query:', query);
      const notes = await this.getNotes();
      
      // Simple fallback search if Fuse.js is not available
      if (typeof Fuse === 'undefined') {
        console.log('Fuse.js not available, using simple search');
        const lowerQuery = query.toLowerCase();
        const results = notes.filter(note => 
          note.title?.toLowerCase().includes(lowerQuery) ||
          note.content?.toLowerCase().includes(lowerQuery) ||
          note.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
        console.log('Simple search results:', results);
        return results;
      }
      
      const fuse = new Fuse(notes, {
        keys: ['title', 'content', 'tags'],
        threshold: 0.3
      });
      
      const results = fuse.search(query).map(result => result.item);
      console.log('Fuse search results:', results);
      return results;
    } catch (error) {
      console.error('Error in searchNotes:', error);
      throw error;
    }
  }

  async saveFlashcard(flashcard) {
    try {
      console.log('DatabaseService.saveFlashcard called with:', flashcard);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      
      const flashcardToSave = {
        ...flashcard,
        id,
        createdAt: now
      };

      console.log('Flashcard to save:', flashcardToSave);
      await db.flashcards.add(flashcardToSave);
      console.log('Flashcard added successfully');
      return flashcardToSave;
    } catch (error) {
      console.error('Error in saveFlashcard:', error);
      throw error;
    }
  }

  async getFlashcards() {
    try {
      console.log('DatabaseService.getFlashcards called');
      const flashcards = await db.flashcards.toArray();
      console.log('Retrieved flashcards:', flashcards);
      return flashcards;
    } catch (error) {
      console.error('Error in getFlashcards:', error);
      throw error;
    }
  }

  async getDueFlashcards() {
    try {
      console.log('DatabaseService.getDueFlashcards called');
      const now = new Date().toISOString();
      const flashcards = await db.flashcards.where('nextReview').belowOrEqual(now).toArray();
      console.log('Retrieved due flashcards:', flashcards);
      return flashcards;
    } catch (error) {
      console.error('Error in getDueFlashcards:', error);
      throw error;
    }
  }

  async updateFlashcardReview(id, correct) {
    try {
      console.log('DatabaseService.updateFlashcardReview called with id:', id, 'correct:', correct);
      const flashcard = await db.flashcards.get(id);
      if (!flashcard) {
        console.log('Flashcard not found');
        return;
      }

      // Simple spaced repetition algorithm (SuperMemo 2)
      let { easeFactor, reviewCount } = flashcard;
      
      if (correct) {
        easeFactor = Math.max(1.3, easeFactor + 0.1);
        reviewCount++;
      } else {
        easeFactor = Math.max(1.3, easeFactor - 0.2);
        reviewCount = 0;
      }

      const intervals = [1, 6, 15, 30, 90, 180, 365];
      const interval = reviewCount < intervals.length ? intervals[reviewCount] : intervals[intervals.length - 1];
      
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + interval);

      console.log('Updating flashcard review...');
      await db.flashcards.update(id, {
        easeFactor,
        reviewCount,
        nextReview: nextReview.toISOString()
      });
      console.log('Flashcard review updated successfully');
    } catch (error) {
      console.error('Error in updateFlashcardReview:', error);
      throw error;
    }
  }

  async deleteFlashcard(id) {
    try {
      console.log('DatabaseService.deleteFlashcard called with id:', id);
      await db.flashcards.delete(id);
      console.log('Flashcard deleted successfully');
    } catch (error) {
      console.error('Error in deleteFlashcard:', error);
      throw error;
    }
  }

  async savePromptTemplate(template) {
    try {
      console.log('DatabaseService.savePromptTemplate called with:', template);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      
      const templateToSave = {
        ...template,
        id,
        createdAt: now
      };

      await db.promptTemplates.add(templateToSave);
      console.log('Prompt template saved successfully');
      return templateToSave;
    } catch (error) {
      console.error('Error in savePromptTemplate:', error);
      throw error;
    }
  }

  async getPromptTemplates() {
    try {
      console.log('DatabaseService.getPromptTemplates called');
      const templates = await db.promptTemplates.toArray();
      console.log('Retrieved prompt templates:', templates);
      return templates;
    } catch (error) {
      console.error('Error in getPromptTemplates:', error);
      throw error;
    }
  }

  async saveUserSettings(settings) {
    try {
      console.log('DatabaseService.saveUserSettings called with:', settings);
      await db.userSettings.put(settings);
      console.log('User settings saved successfully');
    } catch (error) {
      console.error('Error in saveUserSettings:', error);
      throw error;
    }
  }

  async getUserSettings() {
    try {
      console.log('DatabaseService.getUserSettings called');
      const settings = await db.userSettings.get('default');
      console.log('Retrieved user settings:', settings);
      return settings;
    } catch (error) {
      console.error('Error in getUserSettings:', error);
      // If there's an error, try to reset the database
      console.log('Attempting to reset database due to error...');
      try {
        await this.resetDatabase();
        // Create default settings after reset
        const defaultSettings = {
          id: 'default',
          encryptionKey: '',
          autoTagging: false,
          autoFolderCreation: false,
          spacedRepetitionEnabled: true,
          defaultPromptTemplate: '',
          theme: 'system',
          notifications: false
        };
        await this.saveUserSettings(defaultSettings);
        return defaultSettings;
      } catch (resetError) {
        console.error('Failed to reset database:', resetError);
        throw error;
      }
    }
  }

  async saveAIFeedback(feedback) {
    try {
      console.log('DatabaseService.saveAIFeedback called with:', feedback);
      const id = crypto.randomUUID();
      const feedbackToSave = {
        ...feedback,
        id
      };

      await db.aiFeedback.add(feedbackToSave);
      console.log('AI feedback saved successfully');
      return feedbackToSave;
    } catch (error) {
      console.error('Error in saveAIFeedback:', error);
      throw error;
    }
  }

  async resetDatabase() {
    try {
      console.log('DatabaseService.resetDatabase called');
      await db.notes.clear();
      await db.flashcards.clear();
      await db.promptTemplates.clear();
      await db.modelConfigs.clear();
      await db.userSettings.clear();
      await db.aiFeedback.clear();
      console.log('Database reset successfully');
    } catch (error) {
      console.error('Error in resetDatabase:', error);
      throw error;
    }
  }
} 