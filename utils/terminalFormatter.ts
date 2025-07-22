/**
 * Terminal Formatter - Convert markdown to beautiful colored terminal output
 */

export class TerminalFormatter {
  // ANSI color codes
  static colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    
    // Text colors
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    
    // Bright colors
    brightRed: '\x1b[91m',
    brightGreen: '\x1b[92m',
    brightYellow: '\x1b[93m',
    brightBlue: '\x1b[94m',
    brightMagenta: '\x1b[95m',
    brightCyan: '\x1b[96m',
    brightWhite: '\x1b[97m',
    
    // Background colors
    bgBlack: '\x1b[40m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
    bgWhite: '\x1b[47m'
  };

  static formatResponse(text: string): string {
    let formatted = text;

    // Add more emojis throughout
    formatted = this.addMoreEmojis(formatted);
    
    // Convert markdown headers to colored headers
    formatted = formatted.replace(/^## (.*$)/gm, `\n${this.colors.brightCyan}${this.colors.bright}🚀 $1${this.colors.reset}\n`);
    formatted = formatted.replace(/^### (.*$)/gm, `\n${this.colors.brightYellow}${this.colors.bright}⭐ $1${this.colors.reset}\n`);
    formatted = formatted.replace(/^#### (.*$)/gm, `\n${this.colors.brightMagenta}${this.colors.bright}✨ $1${this.colors.reset}\n`);
    
    // Convert **bold** to actual bold with colors
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, `${this.colors.bright}${this.colors.brightWhite}$1${this.colors.reset}`);
    
    // Convert *italic* to colored text
    formatted = formatted.replace(/\*(.*?)\*/g, `${this.colors.cyan}$1${this.colors.reset}`);
    
    // Convert `code` to highlighted code
    formatted = formatted.replace(/`([^`]+)`/g, `${this.colors.bgBlack}${this.colors.brightYellow} $1 ${this.colors.reset}`);
    
    // Convert bullet points to colorful bullets
    formatted = formatted.replace(/^- (.*$)/gm, `${this.colors.brightGreen}🔹${this.colors.reset} $1`);
    formatted = formatted.replace(/^  - (.*$)/gm, `  ${this.colors.brightBlue}🔸${this.colors.reset} $1`);
    formatted = formatted.replace(/^    - (.*$)/gm, `    ${this.colors.brightMagenta}▫️${this.colors.reset} $1`);
    
    // Highlight important keywords with colors
    formatted = this.highlightKeywords(formatted);
    
    // Add section dividers with style
    formatted = formatted.replace(/^---$/gm, `${this.colors.brightCyan}${'═'.repeat(50)}${this.colors.reset}`);
    
    // Color confidence percentages
    formatted = formatted.replace(/(\d+)% confidence/g, `${this.colors.bright}${this.colors.brightGreen}$1%${this.colors.reset} confidence`);
    
    // Color file paths
    formatted = formatted.replace(/([a-zA-Z0-9_-]+\.(ts|js|tsx|jsx|json|md))/g, `${this.colors.brightBlue}📄 $1${this.colors.reset}`);
    
    return formatted;
  }

  static addMoreEmojis(text: string): string {
    // Add context-appropriate emojis
    const emojiReplacements = [
      [/Command Pattern/g, '🎯 Command Pattern'],
      [/Module Pattern/g, '📦 Module Pattern'],
      [/Dependency Injection/g, '💉 Dependency Injection'],
      [/TypeScript/g, '🔷 TypeScript'],
      [/JavaScript/g, '🟨 JavaScript'],
      [/function/g, '⚡ function'],
      [/class/g, '🏗️ class'],
      [/interface/g, '🔌 interface'],
      [/import/g, '📥 import'],
      [/export/g, '📤 export'],
      [/CLI/g, '💻 CLI'],
      [/files?(?!\w)/g, '📁 files'],
      [/directory/g, '📂 directory'],
      [/analysis/g, '🔍 analysis'],
      [/code/g, '💻 code'],
      [/architecture/g, '🏛️ architecture'],
      [/pattern/g, '🎨 pattern'],
      [/Evidence/g, '🔍 Evidence'],
      [/Examples/g, '💡 Examples'],
      [/Confidence/g, '📊 Confidence'],
      [/Next Steps/g, '🚀 Next Steps'],
      [/Recommendations/g, '💡 Recommendations'],
      [/Trade-offs/g, '⚖️ Trade-offs'],
      [/Implementation/g, '🛠️ Implementation']
    ];

    let enhanced = text;
    emojiReplacements.forEach(([pattern, replacement]) => {
      enhanced = enhanced.replace(pattern, replacement);
    });

    return enhanced;
  }

  static highlightKeywords(text: string): string {
    const keywords = [
      { pattern: /\b(error|Error|ERROR)\b/g, color: this.colors.brightRed },
      { pattern: /\b(success|Success|SUCCESS|complete|Complete)\b/g, color: this.colors.brightGreen },
      { pattern: /\b(warning|Warning|WARNING)\b/g, color: this.colors.brightYellow },
      { pattern: /\b(info|Info|INFO|note|Note)\b/g, color: this.colors.brightBlue },
      { pattern: /\b(important|Important|IMPORTANT|critical|Critical)\b/g, color: this.colors.brightMagenta },
      { pattern: /\b(new|New|NEW|create|Create)\b/g, color: this.colors.brightCyan }
    ];

    let highlighted = text;
    keywords.forEach(({ pattern, color }) => {
      highlighted = highlighted.replace(pattern, `${color}$1${this.colors.reset}`);
    });

    return highlighted;
  }

  static createSection(title: string, content: string, emoji: string = '📋'): string {
    const width = 70;
    const titleLine = `${emoji} ${title}`;
    const border = '═'.repeat(width);
    
    return `
${this.colors.brightCyan}╭${border}╮${this.colors.reset}
${this.colors.brightCyan}│${this.colors.reset} ${this.colors.bright}${this.colors.brightWhite}${titleLine.padEnd(width - 2)}${this.colors.reset} ${this.colors.brightCyan}│${this.colors.reset}
${this.colors.brightCyan}╰${border}╯${this.colors.reset}

${this.formatResponse(content)}
`;
  }

  static createProgressBar(percentage: number, label: string): string {
    const width = 20;
    const filled = Math.round(width * (percentage / 100));
    const empty = width - filled;
    
    const bar = `${'█'.repeat(filled)}${'░'.repeat(empty)}`;
    const color = percentage >= 80 ? this.colors.brightGreen : 
                 percentage >= 60 ? this.colors.brightYellow : this.colors.brightRed;
    
    return `${color}${bar}${this.colors.reset} ${percentage}% ${label}`;
  }

  static formatList(items: string[], title: string, emoji: string = '🔹'): string {
    const formattedItems = items.map(item => `${this.colors.brightGreen}${emoji}${this.colors.reset} ${item}`).join('\n');
    return `
${this.colors.bright}${this.colors.brightCyan}${title}:${this.colors.reset}
${formattedItems}
`;
  }

  static emphasize(text: string): string {
    return `${this.colors.bright}${this.colors.brightYellow}🌟 ${text} 🌟${this.colors.reset}`;
  }

  static success(text: string): string {
    return `${this.colors.brightGreen}✅ ${text}${this.colors.reset}`;
  }

  static error(text: string): string {
    return `${this.colors.brightRed}❌ ${text}${this.colors.reset}`;
  }

  static warning(text: string): string {
    return `${this.colors.brightYellow}⚠️ ${text}${this.colors.reset}`;
  }

  static info(text: string): string {
    return `${this.colors.brightBlue}ℹ️ ${text}${this.colors.reset}`;
  }

  static bold(text: string): string {
    return `${this.colors.bright}${text}${this.colors.reset}`;
  }

  static color(text: string, color: 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white'): string {
    const colorCode = this.colors[color] || this.colors.white;
    return `${colorCode}${text}${this.colors.reset}`;
  }
}