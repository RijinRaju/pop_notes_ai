// Content script for AI Note extension
// Note: ES6 imports are not supported in content scripts, so we'll handle dependencies differently

let container = null;

// Test if content script is loaded
console.log('🚀 AI Note content script loaded successfully');

// Add more debugging
console.log('Document ready state:', document.readyState);
console.log('Document body exists:', !!document.body);
console.log('Chrome runtime available:', typeof chrome !== 'undefined' && !!chrome.runtime);
console.log('Extension ID:', chrome?.runtime?.id);

// Helper function to safely send messages to background script
const safeSendMessage = async (message, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (!chrome?.runtime?.id) {
        throw new Error('Chrome runtime not available');
      }
      
      const response = await chrome.runtime.sendMessage(message);
      return response;
    } catch (error) {
      lastError = error;
      console.error(`Error sending message to background script (attempt ${attempt}/${maxRetries}):`, error);
      
      // Check if it's a context invalidation error
      if (error.message.includes('Extension context invalidated')) {
        console.warn('Extension context invalidated - background script may be inactive');
        
        if (attempt < maxRetries) {
          console.log(`Attempting to recover (attempt ${attempt + 1}/${maxRetries})...`);
          
          // Try to reload the extension context
          try {
            await chrome.runtime.reload();
            console.log('Extension context reloaded');
            // Wait a bit and try again
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue; // Try again
          } catch (reloadError) {
            console.error('Failed to reload extension context:', reloadError);
            // Wait a bit longer before next attempt
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue; // Try again
          }
        } else {
          throw new Error('Extension context unavailable after multiple retry attempts - please refresh the page or reload the extension');
        }
      }
      
      // For other errors, don't retry
      throw error;
    }
  }
  
  // If we get here, all retries failed
  throw lastError || new Error('Failed to send message after multiple attempts');
};

// Helper function to check if extension is connected
const checkExtensionConnection = () => {
  try {
    return !!(chrome?.runtime?.id && chrome?.runtime?.connect);
  } catch (error) {
    console.error('Error checking extension connection:', error);
    return false;
  }
};

// Periodic connection check to detect context invalidation
const startConnectionMonitoring = () => {
  setInterval(async () => {
    if (!checkExtensionConnection()) {
      console.warn('⚠️ Extension connection lost - context may be invalidated');
      
      // Remove any existing floating buttons
      if (container) {
        removeFloatingButton();
      }
      
      // Show recovery notification
      showRecoveryNotification();
      
      // Try automatic recovery
      await attemptAutomaticRecovery();
    }
  }, 5000); // Check every 5 seconds
};

// Attempt automatic recovery of extension context
const attemptAutomaticRecovery = async () => {
  console.log('🔄 Attempting automatic recovery...');
  
  try {
    // Try to reload the extension context
    await chrome.runtime.reload();
    console.log('✅ Extension context reloaded automatically');
    
    // Wait for it to initialize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    if (checkExtensionConnection()) {
      console.log('✅ Automatic recovery successful!');
      showNotification('Recovery', 'Extension automatically recovered!', 'success');
      // Reset the recovery shown flag
      window.extensionRecoveryShown = false;
    } else {
      console.warn('⚠️ Automatic recovery failed - connection still not available');
    }
  } catch (error) {
    console.error('❌ Automatic recovery failed:', error);
  }
};

// Show recovery notification when extension context is lost
const showRecoveryNotification = () => {
  // Only show once per session to avoid spam
  if (window.extensionRecoveryShown) return;
  window.extensionRecoveryShown = true;
  
  showNotification(
    'Extension Connection Lost', 
    'The extension context has been lost. Please refresh the page or reload the extension to restore functionality.', 
    'error'
  );
  
  // Reset the flag after 30 seconds so users can see it again if needed
  setTimeout(() => {
    window.extensionRecoveryShown = false;
  }, 30000);
};

