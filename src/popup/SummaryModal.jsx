import React, { useState } from 'react';
import { X, Save, Copy, RefreshCw, BookOpen } from 'lucide-react';

const SummaryModal = ({ 
  isOpen, 
  onClose, 
  originalText, 
  summary, 
  summaryType = 'ai',
  onCreateNote,
  onRegenerate 
}) => {
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Auto-generate title and content when modal opens
  React.useEffect(() => {
    if (isOpen && summary) {
      // Generate a title from the summary
      const title = summary.length > 50 
        ? summary.substring(0, 50) + '...' 
        : summary;
      setNoteTitle(title);
      
      // Set content as the summary
      setNoteContent(summary);
    }
  }, [isOpen, summary]);

  const handleCreateNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      alert('Please fill in both title and content');
      return;
    }

    setIsCreatingNote(true);
    try {
      await onCreateNote({
        title: noteTitle.trim(),
        content: noteContent.trim(),
        originalText: originalText,
        summaryType: summaryType
      });
      
      // Close modal after successful note creation
      onClose();
    } catch (error) {
      console.error('Failed to create note:', error);
      alert('Failed to create note: ' + error.message);
    } finally {
      setIsCreatingNote(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await onRegenerate(originalText);
    } catch (error) {
      console.error('Failed to regenerate summary:', error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(summary).then(() => {
      // Show a brief success message
      const button = document.querySelector('.copy-button');
      if (button) {
        const originalText = button.innerHTML;
        button.innerHTML = 'Copied!';
        button.style.background = '#10b981';
        setTimeout(() => {
          button.innerHTML = originalText;
          button.style.background = '';
        }, 2000);
      }
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${summaryType === 'ai' ? 'bg-blue-500' : 'bg-yellow-500'}`}></div>
            <h2 className="text-xl font-bold text-gray-800">
              {summaryType === 'ai' ? '🤖 AI Summary' : '📝 Fallback Summary'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Summary Display */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Generated Summary</h3>
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{summary}</p>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={copyToClipboard}
                className="copy-button flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                <Copy size={16} />
                Copy Summary
              </button>
              {summaryType === 'ai' && (
                <button
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm disabled:opacity-50"
                >
                  <RefreshCw size={16} className={isRegenerating ? 'animate-spin' : ''} />
                  {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                </button>
              )}
            </div>
          </div>

          {/* Original Text Preview */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Original Text</h3>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-32 overflow-y-auto">
              <p className="text-gray-600 text-sm leading-relaxed">
                {originalText.length > 300 
                  ? originalText.substring(0, 300) + '...' 
                  : originalText
                }
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {originalText.length} characters • {originalText.split(/\s+/).length} words
            </p>
          </div>

          {/* Create Note Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <BookOpen size={20} className="text-green-600" />
              Create Note from Summary
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note Title
                </label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter note title..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note Content
                </label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Enter note content..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateNote}
            disabled={isCreatingNote || !noteTitle.trim() || !noteContent.trim()}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {isCreatingNote ? 'Creating...' : 'Create Note'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SummaryModal;
