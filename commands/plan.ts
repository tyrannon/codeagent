// plan.ts - Create or load Claude-style task plans
import fs from 'fs';
import path from 'path';
import { generateResponse } from '../llm/router';
import { createInterface } from 'readline';

const planPath = path.join(__dirname, '../memory/CLAUDE.md');

export async function planCommand() {
  console.log('🚀 Welcome to CodeAgent Plan Mode!\n');

  // Check if plan exists
  if (!fs.existsSync(planPath)) {
    fs.writeFileSync(planPath, '# CodeAgent Plan Memory\n\n---\n');
    console.log('📝 Created new plan memory file.\n');
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
    console.log('Choose an option:');
    console.log('1. 📖 View current plan');
    console.log('2. ✨ Generate new plan with AI');
    console.log('3. 🔄 Update existing plan with AI');
    
    const choice = await question('\nEnter choice (1-3): ');

    switch (choice.trim()) {
      case '1':
        await viewCurrentPlan();
        break;
      case '2':
        await generateNewPlan(question);
        break;
      case '3':
        await updateExistingPlan(question);
        break;
      default:
        console.log('❌ Invalid choice. Showing current plan...');
        await viewCurrentPlan();
    }
  } catch (error) {
    console.error('❌ Error in plan command:', error.message);
  } finally {
    rl.close();
  }
}

async function viewCurrentPlan() {
  const plan = fs.readFileSync(planPath, 'utf-8');
  console.log('\n📋 --- Current Plan Memory ---\n');
  console.log(plan);
}

async function generateNewPlan(question: Function) {
  const projectDescription = await question('💭 Describe your project/task: ');
  
  console.log('\n🤖 Generating plan with DeepSeek-Coder...\n');

  const prompt = `You are a helpful coding assistant. Create a detailed, actionable plan for the following project:

"${projectDescription}"

Please provide:
1. Project overview and goals
2. Step-by-step implementation plan
3. Technical considerations
4. Potential challenges and solutions

Format as markdown with clear sections and actionable steps.`;

  try {
    const aiPlan = await generateResponse(prompt);
    const formattedPlan = `# CodeAgent Plan Memory

## Project: ${projectDescription}

---

${aiPlan}

---
*Generated with DeepSeek-Coder at ${new Date().toISOString()}*
`;

    fs.writeFileSync(planPath, formattedPlan);
    console.log('✅ New AI-generated plan saved!\n');
    console.log(formattedPlan);
  } catch (error) {
    console.error('❌ Failed to generate plan:', error.message);
    console.log('💡 Make sure Ollama is running: `ollama serve`');
    console.log('💡 And DeepSeek-Coder is installed: `ollama pull deepseek-coder:6.7b`');
  }
}

async function updateExistingPlan(question: Function) {
  const currentPlan = fs.readFileSync(planPath, 'utf-8');
  const updateRequest = await question('🔄 What updates do you want to make? ');
  
  console.log('\n🤖 Updating plan with DeepSeek-Coder...\n');

  const prompt = `You are a helpful coding assistant. Here is the current project plan:

${currentPlan}

The user wants to make this update: "${updateRequest}"

Please revise the plan accordingly, maintaining the same format but incorporating the requested changes. Keep what's still relevant and update/add new sections as needed.`;

  try {
    const updatedPlan = await generateResponse(prompt);
    const finalPlan = `${updatedPlan}

---
*Updated with DeepSeek-Coder at ${new Date().toISOString()}*
`;

    fs.writeFileSync(planPath, finalPlan);
    console.log('✅ Plan updated successfully!\n');
    console.log(finalPlan);
  } catch (error) {
    console.error('❌ Failed to update plan:', error.message);
    console.log('💡 Make sure Ollama is running: `ollama serve`');
    console.log('💡 And DeepSeek-Coder is installed: `ollama pull deepseek-coder:6.7b`');
  }
} 