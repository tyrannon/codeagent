/**
 * Feedback Loop for Self-Improvement
 * 
 * This module implements a continuous feedback loop where CodeAgent
 * analyzes its own performance and suggests improvements.
 */

import { analyzeCode, AnalysisResult } from './codeAnalyzer';
import { claudeReader, ClaudeInstruction } from './claudeReader';
import { queryAI } from '../llm/router';
import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ImprovementSuggestion {
  id: string;
  type: 'performance' | 'code-quality' | 'feature' | 'bug-fix' | 'documentation';
  title: string;
  description: string;
  files: string[];
  patch?: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  risk: 'high' | 'medium' | 'low';
  timestamp: Date;
}

interface FeedbackSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  analysisResults: AnalysisResult[];
  suggestions: ImprovementSuggestion[];
  appliedSuggestions: string[];
  metrics: {
    codeQuality: number;
    performance: number;
    userExperience: number;
  };
}

export class FeedbackLoop {
  private sessionsPath: string;
  private suggestionsPath: string;
  private currentSession: FeedbackSession | null = null;

  constructor() {
    this.sessionsPath = join(process.cwd(), '.codeagent-sessions.json');
    this.suggestionsPath = join(process.cwd(), '.codeagent-suggestions.json');
  }

  /**
   * Start a new feedback session
   */
  async startSession(): Promise<FeedbackSession> {
    const session: FeedbackSession = {
      id: Date.now().toString(),
      startTime: new Date(),
      analysisResults: [],
      suggestions: [],
      appliedSuggestions: [],
      metrics: {
        codeQuality: 0,
        performance: 0,
        userExperience: 0
      }
    };

    this.currentSession = session;
    await this.saveSession(session);
    
    // console.log('🔄 Started self-improvement feedback session:', session.id);
    return session;
  }

  /**
   * Analyze the codebase for improvement opportunities
   */
  async analyzeCodebase(): Promise<AnalysisResult[]> {
    if (!this.currentSession) {
      throw new Error('No active feedback session');
    }

    // console.log('🔍 Analyzing codebase for improvements...');
    
    // Analyze all TypeScript files
    const { stdout } = await execAsync('find . -name "*.ts" -not -path "./node_modules/*" -not -path "./dist/*"');
    const files = stdout.split('\n').filter(file => file.trim());
    
    const results: AnalysisResult[] = [];
    
    for (const file of files) {
      if (existsSync(file)) {
        try {
          const content = await readFile(file, 'utf-8');
          const analysis = await analyzeCode(content, file);
          results.push(analysis);
        } catch (error) {
          console.warn(`⚠️ Could not analyze ${file}:`, error);
        }
      }
    }

    this.currentSession.analysisResults = results;
    await this.saveSession(this.currentSession);
    
    return results;
  }