// Test extension functionality
const testExtensionFunctionality = async () => {
  console.log('🧪 Testing extension functionality...');
  
  try {
    // Test 1: Check connection
    const isConnected = checkExtensionConnection();
    console.log('✅ Connection status:', isConnected);
    
    if (!isConnected) {
      showNotification('Test Result', '❌ Extension not connected', 'error');
      return;
    }
    
    // Test 2: Try to send a test message
    const response = await safeSendMessage({
      type: 'TEST_DATABASE',
      payload: {}
    });
    
    if (response.success) {
      console.log('✅ Database test passed:', response);
      showNotification('Test Result', '✅ Extension working correctly!', 'success');
    } else {
      console.log('⚠️ Database test failed:', response);
      showNotification('Test Result', '⚠️ Extension partially working - database issues detected', 'info');
    }
    
  } catch (error) {
    console.error('❌ Extension test failed:', error);
    showNotification('Test Result', '❌ Extension test failed: ' + error.message, 'error');
  }
};

// Event listeners for test page communication
document.addEventListener('testONNXModel', async (event) => {
  console.log('🧪 Test page requested ONNX model test');
  await testONNXModel();
});

document.addEventListener('testSummarization', async (event) => {
  console.log('📝 Test page requested summarization test');
  const { text } = event.detail;
  if (text) {
    await testSummarization(text);
  }
});

// Function to dispatch status updates to test page
const dispatchStatusUpdate = (status) => {
  const event = new CustomEvent('modelStatusUpdate', { detail: status });
  document.dispatchEvent(event);
};

// Function to dispatch summarization results to test page
const dispatchSummarizationResult = (result) => {
  const event = new CustomEvent('summarizationResult', { detail: result });
  document.dispatchEvent(event);
};

const testONNXModel = async () => {
  console.log('🤖 Testing ONNX Model...');
  try {
    // For now, just show a message that ONNX is not yet implemented
    console.log('📊 ONNX models will be implemented in future versions');
    
    // Dispatch status to test page
    dispatchStatusUpdate({
      status: 'ONNX models will be implemented in future versions',
      isInitialized: false,
      testCompleted: true
    });
    
  } catch (error) {
    console.error('❌ ONNX Model test failed:', error);
    
    // Dispatch error status to test page
    dispatchStatusUpdate({
      error: error.message,
      testCompleted: false
    });
  }
};

const testSummarization = async (text) => {
  console.log('📝 Testing summarization with text:', text.substring(0, 100) + '...');
  
  try {
    // Simple fallback summarization for now
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    
    let summary = '';
    if (sentences.length <= 2) {
      summary = text;
    } else {
      summary = sentences.slice(0, 2).join('. ') + '.';
      summary += `\n\n[Original: ${words.length} words, ${sentences.length} sentences]`;
    }
    
    console.log('✅ Summarization successful:', summary);
    
    // Dispatch success result to test page
    dispatchSummarizationResult({
      success: true,
      summary: summary,
      originalText: text
    });
    
  } catch (error) {
    console.error('❌ Summarization failed:', error);
    
    // Dispatch error result to test page
    dispatchSummarizationResult({
      success: false,
      error: error.message,
      originalText: text
    });
  }
};

// Log extension status for debugging
const logExtensionStatus = () => {
  console.log('🔍 AI Note Extension Status:');
  console.log('  📍 Chrome Runtime ID:', chrome?.runtime?.id || 'Not available');
  console.log('  🔗 Extension Connected:', checkExtensionConnection());
  console.log('  🌐 Current URL:', window.location.href);
  console.log('  📄 Document Ready State:', document.readyState);
  console.log('  🎯 Extension Version:', chrome?.runtime?.getManifest()?.version || 'Unknown');
  console.log('  📦 Manifest:', chrome?.runtime?.getManifest());
};

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');
    initializeEventListeners();
  });
} else {
  console.log('DOM already loaded');
  initializeEventListeners();
}

