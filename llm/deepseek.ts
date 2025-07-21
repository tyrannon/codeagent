// deepseek.ts - LLM wrapper for DeepSeek-Coder via Ollama
import axios from 'axios';
import fs from 'fs';

interface LLMConfig {
  model: string;
  ollama_url: string;
  temperature?: number;
  max_tokens?: number;
}

function loadConfig(): LLMConfig {
  const raw = fs.readFileSync('codeagent/llm.json', 'utf-8');
  return JSON.parse(raw);
}

export async function callDeepSeek(prompt: string, options = {}) {
  const config = loadConfig();
  try {
    const response = await axios.post(
      `${config.ollama_url}/api/generate`,
      {
        model: config.model,
        prompt,
        options: {
          temperature: config.temperature,
          max_tokens: config.max_tokens,
          ...options,
        },
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    // Ollama streams responses, but for simplicity, expect a .data.response
    return response.data.response || response.data;
  } catch (err: any) {
    throw new Error('Ollama API error: ' + (err.response?.data?.error || err.message));
  }
} 