  /**
   * Generate improvement suggestions based on analysis
   */
  async generateSuggestions(): Promise<ImprovementSuggestion[]> {
    if (!this.currentSession || this.currentSession.analysisResults.length === 0) {
      throw new Error('No analysis results available');
    }

    // console.log('💡 Generating improvement suggestions...');
    
    const suggestions: ImprovementSuggestion[] = [];
    const claudeConfig = await claudeReader.getConfig();
    const improvements = await claudeReader.extractImprovements();

    // Analyze patterns and generate suggestions
    for (const result of this.currentSession.analysisResults) {
      // Check for code quality issues
      if (result.metrics.complexity > 10) {
        suggestions.push({
          id: `complexity-${Date.now()}-${Math.random()}`,
          type: 'code-quality',
          title: `Reduce complexity in ${result.fileName}`,
          description: `The cyclomatic complexity (${result.metrics.complexity}) is high. Consider breaking down complex functions.`,
          files: [result.fileName],
          confidence: 0.85,
          impact: 'medium',
          risk: 'low',
          timestamp: new Date()
        });
      }

      // Check for missing patterns
      const missingPatterns = this.detectMissingPatterns(result);
      for (const pattern of missingPatterns) {
        suggestions.push({
          id: `pattern-${Date.now()}-${Math.random()}`,
          type: 'code-quality',
          title: `Implement ${pattern} pattern in ${result.fileName}`,
          description: `Consider implementing the ${pattern} pattern to improve code organization.`,
          files: [result.fileName],
          confidence: 0.7,
          impact: 'medium',
          risk: 'medium',
          timestamp: new Date()
        });
      }
    }

    // Generate suggestions from claude.md improvements
    for (const improvement of improvements) {
      const suggestion = await this.generateSuggestionFromInstruction(improvement);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    // Add some quick wins based on analysis results
    const quickWins = this.generateQuickWins(this.currentSession.analysisResults);
    suggestions.push(...quickWins);

    // Use AI to generate additional suggestions
    const aiSuggestions = await this.generateAISuggestions();
    suggestions.push(...aiSuggestions);

    this.currentSession.suggestions = suggestions;
    await this.saveSession(this.currentSession);
    await this.saveSuggestions(suggestions);

    return suggestions;
  }

  /**
   * Apply an improvement suggestion
   */
  async applySuggestion(suggestionId: string, requireApproval = true): Promise<boolean> {
    if (!this.currentSession) {
      throw new Error('No active feedback session');
    }

    const suggestion = this.currentSession.suggestions.find(s => s.id === suggestionId);
    if (!suggestion) {
      throw new Error(`Suggestion ${suggestionId} not found`);
    }

    console.log(`🔧 Applying suggestion: ${suggestion.title}`);

    // High-risk suggestions always require approval
    if (suggestion.risk === 'high' || requireApproval) {
      console.log('⚠️ This suggestion requires approval before applying.');
      return false;
    }

    try {
      // Generate patch if not already available
      if (!suggestion.patch) {
        suggestion.patch = await this.generatePatch(suggestion);
      }

      // Apply the patch
      if (suggestion.patch) {
        await this.applyPatch(suggestion.patch, suggestion.files);
        this.currentSession.appliedSuggestions.push(suggestionId);
        await this.saveSession(this.currentSession);
        
        console.log('✅ Suggestion applied successfully!');
        return true;
      }
    } catch (error) {
      console.error('❌ Failed to apply suggestion:', error);
      return false;
    }

    return false;
  }

  /**
   * Calculate metrics for the current session
   */
  async calculateMetrics(): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active feedback session');
    }

    const results = this.currentSession.analysisResults;
    
    // Calculate average metrics
    let totalComplexity = 0;
    let totalMaintainability = 0;
    let fileCount = 0;

    for (const result of results) {
      totalComplexity += result.metrics.complexity;
      totalMaintainability += result.metrics.maintainability;
      fileCount++;
    }

    // Normalize metrics to 0-100 scale
    this.currentSession.metrics = {
      codeQuality: Math.min(100, Math.max(0, 100 - (totalComplexity / fileCount) * 5)),
      performance: 85, // Placeholder - would need actual performance testing
      userExperience: 90 // Placeholder - would need user feedback
    };

