#!/usr/bin/env node
import { Command } from 'commander';
import { join } from 'path';

const program = new Command();
program
  .name('codeagent')
  .description('A local Claude Code-style terminal assistant for your codebase')
  .version('0.1.0');

program
  .command('plan')
  .description('Create or load Claude-style task plans')
  .action(async () => {
    const { planCommand } = await import('./commands/plan');
    await planCommand();
  });

program
  .command('edit <file>')
  .description('Edit a code file with the model')
  .action(async (file) => {
    const { editCommand } = await import('./commands/edit');
    await editCommand(file);
  });

program
  .command('write <file>')
  .description('Create a new file')
  .action(async (file) => {
    const { writeCommand } = await import('./commands/write');
    await writeCommand(file);
  });

program
  .command('move <src> <dest>')
  .description('Move/rename files')
  .action(async (src, dest) => {
    const { moveCommand } = await import('./commands/move');
    await moveCommand(src, dest);
  });

program
  .command('ask <question...>')
  .description('Ask questions about the codebase')
  .action(async (question) => {
    const { askCommand } = await import('./commands/ask');
    await askCommand(question.join(' '));
  });

program.parse(process.argv); 