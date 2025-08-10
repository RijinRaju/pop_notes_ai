# ONNX Model Setup Guide for AI Note Extension

This guide explains how to set up and use the ONNX model functionality in the AI Note extension.

## Overview

The AI Note extension includes an ONNX-based text summarization model (Flan-T5-small) that provides AI-powered text summarization capabilities. The system is designed to gracefully fall back to lightweight summarization if the ONNX model is not available.

## Features

- **ONNX Model**: Uses Flan-T5-small for high-quality text summarization
- **Fallback Mode**: Lightweight extractive summarization when ONNX is unavailable
- **Progressive Enhancement**: Automatically detects and uses the best available method
- **Web-Optimized**: Configured for browser-based inference

## Requirements

- Chrome extension with manifest v3
- ONNX Runtime Web support
- WASM support in the browser
- Model file: `models/flan-t5-small.onnx`

## Installation

### 1. Install Dependencies

```bash
npm install onnxruntime-web
```

### 2. Download the Model

Download the Flan-T5-small ONNX model and place it in the `models/` directory:

```bash
# Create models directory if it doesn't exist
mkdir -p models

# Download the model (you'll need to obtain this from a trusted source)
# Place it as models/flan-t5-small.onnx
```

### 3. Build the Extension

```bash
npm run build
```

## Usage

### Testing the ONNX Model

1. Open the test page: `test-onnx.html`
2. The page will automatically test the ONNX model
3. Use the test buttons to verify functionality

### Programmatic Usage

```javascript
import onnxModelService from './services/onnxService.js';

// Initialize the service
await onnxModelService.initialize();

// Generate a summary
const summary = await onnxModelService.generateSummary('Your text here...');

// Check model status
const status = onnxModelService.getModelInfo();
```

## Architecture

### Service Layers

1. **ONNX Layer**: Full model inference using ONNX Runtime
2. **Runtime Layer**: ONNX Runtime available but model not loaded
3. **Lightweight Layer**: Fallback extractive summarization

### Model Information

- **Input**: Text (max 512 tokens)
- **Output**: Summary (max 150 tokens)
- **Model**: Flan-T5-small (text-to-text transfer)
- **Format**: ONNX (optimized for web)

## Configuration

### Model Settings

```javascript
// In onnxService.js
this.maxInputLength = 512;      // Maximum input length
this.maxOutputLength = 150;     // Maximum output length
this.modelPath = 'models/flan-t5-small.onnx';
```

### Session Options

```javascript
const sessionOptions = {
  executionProviders: ['wasm'],
  graphOptimizationLevel: 'all',
  enableCpuMemArena: true,
  enableMemPattern: true,
  executionMode: 'sequential'
};
```

## Troubleshooting

### Common Issues

1. **Model not loading**
   - Check if the model file exists in `models/` directory
   - Verify the model path in the service
   - Check browser console for errors

2. **ONNX Runtime not available**
   - Ensure `onnxruntime-web` is installed
   - Check if WASM is supported in the browser
   - Verify the import statement

3. **Performance issues**
   - The model may take time to load initially
   - Consider using the lightweight mode for quick summaries
   - Monitor memory usage in the browser

### Debug Mode

Enable detailed logging by setting log levels in the session options:

```javascript
logSeverityLevel: 1,    // Enable info logging
logVerbosityLevel: 1    // Enable verbose logging
```

## Performance Considerations

- **Initial Load**: Model loading can take 5-10 seconds
- **Memory Usage**: ONNX models can use significant memory
- **Inference Speed**: First inference may be slower due to JIT compilation
- **Browser Compatibility**: Test across different browsers and versions

## Security Notes

- The model runs entirely in the browser
- No data is sent to external servers
- Model files should be verified for integrity
- Consider model size and loading time for user experience

## Future Enhancements

- Model quantization for smaller file sizes
- Progressive model loading
- Multiple model support
- Custom model training integration
- Performance optimization for mobile devices

## Support

For issues related to:
- ONNX Runtime: Check the [ONNX Runtime documentation](https://onnxruntime.ai/)
- Model compatibility: Verify the model format and version
- Extension integration: Check the Chrome extension documentation
- Performance: Monitor browser developer tools and console logs
