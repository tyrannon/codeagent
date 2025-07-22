/**
 * Self-Improvement Command
 * 
 * This command allows CodeAgent to analyze itself and suggest/apply improvements
 * based on claude.md instructions and code analysis.
 */

import { feedbackLoop } from '../utils/feedbackLoop';
import { claudeReader } from '../utils/claudeReader';
import { TerminalUI } from '../utils/terminalUI';
import { TerminalFormatter } from '../utils/terminalFormatter';
import * as readline from 'readline';

export async function improveCommand(options?: {
  analyze?: boolean;
  suggest?: boolean;
  apply?: string;
  auto?: boolean;
}): Promise<void> {
  const ui = new TerminalUI();
  
  console.log(TerminalFormatter.emphasize('🚀 CodeAgent Self-Improvement Mode'));
  console.log();

  // Check if self-improvement is enabled in claude.md
  const isEnabled = await claudeReader.isSelfImprovementEnabled();
  if (!isEnabled) {
    console.log(TerminalFormatter.warning('⚠️ Self-improvement is not enabled in claude.md'));
    console.log('Add self-improvement configuration to claude.md to enable this feature.');
    return;
  }

  const config = await claudeReader.getSelfImprovementConfig();
  console.log(TerminalFormatter.info('📋 Self-Improvement Configuration:'));
  console.log(`  • Auto-apply patches: ${config?.autoApplyPatches ? '✅' : '❌'}`);
  console.log(`  • Requires approval: ${config?.requiresApproval ? '✅' : '❌'}`);
  console.log(`  • Analysis interval: ${config?.analysisInterval} hours`);
  console.log(`  • Improvement areas: ${config?.improvementAreas?.join(', ')}`);
  console.log();

  // Start feedback session
  ui.startLoading('🔄 Starting self-improvement session...');
  const session = await feedbackLoop.startSession();
  ui.stopLoading();

  try {
    // Step 1: Analyze codebase
    if (options?.analyze !== false) {
      console.log(TerminalFormatter.createSection('Phase 1: Code Analysis', '', '📊'));
      ui.startLoading('🔍 Analyzing codebase architecture and patterns...');
      
      const results = await feedbackLoop.analyzeCodebase();
      ui.stopLoading();
      
      console.log(TerminalFormatter.success(`✅ Analyzed ${results.length} files`));
      
      // Show summary of findings
      let totalComplexity = 0;
      let totalIssues = 0;
      
      for (const result of results) {
        totalComplexity += result.metrics.complexity;
        totalIssues += result.issues.length;
      }
      
      console.log(`  • Average complexity: ${(totalComplexity / results.length).toFixed(2)}`);
      console.log(`  • Total issues found: ${totalIssues}`);
      console.log();
    }

    // Step 2: Generate suggestions
    if (options?.suggest !== false) {
      console.log(TerminalFormatter.createSection('Phase 2: Generating Suggestions', '', '💡'));
      ui.startLoading('🤖 Using AI to generate improvement suggestions...');
      
      const suggestions = await feedbackLoop.generateSuggestions();
      ui.stopLoading();
      
      console.log(TerminalFormatter.success(`✅ Generated ${suggestions.length} improvement suggestions`));
      console.log();
      
      // Display suggestions
      for (const [index, suggestion] of suggestions.entries()) {
        const riskColor = suggestion.risk === 'high' ? 'red' : suggestion.risk === 'medium' ? 'yellow' : 'green';
        const impactEmoji = suggestion.impact === 'high' ? '🔥' : suggestion.impact === 'medium' ? '⭐' : '•';
        
        console.log(`${index + 1}. ${impactEmoji} ${TerminalFormatter.bold(suggestion.title)}`);
        console.log(`   Type: ${suggestion.type} | Impact: ${suggestion.impact} | Risk: ${TerminalFormatter.color(suggestion.risk, riskColor as any)}`);
        console.log(`   ${suggestion.description}`);
        console.log(`   Files: ${suggestion.files.join(', ')}`);
        console.log(`   Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`);
        console.log();
      }

      // Interactive mode: ask which suggestions to apply
      if (!options?.auto && !options?.apply) {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const question = (prompt: string): Promise<string> => {
          return new Promise(resolve => {
            rl.question(prompt, resolve);
          });
        };

        // Show first few suggestions for demo
        console.log('\n🎯 Ready to apply improvements!');
        console.log('Top suggestions found:');
        
        suggestions.slice(0, 3).forEach((sugg, idx) => {
          console.log(`${idx + 1}. ${sugg.title}`);
          console.log(`   Risk: ${sugg.risk} | Confidence: ${Math.round(sugg.confidence * 100)}%`);
        });

        console.log(TerminalFormatter.createSection('Apply Improvements', '', '🎯'));
        const answer = await question('Enter suggestion numbers to apply (comma-separated) or "none" to skip: ');
        rl.close();

        if (answer.toLowerCase() !== 'none') {
          const indices = answer.split(',').map(n => parseInt(n.trim()) - 1);
          
          for (const index of indices) {
            if (index >= 0 && index < suggestions.length) {
              const suggestion = suggestions[index];
              console.log(`\n🔧 Applying: ${suggestion.title}`);
              
              const success = await feedbackLoop.applySuggestion(
                suggestion.id, 
                config?.requiresApproval || suggestion.risk === 'high'
              );
              
              if (success) {
                console.log(TerminalFormatter.success('✅ Applied successfully!'));
              } else {
                console.log(TerminalFormatter.warning('⚠️ Suggestion requires manual approval or failed to apply'));
              }
            }
          }
        }
      }

      // Auto mode: apply low-risk suggestions automatically
      if (options?.auto || (suggestions.some(s => s.risk === 'low' && s.title.includes('console.log')))) {
        console.log(TerminalFormatter.createSection('Auto-Applying Low-Risk Improvements', '', '🤖'));
        
        const lowRiskSuggestions = suggestions.filter(s => s.risk === 'low' && s.confidence > 0.8);
        
        // Always auto-apply console.log fixes (they're safe)
        const consoleLogSuggestions = lowRiskSuggestions.filter(s => s.title.includes('console.log'));
        
        for (const suggestion of consoleLogSuggestions) {
          console.log(`\n🔧 Auto-applying: ${suggestion.title}`);
          const success = await feedbackLoop.applySuggestion(suggestion.id, false);
          
          if (success) {
            console.log(TerminalFormatter.success('✅ Applied successfully!'));
          } else {
            console.log(TerminalFormatter.error('❌ Failed to apply'));
          }
        }

        // For other low-risk suggestions, only apply in explicit auto mode
        if (options?.auto && config?.autoApplyPatches) {
          const otherSuggestions = lowRiskSuggestions.filter(s => !s.title.includes('console.log'));
          
          for (const suggestion of otherSuggestions) {
            console.log(`\n🔧 Auto-applying: ${suggestion.title}`);
            const success = await feedbackLoop.applySuggestion(suggestion.id, false);
            
            if (success) {
              console.log(TerminalFormatter.success('✅ Applied successfully!'));
            } else {
              console.log(TerminalFormatter.error('❌ Failed to apply'));
            }
          }
        }
      }
    }

    // Apply specific suggestion by ID
    if (options?.apply) {
      const suggestions = await feedbackLoop.generateSuggestions();
      const suggestion = suggestions.find(s => s.id === options.apply);
      
      if (suggestion) {
        console.log(`\n🔧 Applying suggestion: ${suggestion.title}`);
        const success = await feedbackLoop.applySuggestion(suggestion.id, config?.requiresApproval);
        
        if (success) {
          console.log(TerminalFormatter.success('✅ Applied successfully!'));
        } else {
          console.log(TerminalFormatter.error('❌ Failed to apply or requires approval'));
        }
      } else {
        console.log(TerminalFormatter.error(`❌ Suggestion with ID ${options.apply} not found`));
      }
    }

    // End session and show metrics
    console.log(TerminalFormatter.createSection('Session Summary', '', '📈'));
    const endedSession = await feedbackLoop.endSession();
    
    console.log('📊 Final Metrics:');
    console.log(`  • Code Quality: ${endedSession.metrics.codeQuality}/100`);
    console.log(`  • Performance: ${endedSession.metrics.performance}/100`);
    console.log(`  • User Experience: ${endedSession.metrics.userExperience}/100`);
    console.log();
    console.log(`💡 Total suggestions: ${endedSession.suggestions.length}`);
    console.log(`✅ Applied improvements: ${endedSession.appliedSuggestions.length}`);

  } catch (error) {
    ui.stopLoading();
    console.log(TerminalFormatter.error(`❌ Self-improvement failed: ${error}`));
    
    // Try to end session gracefully
    try {
      await feedbackLoop.endSession();
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// CLI integration helper
export function registerImproveCommand(program: any): void {
  program
    .command('improve')
    .description('Run self-improvement analysis and apply suggested changes')
    .option('-a, --analyze', 'Run code analysis (default: true)')
    .option('-s, --suggest', 'Generate improvement suggestions (default: true)')
    .option('--apply <id>', 'Apply a specific suggestion by ID')
    .option('--auto', 'Automatically apply low-risk improvements')
    .action(improveCommand);
}