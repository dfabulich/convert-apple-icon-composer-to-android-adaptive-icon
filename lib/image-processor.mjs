/**
 * Image processing utilities for extracting foreground from composite images
 */

import sharp from 'sharp';

/**
 * Extract foreground by subtracting background from full image
 * 
 * Algorithm:
 * - For each pixel, compare full vs background
 * - If pixels are identical (within threshold): transparent (alpha = 0)
 * - If different: calculate alpha and foreground color using iterative search
 * 
 * The compositing equation: C_full = α × C_fg + (1-α) × C_bg
 * We solve for α and C_fg by finding the alpha that minimizes reconstruction error.
 * 
 * @param {string} fullPath - Path to full composite image
 * @param {string} backgroundPath - Path to background-only image
 * @param {string} outputPath - Path where foreground PNG will be written
 */
export async function extractForeground(fullPath, backgroundPath, outputPath) {
  const full = sharp(fullPath);
  const background = sharp(backgroundPath);

  // Get metadata and ensure same dimensions
  const fullMeta = await full.metadata();
  const bgMeta = await background.metadata();

  if (fullMeta.width !== bgMeta.width || fullMeta.height !== bgMeta.height) {
    throw new Error(`Image size mismatch: full ${fullMeta.width}x${fullMeta.height}, background ${bgMeta.width}x${bgMeta.height}`);
  }

  // Get raw pixel data (RGBA)
  const fullBuffer = await full.ensureAlpha().raw().toBuffer();
  const bgBuffer = await background.ensureAlpha().raw().toBuffer();

  const width = fullMeta.width;
  const height = fullMeta.height;
  const channels = 4; // RGBA

  // Threshold for considering pixels "identical" (allows for minor rendering differences)
  const threshold = 5; // Per channel, 0-255 range

  // Create output buffer
  const outputBuffer = Buffer.alloc(width * height * channels);

  for (let i = 0; i < fullBuffer.length; i += channels) {
    // Extract RGBA values
    const fullR = fullBuffer[i];
    const fullG = fullBuffer[i + 1];
    const fullB = fullBuffer[i + 2];
    const fullA = fullBuffer[i + 3];
    
    const bgR = bgBuffer[i];
    const bgG = bgBuffer[i + 1];
    const bgB = bgBuffer[i + 2];
    const bgA = bgBuffer[i + 3];

    // Calculate difference per channel
    const diffR = Math.abs(fullR - bgR);
    const diffG = Math.abs(fullG - bgG);
    const diffB = Math.abs(fullB - bgB);
    const diffA = Math.abs(fullA - bgA);
    
    const maxDiff = Math.max(diffR, diffG, diffB, diffA);

    if (maxDiff < threshold) {
      // Pixels are essentially identical - this is pure background, make transparent
      outputBuffer[i] = 0;     // R
      outputBuffer[i + 1] = 0; // G
      outputBuffer[i + 2] = 0; // B
      outputBuffer[i + 3] = 0; // A (transparent)
    } else {
      // There's foreground content here
      // Compositing equation: C_full = α × C_fg + (1-α) × C_bg
      
      // Calculate raw differences (signed)
      const signedDiffR = fullR - bgR;
      const signedDiffG = fullG - bgG;
      const signedDiffB = fullB - bgB;
      
      // Iterative approach: try different alpha values and pick the one that
      // minimizes reconstruction error (i.e., when we recompose fg over bg, 
      // we get back exactly C_full)
      
      // Start with a reasonable alpha estimate
      // If foreground color differs from background, alpha must be at least |diff|/255
      const maxAbsDiff = Math.max(Math.abs(signedDiffR), Math.abs(signedDiffG), Math.abs(signedDiffB));
      const minAlpha = maxAbsDiff / 255;
      
      // Search for best alpha in range [minAlpha, 1.0]
      // We'll test alpha values and pick the one with minimum reconstruction error
      let bestAlpha = Math.max(0.01, minAlpha);
      let bestError = Infinity;
      let bestFgR = 0, bestFgG = 0, bestFgB = 0;
      
      // Test alpha values from minAlpha to 1.0 with step size
      const alphaStep = 0.01;
      for (let testAlpha = Math.max(0.01, minAlpha); testAlpha <= 1.0; testAlpha += alphaStep) {
        // Calculate foreground color for this alpha
        // C_fg = (C_full - (1-α) × C_bg) / α
        const testFgR = (fullR - (1 - testAlpha) * bgR) / testAlpha;
        const testFgG = (fullG - (1 - testAlpha) * bgG) / testAlpha;
        const testFgB = (fullB - (1 - testAlpha) * bgB) / testAlpha;
        
        // Clamp foreground colors to valid range
        const clampedFgR = Math.max(0, Math.min(255, Math.round(testFgR)));
        const clampedFgG = Math.max(0, Math.min(255, Math.round(testFgG)));
        const clampedFgB = Math.max(0, Math.min(255, Math.round(testFgB)));
        
        // Reconstruct: recompose foreground over background
        // recomposed = α × C_fg + (1-α) × C_bg
        const recomposedR = testAlpha * clampedFgR + (1 - testAlpha) * bgR;
        const recomposedG = testAlpha * clampedFgG + (1 - testAlpha) * bgG;
        const recomposedB = testAlpha * clampedFgB + (1 - testAlpha) * bgB;
        
        // Calculate reconstruction error (sum of absolute differences)
        const error = Math.abs(recomposedR - fullR) + 
                     Math.abs(recomposedG - fullG) + 
                     Math.abs(recomposedB - fullB);
        
        if (error < bestError) {
          bestError = error;
          bestAlpha = testAlpha;
          bestFgR = clampedFgR;
          bestFgG = clampedFgG;
          bestFgB = clampedFgB;
        }
        
        // Early exit if we found perfect reconstruction
        if (error < 0.1) break;
      }
      
      // If error is still high, might be noise - make transparent if difference is small
      if (bestError > 30 && maxAbsDiff < 15) {
        outputBuffer[i] = 0;
        outputBuffer[i + 1] = 0;
        outputBuffer[i + 2] = 0;
        outputBuffer[i + 3] = 0;
      } else {
        outputBuffer[i] = bestFgR;
        outputBuffer[i + 1] = bestFgG;
        outputBuffer[i + 2] = bestFgB;
        outputBuffer[i + 3] = Math.round(bestAlpha * 255);
      }
    }
  }

  // Write output image
  await sharp(outputBuffer, {
    raw: {
      width,
      height,
      channels: 4
    }
  })
    .png()
    .toFile(outputPath);
}

