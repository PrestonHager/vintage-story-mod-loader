#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Generate ICO file from PNG icons for Windows builds
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const iconsDir = path.join(__dirname, '../src-tauri/icons');
const outputPath = path.join(iconsDir, 'icon.ico');

// Find all available PNG icon files
const pngFiles = [
  path.join(iconsDir, '32x32.png'),
  path.join(iconsDir, '128x128.png'),
  path.join(iconsDir, '256x256.png')
].filter(f => fs.existsSync(f));

if (pngFiles.length === 0) {
  console.error('Error: No PNG icon files found in', iconsDir);
  process.exit(1);
}

try {
  // Use the largest PNG (256x256) as the source
  const sourcePng = pngFiles.find(f => f.includes('256x256')) || pngFiles[pngFiles.length - 1];
  
  console.log(`Generating ICO file: ${outputPath}`);
  console.log(`Using source PNG: ${sourcePng}`);
  
  // Install png2icons as a dev dependency if not already installed
  const modLoaderDir = path.join(__dirname, '..');
  const nodeModulesPath = path.join(modLoaderDir, 'node_modules', 'png2icons');
  
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('Installing png2icons...');
    execSync('npm install --save-dev png2icons', { 
      stdio: 'inherit', 
      cwd: modLoaderDir 
    });
  }
  
  // Use png2icons programmatic API
  const png2icons = (await import('png2icons')).default;
  const pngBuffer = fs.readFileSync(sourcePng);
  
  console.log('Converting PNG to ICO...');
  const icoBuffer = png2icons.createICO(pngBuffer, {
    sizes: [16, 32, 48, 64, 128, 256]
  });
  
  fs.writeFileSync(outputPath, icoBuffer);
  
  if (!fs.existsSync(outputPath)) {
    throw new Error(`Failed to generate ${outputPath}`);
  }
  
  const stats = fs.statSync(outputPath);
  if (stats.size === 0) {
    throw new Error(`Generated icon file is empty: ${outputPath}`);
  }
  
  console.log(`Successfully generated ${outputPath} (${stats.size} bytes)`);
} catch (error) {
  console.error('Error generating icon:', error.message);
  console.error('Full error:', error);
  process.exit(1);
}

