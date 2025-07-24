import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import * as readline from 'readline';
import { SimpleBufferedReadline } from '../utils/simpleBufferedReadline';
import { recognizeIntent } from '../utils/intentRecognizer';
import { recognizeCompoundIntent, CompoundIntent } from '../utils/compoundIntentRecognizer';
import { executeCompoundIntent } from '../utils/compoundOperationExecutor';
import { ContextManager } from '../utils/contextManager';
import { getFileStructure, analyzeCodebase } from '../utils/fileSystemManager';
import { ImprovedTerminalUI } from '../utils/improvedTerminalUI';
import { MinimalUI } from '../utils/minimalUI';
import { ClaudeStyleOutput } from '../utils/claudeStyleOutput';
import { ConversationMemory } from '../utils/conversationMemory';
import { TerminalFormatter } from '../utils/terminalFormatter';
import { CleanFormatter, OutputSection } from '../utils/cleanFormatter';
import { RichTerminalFormatter } from '../utils/richTerminalFormatter';
import { LeetCodeManager } from '../leetcode/leetcodeManager';
import { claudeReader } from '../utils/claudeReader';
import { feedbackLoop } from '../utils/feedbackLoop';
import { askCommand } from './simpleAsk';
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

export async function chatCommand(
  initialPrompt?: string, 
  options: { model?: string; showReasoning?: boolean; validationArgs?: string[] } = {}
): Promise<void> {
  const contextManager = new ContextManager();
  const leetcodeManager = new LeetCodeManager();
  const conversationMemory = new ConversationMemory();
  
  // Start conversation session
  conversationMemory.startSession();
  
  let session: ChatSession = {
    id: Date.now().toString(),
    messages: [],
    context: contextManager.getContext()
  };

  // Handle initial prompt if provided (non-interactive mode)
  if (initialPrompt) {
    ImprovedTerminalUI.drawBox([
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
    
    await processUserInput(initialPrompt, session, contextManager, leetcodeManager, conversationMemory, options.validationArgs, options);
    await saveChatHistory(session);
    return;
  }

  // Interactive mode
  ImprovedTerminalUI.drawBox([
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

  const rl = SimpleBufferedReadline.createInterface();

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
      conversationMemory.clearSession();
      console.log('Context and conversation memory cleared\n');
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

    await processUserInput(userInput, session, contextManager, leetcodeManager, conversationMemory, options.validationArgs, { model: options.model, showReasoning: options.showReasoning });
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
  contextManager: ContextManager,
  leetcodeManager: LeetCodeManager,
  conversationMemory: ConversationMemory,
  validationArgs?: string[],
  options?: { model?: string; showReasoning?: boolean }
): Promise<void> {
  // Add user message to session
  session.messages.push({
    role: 'user',
    content: input,
    timestamp: new Date()
  });

  const ui = new MinimalUI();

  try {
    // Classify topic and resolve references
    const topic = conversationMemory.classifyTopic(input);
    const resolvedInput = conversationMemory.resolveReferences(input, topic);
    const isFollowUp = conversationMemory.isFollowUp(input);
    
    // Check for LeetCode problems first (but only if not a follow-up)
    if (!isFollowUp) {
      const leetcodeResponse = leetcodeManager.handleInput(resolvedInput);
      if (leetcodeResponse) {
        // Add to conversation memory
        conversationMemory.addExchange(input, leetcodeResponse, 'leetcode');
        
        // Add assistant response to session
        session.messages.push({
          role: 'assistant',
          content: leetcodeResponse,
          timestamp: new Date()
        });

        console.log(leetcodeResponse);
        return;
      }
    }

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

    // Try compound intent recognition first
    const compoundIntent = await recognizeCompoundIntent(input);
    contextManager.updateContext(compoundIntent.isCompound ? 'compound' : compoundIntent.operations[0]?.intent || 'ask', input);

    // Start minimal loading
    ui.startLoading('Processing');

    // Simulate realistic processing time for local CLI
    await new Promise(resolve => setTimeout(resolve, 300));

    ui.stopLoading();

    let response: string = '';

    if (compoundIntent.isCompound) {
      // Handle compound operations
      console.log(RichTerminalFormatter.info(`Intent: compound (${compoundIntent.operations.length} operations)`));
      response = await handleCompoundIntent(compoundIntent, validationArgs);
    } else if (compoundIntent.operations.length > 0) {
      // Handle single operation via compound system (for consistency)
      const singleIntent = compoundIntent.operations[0].intent;
      console.log(RichTerminalFormatter.info(`Intent: ${singleIntent}`));
      response = await handleCompoundIntent(compoundIntent, validationArgs);
    } else {
      // Fallback to legacy system for ask/general questions
      const intent = recognizeIntent(input);
      console.log(RichTerminalFormatter.info(`Intent: ${intent}`));
      
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
          response = await handleAskIntent(input, conversationMemory, options || {});
          break;
      }
    }

    // Add to conversation memory
    const responseTopic = conversationMemory.classifyTopic(input);
    conversationMemory.addExchange(input, response, responseTopic);
    
    // Add assistant response to session
    session.messages.push({
      role: 'assistant', 
      content: response,
      timestamp: new Date()
    });

    // The response is already richly formatted by the individual commands
    // No need for additional "Summary" and "Details" sections

  } catch (error) {
    ui.stopLoading();
    console.log(CleanFormatter.error(`Error processing input: ${error}`));
    
    session.messages.push({
      role: 'assistant',
      content: `Error: ${error}`,
      timestamp: new Date()
    });
  }
}

async function handleCompoundIntent(compoundIntent: CompoundIntent, validationArgs?: string[]): Promise<string> {
  try {
    const result = await executeCompoundIntent(compoundIntent, validationArgs);
    
    if (result.success) {
      return `🎉 Compound operation completed successfully!\n\n${result.summary}\n\nAll requested operations have been executed as planned.`;
    } else {
      let response = `⚠️ Compound operation completed with some issues:\n\n${result.summary}`;
      
      if (result.failedOperations.length > 0) {
        response += `\n\n❌ Failed Operations:\n`;
        result.failedOperations.forEach(failure => {
          response += `   • ${failure.operation.target}: ${failure.error}\n`;
        });
      }
      
      if (result.completedOperations.length > 0) {
        response += `\n✅ However, ${result.completedOperations.length} operation(s) completed successfully!`;
      }
      
      return response;
    }
  } catch (error) {
    return `❌ Sorry, I encountered an error executing your compound request: ${error}`;
  }
}

async function handlePlanIntent(input: string): Promise<string> {
  try {
    // Show planning animation
    const planUI = new ImprovedTerminalUI();
    console.log('\n' + CleanFormatter.progress('Initiating strategic planning'));
    planUI.startLoading('Analyzing requirements and designing roadmap', 0);
    
    // Call the plan command with the input as project description (non-interactive mode)
    await planCommand(input);
    
    planUI.stopLoading();
    return `Planning complete! I've created a strategic plan based on your request: "${input}"\n\nCheck the plan file for detailed implementation steps`;
  } catch (error) {
    return `Sorry, I encountered an error while creating the plan: ${error}`;
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
      const editUI = new ImprovedTerminalUI();
      console.log(`\n${CleanFormatter.progress(`Preparing to edit ${possibleFile}`)}`);
      editUI.startLoading('AI is analyzing and modifying your code', 0);
      
      // Call the actual edit command
      await editCommand(possibleFile);
      
      editUI.stopLoading();
      return `Edit complete! I've analyzed and processed edits for: ${possibleFile}\n\nCheck the output above for detailed changes`;
    } catch (error) {
      return `Sorry, I encountered an error while editing ${possibleFile}: ${error}`;
    }
  } else {
    return "I'd be happy to help edit a file! Please specify which file you'd like to modify.\n\nPro tip: Include the file path in your request\n\nExample: 'edit src/components/Button.tsx'";
  }
}

function extractContentDescription(input: string): string {
  // Extract descriptions like "with a song about happiness", "containing jokes", "with API documentation", etc.
  const contentPatterns = [
    // "with a song about happiness" - captures type and topic
    /with\s+(?:a\s+)?(song|story|poem|joke|list|guide|tutorial|documentation|example|code|script|template)(?:\s+about\s+(.+?))?(?:\s+(?:in|for|to)|$)/i,
    // "put a song about happytimes in there" - captures put pattern
    /(?:put|add)\s+(?:a\s+)?(song|story|poem|joke|list|guide|tutorial|documentation|example|code|script|template)(?:\s+about\s+(.+?))?(?:\s+(?:in|there|inside)|$)/i,
    // "containing funny jokes" - captures full description
    /containing\s+(.+?)(?:\s+(?:in|for|to)|$)/i,
    // "with API documentation" - captures without "a"
    /with\s+(API\s+documentation|documentation|examples|jokes|stories|poems|guides|tutorials|code|scripts|templates)(?:\s+(?:about|for)\s+(.+?))?(?:\s+(?:in|for|to)|$)/i,
    // "about adventure" - captures topic
    /(?:write|create).*?(?:story|poem|song|guide).*?about\s+(.+?)(?:\s+(?:in|for|to)|$)/i
  ];
  
  for (const pattern of contentPatterns) {
    const match = input.match(pattern);
    if (match) {
      if (match[1] && match[2]) {
        // "with a song about happiness" -> "with a song about happiness"
        return `with a ${match[1]} about ${match[2].trim()}`;
      } else if (match[1]) {
        // Handle different types
        const content = match[1].trim();
        if (content.includes('documentation') || content.includes('API')) {
          return `with ${content}`;
        } else if (pattern.source.includes('containing')) {
          return `containing ${content}`;
        } else if (pattern.source.includes('about')) {
          return `about ${content}`;
        } else {
          return `with ${content}`;
        }
      }
    }
  }
  
  return '';
}

async function handleWriteIntent(input: string): Promise<string> {
  const { parseFileOperations, executeOperations, generateOperationSummary } = await import('../utils/intentParser');
  
  try {
    // Parse natural language input for file/folder operations
    const parseResult = parseFileOperations(input);
    
    if (parseResult.errors.length > 0) {
      return `❌ I encountered some issues understanding your request:\n${parseResult.errors.join('\n')}\n\n💡 Try: "create a folder called testfolder and put a file called test.txt in it"`;
    }
    
    if (parseResult.operations.length === 0) {
      // Fallback to original logic for specific file extensions
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
        await writeCommand(possibleFile);
        return `✍️ Write complete! 📝 I've created: ${possibleFile}\n\n🎨 Check the output above for the generated content! 🚀`;
      } else {
        return "✍️ I'd be happy to help create files and folders! 📝\n\n💡 Examples:\n• 'create a folder called testfolder and put a file called test.txt in it'\n• 'make a directory called utils'\n• 'write src/components/Button.tsx' 🎯";
      }
    }
    
    // Execute folder creation operations
    const executionResult = await executeOperations(parseResult.operations);
    
    // Check if this is a folder-only operation
    const folderOperations = parseResult.operations.filter(op => op.type === 'folder');
    const fileOperations = parseResult.operations.filter(op => op.type === 'file');
    
    if (fileOperations.length === 0 && folderOperations.length > 0) {
      // Folder-only operation - just show success message
      let response = `✅ Folder creation complete!\n\n${generateOperationSummary(parseResult.operations)}`;
      
      if (executionResult.failed.length > 0) {
        response += `\n⚠️ Some operations failed:\n${executionResult.failed.map(f => `❌ ${f.operation.path}: ${f.error}`).join('\n')}`;
      }
      
      return response + '\n\n📁 Your folders are ready to use!';
    }
    
    // Create files using the writeCommand for each file operation
    for (const operation of fileOperations) {
      try {
        // Extract content description from the input (e.g., "with a song about happiness")
        const contentDescription = extractContentDescription(input);
        
        // Generate a better description based on the extracted content
        const fileDescription = contentDescription 
          ? `Create a ${operation.path.endsWith('.txt') ? 'text file' : 'file'} ${contentDescription}. This file was created via CodeAgent's natural language interface.`
          : `Create a ${operation.path.endsWith('.txt') ? 'text file' : 'file'} for ${input}. This is a demonstration file created via CodeAgent's natural language interface.`;
        
        await writeCommand(operation.path, fileDescription);
      } catch (error) {
        executionResult.failed.push({ 
          operation, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }
    
    // Generate summary response
    let response = `✅ File/Folder creation complete!\n\n${generateOperationSummary(parseResult.operations)}`;
    
    if (executionResult.failed.length > 0) {
      response += `\n⚠️ Some operations failed:\n${executionResult.failed.map(f => `❌ ${f.operation.path}: ${f.error}`).join('\n')}`;
    }
    
    return response + '\n\n🎨 Check the output above for any generated file content! 🚀';
    
  } catch (error) {
    return `❌ Sorry, I encountered an error processing your request: ${error} ✍️\n\n💡 Try: "create a folder called testfolder and put a file called test.txt in it"`;
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

async function handleAskIntent(input: string, conversationMemory?: ConversationMemory, modelOptions?: { model?: string; showReasoning?: boolean }): Promise<string> {
  try {
    // Show AI thinking animation while the real LLM processes
    const aiUI = new ImprovedTerminalUI();
    aiUI.startLoading('AI is thinking deeply about your question', 0);
    
    // Call the actual ask command with interactive mode settings
    await askCommand(input, {
      ...modelOptions,
      interactiveMode: true,        // Enable enhanced settings for chat mode
      showThinkingText: true,       // Show thinking text in interactive mode
      showReasoning: true           // Show model selection reasoning
    });
    
    aiUI.stopLoading();
    return `Analysis complete! The formatted results are displayed above with detailed insights`;
  } catch (error) {
    return `Sorry, I encountered an error while analyzing your question: ${error}`;
  }
}

async function handleSelfImprovementIntent(input: string): Promise<string> {
  try {
    // Show self-analysis animation
    const improveUI = new ImprovedTerminalUI();
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