/**
 * Prepare an image for Android Adaptive Icon format
 * 
 * Android Adaptive Icons should be 108x108 dp with a 66x66 dp safe area.
 * For xxxhdpi, that's 432x432 pixels with a 264x264 pixel safe area.
 * The outer 18dp (72px) on each side is reserved for masking.
 * 
 * This function scales the input image to fit within the safe area and centers
 * it in a 432x432 canvas with transparent padding.
 * 
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path where padded image will be written
 */
export async function prepareForAndroidAdaptiveIcon(inputPath, outputPath) {
  // Android Adaptive Icon specifications for xxxhdpi
  const ANDROID_LAYER_SIZE = 432; // 108dp × 4
  const ANDROID_SAFE_AREA = 264; // 66dp × 4
  const ANDROID_PADDING = 72; // 18dp × 4 (on each side)

  const image = sharp(inputPath);
  const metadata = await image.metadata();

  // Calculate scale to fit within safe area (264x264)
  const scale = Math.min(ANDROID_SAFE_AREA / metadata.width, ANDROID_SAFE_AREA / metadata.height);
  const scaledWidth = Math.round(metadata.width * scale);
  const scaledHeight = Math.round(metadata.height * scale);

  // Calculate position to center the scaled image
  const left = Math.round((ANDROID_LAYER_SIZE - scaledWidth) / 2);
  const top = Math.round((ANDROID_LAYER_SIZE - scaledHeight) / 2);

  // Create a transparent 432x432 canvas and composite the scaled image centered
  await sharp({
    create: {
      width: ANDROID_LAYER_SIZE,
      height: ANDROID_LAYER_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
    }
  })
    .composite([{
      input: await image.resize(scaledWidth, scaledHeight, { fit: 'inside' }).ensureAlpha().toBuffer(),
      left,
      top
    }])
    .png()
    .toFile(outputPath);
}
