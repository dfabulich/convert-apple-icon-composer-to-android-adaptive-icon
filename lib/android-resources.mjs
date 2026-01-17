/**
 * Generate Android Adaptive Icon resources (XML and PNG files)
 */

import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { samplePixelColor } from './image-processor.mjs';
import { getFillForDefaultAppearance, parseColorString } from './icon-utils.mjs';

/**
 * Generate adaptive-icon.xml file
 * 
 * @param {string} outputPath - Path where the XML file will be written
 * @param {string} backgroundMipmap - Mipmap name for background (e.g., 'ic_launcher_background')
 * @param {string} foregroundMipmap - Mipmap name for foreground (e.g., 'ic_launcher_foreground')
 */
export async function generateAdaptiveIconXml(outputPath, backgroundDrawable, foregroundMipmap, monochromeMipmap = null) {
  // Background can be either a drawable (for gradients) or a mipmap (for PNGs)
  const backgroundRef = backgroundDrawable.startsWith('@') 
    ? backgroundDrawable 
    : `@drawable/${backgroundDrawable}`;
  
  let monochromeElement = '';
  if (monochromeMipmap) {
    monochromeElement = `\n    <monochrome android:drawable="@mipmap/${monochromeMipmap}" />`;
  }
  
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="${backgroundRef}" />
    <foreground android:drawable="@mipmap/${foregroundMipmap}" />${monochromeElement}
</adaptive-icon>
`;

  await fs.writeFile(outputPath, xml, 'utf-8');
}


/**
 * Convert RGB values (0-255) to Android hex color string (#AARRGGBB or #RRGGBB)
 */
function rgbToHex(r, g, b) {
  return `#${[r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('')}`;
}

/**
 * Generate Android drawable XML for a gradient background using layer-list
 * 
 * Creates a gradient that:
 * - Top solid section from 0dp to top of safe area (18dp)
 * - Gradient section from top of safe area (18dp) to 70% of safe area (64.2dp)
 * - Bottom solid section from gradient end (64.2dp) to bottom (108dp)
 * 
 * @param {string} outputPath - Path where the XML file will be written
 * @param {string} topColorHex - Top color in hex format (#RRGGBB)
 * @param {string} bottomColorHex - Bottom color in hex format (#RRGGBB)
 */
