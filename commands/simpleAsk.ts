// Simple ask command - clean, minimal responses
import { generateResponse } from '../llm/router';
import { QuestionClassifier } from '../utils/questionClassifier';
import { CodeAnalyzer } from '../utils/codeAnalyzer';
import { ConversationMemory } from '../utils/conversationMemory';
import { RichTerminalFormatter } from '../utils/richTerminalFormatter';

export async function askCommand(question: string, optionsOrMemory?: ConversationMemory | { model?: string; showReasoning?: boolean; interactiveMode?: boolean; showThinkingText?: boolean }) {
  // Handle different call patterns for backwards compatibility
  const conversationMemory = optionsOrMemory && 'classifyTopic' in optionsOrMemory ? optionsOrMemory : undefined;
  const options = optionsOrMemory && !conversationMemory ? optionsOrMemory as { model?: string; showReasoning?: boolean; interactiveMode?: boolean; showThinkingText?: boolean } : {};
  process.stdout.write(RichTerminalFormatter.createProcessingMessage('Analyzing your question...'));

  try {
    let prompt: string;
    
    // Check if question is about CodeAgent's capabilities first
    if (question.toLowerCase().includes('your ability') || 
        question.toLowerCase().includes('what can you') ||
        question.toLowerCase().includes('your capabilities') ||
        question.toLowerCase().includes('what do you do')) {
      prompt = `You are CodeAgent, a local AI-powered CLI assistant for developers. You have the following capabilities:

**File Operations:**
- Read files: Can analyze and read any file in the codebase
- Edit files: Can modify existing files with AI-guided changes  
- Write files: Can create new files from scratch
- Move files: Can rename and relocate files/directories

**Code Analysis:**
- Analyze project architecture and patterns
- Understand TypeScript, JavaScript, Python, Java, C++, SQL codebases
- Provide code reviews and suggestions
- Help with refactoring and optimization

**AI Features:**
- LeetCode problem solving with step-by-step guidance
- Conversation memory for natural follow-up questions
- Multi-language code generation and translation
- Project planning and task management

**Local & Private:**
- Runs completely locally via Ollama and DeepSeek-Coder
- No cloud dependencies, your code stays private
- Real-time processing with rich terminal formatting

User question: ${question}

Explain your capabilities clearly and concisely, focusing on what you can actually do as CodeAgent.`;
    }
    // Use conversation memory if available
    else if (conversationMemory) {
      const topic = conversationMemory.classifyTopic(question);
      const resolvedQuestion = conversationMemory.resolveReferences(question, topic);
      const isFollowUp = conversationMemory.isFollowUp(question);
      const context = conversationMemory.getConversationContext(topic, 3);
      
      if (isFollowUp && context) {
        // Special handling for LeetCode follow-ups with specific languages
        if (topic === 'leetcode' && /\b(java|c\+\+|javascript|typescript|rust|go|kotlin|swift|sql)\b/i.test(question)) {
          const languageMatch = question.match(/\b(java|c\+\+|javascript|typescript|rust|go|kotlin|swift|sql)\b/i);
          const language = languageMatch ? languageMatch[1].toLowerCase() : 'requested language';
          
          prompt = `${context}
        
Current request: ${resolvedQuestion}

The user is asking for the same solution in ${language}. Please provide a ${language} implementation of the Two Sum algorithm that was previously discussed. Include:
- Complete ${language} function implementation
- Proper ${language} syntax and conventions
- Brief explanation of any language-specific differences

Keep the response focused and practical.`;
        } else if (topic === 'leetcode' && /(example|code|implement|show|give)/i.test(question)) {
          // Handle requests for examples in the context of algorithms
          prompt = `${context}
        
Current request: ${resolvedQuestion}

The user is asking for a code example related to our algorithm discussion. Please provide:
- A complete Python implementation of the Two Sum algorithm
- Clear comments explaining the logic
- Example usage with input/output
- Time and space complexity explanation

Keep it practical and easy to understand.`;
        } else {
          prompt = `${context}
        
Current question: ${resolvedQuestion}

Based on our conversation above, provide a helpful response that builds on what we've discussed.`;
        }
      } else if (QuestionClassifier.needsCodebaseAnalysis(resolvedQuestion)) {
        const analyzer = new CodeAnalyzer(process.cwd());
        const analysis = await analyzer.analyzeProject();
        
        prompt = `Based on this TypeScript CLI project:
Files analyzed: ${analysis.metrics.totalFiles}
Key patterns: ${analysis.insights.slice(0, 2).map(i => i.pattern).join(', ')}

Question: ${resolvedQuestion}

Answer concisely with file references.`;
      } else {
        prompt = resolvedQuestion + '\n\nProvide a clear, helpful answer.';
      }
    } else {
      // Fallback to original logic
      if (QuestionClassifier.needsCodebaseAnalysis(question)) {
        const analyzer = new CodeAnalyzer(process.cwd());
        const analysis = await analyzer.analyzeProject();
        
        prompt = `Based on this TypeScript CLI project:
Files analyzed: ${analysis.metrics.totalFiles}
Key patterns: ${analysis.insights.slice(0, 2).map(i => i.pattern).join(', ')}

Question: ${question}

Answer concisely with file references.`;
      } else {
        prompt = question + '\n\nProvide a clear, helpful answer.';
      }
    }

    process.stdout.write('\r\x1b[K'); // Clear "Processing..."
    
    const response = await generateResponse(prompt, {
      maxTokens: options.interactiveMode ? 6144 : 500, // Higher limit for interactive mode
      temperature: 0.1,
      forceModel: options.model as any,
      showReasoning: options.showReasoning,
      showThinkingText: options.showThinkingText ?? options.interactiveMode ?? false // Show thinking in interactive mode
    });

    // Clean output - remove emojis, fix HTML entities, remove artifacts
    const cleanResponse = response
      .replace(/[🔍🎯📄📁💻⚡🏗️🎨💡📊🔸🔹🧠💭🚀🛠️⚖️🔥🤔🧪☕💉📦]/g, '')
      .replace(/&lt;/g, '<')     // Fix HTML entities
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/<｜[^｜]*｜>/g, '') // Remove strange artifacts
      .trim();

    // Apply rich terminal formatting
    const richlyFormattedResponse = RichTerminalFormatter.formatResponse(cleanResponse);
    console.log('\n' + richlyFormattedResponse);
    
    // Add to conversation memory if available
    if (conversationMemory) {
      const topic = conversationMemory.classifyTopic(question);
      conversationMemory.addExchange(question, cleanResponse, topic);
    }
    
  } catch (error) {
    process.stdout.write('\r\x1b[K');
    console.log(RichTerminalFormatter.error(`${error instanceof Error ? error.message : String(error)}`));
    console.log(RichTerminalFormatter.info('Make sure Ollama is running: `ollama serve`'));
    console.log(RichTerminalFormatter.info('And DeepSeek-Coder is installed: `ollama pull deepseek-coder:6.7b`'));
  }
}