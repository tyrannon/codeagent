/**
 * Go Language Plugin
 * 
 * Advanced analysis plugin for Go files
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

export class GoPlugin implements LanguagePlugin {
  name = 'Go Analyzer';
  language = 'go';
  version = '1.0.0';

  /**
   * Parse Go code into AST
   */
  async parse(code: string, fileName: string): Promise<AST> {
    const lines = code.split('\n');
    const nodes: ASTNode[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (trimmed && !trimmed.startsWith('//')) {
        nodes.push(this.parseLine(line, i + 1));
      }
    }
    
    return {
      type: 'Package',
      nodes,
      language: this.language
    };
  }

  /**
   * Parse a single line into AST node
   */
  private parseLine(line: string, lineNumber: number): ASTNode {
    const trimmed = line.trim();
    
    // Package declaration
    if (trimmed.startsWith('package ')) {
      const match = trimmed.match(/package\s+(\w+)/);
      return {
        type: 'PackageDecl',
        name: match?.[1] || 'main',
        location: { line: lineNumber, column: 0 },
        metadata: { package: match?.[1] }
      };
    }
    
    // Import declarations
    if (trimmed.startsWith('import ')) {
      return {
        type: 'ImportDecl',
        location: { line: lineNumber, column: 0 },
        metadata: { statement: trimmed }
      };
    }
    
    // Function declarations
    if (trimmed.match(/^func\s+\w+\s*\(/)) {
      const match = trimmed.match(/func\s+(\w+)/);
      return {
        type: 'FuncDecl',
        name: match?.[1] || 'anonymous',
        location: { line: lineNumber, column: 0 },
        metadata: { 
          receiver: trimmed.includes(')') && !trimmed.startsWith('func '),
          signature: trimmed
        }
      };
    }
    
    // Method declarations (with receiver)
    if (trimmed.match(/^func\s+\([^)]+\)\s+\w+\s*\(/)) {
      const match = trimmed.match(/func\s+\([^)]+\)\s+(\w+)/);
      return {
        type: 'MethodDecl',
        name: match?.[1] || 'anonymous',
        location: { line: lineNumber, column: 0 },
        metadata: { 
          receiver: true,
          signature: trimmed
        }
      };
    }
    
    // Type declarations
    if (trimmed.match(/^type\s+\w+/)) {
      const match = trimmed.match(/type\s+(\w+)/);
      return {
        type: 'TypeDecl',
        name: match?.[1] || 'anonymous',
        location: { line: lineNumber, column: 0 },
        metadata: { 
          isStruct: trimmed.includes('struct'),
          isInterface: trimmed.includes('interface'),
          definition: trimmed
        }
      };
    }
    
    // Variable declarations
    if (trimmed.match(/^var\s+\w+/) || trimmed.match(/^\w+\s*:=/) || trimmed.match(/^const\s+\w+/)) {
      const match = trimmed.match(/(?:var|const)\s+(\w+)/) || trimmed.match(/^(\w+)\s*:=/);
      return {
        type: 'VarDecl',
        name: match?.[1] || 'unknown',
        location: { line: lineNumber, column: 0 },
        metadata: { 
          isConst: trimmed.startsWith('const'),
          isShortDecl: trimmed.includes(':='),
          value: trimmed
        }
      };
    }
    
    // Default statement
    return {
      type: 'Stmt',
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
   * Detect Go-specific patterns
   */
  async detectPatterns(ast: AST): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];
    
    // Detect Builder pattern
    const builderPattern = this.detectBuilderPattern(ast);
    if (builderPattern) {
      patterns.push(builderPattern);
    }
    
    // Detect Factory pattern
    const factoryPattern = this.detectFactoryPattern(ast);
    if (factoryPattern) {
      patterns.push(factoryPattern);
    }
    
    // Detect Interface pattern
    const interfacePattern = this.detectInterfacePattern(ast);
    if (interfacePattern) {
      patterns.push(interfacePattern);
    }
    
    // Detect Error handling pattern
    const errorPattern = this.detectErrorHandlingPattern(ast);
    if (errorPattern) {
      patterns.push(errorPattern);
    }
    
    // Detect Goroutine pattern
    const goroutinePattern = this.detectGoroutinePattern(ast);
    if (goroutinePattern) {
      patterns.push(goroutinePattern);
    }
    
    return patterns;
  }

  private detectBuilderPattern(ast: AST): DetectedPattern | null {
    const types = ast.nodes.filter(n => n.type === 'TypeDecl');
    const methods = ast.nodes.filter(n => n.type === 'MethodDecl');
    
    for (const type of types) {
      // Look for methods that return the same type (fluent interface)
      const builderMethods = methods.filter(m => 
        m.metadata?.signature?.includes(`*${type.name}`) ||
        m.metadata?.signature?.includes(`${type.name}`)
      );
      
      if (builderMethods.length >= 2 && type.name) {
        return {
          type: 'Builder',
          name: type.name,
          confidence: 0.8,
          location: {
            startLine: type.location?.line || 0,
            endLine: type.location?.line || 0
          },
          description: `${type.name} appears to implement the Builder pattern`
        };
      }
    }
    
    return null;
  }

  private detectFactoryPattern(ast: AST): DetectedPattern | null {
    const functions = ast.nodes.filter(n => n.type === 'FuncDecl');
    
    for (const func of functions) {
      if (func.name?.toLowerCase().startsWith('new') || 
          func.name?.toLowerCase().includes('create') ||
          func.name?.toLowerCase().includes('make')) {
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

  private detectInterfacePattern(ast: AST): DetectedPattern | null {
    const interfaces = ast.nodes.filter(n => 
      n.type === 'TypeDecl' && n.metadata?.isInterface
    );
    
    if (interfaces.length > 0) {
      return {
        type: 'Interface',
        name: 'Go Interfaces',
        confidence: 1.0,
        location: { startLine: 1, endLine: 1 },
        description: `File defines ${interfaces.length} interface(s)`
      };
    }
    
    return null;
  }

  private detectErrorHandlingPattern(ast: AST): DetectedPattern | null {
    const hasErrorHandling = ast.nodes.some(n => 
      n.metadata?.content?.includes('if err != nil') ||
      n.metadata?.content?.includes('return err') ||
      n.metadata?.content?.includes('error')
    );
    
    if (hasErrorHandling) {
      return {
        type: 'Error Handling',
        name: 'Go Error Handling',
        confidence: 0.9,
        location: { startLine: 1, endLine: 1 },
        description: 'File implements Go error handling patterns'
      };
    }
    
    return null;
  }

  private detectGoroutinePattern(ast: AST): DetectedPattern | null {
    const hasGoroutines = ast.nodes.some(n => 
      n.metadata?.content?.includes('go ') ||
      n.metadata?.content?.includes('chan ') ||
      n.metadata?.content?.includes('select {')
    );
    
    if (hasGoroutines) {
      return {
        type: 'Concurrency',
        name: 'Go Concurrency',
        confidence: 0.95,
        location: { startLine: 1, endLine: 1 },
        description: 'File uses Go concurrency patterns (goroutines/channels)'
      };
    }
    
    return null;
  }

  /**
   * Calculate Go-specific metrics
   */
  async calculateMetrics(ast: AST): Promise<LanguageMetrics> {
    const functions = ast.nodes.filter(n => n.type === 'FuncDecl').length;
    const methods = ast.nodes.filter(n => n.type === 'MethodDecl').length;
    const types = ast.nodes.filter(n => n.type === 'TypeDecl').length;
    const imports = ast.nodes.filter(n => n.type === 'ImportDecl').length;
    const totalNodes = ast.nodes.length;
    
    // Calculate complexity
    const complexity = Math.min(10, Math.max(1, 
      (functions * 2 + methods * 1.5 + types * 1 + totalNodes * 0.05)
    ));
    
    // Calculate maintainability (Go is generally maintainable)
    const maintainability = Math.max(0, 100 - (complexity * 6) - (imports * 1));
    
    // Calculate testability (Go has excellent testing support)
    const testability = Math.max(0, 95 - (complexity * 2));
    
    // Performance estimation (Go is performant)
    const performance = Math.max(0, 95 - (functions * 1) - (complexity * 1));
    
    // Security estimation
    const security = 85; // Base security score for Go
    
    return {
      complexity,
      maintainability,
      testability,
      performance,
      security
    };
  }

  /**
   * Detect Go-specific issues
   */
  private detectIssues(ast: AST): CodeIssue[] {
    const issues: CodeIssue[] = [];
    
    for (const node of ast.nodes) {
      const content = node.metadata?.content || '';
      
      // Check for unused variables (Go compiler catches these but good to flag)
      if (content.includes(':=') && !content.includes('_')) {
        // This is a simplified check - real implementation would be more sophisticated
      }
      
      // Check for missing error handling
      if ((content.includes('err') && !content.includes('if err')) ||
          (node.type === 'FuncDecl' && node.metadata?.signature?.includes('error') && 
           !ast.nodes.some(n => n.metadata?.content?.includes('if err != nil')))) {
        issues.push({
          type: 'warning',
          message: 'Potential missing error handling',
          line: node.location?.line || 0,
          severity: 'high',
          category: 'maintainability'
        });
      }
      
      // Check for fmt.Println in production code
      if (content.includes('fmt.Println') || content.includes('fmt.Print')) {
        issues.push({
          type: 'info',
          message: 'Consider using proper logging instead of fmt.Print*',
          line: node.location?.line || 0,
          severity: 'low',
          category: 'style'
        });
      }
      
      // Check for panic without recovery
      if (content.includes('panic(')) {
        issues.push({
          type: 'warning',
          message: 'Using panic - ensure this is intentional',
          line: node.location?.line || 0,
          severity: 'medium',
          category: 'maintainability'
        });
      }
      
      // Check for potential race conditions
      if (content.includes('go ') && !content.includes('sync.')) {
        issues.push({
          type: 'info',
          message: 'Goroutine detected - ensure proper synchronization',
          line: node.location?.line || 0,
          severity: 'medium',
          category: 'performance'
        });
      }
      
      // Check for long lines (Go standard is 100 chars)
      if (content.length > 100) {
        issues.push({
          type: 'warning',
          message: 'Line exceeds 100 characters',
          line: node.location?.line || 0,
          severity: 'low',
          category: 'style'
        });
      }
    }
    
    return issues;
  }

  /**
   * Generate Go-specific suggestions
   */
  async generateSuggestions(ast: AST, issues: CodeIssue[]): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];
    
    // Suggest adding error handling
    const errorIssues = issues.filter(i => i.message.includes('error handling'));
    if (errorIssues.length > 0) {
      suggestions.push({
        id: `go-error-${Date.now()}`,
        title: `Add error handling to ${errorIssues.length} locations`,
        description: 'Proper error handling is crucial in Go applications',
        type: 'security',
        confidence: 0.9,
        impact: 'high',
        risk: 'low',
        autoFixAvailable: false
      });
    }
    
    // Suggest replacing fmt.Print with logging
    const printIssues = issues.filter(i => i.message.includes('fmt.Print'));
    if (printIssues.length > 0) {
      suggestions.push({
        id: `go-logging-${Date.now()}`,
        title: `Replace ${printIssues.length} fmt.Print statements with logging`,
        description: 'Use structured logging for better observability',
        type: 'style',
        confidence: 0.8,
        impact: 'medium',
        risk: 'low',
        autoFixAvailable: true
      });
    }
    
    // Suggest adding context to functions
    const functions = ast.nodes.filter(n => n.type === 'FuncDecl');
    const functionsWithoutContext = functions.filter(f => 
      !f.metadata?.signature?.includes('context.Context')
    );
    
    if (functionsWithoutContext.length > 2) {
      suggestions.push({
        id: `go-context-${Date.now()}`,
        title: `Consider adding context to ${functionsWithoutContext.length} functions`,
        description: 'Context enables cancellation and timeout handling',
        type: 'refactor',
        confidence: 0.7,
        impact: 'medium',
        risk: 'medium',
        autoFixAvailable: false
      });
    }
    
    // Suggest adding benchmarks if missing
    const hasBenchmarks = ast.nodes.some(n => 
      n.type === 'FuncDecl' && n.name?.startsWith('Benchmark')
    );
    
    if (!hasBenchmarks && functions.length > 3) {
      suggestions.push({
        id: `go-benchmark-${Date.now()}`,
        title: 'Consider adding benchmark tests',
        description: 'Benchmarks help track performance over time',
        type: 'optimize',
        confidence: 0.6,
        impact: 'low',
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
    return fileName.toLowerCase().endsWith('.go');
  }
}