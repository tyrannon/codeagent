/**
 * File System Operations for Codebase Awareness
 */

import * as fs from 'fs';
import * as path from 'path';

export interface CodebaseStructure {
  files: string[];
  directories: string[];
  languages: string[];
  packageManager?: string;
  framework?: string;
}

export function getFileStructure(directory: string = '.'): string[] {
  try {
    const files: string[] = [];
    
    function scanDirectory(dir: string, relativePath: string = ''): void {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativeItemPath = path.join(relativePath, item);
        
        // Skip common ignore patterns
        if (shouldIgnoreItem(item)) {
          continue;
        }
        
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDirectory(fullPath, relativeItemPath);
        } else {
          files.push(relativeItemPath);
        }
      }
    }
    
    scanDirectory(path.resolve(directory));
    return files;
  } catch (error) {
    console.error('Error scanning directory:', error);
    return [];
  }
}

export function shouldIgnoreItem(item: string): boolean {
  const ignorePatterns = [
    'node_modules',
    '.git',
    '.DS_Store',
    'dist',
    'build',
    '.next',
    '.vscode',
    '.idea',
    '*.log',
    '.env*',
    'coverage',
    '.nyc_output',
    '*.tmp',
    '*.temp'
  ];
  
  return ignorePatterns.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(item);
    }
    return item === pattern || item.startsWith(pattern);
  });
}

export function readFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error}`);
  }
}

export function writeFile(filePath: string, content: string): void {
  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error}`);
  }
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

export function analyzeCodebase(directory: string = '.'): CodebaseStructure {
  const files = getFileStructure(directory);
  const directories: string[] = [];
  const languageSet = new Set<string>();
  
  // Analyze files
  for (const file of files) {
    const dir = path.dirname(file);
    if (!directories.includes(dir) && dir !== '.') {
      directories.push(dir);
    }
    
    const ext = path.extname(file);
    const language = getLanguageFromExtension(ext);
    if (language) {
      languageSet.add(language);
    }
  }
  
  // Detect package manager and framework
  const packageManager = detectPackageManager(files);
  const framework = detectFramework(files);
  
  return {
    files,
    directories,
    languages: Array.from(languageSet),
    packageManager,
    framework
  };
}

function getLanguageFromExtension(ext: string): string | null {
  const extensionMap: Record<string, string> = {
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript React',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript React', 
    '.py': 'Python',
    '.java': 'Java',
    '.cpp': 'C++',
    '.c': 'C',
    '.h': 'C/C++ Header',
    '.go': 'Go',
    '.rs': 'Rust',
    '.php': 'PHP',
    '.rb': 'Ruby',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.cs': 'C#',
    '.scala': 'Scala',
    '.md': 'Markdown',
    '.json': 'JSON',
    '.yml': 'YAML',
    '.yaml': 'YAML',
    '.toml': 'TOML',
    '.xml': 'XML',
    '.html': 'HTML',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.sass': 'Sass',
    '.less': 'Less'
  };
  
  return extensionMap[ext] || null;
}

function detectPackageManager(files: string[]): string | undefined {
  if (files.includes('package-lock.json')) return 'npm';
  if (files.includes('yarn.lock')) return 'yarn';
  if (files.includes('pnpm-lock.yaml')) return 'pnpm';
  if (files.includes('bun.lockb')) return 'bun';
  if (files.includes('Cargo.toml')) return 'cargo';
  if (files.includes('requirements.txt') || files.includes('Pipfile')) return 'pip';
  if (files.includes('Gemfile')) return 'bundler';
  return undefined;
}

function detectFramework(files: string[]): string | undefined {
  // Check package.json for framework dependencies
  if (files.includes('package.json')) {
    try {
      const packageJson = JSON.parse(readFile('package.json'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      if (deps.react) return 'React';
      if (deps.vue) return 'Vue';
      if (deps.angular || deps['@angular/core']) return 'Angular';
      if (deps.svelte) return 'Svelte';
      if (deps.next) return 'Next.js';
      if (deps.nuxt) return 'Nuxt.js';
      if (deps.gatsby) return 'Gatsby';
      if (deps.express) return 'Express';
      if (deps.nestjs || deps['@nestjs/core']) return 'NestJS';
    } catch (error) {
      // Ignore JSON parse errors
    }
  }
  
  // Check for framework-specific config files
  if (files.includes('angular.json')) return 'Angular';
  if (files.includes('vue.config.js')) return 'Vue';
  if (files.includes('svelte.config.js')) return 'Svelte';
  if (files.includes('next.config.js')) return 'Next.js';
  if (files.includes('nuxt.config.js')) return 'Nuxt.js';
  if (files.includes('gatsby-config.js')) return 'Gatsby';
  
  return undefined;
}

export function getProjectInfo(): CodebaseStructure {
  return analyzeCodebase('.');
}