import React from 'react';
import { createRoot } from 'react-dom/client';
import FloatingButton from './FloatingButton';
import './content.css';

let root: ReturnType<typeof createRoot> | null = null;
let container: HTMLDivElement | null = null;

const removeFloatingButton = () => {
  if (container) {
    root?.unmount();
    container.remove();
    container = null;
    root = null;
  }
};

const handleSummarize = async (text: string) => {
  console.log('Sending text to background for summary:', text);
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'AI_SUMMARY',
      payload: { text }
    });
    
    if (response.success) {
      // For now, we'll just show an alert with the summary.
      // Later, this can be updated to open the popup.
      alert(`AI Summary:\n${response.summary}`);
    } else {
      console.error('Failed to get summary:', response.error);
      alert('Failed to get summary.');
    }
  } catch (error) {
    console.error('Error sending message for summary:', error);
    alert('An error occurred while summarizing.');
  }
  removeFloatingButton();
};

document.addEventListener('mouseup', () => {
  setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (container && (!selectedText || selectedText.length < 20)) {
      removeFloatingButton();
      return;
    }

    if (selectedText && selectedText.length >= 20) {
      if (container) removeFloatingButton();

      const range = selection!.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      container = document.createElement('div');
      container.id = 'ai-note-floating-button-container';
      document.body.appendChild(container);

      root = createRoot(container);
      root.render(
        React.createElement(FloatingButton, {
          top: window.scrollY + rect.bottom + 5,
          left: window.scrollX + rect.left,
          selectedText: selectedText,
          onSummarize: handleSummarize,
        })
      );
    }
  }, 10);
});

document.addEventListener('mousedown', (event) => {
  if (container && !(event.target as HTMLElement).closest('#ai-note-floating-button-container')) {
    removeFloatingButton();
  }
});