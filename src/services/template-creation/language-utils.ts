/**
 * Language-specific utilities for template creation
 */
import * as fs from 'fs';
import * as path from 'path';

/**
 * Creates language-specific files for a template
 */
export async function createLanguageSpecificFiles(outputPath: string, language: string, architecture: string): Promise<void> {
    const srcPath = path.join(outputPath, 'src');
    
    switch (language) {
        case 'typescript':
            await fs.promises.writeFile(
                path.join(srcPath, 'package.json'),
                JSON.stringify({
                    name: path.basename(outputPath),
                    version: '0.0.1',
                    private: true,
                    scripts: {
                        start: 'node dist/index.js',
                        build: 'tsc',
                        dev: 'ts-node src/index.ts'
                    }
                }, null, 2)
            );
            await fs.promises.writeFile(
                path.join(srcPath, 'tsconfig.json'),
                JSON.stringify({
                    compilerOptions: {
                        target: 'es2020',
                        module: 'commonjs',
                        outDir: './dist',
                        rootDir: './src',
                        strict: true,
                        esModuleInterop: true,
                        skipLibCheck: true,
                        forceConsistentCasingInFileNames: true
                    }
                }, null, 2)
            );
            break;
        case 'python':
            await fs.promises.writeFile(
                path.join(srcPath, 'requirements.txt'),
                'fastapi\nuvicorn\npython-dotenv\n'
            );
            break;
        case 'java':
            // Add Java-specific files
            break;
        case 'dotnet':
            // Add .NET-specific files
            break;
    }
}

/**
 * Gets prerequisites text for the specified language
 */
export function getLanguagePrereqs(language: string): string {
    switch (language) {
        case 'typescript':
            return '- Node.js 16 or later\n- npm or yarn';
        case 'python':
            return '- Python 3.8 or later\n- pip';
        case 'java':
            return '- Java 17 or later\n- Maven or Gradle';
        case 'dotnet':
            return '- .NET 6.0 or later';
        default:
            return '';
    }
}

/**
 * Gets VS Code extensions for the specified language
 */
export function getLanguageExtensions(language: string): string[] {
    switch (language) {
        case 'typescript':
            return [
                'dbaeumer.vscode-eslint',
                'esbenp.prettier-vscode'
            ];
        case 'python':
            return [
                'ms-python.python',
                'ms-python.vscode-pylance'
            ];
        case 'java':
            return [
                'vscjava.vscode-java-pack',
                'redhat.vscode-xml'
            ];
        case 'dotnet':
            return [
                'ms-dotnettools.csharp',
                'ms-dotnettools.vscode-dotnet-runtime'
            ];
        default:
            return [];
    }
}
