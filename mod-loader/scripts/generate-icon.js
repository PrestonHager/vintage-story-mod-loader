#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Generate ICO file from PNG icons for Windows builds
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
  // Try using to-ico package via npx
  // to-ico syntax: to-ico input1.png input2.png ... -o output.ico
  const command = `npx --yes to-ico ${pngFiles.map(f => `"${f}"`).join(' ')} -o "${outputPath}"`;
  console.log(`Generating ICO file: ${outputPath}`);
  console.log(`Using PNG files: ${pngFiles.join(', ')}`);
  execSync(command, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  
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

