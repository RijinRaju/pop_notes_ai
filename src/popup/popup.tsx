import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BookOpen, Plus, Trash2, Folder, Tag, Clock, Search } from 'lucide-react';
import { Note } from '../types';

declare const chrome: any;

interface PopupState {
  notes: Note[];
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
}

const Popup: React.FC = () => {
  const [state, setState] = useState<PopupState>({
    notes: [],
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
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const notesResponse = await chrome.runtime.sendMessage({ type: 'GET_NOTES' });
      if (notesResponse.success) {
        setState(prev => ({ ...prev, notes: notesResponse.notes }));
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
          selectedNote: null
        }));
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
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
            <p className="text-sm text-gray-600 line-clamp-2">{note.content}</p>
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
            Back to Notes
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
          <div className="flex gap-2">
            <button
              onClick={() => handleDeleteNote(state.selectedNote!.id)}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
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
              <h1 className="text-xl font-bold text-gray-900">AI Note Taker</h1>
            </div>
          </div>
          {/* Tabs */}
          <div className="bg-white border-b border-gray-200">
            <div className="flex">
              {[
                { id: 'notes', label: 'Notes', icon: BookOpen },
                { id: 'search', label: 'Search', icon: Search }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setState(prev => ({ ...prev, activeTab: tab.id as any }))}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                    (state as any).activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
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
                {(state as any).activeTab === 'notes' && renderNotes()}
                {(state as any).activeTab === 'search' && renderSearch()}
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