function initializeEventListeners() {
  console.log('Initializing event listeners');
  
  // Log extension status for debugging
  logExtensionStatus();
  
  // Start connection monitoring
  startConnectionMonitoring();
  
  document.addEventListener('mouseup', (event) => {
    console.log('Mouse up event triggered');
    handleTextSelection();
  });

  document.addEventListener('mousedown', (event) => {
    if (container && !event.target.closest('#ai-note-floating-button-container')) {
      console.log('Removing floating button - clicked outside');
      removeFloatingButton();
    }
  });
  
  // Add keyboard shortcut for manual recovery (Ctrl+Shift+R)
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.shiftKey && event.key === 'R') {
      console.log('🔄 Manual recovery triggered via keyboard shortcut');
      event.preventDefault();
      attemptAutomaticRecovery();
    }
  });
}

// Add test page event listeners
document.addEventListener('testONNXModel', async (event) => {
  console.log('📡 Test page requested ONNX model test');
  try {
    await testONNXModel();
  } catch (error) {
    console.error('❌ ONNX model test failed from test page:', error);
  }
});

document.addEventListener('testSummarization', async (event) => {
  console.log('📡 Test page requested summarization test:', event.detail);
  try {
    const { text } = event.detail;
    if (text) {
      const summary = await handleSummarize(text);
      console.log('🎉 Test summarization completed:', summary);
      
      // Show result in test page
      const resultEvent = new CustomEvent('summarizationResult', { 
        detail: { summary, success: true } 
      });
      document.dispatchEvent(resultEvent);
    }
  } catch (error) {
    console.error('❌ Test summarization failed:', error);
    
    // Show error in test page
    const resultEvent = new CustomEvent('summarizationResult', { 
      detail: { error: error.message, success: false } 
    });
    document.dispatchEvent(resultEvent);
  }
});

function handleTextSelection() {
  setTimeout(() => {
    try {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();

      console.log('Mouse up event - selected text:', selectedText ? selectedText.substring(0, 50) + '...' : 'none');
      console.log('Selection object:', selection);
      console.log('Selected text length:', selectedText?.length);

      if (container && (!selectedText || selectedText.length < 10)) {
        console.log('Removing floating button - no text or too short');
        removeFloatingButton();
        return;
      }

      if (selectedText && selectedText.length >= 10) {
        console.log('Creating floating button for text length:', selectedText.length);
        if (container) removeFloatingButton();

        try {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          console.log('Range rect:', rect);
          console.log('Scroll positions:', { scrollY: window.scrollY, scrollX: window.scrollX });

          container = createFloatingButton(
            window.scrollY + rect.bottom + 5,
            window.scrollX + rect.left,
            selectedText
          );
          
          document.body.appendChild(container);
          console.log('Floating button created and added to DOM');
        } catch (rangeError) {
          console.error('Error getting range or rect:', rangeError);
        }
      }
    } catch (error) {
      console.error('Error in handleTextSelection:', error);
    }
  }, 10);
}

const removeFloatingButton = () => {
  if (container) {
    container.remove();
    container = null;
  }
};

// ONNX Model Service for AI Summarization
// The class is now imported from the service file

// Initialize ONNX service
// const onnxModelService = new ONNXModelService(); // This line is no longer needed

