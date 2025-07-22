/**
 * Rust Language Plugin
 * 
 * Advanced analysis plugin for Rust files
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

export class RustPlugin implements LanguagePlugin {
  name = 'Rust Analyzer';
  language = 'rust';
  version = '1.0.0';

  /**
   * Parse Rust code into AST
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
      type: 'Crate',
      nodes,
      language: this.language
    };
  }

  /**
   * Parse a single line into AST node
   */
  private parseLine(line: string, lineNumber: number): ASTNode {
    const trimmed = line.trim();
    
    // Function definitions
    if (trimmed.match(/^(pub\s+)?fn\s+\w+/)) {
      const match = trimmed.match(/fn\s+(\w+)/);
      return {
        type: 'FnDecl',
        name: match?.[1] || 'anonymous',
        location: { line: lineNumber, column: 0 },
        metadata: { 
          public: trimmed.startsWith('pub'),
          async: trimmed.includes('async'),
          unsafe: trimmed.includes('unsafe'),
          signature: trimmed
        }
      };
    }
    
    // Struct definitions
    if (trimmed.match(/^(pub\s+)?struct\s+\w+/)) {
      const match = trimmed.match(/struct\s+(\w+)/);
      return {
        type: 'StructDecl',
        name: match?.[1] || 'anonymous',
        location: { line: lineNumber, column: 0 },
        metadata: { 
          public: trimmed.startsWith('pub'),
          generic: trimmed.includes('<')
        }
      };
    }
    
    // Enum definitions
    if (trimmed.match(/^(pub\s+)?enum\s+\w+/)) {
      const match = trimmed.match(/enum\s+(\w+)/);
      return {
        type: 'EnumDecl',
        name: match?.[1] || 'anonymous',
        location: { line: lineNumber, column: 0 },
        metadata: { 
          public: trimmed.startsWith('pub'),
          generic: trimmed.includes('<')
        }
      };
    }
    
    // Trait definitions
    if (trimmed.match(/^(pub\s+)?trait\s+\w+/)) {
      const match = trimmed.match(/trait\s+(\w+)/);
      return {
        type: 'TraitDecl',
        name: match?.[1] || 'anonymous',
        location: { line: lineNumber, column: 0 },
        metadata: { 
          public: trimmed.startsWith('pub'),
          generic: trimmed.includes('<')
        }
      };
    }
    
    // Implementation blocks
    if (trimmed.match(/^impl\s+/)) {
      const match = trimmed.match(/impl(?:\s+<[^>]+>)?\s+(\w+)/);
      return {
        type: 'ImplDecl',
        name: match?.[1] || 'unknown',
        location: { line: lineNumber, column: 0 },
        metadata: { 
          generic: trimmed.includes('<'),
          trait_impl: trimmed.includes(' for ')
        }
      };
    }
    
    // Use statements
    if (trimmed.startsWith('use ')) {
      return {
        type: 'UseDecl',
        location: { line: lineNumber, column: 0 },
        metadata: { statement: trimmed }
      };
    }
    
    // Mod declarations
    if (trimmed.match(/^(pub\s+)?mod\s+\w+/)) {
      const match = trimmed.match(/mod\s+(\w+)/);
      return {
        type: 'ModDecl',
        name: match?.[1] || 'anonymous',
        location: { line: lineNumber, column: 0 },
        metadata: { 
          public: trimmed.startsWith('pub')
        }
      };
    }
    
    // Let bindings
    if (trimmed.match(/^let\s+(mut\s+)?\w+/)) {
      const match = trimmed.match(/let\s+(?:mut\s+)?(\w+)/);
      return {
        type: 'LetDecl',
        name: match?.[1] || 'unknown',
        location: { line: lineNumber, column: 0 },
        metadata: { 
          mutable: trimmed.includes('mut'),
          typed: trimmed.includes(':')
        }
      };
    }
    
    // Macro invocations
    if (trimmed.includes('!') && trimmed.match(/\w+!/)) {
      const match = trimmed.match(/(\w+)!/);
      return {
        type: 'MacroCall',
        name: match?.[1] || 'unknown',
        location: { line: lineNumber, column: 0 },
        metadata: { macro_name: match?.[1] }
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
   * Detect Rust-specific patterns
   */
  async detectPatterns(ast: AST): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];
    
    // Detect Builder pattern
    const builderPattern = this.detectBuilderPattern(ast);
    if (builderPattern) {
      patterns.push(builderPattern);
    }
    
    // Detect RAII pattern
    const raiiPattern = this.detectRAIIPattern(ast);
    if (raiiPattern) {
      patterns.push(raiiPattern);
    }
    
    // Detect Trait pattern
    const traitPattern = this.detectTraitPattern(ast);
    if (traitPattern) {
      patterns.push(traitPattern);
    }
    
    // Detect Newtype pattern
    const newtypePattern = this.detectNewtypePattern(ast);
    if (newtypePattern) {
      patterns.push(newtypePattern);
    }
    
    // Detect State Machine pattern
    const stateMachinePattern = this.detectStateMachinePattern(ast);
    if (stateMachinePattern) {
      patterns.push(stateMachinePattern);
    }
    
    return patterns;
  }

  private detectBuilderPattern(ast: AST): DetectedPattern | null {
    const structs = ast.nodes.filter(n => n.type === 'StructDecl');
    const impls = ast.nodes.filter(n => n.type === 'ImplDecl');
    
    for (const struct of structs) {
      // Look for builder methods (returning Self)
      const builderImpl = impls.find(impl => impl.name === struct.name);
      if (builderImpl && struct.name?.toLowerCase().includes('builder')) {
        return {
          type: 'Builder',
          name: struct.name,
          confidence: 0.9,
          location: {
            startLine: struct.location?.line || 0,
            endLine: struct.location?.line || 0
          },
          description: `${struct.name} implements the Builder pattern`
        };
      }
    }
    
    return null;
  }

  private detectRAIIPattern(ast: AST): DetectedPattern | null {
    const hasDrop = ast.nodes.some(n => 
      n.metadata?.content?.includes('impl Drop for') ||
      n.metadata?.content?.includes('fn drop(')
    );
    
    if (hasDrop) {
      return {
        type: 'RAII',
        name: 'Resource Management',
        confidence: 0.95,
        location: { startLine: 1, endLine: 1 },
        description: 'File implements RAII pattern through Drop trait'
      };
    }
    
    return null;
  }

  private detectTraitPattern(ast: AST): DetectedPattern | null {
    const traits = ast.nodes.filter(n => n.type === 'TraitDecl');
    const traitImpls = ast.nodes.filter(n => 
      n.type === 'ImplDecl' && n.metadata?.trait_impl
    );
    
    if (traits.length > 0 || traitImpls.length > 0) {
      return {
        type: 'Trait',
        name: 'Rust Traits',
        confidence: 1.0,
        location: { startLine: 1, endLine: 1 },
        description: `File uses ${traits.length} trait(s) and ${traitImpls.length} implementations`
      };
    }
    
    return null;
  }

  private detectNewtypePattern(ast: AST): DetectedPattern | null {
    const structs = ast.nodes.filter(n => n.type === 'StructDecl');
    
    // Look for single-field tuple structs
    for (const struct of structs) {
      const line = struct.metadata?.content || '';
      if (line.includes('(') && !line.includes(',') && line.includes(')')) {
        return {
          type: 'Newtype',
          name: struct.name || 'Newtype',
          confidence: 0.8,
          location: {
            startLine: struct.location?.line || 0,
            endLine: struct.location?.line || 0
          },
          description: `${struct.name} implements the Newtype pattern`
        };
      }
    }
    
    return null;
  }

  private detectStateMachinePattern(ast: AST): DetectedPattern | null {
    const enums = ast.nodes.filter(n => n.type === 'EnumDecl');
    const hasMatch = ast.nodes.some(n => 
      n.metadata?.content?.includes('match ') ||
      n.metadata?.content?.includes('match(')
    );
    
    if (enums.length > 0 && hasMatch) {
      return {
        type: 'State Machine',
        name: 'Rust State Machine',
        confidence: 0.7,
        location: { startLine: 1, endLine: 1 },
        description: 'File appears to implement a state machine using enums and match'
      };
    }
    
    return null;
  }

  /**
   * Calculate Rust-specific metrics
   */
  async calculateMetrics(ast: AST): Promise<LanguageMetrics> {
    const functions = ast.nodes.filter(n => n.type === 'FnDecl').length;
    const structs = ast.nodes.filter(n => n.type === 'StructDecl').length;
    const enums = ast.nodes.filter(n => n.type === 'EnumDecl').length;
    const traits = ast.nodes.filter(n => n.type === 'TraitDecl').length;
    const impls = ast.nodes.filter(n => n.type === 'ImplDecl').length;
    const unsafeFunctions = ast.nodes.filter(n => 
      n.type === 'FnDecl' && n.metadata?.unsafe
    ).length;
    const totalNodes = ast.nodes.length;
    
    // Calculate complexity
    const complexity = Math.min(10, Math.max(1, 
      (functions * 1.5 + structs * 2 + enums * 1.5 + traits * 2 + impls * 1 + totalNodes * 0.04)
    ));
    
    // Calculate maintainability (Rust's type system helps)
    const maintainability = Math.max(0, 95 - (complexity * 5) - (unsafeFunctions * 10));
    
    // Calculate testability (Rust has great testing)
    const testability = Math.max(0, 95 - (complexity * 2) - (unsafeFunctions * 5));
    
    // Performance estimation (Rust is high performance)
    const performance = Math.max(0, 98 - (unsafeFunctions * -2) - (complexity * 1));
    
    // Security estimation (Rust is memory safe)
    const security = Math.max(0, 95 - (unsafeFunctions * 15));
    
    return {
      complexity,
      maintainability,
      testability,
      performance,
      security
    };
  }

  /**
   * Detect Rust-specific issues
   */
  private detectIssues(ast: AST): CodeIssue[] {
    const issues: CodeIssue[] = [];
    
    for (const node of ast.nodes) {
      const content = node.metadata?.content || '';
      
      // Check for unwrap() usage
      if (content.includes('.unwrap()')) {
        issues.push({
          type: 'warning',
          message: 'Consider using expect() with a message or proper error handling instead of unwrap()',
          line: node.location?.line || 0,
          severity: 'medium',
          category: 'maintainability'
        });
      }
      
      // Check for expect() without good messages
      if (content.includes('.expect("")') || content.includes('.expect(\'\')')) {
        issues.push({
          type: 'warning',
          message: 'expect() should have a descriptive error message',
          line: node.location?.line || 0,
          severity: 'low',
          category: 'maintainability'
        });
      }
      
      // Check for unsafe blocks
      if (content.includes('unsafe {') || content.includes('unsafe fn')) {
        issues.push({
          type: 'info',
          message: 'Unsafe code detected - ensure safety invariants are maintained',
          line: node.location?.line || 0,
          severity: 'high',
          category: 'security'
        });
      }
      
      // Check for todo!() macros
      if (content.includes('todo!()') || content.includes('todo!(')) {
        issues.push({
          type: 'info',
          message: 'TODO macro found - implementation needed',
          line: node.location?.line || 0,
          severity: 'medium',
          category: 'maintainability'
        });
      }
      
      // Check for println! in non-main functions
      if (content.includes('println!') && node.type !== 'FnDecl') {
        issues.push({
          type: 'info',
          message: 'Consider using proper logging instead of println!',
          line: node.location?.line || 0,
          severity: 'low',
          category: 'style'
        });
      }
      
      // Check for long lines
      if (content.length > 100) {
        issues.push({
          type: 'warning',
          message: 'Line exceeds 100 characters',
          line: node.location?.line || 0,
          severity: 'low',
          category: 'style'
        });
      }
      
      // Check for missing documentation on public items
      if ((node.type === 'FnDecl' || node.type === 'StructDecl' || node.type === 'TraitDecl') &&
          node.metadata?.public && !content.includes('///')) {
        issues.push({
          type: 'info',
          message: 'Public item missing documentation',
          line: node.location?.line || 0,
          severity: 'low',
          category: 'maintainability'
        });
      }
    }
    
    return issues;
  }

  /**
   * Generate Rust-specific suggestions
   */
  async generateSuggestions(ast: AST, issues: CodeIssue[]): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];
    
    // Suggest replacing unwrap with better error handling
    const unwrapIssues = issues.filter(i => i.message.includes('unwrap'));
    if (unwrapIssues.length > 0) {
      suggestions.push({
        id: `rust-unwrap-${Date.now()}`,
        title: `Replace ${unwrapIssues.length} unwrap() calls with better error handling`,
        description: 'Use expect() with descriptive messages or proper Result handling',
        type: 'refactor',
        confidence: 0.9,
        impact: 'high',
        risk: 'low',
        autoFixAvailable: false
      });
    }
    
    // Suggest adding documentation
    const docIssues = issues.filter(i => i.message.includes('missing documentation'));
    if (docIssues.length > 0) {
      suggestions.push({
        id: `rust-docs-${Date.now()}`,
        title: `Add documentation to ${docIssues.length} public items`,
        description: 'Documentation helps users understand your API',
        type: 'style',
        confidence: 0.8,
        impact: 'medium',
        risk: 'low',
        autoFixAvailable: false
      });
    }
    
    // Suggest using logging instead of println!
    const printIssues = issues.filter(i => i.message.includes('println!'));
    if (printIssues.length > 0) {
      suggestions.push({
        id: `rust-logging-${Date.now()}`,
        title: `Replace ${printIssues.length} println! with proper logging`,
        description: 'Use log crate for better control over output',
        type: 'refactor',
        confidence: 0.7,
        impact: 'medium',
        risk: 'low',
        autoFixAvailable: true
      });
    }
    
    // Suggest implementing common traits
    const structs = ast.nodes.filter(n => n.type === 'StructDecl');
    const hasDebug = ast.nodes.some(n => 
      n.metadata?.content?.includes('#[derive(Debug)]')
    );
    
    if (structs.length > 0 && !hasDebug) {
      suggestions.push({
        id: `rust-derive-${Date.now()}`,
        title: 'Consider deriving common traits (Debug, Clone, etc.)',
        description: 'Common derives improve ergonomics and debugging',
        type: 'refactor',
        confidence: 0.6,
        impact: 'medium',
        risk: 'low',
        autoFixAvailable: true
      });
    }
    
    // Suggest using const generics if many similar implementations
    const impls = ast.nodes.filter(n => n.type === 'ImplDecl');
    if (impls.length > 3) {
      suggestions.push({
        id: `rust-generics-${Date.now()}`,
        title: 'Consider using generics to reduce code duplication',
        description: 'Generic implementations can reduce maintenance burden',
        type: 'refactor',
        confidence: 0.5,
        impact: 'medium',
        risk: 'medium',
        autoFixAvailable: false
      });
    }
    
    return suggestions;
  }

  /**
   * Check if plugin supports the given file
   */
  supports(fileName: string): boolean {
    return fileName.toLowerCase().endsWith('.rs');
  }
}