    await this.saveSession(this.currentSession);
  }

  /**
   * End the current feedback session
   */
  async endSession(): Promise<FeedbackSession> {
    if (!this.currentSession) {
      throw new Error('No active feedback session');
    }

    this.currentSession.endTime = new Date();
    await this.calculateMetrics();
    await this.saveSession(this.currentSession);

    const session = this.currentSession;
    this.currentSession = null;

    console.log('🏁 Feedback session ended:', session.id);
    console.log('📊 Metrics:', session.metrics);
    // console.log(`💡 Generated ${session.suggestions.length} suggestions`);
    console.log(`✅ Applied ${session.appliedSuggestions.length} improvements`);

    return session;
  }

  /**
   * Private helper methods
   */

  private detectMissingPatterns(analysis: AnalysisResult): string[] {
    const missingPatterns: string[] = [];
    const detectedPatterns = analysis.patterns.map(p => p.name);

    // Common patterns to check for
    const expectedPatterns = ['error-handling', 'type-safety', 'documentation'];
    
    for (const pattern of expectedPatterns) {
      if (!detectedPatterns.includes(pattern)) {
        missingPatterns.push(pattern);
      }
    }

    return missingPatterns;
  }

  private generateQuickWins(results: AnalysisResult[]): ImprovementSuggestion[] {
    const quickWins: ImprovementSuggestion[] = [];

    for (const result of results) {
      // Quick Win 1: Remove console.log statements
      const consoleIssues = result.issues.filter(issue => 
        issue.message.includes('console.log'));
      
      if (consoleIssues.length > 0) {
        quickWins.push({
          id: `console-${Date.now()}-${Math.random()}`,
          type: 'code-quality',
          title: `Remove ${consoleIssues.length} console.log statements in ${result.fileName}`,
          description: `Found ${consoleIssues.length} console.log statements that should be replaced with proper logging or removed.`,
          files: [result.fileName],
          confidence: 0.95,
          impact: 'low',
          risk: 'low',
          timestamp: new Date()
        });
      }

      // Quick Win 2: Fix long lines
      const longLineIssues = result.issues.filter(issue => 
        issue.message.includes('Line too long'));
      
      if (longLineIssues.length > 2) {
        quickWins.push({
          id: `lines-${Date.now()}-${Math.random()}`,
          type: 'code-quality',
          title: `Fix ${longLineIssues.length} long lines in ${result.fileName}`,
          description: `Found ${longLineIssues.length} lines longer than 120 characters that should be broken up for better readability.`,
          files: [result.fileName],
          confidence: 0.90,
          impact: 'low',
          risk: 'low',
          timestamp: new Date()
        });
      }

      // Quick Win 3: Replace any types
      const anyTypeIssues = result.issues.filter(issue => 
        issue.message.includes('any'));
      
      if (anyTypeIssues.length > 0) {
        quickWins.push({
          id: `types-${Date.now()}-${Math.random()}`,
          type: 'code-quality', 
          title: `Replace ${anyTypeIssues.length} 'any' types in ${result.fileName}`,
          description: `Found ${anyTypeIssues.length} uses of 'any' type that could be made more specific for better type safety.`,
          files: [result.fileName],
          confidence: 0.80,
          impact: 'medium',
          risk: 'low',
          timestamp: new Date()
        });
      }

      // Quick Win 4: Reduce complexity
      if (result.metrics.complexity > 15) {
        quickWins.push({
          id: `complexity-${Date.now()}-${Math.random()}`,
          type: 'performance',
          title: `Reduce complexity in ${result.fileName} (currently ${result.metrics.complexity})`,
          description: `This file has high cyclomatic complexity (${result.metrics.complexity}). Consider breaking down large functions.`,
          files: [result.fileName],
          confidence: 0.75,
          impact: 'high',
          risk: 'medium',
          timestamp: new Date()
        });
      }
    }

    return quickWins;
  }

  private async generateSuggestionFromInstruction(instruction: string): Promise<ImprovementSuggestion | null> {
    try {
      const prompt = `
Based on this instruction: "${instruction}"
Generate a concrete improvement suggestion for a TypeScript CLI tool.
Include: type, title, description, potential files affected, confidence (0-1), impact (high/medium/low), and risk (high/medium/low).
Format as JSON.
`;

      const response = await queryAI(prompt);
      const suggestion = JSON.parse(response);
      
      return {
        id: `instruction-${Date.now()}-${Math.random()}`,
        ...suggestion,
        timestamp: new Date()
      };
    } catch (error) {
      console.warn('Could not generate suggestion from instruction:', error);
      return null;
    }
  }

  private async generateAISuggestions(): Promise<ImprovementSuggestion[]> {
    try {
      const prompt = `
Analyze the CodeAgent CLI tool architecture and suggest 3 specific improvements.
Focus on: performance optimization, code quality, user experience, or new features.
Consider the tool's purpose: a Claude Code-style terminal assistant.
Format each suggestion as JSON with: type, title, description, files, confidence, impact, risk.
`;

      const response = await queryAI(prompt);
      const suggestions = JSON.parse(response);
      
      return suggestions.map((s: any) => ({
        id: `ai-${Date.now()}-${Math.random()}`,
        ...s,
        timestamp: new Date()
      }));
    } catch (error) {
      console.warn('Could not generate AI suggestions:', error);
      return [];
    }
  }

  private async generatePatch(suggestion: ImprovementSuggestion): Promise<string> {
    // For console.log removal, generate a simple patch
    if (suggestion.title.includes('console.log')) {
      return this.generateConsoleLogPatch(suggestion);
    }

    // For other types, use AI
    const prompt = `
Generate a Git-compatible patch for this improvement:
Title: ${suggestion.title}
Description: ${suggestion.description}
Files: ${suggestion.files.join(', ')}
Type: ${suggestion.type}

Generate minimal, safe changes that implement this improvement.
Format as a unified diff patch.
`;

    const patch = await queryAI(prompt);
    return patch;
  }

  private generateConsoleLogPatch(suggestion: ImprovementSuggestion): string {
    // Simple patch to comment out console.log statements
    return `--- a/${suggestion.files[0]}
+++ b/${suggestion.files[0]}
@@ -75,1 +75,1 @@
-    // console.log('🔄 Started self-improvement feedback session:', session.id);
+    // // console.log('🔄 Started self-improvement feedback session:', session.id);
@@ -87,1 +87,1 @@
-    // console.log('🔍 Analyzing codebase for improvements...');
+    // // console.log('🔍 Analyzing codebase for improvements...');`;
  }

  private async applyPatch(patch: string, files: string[]): Promise<void> {
    // For console.log fixes, apply directly
    if (patch.includes('console.log')) {
      await this.applyConsoleLogFixes(files[0]);
      return;
    }

    // For other patches, use git apply
    const patchPath = join(process.cwd(), '.tmp-patch.diff');
    await writeFile(patchPath, patch);

    try {
      // Apply patch using git apply
      await execAsync(`git apply --check ${patchPath}`);
      await execAsync(`git apply ${patchPath}`);
    } finally {
      // Clean up
      if (existsSync(patchPath)) {
        await execAsync(`rm ${patchPath}`);
      }
    }
  }

  private async applyConsoleLogFixes(filePath: string): Promise<void> {
    if (!existsSync(filePath)) {
      throw new Error(`File ${filePath} not found`);
    }

    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Comment out console.log statements but keep the useful ones
    const modifiedLines = lines.map(line => {
      // Only comment out debug-style console.log statements
      if (line.includes('console.log') && 
          (line.includes('🔄') || line.includes('🔍') || line.includes('💡'))) {
        return line.replace(/(\s*)console\.log/, '$1// console.log');
      }
      return line;
    });

    await writeFile(filePath, modifiedLines.join('\n'));
    console.log(`✅ Applied console.log fixes to ${filePath}`);
  }

  private async saveSession(session: FeedbackSession): Promise<void> {
    const sessions = await this.loadSessions();
    const index = sessions.findIndex(s => s.id === session.id);
    
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.push(session);
    }

    await writeFile(this.sessionsPath, JSON.stringify(sessions, null, 2));
  }

  private async loadSessions(): Promise<FeedbackSession[]> {
    if (!existsSync(this.sessionsPath)) {
      return [];
    }

    const content = await readFile(this.sessionsPath, 'utf-8');
    return JSON.parse(content);
  }

  private async saveSuggestions(suggestions: ImprovementSuggestion[]): Promise<void> {
    await writeFile(this.suggestionsPath, JSON.stringify(suggestions, null, 2));
  }
}

// Export singleton instance
export const feedbackLoop = new FeedbackLoop();