const handleSummarize = async (text) => {
  console.log('Sending text to background for summary:', text);
  
  // Check extension connection first
  if (!checkExtensionConnection()) {
    console.error('Extension not connected - cannot proceed with summarization');
    showNotification('Error', 'Extension not connected. Please refresh the page or reload the extension.', 'error');
    removeFloatingButton();
    return;
  }
  
  // Show loading state
  const button = document.querySelector('#ai-note-floating-button-container button:first-child');
  if (button) {
    const originalText = button.innerHTML;
    button.innerHTML = `
      <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
        <path d="M21 12a9 9 0 11-6.219-8.56"/>
      </svg>
      Processing...
    `;
    button.disabled = true;
    
    try {
      // Send message to background script for AI summary
      const response = await safeSendMessage({
        type: 'AI_SUMMARY',
        payload: {
          text: text,
          timestamp: new Date().toISOString()
        }
      });
      
      if (response.success) {
        // Instead of showing notification, open the popup with summary data
        const summaryData = {
          originalText: text,
          summary: response.summary,
          type: response.type || 'ai'
        };
        
        // Try to send message directly to popup first
        try {
          await safeSendMessage({
            type: 'SHOW_SUMMARY_MODAL',
            payload: summaryData
          });
        } catch (error) {
          console.log('Could not send message directly to popup, trying background script:', error.message);
          // Fallback to background script
          await safeSendMessage({
            type: 'SHOW_SUMMARY_MODAL',
            payload: summaryData
          });
        }
        
        showNotification('AI Summary', 'Summary generated! Check the popup to view and create notes.', 'success');
      } else {
        // If background script can't handle it, use simple fallback summarization
        console.log('🔄 Background script cannot handle summarization, using simple fallback...');
        
        // Simple fallback summarization
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = text.split(/\s+/).filter(w => w.length > 0);
        
        let fallbackSummary = '';
        if (sentences.length <= 2) {
          fallbackSummary = text;
        } else {
          fallbackSummary = sentences.slice(0, 2).join('. ') + '.';
          fallbackSummary += `\n\n[Original: ${words.length} words, ${sentences.length} sentences]`;
        }
        
        // Show fallback summary in popup as well
        const fallbackData = {
          originalText: text,
          summary: fallbackSummary,
          type: 'fallback'
        };
        
        await safeSendMessage({
          type: 'SHOW_SUMMARY_MODAL',
          payload: fallbackData
        });
        
        showNotification('Fallback Summary', 'Fallback summary generated! Check the popup to view and create notes.', 'info');
      }
    } catch (error) {
      console.error('Error sending message for summary:', error);
      
      // Provide specific error messages based on error type
      let errorMessage = 'An error occurred while summarizing.';
      if (error.message.includes('Extension context invalidated')) {
        errorMessage = 'Extension context lost. Please refresh the page or reload the extension.';
      } else if (error.message.includes('Extension context unavailable')) {
        errorMessage = 'Extension is not available. Please check if the extension is enabled.';
      } else if (error.message.includes('ONNX')) {
        errorMessage = 'AI model failed to load. Using fallback summarization.';
        // Try fallback summarization
        try {
          // Simple fallback summarization
          const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
          const words = text.split(/\s+/).filter(w => w.length > 0);
          
          let fallbackSummary = '';
          if (sentences.length <= 2) {
            fallbackSummary = text;
          } else {
            fallbackSummary = sentences.slice(0, 2).join('. ') + '.';
            fallbackSummary += `\n\n[Original: ${words.length} words, ${sentences.length} sentences]`;
          }
          
          // Show fallback summary in popup
          const fallbackData = {
            originalText: text,
            summary: fallbackSummary,
            type: 'fallback'
          };
          
          await safeSendMessage({
            type: 'SHOW_SUMMARY_MODAL',
            payload: fallbackData
          });
          
          showNotification('Fallback Summary', 'Fallback summary generated! Check the popup to view and create notes.', 'info');
          removeFloatingButton();
          return;
        } catch (fallbackError) {
          console.error('Fallback summarization also failed:', fallbackError);
          errorMessage = 'Both AI and fallback summarization failed.';
        }
      }
      
      showNotification('Error', errorMessage, 'error');
    } finally {
      // Restore button state
      button.innerHTML = originalText;
      button.disabled = false;
    }
  }
  
  removeFloatingButton();
};

