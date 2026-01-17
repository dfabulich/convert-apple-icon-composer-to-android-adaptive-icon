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
