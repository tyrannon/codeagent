/**
 * Claude.md Reader and Interpreter
 * 
 * This module reads and interprets the claude.md file to dynamically
 * adjust CodeAgent's behavior based on documented instructions.
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

interface ClaudeInstruction {
  type: 'command' | 'behavior' | 'pattern' | 'rule';
  context: string;
  instruction: string;
  priority: 'high' | 'medium' | 'low';
  metadata?: Record<string, any>;
}

interface ClaudeConfig {
  projectOverview: string;
  features: string[];
  usage: Record<string, string>;
  commands: Record<string, CommandConfig>;
  architecture: ArchitectureConfig;
  instructions: ClaudeInstruction[];
  prompting: PromptingConfig;
  selfImprovement?: SelfImprovementConfig;
}

interface CommandConfig {
  purpose: string;
  input: string;
  output: string;
  aiUsage: string;
}

interface ArchitectureConfig {
  coreComponents: string[];
  conversationalFeatures: string[];
  integrationPipeline: string[];
}

interface PromptingConfig {
  templates: Record<string, string>;
  workflows: Record<string, string[]>;
}

interface SelfImprovementConfig {
  enabled: boolean;
  analysisInterval: number; // in hours
  autoApplyPatches: boolean;
  requiresApproval: boolean;
  improvementAreas: string[];
}

export class ClaudeReader {
  private claudeMdPath: string;
  private config: ClaudeConfig | null = null;
  private lastReadTime: Date | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(claudeMdPath?: string) {
    this.claudeMdPath = claudeMdPath || join(process.cwd(), 'CLAUDE.md');
  }

  /**
   * Read and parse the claude.md file
   */
  async readClaudeMd(): Promise<string> {
    if (!existsSync(this.claudeMdPath)) {
      throw new Error(`claude.md not found at ${this.claudeMdPath}`);
    }

    const content = await readFile(this.claudeMdPath, 'utf-8');
    return content;
  }

  /**
   * Parse markdown content into structured configuration
   */
  parseMarkdown(content: string): ClaudeConfig {
    const config: ClaudeConfig = {
      projectOverview: '',
      features: [],
      usage: {},
      commands: {},
      architecture: {
        coreComponents: [],
        conversationalFeatures: [],
        integrationPipeline: []
      },
      instructions: [],
      prompting: {
        templates: {},
        workflows: {}
      }
    };

    const lines = content.split('\n');
    let currentSection = '';
    let currentCommand = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect headings
      if (line.startsWith('#')) {
        const headingLevel = line.match(/^#+/)?.[0].length || 0;
        const headingText = line.replace(/^#+\s*/, '').toLowerCase();
        
        if (headingLevel <= 2) {
          currentSection = headingText;
          currentCommand = '';
        }
        
        // Handle command subsections (#### level)
        if (headingLevel === 4 && currentSection.includes('commands')) {
          currentCommand = headingText.replace(/`/g, '').toLowerCase();
          config.commands[currentCommand] = {
            purpose: '',
            input: '',
            output: '',
            aiUsage: ''
          };
        }
      }

      // Extract project overview
      if (currentSection.includes('project overview') && line.trim() && !line.startsWith('#')) {
        config.projectOverview += line.trim() + ' ';
      }

      // Extract features
      if (currentSection.includes('features') && line.trim().startsWith('-')) {
        config.features.push(line.replace(/^-\s*/, '').trim());
      }

      // Extract command details
      if (currentCommand && config.commands[currentCommand]) {
        if (line.includes('Purpose:')) {
          config.commands[currentCommand].purpose = line.split('Purpose:')[1]?.trim() || '';
        } else if (line.includes('Input:')) {
          config.commands[currentCommand].input = line.split('Input:')[1]?.trim() || '';
        } else if (line.includes('Output:')) {
          config.commands[currentCommand].output = line.split('Output:')[1]?.trim() || '';
        } else if (line.includes('AI Usage:')) {
          config.commands[currentCommand].aiUsage = line.split('AI Usage:')[1]?.trim() || '';
        }
      }

      // Extract instructions for self-improvement
      if (line.includes('IMPORTANT:') || line.includes('ALWAYS:') || line.includes('NEVER:')) {
        config.instructions.push({
          type: 'rule',
          context: currentSection,
          instruction: line.trim(),
          priority: line.includes('IMPORTANT:') ? 'high' : 'medium'
        });
      }

      // Extract code blocks for usage examples
      if (line.startsWith('```') && currentSection.includes('usage')) {
        // Skip code block parsing for now - would need more complex logic
      }
    }

    // Check for self-improvement configuration
    if (content.includes('self-improvement') || content.includes('self-improving')) {
      config.selfImprovement = {
        enabled: true,
        analysisInterval: 24, // Default to daily
        autoApplyPatches: false, // Safety first
        requiresApproval: true,
        improvementAreas: ['performance', 'code quality', 'user experience', 'documentation']
      };
    }

    return config;
  }

  /**
   * Get configuration with caching
   */
  async getConfig(forceRefresh = false): Promise<ClaudeConfig> {
    const now = new Date();
    
    // Check cache validity
    if (!forceRefresh && this.config && this.lastReadTime) {
      const timeSinceLastRead = now.getTime() - this.lastReadTime.getTime();
      if (timeSinceLastRead < this.CACHE_DURATION) {
        return this.config;
      }
    }

    // Read and parse fresh
    const content = await this.readClaudeMd();
    this.config = this.parseMarkdown(content);
    this.lastReadTime = now;

    return this.config;
  }

  /**
   * Get specific instructions by type
   */
  async getInstructions(type?: ClaudeInstruction['type']): Promise<ClaudeInstruction[]> {
    const config = await this.getConfig();
    
    if (!type) {
      return config.instructions;
    }

    return config.instructions.filter(inst => inst.type === type);
  }

  /**
   * Get command configuration
   */
  async getCommandConfig(command: string): Promise<CommandConfig | undefined> {
    const config = await this.getConfig();
    return config.commands[command.toLowerCase()];
  }

  /**
   * Check if self-improvement is enabled
   */
  async isSelfImprovementEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config.selfImprovement?.enabled || false;
  }

  /**
   * Get self-improvement configuration
   */
  async getSelfImprovementConfig(): Promise<SelfImprovementConfig | undefined> {
    const config = await this.getConfig();
    return config.selfImprovement;
  }

  /**
   * Extract actionable improvements from claude.md
   */
  async extractImprovements(): Promise<string[]> {
    const config = await this.getConfig();
    const improvements: string[] = [];

    // Look for TODO, FIXME, or improvement-related keywords
    const content = await this.readClaudeMd();
    const improvementPatterns = [
      /TODO:\s*(.+)/gi,
      /FIXME:\s*(.+)/gi,
      /Future Improvements?:\s*(.+)/gi,
      /Enhancement:\s*(.+)/gi,
      /Optimize:\s*(.+)/gi
    ];

    for (const pattern of improvementPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        improvements.push(match[1].trim());
      }
    }

    // Add high-priority instructions as potential improvements
    const highPriorityInstructions = config.instructions
      .filter(inst => inst.priority === 'high')
      .map(inst => inst.instruction);
    
    improvements.push(...highPriorityInstructions);

    return [...new Set(improvements)]; // Remove duplicates
  }

  /**
   * Watch claude.md for changes and trigger callbacks
   */
  watchForChanges(callback: (config: ClaudeConfig) => void): void {
    const fs = require('fs');
    
    fs.watchFile(this.claudeMdPath, async () => {
      console.log('📋 claude.md has been updated, reloading configuration...');
      const config = await this.getConfig(true);
      callback(config);
    });
  }
}

// Export a singleton instance
export const claudeReader = new ClaudeReader();