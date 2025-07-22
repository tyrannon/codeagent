// ask.ts - Ask questions about the codebase
import { generateResponse } from '../llm/router';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { CodeAnalyzer } from '../utils/codeAnalyzer';
import { TemplateFactory } from '../utils/responseTemplates';
import { TerminalFormatter } from '../utils/terminalFormatter';

export async function askCommand(question: string) {
  console.log(TerminalFormatter.info('🤖 Analyzing your codebase to answer your question...\n'));

  try {
    // Get codebase context
    const codebaseContext = await getCodebaseContext();
    
    const prompt = `You are an expert software architect analyzing a TypeScript CLI codebase. Here's comprehensive analysis of the current project:

## Project Information:
${codebaseContext.projectInfo}

## Code Analysis Results:
**Architectural Patterns Detected:**
${codebaseContext.codeAnalysis.insights.map(insight => 
  `- ${insight.pattern} (${Math.round(insight.confidence * 100)}% confidence)
    Evidence: ${insight.description}
    Files: ${insight.files.join(', ')}
    Examples: ${insight.evidence.slice(0, 2).join('; ')}`
).join('\n')}

**Project Metrics:**
- Files Analyzed: ${codebaseContext.codeAnalysis.metrics.totalFiles}
- Classes: ${codebaseContext.codeAnalysis.metrics.totalClasses}
- Functions: ${codebaseContext.codeAnalysis.metrics.totalFunctions}
- Interfaces: ${codebaseContext.codeAnalysis.metrics.totalInterfaces}
- Design Patterns: ${codebaseContext.codeAnalysis.metrics.designPatterns}
- Complexity Score: ${codebaseContext.codeAnalysis.metrics.complexityScore}/10

**Code Structure Analysis:**
${codebaseContext.structure}

**Specific Code Examples:**
${codebaseContext.codeAnalysis.patterns.filter(p => p.type === 'class' || p.type === 'function').slice(0, 5).map(pattern => 
  `- ${pattern.type}: ${pattern.name} in ${pattern.file}:${pattern.lineNumber}
    ${pattern.description}`
).join('\n')}

## Key Configuration Files:
${codebaseContext.keyFiles}

## User Question:
"${question}"

Based on the comprehensive analysis above, provide a detailed, accurate answer that:
1. References specific files, line numbers, and code examples from the analysis
2. Explains architectural decisions with evidence from the detected patterns
3. Provides implementation details and trade-offs where relevant
4. Uses concrete examples from this specific codebase (not generic advice)
5. Includes confidence levels and justifications for your conclusions

Answer with technical depth and specific evidence from the codebase analysis.`;

    console.log(TerminalFormatter.info('🧠 DeepSeek-Coder is thinking deeply...\n'));
    const baseResponse = await generateResponse(prompt);
    
    // Apply enhanced response template
    const template = TemplateFactory.getTemplate(question);
    const enhancedResponse = template.generateResponse(question, codebaseContext.codeAnalysis, baseResponse);
    
    // Format the response with beautiful colors and emojis
    const formattedResponse = TerminalFormatter.formatResponse(enhancedResponse);
    
    console.log(TerminalFormatter.createSection('🎯 AI Analysis Results', formattedResponse, '🔍'));
    console.log('\n' + TerminalFormatter.colors.brightCyan + '═'.repeat(70) + TerminalFormatter.colors.reset);
    console.log(TerminalFormatter.emphasize('Tip: For more specific help, try asking about particular files or functions!'));
    
  } catch (error) {
    console.log(TerminalFormatter.error(`Error: ${error.message}`));
    console.log(TerminalFormatter.warning('Make sure Ollama is running: `ollama serve`'));
    console.log(TerminalFormatter.warning('And DeepSeek-Coder is installed: `ollama pull deepseek-coder:6.7b`'));
  }
}

async function getCodebaseContext() {
  const projectRoot = process.cwd();
  
  // Advanced code analysis
  console.log('🔍 Performing deep code analysis...');
  const analyzer = new CodeAnalyzer(projectRoot);
  const analysis = await analyzer.analyzeProject();
  
  // Get key configuration files
  const keyFiles = await getKeyFilesContent();
  
  // Get project info
  const projectInfo = getProjectInfo();
  
  return {
    structure: analysis.structure,
    keyFiles,
    projectInfo,
    codeAnalysis: analysis
  };
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