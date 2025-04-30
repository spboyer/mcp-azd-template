#!/usr/bin/env node

/**
 * Script to clean up temporary files created by the mermaid diagram generation process
 * and other test artifacts to avoid cluttering the workspace
 * This script should be run periodically to maintain a clean workspace
 */

const fs = require('fs');
const path = require('path');
const { rm } = require('fs/promises');

async function cleanupTempFiles() {
  const rootDir = path.resolve(__dirname, '..');
  
  try {
    // Find all .temp directories that contain mermaid temporary files
    const dirsToCheck = [
      path.join(rootDir, 'test-diagram', '.temp'),
      path.join(rootDir, 'test-output'),
      // Add other potential locations where temp files might be created
    ];
    
    // Add any potential other temp directories
    const possibleTemplateDir = path.join(rootDir, 'templates');
    if (fs.existsSync(possibleTemplateDir)) {
      const templateDirs = fs.readdirSync(possibleTemplateDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => path.join(possibleTemplateDir, dirent.name));
      
      templateDirs.forEach(templateDir => {
        dirsToCheck.push(path.join(templateDir, '.temp'));
      });
    }
      let cleanedDirs = 0;
    let cleanedFiles = 0;
    
    // Clean up test output text files in the root directory
    const testOutputTextFiles = [
      path.join(rootDir, 'test-output.txt'),
      path.join(rootDir, 'function-test-output.txt'),
      path.join(rootDir, 'diagram-coverage.txt')
    ];
    
    for (const filePath of testOutputTextFiles) {
      if (fs.existsSync(filePath)) {
        try {
          await fs.promises.unlink(filePath);
          console.log(`Removed test output file: ${filePath}`);
          cleanedFiles++;
        } catch (error) {
          console.error(`Error removing file ${filePath}: ${error}`);
        }
      }
    }
    
    // Clean coverage reports
    const coverageDir = path.join(rootDir, 'coverage');
    if (fs.existsSync(coverageDir)) {
      try {
        // Remove contents but keep the directory itself
        const coverageContents = fs.readdirSync(coverageDir, { withFileTypes: true });
        for (const item of coverageContents) {
          const itemPath = path.join(coverageDir, item.name);
          if (item.isDirectory()) {
            await rm(itemPath, { recursive: true, force: true });
            cleanedDirs++;
          } else {
            await fs.promises.unlink(itemPath);
            cleanedFiles++;
          }
        }
        console.log(`Cleaned coverage reports in ${coverageDir}`);
      } catch (error) {
        console.error(`Error cleaning coverage directory: ${error}`);
      }
    }
    
    // Process each directory
    for (const dir of dirsToCheck) {
      if (fs.existsSync(dir)) {
        // Find all mermaid temp directories
        const tempDirs = fs.readdirSync(dir, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('mermaid-'))
          .map(dirent => path.join(dir, dirent.name));
        
        // Remove each temp directory
        for (const tempDir of tempDirs) {
          try {
            await rm(tempDir, { recursive: true, force: true });
            console.log(`Removed temp directory: ${tempDir}`);
            cleanedDirs++;
          } catch (error) {
            console.error(`Error removing temp directory ${tempDir}: ${error}`);
          }
        }
        
        // Also clean up any temp .mmd files directly in the .temp directory
        const tempFiles = fs.readdirSync(dir, { withFileTypes: true })
          .filter(dirent => dirent.isFile() && (dirent.name.endsWith('.mmd') || dirent.name.includes('temp')))
          .map(dirent => path.join(dir, dirent.name));
          
        for (const tempFile of tempFiles) {
          try {
            await fs.promises.unlink(tempFile);
            console.log(`Removed temp file: ${tempFile}`);
            cleanedFiles++;
          } catch (error) {
            console.error(`Error removing temp file ${tempFile}: ${error}`);
          }
        }
        
        // Try to remove the .temp directory if it's empty
        try {
          if (fs.readdirSync(dir).length === 0) {
            await fs.promises.rmdir(dir);
            console.log(`Removed empty directory: ${dir}`);
          }
        } catch (error) {
          // Ignore errors when trying to remove the directory
        }
      }
    }
      // Clean timestamp-based diagram files, keeping only the base diagram
    const imagesDir = path.join(rootDir, 'test-diagram', 'images');
    if (fs.existsSync(imagesDir)) {
      try {
        const diagrams = fs.readdirSync(imagesDir, { withFileTypes: true })
          .filter(dirent => dirent.isFile() && 
                         dirent.name.startsWith('architecture-diagram-') && 
                         (dirent.name.endsWith('.png') || dirent.name.endsWith('.mmd')))
          .map(dirent => path.join(imagesDir, dirent.name));
        
        for (const diagram of diagrams) {
          try {
            await fs.promises.unlink(diagram);
            console.log(`Removed generated diagram: ${diagram}`);
            cleanedFiles++;
          } catch (error) {
            console.error(`Error removing diagram ${diagram}: ${error}`);
          }
        }
      } catch (error) {
        console.error(`Error cleaning images directory: ${error}`);
      }
    }
    
    console.log(`Cleanup complete. Removed ${cleanedDirs} directories and ${cleanedFiles} files.`);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

// Allow this to be imported without running immediately in case we want to use it in other scripts
if (require.main === module) {
  // Run the cleanup when the script is executed directly
  cleanupTempFiles();
}

module.exports = { cleanupTempFiles };
