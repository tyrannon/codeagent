/**
 * TypeScript Language Plugin
 * 
 * Advanced analysis plugin for TypeScript/JavaScript files
 */

import {
  LanguagePlugin,
  AST,
  ASTNode,
  AnalysisResult,
  DetectedPattern,
  LanguageMetrics,
  CodeIssue,
  Suggestion
} from '../utils/languageDetector';

export class TypeScriptPlugin implements LanguagePlugin {
  name = 'TypeScript Analyzer';
  language = 'typescript';
  version = '1.0.0';

  /**
   * Parse TypeScript code into AST
   */
  async parse(code: string, fileName: string): Promise<AST> {
    // Simple AST representation - in production would use ts-morph or typescript compiler API
    const lines = code.split('\n');
    const nodes: ASTNode[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (trimmed) {
        nodes.push(this.parseLine(line, i + 1));
      }
    }
    
    return {
      type: 'Program',
      nodes,
      language: this.language
    };
  }

  /**
   * Parse a single line into AST node
   */
  private parseLine(line: string, lineNumber: number): ASTNode {
    const trimmed = line.trim();
    
    // Function declarations
    if (trimmed.match(/^(export\s+)?(async\s+)?function\s+\w+/)) {
      const match = trimmed.match(/function\s+(\w+)/);
      return {
        type: 'FunctionDeclaration',
        name: match?.[1] || 'anonymous',
        location: { line: lineNumber, column: 0 },
        metadata: { 
          async: trimmed.includes('async'),
          exported: trimmed.includes('export')
        }
      };
    }
    
    // Class declarations
    if (trimmed.match(/^(export\s+)?class\s+\w+/)) {
      const match = trimmed.match(/class\s+(\w+)/);
      return {
        type: 'ClassDeclaration',
        name: match?.[1] || 'anonymous',
        location: { line: lineNumber, column: 0 },
        metadata: { exported: trimmed.includes('export') }
      };
    }
    
    // Interface declarations
    if (trimmed.match(/^(export\s+)?interface\s+\w+/)) {
      const match = trimmed.match(/interface\s+(\w+)/);
      return {
        type: 'InterfaceDeclaration',
        name: match?.[1] || 'anonymous',
        location: { line: lineNumber, column: 0 },
        metadata: { exported: trimmed.includes('export') }
      };
    }
    
    // Import/Export statements
    if (trimmed.startsWith('import') || trimmed.startsWith('export')) {
      return {
        type: trimmed.startsWith('import') ? 'ImportDeclaration' : 'ExportDeclaration',
        location: { line: lineNumber, column: 0 },
        metadata: { statement: trimmed }
      };
    }
    
    // Variable declarations
    if (trimmed.match(/^(const|let|var)\s+\w+/)) {
      const match = trimmed.match(/(const|let|var)\s+(\w+)/);
      return {
        type: 'VariableDeclaration',
        name: match?.[2] || 'anonymous',
        location: { line: lineNumber, column: 0 },
        metadata: { 
          kind: match?.[1],
          hasType: trimmed.includes(':')
        }
      };
    }
    
    // Default statement
    return {
      type: 'Statement',
      location: { line: lineNumber, column: 0 },
      metadata: { content: trimmed }
    };
  }

  /**
   * Analyze AST and generate comprehensive insights
   */
  async analyze(ast: AST, fileName: string): Promise<AnalysisResult> {
    const patterns = await this.detectPatterns(ast);
    const metrics = await this.calculateMetrics(ast);
    const issues = this.detectIssues(ast);
    const suggestions = await this.generateSuggestions(ast, issues);
    
    return {
      language: this.language,
      fileName,
      patterns,
      metrics,
      issues,
      suggestions
    };
  }

