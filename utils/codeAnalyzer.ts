// codeAnalyzer.ts - Advanced static code analysis for better context
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

export interface CodePattern {
  type: 'class' | 'function' | 'interface' | 'import' | 'export' | 'pattern';
  name: string;
  file: string;
  lineNumber: number;
  code: string;
  description?: string;
}

export interface ArchitecturalInsight {
  pattern: string;
  evidence: string[];
  files: string[];
  confidence: number;
  description: string;
}

export class CodeAnalyzer {
  private projectRoot: string;
  private codePatterns: CodePattern[] = [];
  private architecturalInsights: ArchitecturalInsight[] = [];

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  async analyzeProject(): Promise<{
    patterns: CodePattern[];
    insights: ArchitecturalInsight[];
    structure: string;
    metrics: ProjectMetrics;
  }> {
    // Get TypeScript/JavaScript files
    const files = await glob('**/*.{ts,js}', {
      ignore: ['node_modules/**', 'dist/**', '.git/**', '**/*.min.js', '**/*.d.ts'],
      cwd: this.projectRoot
    });

    this.codePatterns = [];
    this.architecturalInsights = [];

    // Analyze each file
    for (const file of files) {
      await this.analyzeFile(path.join(this.projectRoot, file), file);
    }

    // Generate architectural insights
    this.generateArchitecturalInsights();

    // Calculate metrics
    const metrics = this.calculateMetrics();

    return {
      patterns: this.codePatterns,
      insights: this.architecturalInsights,
      structure: this.generateStructureAnalysis(files),
      metrics
    };
  }

