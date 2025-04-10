import * as fs from 'fs';
import * as path from 'path';
import { TemplateAnalysisResult } from '../types';
import { pathExists } from '../utils/validation';

// Add helper function to get current workspace
function getCurrentWorkspace(): string {
    return process.cwd();
}

// Function to get template info from azure.yaml
export async function getTemplateInfo(templatePath: string): Promise<string | null> {
    try {
        const azdYamlPath = path.join(templatePath, 'azure.yaml');
        if (!fs.existsSync(azdYamlPath)) {
            return null;
        }
        const content = fs.readFileSync(azdYamlPath, 'utf8');
        return content;
    } catch {
        return null;
    }
}

// Main template analysis function
export async function analyzeTemplate(templatePath?: string): Promise<TemplateAnalysisResult | { error: string }> {
    const actualPath = templatePath || getCurrentWorkspace();
    const templateInfo = await getTemplateInfo(actualPath);
    if (!templateInfo) {
        return { error: 'Invalid template directory or missing azure.yaml file' };
    }

    try {
        // Read key files and analyze template structure
        const files = fs.readdirSync(actualPath, { recursive: true }) as string[];
        const analysis: TemplateAnalysisResult = {
            hasInfra: files.some(f => typeof f === 'string' && f.includes('infra/')),
            hasApp: files.some(f => typeof f === 'string' && (f.includes('src/') || f.includes('app/'))),
            configFile: templateInfo,
            recommendations: []
        };

        // Generate recommendations
        if (!analysis.hasInfra) {
            analysis.recommendations.push('Consider adding infrastructure as code in an "infra/" directory');
        }
        if (!analysis.hasApp) {
            analysis.recommendations.push('Consider adding application code in a "src/" or "app/" directory');
        }

        return analysis;
    } catch (error) {
        return { error: `Failed to analyze template: ${error}` };
    }
}
