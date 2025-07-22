/**
 * Compound Operation Executor
 * Executes multiple operations in sequence with dependency management
 * Based on claude-prompter architectural analysis
 */

import { Operation, CompoundIntent } from './compoundIntentRecognizer';
import { writeCommand } from '../commands/write';
import { editCommand } from '../commands/edit';
import { moveCommand } from '../commands/move';
import { planCommand } from '../commands/plan';
import { ImprovedTerminalUI } from './improvedTerminalUI';
import { TerminalFormatter } from './terminalFormatter';
import { CleanFormatter } from './cleanFormatter';

export interface ExecutionResult {
  success: boolean;
  completedOperations: Operation[];
  failedOperations: Array<{operation: Operation, error: string}>;
  summary: string;
  warnings: string[];
}

export interface ExecutionContext {
  createdFiles: string[];
  modifiedFiles: string[];
  contextData: Map<string, any>;
}

/**
 * Main execution function for compound operations
 */
export async function executeCompoundIntent(compoundIntent: CompoundIntent): Promise<ExecutionResult> {
  const { operations, context, originalInput } = compoundIntent;
  
  // Start main execution loading indicator
  const ui = new ImprovedTerminalUI();
  ui.startLoading(`🚀 Executing ${operations.length} operation(s) from your request`);
  
  // Give user a moment to see the loading indicator
  await new Promise(resolve => setTimeout(resolve, 800));
  ui.stopLoading();
  
  console.log(CleanFormatter.info(`Original request: "${originalInput}"`));
  console.log();
  
  const result: ExecutionResult = {
    success: true,
    completedOperations: [],
    failedOperations: [],
    summary: '',
    warnings: []
  };
  
  const executionContext: ExecutionContext = {
    createdFiles: [],
    modifiedFiles: [],
    contextData: new Map()
  };
  
  // Execute operations in sequence
  for (let i = 0; i < operations.length; i++) {
    const operation = operations[i];
    
    console.log(CleanFormatter.progress(`\n📋 Step ${i + 1}/${operations.length}: ${getOperationDescription(operation)}`));
    
    // Start step-specific loading indicator
    const stepUI = new ImprovedTerminalUI();
    stepUI.startLoading(`Processing ${operation.intent} operation`);
    
    try {
      // Check dependencies before execution
      const depCheck = await checkDependencies(operation, executionContext);
      if (!depCheck.satisfied) {
        stepUI.stopLoading();
        throw new Error(`Dependencies not satisfied: ${depCheck.missingDeps.join(', ')}`);
      }
      
      // Execute the operation
      const operationResult = await executeOperation(operation, executionContext, context);
      
      stepUI.stopLoading();
      
      if (operationResult.success) {
        result.completedOperations.push(operation);
        console.log(CleanFormatter.success(`✅ Step ${i + 1} completed successfully`));
        
        // Update execution context
        updateExecutionContext(executionContext, operation, operationResult);
        
      } else {
        throw new Error(operationResult.error || 'Operation failed');
      }
      
    } catch (error) {
      stepUI.stopLoading();
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.failedOperations.push({ operation, error: errorMsg });
      result.success = false;
      
      console.log(CleanFormatter.error(`❌ Step ${i + 1} failed: ${errorMsg}`));
      
      // Decide whether to continue or abort
      if (isBlockingFailure(operation, operations)) {
        console.log(CleanFormatter.warning('🛑 Aborting remaining operations due to blocking failure'));
        break;
      } else {
        console.log(CleanFormatter.warning('⚠️  Continuing with remaining operations...'));
        result.warnings.push(`Step ${i + 1} failed but continuing: ${errorMsg}`);
      }
    }
  }
  
  // Generate summary
  result.summary = generateExecutionSummary(result, operations.length);
  
  console.log('\n' + result.summary);
  
  return result;
}

/**
 * Execute a single operation
 */
