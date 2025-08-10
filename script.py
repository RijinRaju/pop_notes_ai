#!/usr/bin/env python3
"""
AI Note Extension - ONNX Model Setup Script

This script helps set up the ONNX model for the AI Note extension.
"""

import os
import sys
import hashlib
import urllib.request
from pathlib import Path

def print_banner():
    """Print a nice banner for the script."""
    print("🤖 AI Note Extension - ONNX Model Setup")
    print("=" * 50)
    print()

def check_python_version():
    """Check if Python version is compatible."""
    if sys.version_info < (3, 7):
        print("❌ Python 3.7 or higher is required")
        sys.exit(1)
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")

def create_models_directory():
    """Create the models directory if it doesn't exist."""
    models_dir = Path("models")
    if not models_dir.exists():
        models_dir.mkdir()
        print("📁 Created models directory")
    else:
        print("📁 Models directory already exists")
    return models_dir

def download_model_info():
    """Display information about downloading the model."""
    print("📥 Model Download Information:")
    print("   - Model: Flan-T5-small (ONNX format)")
    print("   - Size: ~301 MB")
    print("   - Source: Hugging Face Model Hub")
    print("   - License: Apache 2.0")
    print()
    print("⚠️  Note: You need to manually download the model file")
    print("   The model file should be placed in the 'models/' directory")
    print("   as 'flan-t5-small.onnx'")
    print()

def check_model_file():
    """Check if the model file exists and verify its size."""
    model_path = Path("models/flan-t5-small.onnx")
    
    if not model_path.exists():
        print("❌ Model file not found: models/flan-t5-small.onnx")
        print("   Please download the model and place it in the models/ directory")
        return False
    
    # Get file size
    size_mb = model_path.stat().st_size / (1024 * 1024)
    print(f"✅ Model file found: {model_path}")
    print(f"   Size: {size_mb:.1f} MB")
    
    if size_mb < 100:
        print("⚠️  Warning: Model file seems too small (< 100 MB)")
        print("   This might not be the correct model file")
        return False
    
    return True

def verify_model_integrity():
    """Verify the model file integrity by checking file size and basic structure."""
    model_path = Path("models/flan-t5-small.onnx")
    
    if not model_path.exists():
        return False
    
    try:
        with open(model_path, 'rb') as f:
            # Read first few bytes to check ONNX magic number
            header = f.read(8)
            if header.startswith(b'ONNX'):
                print("✅ Model file appears to be a valid ONNX file")
                return True
            else:
                print("❌ Model file does not appear to be a valid ONNX file")
                return False
    except Exception as e:
        print(f"❌ Error reading model file: {e}")
        return False

def check_dependencies():
    """Check if required dependencies are available."""
    print("🔍 Checking dependencies...")
    
    # Check if package.json exists
    if not Path("package.json").exists():
        print("❌ package.json not found - are you in the right directory?")
        return False
    
    # Check if onnxruntime-web is in dependencies
    try:
        with open("package.json", "r") as f:
            content = f.read()
            if "onnxruntime-web" in content:
                print("✅ onnxruntime-web dependency found in package.json")
            else:
                print("❌ onnxruntime-web dependency not found in package.json")
                return False
    except Exception as e:
        print(f"❌ Error reading package.json: {e}")
        return False
    
    return True

def provide_download_instructions():
    """Provide detailed download instructions."""
    print("\n📋 Download Instructions:")
    print("1. Visit: https://huggingface.co/google/flan-t5-small")
    print("2. Look for the ONNX model file (flan-t5-small.onnx)")
    print("3. Download the file (should be ~301 MB)")
    print("4. Place it in the 'models/' directory")
    print("5. Run this script again to verify")
    print()
    print("Alternative sources:")
    print("- ONNX Model Zoo: https://github.com/onnx/models")
    print("- Hugging Face ONNX Models: https://huggingface.co/models?search=onnx")

def main():
    """Main function to run the setup script."""
    print_banner()
    
    # Check Python version
    check_python_version()
    
    # Check dependencies
    if not check_dependencies():
        print("\n❌ Dependencies check failed")
        sys.exit(1)
    
    # Create models directory
    models_dir = create_models_directory()
    
    # Check if model file exists
    if check_model_file():
        # Verify model integrity
        if verify_model_integrity():
            print("\n🎉 ONNX model setup is complete!")
            print("   You can now build and test the extension")
        else:
            print("\n⚠️  Model file verification failed")
            print("   Please check if you have the correct model file")
    else:
        # Provide download instructions
        download_model_info()
        provide_download_instructions()
    
    print("\n" + "=" * 50)
    print("Setup script completed")

if __name__ == "__main__":
    main()