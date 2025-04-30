#!/usr/bin/env node

/**
 * Test script to generate a sample mermaid diagram PNG
 * This script creates a simple mermaid diagram file and then 
 * uses the generate-mermaid-png.js script to convert it to PNG
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create test directory
const testDir = path.join(__dirname, '..', 'test-diagram');
if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
}

// Create a simple mermaid diagram file
const mermaidFilePath = path.join(testDir, 'test-diagram.mmd');
const mermaidContent = `graph TD
    A[Client] --> B[API Gateway]
    B --> C[Service 1]
    B --> D[Service 2]
    C --> E[(Database)]
    D --> E
    style A fill:#f9d,stroke:#333,stroke-width:2px
    style B fill:#adf,stroke:#333,stroke-width:2px
    style C fill:#bfc,stroke:#333,stroke-width:2px
    style D fill:#bfc,stroke:#333,stroke-width:2px
    style E fill:#ffd,stroke:#333,stroke-width:2px
`;

console.log('Creating test mermaid diagram file...');
fs.writeFileSync(mermaidFilePath, mermaidContent, 'utf8');

// Determine PNG output path
const pngOutputPath = path.join(testDir, 'images', 'test-diagram.png');

// Create the images directory if it doesn't exist
const imagesDir = path.join(testDir, 'images');
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
}

console.log('Generating PNG from the test diagram...');
try {
    // Call our generate-mermaid-png.js script
    execSync(`node "${path.join(__dirname, 'generate-mermaid-png.js')}" "${mermaidFilePath}" "${pngOutputPath}"`, { 
        stdio: 'inherit' 
    });
    
    console.log('Test successful!');
    console.log(`PNG file created at: ${pngOutputPath}`);
    
    // Create a sample README with the image
    const readmePath = path.join(testDir, 'README.md');
    const readmeContent = `# Test Diagram
    
## Architecture

Below is a test diagram generated from mermaid:

![Test Diagram](images/test-diagram.png)

<details>
<summary>Mermaid diagram source (click to expand)</summary>

\`\`\`mermaid
${mermaidContent}
\`\`\`
</details>
`;

    fs.writeFileSync(readmePath, readmeContent, 'utf8');
    console.log(`Sample README created at: ${readmePath}`);
} catch (error) {
    console.error('Test failed.');
    process.exit(1);
}
