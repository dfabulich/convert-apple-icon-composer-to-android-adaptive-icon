#!/usr/bin/env node

/**
 * Convert Apple Icon Composer .icon files to Android Adaptive Icons
 * 
 * This tool:
 * 1. Exports full icon (background + foreground) using ictool
 * 2. Exports background only (by removing groups) using ictool
 * 3. Extracts foreground by subtracting background from full image
 * 4. Generates Android Adaptive Icon resource structure (XML + PNGs)
 * 
 * Usage: node convert-icon.mjs <icon-folder> [output-dir]
 */

import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';

import { readIconJson, createBackgroundOnlyJson, writeIconJson } from './lib/icon-utils.mjs';
import { exportImage, verifyIctoolExists } from './lib/ictool-wrapper.mjs';
import { extractForeground } from './lib/image-processor.mjs';
import { createAndroidResourceStructure } from './lib/android-resources.mjs';

const ICON_SIZE = 1024;
const PLATFORM = 'iOS';
const RENDITION = 'Default'; // Light appearance

/**
 * Main conversion function
 */
async function convertIcon(iconFolder, outputDir) {
  console.log(`Converting icon from: ${iconFolder}`);
  console.log(`Output directory: ${outputDir}\n`);

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Read original icon.json
  const originalIconData = await readIconJson(iconFolder);
  
  // Create temporary directory for modified icon.json
  const tempDir = await fs.mkdir(path.join(tmpdir(), `icon-convert-${Date.now()}`), { recursive: true });
  const tempIconFolder = path.join(tempDir, path.basename(iconFolder));
  await fs.mkdir(tempIconFolder, { recursive: true });
  
  // Copy Assets folder to temp (ictool needs it)
  await fs.cp(
    path.join(iconFolder, 'Assets'),
    path.join(tempIconFolder, 'Assets'),
    { recursive: true }
  );

  // Temporary paths for intermediate images
  const tempFullPath = path.join(tempDir, 'full.png');
  const tempBackgroundPath = path.join(tempDir, 'background.png');
  const tempForegroundPath = path.join(tempDir, 'foreground.png');

  try {
    // Step 1: Export full icon (background + foreground)
    console.log('Step 1/4: Exporting full icon...');
    await exportImage(iconFolder, tempFullPath, {
      width: ICON_SIZE,
      height: ICON_SIZE,
      platform: PLATFORM,
      rendition: RENDITION
    });
    console.log('  ✓ Full icon exported\n');

    // Step 2: Create background-only version
    console.log('Step 2/4: Exporting background only...');
    const backgroundOnlyData = createBackgroundOnlyJson(originalIconData);
    await writeIconJson(tempIconFolder, backgroundOnlyData);
    
    await exportImage(tempIconFolder, tempBackgroundPath, {
      width: ICON_SIZE,
      height: ICON_SIZE,
      platform: PLATFORM,
      rendition: RENDITION
    });
    console.log('  ✓ Background exported\n');

    // Step 3: Extract foreground by subtracting background from full
    console.log('Step 3/4: Extracting foreground...');
    await extractForeground(tempFullPath, tempBackgroundPath, tempForegroundPath);
    console.log('  ✓ Foreground extracted\n');

    // Step 4: Generate Android Adaptive Icon resource structure
    console.log('Step 4/4: Generating Android resources...');
    const resources = await createAndroidResourceStructure(
      outputDir,
      tempFullPath,
      tempBackgroundPath,
      tempForegroundPath
    );
    console.log('  ✓ Android resources created\n');

    console.log('Conversion complete!');
    console.log(`\nAndroid Adaptive Icon resources:`);
    console.log(`  ${resources.anydpiDir}/`);
    console.log(`    └── ic_launcher.xml (API 26+)`);
    console.log(`  ${resources.mipmapDir}/`);
    console.log(`    ├── ic_launcher.png (API 25 fallback)`);
    console.log(`    ├── ic_launcher_background.png`);
    console.log(`    └── ic_launcher_foreground.png`);

  } finally {
    // Cleanup temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node convert-icon.mjs <icon-folder> [output-dir]');
    console.error('');
    console.error('Converts an Apple Icon Composer .icon file to Android Adaptive Icon format.');
    console.error('');
    console.error('Arguments:');
    console.error('  icon-folder   Path to the .icon folder (containing icon.json and Assets/)');
    console.error('  output-dir    Output directory (default: <icon-folder>/android)');
    console.error('');
    console.error('Example:');
    console.error('  node convert-icon.mjs example-icon-composer-icons/Turntable.icon output');
    process.exit(1);
  }

  const iconFolder = path.resolve(args[0]);
  const outputDir = args[1] ? path.resolve(args[1]) : path.join(process.cwd(), 'output', path.basename(iconFolder, '.icon'));

  try {
    // Validate icon folder exists
    await fs.access(iconFolder);
    const iconJsonPath = path.join(iconFolder, 'icon.json');
    await fs.access(iconJsonPath);
    
    // Validate ictool exists
    await verifyIctoolExists();

    await convertIcon(iconFolder, outputDir);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