const handleCreateNote = async (text) => {
  console.log('Creating note from selected text:', text);
  
  // Check extension connection first
  if (!checkExtensionConnection()) {
    console.error('Extension not connected - cannot create note');
    showNotification('Error', 'Extension not connected. Please refresh the page or reload the extension.', 'error');
    removeFloatingButton();
    return;
  }
  
  try {
    const response = await safeSendMessage({
      type: 'CREATE_NOTE',
      payload: {
        title: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        content: text,
        tags: [],
        folder: 'General',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
    
    if (response.success) {
      showNotification('Success', 'Note created successfully!', 'success');
    } else {
      console.error('Failed to create note:', response.error);
      showNotification('Error', 'Failed to create note: ' + (response.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    console.error('Error creating note:', error);
    let errorMessage = 'An error occurred while creating the note.';
    if (error.message.includes('Extension context invalidated')) {
      errorMessage = 'Extension context lost. Please refresh the page or reload the extension.';
    } else if (error.message.includes('Extension context unavailable')) {
      errorMessage = 'Extension is not available. Please check if the extension is enabled.';
    }
    showNotification('Error', errorMessage, 'error');
  }
  removeFloatingButton();
};

const handleScreenshot = async () => {
  console.log('Taking screenshot and analyzing...');
  
  // Check extension connection first
  if (!checkExtensionConnection()) {
    console.error('Extension not connected - cannot take screenshot');
    showNotification('Error', 'Extension not connected. Please refresh the page or reload the extension.', 'error');
    removeFloatingButton();
    return;
  }
  
  try {
    // Take screenshot of the current page
    const screenshot = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    
    // Send to background for OCR and analysis
    const response = await safeSendMessage({
      type: 'SCREENSHOT_ANALYSIS',
      payload: { 
        screenshot: screenshot,
        url: window.location.href,
        title: document.title
      }
    });
    
    if (response.success) {
      showNotification('Screenshot Analysis', response.summary, 'success');
    } else {
      console.error('Failed to analyze screenshot:', response.error);
      showNotification('Error', 'Failed to analyze screenshot: ' + (response.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    console.error('Error taking screenshot:', error);
    let errorMessage = 'An error occurred while taking screenshot.';
    if (error.message.includes('Extension context invalidated')) {
      errorMessage = 'Extension context lost. Please refresh the page or reload the extension.';
    } else if (error.message.includes('Extension context unavailable')) {
      errorMessage = 'Extension is not available. Please check if the extension is enabled.';
    }
    showNotification('Error', errorMessage, 'error');
  }
  removeFloatingButton();
};

const showNotification = (title, message, type = 'info') => {
  // Create a notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
    z-index: 10001;
    max-width: 300px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.4;
    transform: translateX(100%);
    transition: transform 0.3s ease;
  `;
  
  notification.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 4px;">${title}</div>
    <div>${message}</div>
  `;
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Remove after 5 seconds
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 5000);
};

const createFloatingButton = (top, left, selectedText) => {
  console.log('Creating floating button at:', { top, left, selectedTextLength: selectedText.length });
  
  const buttonContainer = document.createElement('div');
  buttonContainer.id = 'ai-note-floating-button-container';
  buttonContainer.style.cssText = `
    position: absolute;
    top: ${top}px;
    left: ${left}px;
    z-index: 10000;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    border: 1px solid #e5e7eb;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 200px;
  `;

  // Check if extension is connected
  const isConnected = checkExtensionConnection();
  
  if (!isConnected) {
    // Show recovery button when extension is not connected
    const recoveryButton = document.createElement('button');
    recoveryButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
        <path d="M21 3v5h-5"/>
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
        <path d="M3 21v-5h5"/>
      </svg>
      Extension Disconnected - Click to Recover
    `;
    recoveryButton.style.cssText = `
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      border: none;
      padding: 12px 16px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
      width: 100%;
      justify-content: flex-start;
    `;
    recoveryButton.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        recoveryButton.innerHTML = `
          <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
            <path d="M21 12a9 9 0 11-6.219-8.56"/>
          </svg>
          Recovering...
        `;
        recoveryButton.disabled = true;
        
        // Try to reload the extension context
        await chrome.runtime.reload();
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (checkExtensionConnection()) {
          showNotification('Success', 'Extension recovered! You can now use the features.', 'success');
          // Recreate the floating button with normal functionality
          removeFloatingButton();
          setTimeout(() => {
            handleTextSelection();
          }, 100);
        } else {
          throw new Error('Recovery failed');
        }
      } catch (error) {
        console.error('Recovery failed:', error);
        showNotification('Error', 'Recovery failed. Please refresh the page or reload the extension manually.', 'error');
        recoveryButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
            <path d="M3 21v-5h5"/>
          </svg>
          Recovery Failed - Manual Refresh Required
        `;
        recoveryButton.disabled = true;
      }
    });
    
    buttonContainer.appendChild(recoveryButton);
    return buttonContainer;
  }

  // Summarize button
  const summarizeButton = document.createElement('button');
  summarizeButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
      <path d="M12 3c7.2 0 9 1.8 9 9s-1.8 9-9 9-9-1.8-9-9 1.8-9 9-9z"/>
      <path d="M12 15l-4-4"/>
      <path d="M12 15l4-4"/>
    </svg>
    Summarize with AI
  `;
  summarizeButton.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
    width: 100%;
    justify-content: flex-start;
  `;
  summarizeButton.addEventListener('click', (e) => {
    e.stopPropagation();
    handleSummarize(selectedText);
  });
  summarizeButton.addEventListener('mouseenter', (e) => {
    e.currentTarget.style.transform = 'translateY(-1px)';
    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
  });
  summarizeButton.addEventListener('mouseleave', (e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = 'none';
  });

  // Create Note button
  const createNoteButton = document.createElement('button');
  createNoteButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10,9 9,9 8,9"/>
    </svg>
    Create Note
  `;
  createNoteButton.style.cssText = `
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
    width: 100%;
    justify-content: flex-start;
  `;
  createNoteButton.addEventListener('click', (e) => {
    e.stopPropagation();
    handleCreateNote(selectedText);
  });
  createNoteButton.addEventListener('mouseenter', (e) => {
    e.currentTarget.style.transform = 'translateY(-1px)';
    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
  });
  createNoteButton.addEventListener('mouseleave', (e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = 'none';
  });

  // Screenshot button
  const screenshotButton = document.createElement('button');
  screenshotButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
    Screenshot & Analyze
  `;
  screenshotButton.style.cssText = `
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
    width: 100%;
    justify-content: flex-start;
  `;
  screenshotButton.addEventListener('click', (e) => {
    e.stopPropagation();
    handleScreenshot();
  });
  screenshotButton.addEventListener('mouseenter', (e) => {
    e.currentTarget.style.transform = 'translateY(-1px)';
    e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.4)';
  });
  screenshotButton.addEventListener('mouseleave', (e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = 'none';
  });

  buttonContainer.appendChild(summarizeButton);
  buttonContainer.appendChild(createNoteButton);
  buttonContainer.appendChild(screenshotButton);

  // Add test button for debugging (only in development)
  if (chrome.runtime.getManifest().version.includes('dev') || window.location.hostname === 'localhost') {
    const testButton = document.createElement('button');
    testButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
        <path d="M9 12l2 2 4-4"/>
        <path d="M21 12c-1 9-4 9-9 9s-8-1-9-9c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2z"/>
      </svg>
      Test Extension
    `;
    testButton.style.cssText = `
      background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.2s ease;
      width: 100%;
      justify-content: flex-start;
    `;
    testButton.addEventListener('click', (e) => {
      e.stopPropagation();
      testExtensionFunctionality();
    });
    buttonContainer.appendChild(testButton);
  }

  // Test ONNX Model button
  const testOnnxButton = document.createElement('button');
  testOnnxButton.textContent = '🤖 Test AI';
  testOnnxButton.className = 'px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors text-sm';
  testOnnxButton.onclick = testONNXModel;
  buttonContainer.appendChild(testOnnxButton);

  return buttonContainer;
}; 