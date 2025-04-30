#!/usr/bin/env node

/**
 * Test script for diagram generation functionality
 */

const { 
    generateMermaidFromBicep, 
    generatePngFromMermaid, 
    insertMermaidDiagram 
} = require('./dist/services/diagram-generation');

// Sample Bicep template for testing
const bicepTemplate = `
param location string = resourceGroup().location
param resourceToken string = uniqueString(resourceGroup().id, subscription().id)

resource storage 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: 'storage\${resourceToken}'
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
}

resource appServicePlan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: 'plan-\${resourceToken}'
  location: location
  sku: {
    name: 'S1'
  }
}

resource webApp 'Microsoft.Web/sites@2022-03-01' = {
  name: 'app-\${resourceToken}'
  location: location
  properties: {
    serverFarmId: appServicePlan.id
  }
}
`;

// Generate mermaid diagram from the Bicep template
const mermaid = generateMermaidFromBicep(bicepTemplate);
console.log('Generated Mermaid diagram:');
console.log(mermaid);

// Path for test README file
const path = require('path');
const fs = require('fs');
const testDir = path.join(__dirname, 'test-diagram');
if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
}

const readmePath = path.join(testDir, 'README.md');
fs.writeFileSync(readmePath, '# Test\n\n## Architecture\n\nThis is the architecture section\n\n', 'utf8');

// Insert the mermaid diagram into the README file
console.log('\nInserting diagram into README file...');
insertMermaidDiagram(readmePath, mermaid)
    .then(result => {
        console.log('Diagram inserted with result:', result);
        console.log('\nUpdated README content:');
        console.log(fs.readFileSync(readmePath, 'utf8'));
        
        // Check for generated PNG
        const imagesDir = path.join(testDir, 'images');
        console.log('\nGenerated files in images directory:');
        if (fs.existsSync(imagesDir)) {
            const files = fs.readdirSync(imagesDir);
            files.forEach(file => {
                console.log(`- ${file} (${fs.statSync(path.join(imagesDir, file)).size} bytes)`);
            });
        } else {
            console.log('Images directory not found');
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
