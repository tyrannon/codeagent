/**
 * Context Management for Multi-turn Conversations
 */

export interface ConversationContext {
  currentIntent: string;
  previousInputs: string[];
  currentFiles: string[];
  workingDirectory: string;
  sessionId: string;
  lastAction?: string;
  projectContext?: {
    files: string[];
    structure: any;
    language: string;
  };
}

export class ContextManager {
  private context: ConversationContext;

  constructor() {
    this.context = {
      currentIntent: '',
      previousInputs: [],
      currentFiles: [],
      workingDirectory: process.cwd(),
      sessionId: Date.now().toString(),
    };
  }

  updateContext(intent: string, input: string, files?: string[]): void {
    this.context.currentIntent = intent;
    this.context.previousInputs.push(input);
    
    // Keep only last 10 inputs to prevent context bloat
    if (this.context.previousInputs.length > 10) {
      this.context.previousInputs = this.context.previousInputs.slice(-10);
    }

    if (files) {
      this.context.currentFiles = [...new Set([...this.context.currentFiles, ...files])];
    }

    this.context.lastAction = `${intent}: ${input}`;
  }

  setProjectContext(projectContext: any): void {
    this.context.projectContext = projectContext;
  }

  getContext(): ConversationContext {
    return { ...this.context };
  }

  getRecentContext(turns: number = 3): string[] {
    return this.context.previousInputs.slice(-turns);
  }

  getCurrentFiles(): string[] {
    return this.context.currentFiles;
  }

  clearContext(): void {
    this.context = {
      currentIntent: '',
      previousInputs: [],
      currentFiles: [],
      workingDirectory: this.context.workingDirectory,
      sessionId: Date.now().toString(),
    };
  }

  setCurrentFiles(files: string[]): void {
    this.context.currentFiles = files;
  }

  addCurrentFile(file: string): void {
    if (!this.context.currentFiles.includes(file)) {
      this.context.currentFiles.push(file);
    }
  }

  removeCurrentFile(file: string): void {
    this.context.currentFiles = this.context.currentFiles.filter(f => f !== file);
  }

  getLastIntent(): string {
    return this.context.currentIntent;
  }

  isFileInContext(file: string): boolean {
    return this.context.currentFiles.includes(file);
  }

  generateContextSummary(): string {
    const summary = [
      `Session: ${this.context.sessionId}`,
      `Current intent: ${this.context.currentIntent}`,
      `Working directory: ${this.context.workingDirectory}`,
      `Files in context: ${this.context.currentFiles.join(', ') || 'none'}`,
      `Recent inputs: ${this.context.previousInputs.slice(-3).join(' | ')}`
    ];

    return summary.join('\n');
  }
}