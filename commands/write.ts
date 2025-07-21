// write.ts - Create a new file
import { generateResponse } from '../llm/router';
import fs from 'fs';
import path from 'path';
import { createInterface } from 'readline';

export async function writeCommand(filePath: string) {
  console.log(`✨ AI-Powered File Creation: ${filePath}\n`);

  // Check if file already exists
  if (fs.existsSync(filePath)) {
    console.log('⚠️  File already exists! Use the edit command to modify existing files.');
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
    console.log('🎯 Tell me what you want to create:');
    const description = await question('📝 Description: ');
    
    // Get file extension for context
    const fileExt = path.extname(filePath);
    const fileName = path.basename(filePath);
    const language = getLanguageFromExtension(fileExt);
    
    console.log('\n🤖 Generating code with DeepSeek-Coder...\n');

    const prompt = `You are an expert software developer. Create a ${language} file named "${fileName}" based on this description:

"${description}"

Requirements:
- Write clean, well-documented code
- Follow ${language} best practices
- Include appropriate imports/dependencies
- Add helpful comments
- Make the code production-ready

File path: ${filePath}
Language: ${language}

Generate the complete file content:`;

    const generatedCode = await generateResponse(prompt);
    
    // Create directory if it doesn't exist
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }

    // Write the file
    fs.writeFileSync(filePath, generatedCode);
    
    console.log('✅ File created successfully!\n');
    console.log(`📄 Created: ${filePath}`);
    console.log(`📏 Size: ${fs.statSync(filePath).size} bytes`);
    console.log('\n--- Generated Content ---');
    console.log(generatedCode);
    console.log('\n🎉 Ready to use!');

  } catch (error) {
    console.error('❌ Error creating file:', error.message);
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