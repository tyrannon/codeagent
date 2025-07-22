/**
 * Beautiful Terminal UI Components - Claude Code Style
 */

import * as readline from 'readline';

export interface LoadingState {
  message: string;
  startTime: number;
  tokenCount?: number;
  isInterruptible?: boolean;
}

export class TerminalUI {
  private loadingState: LoadingState | null = null;
  private loadingInterval: NodeJS.Timeout | null = null;
  private spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private currentSpinnerIndex = 0;
  private starChars = ['✶', '✦', '✧', '✩', '✪', '✫', '✬', '✭', '✮', '✯', '✰', '✱', '✲', '✳', '✴', '✵', '✶', '✷', '✸', '✹', '✺', '✻', '✼', '✽', '✾', '✿', '❀', '❁', '❂', '❃', '❄', '❅', '❆', '❇', '❈', '❉', '❊', '❋'];
  private currentStarIndex = 0;

  private brewingMessages = [
    '🍺 Brewing…',
    '🤔 Thinking…', 
    '⚙️ Processing…',
    '🔍 Analyzing…',
    '🧘 Contemplating…',
    '🧠 Cogitating…',
    '🐄 Ruminating…',
    '💭 Pondering…',
    '💻 Computing…',
    '🧪 Synthesizing…',
    '☕ Percolating…',
    '🦫 Masticating…',
    '⚖️ Deliberating…',
    '🔮 Speculating…',
    '🥩 Marinating…',
    '🔥 Simmering…',
    '🍷 Fermenting…',
    '🥚 Incubating…',
    '👶 Gestating…',
    '🌪️ Churning…',
    '🍷 Mulling over…',
    '📊 Crunching data…',
    '🌀 Discombobulating…',
    '😵 Befuddling…',
    '🎭 Bamboozling…',
    '🤯 Flummoxing…',
    '🎓 Cognitating…',
    '📚 Lucubrating…',
    '🤓 Ratiocinating…',
    '💡 Excogitating…',
    '🔬 Investigating…',
    '🎨 Crafting…',
    '⚡ Energizing…',
    '🚀 Launching…',
    '🎪 Orchestrating…'
  ];

  startLoading(message?: string, tokenCount?: number): void {
    const randomMessage = message || this.brewingMessages[Math.floor(Math.random() * this.brewingMessages.length)];
    
    this.loadingState = {
      message: randomMessage,
      startTime: Date.now(),
      tokenCount,
      isInterruptible: true
    };

    // Hide cursor
    process.stdout.write('\x1b[?25l');
    
    this.loadingInterval = setInterval(() => {
      this.updateLoadingDisplay();
    }, 100);

    // Set up interrupt handler
    this.setupInterruptHandler();
  }

  stopLoading(): void {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = null;
    }

    // Clear the loading display
    this.clearLoadingDisplay();
    
    // Show cursor
    process.stdout.write('\x1b[?25h');
    
    this.loadingState = null;
  }

  private updateLoadingDisplay(): void {
    if (!this.loadingState) return;

    const elapsed = Math.floor((Date.now() - this.loadingState.startTime) / 1000);
    const spinner = this.spinnerChars[this.currentSpinnerIndex];
    const star = this.starChars[this.currentStarIndex];
    this.currentSpinnerIndex = (this.currentSpinnerIndex + 1) % this.spinnerChars.length;
    this.currentStarIndex = (this.currentStarIndex + 1) % this.starChars.length;

    // Clear the entire loading section (6 lines)
    this.clearLines(6);

    // Format elapsed time properly (mins:secs)
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    // Create the status line with cycling star
    let statusLine = `${star} ${this.loadingState.message} (${timeStr}`;
    
    if (this.loadingState.tokenCount) {
      const formattedTokens = this.formatTokenCount(this.loadingState.tokenCount);
      statusLine += ` · ↓ ${formattedTokens} tokens`;
    }
    
    if (this.loadingState.isInterruptible) {
      statusLine += ' · esc to interrupt';
    }
    
    statusLine += ')';

    // Print status line
    process.stdout.write(statusLine + '\n\n');
    
    // Draw the box
    this.drawStatusBox(spinner);
    
    // Print controls
    process.stdout.write('\n  ⏵⏵ auto-accept edits on (shift+tab to cycle)\n');
  }

  private drawStatusBox(spinner: string): void {
    const boxWidth = 77;
    const topBorder = '╭' + '─'.repeat(boxWidth - 2) + '╮';
    const bottomBorder = '╰' + '─'.repeat(boxWidth - 2) + '╯';
    const middleLine = '│ ' + spinner + ' '.repeat(boxWidth - 4) + '│';
    
    process.stdout.write(topBorder + '\n');
    process.stdout.write(middleLine + '\n');
    process.stdout.write(bottomBorder);
  }

  private clearLoadingDisplay(): void {
    this.clearLines(6);
  }

  private clearLines(count: number): void {
    // Clear current line and move cursor to beginning
    process.stdout.write('\r\x1b[K');
    
    // Move up and clear previous lines
    for (let i = 1; i < count; i++) {
      process.stdout.write('\x1b[1A\x1b[K'); // Move up one line and clear it
    }
  }

  private formatTokenCount(tokens: number): string {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}k`;
    }
    return tokens.toString();
  }

  private setupInterruptHandler(): void {
    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      this.stopLoading();
      console.log('\n\n⚠️  Operation interrupted by user');
      process.exit(0);
    });

    // Handle ESC key (this requires raw mode which is more complex)
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      const onKeyPress = (key: string) => {
        if (key === '\u001b') { // ESC key
          process.stdin.removeListener('data', onKeyPress);
          process.stdin.setRawMode(false);
          this.stopLoading();
          console.log('\n\n⚠️  Operation interrupted');
        }
      };

      process.stdin.on('data', onKeyPress);
    }
  }

  static drawBox(content: string[], title?: string): void {
    // Split long lines to prevent overflow
    const wrappedContent: string[] = [];
    const maxLineWidth = 73; // Leave room for box borders
    
    content.forEach(line => {
      if (line.length <= maxLineWidth) {
        wrappedContent.push(line);
      } else {
        // Split long lines
        for (let i = 0; i < line.length; i += maxLineWidth) {
          wrappedContent.push(line.substring(i, i + maxLineWidth));
        }
      }
    });

    const maxLength = Math.max(
      ...wrappedContent.map(line => line.length),
      title ? title.length + 4 : 0,
      60
    );
    const boxWidth = Math.min(maxLength + 4, 77);

    // Top border
    if (title) {
      const titlePadding = Math.max(0, boxWidth - title.length - 4);
      const leftPad = Math.floor(titlePadding / 2);
      const rightPad = titlePadding - leftPad;
      console.log('╭─' + '─'.repeat(leftPad) + ` ${title} ` + '─'.repeat(rightPad) + '─╮');
    } else {
      console.log('╭' + '─'.repeat(boxWidth - 2) + '╮');
    }

    // Content lines
    wrappedContent.forEach(line => {
      const padding = ' '.repeat(Math.max(0, boxWidth - line.length - 4));
      console.log(`│ ${line}${padding} │`);
    });

    // Bottom border
    console.log('╰' + '─'.repeat(boxWidth - 2) + '╯');
  }

  static showSuccess(message: string): void {
    console.log(`\n✅ ${message}\n`);
  }

  static showError(message: string): void {
    console.log(`\n❌ ${message}\n`);
  }

  static showWarning(message: string): void {
    console.log(`\n⚠️  ${message}\n`);
  }

  static showInfo(message: string): void {
    console.log(`\nℹ️  ${message}\n`);
  }
}