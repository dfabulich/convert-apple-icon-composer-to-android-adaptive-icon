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
 * - res/mipmap-anydpi-v26/ic_launcher.xml (adaptive icon XML for API 26+)
 * - res/mipmap-xxxhdpi/ic_launcher.png (fallback for API 25 and lower)
 * - res/mipmap-xxxhdpi/ic_launcher_background.png
 * - res/mipmap-xxxhdpi/ic_launcher_foreground.png
 * 
 * @param {string} baseOutputDir - Base output directory
 * @param {string} fullPngPath - Path to full icon PNG file (for API 25 fallback)
 * @param {string} backgroundPngPath - Path to background PNG file
 * @param {string} foregroundPngPath - Path to foreground PNG file
 */
export async function createAndroidResourceStructure(baseOutputDir, fullPngPath, backgroundPngPath, foregroundPngPath) {
  // Create mipmap-anydpi-v26 directory for adaptive icon XML (API 26+)
  const anydpiDir = path.join(baseOutputDir, 'res', 'mipmap-anydpi-v26');
  await fs.mkdir(anydpiDir, { recursive: true });
  
  // Create mipmap-xxxhdpi directory for PNG resources
  const mipmapDir = path.join(baseOutputDir, 'res', 'mipmap-xxxhdpi');
  await fs.mkdir(mipmapDir, { recursive: true });
  
  // Copy full icon for API 25 and lower fallback
  const fullIconDest = path.join(mipmapDir, 'ic_launcher.png');
  await fs.copyFile(fullPngPath, fullIconDest);
  
  // Copy background and foreground PNG files
  const backgroundDest = path.join(mipmapDir, 'ic_launcher_background.png');
  const foregroundDest = path.join(mipmapDir, 'ic_launcher_foreground.png');
  
  await fs.copyFile(backgroundPngPath, backgroundDest);
  await fs.copyFile(foregroundPngPath, foregroundDest);
  
  // Generate adaptive-icon.xml in mipmap-anydpi-v26 directory
  const xmlPath = path.join(anydpiDir, 'ic_launcher.xml');
  await generateAdaptiveIconXml(xmlPath, 'ic_launcher_background', 'ic_launcher_foreground');
  
  return {
    anydpiDir,
    mipmapDir,
    xmlPath
  };
}
