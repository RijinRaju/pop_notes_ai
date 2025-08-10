import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BookOpen, Plus, Trash2, Folder, Tag, Clock, Search, Pencil, Layers, Save, Brain, Eye, EyeOff, RotateCcw } from 'lucide-react';
import SummaryModal from './SummaryModal';

const Popup = () => {
  const [state, setState] = useState({
    notes: [],
    flashcards: [],
    searchQuery: '',
    searchResults: [],
    isLoading: false,
    selectedNote: null,
    showCreateNote: false,
    newNote: {
      title: '',
      content: '',
      tags: [],
      folder: 'General'
    },
    editingNoteId: null,
    editingFields: null,
    activeTab: 'notes',
    spacedRepetitionEnabled: false,
    showCreateFlashcard: false,
    newFlashcard: {
      question: '',
      answer: ''
    },
    flippedFlashcardIds: new Set(),
    // Summary modal state
    showSummaryModal: false,
    summaryData: null,
  });

  useEffect(() => {
    console.log('Popup mounted, loading data...');
    loadData();
    
    // Listen for messages from content script
    const messageListener = (message, sender, sendResponse) => {
      if (message.type === 'SHOW_SUMMARY_MODAL') {
        console.log('Received SHOW_SUMMARY_MODAL message:', message.payload);
        setState(prev => ({
          ...prev,
          showSummaryModal: true,
          summaryData: message.payload
        }));
        sendResponse({ success: true });
      }
    };
    
    chrome.runtime.onMessage.addListener(messageListener);
    
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  const loadData = async () => {
    console.log('Starting to load data...');
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      // First, get user settings to see if flashcards are enabled
      console.log('Getting user settings...');
      const settingsResponse = await chrome.runtime.sendMessage({ type: 'GET_USER_SETTINGS' });
      console.log('Settings response:', settingsResponse);
      const spacedRepetitionEnabled = settingsResponse.success && settingsResponse.settings?.spacedRepetitionEnabled;

      const dataPromises = [
        chrome.runtime.sendMessage({ type: 'GET_NOTES' }),
      ];

      if (spacedRepetitionEnabled) {
        dataPromises.push(chrome.runtime.sendMessage({ type: 'GET_DUE_FLASHCARDS' }));
      }

      console.log('Sending data requests...');
      const [notesResponse, flashcardsResponse] = await Promise.all(dataPromises);
      console.log('Notes response:', notesResponse);
      console.log('Flashcards response:', flashcardsResponse);

      if (notesResponse.success) {
        console.log('Setting notes in state:', notesResponse.notes);
        setState(prev => ({
          ...prev,
          notes: notesResponse.notes || [],
          flashcards: flashcardsResponse?.success ? flashcardsResponse.flashcards : [],
          spacedRepetitionEnabled: !!spacedRepetitionEnabled,
        }));
      } else {
        console.error('Failed to get notes:', notesResponse.error);
      }

      // Check for pending summary modal data
      try {
        const result = await chrome.storage.local.get('pendingSummaryModal');
        if (result.pendingSummaryModal && result.pendingSummaryModal.timestamp) {
          // Check if the data is recent (within last 30 seconds)
          const isRecent = Date.now() - result.pendingSummaryModal.timestamp < 30000;
          if (isRecent) {
            console.log('Found pending summary modal data:', result.pendingSummaryModal);
            setState(prev => ({
              ...prev,
              showSummaryModal: true,
              summaryData: result.pendingSummaryModal
            }));
            
            // Clear the pending data
            await chrome.storage.local.remove('pendingSummaryModal');
          } else {
            // Clear old data
            await chrome.storage.local.remove('pendingSummaryModal');
          }
        }
      } catch (error) {
        console.error('Error checking for pending summary modal:', error);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setState(prev => ({ ...prev, searchQuery: '', searchResults: [] }));
      return;
    }

    setState(prev => ({ ...prev, searchQuery: query, isLoading: true }));
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SEARCH_NOTES',
        payload: { query }
      });

      if (response.success) {
        setState(prev => ({ ...prev, searchResults: response.notes }));
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleCreateNote = async () => {
    if (!state.newNote.title.trim() || !state.newNote.content.trim()) {
      alert('Please fill in both title and content');
      return;
    }

    console.log('Creating note:', state.newNote);
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_NOTE',
        payload: {
          ...state.newNote,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      console.log('Create note response:', response);

      if (response.success) {
        console.log('Note created successfully:', response.note);
        setState(prev => ({
          ...prev,
          notes: [response.note, ...prev.notes],
          showCreateNote: false,
          newNote: { title: '', content: '', tags: [], folder: 'General' }
        }));
        
        // Reload data to ensure consistency
        setTimeout(() => {
          loadData();
        }, 100);
      } else {
        console.error('Failed to create note:', response.error);
        alert('Failed to create note: ' + response.error);
      }
    } catch (error) {
      console.error('Failed to create note:', error);
      alert('An error occurred while creating the note');
    }
  };

  const handleCreateFlashcard = async () => {
    if (!state.newFlashcard.question.trim() || !state.newFlashcard.answer.trim()) {
      alert('Please fill in both question and answer');
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_FLASHCARD',
        payload: {
          ...state.newFlashcard,
          noteId: null,
          easeFactor: 2.5,
          reviewCount: 0,
          nextReview: new Date().toISOString()
        }
      });

      if (response.success) {
        setState(prev => ({
          ...prev,
          flashcards: [response.flashcard, ...prev.flashcards],
          showCreateFlashcard: false,
          newFlashcard: { question: '', answer: '' }
        }));
      } else {
        alert('Failed to create flashcard: ' + response.error);
      }
    } catch (error) {
      console.error('Failed to create flashcard:', error);
      alert('An error occurred while creating the flashcard');
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    console.log('Deleting note:', noteId);
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'DELETE_NOTE',
        payload: { id: noteId }
      });

      console.log('Delete note response:', response);

      if (response.success) {
        setState(prev => ({
          ...prev,
          notes: prev.notes.filter(note => note.id !== noteId),
          selectedNote: prev.selectedNote?.id === noteId ? null : prev.selectedNote
        }));
      } else {
        console.error('Failed to delete note:', response.error);
        alert('Failed to delete note: ' + response.error);
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
      alert('An error occurred while deleting the note');
    }
  };

  const handleDeleteFlashcard = async (flashcardId) => {
    if (!confirm('Are you sure you want to delete this flashcard?')) {
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'DELETE_FLASHCARD',
        payload: { id: flashcardId }
      });

      if (response.success) {
        setState(prev => ({
          ...prev,
          flashcards: prev.flashcards.filter(flashcard => flashcard.id !== flashcardId)
        }));
      } else {
        alert('Failed to delete flashcard: ' + response.error);
      }
    } catch (error) {
      console.error('Failed to delete flashcard:', error);
      alert('An error occurred while deleting the flashcard');
    }
  };

  const toggleFlashcard = (flashcardId) => {
    setState(prev => {
      const newFlippedIds = new Set(prev.flippedFlashcardIds);
      if (newFlippedIds.has(flashcardId)) {
        newFlippedIds.delete(flashcardId);
      } else {
        newFlippedIds.add(flashcardId);
      }
      return { ...prev, flippedFlashcardIds: newFlippedIds };
    });
  };

  const handleFlashcardReview = async (flashcardId, correct) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'REVIEW_FLASHCARD',
        payload: { id: flashcardId, correct }
      });

      if (response.success) {
        // Remove the reviewed flashcard from the list
        setState(prev => ({
          ...prev,
          flashcards: prev.flashcards.filter(flashcard => flashcard.id !== flashcardId)
        }));
      }
    } catch (error) {
      console.error('Failed to review flashcard:', error);
    }
  };

  const handleResetDatabase = async () => {
    if (!confirm('Are you sure you want to reset the database? This will delete all notes and settings.')) {
      return;
    }

    console.log('Resetting database...');
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'RESET_DATABASE'
      });

      console.log('Database reset response:', response);
      if (response.success) {
        alert('Database reset successfully!');
        // Reload data
        loadData();
      } else {
        alert('Database reset failed: ' + response.error);
      }
    } catch (error) {
      console.error('Database reset error:', error);
      alert('Database reset error: ' + error.message);
    }
  };

  // Summary modal handlers
  const handleShowSummary = (summaryData) => {
    setState(prev => ({
      ...prev,
      showSummaryModal: true,
      summaryData
    }));
  };

  const handleCloseSummary = () => {
    setState(prev => ({
      ...prev,
      showSummaryModal: false,
      summaryData: null
    }));
  };

  const handleCreateNoteFromSummary = async (noteData) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_NOTE',
        payload: {
          title: noteData.title,
          content: noteData.content,
          tags: ['ai-summary', noteData.summaryType],
          folder: 'AI Summaries',
          metadata: {
            originalText: noteData.originalText,
            summaryType: noteData.summaryType,
            createdAt: new Date().toISOString()
          }
        }
      });

      if (response.success) {
        setState(prev => ({
          ...prev,
          notes: [response.note, ...prev.notes],
          showSummaryModal: false,
          summaryData: null
        }));
        
        // Show success message
        alert('Note created successfully from summary!');
        
        // Reload data to ensure consistency
        setTimeout(() => {
          loadData();
        }, 100);
      } else {
        throw new Error(response.error || 'Failed to create note');
      }
    } catch (error) {
      console.error('Failed to create note from summary:', error);
      throw error;
    }
  };

  const handleRegenerateSummary = async (originalText) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'AI_SUMMARY',
        payload: { text: originalText }
      });

      if (response.success) {
        setState(prev => ({
          ...prev,
          summaryData: {
            ...prev.summaryData,
            summary: response.summary,
            type: response.type || 'ai'
          }
        }));
      } else {
        throw new Error(response.error || 'Failed to regenerate summary');
      }
    } catch (error) {
      console.error('Failed to regenerate summary:', error);
      throw error;
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
  };

  const renderNotes = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <BookOpen size={24} className="text-blue-600" />
          Notes ({state.notes.length})
        </h2>
        <button
          onClick={() => setState(prev => ({ ...prev, showCreateNote: true }))}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center gap-2 shadow-lg"
        >
          <Plus size={16} />
          New Note
        </button>
      </div>

      {state.showCreateNote && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-lg">
          <h3 className="font-semibold mb-4 text-gray-800">Create New Note</h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Note title"
              value={state.newNote.title}
              onChange={(e) => setState(prev => ({
                ...prev,
                newNote: { ...prev.newNote, title: e.target.value }
              }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <textarea
              placeholder="Note content"
              value={state.newNote.content}
              onChange={(e) => setState(prev => ({
                ...prev,
                newNote: { ...prev.newNote, content: e.target.value }
              }))}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={handleCreateNote}
                className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => setState(prev => ({ ...prev, showCreateNote: false }))}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {state.notes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <BookOpen size={64} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No notes yet</p>
            <p className="text-sm">Create your first note to get started!</p>
          </div>
        ) : (
          state.notes.map((note) => (
            <div
              key={note.id}
              className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-blue-300"
              onClick={() => setState(prev => ({ ...prev, selectedNote: note }))}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg mb-2">{note.title}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {note.content}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
                      <Clock size={12} />
                      {formatDate(note.updatedAt)}
                    </span>
                    {note.folder && (
                      <span className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        <Folder size={12} />
                        {note.folder}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNote(note.id);
                  }}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderFlashcards = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Brain size={24} className="text-purple-600" />
          Flashcards ({state.flashcards.length})
        </h2>
        <button
          onClick={() => setState(prev => ({ ...prev, showCreateFlashcard: true }))}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center gap-2 shadow-lg"
        >
          <Plus size={16} />
          New Flashcard
        </button>
      </div>

      {state.showCreateFlashcard && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-lg">
          <h3 className="font-semibold mb-4 text-gray-800">Create New Flashcard</h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Question"
              value={state.newFlashcard.question}
              onChange={(e) => setState(prev => ({
                ...prev,
                newFlashcard: { ...prev.newFlashcard, question: e.target.value }
              }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <textarea
              placeholder="Answer"
              value={state.newFlashcard.answer}
              onChange={(e) => setState(prev => ({
                ...prev,
                newFlashcard: { ...prev.newFlashcard, answer: e.target.value }
              }))}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={handleCreateFlashcard}
                className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => setState(prev => ({ ...prev, showCreateFlashcard: false }))}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {state.flashcards.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Brain size={64} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No flashcards yet</p>
            <p className="text-sm">Create flashcards to improve your learning!</p>
          </div>
        ) : (
          state.flashcards.map((flashcard) => {
            const isFlipped = state.flippedFlashcardIds.has(flashcard.id);
            return (
              <div key={flashcard.id} className="relative">
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
                  <div className="text-center mb-4">
                    <h3 className="font-semibold text-gray-900 text-lg mb-2">
                      {isFlipped ? 'Answer' : 'Question'}
                    </h3>
                    <p className="text-gray-700 text-base">
                      {isFlipped ? flashcard.answer : flashcard.question}
                    </p>
                  </div>
                  
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => toggleFlashcard(flashcard.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      {isFlipped ? <EyeOff size={16} /> : <Eye size={16} />}
                      {isFlipped ? 'Show Question' : 'Show Answer'}
                    </button>
                    
                    {isFlipped && (
                      <>
                        <button
                          onClick={() => handleFlashcardReview(flashcard.id, true)}
                          className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                        >
                          Correct
                        </button>
                        <button
                          onClick={() => handleFlashcardReview(flashcard.id, false)}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          Incorrect
                        </button>
                      </>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleDeleteFlashcard(flashcard.id)}
                    className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const renderSearch = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Search size={20} className="text-gray-600" />
        <input
          type="text"
          placeholder="Search notes..."
          value={state.searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {state.searchResults.map((note) => (
          <div
            key={note.id}
            className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-blue-300"
            onClick={() => setState(prev => ({ ...prev, selectedNote: note }))}
          >
            <h3 className="font-semibold text-gray-900 text-lg mb-2">{note.title}</h3>
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {note.content}
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
                <Clock size={12} />
                {formatDate(note.updatedAt)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (state.isLoading) {
    return (
      <div className="w-96 h-96 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 h-96 bg-gradient-to-br from-blue-50 to-purple-50 overflow-hidden">
      {state.selectedNote ? (
        <div className="h-full p-4">
          <div className="bg-white rounded-xl p-6 h-full overflow-y-auto shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Note Details</h2>
              <button
                onClick={() => setState(prev => ({ ...prev, selectedNote: null }))}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-gray-900">{state.selectedNote.title}</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">{state.selectedNote.content}</p>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full">
                  <Clock size={14} />
                  Updated: {formatDate(state.selectedNote.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col">
          <div className="flex border-b border-gray-200 bg-white">
            <button
              onClick={() => setState(prev => ({ ...prev, activeTab: 'notes' }))}
              className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
                state.activeTab === 'notes'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Notes
            </button>
            <button
              onClick={() => setState(prev => ({ ...prev, activeTab: 'flashcards' }))}
              className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
                state.activeTab === 'flashcards'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Flashcards
            </button>
            <button
              onClick={() => setState(prev => ({ ...prev, activeTab: 'search' }))}
              className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
                state.activeTab === 'search'
                  ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Search
            </button>
            <button
              onClick={handleResetDatabase}
              className="px-3 py-3 text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
              title="Reset Database"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {state.activeTab === 'notes' && renderNotes()}
            {state.activeTab === 'flashcards' && renderFlashcards()}
            {state.activeTab === 'search' && renderSearch()}
          </div>
        </div>
      )}

      {/* Summary Modal */}
      {state.showSummaryModal && state.summaryData && (
        <SummaryModal
          isOpen={state.showSummaryModal}
          onClose={handleCloseSummary}
          originalText={state.summaryData.originalText}
          summary={state.summaryData.summary}
          summaryType={state.summaryData.type}
          onCreateNote={handleCreateNoteFromSummary}
          onRegenerate={handleRegenerateSummary}
        />
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root'));
root.render(<Popup />); 