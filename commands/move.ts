// move.ts - Move/rename files
import { generateResponse } from '../llm/router';
import fs from 'fs';
import path from 'path';
import { createInterface } from 'readline';
import { glob } from 'glob';

export async function moveCommand(srcPath: string, destPath: string) {
  console.log(`🚚 AI-Powered File Move/Refactor: ${srcPath} → ${destPath}\n`);

  // Check if source file exists
  if (!fs.existsSync(srcPath)) {
    console.log('❌ Source file does not exist!');
    return;
  }

  // Check if destination already exists
  if (fs.existsSync(destPath)) {
    console.log('⚠️  Destination file already exists! Operation cancelled for safety.');
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
    const srcContent = fs.readFileSync(srcPath, 'utf-8');
    const srcExt = path.extname(srcPath);
    const destExt = path.extname(destPath);
    const language = getLanguageFromExtension(srcExt);

    console.log('Choose operation type:');
    console.log('1. 📁 Simple move (no code changes)');
    console.log('2. 🔄 Smart move (update imports/references)');
    console.log('3. ♻️  Refactor during move (improve code while moving)');

    const choice = await question('\nEnter choice (1-3): ');

    switch (choice.trim()) {
      case '1':
        await simpleMoveFile(srcPath, destPath, srcContent);
        break;
      case '2':
        await smartMoveFile(srcPath, destPath, srcContent, language);
        break;
      case '3':
        await refactorMoveFile(srcPath, destPath, srcContent, language, question);
        break;
      default:
        console.log('❌ Invalid choice. Using simple move.');
        await simpleMoveFile(srcPath, destPath, srcContent);
    }

    console.log('\n✅ Move operation completed successfully!');

  } catch (error) {
    console.error('❌ Error during move operation:', error.message);
  } finally {
    rl.close();
  }
}

async function simpleMoveFile(srcPath: string, destPath: string, content: string) {
  // Create destination directory if needed
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log(`📁 Created directory: ${destDir}`);
  }

  // Move the file
  fs.writeFileSync(destPath, content);
  fs.unlinkSync(srcPath);

  console.log('📦 File moved successfully (no code changes)');
}

async function smartMoveFile(srcPath: string, destPath: string, content: string, language: string) {
  console.log('\n🤖 Analyzing code for import/reference updates...\n');

  // Find files that might import this file
  const projectFiles = await glob('**/*.{ts,js,tsx,jsx}', {
    ignore: ['node_modules/**', 'dist/**', '.git/**'],
    cwd: process.cwd()
  });

  const oldFileName = path.basename(srcPath, path.extname(srcPath));
  const newFileName = path.basename(destPath, path.extname(destPath));

  const prompt = `You are an expert ${language} developer. I'm moving a file from "${srcPath}" to "${destPath}".

Original file content:
\`\`\`${language.toLowerCase()}
${content}
\`\`\`

Please update any imports, exports, or internal references that need to change due to the new file location. Consider:
- Import/export paths
- Module names
- File references in comments
- Any other location-dependent code

Return the updated file content:`;

  try {
    const updatedContent = await generateResponse(prompt);

    // Create destination directory if needed
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
      console.log(`📁 Created directory: ${destDir}`);
    }

    // Write updated content
    fs.writeFileSync(destPath, updatedContent);
    fs.unlinkSync(srcPath);

    console.log('🔄 Smart move completed with code updates');
    console.log('💡 You may need to manually update imports in other files that reference this module');

  } catch (error) {
    console.log('❌ AI processing failed, falling back to simple move');
    await simpleMoveFile(srcPath, destPath, content);
  }
}

async function refactorMoveFile(srcPath: string, destPath: string, content: string, language: string, question: Function) {
  const improvements = await question('✨ Describe improvements to make during the move: ');
  
  console.log('\n🤖 Refactoring and moving file...\n');

  const prompt = `You are an expert ${language} developer. I'm moving and refactoring a file from "${srcPath}" to "${destPath}".

Current file content:
\`\`\`${language.toLowerCase()}
${content}
\`\`\`

Please:
1. Update any imports/exports for the new location
2. Apply these improvements: ${improvements}
3. Follow ${language} best practices
4. Maintain existing functionality
5. Add helpful comments for changes

Return the improved and location-updated file content:`;

  try {
    const refactoredContent = await generateResponse(prompt);

    // Create destination directory if needed
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
      console.log(`📁 Created directory: ${destDir}`);
    }

    // Write refactored content
    fs.writeFileSync(destPath, refactoredContent);
    fs.unlinkSync(srcPath);

    console.log('♻️  Refactor move completed!');
    console.log('\n--- Refactored Content ---');
    console.log(refactoredContent);

  } catch (error) {
    console.log('❌ AI processing failed, falling back to simple move');
    await simpleMoveFile(srcPath, destPath, content);
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