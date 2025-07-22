// write.ts - Create a new file
import { generateResponse } from '../llm/router';
import fs from 'fs';
import path from 'path';
import { createInterface } from 'readline';
import { ImprovedTerminalUI } from '../utils/improvedTerminalUI';
import { getPromptTemplate, generatePrompt } from '../utils/promptTemplates';
import { processHTMLContent } from '../utils/htmlProcessor';

export async function writeCommand(filePath: string, description?: string) {
  console.log(`✨ AI-Powered File Creation: ${filePath}\n`);

  // Check if file already exists
  if (fs.existsSync(filePath)) {
    console.log('⚠️  File already exists! Use the edit command to modify existing files.');
    return;
  }

  let userDescription = description;

  // Only use interactive mode if no description is provided
  if (!userDescription) {
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
      userDescription = await question('📝 Description: ');
    } finally {
      rl.close();
    }
  } else {
    console.log(`🎯 Creating file based on chat request: "${description}"`);
  }

  try {
    // Get file extension for context
    const fileExt = path.extname(filePath);
    const fileName = path.basename(filePath);
    const language = getLanguageFromExtension(fileExt);
    
    // Determine if this is a content file (text, songs, stories) or code file
    const isContentFile = language === 'Text' || userDescription.includes('song') || userDescription.includes('story') || userDescription.includes('poem') || userDescription.includes('lyrics');
    
    // Get appropriate prompt template based on file type
    const template = getPromptTemplate(fileExt, isContentFile);
    const prompt = generatePrompt(template, userDescription, fileName, language);

    // Start loading indicator with appropriate message
    const ui = new ImprovedTerminalUI();
    const loadingMessage = `🤖 ${isContentFile ? 'Generating content' : 'Generating code'} with DeepSeek-Coder`;
    ui.startLoading(loadingMessage);

    let generatedCode: string;
    try {
      generatedCode = await generateResponse(prompt);
    } finally {
      ui.stopLoading();
    }

    // Post-process content if required by the template
    let finalContent = generatedCode;
    const warnings: string[] = [];
    
    if (template.postProcessingRequired) {
      console.log('🧹 Processing and cleaning generated content...');
      
      if (fileExt.toLowerCase() === '.html' || fileExt.toLowerCase() === '.htm') {
        const htmlResult = await processHTMLContent(generatedCode);
        finalContent = htmlResult.content;
        
        if (htmlResult.warnings.length > 0) {
          console.log('⚠️  Warnings during processing:');
          htmlResult.warnings.forEach(warning => console.log(`   • ${warning}`));
          warnings.push(...htmlResult.warnings);
        }
        
        if (htmlResult.errors.length > 0) {
          console.log('❌ Errors during processing:');
          htmlResult.errors.forEach(error => console.log(`   • ${error}`));
          
          if (!htmlResult.isValid) {
            console.log('⚠️  Generated content has validation issues but will proceed with cleanup...');
          }
        }
        
        if (htmlResult.warnings.length === 0 && htmlResult.errors.length === 0) {
          console.log('✅ Content processed successfully with no issues!');
        }
      }
    }
    
    // Create directory if it doesn't exist
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }

    // Write the file with processed content
    fs.writeFileSync(filePath, finalContent);
    
    console.log('✅ File created successfully!\n');
    console.log(`📄 Created: ${filePath}`);
    console.log(`📏 Size: ${fs.statSync(filePath).size} bytes`);
    console.log('\n--- Generated Content ---');
    console.log(finalContent);
    
    // Show processing summary
    if (warnings.length > 0) {
      console.log(`\n⚠️  Processing completed with ${warnings.length} warning(s)`);
    }
    
    console.log('\n🎉 Ready to use!');

  } catch (error) {
    console.error('❌ Error creating file:', error.message);
    console.log('💡 Make sure Ollama is running: `ollama serve`');
    console.log('💡 And DeepSeek-Coder is installed: `ollama pull deepseek-coder:6.7b`');
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