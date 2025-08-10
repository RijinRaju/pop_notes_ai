import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Building AI Note Extension...');

// Create dist directory
const distDir = 'dist';
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Copy manifest
fs.copyFileSync('public/manifest.json', 'dist/manifest.json');

// Copy assets
if (fs.existsSync('public/assets')) {
  fs.cpSync('public/assets', 'dist/assets', { recursive: true });
}

// Copy source files
const srcDirs = ['src/background', 'src/content', 'src/popup', 'src/options', 'src/services', 'src/database', 'src/types'];
srcDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    const targetDir = path.join(distDir, dir);
    fs.mkdirSync(targetDir, { recursive: true });
    
    // Copy all files in the directory
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const sourcePath = path.join(dir, file);
      const targetPath = path.join(targetDir, file);
      
      if (fs.statSync(sourcePath).isFile()) {
        fs.copyFileSync(sourcePath, targetPath);
      }
    });
  }
});

// Copy models directory if it exists
if (fs.existsSync('models')) {
  fs.cpSync('models', 'dist/models', { recursive: true });
}

console.log('Extension built successfully in dist/ directory');
console.log('You can now load the extension from the dist/ folder in Chrome');
