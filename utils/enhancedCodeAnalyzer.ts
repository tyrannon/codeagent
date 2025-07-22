/**
 * Enhanced Code Analyzer
 * 
 * Multi-language code analysis using the plugin architecture
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { languageDetector, LanguageDetector, AnalysisResult } from './languageDetector';
import { TypeScriptPlugin } from '../plugins/typescriptPlugin';

const execAsync = promisify(exec);

export interface ProjectAnalysis {
  projectPath: string;
  totalFiles: number;
  languageStats: Map<string, number>;
  analysisResults: AnalysisResult[];
  overallMetrics: OverallMetrics;
  recommendations: ProjectRecommendation[];
  technicalDebt: TechnicalDebtReport;
}

export interface OverallMetrics {
  averageComplexity: number;
  averageMaintainability: number;
  testCoverage: number;
  securityScore: number;
  codeQualityScore: number;
  performanceScore: number;
}

export interface ProjectRecommendation {
  id: string;
  type: 'architecture' | 'performance' | 'security' | 'maintainability';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedFiles: string[];
  estimatedEffort: 'small' | 'medium' | 'large';
  expectedImpact: string;
}

export interface TechnicalDebtReport {
  totalDebt: number; // in hours
  categories: {
    complexity: number;
    duplication: number;
    testCoverage: number;
    documentation: number;
    security: number;
  };
  highPriorityItems: string[];
}

export class EnhancedCodeAnalyzer {
  private detector: LanguageDetector;

  constructor() {
    this.detector = languageDetector;
    this.initializePlugins();
  }

  /**
   * Initialize all language plugins
   */
  private initializePlugins(): void {
    // Register TypeScript plugin
    this.detector.registerPlugin(new TypeScriptPlugin());
    
    // Register other language plugins
    const { PythonPlugin } = require('../plugins/pythonPlugin');
    const { GoPlugin } = require('../plugins/goPlugin');
    const { RustPlugin } = require('../plugins/rustPlugin');
    
    this.detector.registerPlugin(new PythonPlugin());
    this.detector.registerPlugin(new GoPlugin());
    this.detector.registerPlugin(new RustPlugin());
    
    console.log('🔧 Enhanced Code Analyzer initialized with 4 language plugins');
  }

  /**
   * Analyze an entire project
   */
  async analyzeProject(projectPath: string = process.cwd()): Promise<ProjectAnalysis> {
    console.log(`🔍 Starting enhanced analysis of ${projectPath}`);
    
    // Get all code files
    const files = await this.getProjectFiles(projectPath);
    console.log(`📂 Found ${files.length} code files`);
    
    // Get language statistics
    const languageStats = await this.detector.getCodebaseStatistics(files);
    console.log('📊 Language distribution:', Object.fromEntries(languageStats));
    
    // Analyze each file
    const analysisResults: AnalysisResult[] = [];
    
    for (const file of files) {
      try {
        const result = await this.detector.analyzeFile(file);
        if (result) {
          analysisResults.push(result);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to analyze ${file}:`, error);
      }
    }
    
    console.log(`✅ Successfully analyzed ${analysisResults.length} files`);
    
    // Calculate overall metrics
    const overallMetrics = this.calculateOverallMetrics(analysisResults);
    
    // Generate recommendations
    const recommendations = this.generateProjectRecommendations(analysisResults, languageStats);
    
    // Calculate technical debt
    const technicalDebt = this.calculateTechnicalDebt(analysisResults);
    
    return {
      projectPath,
      totalFiles: files.length,
      languageStats,
      analysisResults,
      overallMetrics,
      recommendations,
      technicalDebt
    };
  }

  /**
   * Get all code files in the project
   */
  private async getProjectFiles(projectPath: string): Promise<string[]> {
    const extensions = [
      '.ts', '.tsx', '.js', '.jsx',  // TypeScript/JavaScript
      '.py', '.pyx',                 // Python
      '.rs',                         // Rust
      '.go',                         // Go
      '.java',                       // Java
      '.cs',                         // C#
      '.cpp', '.cc', '.cxx', '.hpp', '.h', // C++
    ];
    
    try {
      const { stdout } = await execAsync(
        `find "${projectPath}" -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.pyx" -o -name "*.rs" -o -name "*.go" -o -name "*.java" -o -name "*.cs" -o -name "*.cpp" -o -name "*.cc" -o -name "*.cxx" -o -name "*.hpp" -o -name "*.h" | grep -v node_modules | grep -v dist | grep -v .git | grep -v target | grep -v build`
      );
      
      return stdout.split('\n').filter(file => file.trim() && existsSync(file));
    } catch (error) {
      console.error('Error finding project files:', error);
      return [];
    }
  }

  /**
   * Calculate overall project metrics
   */
  private calculateOverallMetrics(results: AnalysisResult[]): OverallMetrics {
    if (results.length === 0) {
      return {
        averageComplexity: 0,
        averageMaintainability: 0,
        testCoverage: 0,
        securityScore: 0,
        codeQualityScore: 0,
        performanceScore: 0
      };
    }
    
    const totals = results.reduce((acc, result) => ({
      complexity: acc.complexity + result.metrics.complexity,
      maintainability: acc.maintainability + result.metrics.maintainability,
      testability: acc.testability + result.metrics.testability,
      performance: acc.performance + result.metrics.performance,
      security: acc.security + result.metrics.security
    }), { complexity: 0, maintainability: 0, testability: 0, performance: 0, security: 0 });
    
    const count = results.length;
    
    // Calculate code quality score based on multiple factors
    const avgComplexity = totals.complexity / count;
    const avgMaintainability = totals.maintainability / count;
    const avgSecurity = totals.security / count;
    
    const codeQualityScore = Math.max(0, Math.min(100, 
      (avgMaintainability * 0.4) + 
      (avgSecurity * 0.3) + 
      ((10 - Math.min(10, avgComplexity)) * 10 * 0.3)
    ));
    
    return {
      averageComplexity: avgComplexity,
      averageMaintainability: avgMaintainability,
      testCoverage: totals.testability / count,
      securityScore: avgSecurity,
      codeQualityScore,
      performanceScore: totals.performance / count
    };
  }

  /**
   * Generate project-level recommendations
   */
  private generateProjectRecommendations(results: AnalysisResult[], languageStats: Map<string, number>): ProjectRecommendation[] {
    const recommendations: ProjectRecommendation[] = [];
    
    // High complexity files
    const complexFiles = results.filter(r => r.metrics.complexity > 8);
    if (complexFiles.length > 0) {
      recommendations.push({
        id: 'high-complexity-files',
        type: 'maintainability',
        priority: 'high',
        title: `Reduce complexity in ${complexFiles.length} files`,
        description: 'High complexity makes code harder to understand and maintain',
        affectedFiles: complexFiles.map(f => f.fileName),
        estimatedEffort: complexFiles.length > 10 ? 'large' : 'medium',
        expectedImpact: 'Improved code readability and reduced bug risk'
      });
    }
    
    // Security issues
    const securityIssues = results.flatMap(r => 
      r.issues.filter(i => i.category === 'security')
    );
    if (securityIssues.length > 0) {
      recommendations.push({
        id: 'security-improvements',
        type: 'security',
        priority: 'high',
        title: `Address ${securityIssues.length} security issues`,
        description: 'Security vulnerabilities pose risk to application safety',
        affectedFiles: [...new Set(securityIssues.map(i => results.find(r => r.issues.includes(i))?.fileName).filter(Boolean))],
        estimatedEffort: 'medium',
        expectedImpact: 'Reduced security vulnerabilities and improved safety'
      });
    }
    
    // Performance opportunities
    const performanceFiles = results.filter(r => r.metrics.performance < 70);
    if (performanceFiles.length > 0) {
      recommendations.push({
        id: 'performance-optimization',
        type: 'performance',
        priority: 'medium',
        title: `Optimize performance in ${performanceFiles.length} files`,
        description: 'Performance optimizations can improve user experience',
        affectedFiles: performanceFiles.map(f => f.fileName),
        estimatedEffort: 'medium',
        expectedImpact: 'Faster execution and better user experience'
      });
    }
    
    // Documentation improvements
    const poorlyDocumented = results.filter(r => r.issues.some(i => i.category === 'maintainability'));
    if (poorlyDocumented.length > results.length * 0.3) {
      recommendations.push({
        id: 'documentation-improvement',
        type: 'maintainability',
        priority: 'low',
        title: 'Improve code documentation',
        description: 'Better documentation helps with code understanding and maintenance',
        affectedFiles: poorlyDocumented.map(f => f.fileName),
        estimatedEffort: 'large',
        expectedImpact: 'Improved code maintainability and team productivity'
      });
    }
    
    return recommendations;
  }

  /**
   * Calculate technical debt report
   */
  private calculateTechnicalDebt(results: AnalysisResult[]): TechnicalDebtReport {
    let totalDebt = 0;
    const categories = {
      complexity: 0,
      duplication: 0,
      testCoverage: 0,
      documentation: 0,
      security: 0
    };
    
    const highPriorityItems: string[] = [];
    
    for (const result of results) {
      // Complexity debt (high complexity = more debt)
      if (result.metrics.complexity > 8) {
        const complexityDebt = (result.metrics.complexity - 8) * 2; // 2 hours per complexity point
        categories.complexity += complexityDebt;
        totalDebt += complexityDebt;
        
        if (result.metrics.complexity > 12) {
          highPriorityItems.push(`High complexity in ${result.fileName} (${result.metrics.complexity})`);
        }
      }
      
      // Security debt
      const securityIssues = result.issues.filter(i => i.category === 'security');
      if (securityIssues.length > 0) {
        const securityDebt = securityIssues.length * 4; // 4 hours per security issue
        categories.security += securityDebt;
        totalDebt += securityDebt;
        
        highPriorityItems.push(`${securityIssues.length} security issues in ${result.fileName}`);
      }
      
      // Test coverage debt (low testability = debt)
      if (result.metrics.testability < 60) {
        const testDebt = (60 - result.metrics.testability) * 0.5;
        categories.testCoverage += testDebt;
        totalDebt += testDebt;
      }
      
      // Documentation debt
      const maintainabilityIssues = result.issues.filter(i => i.category === 'maintainability');
      if (maintainabilityIssues.length > 0) {
        const docDebt = maintainabilityIssues.length * 1; // 1 hour per issue
        categories.documentation += docDebt;
        totalDebt += docDebt;
      }
    }
    
    return {
      totalDebt: Math.round(totalDebt),
      categories,
      highPriorityItems
    };
  }

  /**
   * Generate a comprehensive report
   */
  generateReport(analysis: ProjectAnalysis): string {
    const { overallMetrics, recommendations, technicalDebt } = analysis;
    
    let report = `
# 📊 Enhanced Code Analysis Report

## 🎯 Project Overview
- **Total Files Analyzed**: ${analysis.analysisResults.length}/${analysis.totalFiles}
- **Languages**: ${Array.from(analysis.languageStats.keys()).join(', ')}
- **Overall Quality Score**: ${Math.round(overallMetrics.codeQualityScore)}/100

## 📈 Key Metrics
- **Average Complexity**: ${overallMetrics.averageComplexity.toFixed(1)}
- **Maintainability**: ${Math.round(overallMetrics.averageMaintainability)}/100
- **Security Score**: ${Math.round(overallMetrics.securityScore)}/100
- **Performance Score**: ${Math.round(overallMetrics.performanceScore)}/100

## 🔧 Technical Debt
- **Total Debt**: ${technicalDebt.totalDebt} hours
- **Complexity Debt**: ${Math.round(technicalDebt.categories.complexity)} hours
- **Security Debt**: ${Math.round(technicalDebt.categories.security)} hours
- **Test Coverage Debt**: ${Math.round(technicalDebt.categories.testCoverage)} hours

## 🎯 Top Recommendations
`;
    
    recommendations.slice(0, 5).forEach((rec, index) => {
      const priorityEmoji = rec.priority === 'high' ? '🔥' : rec.priority === 'medium' ? '⚡' : '💡';
      report += `${index + 1}. ${priorityEmoji} **${rec.title}**
   - Impact: ${rec.expectedImpact}
   - Effort: ${rec.estimatedEffort}
   - Files: ${rec.affectedFiles.length}

`;
    });
    
    if (technicalDebt.highPriorityItems.length > 0) {
      report += `## ⚠️ High Priority Issues
`;
      technicalDebt.highPriorityItems.forEach(item => {
        report += `- ${item}\n`;
      });
    }
    
    return report;
  }
}

// Export singleton
export const enhancedCodeAnalyzer = new EnhancedCodeAnalyzer();