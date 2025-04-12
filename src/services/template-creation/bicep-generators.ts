/**
 * Bicep template generators for AZD templates
 */

/**
 * Creates main.bicep file content
 */
export function createBicepTemplate(name: string, architecture: string): string {
    // Get the service name based on architecture
    let serviceName: string;
    switch (architecture) {
        case 'web':
            serviceName = 'web';
            break;
        case 'api':
            serviceName = 'api';
            break;
        case 'function':
            serviceName = 'function';
            break;
        case 'container':
            serviceName = 'app';
            break;
        default:
            serviceName = 'app';
    }

    // Create a bicep template with proper AZD tags
    return `param location string = resourceGroup().location
param environmentName string
param resourceToken string = uniqueString(subscription().subscriptionId, resourceGroup().id)
param tags object = {}

// Merge supplied tags with required AZD tags
var defaultTags = {
  'azd-env-name': environmentName
}
var allTags = union(defaultTags, tags)

// Add your Bicep template here based on the ${architecture} architecture
resource appServicePlan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: 'plan-\${environmentName}-\${resourceToken}'
  location: location
  tags: allTags
  sku: {
    name: 'B1'
  }
}

${architecture === 'function' ? 
`// Function App with proper azd-service-name tag
resource functionApp 'Microsoft.Web/sites@2022-03-01' = {
  name: 'func-\${environmentName}-\${resourceToken}'
  location: location
  tags: union(allTags, { 'azd-service-name': '${serviceName}' })
  kind: 'functionapp'
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      alwaysOn: true
      ftpsState: 'Disabled'
    }
  }
}

output SERVICE_${serviceName.toUpperCase()}_NAME string = functionApp.name
output SERVICE_${serviceName.toUpperCase()}_URI string = 'https://\${functionApp.properties.defaultHostName}'` 
: architecture === 'container' ? 
`// Container App with proper azd-service-name tag
resource containerApp 'Microsoft.App/containerApps@2022-03-01' = {
  name: 'ca-\${environmentName}-\${resourceToken}'
  location: location
  tags: union(allTags, { 'azd-service-name': '${serviceName}' })
  properties: {
    configuration: {
      ingress: {
        external: true
        targetPort: 80
      }
    }
    template: {
      containers: [
        {
          name: '${serviceName}'
          image: '$\{DOCKER_REGISTRY_SERVER_URL}/$\{DOCKER_REGISTRY_SERVER_USERNAME}/${serviceName}:latest'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 10
      }
    }
  }
}

output SERVICE_${serviceName.toUpperCase()}_NAME string = containerApp.name
output SERVICE_${serviceName.toUpperCase()}_URI string = containerApp.properties.configuration.ingress.fqdn` 
: 
`// App Service with proper azd-service-name tag
resource webApp 'Microsoft.Web/sites@2022-03-01' = {
  name: 'app-\${environmentName}-\${resourceToken}'
  location: location
  tags: union(allTags, { 'azd-service-name': '${serviceName}' })
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      alwaysOn: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
    }
  }
}

output SERVICE_${serviceName.toUpperCase()}_NAME string = webApp.name
output SERVICE_${serviceName.toUpperCase()}_URI string = 'https://\${webApp.properties.defaultHostName}'`}

// Key Vault with tags but not azd-service-name since it's not a deployable service target
resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' = {
  name: 'kv-\${environmentName}-\${resourceToken}'
  location: location
  tags: allTags
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
  }
}

// Application Insights
resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-\${environmentName}-\${resourceToken}'
  location: location
  tags: allTags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    Request_Source: 'rest'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}`;
}

/**
 * Creates main.parameters.json file content
 */
export function createBicepParams(name: string): string {
    return JSON.stringify({
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#',
        contentVersion: '1.0.0.0',
        parameters: {
            environmentName: {
                value: '${name}-dev'
            }
        }
    }, null, 2);
}
