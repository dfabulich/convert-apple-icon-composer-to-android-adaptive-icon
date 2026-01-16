#!/usr/bin/env node

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, rmSync, mkdirSync, cpSync } from 'fs';
import { parseArgs } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse GitHub URL to extract repository info and path
function parseGitHubUrl(url) {
  // Example: https://github.com/spacedriveapp/spacedrive/blob/928b9f5a549066650af6b20cd17a02862c2bc99e/apps/tauri/Spacedrive.icon/icon.json
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)/);
  if (!match) {
    throw new Error(`Invalid GitHub URL format: ${url}`);
  }
  
  const [, owner, repo, commit, filePath] = match;
  const pathParts = filePath.split('/');
  const parentDir = pathParts.slice(0, -1).join('/'); // Everything except the last part (icon.json)
  const folderName = pathParts[pathParts.length - 2]; // The .icon folder name
  
  return {
    owner,
    repo,
    commit,
    filePath,
    parentDir,
    folderName,
    repoUrl: `https://github.com/${owner}/${repo}.git`
  };
}

function downloadIconFolder(url, outputDir, useRepoName = false) {
  const info = parseGitHubUrl(url);
  const destFolderName = useRepoName ? `${info.repo}.icon` : info.folderName;
  console.log(`Downloading ${destFolderName} from ${info.owner}/${info.repo}...`);
  
  const tempDir = join(__dirname, '.temp-download');
  const tempRepoDir = join(tempDir, info.repo);
  
  try {
    // Clean up temp directory if it exists
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
    mkdirSync(tempDir, { recursive: true });
    
    // Clone with filter (doesn't download blobs until checkout)
    console.log(`  Cloning repository...`);
    execSync(
      `git clone --filter=blob:none --no-checkout ${info.repoUrl} "${tempRepoDir}"`,
      { cwd: tempDir, stdio: 'pipe' }
    );
    
    // Fetch the specific commit (if not available in shallow clone)
    console.log(`  Fetching commit ${info.commit}...`);
    try {
      execSync(`git fetch --depth 1 origin ${info.commit}`, {
        cwd: tempRepoDir,
        stdio: 'pipe'
      });
    } catch (error) {
      // If fetch fails, try unshallow and fetch again
      console.log(`  Unshallowing repository to fetch commit...`);
      execSync(`git fetch --unshallow`, {
        cwd: tempRepoDir,
        stdio: 'pipe'
      });
    }
    
    // Enable sparse-checkout
    execSync(`git sparse-checkout init --cone`, {
      cwd: tempRepoDir,
      stdio: 'pipe'
    });
    
    // Set sparse-checkout to only the parent directory of icon.json
    console.log(`  Setting sparse-checkout to ${info.parentDir}...`);
    execSync(`git sparse-checkout set "${info.parentDir}"`, {
      cwd: tempRepoDir,
      stdio: 'pipe'
    });
    
    // Checkout the specific commit (this will download only the files we need)
    console.log(`  Checking out commit ${info.commit}...`);
    execSync(`git checkout ${info.commit}`, {
      cwd: tempRepoDir,
      stdio: 'pipe'
    });
    
    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    // Copy the icon folder to output directory
    const sourceDir = join(tempRepoDir, info.parentDir);
    const destDir = join(outputDir, destFolderName);
    
    if (!existsSync(sourceDir)) {
      throw new Error(`Source directory not found: ${sourceDir}`);
    }
    
    // Remove destination if it exists
    if (existsSync(destDir)) {
      rmSync(destDir, { recursive: true, force: true });
    }
    
    console.log(`  Copying to ${destDir}...`);
    cpSync(sourceDir, destDir, { recursive: true });
    
    console.log(`  ✓ Successfully downloaded ${destFolderName}\n`);
  } catch (error) {
    console.error(`  ✗ Error downloading ${destFolderName}:`, error.message);
    if (error.stdout) console.error('  stdout:', error.stdout.toString());
    if (error.stderr) console.error('  stderr:', error.stderr.toString());
    throw error;
  } finally {
    // Clean up temp directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

// Main execution
const { values, positionals } = parseArgs({
  options: {
    'use-repo-name': {
      type: 'boolean',
      short: 'r',
    },
  },
  allowPositionals: true,
});

const urls = positionals;
const useRepoName = values['use-repo-name'] || false;

if (urls.length === 0) {
  console.error('Usage: node download-example-app-icon.mjs [--use-repo-name] <github-url-1> [github-url-2] ...');
  console.error('\nOptions:');
  console.error('  --use-repo-name, -r    Use repository name instead of folder name for destination');
  console.error('\nExample:');
  console.error('  node download-example-app-icon.mjs https://github.com/spacedriveapp/spacedrive/blob/928b9f5a549066650af6b20cd17a02862c2bc99e/apps/tauri/Spacedrive.icon/icon.json');
  console.error('  node download-example-app-icon.mjs --use-repo-name https://github.com/chrismaltby/gb-studio/blob/a7865a0cf07053a8c875f10eabf7829710a86560/src/assets/app/icon/app_icon.icon/icon.json');
  process.exit(1);
}

const outputDir = join(__dirname, 'example-icon-composer-icons');

for (const url of urls) {
  try {
    downloadIconFolder(url, outputDir, useRepoName);
  } catch (error) {
    console.error(`Failed to download from ${url}`);
    process.exit(1);
  }
}

console.log('All downloads completed!');