  private async analyzeFile(filePath: string, relativePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // Extract classes, functions, interfaces
      this.extractCodeStructures(content, lines, relativePath);
      
      // Extract imports/exports
      this.extractImportsExports(lines, relativePath);

      // Detect patterns
      this.detectDesignPatterns(content, lines, relativePath);

    } catch (error) {
      console.warn(`Warning: Could not analyze ${relativePath}`);
    }
  }

  private extractCodeStructures(content: string, lines: string[], file: string): void {
    // Extract classes
    const classMatches = content.matchAll(/export\s+(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+\w+)?(?:\s+implements\s+[\w,\s]+)?\s*\{/g);
    for (const match of classMatches) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      this.codePatterns.push({
        type: 'class',
        name: match[1],
        file,
        lineNumber: lineNum,
        code: this.extractCodeBlock(lines, lineNum - 1, '{', '}'),
        description: `Class ${match[1]} with potential inheritance or implementation`
      });
    }

    // Extract functions
    const functionMatches = content.matchAll(/(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)[^{]*\{/g);
    for (const match of functionMatches) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      this.codePatterns.push({
        type: 'function',
        name: match[1],
        file,
        lineNumber: lineNum,
        code: this.extractCodeBlock(lines, lineNum - 1, '{', '}'),
        description: `Function ${match[1]} - potential command or utility`
      });
    }

    // Extract interfaces
    const interfaceMatches = content.matchAll(/(?:export\s+)?interface\s+(\w+)(?:\s+extends\s+[\w,\s]+)?\s*\{/g);
    for (const match of interfaceMatches) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      this.codePatterns.push({
        type: 'interface',
        name: match[1],
        file,
        lineNumber: lineNum,
        code: this.extractCodeBlock(lines, lineNum - 1, '{', '}'),
        description: `Interface ${match[1]} defining contract or data structure`
      });
    }
  }

  private extractImportsExports(lines: string[], file: string): void {
    lines.forEach((line, index) => {
      // Import statements
      const importMatch = line.match(/import\s+(?:\{([^}]+)\}|\*\s+as\s+\w+|(\w+))\s+from\s+['"`]([^'"`]+)['"`]/);
      if (importMatch) {
        this.codePatterns.push({
          type: 'import',
          name: importMatch[1] || importMatch[2] || 'namespace',
          file,
          lineNumber: index + 1,
          code: line.trim(),
          description: `Import from ${importMatch[3]} - shows dependency relationship`
        });
      }

      // Export statements
      const exportMatch = line.match(/export\s+(?:default\s+)?(?:class|function|interface|const|let|var)\s+(\w+)/);
      if (exportMatch) {
        this.codePatterns.push({
          type: 'export',
          name: exportMatch[1],
          file,
          lineNumber: index + 1,
          code: line.trim(),
          description: `Export ${exportMatch[1]} - public API surface`
        });
      }
    });
  }

  private detectDesignPatterns(content: string, lines: string[], file: string): void {
    // Command Pattern Detection
    if (content.includes('.command(') || content.includes('Commander') || file.includes('cli.ts')) {
      this.codePatterns.push({
        type: 'pattern',
        name: 'Command Pattern',
        file,
        lineNumber: 1,
        code: 'CLI command structure with Commander.js',
        description: 'Command Pattern implemented via Commander.js for CLI operations'
      });
    }

    // Factory Pattern Detection
    if (content.match(/create\w+|make\w+|\w+Factory/)) {
      const factoryMatch = content.match(/(create\w+|make\w+|\w+Factory)/);
      if (factoryMatch) {
        this.codePatterns.push({
          type: 'pattern',
          name: 'Factory Pattern',
          file,
          lineNumber: 1,
          code: factoryMatch[0],
          description: 'Factory method for object creation'
        });
      }
    }

    // Singleton Pattern Detection
    if (content.includes('getInstance') || content.match(/private\s+static\s+instance/)) {
      this.codePatterns.push({
        type: 'pattern',
        name: 'Singleton Pattern',
        file,
        lineNumber: 1,
        code: 'Singleton instance management',
        description: 'Singleton pattern for single instance management'
      });
    }

    // Strategy Pattern Detection
    if (content.match(/interface\s+\w+Strategy/) || content.includes('strategy')) {
      this.codePatterns.push({
        type: 'pattern',
        name: 'Strategy Pattern',
        file,
        lineNumber: 1,
        code: 'Strategy interface or implementation',
        description: 'Strategy pattern for interchangeable algorithms'
      });
    }
  }

  private extractCodeBlock(lines: string[], startLine: number, openBrace: string, closeBrace: string): string {
    let braceCount = 0;
    let block = '';
    let started = false;

    for (let i = startLine; i < Math.min(lines.length, startLine + 20); i++) {
      const line = lines[i];
      if (!started && line.includes(openBrace)) {
        started = true;
      }
      
      if (started) {
        block += line + '\n';
        braceCount += (line.match(/\{/g) || []).length;
        braceCount -= (line.match(/\}/g) || []).length;
        
        if (braceCount === 0 && started) {
          break;
        }
      }
    }

    return block.trim();
  }

  private generateArchitecturalInsights(): void {
    const patterns = this.codePatterns;
    
    // Command Pattern Analysis
    const commandFiles = patterns.filter(p => 
      p.file.includes('commands/') || p.file.includes('cli.ts') || p.type === 'pattern' && p.name === 'Command Pattern'
    );
    
    if (commandFiles.length > 0) {
      this.architecturalInsights.push({
        pattern: 'Command Pattern',
        evidence: commandFiles.map(f => `${f.file}:${f.lineNumber} - ${f.description}`),
        files: [...new Set(commandFiles.map(f => f.file))],
        confidence: 0.9,
        description: 'Strong evidence of Command Pattern: CLI commands are organized in separate files with Commander.js orchestration'
      });
    }

    // Module Pattern Analysis
    const modules = patterns.filter(p => p.type === 'import' || p.type === 'export');
    if (modules.length > 5) {
      this.architecturalInsights.push({
        pattern: 'Module Pattern',
        evidence: modules.slice(0, 5).map(m => `${m.file}:${m.lineNumber} - ${m.code}`),
        files: [...new Set(modules.map(m => m.file))],
        confidence: 0.95,
        description: 'Clear modular architecture with ES6 imports/exports for separation of concerns'
      });
    }

    // Dependency Injection Analysis
    const constructorInjections = patterns.filter(p => 
      p.code.includes('constructor') && p.code.match(/constructor\s*\([^)]+\)/)
    );
    
    if (constructorInjections.length > 0) {
      this.architecturalInsights.push({
        pattern: 'Dependency Injection',
        evidence: constructorInjections.map(c => `${c.file}:${c.lineNumber} - Constructor with parameters`),
        files: [...new Set(constructorInjections.map(c => c.file))],
        confidence: 0.7,
        description: 'Potential dependency injection through constructor parameters'
      });
    }
  }

  private calculateMetrics(): ProjectMetrics {
    const files = [...new Set(this.codePatterns.map(p => p.file))];
    const classes = this.codePatterns.filter(p => p.type === 'class');
    const functions = this.codePatterns.filter(p => p.type === 'function');
    const interfaces = this.codePatterns.filter(p => p.type === 'interface');
    
    return {
      totalFiles: files.length,
      totalClasses: classes.length,
      totalFunctions: functions.length,
      totalInterfaces: interfaces.length,
      designPatterns: this.architecturalInsights.length,
      complexityScore: this.calculateComplexityScore()
    };
  }

  private calculateComplexityScore(): number {
    const patterns = this.architecturalInsights.length;
    const files = [...new Set(this.codePatterns.map(p => p.file))].length;
    
    // Simple complexity scoring
    return Math.min(10, Math.round((patterns * 2 + files * 0.5) / 2));
  }

  private generateStructureAnalysis(files: string[]): string {
    const structure = files
      .sort()
      .map(file => {
        const patterns = this.codePatterns.filter(p => p.file === file);
        const patternSummary = patterns
          .filter(p => p.type !== 'import' && p.type !== 'export')
          .map(p => `${p.type}:${p.name}`)
          .join(', ');
        
        return patternSummary ? `${file} (${patternSummary})` : file;
      })
      .join('\n');

    return structure;
  }
}

export interface ProjectMetrics {
  totalFiles: number;
  totalClasses: number;
  totalFunctions: number;
  totalInterfaces: number;
  designPatterns: number;
  complexityScore: number;
}