import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import * as readline from 'readline';
import { recognizeIntent } from '../utils/intentRecognizer';
import { ContextManager } from '../utils/contextManager';
import { getFileStructure, analyzeCodebase } from '../utils/fileSystemManager';
import { TerminalUI } from '../utils/terminalUI';
import { TerminalFormatter } from '../utils/terminalFormatter';
import { claudeReader } from '../utils/claudeReader';
import { feedbackLoop } from '../utils/feedbackLoop';
import { askCommand } from './ask';
import { planCommand } from './plan';
import { editCommand } from './edit';
import { writeCommand } from './write';
import { moveCommand } from './move';
import { improveCommand } from './improve';

interface ChatSession {
  id: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  context: any;
}

const CHAT_HISTORY_FILE = '.codeagent-chat-history.json';

export async function chatCommand(initialPrompt?: string): Promise<void> {
  const contextManager = new ContextManager();
  let session: ChatSession = {
    id: Date.now().toString(),
    messages: [],
    context: contextManager.getContext()
  };

  // Handle initial prompt if provided (non-interactive mode)
  if (initialPrompt) {
    TerminalUI.drawBox([
      '🤖 CodeAgent Interactive Chat (Claude Code-style)',
      '',
      'Type "exit" to quit, "clear" to reset context, "help" for commands',
      '',
      'Natural language examples:',
      '• "help me refactor the auth module"',
      '• "create a new component for user profiles"',
      '• "explain how the routing works"'
    ], 'Welcome to CodeAgent');
    console.log(); // Add newline for spacing
    
    await processUserInput(initialPrompt, session, contextManager);
    await saveChatHistory(session);
    return;
  }

  // Interactive mode
  TerminalUI.drawBox([
    '🤖 CodeAgent Interactive Chat (Claude Code-style)',
    '',
    'Type "exit" to quit, "clear" to reset context, "help" for commands',
    '',
    'Natural language examples:',
    '• "help me refactor the auth module"',
    '• "create a new component for user profiles"',
    '• "explain how the routing works"'
  ], 'Welcome to CodeAgent');
  console.log(); // Add newline for spacing

  // Check if we're in a proper interactive terminal
  if (!process.stdin.isTTY) {
    console.log('⚠️  Not running in an interactive terminal. Interactive mode may not work properly.');
    console.log('🔧 For better experience: install tsx globally (npm install -g tsx) and run: tsx cli.ts chat');
    console.log('⚡ Attempting to continue anyway...\n');
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
    terminal: true  // Force terminal mode
  });

  // Load existing chat history after readline setup
  await loadChatHistory(session);

  console.log('🎮 Ready for input...');
  rl.prompt();

  rl.on('line', async (input) => {
    const userInput = input.trim();
    
    if (userInput === 'exit' || userInput === 'quit') {
      await saveChatHistory(session);
      rl.close();
      return;
    }
    
    if (userInput === 'clear') {
      session.messages = [];
      contextManager.clearContext();
      console.log('🧹 Context cleared\n');
      rl.prompt();
      return;
    }
    
    if (userInput === 'help') {
      showHelp();
      rl.prompt();
      return;
    }

    if (userInput.length === 0) {
      rl.prompt();
      return;
    }

    await processUserInput(userInput, session, contextManager);
    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\n👋 Chat session ended');
    process.exit(0);
  });
}

