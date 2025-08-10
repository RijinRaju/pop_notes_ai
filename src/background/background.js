// Background script for AI Note extension
// Simplified version without ES6 imports for now

class BackgroundService {
  constructor() {
    this.init();
  }

  async init() {
    try {
      console.log('Initializing background service...');
      
      // Setup message listeners
      this.setupMessageListeners();
      
      console.log('Background service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize background service:', error);
    }
  }

  setupMessageListeners() {
    console.log('Setting up message listeners...');
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('Received message:', message);
      this.handleMessage(message, sender, sendResponse);
      return true;
    });
  }

  async handleMessage(message, _sender, sendResponse) {
    try {
      console.log('Handling message type:', message.type);
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
        case 'SHOW_SUMMARY_MODAL':
          await this.handleShowSummaryModal(message.payload, sendResponse);
          break;
        case 'SCREENSHOT_ANALYSIS':
          await this.handleScreenshotAnalysis(message.payload, sendResponse);
          break;
        case 'GET_ONNX_STATUS':
          await this.handleGetONNXStatus(sendResponse);
          break;
        case 'TEST_DATABASE':
          await this.handleTestDatabase(sendResponse);
          break;
        case 'RESET_DATABASE':
          await this.handleResetDatabase(sendResponse);
          break;
        default:
          console.warn('Unknown message type:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleCreateNote(payload, sendResponse) {
    try {
      console.log('Creating note:', payload);
      // For now, just store in memory - we'll implement proper storage later
      const note = {
        id: crypto.randomUUID(),
        ...payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Store in chrome.storage.local for now
      const notes = await this.getStoredNotes();
      notes.push(note);
      await chrome.storage.local.set({ notes });
      
      sendResponse({ success: true, note });
    } catch (error) {
      console.error('Error creating note:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleGetNotes(sendResponse) {
    try {
      const notes = await this.getStoredNotes();
      sendResponse({ success: true, notes });
    } catch (error) {
      console.error('Error getting notes:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleUpdateNote(payload, sendResponse) {
    try {
      console.log('Updating note:', payload);
      const notes = await this.getStoredNotes();
      const index = notes.findIndex(note => note.id === payload.id);
      
      if (index !== -1) {
        notes[index] = { ...notes[index], ...payload, updatedAt: new Date().toISOString() };
        await chrome.storage.local.set({ notes });
        sendResponse({ success: true, note: notes[index] });
      } else {
        sendResponse({ success: false, error: 'Note not found' });
      }
    } catch (error) {
      console.error('Error updating note:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleDeleteNote(payload, sendResponse) {
    try {
      console.log('Deleting note:', payload);
      const notes = await this.getStoredNotes();
      const filteredNotes = notes.filter(note => note.id !== payload.id);
      await chrome.storage.local.set({ notes: filteredNotes });
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error deleting note:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleSearchNotes(payload, sendResponse) {
    try {
      console.log('Searching notes:', payload);
      const notes = await this.getStoredNotes();
      const query = payload.query.toLowerCase();
      const results = notes.filter(note => 
        note.title?.toLowerCase().includes(query) ||
        note.content?.toLowerCase().includes(query) ||
        note.tags?.some(tag => tag.toLowerCase().includes(query))
      );
      sendResponse({ success: true, notes: results });
    } catch (error) {
      console.error('Error searching notes:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleCreateFlashcard(payload, sendResponse) {
    try {
      console.log('Creating flashcard:', payload);
      const flashcard = {
        id: crypto.randomUUID(),
        ...payload,
        createdAt: new Date().toISOString(),
        nextReview: new Date().toISOString()
      };
      
      const flashcards = await this.getStoredFlashcards();
      flashcards.push(flashcard);
      await chrome.storage.local.set({ flashcards });
      
      sendResponse({ success: true, flashcard });
    } catch (error) {
      console.error('Error creating flashcard:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleGetFlashcards(sendResponse) {
    try {
      const flashcards = await this.getStoredFlashcards();
      sendResponse({ success: true, flashcards });
    } catch (error) {
      console.error('Error getting flashcards:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleGetDueFlashcards(sendResponse) {
    try {
      const flashcards = await this.getStoredFlashcards();
      const now = new Date();
      const due = flashcards.filter(flashcard => 
        new Date(flashcard.nextReview) <= now
      );
      sendResponse({ success: true, flashcards: due });
    } catch (error) {
      console.error('Error getting due flashcards:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleDeleteFlashcard(payload, sendResponse) {
    try {
      console.log('Deleting flashcard:', payload);
      const flashcards = await this.getStoredFlashcards();
      const filtered = flashcards.filter(fc => fc.id !== payload.id);
      await chrome.storage.local.set({ flashcards: filtered });
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error deleting flashcard:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleReviewFlashcard(payload, sendResponse) {
    try {
      console.log('Reviewing flashcard:', payload);
      const flashcards = await this.getStoredFlashcards();
      const index = flashcards.findIndex(fc => fc.id === payload.id);
      
      if (index !== -1) {
        // Simple spaced repetition algorithm
        const days = payload.correct ? 1 : 0.1;
        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + days);
        
        flashcards[index].nextReview = nextReview.toISOString();
        await chrome.storage.local.set({ flashcards });
        sendResponse({ success: true, flashcard: flashcards[index] });
      } else {
        sendResponse({ success: false, error: 'Flashcard not found' });
      }
    } catch (error) {
      console.error('Error reviewing flashcard:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleGetUserSettings(sendResponse) {
    try {
      const settings = await chrome.storage.local.get('userSettings');
      sendResponse({ success: true, settings: settings.userSettings || {} });
    } catch (error) {
      console.error('Error getting user settings:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleAISummary(payload, sendResponse) {
    try {
      console.log('Generating AI summary for:', payload.text.substring(0, 100) + '...');
      
      // Try to use AI service first
      try {
        const { AISummaryService } = await import(chrome.runtime.getURL('src/services/aiSummaryService.js'));
        const aiService = new AISummaryService();
        
        if (await aiService.isAvailable()) {
          const summary = await aiService.generateSummary(payload.text);
          sendResponse({ success: true, summary, type: 'ai' });
          return;
        }
      } catch (aiError) {
        console.log('AI service not available, falling back to simple summary:', aiError.message);
      }
      
      // Fallback to simple summarization
      const summary = this.generateSimpleSummary(payload.text);
      sendResponse({ success: true, summary, type: 'fallback' });
    } catch (error) {
      console.error('Error generating AI summary:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  generateSimpleSummary(text) {
    // Simple text summarization for now
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    
    if (sentences.length <= 2) return text;
    
    // Take first 2 sentences and add word count
    const summary = sentences.slice(0, 2).join('. ') + '.';
    return `${summary}\n\n[Original: ${words.length} words, ${sentences.length} sentences]`;
  }

  async handleScreenshotAnalysis(payload, sendResponse) {
    try {
      console.log('Analyzing screenshot...');
      // For now, just acknowledge the screenshot
      sendResponse({ 
        success: true, 
        message: 'Screenshot received and stored. AI analysis will be implemented in future versions.' 
      });
    } catch (error) {
      console.error('Error analyzing screenshot:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleGetONNXStatus(sendResponse) {
    try {
      sendResponse({ 
        success: true, 
        status: 'ONNX models will be loaded in content script when needed',
        available: false 
      });
    } catch (error) {
      console.error('Error getting ONNX status:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleTestDatabase(sendResponse) {
    try {
      const notes = await this.getStoredNotes();
      const flashcards = await this.getStoredFlashcards();
      sendResponse({ 
        success: true, 
        message: 'Database test successful',
        stats: {
          notes: notes.length,
          flashcards: flashcards.length
        }
      });
    } catch (error) {
      console.error('Error testing database:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleResetDatabase(sendResponse) {
    try {
      await chrome.storage.local.clear();
      sendResponse({ success: true, message: 'Database reset successfully' });
    } catch (error) {
      console.error('Error resetting database:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleShowSummaryModal(payload, sendResponse) {
    try {
      console.log('Handling show summary modal:', payload);
      
      // Store the summary data temporarily so popup can access it
      await chrome.storage.local.set({ 
        pendingSummaryModal: {
          originalText: payload.originalText,
          summary: payload.summary,
          type: payload.type,
          timestamp: Date.now()
        }
      });
      
      // Send success response
      sendResponse({ success: true, message: 'Summary modal data stored' });
      
      // Try to open the popup if it's not already open
      try {
        await chrome.action.openPopup();
      } catch (popupError) {
        console.log('Could not open popup automatically:', popupError.message);
        // This is normal - popup might already be open or user needs to click extension icon
      }
    } catch (error) {
      console.error('Error handling show summary modal:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // Helper methods
  async getStoredNotes() {
    const result = await chrome.storage.local.get('notes');
    return result.notes || [];
  }

  async getStoredFlashcards() {
    const result = await chrome.storage.local.get('flashcards');
    return result.flashcards || [];
  }
}

// Initialize the background service
const backgroundService = new BackgroundService(); 