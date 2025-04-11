import * as fs from 'fs';
import * as path from 'path';
import { 
    getCurrentWorkspace, 
    pathExists, 
    validateReadmeContent,
    validateDevContainer,
    validateGitHubWorkflows
} from '../../utils/validation';

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    existsSync: jest.fn(),
    promises: {
        access: jest.fn(),
        readFile: jest.fn(),
        readdir: jest.fn()
    }
}));

describe('Validation Utils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getCurrentWorkspace', () => {
        const originalCwd = process.cwd;

        beforeEach(() => {
            process.cwd = jest.fn().mockReturnValue('/test/workspace');
        });

        afterEach(() => {
            process.cwd = originalCwd;
        });

        test('should return current working directory', () => {
            expect(getCurrentWorkspace()).toBe('/test/workspace');
        });
    });

    describe('pathExists', () => {
        test('should handle single path component', async () => {
            (fs.promises.access as jest.Mock).mockResolvedValueOnce(undefined);
            const result = await pathExists('/base', 'file.txt');
            expect(result).toBe(true);
        });

        test('should handle array path components', async () => {
            (fs.promises.access as jest.Mock).mockResolvedValueOnce(undefined);
            const result = await pathExists('/base', ['dir', 'file.txt']);
            expect(result).toBe(true);
        });

        test('should handle forward slash paths', async () => {
            (fs.promises.access as jest.Mock).mockResolvedValueOnce(undefined);
            const result = await pathExists('/base', 'dir/file.txt');
            expect(result).toBe(true);
        });

        test('should return false when file does not exist', async () => {
            (fs.promises.access as jest.Mock).mockRejectedValueOnce(new Error('ENOENT'));
            const result = await pathExists('/base', 'nonexistent.txt');
            expect(result).toBe(false);
        });
    });

    describe('validateReadmeContent', () => {
        test('should detect missing required sections', async () => {
            const content = '# Test Template\n## Some Section\n## Another Section';
            const issues = await validateReadmeContent(content);
            expect(issues.length).toBeGreaterThan(0);
            expect(issues).toContain('Missing required section: Features');
        });

        test('should pass when all required sections present', async () => {
            const content = `
                # Test Template
                ## Features
                ## Getting Started
                ## Prerequisites
                ## Architecture
                ## Security
            `;
            const issues = await validateReadmeContent(content);
            expect(issues.length).toBe(0);
        });

        test('should be case insensitive', async () => {
            const content = `
                # Test Template
                ## FEATURES
                ## Getting Started
                ## prerequisites
                ## Architecture
                ## security
            `;
            const issues = await validateReadmeContent(content);
            expect(issues.length).toBe(0);
        });
    });

    describe('validateDevContainer', () => {
        test('should check for devcontainer directory', async () => {
            (fs.promises.access as jest.Mock).mockRejectedValueOnce(new Error('ENOENT'));
            const warnings = await validateDevContainer('/test/path');
            expect(warnings).toContain('Missing .devcontainer directory');
        });

        test('should check for devcontainer.json', async () => {
            (fs.promises.access as jest.Mock).mockResolvedValueOnce(undefined);
            (fs.promises.access as jest.Mock).mockRejectedValueOnce(new Error('ENOENT'));
            const warnings = await validateDevContainer('/test/path');
            expect(warnings).toContain('Missing devcontainer.json in .devcontainer directory');
        });

        test('should validate devcontainer.json content', async () => {
            (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
            (fs.promises.readFile as jest.Mock).mockResolvedValue('{}');
            const warnings = await validateDevContainer('/test/path');
            expect(warnings).toContain('Dev container should include Azure CLI feature');
        });

        test('should handle invalid json', async () => {
            (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
            (fs.promises.readFile as jest.Mock).mockResolvedValue('invalid json');
            const warnings = await validateDevContainer('/test/path');
            expect(warnings).toContain('Invalid devcontainer.json file');
        });
    });

    describe('validateGitHubWorkflows', () => {
        test('should check for workflows directory', async () => {
            (fs.promises.access as jest.Mock).mockRejectedValueOnce(new Error('ENOENT'));
            const warnings = await validateGitHubWorkflows('/test/path');
            expect(warnings).toContain('Missing .github/workflows directory');
        });

        test('should check for validation workflow', async () => {
            (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
            (fs.promises.readdir as jest.Mock).mockResolvedValue(['other.yml']);
            const warnings = await validateGitHubWorkflows('/test/path');
            expect(warnings).toContain('Add GitHub workflow for template validation and testing');
        });

        test('should check for security scanning workflow', async () => {
            (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
            (fs.promises.readdir as jest.Mock).mockResolvedValue(['validate.yml']);
            const warnings = await validateGitHubWorkflows('/test/path');
            expect(warnings).toContain('Add security scanning workflow using microsoft/security-devops-action');
        });

        test('should handle read directory errors', async () => {
            (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
            (fs.promises.readdir as jest.Mock).mockRejectedValue(new Error('Failed to read'));
            const warnings = await validateGitHubWorkflows('/test/path');
            expect(warnings).toContain('Error reading workflow files');
        });
    });
});