async function processUserInput(
  input: string, 
  session: ChatSession, 
  contextManager: ContextManager
): Promise<void> {
  // Add user message to session
  session.messages.push({
    role: 'user',
    content: input,
    timestamp: new Date()
  });

  const ui = new TerminalUI();

  try {
    // Check for self-improvement requests
    const selfImprovementKeywords = ['improve yourself', 'self-improve', 'analyze yourself', 'improve your code', 'examine your own code'];
    const isSelfImprovement = selfImprovementKeywords.some(keyword => 
      input.toLowerCase().includes(keyword)
    );

    if (isSelfImprovement) {
      console.log(`⚡ Processing: "${input}"`);
      console.log(`🎯 Detected intent: self-improvement`);
      
      // Check claude.md for self-improvement instructions
      const claudeConfig = await claudeReader.getConfig();
      console.log('📋 Reading instructions from claude.md...');
      
      const response = await handleSelfImprovementIntent(input);
      
      // Add assistant response to session
      session.messages.push({
        role: 'assistant', 
        content: response,
        timestamp: new Date()
      });

      console.log('');
      console.log(TerminalFormatter.success(response));
      console.log('');
      return;
    }

    // Recognize intent from natural language
    const intent = recognizeIntent(input);
    contextManager.updateContext(intent, input);

    // Start loading animation
    const estimatedTokens = Math.floor(input.length * 1.2 + Math.random() * 2000);
    ui.startLoading(undefined, estimatedTokens);

    // Simulate realistic processing time for local CLI (reduce delay)
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    ui.stopLoading();

    console.log(`⚡ Processing: "${input}"`);
    console.log(`🎯 Detected intent: ${intent}`);

    let response: string = '';

    // Route to appropriate command based on intent
    switch (intent) {
      case 'plan':
        response = await handlePlanIntent(input);
        break;
      case 'edit':
        response = await handleEditIntent(input);
        break;
      case 'write':
        response = await handleWriteIntent(input);
        break;
      case 'move':
        response = await handleMoveIntent(input);
        break;
      case 'ask':
      default:
        response = await handleAskIntent(input);
        break;
    }

    // Add assistant response to session
    session.messages.push({
      role: 'assistant', 
      content: response,
      timestamp: new Date()
    });

    // Display response with beautiful formatting
    console.log(''); // Add spacing
    console.log(TerminalFormatter.success(response));
    console.log(''); // Add spacing

  } catch (error) {
    ui.stopLoading();
    console.log(TerminalFormatter.error(`Error processing input: ${error}`));
    
    session.messages.push({
      role: 'assistant',
      content: `Error: ${error}`,
      timestamp: new Date()
    });
  }
}

async function handlePlanIntent(input: string): Promise<string> {
  try {
    // Show planning animation
    const planUI = new TerminalUI();
    console.log('\n📋 Initiating strategic planning...');
    planUI.startLoading('🎯 Analyzing requirements and designing roadmap...', 0);
    
    // Call the actual plan command
    await planCommand();
    
    planUI.stopLoading();
    return `📋 Planning complete! 🎉 I've created a strategic plan based on your request: "${input}"\n\n✨ Check the plan file for detailed implementation steps! 🚀`;
  } catch (error) {
    return `❌ Sorry, I encountered an error while creating the plan: ${error} 📋`;
  }
}

async function handleEditIntent(input: string): Promise<string> {
  // Try to extract file path from input
  const words = input.split(/\s+/);
  const possibleFile = words.find(word => 
    word.includes('.') && (
      word.endsWith('.ts') || 
      word.endsWith('.js') || 
      word.endsWith('.tsx') || 
      word.endsWith('.jsx')
    )
  );

  if (possibleFile && existsSync(possibleFile)) {
    try {
      // Show editing animation
      const editUI = new TerminalUI();
      console.log(`\n✏️ Preparing to edit ${possibleFile}...`);
      editUI.startLoading('🎨 AI is analyzing and modifying your code...', 0);
      
      // Call the actual edit command
      await editCommand(possibleFile);
      
      editUI.stopLoading();
      return `✏️ Edit complete! 🎨 I've analyzed and processed edits for: ${possibleFile}\n\n✨ Check the output above for detailed changes! 🚀`;
    } catch (error) {
      return `❌ Sorry, I encountered an error while editing ${possibleFile}: ${error} ✏️`;
    }
  } else {
    return "✏️ I'd be happy to help edit a file! 😊 Please specify which file you'd like to modify. 📝\n\n💡 Pro tip: Include the file path in your request! 🎯\n\nExample: 'edit src/components/Button.tsx'";
  }
}

async function handleWriteIntent(input: string): Promise<string> {
  // Try to extract file path from input
  const words = input.split(/\s+/);
  const possibleFile = words.find(word => 
    word.includes('.') && (
      word.endsWith('.ts') || 
      word.endsWith('.js') || 
      word.endsWith('.tsx') || 
      word.endsWith('.jsx') ||
      word.endsWith('.md') ||
      word.endsWith('.json')
    )
  );

  if (possibleFile) {
    try {
      // Call the actual write command
      await writeCommand(possibleFile);
      return `✍️ Write complete! 📝 I've created: ${possibleFile}\n\n🎨 Check the output above for the generated content! 🚀`;
    } catch (error) {
      return `❌ Sorry, I encountered an error while writing ${possibleFile}: ${error} ✍️`;
    }
  } else {
    return "✍️ I'd be happy to help create a file! 📝 Please specify the file path you'd like me to create. 🗂️\n\n💡 Example: 'write src/components/NewComponent.tsx' 🎯";
  }
}

