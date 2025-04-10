import { execSync } from 'child_process';
import { TemplateSearchResult } from '../types';
import { AI_GALLERY_API_URL, AI_GALLERY_SEARCH_ENDPOINT } from '../constants/config';

// Utility function to check if azd CLI is installed
function checkAzdInstalled(): boolean {
    try {
        execSync('azd version', { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

interface TemplateListResult {
    templates: string;
    error?: string;
}

export async function listTemplates(): Promise<TemplateListResult> {
    if (!checkAzdInstalled()) {
        return { 
            templates: '',
            error: 'Azure Developer CLI (azd) is not installed. Please install it first.' 
        };
    }

    try {
        const result = execSync('azd template list', { encoding: 'utf8' });
        return { templates: result };
    } catch (error) {
        if (error instanceof Error) {
            // Convert any command not found error to the installation message
            if (error.message.includes('command not found') || error.message.includes('not recognized')) {
                return {
                    templates: '',
                    error: 'Azure Developer CLI (azd) is not installed. Please install it first.'
                };
            }
        }
        return { 
            templates: '',
            error: `Failed to list templates: ${error}` 
        };
    }
}

export async function searchTemplates(query: string): Promise<TemplateSearchResult> {
    if (!checkAzdInstalled()) {
        return { templates: '', count: 0, error: 'Failed to search templates: Azure Developer CLI (azd) is not installed.' };
    }

    try {
        const result = execSync('azd template list', { encoding: 'utf8' });
        
        const templates = result
            .split('\n')
            .filter(line => line.toLowerCase().includes(query.toLowerCase()))
            .join('\n');
        
        if (!templates.trim()) {
            return { 
                templates: `No templates found matching: '${query}'`,
                count: 0
            };
        }
        
        return { 
            templates,
            count: templates.split('\n').filter(line => line.trim()).length
        };
    } catch (error) {
        return { templates: '', count: 0, error: `Failed to search templates: ${error}` };
    }
}

export async function searchAiGallery(query: string): Promise<TemplateSearchResult> {
    try {
        const searchUrl = new URL(AI_GALLERY_SEARCH_ENDPOINT, AI_GALLERY_API_URL);
        searchUrl.searchParams.append('q', query);
        
        const response = await fetch(searchUrl.toString(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            return { 
                templates: '', 
                count: 0,
                error: `Failed to search AI gallery: ${response.status} ${response.statusText}` 
            };
        }
        
        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
            return { 
                templates: `No templates found in AI gallery matching: '${query}'`,
                count: 0,
                source: 'ai-gallery'
            };
        }
        
        const formattedTemplates = data.items.map((item: any) => 
            `${item.name} (${item.version || 'latest'}) - ${item.description || 'No description'}`
        ).join('\n');
        
        return { 
            templates: formattedTemplates,
            count: data.items.length,
            source: 'ai-gallery'
        };
    } catch (error) {
        return { 
            templates: '', 
            count: 0,
            error: `Failed to search AI gallery: ${error}` 
        };
    }
}
