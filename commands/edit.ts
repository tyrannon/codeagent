// edit.ts - Edit a code file with the model
import { generateResponse } from '../llm/router';
import fs from 'fs';
import path from 'path';
import { createInterface } from 'readline';

export async function editCommand(filePath: string) {
  console.log(`⚔️  AI-Powered Code Editing: ${filePath}\n`);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.log('❌ File does not exist! Use the write command to create new files.');
    return;
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  try {
    // Read current file content
    const currentContent = fs.readFileSync(filePath, 'utf-8');
    const fileExt = path.extname(filePath);
    const language = getLanguageFromExtension(fileExt);

    console.log('📄 Current file content:');
    console.log('---');
    console.log(currentContent);
    console.log('---\n');

    console.log('Choose editing mode:');
    console.log('1. 🎯 Specific changes (describe what to modify)');
    console.log('2. 🔄 Refactor/improve existing code');
    console.log('3. 🐛 Fix bugs or issues');
    console.log('4. ✨ Add new functionality');

    const mode = await question('\nEnter choice (1-4): ');
    let editPrompt = '';

    switch (mode.trim()) {
      case '1':
        const changes = await question('📝 Describe the specific changes needed: ');
        editPrompt = `Make these specific changes to the code: ${changes}`;
        break;
      case '2':
        editPrompt = 'Refactor and improve this code while maintaining the same functionality. Focus on code quality, readability, and best practices.';
        break;
      case '3':
        const issues = await question('🐛 Describe the bugs or issues to fix: ');
        editPrompt = `Fix these bugs or issues: ${issues}`;
        break;
      case '4':
        const newFeatures = await question('✨ Describe the new functionality to add: ');
        editPrompt = `Add this new functionality: ${newFeatures}`;
        break;
      default:
        console.log('❌ Invalid choice. Using general improvement mode.');
        editPrompt = 'Improve this code while maintaining the same functionality.';
    }

    console.log('\n🤖 Processing changes with DeepSeek-Coder...\n');

    const prompt = `You are an expert ${language} developer. Here is the current code from "${filePath}":

\`\`\`${language.toLowerCase()}
${currentContent}
\`\`\`

Task: ${editPrompt}

Requirements:
- Maintain existing functionality unless explicitly asked to change it
- Follow ${language} best practices
- Keep the same file structure and imports if applicable
- Add helpful comments for new code
- Ensure the code is production-ready

Return the complete updated file content:`;

    const updatedCode = await generateResponse(prompt);
    
    // Create backup
    const backupPath = `${filePath}.backup.${Date.now()}`;
    fs.writeFileSync(backupPath, currentContent);
    console.log(`📋 Backup created: ${backupPath}`);

    // Write updated content
    fs.writeFileSync(filePath, updatedCode);
    
    console.log('✅ File updated successfully!\n');
    console.log('--- Updated Content ---');
    console.log(updatedCode);
    console.log('\n🎉 Changes applied!');
    console.log(`💾 Original saved as: ${backupPath}`);

  } catch (error) {
    console.error('❌ Error editing file:', error.message);
    console.log('💡 Make sure Ollama is running: `ollama serve`');
    console.log('💡 And DeepSeek-Coder is installed: `ollama pull deepseek-coder:6.7b`');
  } finally {
    rl.close();
  }
}

function getLanguageFromExtension(ext: string): string {
  const languageMap: { [key: string]: string } = {
    '.js': 'JavaScript',
    '.ts': 'TypeScript', 
    '.py': 'Python',
    '.java': 'Java',
    '.cpp': 'C++',
    '.c': 'C',
    '.rs': 'Rust',
    '.go': 'Go',
    '.php': 'PHP',
    '.rb': 'Ruby',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.cs': 'C#',
    '.html': 'HTML',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.vue': 'Vue',
    '.jsx': 'React JSX',
    '.tsx': 'React TypeScript',
    '.sql': 'SQL',
    '.sh': 'Shell Script',
    '.md': 'Markdown',
    '.json': 'JSON',
    '.yaml': 'YAML',
    '.yml': 'YAML'
  };

  return languageMap[ext.toLowerCase()] || 'Text';
} 