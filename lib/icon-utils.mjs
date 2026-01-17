/**
 * Utilities for reading and modifying Apple Icon Composer icon.json files
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Read icon.json from an icon folder
 */
export async function readIconJson(iconFolder) {
  const jsonPath = path.join(iconFolder, 'icon.json');
  const content = await fs.readFile(jsonPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Write icon.json to a folder
 */
export async function writeIconJson(iconFolder, iconData) {
  const jsonPath = path.join(iconFolder, 'icon.json');
  await fs.writeFile(jsonPath, JSON.stringify(iconData, null, 2), 'utf-8');
}

/**
 * Create a version of icon.json with all groups removed (background only)
 */
export function createBackgroundOnlyJson(iconData) {
  return {
    ...iconData,
    groups: []
  };
}

/**
 * Get the fill value for the Default (Light) appearance
 * Handles both direct `fill` and `fill-specializations` array
 */
export function getFillForDefaultAppearance(iconData) {
  // Check for fill-specializations first (most specific)
  if (iconData['fill-specializations']) {
    // Find the entry without an appearance (which is the default)
    const defaultFill = iconData['fill-specializations'].find(
      spec => !spec.appearance && !spec.idiom
    );
    if (defaultFill) {
      return defaultFill.value;
    }
  }
  
  // Fall back to direct fill property
  return iconData.fill || null;
}

/**
 * Parse a color string from icon.json format
 * Formats: "display-p3:r,g,b,a" or "srgb:r,g,b,a" or "extended-gray:gray,alpha"
 * Returns RGB values (0-255 range)
 */
export function parseColorString(colorString) {
  if (!colorString || typeof colorString !== 'string') {
    return null;
  }
  
  const parts = colorString.split(':');
  if (parts.length !== 2) {
    return null;
  }
  
  const colorSpace = parts[0];
  const values = parts[1].split(',').map(parseFloat);
  
  if (colorSpace === 'extended-gray') {
    // Extended gray: single gray value (0-1) and alpha
    const gray = values[0];
    const alpha = values[1] ?? 1.0;
    // Convert gray to RGB
    const rgb = Math.round(gray * 255);
    return { r: rgb, g: rgb, b: rgb, a: alpha };
  } else if (colorSpace === 'display-p3' || colorSpace === 'srgb') {
    // RGB color space: r, g, b, a (all 0-1 range)
    const r = values[0];
    const g = values[1];
    const b = values[2];
    const a = values[3] ?? 1.0;
    
    // Convert from 0-1 range to 0-255 range
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
      a: a
    };
  }
  
  return null;
}
