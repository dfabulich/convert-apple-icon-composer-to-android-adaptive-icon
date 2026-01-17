/**
 * Wrapper for the ictool executable to export images from Icon Composer files
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';

const ICTOOL_PATH = '/Applications/Xcode.app/Contents/Applications/Icon Composer.app/Contents/Executables/ictool';

/**
 * Run ictool to export an image from an icon file
 * 
 * @param {string} iconPath - Path to the .icon folder
 * @param {string} outputPath - Path where the PNG will be written
 * @param {number} width - Image width (default: 1024)
 * @param {number} height - Image height (default: 1024)
 * @param {string} platform - Platform to export for (default: 'iOS')
 * @param {string} rendition - Rendition/appearance (default: 'Default')
 */
export async function exportImage(iconPath, outputPath, {
  width = 1024,
  height = 1024,
  platform = 'iOS',
  rendition = 'Default'
} = {}) {
  return new Promise((resolve, reject) => {
    const args = [
      iconPath,
      '--export-image',
      '--output-file', outputPath,
      '--platform', platform,
      '--rendition', rendition,
      '--width', width.toString(),
      '--height', height.toString(),
      '--scale', '1'
    ];

    const process = spawn(ICTOOL_PATH, args);
    let stderr = '';

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ictool failed with code ${code}: ${stderr}`));
      }
    });

    process.on('error', (error) => {
      reject(new Error(`Failed to spawn ictool: ${error.message}`));
    });
  });
}

/**
 * Verify that ictool exists and is accessible
 */
export async function verifyIctoolExists() {
  try {
    await fs.access(ICTOOL_PATH);
    return true;
  } catch {
    throw new Error(`ictool not found at ${ICTOOL_PATH}. Please ensure Xcode is installed.`);
  }
}
