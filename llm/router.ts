import axios from 'axios';
import fs from 'fs';
import path from 'path';

interface LLMConfig {
  model: string;
  ollama_url: string;
  temperature: number;
  max_tokens: number;
}

interface OllamaRequest {
  model: string;
  prompt: string;
  stream: boolean;
  options: {
    temperature: number;
    num_predict: number;
  };
}

interface OllamaResponse {
  response: string;
  done: boolean;
}

export function getModelConfig(): LLMConfig {
  const configPath = path.join(__dirname, '../llm.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return config as LLMConfig;
}

export async function generateResponse(prompt: string): Promise<string> {
  const config = getModelConfig();
  
  const request: OllamaRequest = {
    model: config.model,
    prompt: prompt,
    stream: false,
    options: {
      temperature: config.temperature,
      num_predict: config.max_tokens
    }
  };

  try {
    const response = await axios.post<OllamaResponse>(
      `${config.ollama_url}/api/generate`,
      request,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );

    if (response.data && response.data.response) {
      return response.data.response.trim();
    } else {
      throw new Error('Invalid response from Ollama');
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to Ollama. Is Ollama running on localhost:11434?');
      }
      if (error.response?.status === 404) {
        throw new Error(`Model '${config.model}' not found. Run: ollama pull ${config.model}`);
      }
      throw new Error(`Ollama API error: ${error.message}`);
    }
    throw new Error(`Unexpected error: ${error}`);
  }
} 