async function executeOperation(
  operation: Operation, 
  context: ExecutionContext,
  intentContext: CompoundIntent['context']
): Promise<{success: boolean, error?: string, result?: any}> {
  
  try {
    switch (operation.intent) {
      case 'write':
        await executeWriteOperation(operation, context);
        return { success: true };
        
      case 'edit':
        await executeEditOperation(operation, context, intentContext);
        return { success: true };
        
      case 'move':
        await executeMoveOperation(operation, context);
        return { success: true };
        
      case 'plan':
        await executePlanOperation(operation, context);
        return { success: true };
        
      default:
        return { success: false, error: `Unsupported operation: ${operation.intent}` };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Execute write operation (create file)
 */
async function executeWriteOperation(operation: Operation, context: ExecutionContext): Promise<void> {
  console.log(CleanFormatter.info(`   Creating: ${operation.target}`));
  console.log(CleanFormatter.info(`   Description: ${operation.description}`));
  
  await writeCommand(operation.target, operation.description);
  context.createdFiles.push(operation.target);
}

/**
 * Execute edit operation (modify existing file)
 */
async function executeEditOperation(
  operation: Operation, 
  context: ExecutionContext,
  intentContext: CompoundIntent['context']
): Promise<void> {
  console.log(CleanFormatter.info(`   Editing: ${operation.target}`));
  console.log(CleanFormatter.info(`   Description: ${operation.description}`));
  
  // For HTML + CSS linking, we need special handling
  if (intentContext?.relationships?.some(rel => rel.type === 'link')) {
    await executeHTMLCSSLinking(operation, context, intentContext);
  } else {
    // Standard edit operation
    await editCommand(operation.target, operation.description);
  }
  
  context.modifiedFiles.push(operation.target);
}

/**
 * Special handler for HTML + CSS linking
 */
async function executeHTMLCSSLinking(
  operation: Operation,
  context: ExecutionContext, 
  intentContext: CompoundIntent['context']
): Promise<void> {
  
  // Find the CSS file that was created
  const cssFile = context.createdFiles.find(file => file.endsWith('.css'));
  if (!cssFile) {
    throw new Error('No CSS file found to link to HTML');
  }
  
  // Extract just the filename (remove folder path for relative linking)
  const cssFileName = cssFile.split('/').pop() || cssFile;
  
  // Create a specific edit description for HTML + CSS linking
  const linkingDescription = `Remove any existing inline styles from the <style> tags and replace with a link to the external CSS file "${cssFileName}". Add the CSS link in the <head> section as: <link rel="stylesheet" href="${cssFileName}">. Keep all existing HTML structure intact.`;
  
  await editCommand(operation.target, linkingDescription);
}

/**
 * Execute move operation
 */
async function executeMoveOperation(operation: Operation, context: ExecutionContext): Promise<void> {
  console.log(CleanFormatter.info(`   Moving: ${operation.target}`));
  
  // Parse move operation (format: "source dest")
  const parts = operation.target.split(' ');
  if (parts.length !== 2) {
    throw new Error('Move operation requires source and destination');
  }
  
  await moveCommand(parts[0], parts[1]);
}

/**
 * Execute plan operation
 */
async function executePlanOperation(operation: Operation, context: ExecutionContext): Promise<void> {
  console.log(CleanFormatter.info(`   Planning: ${operation.description}`));
  
  await planCommand(operation.description);
}

/**
 * Check if operation dependencies are satisfied
 */
async function checkDependencies(
  operation: Operation, 
  context: ExecutionContext
): Promise<{satisfied: boolean, missingDeps: string[]}> {
  
  const missingDeps: string[] = [];
  
  if (operation.dependencies) {
    for (const dep of operation.dependencies) {
      // Check if dependency was created or exists
      const depExists = context.createdFiles.includes(dep) || 
                       context.modifiedFiles.includes(dep) ||
                       await fileExists(dep);
      
      if (!depExists) {
        missingDeps.push(dep);
      }
    }
  }
  
  return {
    satisfied: missingDeps.length === 0,
    missingDeps
  };
}

/**
 * Update execution context after successful operation
 */
function updateExecutionContext(
  context: ExecutionContext, 
  operation: Operation, 
  result: {success: boolean, result?: any}
): void {
  
  // Store operation result in context for future operations
  context.contextData.set(operation.target, {
    operation,
    result: result.result,
    timestamp: new Date()
  });
}

/**
 * Check if a failure should block remaining operations
 */
function isBlockingFailure(failedOperation: Operation, allOperations: Operation[]): boolean {
  // If any subsequent operation depends on this one, it's blocking
  return allOperations.some(op => 
    op.dependencies?.includes(failedOperation.target)
  );
}

/**
 * Generate human-readable operation description
 */
function getOperationDescription(operation: Operation): string {
  const actionMap = {
    write: 'Create',
    edit: 'Modify', 
    move: 'Move',
    plan: 'Plan'
  };
  
  const action = actionMap[operation.intent] || operation.intent;
  return `${action} ${operation.target}`;
}

/**
 * Generate execution summary
 */
function generateExecutionSummary(result: ExecutionResult, totalOperations: number): string {
  const { completedOperations, failedOperations, warnings } = result;
  
  let summary = `\n🎯 Execution Summary:\n`;
  summary += `   ✅ Completed: ${completedOperations.length}/${totalOperations} operations\n`;
  
  if (failedOperations.length > 0) {
    summary += `   ❌ Failed: ${failedOperations.length} operations\n`;
  }
  
  if (warnings.length > 0) {
    summary += `   ⚠️  Warnings: ${warnings.length}\n`;
  }
  
  // List completed operations
  if (completedOperations.length > 0) {
    summary += `\n📄 Created/Modified Files:\n`;
    completedOperations.forEach(op => {
      const icon = op.intent === 'write' ? '📝' : op.intent === 'edit' ? '✏️' : '🔧';
      summary += `   ${icon} ${op.target}\n`;
    });
  }
  
  if (result.success) {
    summary += `\n🎉 All operations completed successfully!`;
  } else {
    summary += `\n⚠️  Some operations failed, but others completed successfully.`;
  }
  
  return summary;
}

/**
 * Check if file exists (async)
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    const fs = await import('fs/promises');
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}