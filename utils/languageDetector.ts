/**
 * Language Detection and Plugin Management
 * 
 * Detects programming languages and manages language-specific analysis plugins
 */

import { readFile } from 'fs/promises';
import { extname, basename } from 'path';

export interface LanguageInfo {
  name: string;
  extensions: string[];
  category: 'compiled' | 'interpreted' | 'scripting' | 'markup' | 'config';
  complexity: 'low' | 'medium' | 'high';
}

export interface AST {
  type: string;
  nodes: ASTNode[];
  language: string;
}

export interface ASTNode {
  type: string;
  name?: string;
  children?: ASTNode[];
  location?: {
    line: number;
    column: number;
  };
  metadata?: Record<string, any>;
}

export interface AnalysisResult {
  language: string;
  fileName: string;
  patterns: DetectedPattern[];
  metrics: LanguageMetrics;
  issues: CodeIssue[];
  suggestions: Suggestion[];
}

export interface DetectedPattern {
  type: string;
  name: string;
  confidence: number;
  location: {
    startLine: number;
    endLine: number;
  };
  description: string;
}

export interface LanguageMetrics {
  complexity: number;
  maintainability: number;
  testability: number;
  performance: number;
  security: number;
}

export interface CodeIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  line: number;
  column?: number;
  severity: 'high' | 'medium' | 'low';
  category: 'syntax' | 'style' | 'performance' | 'security' | 'maintainability';
}

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  type: 'refactor' | 'optimize' | 'security' | 'style';
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  risk: 'high' | 'medium' | 'low';
  autoFixAvailable: boolean;
}

export interface LanguagePlugin {
  name: string;
  language: string;
  version: string;
  
  /**
   * Parse code into AST
   */
  parse(code: string, fileName: string): Promise<AST>;
  
  /**
   * Analyze AST and generate insights
   */
  analyze(ast: AST, fileName: string): Promise<AnalysisResult>;
  
  /**
   * Detect language-specific patterns
   */
  detectPatterns(ast: AST): Promise<DetectedPattern[]>;
  
  /**
   * Calculate language-specific metrics
   */
  calculateMetrics(ast: AST): Promise<LanguageMetrics>;
  
  /**
   * Generate improvement suggestions
   */
  generateSuggestions(ast: AST, issues: CodeIssue[]): Promise<Suggestion[]>;
  
  /**
   * Check if plugin supports the given file
   */
  supports(fileName: string): boolean;
}

export class LanguageDetector {
  private plugins: Map<string, LanguagePlugin> = new Map();
  
  private readonly LANGUAGE_MAP: Map<string, LanguageInfo> = new Map([
    ['typescript', {
      name: 'TypeScript',
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs'],
      category: 'compiled',
      complexity: 'high'
    }],
    ['python', {
      name: 'Python',
      extensions: ['.py', '.pyx', '.pyw'],
      category: 'interpreted',
      complexity: 'medium'
    }],
    ['rust', {
      name: 'Rust',
      extensions: ['.rs'],
      category: 'compiled',
      complexity: 'high'
    }],
    ['go', {
      name: 'Go',
      extensions: ['.go'],
      category: 'compiled',
      complexity: 'medium'
    }],
    ['java', {
      name: 'Java',
      extensions: ['.java'],
      category: 'compiled',
      complexity: 'high'
    }],
    ['csharp', {
      name: 'C#',
      extensions: ['.cs'],
      category: 'compiled',
      complexity: 'high'
    }],
    ['cpp', {
      name: 'C++',
      extensions: ['.cpp', '.cc', '.cxx', '.hpp', '.h'],
      category: 'compiled',
      complexity: 'high'
    }],
    ['json', {
      name: 'JSON',
      extensions: ['.json'],
      category: 'config',
      complexity: 'low'
    }],
    ['yaml', {
      name: 'YAML',
      extensions: ['.yml', '.yaml'],
      category: 'config',
      complexity: 'low'
    }],
    ['markdown', {
      name: 'Markdown',
      extensions: ['.md', '.mdx'],
      category: 'markup',
      complexity: 'low'
    }]
  ]);