  /**
   * Detect TypeScript-specific patterns
   */
  async detectPatterns(ast: AST): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];
    
    // Detect Singleton pattern
    const singletonPattern = this.detectSingletonPattern(ast);
    if (singletonPattern) {
      patterns.push(singletonPattern);
    }
    
    // Detect Factory pattern
    const factoryPattern = this.detectFactoryPattern(ast);
    if (factoryPattern) {
      patterns.push(factoryPattern);
    }
    
    // Detect Observer pattern
    const observerPattern = this.detectObserverPattern(ast);
    if (observerPattern) {
      patterns.push(observerPattern);
    }
    
    // Detect Module pattern
    const modulePattern = this.detectModulePattern(ast);
    if (modulePattern) {
      patterns.push(modulePattern);
    }
    
    return patterns;
  }

  private detectSingletonPattern(ast: AST): DetectedPattern | null {
    const classes = ast.nodes.filter(n => n.type === 'ClassDeclaration');
    
    for (const classNode of classes) {
      // Look for private constructor pattern (simplified)
      const hasStaticInstance = ast.nodes.some(n => 
        n.metadata?.content?.includes(`${classNode.name}.instance`)
      );
      
      if (hasStaticInstance && classNode.name) {
        return {
          type: 'Singleton',
          name: classNode.name,
          confidence: 0.8,
          location: {
            startLine: classNode.location?.line || 0,
            endLine: classNode.location?.line || 0
          },
          description: `${classNode.name} appears to implement the Singleton pattern`
        };
      }
    }
    
    return null;
  }

  private detectFactoryPattern(ast: AST): DetectedPattern | null {
    const functions = ast.nodes.filter(n => n.type === 'FunctionDeclaration');
    
    for (const func of functions) {
      if (func.name?.toLowerCase().includes('create') || 
          func.name?.toLowerCase().includes('factory')) {
        return {
          type: 'Factory',
          name: func.name,
          confidence: 0.7,
          location: {
            startLine: func.location?.line || 0,
            endLine: func.location?.line || 0
          },
          description: `${func.name} appears to implement the Factory pattern`
        };
      }
    }
    
    return null;
  }

  private detectObserverPattern(ast: AST): DetectedPattern | null {
    const hasEventEmitter = ast.nodes.some(n => 
      n.metadata?.statement?.includes('EventEmitter') ||
      n.metadata?.content?.includes('addEventListener') ||
      n.metadata?.content?.includes('subscribe')
    );
    
    if (hasEventEmitter) {
      return {
        type: 'Observer',
        name: 'Event System',
        confidence: 0.9,
        location: { startLine: 1, endLine: 1 },
        description: 'File implements the Observer pattern through event handling'
      };
    }
    
    return null;
  }

  private detectModulePattern(ast: AST): DetectedPattern | null {
    const hasExports = ast.nodes.some(n => n.type === 'ExportDeclaration');
    const hasImports = ast.nodes.some(n => n.type === 'ImportDeclaration');
    
    if (hasExports || hasImports) {
      return {
        type: 'Module',
        name: 'ES6 Module',
        confidence: 1.0,
        location: { startLine: 1, endLine: 1 },
        description: 'File follows the ES6 Module pattern'
      };
    }
    
    return null;
  }

  /**
   * Calculate TypeScript-specific metrics
   */
  async calculateMetrics(ast: AST): Promise<LanguageMetrics> {
    const functions = ast.nodes.filter(n => n.type === 'FunctionDeclaration').length;
    const classes = ast.nodes.filter(n => n.type === 'ClassDeclaration').length;
    const interfaces = ast.nodes.filter(n => n.type === 'InterfaceDeclaration').length;
    const imports = ast.nodes.filter(n => n.type === 'ImportDeclaration').length;
    const totalNodes = ast.nodes.length;
    
    // Calculate complexity (simplified)
    const complexity = Math.min(10, Math.max(1, 
      (functions * 2 + classes * 3 + totalNodes * 0.1)
    ));
    
    // Calculate maintainability
    const maintainability = Math.max(0, 100 - (complexity * 8) - (imports * 2));
    
    // Calculate testability
    const testability = Math.max(0, 100 - (classes * 5) - (complexity * 3));
    
    // Performance estimation
    const performance = Math.max(0, 100 - (functions * 2) - (classes * 3));
    
    // Security estimation
    const security = 85; // Base security score for TypeScript
    
    return {
      complexity,
      maintainability,
      testability,
      performance,
      security
    };
  }

  /**
   * Detect TypeScript-specific issues
   */
  private detectIssues(ast: AST): CodeIssue[] {
    const issues: CodeIssue[] = [];
    
    for (const node of ast.nodes) {
      // Check for missing types
      if (node.type === 'VariableDeclaration' && !node.metadata?.hasType) {
        issues.push({
          type: 'warning',
          message: `Variable '${node.name}' is missing type annotation`,
          line: node.location?.line || 0,
          severity: 'medium',
          category: 'style'
        });
      }
      
      // Check for any type usage
      if (node.metadata?.content?.includes(': any')) {
        issues.push({
          type: 'warning',
          message: 'Use of "any" type reduces type safety',
          line: node.location?.line || 0,
          severity: 'medium',
          category: 'maintainability'
        });
      }
      
      // Check for console.log statements
      if (node.metadata?.content?.includes('console.log')) {
        issues.push({
          type: 'info',
          message: 'Consider using proper logging instead of console.log',
          line: node.location?.line || 0,
          severity: 'low',
          category: 'style'
        });
      }
      
      // Check for long lines (simplified)
      if (node.metadata?.content && node.metadata.content.length > 120) {
        issues.push({
          type: 'warning',
          message: 'Line exceeds 120 characters',
          line: node.location?.line || 0,
          severity: 'low',
          category: 'style'
        });
      }
    }
    
    return issues;
  }

  /**
   * Generate TypeScript-specific suggestions
   */
  async generateSuggestions(ast: AST, issues: CodeIssue[]): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];
    
    // Suggest adding types for untyped variables
    const untypedVars = issues.filter(i => i.message.includes('missing type annotation'));
    if (untypedVars.length > 0) {
      suggestions.push({
        id: `ts-add-types-${Date.now()}`,
        title: `Add type annotations to ${untypedVars.length} variables`,
        description: 'Adding explicit types improves code clarity and catches errors early',
        type: 'style',
        confidence: 0.9,
        impact: 'medium',
        risk: 'low',
        autoFixAvailable: true
      });
    }
    
    // Suggest replacing any types
    const anyTypeIssues = issues.filter(i => i.message.includes('any'));
    if (anyTypeIssues.length > 0) {
      suggestions.push({
        id: `ts-replace-any-${Date.now()}`,
        title: `Replace ${anyTypeIssues.length} 'any' types with specific types`,
        description: 'Specific types provide better IntelliSense and error detection',
        type: 'refactor',
        confidence: 0.8,
        impact: 'high',
        risk: 'medium',
        autoFixAvailable: false
      });
    }
    
    // Suggest removing console.log
    const consoleIssues = issues.filter(i => i.message.includes('console.log'));
    if (consoleIssues.length > 0) {
      suggestions.push({
        id: `ts-remove-console-${Date.now()}`,
        title: `Remove ${consoleIssues.length} console.log statements`,
        description: 'Use proper logging framework for production code',
        type: 'style',
        confidence: 0.95,
        impact: 'low',
        risk: 'low',
        autoFixAvailable: true
      });
    }
    
    return suggestions;
  }

  /**
   * Check if plugin supports the given file
   */
  supports(fileName: string): boolean {
    const ext = fileName.toLowerCase();
    return ext.endsWith('.ts') || ext.endsWith('.tsx') || ext.endsWith('.js') || ext.endsWith('.jsx');
  }
}