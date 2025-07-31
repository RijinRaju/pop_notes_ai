import React from 'react';

interface FloatingButtonProps {
  top: number;
  left: number;
  selectedText: string;
  onSummarize: (text: string) => void;
}

const FloatingButton: React.FC<FloatingButtonProps> = ({ top, left, selectedText, onSummarize }) => {
  const handleSummarizeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSummarize(selectedText);
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 10000,
      }}
    >
      <button
        onClick={handleSummarizeClick}
        className="bg-blue-600 text-white border-none px-3 py-2 rounded-md cursor-pointer shadow-lg flex items-center gap-2 text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c7.2 0 9 1.8 9 9s-1.8 9-9 9-9-1.8-9-9 1.8-9 9-9z"/><path d="M12 15l-4-4"/><path d="M12 15l4-4"/></svg>
        Summarize with AI
      </button>
    </div>
  );
};

export default FloatingButton;