async function handleMoveIntent(input: string): Promise<string> {
  // Try to extract source and destination paths
  const words = input.split(/\s+/);
  const filePaths = words.filter(word => word.includes('.') || word.includes('/'));
  
  if (filePaths.length >= 2) {
    const src = filePaths[0];
    const dest = filePaths[1];
    
    try {
      // Call the actual move command
      await moveCommand(src, dest);
      return `📁 Move complete! 🔄 Successfully moved ${src} to ${dest}\n\n✨ Codebase reorganized! 🗃️`;
    } catch (error) {
      return `❌ Sorry, I encountered an error while moving ${src} to ${dest}: ${error} 📁`;
    }
  } else {
    return "📁 I can help you move or rename files! 🔄 Please specify the source and destination paths. 🎯\n\n💡 Example: 'move old-file.ts new-location/new-file.ts'\n\n✨ Let's reorganize your codebase! 🗃️";
  }
}

async function handleAskIntent(input: string): Promise<string> {
  try {
    // Show AI thinking animation while the real LLM processes
    const aiUI = new TerminalUI();
    console.log('\n🧠 Connecting to DeepSeek-Coder AI...');
    aiUI.startLoading('🤖 AI is thinking deeply about your question...', 0);
    
    // Call the actual ask command which uses DeepSeek-Coder via Ollama
    await askCommand(input);
    
    aiUI.stopLoading();
    return `✅ Analysis complete! The formatted results are displayed above with colors, emojis, and detailed insights! 🎯`;
  } catch (error) {
    return `❌ Sorry, I encountered an error while analyzing your question: ${error} 🔧`;
  }
}

async function handleSelfImprovementIntent(input: string): Promise<string> {
  try {
    // Show self-analysis animation
    const improveUI = new TerminalUI();
    console.log('\n🔍 Initiating self-analysis mode...');
    improveUI.startLoading('🤖 Analyzing my own architecture and code patterns...', 0);
    
    // Check if it's just an analysis request or full improvement
    const shouldRunFull = input.toLowerCase().includes('improve') || input.toLowerCase().includes('suggest');
    
    if (shouldRunFull) {
      // Run the improve command with interactive mode
      await improveCommand({
        analyze: true,
        suggest: true,
        auto: false
      });
    } else {
      // Just run analysis
      await improveCommand({
        analyze: true,
        suggest: false
      });
    }
    
    improveUI.stopLoading();
    return `🚀 Self-improvement analysis complete! 

I've analyzed my own codebase following the instructions in claude.md. The results show:
- Code architecture patterns and complexity metrics
- Potential improvement areas based on best practices
- Suggestions aligned with the project goals

You can run 'npx tsx cli.ts improve' directly for more control over the self-improvement process! 🛠️`;
  } catch (error) {
    return `❌ Sorry, I encountered an error during self-analysis: ${error} 🔧

You might need to:
1. Ensure claude.md has self-improvement configuration
2. Check that all dependencies are installed
3. Verify the codebase structure is intact`;
  }
}

function showHelp(): void {
  console.log(`
🚀 CodeAgent Chat Commands:
  
Natural Language Examples: 💭
• "help me refactor the authentication module" 🔐
• "create a new component for user profiles" 👤 
• "explain how the routing works" 🗺️
• "move the utils to a shared folder" 📁
• "plan a feature for notifications" 🔔

Special Commands: ⚡
• exit/quit - End chat session 👋
• clear - Reset conversation context 🧹 
• help - Show this help message ❓

Intent Recognition: 🧠
• Plan: "plan", "create", "design", "implement" 📋
• Edit: "edit", "modify", "change", "update", "refactor" ✏️ 
• Write: "write", "create", "generate", "make" ✍️
• Move: "move", "rename", "relocate" 🔄
• Ask: General questions and explanations 🤔
`);
}

async function loadChatHistory(session: ChatSession): Promise<void> {
  try {
    if (existsSync(CHAT_HISTORY_FILE)) {
      const historyData = await readFile(CHAT_HISTORY_FILE, 'utf-8');
      const history = JSON.parse(historyData);
      if (history.messages) {
        session.messages = history.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
    }
  } catch (error) {
    console.warn('Could not load chat history:', error);
  }
}

async function saveChatHistory(session: ChatSession): Promise<void> {
  try {
    await writeFile(CHAT_HISTORY_FILE, JSON.stringify(session, null, 2));
  } catch (error) {
    console.warn('Could not save chat history:', error);
  }
}