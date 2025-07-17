# AI Note Taker - Browser Extension

A powerful AI-powered note-taking browser extension that runs entirely in your browser using local ONNX models for privacy and performance.

## 🚀 Features

### True "Any-Page" Contextual Summaries
- **Smart Text Selection**: Select any text on any webpage and get instant AI-powered summaries
- **Screenshot-to-Summary**: Capture any region of the page (images, charts, code blocks) and get local-AI descriptions
- **PDF & Docx In-Browser Parsing**: Summarize multi-page PDFs and Word docs without uploading anything

### On-Device Learning & Adaptation
- **User-Feedback Loop**: Rate summaries with thumbs up/down to improve local model accuracy
- **Custom Prompt Templates**: Create and share your own prompt templates (e.g., "Explain like I'm five")
- **Domain-Specific Learning**: Model adapts to your specific domains (tech, legal, medical, etc.)

### Smart Note Organization & Retrieval
- **Semantic Tagging**: Automatic topic tagging using local Named Entity Recognition
- **Auto-Folders**: Intelligent folder organization based on content analysis
- **Cross-Page Memory Search**: Search across all saved notes with fuzzy matching and semantic search
- **Offline-First**: All data stored locally with optional encryption

### Learning & Review Tools
- **Flashcard Generation**: One-click conversion of summaries into Anki-style Q&A flashcards
- **Spaced-Repetition Reminders**: Smart scheduler that reminds you when to review flashcards
- **Progress Tracking**: Monitor your learning progress and retention rates

## 🛠️ Technology Stack

### Extension Framework
- **Manifest V3**: Chrome/Edge/Firefox compatible
- **React + TypeScript**: Modern UI with type safety
- **Vite**: Fast build system with HMR
- **Tailwind CSS**: Utility-first styling

### AI & Machine Learning
- **ONNX Runtime Web**: Local model inference
- **FLAN-T5 Small**: 60M parameter model for summarization
- **WebGPU Acceleration**: Hardware acceleration when available
- **WebAssembly Fallback**: CPU-based inference for compatibility

### Data Storage & Security
- **IndexedDB**: Local structured storage
- **Dexie.js**: TypeScript wrapper for IndexedDB
- **Web Crypto API**: Client-side encryption
- **AES-GCM**: Military-grade encryption for sensitive data

### Document Processing
- **PDF.js**: In-browser PDF parsing
- **html2canvas**: Screenshot capture
- **Mammoth.js**: DOCX document parsing

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Chrome/Edge/Firefox browser

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-note-extension
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Download ONNX Model**
   ```bash
   # Create models directory
   mkdir -p models
   
   # Download FLAN-T5 Small ONNX model (you'll need to obtain this)
   # Place it in models/flan-t5-small.onnx
   ```

4. **Build the extension**
   ```bash
   npm run build
   ```

5. **Load in Browser**
   - Open Chrome/Edge and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

### Production Build

1. **Build for production**
   ```bash
   npm run build
   ```

2. **Package for distribution**
   - The `dist` folder contains the extension ready for distribution
   - For Chrome Web Store, zip the contents of `dist`

## 🎯 Usage

### Basic Note Taking
1. **Text Selection**: Select any text on a webpage
2. **AI Summary**: Click the "Summarize" button in the floating toolbar
3. **Save Note**: Click "Save Note" to store with AI-generated summary

### Screenshot Analysis
1. **Open Extension**: Click the extension icon
2. **Take Screenshot**: Click "Take Screenshot" button
3. **Select Area**: Drag to select the area you want to capture
4. **AI Analysis**: Get instant description of the captured content

### PDF Processing
1. **Open PDF**: Navigate to any PDF in your browser
2. **Auto-Detection**: Extension automatically detects PDF files
3. **Parse Content**: Click "Parse PDF" to extract and summarize content

### Flashcard Creation
1. **Select Content**: Choose text or save a note
2. **Create Flashcards**: Click "Create Flashcard" button
3. **Review**: Use spaced repetition to review flashcards

### Search & Organization
1. **Search Notes**: Use the search tab to find notes
2. **Semantic Search**: Search by meaning, not just keywords
3. **Auto-Tagging**: Notes are automatically tagged for easy organization

## 🔧 Configuration

### Settings
- **Encryption**: Enable/disable note encryption
- **Auto-Tagging**: Toggle automatic content tagging
- **Spaced Repetition**: Configure flashcard review intervals
- **Theme**: Light/dark/system theme selection
- **Notifications**: Control reminder notifications

### Custom Prompt Templates
Create your own AI prompts for different use cases:
- Academic research
- Technical documentation
- Creative writing
- Code explanation

## 🔒 Privacy & Security

### Local-First Architecture
- All AI processing happens in your browser
- No data sent to external servers
- Complete privacy and control over your data

### Encryption
- Optional AES-256 encryption for sensitive notes
- Encryption key never leaves your device
- Zero-knowledge architecture

### Data Storage
- All data stored locally in IndexedDB
- No cloud synchronization (by design)
- Export/import functionality for backup

## 🚀 Performance

### Optimizations
- **Model Quantization**: Int8 quantization for faster inference
- **WebGPU Support**: Hardware acceleration when available
- **Lazy Loading**: Models loaded only when needed
- **Caching**: Intelligent caching of processed content

### Resource Usage
- **Memory**: ~50MB for model + runtime
- **Storage**: Varies based on note count
- **CPU**: Minimal impact during idle, moderate during processing

## 🐛 Troubleshooting

### Common Issues

**Extension not loading**
- Check browser console for errors
- Verify manifest.json syntax
- Ensure all dependencies are installed

**Model not loading**
- Verify ONNX model file exists in `models/` directory
- Check network tab for model download errors
- Ensure sufficient memory available

**Performance issues**
- Close other tabs to free memory
- Restart browser if needed
- Check if WebGPU is supported in your browser

### Debug Mode
Enable debug logging:
1. Open extension options
2. Enable "Debug mode"
3. Check browser console for detailed logs

## 🤝 Contributing

### Development
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Areas for Contribution
- Additional AI models
- New document formats
- UI/UX improvements
- Performance optimizations
- Bug fixes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **ONNX Runtime**: Microsoft's cross-platform ML inference
- **FLAN-T5**: Google's instruction-tuned language model
- **React**: Facebook's UI library
- **Tailwind CSS**: Utility-first CSS framework
- **Dexie.js**: IndexedDB wrapper

## 📞 Support

- **Issues**: Report bugs on GitHub Issues
- **Discussions**: Join community discussions
- **Documentation**: Check the wiki for detailed guides

---

**Note**: This extension requires a compatible ONNX model file to function. The model file is not included in this repository due to size constraints. Please obtain the appropriate FLAN-T5 Small ONNX model and place it in the `models/` directory. 