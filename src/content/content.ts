import { SelectionData } from '../types';

declare const chrome: any;

class ContentScript {
  private selectionOverlay: HTMLElement | null = null;
  private isSelecting = false;
  private startPos = { x: 0, y: 0 };
  private currentSelection: SelectionData | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    this.injectStyles();
    this.setupEventListeners();
    this.createSelectionOverlay();
    this.setupContextMenu();
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .ai-note-selection-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 999999;
      }

      .ai-note-selection-box {
        position: absolute;
        border: 2px solid #3b82f6;
        background: rgba(59, 130, 246, 0.1);
        pointer-events: none;
      }

      .ai-note-toolbar {
        position: fixed;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        padding: 8px;
        display: flex;
        gap: 4px;
        z-index: 1000000;
        pointer-events: auto;
      }

      .ai-note-toolbar button {
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        background: #3b82f6;
        color: white;
        cursor: pointer;
        font-size: 12px;
        transition: background 0.2s;
      }

      .ai-note-toolbar button:hover {
        background: #2563eb;
      }

      .ai-note-toolbar button.secondary {
        background: #6b7280;
      }

      .ai-note-toolbar button.secondary:hover {
        background: #4b5563;
      }

      .ai-note-highlight {
        background: rgba(59, 130, 246, 0.2);
        border-bottom: 2px solid #3b82f6;
      }

      .ai-note-screenshot-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.3);
        z-index: 999998;
        cursor: crosshair;
      }

      .ai-note-screenshot-area {
        position: absolute;
        border: 2px dashed #3b82f6;
        background: rgba(59, 130, 246, 0.1);
      }
    `;
    document.head.appendChild(style);
  }

  private createSelectionOverlay(): void {
    this.selectionOverlay = document.createElement('div');
    this.selectionOverlay.className = 'ai-note-selection-overlay';
    this.selectionOverlay.style.display = 'none';
    document.body.appendChild(this.selectionOverlay);
  }

  private setupEventListeners(): void {
    // Listen for messages from popup/background
    chrome.runtime.onMessage.addListener((message: any, _sender: any, sendResponse: any) => {
      switch (message.type) {
        case 'START_SELECTION':
          this.startSelectionMode();
          sendResponse({ success: true });
          break;
        case 'START_SCREENSHOT':
          this.startScreenshotMode();
          sendResponse({ success: true });
          break;
        case 'GET_PAGE_INFO':
          sendResponse({
            url: window.location.href,
            title: document.title,
            text: this.getSelectedText()
          });
          break;
        case 'PARSE_PDF':
          this.parsePDF().then(sendResponse);
          return true; // Keep message channel open for async response
        case 'PARSE_DOCX':
          this.parseDOCX().then(sendResponse);
          return true;
      }
    });

    // Handle text selection
    document.addEventListener('mouseup', this.handleTextSelection.bind(this));
    document.addEventListener('keyup', this.handleTextSelection.bind(this));
  }

  private setupContextMenu(): void {
    // Add custom context menu items
    document.addEventListener('contextmenu', (e) => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        // Store selection for context menu
        this.currentSelection = {
          text: selection.toString(),
          rect: selection.getRangeAt(0).getBoundingClientRect(),
          element: e.target as HTMLElement
        };
      }
    });
  }

  private handleTextSelection(): void {
    const selection = window.getSelection();
    if (!selection || selection.toString().trim() === '') {
      this.hideToolbar();
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    this.currentSelection = {
      text: selection.toString(),
      rect,
      element: range.commonAncestorContainer.parentElement as HTMLElement
    };

    this.showToolbar(rect);
  }

  private showToolbar(rect: DOMRect): void {
    this.hideToolbar();

    const toolbar = document.createElement('div');
    toolbar.className = 'ai-note-toolbar';
    toolbar.innerHTML = `
      <button id="ai-note-summarize">Summarize</button>
      <button id="ai-note-save" class="secondary">Save Note</button>
      <button id="ai-note-flashcard" class="secondary">Create Flashcard</button>
      <button id="ai-note-close" class="secondary">×</button>
    `;

    // Position toolbar
    const top = Math.max(0, rect.top - toolbar.offsetHeight - 10);
    const left = Math.max(0, rect.left);
    toolbar.style.top = `${top}px`;
    toolbar.style.left = `${left}px`;

    document.body.appendChild(toolbar);

    // Add event listeners
    toolbar.querySelector('#ai-note-summarize')?.addEventListener('click', () => {
      this.summarizeSelection();
    });

    toolbar.querySelector('#ai-note-save')?.addEventListener('click', () => {
      this.saveSelection();
    });

    toolbar.querySelector('#ai-note-flashcard')?.addEventListener('click', () => {
      this.createFlashcard();
    });

    toolbar.querySelector('#ai-note-close')?.addEventListener('click', () => {
      this.hideToolbar();
    });

    // Auto-hide after 5 seconds
    setTimeout(() => this.hideToolbar(), 5000);
  }

  private hideToolbar(): void {
    const toolbar = document.querySelector('.ai-note-toolbar');
    if (toolbar) {
      toolbar.remove();
    }
  }

  private startSelectionMode(): void {
    this.isSelecting = true;
    document.body.style.cursor = 'crosshair';
    
    document.addEventListener('mousedown', this.handleSelectionStart.bind(this));
    document.addEventListener('mousemove', this.handleSelectionMove.bind(this));
    document.addEventListener('mouseup', this.handleSelectionEnd.bind(this));
  }

  private handleSelectionStart(e: MouseEvent): void {
    if (!this.isSelecting) return;
    
    this.startPos = { x: e.clientX, y: e.clientY };
    this.selectionOverlay!.style.display = 'block';
    
    const selectionBox = document.createElement('div');
    selectionBox.className = 'ai-note-selection-box';
    selectionBox.id = 'ai-note-current-selection';
    this.selectionOverlay!.appendChild(selectionBox);
  }

  private handleSelectionMove(e: MouseEvent): void {
    if (!this.isSelecting) return;
    
    const selectionBox = document.getElementById('ai-note-current-selection');
    if (!selectionBox) return;

    const left = Math.min(this.startPos.x, e.clientX);
    const top = Math.min(this.startPos.y, e.clientY);
    const width = Math.abs(e.clientX - this.startPos.x);
    const height = Math.abs(e.clientY - this.startPos.y);

    selectionBox.style.left = `${left}px`;
    selectionBox.style.top = `${top}px`;
    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;
  }

  private handleSelectionEnd(_e: MouseEvent): void {
    if (!this.isSelecting) return;
    
    this.isSelecting = false;
    document.body.style.cursor = 'default';
    
    // Capture the selected area
    const selectionBox = document.getElementById('ai-note-current-selection');
    if (selectionBox) {
      const rect = selectionBox.getBoundingClientRect();
      this.captureScreenshot(rect);
    }
    
    this.selectionOverlay!.style.display = 'none';
    this.selectionOverlay!.innerHTML = '';
    
    // Remove event listeners
    document.removeEventListener('mousedown', this.handleSelectionStart);
    document.removeEventListener('mousemove', this.handleSelectionMove);
    document.removeEventListener('mouseup', this.handleSelectionEnd);
  }

  private startScreenshotMode(): void {
    const overlay = document.createElement('div');
    overlay.className = 'ai-note-screenshot-overlay';
    overlay.id = 'ai-note-screenshot-overlay';
    document.body.appendChild(overlay);

    let isSelecting = false;
    let startPos = { x: 0, y: 0 };
    let selectionArea: HTMLElement | null = null;

    overlay.addEventListener('mousedown', (e) => {
      isSelecting = true;
      startPos = { x: e.clientX, y: e.clientY };
      
      selectionArea = document.createElement('div');
      selectionArea.className = 'ai-note-screenshot-area';
      overlay.appendChild(selectionArea);
    });

    overlay.addEventListener('mousemove', (e) => {
      if (!isSelecting || !selectionArea) return;
      
      const left = Math.min(startPos.x, e.clientX);
      const top = Math.min(startPos.y, e.clientY);
      const width = Math.abs(e.clientX - startPos.x);
      const height = Math.abs(e.clientY - startPos.y);

      selectionArea.style.left = `${left}px`;
      selectionArea.style.top = `${top}px`;
      selectionArea.style.width = `${width}px`;
      selectionArea.style.height = `${height}px`;
    });

    overlay.addEventListener('mouseup', (_e) => {
      if (!isSelecting || !selectionArea) return;
      
      isSelecting = false;
      const rect = selectionArea.getBoundingClientRect();
      
      setTimeout(() => {
        this.captureScreenshot(rect);
        overlay.remove();
      }, 100);
    });

    // Cancel on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
      }
    }, { once: true });
  }

  private async captureScreenshot(rect: DOMRect): Promise<void> {
    try {
      // Use html2canvas to capture the selected area
      const canvas = await (window as any).html2canvas(document.body, {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        useCORS: true,
        allowTaint: true
      });

      const imageData = canvas.toDataURL('image/png');
      
      // Send to background script for processing
      chrome.runtime.sendMessage({
        type: 'SCREENSHOT_CAPTURED',
        payload: {
          imageData,
          rect: {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height
          },
          url: window.location.href,
          title: document.title
        }
      });
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
    }
  }

  private getSelectedText(): string {
    const selection = window.getSelection();
    return selection ? selection.toString() : '';
  }

  private async summarizeSelection(): Promise<void> {
    if (!this.currentSelection) return;

    chrome.runtime.sendMessage({
      type: 'AI_SUMMARY',
      payload: {
        text: this.currentSelection.text,
        url: window.location.href,
        title: document.title
      }
    });
  }

  private async saveSelection(): Promise<void> {
    if (!this.currentSelection) return;

    chrome.runtime.sendMessage({
      type: 'CREATE_NOTE',
      payload: {
        title: document.title,
        content: this.currentSelection.text,
        url: window.location.href,
        type: 'text',
        metadata: {
          pageTitle: document.title,
          selection: this.currentSelection.text
        }
      }
    });
  }

  private async createFlashcard(): Promise<void> {
    if (!this.currentSelection) return;

    chrome.runtime.sendMessage({
      type: 'CREATE_FLASHCARD',
      payload: {
        content: this.currentSelection.text,
        url: window.location.href,
        title: document.title
      }
    });
  }

  private async parsePDF(): Promise<any> {
    // Check if current page is a PDF
    if (!window.location.href.toLowerCase().includes('.pdf')) {
      return { error: 'Not a PDF page' };
    }

    try {
      // Use PDF.js to parse PDF content
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) {
        return { error: 'PDF.js not available' };
      }

      const loadingTask = pdfjsLib.getDocument(window.location.href);
      const pdf = await loadingTask.promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }

      return {
        success: true,
        text: fullText,
        pages: pdf.numPages,
        url: window.location.href,
        title: document.title
      };
    } catch (error) {
      return { error: 'Failed to parse PDF', details: (error as Error).message };
    }
  }

  private async parseDOCX(): Promise<any> {
    // This would require the document to be loaded in the browser
    // For now, return an error as DOCX parsing requires special handling
    return { error: 'DOCX parsing not implemented in content script' };
  }
}

// Initialize content script
new ContentScript(); 