/**
 * Python Language Plugin
 * 
 * Advanced analysis plugin for Python files
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

export class PythonPlugin implements LanguagePlugin {
  name = 'Python Analyzer';
  language = 'python';
  version = '1.0.0';

  /**
   * Parse Python code into AST
   */
  async parse(code: string, fileName: string): Promise<AST> {
    const lines = code.split('\n');
    const nodes: ASTNode[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (trimmed && !trimmed.startsWith('#')) {
        nodes.push(this.parseLine(line, i + 1));
      }
    }
    
    return {
      type: 'Module',
      nodes,
      language: this.language
    };
  }

  /**
   * Parse a single line into AST node
   */
  private parseLine(line: string, lineNumber: number): ASTNode {
    const trimmed = line.trim();
    const indent = line.length - line.trimStart().length;
    
    // Function definitions
    if (trimmed.match(/^def\s+\w+\s*\(/)) {
      const match = trimmed.match(/def\s+(\w+)/);
      return {
        type: 'FunctionDef',
        name: match?.[1] || 'anonymous',
        location: { line: lineNumber, column: 0 },
        metadata: { 
          async: trimmed.startsWith('async def'),
          indent
        }
      };
    }
    
    // Class definitions
    if (trimmed.match(/^class\s+\w+/)) {
      const match = trimmed.match(/class\s+(\w+)/);
      return {
        type: 'ClassDef',
        name: match?.[1] || 'anonymous',
        location: { line: lineNumber, column: 0 },
        metadata: { 
          inheritance: trimmed.includes('('),
          indent
        }
      };
    }
    
    // Import statements
    if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
      return {
        type: 'Import',
        location: { line: lineNumber, column: 0 },
        metadata: { 
          statement: trimmed,
          isFrom: trimmed.startsWith('from'),
          indent
        }
      };
    }
    
    // Variable assignments
    if (trimmed.match(/^\w+\s*=\s*/)) {
      const match = trimmed.match(/^(\w+)\s*=/);
      return {
        type: 'Assign',
        name: match?.[1] || 'unknown',
        location: { line: lineNumber, column: 0 },
        metadata: { 
          value: trimmed,
          indent
        }
      };
    }
    
    // Decorators
    if (trimmed.startsWith('@')) {
      return {
        type: 'Decorator',
        location: { line: lineNumber, column: 0 },
        metadata: { 
          decorator: trimmed,
          indent
        }
      };
    }
    
    // Default statement
    return {
      type: 'Stmt',
      location: { line: lineNumber, column: 0 },
      metadata: { 
        content: trimmed,
        indent
      }
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
   * Detect Python-specific patterns
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
    
    // Detect Context Manager pattern
    const contextManagerPattern = this.detectContextManagerPattern(ast);
    if (contextManagerPattern) {
      patterns.push(contextManagerPattern);
    }
    
    // Detect Iterator pattern
    const iteratorPattern = this.detectIteratorPattern(ast);
    if (iteratorPattern) {
      patterns.push(iteratorPattern);
    }
    
    // Detect Decorator pattern
    const decoratorPattern = this.detectDecoratorPattern(ast);
    if (decoratorPattern) {
      patterns.push(decoratorPattern);
    }
    
    return patterns;
  }

  private detectSingletonPattern(ast: AST): DetectedPattern | null {
    const classes = ast.nodes.filter(n => n.type === 'ClassDef');
    
    for (const classNode of classes) {
      // Look for __new__ method pattern
      const hasNew = ast.nodes.some(n => 
        n.metadata?.content?.includes('def __new__')
      );
      
      const hasInstance = ast.nodes.some(n => 
        n.metadata?.content?.includes('_instance')
      );
      
      if ((hasNew || hasInstance) && classNode.name) {
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
    const functions = ast.nodes.filter(n => n.type === 'FunctionDef');
    
    for (const func of functions) {
      if (func.name?.toLowerCase().includes('create') || 
          func.name?.toLowerCase().includes('factory') ||
          func.name?.toLowerCase().includes('build')) {
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

  private detectContextManagerPattern(ast: AST): DetectedPattern | null {
    const hasEnter = ast.nodes.some(n => 
      n.metadata?.content?.includes('def __enter__')
    );
    
    const hasExit = ast.nodes.some(n => 
      n.metadata?.content?.includes('def __exit__')
    );
    
    const hasContextManager = ast.nodes.some(n =>
      n.metadata?.statement?.includes('@contextmanager')
    );
    
    if (hasEnter && hasExit || hasContextManager) {
      return {
        type: 'Context Manager',
        name: 'Context Manager',
        confidence: 0.9,
        location: { startLine: 1, endLine: 1 },
        description: 'File implements the Context Manager pattern'
      };
    }
    
    return null;
  }

  private detectIteratorPattern(ast: AST): DetectedPattern | null {
    const hasIter = ast.nodes.some(n => 
      n.metadata?.content?.includes('def __iter__')
    );
    
    const hasNext = ast.nodes.some(n => 
      n.metadata?.content?.includes('def __next__')
    );
    
    if (hasIter && hasNext) {
      return {
        type: 'Iterator',
        name: 'Iterator',
        confidence: 0.95,
        location: { startLine: 1, endLine: 1 },
        description: 'File implements the Iterator pattern'
      };
    }
    
    return null;
  }

  private detectDecoratorPattern(ast: AST): DetectedPattern | null {
    const decorators = ast.nodes.filter(n => n.type === 'Decorator');
    
    if (decorators.length > 0) {
      return {
        type: 'Decorator',
        name: 'Python Decorators',
        confidence: 1.0,
        location: { startLine: 1, endLine: 1 },
        description: `File uses ${decorators.length} decorator(s)`
      };
    }
    
    return null;
  }

  /**
   * Calculate Python-specific metrics
   */
  async calculateMetrics(ast: AST): Promise<LanguageMetrics> {
    const functions = ast.nodes.filter(n => n.type === 'FunctionDef').length;
    const classes = ast.nodes.filter(n => n.type === 'ClassDef').length;
    const imports = ast.nodes.filter(n => n.type === 'Import').length;
    const decorators = ast.nodes.filter(n => n.type === 'Decorator').length;
    const totalNodes = ast.nodes.length;
    
    // Calculate complexity (simplified)
    const complexity = Math.min(10, Math.max(1, 
      (functions * 2 + classes * 3 + decorators * 1 + totalNodes * 0.08)
    ));
    
    // Calculate maintainability
    const maintainability = Math.max(0, 100 - (complexity * 7) - (imports * 1.5));
    
    // Calculate testability (Python is generally more testable)
    const testability = Math.max(0, 100 - (classes * 3) - (complexity * 2));
    
    // Performance estimation
    const performance = Math.max(0, 95 - (functions * 1.5) - (classes * 2));
    
    // Security estimation (Python has some security considerations)
    const security = 80; // Base security score for Python
    
    return {
      complexity,
      maintainability,
      testability,
      performance,
      security
    };
  }

  /**
   * Detect Python-specific issues
   */
  private detectIssues(ast: AST): CodeIssue[] {
    const issues: CodeIssue[] = [];
    
    for (const node of ast.nodes) {
      // Check for print statements (should use logging)
      if (node.metadata?.content?.includes('print(')) {
        issues.push({
          type: 'warning',
          message: 'Consider using logging instead of print()',
          line: node.location?.line || 0,
          severity: 'medium',
          category: 'style'
        });
      }
      
      // Check for bare except clauses
      if (node.metadata?.content?.includes('except:')) {
        issues.push({
          type: 'warning',
          message: 'Bare except clause should specify exception type',
          line: node.location?.line || 0,
          severity: 'high',
          category: 'security'
        });
      }
      
      // Check for mutable default arguments
      if (node.type === 'FunctionDef' && node.metadata?.content?.includes('def ')) {
        const content = node.metadata.content;
        if (content.includes('=[]') || content.includes('={}')) {
          issues.push({
            type: 'warning',
            message: 'Mutable default argument detected',
            line: node.location?.line || 0,
            severity: 'high',
            category: 'maintainability'
          });
        }
      }
      
      // Check for long lines
      if (node.metadata?.content && node.metadata.content.length > 120) {
        issues.push({
          type: 'warning',
          message: 'Line exceeds 120 characters (PEP 8)',
          line: node.location?.line || 0,
          severity: 'low',
          category: 'style'
        });
      }
      
      // Check for TODO comments
      if (node.metadata?.content?.includes('TODO') || node.metadata?.content?.includes('FIXME')) {
        issues.push({
          type: 'info',
          message: 'TODO/FIXME comment found',
          line: node.location?.line || 0,
          severity: 'low',
          category: 'maintainability'
        });
      }
      
      // Check for potential SQL injection
      if (node.metadata?.content?.includes('execute(') && node.metadata?.content?.includes('%')) {
        issues.push({
          type: 'warning',
          message: 'Potential SQL injection vulnerability (use parameterized queries)',
          line: node.location?.line || 0,
          severity: 'high',
          category: 'security'
        });
      }
    }
    
    return issues;
  }

  /**
   * Generate Python-specific suggestions
   */
  async generateSuggestions(ast: AST, issues: CodeIssue[]): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];
    
    // Suggest replacing print with logging
    const printIssues = issues.filter(i => i.message.includes('print'));
    if (printIssues.length > 0) {
      suggestions.push({
        id: `py-logging-${Date.now()}`,
        title: `Replace ${printIssues.length} print statements with logging`,
        description: 'Using logging provides better control over output and debugging',
        type: 'style',
        confidence: 0.9,
        impact: 'medium',
        risk: 'low',
        autoFixAvailable: true
      });
    }
    
    // Suggest fixing bare except clauses
    const exceptIssues = issues.filter(i => i.message.includes('except'));
    if (exceptIssues.length > 0) {
      suggestions.push({
        id: `py-except-${Date.now()}`,
        title: `Fix ${exceptIssues.length} bare except clauses`,
        description: 'Specify exception types to avoid catching unexpected errors',
        type: 'security',
        confidence: 0.95,
        impact: 'high',
        risk: 'low',
        autoFixAvailable: false
      });
    }
    
    // Suggest fixing mutable defaults
    const mutableIssues = issues.filter(i => i.message.includes('Mutable default'));
    if (mutableIssues.length > 0) {
      suggestions.push({
        id: `py-mutable-${Date.now()}`,
        title: `Fix ${mutableIssues.length} mutable default arguments`,
        description: 'Use None as default and create mutable objects inside function',
        type: 'refactor',
        confidence: 0.9,
        impact: 'high',
        risk: 'low',
        autoFixAvailable: true
      });
    }
    
    // Suggest adding type hints
    const functions = ast.nodes.filter(n => n.type === 'FunctionDef');
    const functionsWithoutTypes = functions.filter(f => 
      !f.metadata?.content?.includes(':') || !f.metadata?.content?.includes('->')
    );
    
    if (functionsWithoutTypes.length > 0) {
      suggestions.push({
        id: `py-types-${Date.now()}`,
        title: `Add type hints to ${functionsWithoutTypes.length} functions`,
        description: 'Type hints improve code clarity and enable better tooling',
        type: 'style',
        confidence: 0.8,
        impact: 'medium',
        risk: 'low',
        autoFixAvailable: false
      });
    }
    
    return suggestions;
  }

  /**
   * Check if plugin supports the given file
   */
  supports(fileName: string): boolean {
    const ext = fileName.toLowerCase();
    return ext.endsWith('.py') || ext.endsWith('.pyx') || ext.endsWith('.pyw');
  }
}