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
  // Try using png2icons package via npx
  // png2icons syntax: png2icons output.ico input.png -all
  // Use the largest PNG (256x256) as the source
  const sourcePng = pngFiles.find(f => f.includes('256x256')) || pngFiles[pngFiles.length - 1];
  
  console.log(`Generating ICO file: ${outputPath}`);
  console.log(`Using source PNG: ${sourcePng}`);
  
  // Try png2icons first
  try {
    const command = `npx --yes png2icons "${outputPath}" "${sourcePng}" -all`;
    console.log(`Running: ${command}`);
    execSync(command, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  } catch (png2iconsError) {
    console.log('png2icons failed, trying alternative method...');
    // Fallback: try using sharp if available, or use a simple copy approach
    // For now, let's try installing png2icons locally first
    try {
      // Install png2icons in the mod-loader directory
      execSync('npm install --save-dev png2icons', { 
        stdio: 'inherit', 
        cwd: path.join(__dirname, '..') 
      });
      // Try running it via npx again
      const command = `npx png2icons "${outputPath}" "${sourcePng}" -all`;
      execSync(command, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    } catch (installError) {
      throw new Error(`Failed to generate ICO: ${installError.message}`);
    }
  }
  
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

