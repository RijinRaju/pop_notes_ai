import { DatabaseService } from '../database/schema';
import { UserSettings } from '../types';

declare const chrome: any;

class BackgroundService {
  constructor() {
    this.setupMessageListeners();
    this.init();
  }

  private async init(): Promise<void> {
    try {
      await this.initializeDatabase();
      console.log('Background service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize background service:', error);
    }
  }

  private async initializeDatabase(): Promise<void> {
    const settings = await DatabaseService.getUserSettings();
    if (settings) {
      DatabaseService.setEncryptionKey(settings.encryptionKey);
    } else {
      const defaultSettings: UserSettings = {
        id: 'default',
        encryptionKey: '',
        autoTagging: false,
        autoFolderCreation: false,
        spacedRepetitionEnabled: true,
        defaultPromptTemplate: '',
        theme: 'system',
        notifications: false
      };
      await DatabaseService.saveUserSettings(defaultSettings);
      DatabaseService.setEncryptionKey(defaultSettings.encryptionKey);
    }
  }

  private setupMessageListeners(): void {
    chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });
  }

  private async handleMessage(message: any, _sender: any, sendResponse: any): Promise<void> {
    try {
      switch (message.type) {
        case 'CREATE_NOTE':
          await this.handleCreateNote(message.payload, sendResponse);
          break;
        case 'GET_NOTES':
          await this.handleGetNotes(sendResponse);
          break;
        case 'UPDATE_NOTE':
          await this.handleUpdateNote(message.payload, sendResponse);
          break;
        case 'DELETE_NOTE':
          await this.handleDeleteNote(message.payload, sendResponse);
          break;
        case 'SEARCH_NOTES':
          await this.handleSearchNotes(message.payload, sendResponse);
          break;
        case 'CREATE_FLASHCARD':
          await this.handleCreateFlashcard(message.payload, sendResponse);
          break;
        case 'GET_FLASHCARDS':
          await this.handleGetFlashcards(sendResponse);
          break;
        case 'GET_DUE_FLASHCARDS':
          await this.handleGetDueFlashcards(sendResponse);
          break;
        case 'DELETE_FLASHCARD':
          await this.handleDeleteFlashcard(message.payload, sendResponse);
          break;
        case 'REVIEW_FLASHCARD':
          await this.handleReviewFlashcard(message.payload, sendResponse);
          break;
        case 'GET_USER_SETTINGS':
          await this.handleGetUserSettings(sendResponse);
          break;
        case 'AI_SUMMARY':
          await this.handleAISummary(message.payload, sendResponse);
          break;
        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: 'Internal server error' });
    }
  }

  private async handleCreateNote(payload: any, sendResponse: any): Promise<void> {
    try {
      const note = await DatabaseService.saveNote(payload);
      sendResponse({ success: true, note });
    } catch (error) {
      sendResponse({ error: 'Failed to create note' });
    }
  }

  private async handleGetNotes(sendResponse: any): Promise<void> {
    try {
      const notes = await DatabaseService.getNotes();
      sendResponse({ success: true, notes });
    } catch (error) {
      sendResponse({ error: 'Failed to get notes' });
    }
  }

  private async handleUpdateNote(payload: any, sendResponse: any): Promise<void> {
    try {
      await DatabaseService.updateNote(payload.id, payload.updates);
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ error: 'Failed to update note' });
    }
  }

  private async handleDeleteNote(payload: any, sendResponse: any): Promise<void> {
    try {
      await DatabaseService.deleteNote(payload.id);
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ error: 'Failed to delete note' });
    }
  }

  private async handleSearchNotes(payload: any, sendResponse: any): Promise<void> {
    try {
      const notes = await DatabaseService.searchNotes(payload.query);
      sendResponse({ success: true, notes });
    } catch (error) {
      sendResponse({ error: 'Failed to search notes' });
    }
  }

  private async handleCreateFlashcard(payload: any, sendResponse: any): Promise<void> {
    try {
      const flashcard = await DatabaseService.saveFlashcard(payload);
      sendResponse({ success: true, flashcard });
    } catch (error) {
      sendResponse({ error: 'Failed to create flashcard' });
    }
  }

  private async handleGetFlashcards(sendResponse: any): Promise<void> {
    try {
      const flashcards = await DatabaseService.getFlashcards();
      sendResponse({ success: true, flashcards });
    } catch (error) {
      sendResponse({ error: 'Failed to get flashcards' });
    }
  }

  private async handleGetDueFlashcards(sendResponse: any): Promise<void> {
    try {
      const flashcards = await DatabaseService.getDueFlashcards();
      sendResponse({ success: true, flashcards });
    } catch (error) {
      sendResponse({ error: 'Failed to get due flashcards' });
    }
  }

  private async handleDeleteFlashcard(payload: any, sendResponse: any): Promise<void> {
    try {
      await DatabaseService.deleteFlashcard(payload.id);
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ error: 'Failed to delete flashcard' });
    }
  }

  private async handleReviewFlashcard(payload: any, sendResponse: any): Promise<void> {
    try {
      await DatabaseService.updateFlashcardReview(payload.id, payload.correct);
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ error: 'Failed to review flashcard' });
    }
  }

  private async handleGetUserSettings(sendResponse: any): Promise<void> {
    try {
      const settings = await DatabaseService.getUserSettings();
      sendResponse({ success: true, settings });
    } catch (error) {
      sendResponse({ error: 'Failed to get user settings' });
    }
  }

  private async handleAISummary(payload: any, sendResponse: any): Promise<void> {
    try {
      // This is a placeholder for the actual ONNX model inference.
      // It currently returns a simple, hardcoded summary.
      const summary = `This is an AI-generated summary for the following text: "${payload.text.substring(0, 100)}..."`;
      sendResponse({ success: true, summary });
    } catch (error) {
      sendResponse({ error: 'Failed to generate summary' });
    }
  }
}

const backgroundService = new BackgroundService();