export async function generateGradientDrawableXml(outputPath, topColorHex, bottomColorHex) {
  // Android Adaptive Icon: 108dp total, 18dp padding, 66dp safe area
  // Top solid: 0dp to 18dp (top of safe area)
  // Gradient: 18dp to 70% of safe area = 18dp + (66dp * 0.7) = 18dp + 46.2dp = 64.2dp
  // Bottom solid: 64.2dp to 108dp
  
  const totalHeightDp = 108;
  const paddingDp = 18;
  const safeAreaDp = 66;
  const gradientEndDp = Math.round((paddingDp + (safeAreaDp * 0.7)) * 10) / 10; // 64.2dp, rounded to 1 decimal
  const gradientHeightDp = Math.round((gradientEndDp - paddingDp) * 10) / 10; // 46.2dp, rounded to 1 decimal
  const bottomSectionTopDp = gradientEndDp; // 64.2dp
  
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Top solid section: 0dp to top of safe area (18dp) -->
    <item android:height="${paddingDp}dp">
        <shape android:shape="rectangle">
            <solid android:color="${topColorHex}" />
        </shape>
    </item>

    <!-- Gradient section: from top of safe area (18dp) to 70% of safe area (64.2dp) -->
    <item
        android:top="${paddingDp}dp"
        android:height="${gradientHeightDp}dp">
        <shape android:shape="rectangle">
            <gradient
                android:type="linear"
                android:angle="270"
                android:startColor="${topColorHex}"
                android:endColor="${bottomColorHex}" />
        </shape>
    </item>

    <!-- Bottom solid section: from gradient end (64.2dp) to bottom (108dp) -->
    <item android:top="${bottomSectionTopDp}dp">
        <shape android:shape="rectangle">
            <solid android:color="${bottomColorHex}" />
        </shape>
    </item>
</layer-list>
`;

  await fs.writeFile(outputPath, xml, 'utf-8');
}

/**
 * Detect gradient colors from icon.json and/or background image and generate drawable XML
 * 
 * For linear-gradient: reads both colors from icon.json
 * For automatic-gradient: samples top color from image, reads bottom color from icon.json
 * 
 * @param {Object} iconData - The icon.json data
 * @param {string} backgroundImagePath - Path to the background PNG (for sampling automatic-gradient top color)
 * @param {string} outputPath - Path where the drawable XML will be written
 */
export async function generateBackgroundDrawableFromIcon(iconData, backgroundImagePath, outputPath) {
  const fill = getFillForDefaultAppearance(iconData);
  
  if (!fill) {
    throw new Error('No fill found in icon.json');
  }
  
  let topColor, bottomColor;
  
  // Handle string values: "automatic" or "none" means plain white background
  if (typeof fill === 'string') {
    if (fill === 'automatic' || fill === 'none') {
      // Plain white background
      topColor = bottomColor = { r: 255, g: 255, b: 255 };
    } else if (fill === 'system-dark') {
      // Dark background (typically dark gray/black)
      topColor = bottomColor = { r: 0, g: 0, b: 0 };
    } else if (fill === 'system-light') {
      // Light background (typically white)
      topColor = bottomColor = { r: 255, g: 255, b: 255 };
    } else {
      throw new Error(`Unsupported fill string value: ${fill}`);
    }
  }
  // Handle linear-gradient: both colors are in JSON
  else if (fill['linear-gradient'] && Array.isArray(fill['linear-gradient'])) {
    const gradientColors = fill['linear-gradient'];
    if (gradientColors.length >= 2) {
      topColor = parseColorString(gradientColors[0]);
      bottomColor = parseColorString(gradientColors[1]);
      
      if (!topColor || !bottomColor) {
        throw new Error('Failed to parse linear-gradient colors from icon.json');
      }
    }
  }
  // Handle automatic-gradient: only bottom color in JSON, need to sample top color
  else if (fill['automatic-gradient']) {
    bottomColor = parseColorString(fill['automatic-gradient']);
    if (!bottomColor) {
      throw new Error('Failed to parse automatic-gradient bottom color from icon.json');
    }
    
    // Sample top color from the exported background image
    // Sample at center, 50px down from top of the original image
    const image = sharp(backgroundImagePath);
    const metadata = await image.metadata();
    const centerX = metadata.width / 2;
    
    // Sample at 50px from the top (as specified by user)
    // This should be in the actual image, not in padded area
    const topY = 50;
    const topColorData = await samplePixelColor(backgroundImagePath, centerX, topY);
    topColor = { r: topColorData.r, g: topColorData.g, b: topColorData.b };
  }
  // Handle solid color: use same color for top and bottom
  else if (fill.solid) {
    const solidColor = parseColorString(fill.solid);
    if (!solidColor) {
      throw new Error('Failed to parse solid color from icon.json');
    }
    topColor = bottomColor = solidColor;
  }
  else {
    throw new Error(`Unsupported fill type: ${typeof fill === 'object' ? Object.keys(fill)[0] : fill}`);
  }
  
  // Convert to hex
  const topColorHex = rgbToHex(topColor.r, topColor.g, topColor.b);
  const bottomColorHex = rgbToHex(bottomColor.r, bottomColor.g, bottomColor.b);
  
  // Generate gradient drawable XML
  await generateGradientDrawableXml(outputPath, topColorHex, bottomColorHex);
  
  return { topColorHex, bottomColorHex };
}

/**
 * Create Android resource directory structure and copy PNG files
 * 
 * Creates:
 * - res/mipmap-anydpi-v26/ic_launcher.xml (adaptive icon XML for API 26+)
 * - res/drawable/ic_launcher_background.xml (gradient drawable)
 * - res/mipmap-xxxhdpi/ic_launcher.png (fallback for API 25 and lower)
 * - res/mipmap-xxxhdpi/ic_launcher_foreground.png
 * - res/mipmap-xxxhdpi/ic_launcher_foreground_monochrome.png (if provided)
 * 
 * @param {string} baseOutputDir - Base output directory
 * @param {Object} iconData - The original icon.json data
 * @param {string} fullPngPath - Path to full icon PNG file (for API 25 fallback)
 * @param {string} backgroundPngPath - Path to background PNG file (for color sampling if needed)
 * @param {string} foregroundPngPath - Path to foreground PNG file
 * @param {string} monochromeForegroundPngPath - Optional path to monochrome foreground PNG file
 */
export async function createAndroidResourceStructure(baseOutputDir, iconData, fullPngPath, backgroundPngPath, foregroundPngPath, monochromeForegroundPngPath = null) {
  // Create directories
  const anydpiDir = path.join(baseOutputDir, 'res', 'mipmap-anydpi-v26');
  const drawableDir = path.join(baseOutputDir, 'res', 'drawable');
  const mipmapDir = path.join(baseOutputDir, 'res', 'mipmap-xxxhdpi');
  
  await fs.mkdir(anydpiDir, { recursive: true });
  await fs.mkdir(drawableDir, { recursive: true });
  await fs.mkdir(mipmapDir, { recursive: true });
  
  // Copy full icon for API 25 and lower fallback
  const fullIconDest = path.join(mipmapDir, 'ic_launcher.png');
  await fs.copyFile(fullPngPath, fullIconDest);
  
  // Copy foreground PNG file
  const foregroundDest = path.join(mipmapDir, 'ic_launcher_foreground.png');
  await fs.copyFile(foregroundPngPath, foregroundDest);
  
  // Copy monochrome foreground PNG file if provided
  let monochromeMipmap = null;
  if (monochromeForegroundPngPath) {
    const monochromeDest = path.join(mipmapDir, 'ic_launcher_foreground_monochrome.png');
    await fs.copyFile(monochromeForegroundPngPath, monochromeDest);
    monochromeMipmap = 'ic_launcher_foreground_monochrome';
  }
  
  // Generate gradient drawable XML from icon.json (and image if needed)
  const backgroundDrawablePath = path.join(drawableDir, 'ic_launcher_background.xml');
  await generateBackgroundDrawableFromIcon(iconData, backgroundPngPath, backgroundDrawablePath);
  
  // Generate adaptive-icon.xml in mipmap-anydpi-v26 directory
  // Reference the drawable for background instead of mipmap
  const xmlPath = path.join(anydpiDir, 'ic_launcher.xml');
  await generateAdaptiveIconXml(xmlPath, 'ic_launcher_background', 'ic_launcher_foreground', monochromeMipmap);
  
  return {
    anydpiDir,
    drawableDir,
    mipmapDir,
    xmlPath
  };
}