  /**
   * Detect language from file extension and content
   */
  async detectLanguage(fileName: string, content?: string): Promise<string | null> {
    const extension = extname(fileName).toLowerCase();
    
    // First try extension-based detection
    for (const [language, info] of this.LANGUAGE_MAP) {
      if (info.extensions.includes(extension)) {
        return language;
      }
    }
    
    // If content is provided, try content-based detection
    if (content) {
      return this.detectFromContent(content, fileName);
    }
    
    return null;
  }

  /**
   * Detect language from file content using patterns
   */
  private detectFromContent(content: string, fileName: string): string | null {
    const lines = content.split('\n').slice(0, 10); // Check first 10 lines
    const firstLine = lines[0] || '';
    
    // Check for shebangs
    if (firstLine.startsWith('#!')) {
      if (firstLine.includes('python')) return 'python';
      if (firstLine.includes('node')) return 'javascript';
    }
    
    // Check for common patterns
    const patterns = [
      { regex: /import\s+\{.*\}\s+from/, language: 'typescript' },
      { regex: /interface\s+\w+/, language: 'typescript' },
      { regex: /def\s+\w+\s*\(/, language: 'python' },
      { regex: /class\s+\w+.*:/, language: 'python' },
      { regex: /fn\s+\w+\s*\(/, language: 'rust' },
      { regex: /func\s+\w+\s*\(/, language: 'go' },
      { regex: /public\s+class\s+\w+/, language: 'java' },
      { regex: /using\s+System/, language: 'csharp' },
      { regex: /#include\s*</, language: 'cpp' }
    ];
    
    for (const { regex, language } of patterns) {
      if (regex.test(content)) {
        return language;
      }
    }
    
    return null;
  }

  /**
   * Register a language plugin
   */
  registerPlugin(plugin: LanguagePlugin): void {
    this.plugins.set(plugin.language, plugin);
    console.log(`📦 Registered ${plugin.name} v${plugin.version} plugin`);
  }

  /**
   * Get plugin for a specific language
   */
  getPlugin(language: string): LanguagePlugin | null {
    return this.plugins.get(language) || null;
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): LanguagePlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get language information
   */
  getLanguageInfo(language: string): LanguageInfo | null {
    return this.LANGUAGE_MAP.get(language) || null;
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): string[] {
    return Array.from(this.LANGUAGE_MAP.keys());
  }

  /**
   * Check if language is supported
   */
  isSupported(language: string): boolean {
    return this.LANGUAGE_MAP.has(language) && this.plugins.has(language);
  }

  /**
   * Analyze file using appropriate plugin
   */
  async analyzeFile(fileName: string, content?: string): Promise<AnalysisResult | null> {
    const fileContent = content || await readFile(fileName, 'utf-8');
    const language = await this.detectLanguage(fileName, fileContent);
    
    if (!language) {
      console.warn(`⚠️ Could not detect language for ${fileName}`);
      return null;
    }
    
    const plugin = this.getPlugin(language);
    if (!plugin) {
      console.warn(`⚠️ No plugin available for ${language}`);
      return null;
    }
    
    try {
      const ast = await plugin.parse(fileContent, fileName);
      const result = await plugin.analyze(ast, fileName);
      return result;
    } catch (error) {
      console.error(`❌ Error analyzing ${fileName}:`, error);
      return null;
    }
  }

  /**
   * Get statistics about language usage in a codebase
   */
  async getCodebaseStatistics(files: string[]): Promise<Map<string, number>> {
    const stats = new Map<string, number>();
    
    for (const file of files) {
      try {
        const content = await readFile(file, 'utf-8');
        const language = await this.detectLanguage(file, content);
        
        if (language) {
          stats.set(language, (stats.get(language) || 0) + 1);
        }
      } catch (error) {
        // Ignore files that can't be read
      }
    }
    
    return stats;
  }
}

// Export singleton instance
export const languageDetector = new LanguageDetector();