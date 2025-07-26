import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BookOpen, Plus, Trash2, Folder, Tag, Clock, Search, Pencil, Layers, Save } from 'lucide-react';
import { Note, Flashcard } from '../types';

declare const chrome: any;

interface PopupState {
  notes: Note[];
  flashcards: Flashcard[];
  searchQuery: string;
  searchResults: Note[];
  isLoading: boolean;
  selectedNote: Note | null;
  showCreateNote: boolean;
  newNote: {
    title: string;
    content: string;
    tags: string[];
    folder: string;
  };
  editingNoteId: string | null;
  editingFields: Partial<Note> | null;
  activeTab: 'notes' | 'search' | 'flashcards';
  spacedRepetitionEnabled: boolean;
  showCreateFlashcard: boolean;
  newFlashcard: {
    question: string;
    answer: string;
  };
  flippedFlashcardIds: Set<string>;
}

const Popup: React.FC = () => {
  const [state, setState] = useState<PopupState>({
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
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      // First, get user settings to see if flashcards are enabled
      const settingsResponse = await chrome.runtime.sendMessage({ type: 'GET_USER_SETTINGS' });
      const spacedRepetitionEnabled = settingsResponse.success && settingsResponse.settings?.spacedRepetitionEnabled;

      const dataPromises: Promise<any>[] = [
        chrome.runtime.sendMessage({ type: 'GET_NOTES' }),
      ];

      if (spacedRepetitionEnabled) {
        // If enabled, also fetch flashcards that are due for review
        dataPromises.push(chrome.runtime.sendMessage({ type: 'GET_DUE_FLASHCARDS' }));
      }

      const [notesResponse, flashcardsResponse] = await Promise.all(dataPromises);

      if (notesResponse.success) {
        setState(prev => ({
          ...prev,
          notes: notesResponse.notes,
          // Only update flashcards if the response exists and was successful
          flashcards: flashcardsResponse?.success ? flashcardsResponse.flashcards : [],
          spacedRepetitionEnabled: !!spacedRepetitionEnabled,
        }));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleSearch = async (query: string) => {
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
        setState(prev => ({ ...prev, searchResults: response.notes, isLoading: false }));
      }
    } catch (error) {
      console.error('Search failed:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleUpdateNote = async (noteId: string, updates: Partial<Note>) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_NOTE',
        payload: { id: noteId, updates }
      });
      if (response.success) {
        setState(prev => ({
          ...prev,
          notes: prev.notes.map(note => note.id === noteId ? { ...note, ...updates } : note),
          searchResults: prev.searchResults.map(note => note.id === noteId ? { ...note, ...updates } : note),
          selectedNote: prev.selectedNote?.id === noteId 
            ? { ...prev.selectedNote, ...updates } 
            : prev.selectedNote
        }));
      }
    } catch (error) {   
      console.error('Failed to update note:', error);
    }
  };

  const handleCreateNote = async () => {
    if (!state.newNote.title.trim() || !state.newNote.content.trim()) return;
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_NOTE',
        payload: {
          title: state.newNote.title,
          content: state.newNote.content,
          tags: state.newNote.tags,
          folder: state.newNote.folder,
          url: '',
          type: 'text',
          summary: '',
          metadata: {}
        }
      });
      if (response.success) {
        setState(prev => ({
          ...prev,
          notes: [...prev.notes, response.note],
          showCreateNote: false,
          newNote: { title: '', content: '', tags: [], folder: 'General' },
          isLoading: false
        }));
      }
    } catch (error) {
      console.error('Failed to create note:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'DELETE_NOTE',
        payload: { id: noteId }
      });
      if (response.success) {
        setState(prev => ({
          ...prev,
          notes: prev.notes.filter(note => note.id !== noteId),
          searchResults: prev.searchResults.filter(note => note.id !== noteId),
          selectedNote: null
        }));
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleCreateFlashcard = async (noteId: string) => {
    if (!state.newFlashcard.question.trim() || !state.newFlashcard.answer.trim()) return;
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_FLASHCARD',
        payload: {
          noteId: noteId,
          question: state.newFlashcard.question,
          answer: state.newFlashcard.answer
        }
      });
      if (response.success && response.flashcard) {
        alert('Flashcard created successfully!');
        setState(prev => ({
          ...prev,
          flashcards: [...prev.flashcards, response.flashcard],
          showCreateFlashcard: false,
          newFlashcard: { question: '', answer: '' },
          // Switch to the flashcards tab to see the new card
          activeTab: 'flashcards'
        }));
      } else {
        console.error('Failed to create flashcard:', response.error);
        alert('Failed to create flashcard.');
      }
    } catch (error) {
      console.error('Failed to create flashcard:', error);
    }
  };

  const handleReviewFlashcard = async (flashcardId: string, correct: boolean) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'REVIEW_FLASHCARD',
        payload: { id: flashcardId, correct }
      });
      if (response.success) {
        setState(prev => ({
          ...prev,
          flashcards: prev.flashcards.filter(card => card.id !== flashcardId)
        }));
      } else {
        console.error('Failed to review flashcard:', response.error);
      }
    } catch (error) {
      console.error('Failed to review flashcard:', error);
    }
  };

  const handleFlipFlashcard = (cardId: string) => {
    setState(prev => {
      const newFlippedIds = new Set(prev.flippedFlashcardIds);
      if (newFlippedIds.has(cardId)) {
        newFlippedIds.delete(cardId);
      } else {
        newFlippedIds.add(cardId);
      }
      return { ...prev, flippedFlashcardIds: newFlippedIds };
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  const renderNotes = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">My Notes</h2>
        <button
          onClick={() => setState(prev => ({ ...prev, showCreateNote: true }))}
          className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          New Note
        </button>
      </div>
      {state.showCreateNote && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <input
            type="text"
            placeholder="Note title"
            value={state.newNote.title}
            onChange={(e) => setState(prev => ({
              ...prev,
              newNote: { ...prev.newNote, title: e.target.value }
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            placeholder="Note content"
            value={state.newNote.content}
            onChange={(e) => setState(prev => ({
              ...prev,
              newNote: { ...prev.newNote, content: e.target.value }
            }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreateNote}
              disabled={state.isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {state.isLoading ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => setState(prev => ({ ...prev, showCreateNote: false }))}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {state.notes.map(note => (
          <div
            key={note.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setState(prev => ({ ...prev, selectedNote: note }))}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-gray-900 truncate">{note.title}</h3>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setState(prev => ({
                      ...prev,
                      editingNoteId: note.id,
                      editingFields: { ...note }
                    }));
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600"
                  title="Edit note"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNote(note.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-600"
                  title="Delete note"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {state.editingNoteId === note.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={state.editingFields?.title || ''}
                  onChange={e =>
                    setState(prev => ({
                      ...prev,
                      editingFields: { ...prev.editingFields, title: e.target.value }
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <textarea
                  value={state.editingFields?.content || ''}
                  onChange={e =>
                    setState(prev => ({
                      ...prev,
                      editingFields: { ...prev.editingFields, content: e.target.value }
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <div className="flex gap-2">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await handleUpdateNote(note.id, state.editingFields || {});
                      setState(prev => ({
                        ...prev,
                        editingNoteId: null,
                        editingFields: null
                      }));
                    }}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setState(prev => ({
                        ...prev,
                        editingNoteId: null,
                        editingFields: null
                      }));
                    }}
                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600 line-clamp-2">{note.content}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formatDate(note.createdAt)}
              </span>
              {note.tags.length > 0 && (
                <span className="flex items-center gap-1">
                  <Tag size={12} />
                  {note.tags.slice(0, 2).join(', ')}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Folder size={12} />
                {note.folder}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFlashcards = () => {
    const cardColors = [
      'bg-yellow-100 border-yellow-300',
      'bg-blue-100 border-blue-300',
      'bg-green-100 border-green-300',
      'bg-purple-100 border-purple-300',
      'bg-pink-100 border-pink-300',
    ];

    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Flashcards for Review</h2>
        {state.flashcards.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No flashcards due for review today. Great job!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {state.flashcards.map((card, index) => {
              const isFlipped = state.flippedFlashcardIds.has(card.id);
              const colorClass = cardColors[index % cardColors.length];

              return (
                <div key={card.id} className={`rounded-lg border p-4 shadow-sm ${colorClass}`}>
                  <div className="min-h-[6rem] flex items-center justify-center">
                    <p className="text-center font-medium text-gray-800">
                      {isFlipped ? card.answer : card.question}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-dashed border-gray-400/50">
                    {isFlipped ? (
                      <div className="flex justify-center gap-3">
                        <button onClick={() => handleReviewFlashcard(card.id, false)} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors w-full">Incorrect</button>
                        <button onClick={() => handleReviewFlashcard(card.id, true)} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors w-full">Correct</button>
                      </div>
                    ) : (
                      <button onClick={() => handleFlipFlashcard(card.id)} className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">Show Answer</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };
  const renderSearch = () => (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          placeholder="Search notes..."
          value={state.searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="space-y-2">
        {state.searchResults.map(note => (
          <div
            key={note.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setState(prev => ({ ...prev, selectedNote: note }))}
          >
            <h3 className="font-medium text-gray-900 mb-1">{note.title}</h3>
            <p className="text-sm text-gray-600 line-clamp-2">{note.content}</p>
            <div className="flex items-center gap-2 mt-2">
              {note.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderNoteDetail = () => {
    if (!state.selectedNote) return null;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setState(prev => ({ ...prev, selectedNote: null }))}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <BookOpen size={16} />
             Back
          </button>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">{state.selectedNote.title}</h2>
          <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
            <span>{formatDate(state.selectedNote.createdAt)}</span>
            <span>{state.selectedNote.folder}</span>
          </div>
          <div className="mb-4">
            <h3 className="font-medium mb-2">Content</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{state.selectedNote.content}</p>
          </div>
          {state.selectedNote.tags.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {state.selectedNote.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => {
                setState(prev => ({
                  ...prev,
                  showCreateFlashcard: true,
                  newFlashcard: {
                    question: prev.selectedNote?.title || '',
                    answer: prev.selectedNote?.content || ''
                  }
                }));
              }}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Layers size={16} />
              Create Flashcard
            </button>
            <button
              onClick={() => handleDeleteNote(state.selectedNote!.id)}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
          {state.showCreateFlashcard && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3 border border-gray-200">
              <h3 className="text-lg font-semibold">New Flashcard</h3>
              <input
                type="text"
                placeholder="Question"
                value={state.newFlashcard.question}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  newFlashcard: { ...prev.newFlashcard, question: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                placeholder="Answer"
                value={state.newFlashcard.answer}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  newFlashcard: { ...prev.newFlashcard, answer: e.target.value }
                }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleCreateFlashcard(state.selectedNote!.id)}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center gap-2"
                >
                  <Save size={16} /> Save Flashcard
                </button>
                <button
                  onClick={() => setState(prev => ({ ...prev, showCreateFlashcard: false }))}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {state.selectedNote ? (
        renderNoteDetail()
      ) : (
        <>
          {/* Header */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900"> <img src="../../public/assets/ai-note-16.png" alt="" /> POP Notes AI</h1>
            </div>
          </div>
          {/* Tabs */}
          <div className="bg-white border-b border-gray-200">
            <div className="flex">
              {(() => {
                const tabs: {
                  id: 'notes' | 'search' | 'flashcards';
                  label: string;
                  icon: typeof BookOpen;
                }[] = [
                  { id: 'notes', label: 'Notes', icon: BookOpen },
                  { id: 'search', label: 'Search', icon: Search },
                  { id: 'flashcards', label: 'Flashcards', icon: Layers }
                ];
                if (state.spacedRepetitionEnabled) {
                  tabs.splice(1, 0, { id: 'flashcards', label: 'Flashcards', icon: Layers });
                }
                return tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setState(prev => ({ ...prev, activeTab: tab.id }))}
                    className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                      state.activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                ));
              })()}
            </div>
          </div>
          {/* Content */}
          <div className="p-4">
            {state.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {state.activeTab === 'notes' && renderNotes()}
                {state.activeTab === 'search' && renderSearch()}
                {state.activeTab === 'flashcards' && renderFlashcards()}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}