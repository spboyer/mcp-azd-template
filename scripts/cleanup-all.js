#!/usr/bin/env node

/**
 * Comprehensive cleanup script that handles all temporary files, test artifacts,
 * and other generated content in the workspace.
 */

const fs = require('fs');
const path = require('path');
const { rm } = require('fs/promises');
const { cleanupTempFiles } = require('./cleanup-temp-files');

async function cleanupAll() {
  console.log('Starting comprehensive workspace cleanup...');
  
  try {
    // Run the standard temp file cleanup first
    await cleanupTempFiles();
    
    const rootDir = path.resolve(__dirname, '..');
    
    // Clean node_modules/.cache if it exists (can get quite large over time)
    const nodeModulesCacheDir = path.join(rootDir, 'node_modules', '.cache');
    if (fs.existsSync(nodeModulesCacheDir)) {
      try {
        await rm(nodeModulesCacheDir, { recursive: true, force: true });
        console.log('Removed node_modules/.cache directory');
      } catch (error) {
        console.error(`Failed to remove node_modules/.cache: ${error.message}`);
      }
    }
    
    // Clean any .DS_Store files (Mac) or Thumbs.db files (Windows)
    const filesToRemove = [];
    function findMetaFiles(directory) {
      if (!fs.existsSync(directory)) return;
      
      const items = fs.readdirSync(directory, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(directory, item.name);
        
        if (item.isDirectory()) {
          findMetaFiles(fullPath);
        } else if (item.name === '.DS_Store' || item.name === 'Thumbs.db') {
          filesToRemove.push(fullPath);
        }
      }
    }
    
    findMetaFiles(rootDir);
    
    for (const file of filesToRemove) {
      try {
        await fs.promises.unlink(file);
        console.log(`Removed file: ${file}`);
      } catch (error) {
        console.error(`Error removing file ${file}: ${error.message}`);
      }
    }
    
    // Make sure test directories are clean but not removed
    const testDirs = [
      path.join(rootDir, 'test-output'),
      path.join(rootDir, 'test-diagram')
    ];
    
    for (const dir of testDirs) {
      if (fs.existsSync(dir)) {
        try {
          // Ensure directory is clean but exists (keep basic structure)
          if (dir.endsWith('test-output')) {
            // For test-output, remove all contents
            const contents = fs.readdirSync(dir, { withFileTypes: true });
            for (const item of contents) {
              const itemPath = path.join(dir, item.name);
              if (item.isDirectory()) {
                await rm(itemPath, { recursive: true, force: true });
              } else {
                await fs.promises.unlink(itemPath);
              }
            }
            console.log(`Cleaned directory: ${dir}`);
          }
        } catch (error) {
          console.error(`Error cleaning directory ${dir}: ${error.message}`);
        }
      }
    }
    
    console.log('Comprehensive cleanup complete!');
  } catch (error) {
    console.error('Error during comprehensive cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupAll();
