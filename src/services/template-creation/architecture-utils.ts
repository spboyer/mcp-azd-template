/**
 * Architecture-specific utilities for template creation
 */

/**
 * Gets architecture-specific component descriptions for README generation
 */
export function getArchitectureComponents(architecture: string): string {
    switch (architecture) {
        case 'web':
            return '- Azure App Service for web hosting\n- Azure Key Vault for secrets\n- Application Insights for monitoring';
        case 'api':
            return '- Azure App Service for API hosting\n- Azure Key Vault for secrets\n- Application Insights for monitoring';
        case 'function':
            return '- Azure Functions for serverless compute\n- Azure Key Vault for secrets\n- Application Insights for monitoring';
        case 'container':
            return '- Azure Container Apps for container hosting\n- Azure Container Registry\n- Azure Key Vault for secrets\n- Application Insights for monitoring';
        default:
            return '- Azure Key Vault for secrets\n- Application Insights for monitoring';
    }
}

/**
 * Gets required services for the specified architecture
 */
export function getRequiredServices(architecture: string): string {
    const services = ['Key Vault', 'Application Insights'];
    switch (architecture) {
        case 'web':
        case 'api':
            services.unshift('App Service');
            break;
        case 'function':
            services.unshift('Functions');
            break;
        case 'container':
            services.unshift('Container Apps', 'Container Registry');
            break;
    }
    return services.map(s => `- ${s}`).join('\n');
}

/**
 * Gets cost estimates for the specified architecture
 */
export function getCostEstimate(architecture: string): string {
    switch (architecture) {
        case 'web':
        case 'api':
            return '- App Service: Basic tier (~$13/month)\n- Key Vault: Standard tier (~$0.03/10K operations)\n- Application Insights: Pay as you go';
        case 'function':
            return '- Functions: Consumption plan (pay per execution)\n- Key Vault: Standard tier (~$0.03/10K operations)\n- Application Insights: Pay as you go';
        case 'container':
            return '- Container Apps: Consumption plan (pay per use)\n- Container Registry: Basic tier (~$5/month)\n- Key Vault: Standard tier (~$0.03/10K operations)\n- Application Insights: Pay as you go';
        default:
            return '- Key Vault: Standard tier (~$0.03/10K operations)\n- Application Insights: Pay as you go';
    }
}
