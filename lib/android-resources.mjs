/**
 * Generate Android Adaptive Icon resources (XML and PNG files)
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Generate adaptive-icon.xml file
 * 
 * @param {string} outputPath - Path where the XML file will be written
 * @param {string} backgroundMipmap - Mipmap name for background (e.g., 'ic_launcher_background')
 * @param {string} foregroundMipmap - Mipmap name for foreground (e.g., 'ic_launcher_foreground')
 */
export async function generateAdaptiveIconXml(outputPath, backgroundMipmap, foregroundMipmap) {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/${backgroundMipmap}" />
    <foreground android:drawable="@mipmap/${foregroundMipmap}" />
</adaptive-icon>
`;

  await fs.writeFile(outputPath, xml, 'utf-8');
}

/**
 * Create Android resource directory structure and copy PNG files
 * 
 * Creates:
 * - res/mipmap-xxxhdpi/ic_launcher/adaptive-icon.xml
 * - res/mipmap-xxxhdpi/ic_launcher_background.png
 * - res/mipmap-xxxhdpi/ic_launcher_foreground.png
 * 
 * @param {string} baseOutputDir - Base output directory
 * @param {string} backgroundPngPath - Path to background PNG file
 * @param {string} foregroundPngPath - Path to foreground PNG file
 */
export async function createAndroidResourceStructure(baseOutputDir, backgroundPngPath, foregroundPngPath) {
  const mipmapDir = path.join(baseOutputDir, 'res', 'mipmap-xxxhdpi');
  const resourceDir = path.join(mipmapDir, 'ic_launcher');
  
  // Create directory structure
  await fs.mkdir(resourceDir, { recursive: true });
  
  // Copy PNG files to mipmap-xxxhdpi directory (as mipmap resources)
  const backgroundDest = path.join(mipmapDir, 'ic_launcher_background.png');
  const foregroundDest = path.join(mipmapDir, 'ic_launcher_foreground.png');
  
  await fs.copyFile(backgroundPngPath, backgroundDest);
  await fs.copyFile(foregroundPngPath, foregroundDest);
  
  // Generate adaptive-icon.xml in ic_launcher directory
  const xmlPath = path.join(resourceDir, 'adaptive-icon.xml');
  await generateAdaptiveIconXml(xmlPath, 'ic_launcher_background', 'ic_launcher_foreground');
  
  return resourceDir;
}
