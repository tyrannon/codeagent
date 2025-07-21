// ask.ts - Ask questions about the codebase
import { generateResponse } from '../llm/router';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

export async function askCommand(question: string) {
  console.log('🤖 Analyzing your codebase to answer your question...\n');

  try {
    // Get codebase context
    const codebaseContext = await getCodebaseContext();
    
    const prompt = `You are a helpful AI coding assistant analyzing a codebase. Here's what I know about the current project:

## Codebase Structure:
${codebaseContext.structure}

## Key Files Content:
${codebaseContext.keyFiles}

## Project Information:
${codebaseContext.projectInfo}

## User Question:
"${question}"

Please provide a helpful, accurate answer based on the codebase analysis above. If you need to reference specific files, mention the file paths. Be concise but thorough.`;

    console.log('💭 Thinking...\n');
    const response = await generateResponse(prompt);
    
    console.log('📝 **Answer:**\n');
    console.log(response);
    console.log('\n---');
    console.log('💡 *Tip: For more specific help, try asking about particular files or functions!*');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('💡 Make sure Ollama is running: `ollama serve`');
    console.log('💡 And DeepSeek-Coder is installed: `ollama pull deepseek-coder:6.7b`');
  }
}

async function getCodebaseContext() {
  const projectRoot = process.cwd();
  
  // Get project structure
  const structure = await getProjectStructure();
  
  // Get key configuration files
  const keyFiles = await getKeyFilesContent();
  
  // Get project info
  const projectInfo = getProjectInfo();
  
  return {
    structure,
    keyFiles,
    projectInfo
  };
}

async function getProjectStructure(): Promise<string> {
  try {
    const files = await glob('**/*.{ts,js,json,md}', {
      ignore: ['node_modules/**', 'dist/**', '.git/**', '**/*.min.js'],
      cwd: process.cwd()
    });
    
    return files.slice(0, 20).join('\n'); // Limit to first 20 files
  } catch (error) {
    return 'Unable to read project structure';
  }
}

async function getKeyFilesContent(): Promise<string> {
  const keyFiles = ['package.json', 'README.md', 'claude.md', 'tsconfig.json'];
  let content = '';
  
  for (const file of keyFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        content += `\n### ${file}:\n\`\`\`\n${fileContent.slice(0, 500)}${fileContent.length > 500 ? '\n...[truncated]' : ''}\n\`\`\`\n`;
      } catch (error) {
        content += `\n### ${file}: [Unable to read]\n`;
      }
    }
  }
  
  return content;
}

function getProjectInfo(): string {
  const projectRoot = process.cwd();
  const projectName = path.basename(projectRoot);
  
  return `Project: ${projectName}
Location: ${projectRoot}
Type: TypeScript/Node.js CLI Application`;
} 