/**
 * Advanced LLM Router with Multi-Model Support
 * Features: Auto-routing, user preferences, performance tracking, health monitoring
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface ModelConfig {
  name: string;
  ollama_url: string;
  temperature: number;
  max_tokens: number;
  use_cases: string[];
  specializations?: string[];
  strengths?: string[];
  thinking_enabled?: boolean;
  health?: ModelHealth;
  performance?: ModelPerformance;
}

interface ModelHealth {
  status: 'healthy' | 'degraded' | 'unavailable' | 'unknown';
  lastChecked: Date;
  responseTime?: number;
  errorRate?: number;
  lastError?: string;
}

interface ModelPerformance {
  totalRequests: number;
  successfulRequests: number;
  averageResponseTime: number;
  lastUsed: Date;
  successRate: number;
}

interface UserPreferences {
  defaultModel?: keyof MultiModelConfig['models'];
  fileExtensionOverrides?: Record<string, keyof MultiModelConfig['models']>;
  alwaysShowReasoning?: boolean;
  preferredTemperature?: Record<keyof MultiModelConfig['models'], number>;
  enableHealthChecks?: boolean;
  preferCodeModel?: boolean;
  enableThinkingMode?: boolean;
  compoundOperationPreference?: 'analysis' | 'code' | 'auto';
  showThinkingText?: boolean;
  formatThinkingText?: boolean;
}

interface MultiModelConfig {
  models: {
    code: ModelConfig;
    analysis: ModelConfig;
    creative: ModelConfig;
    fallback: ModelConfig;
  };
  routing: {
    default: keyof MultiModelConfig['models'];
    auto_detect: boolean;
    confidence_threshold: number;
    enable_performance_tracking: boolean;
    enable_health_checks: boolean;
    qwen_specific?: {
      use_thinking_for_compound: boolean;
      thinking_threshold_complexity: number;
      favor_analysis_model?: boolean;
      analysis_weight_multiplier?: number;
      question_detection_boost?: number;
      code_model_file_types: string[];
      analysis_model_operations: string[];
      force_analysis_for_compound: boolean;
      force_analysis_for_questions?: boolean;
    };
  };
  user_preferences?: UserPreferences;
}

interface ContentClassification {
  type: 'code' | 'analysis' | 'creative' | 'mixed' | 'compound';
  confidence: number;
  suggestedModel: keyof MultiModelConfig['models'];
  reasoning: string;
  fileExtensionBonus?: boolean;
  userOverride?: boolean;
  isCompound?: boolean;
  complexity?: number;
  requiresThinking?: boolean;
}

interface ModelSelectionResult {
  selectedModel: keyof MultiModelConfig['models'];
  reasoning: string;
  confidence: number;
  override: 'user' | 'extension' | 'auto' | 'default';
  alternatives?: Array<{
    model: keyof MultiModelConfig['models'];
    score: number;
    reason: string;
  }>;
}

// Enhanced content type indicators for Qwen routing - HEAVILY FAVORING QWEN3 FOR ANALYSIS
const CREATIVE_INDICATORS = [
  'song', 'poem', 'story', 'joke', 'haiku', 'lyrics', 'creative', 
  'funny', 'humor', 'narrative', 'tale', 'adventure', 'fantasy',
  'comedy', 'romance', 'mystery', 'drama', 'character', 'dialogue',
  'plot', 'write a song', 'write a poem', 'tell me a story'
];

const CODE_INDICATORS = [
  'function', 'class', 'component', 'script', 'algorithm', 
  'method', 'implementation', 'interface', 'module', 'library',
  'framework', 'database', 'query', 'endpoint', 'service', 'debug',
  'refactor', 'optimize', 'bug', 'error', 'compile', 'syntax',
  'variable', 'parameter', 'return', 'import', 'export', 'edit file',
  'create file', 'write file', 'modify code', 'fix code', 'generate code',
  'typescript', 'javascript', 'python', 'react', 'vue', 'angular'
];

// HEAVILY EXPANDED ANALYSIS INDICATORS - Route most questions and explanations to Qwen3
const ANALYSIS_INDICATORS = [
  // Documentation and guides
  'documentation', 'readme', 'guide', 'tutorial', 'manual', 
  'explanation', 'how-to', 'instructions', 'overview', 'summary',
  
  // Questions and explanations - HIGH PRIORITY for Qwen3
  'describe', 'explain', 'what is', 'how does', 'why does', 'purpose of',
  'what are', 'how can', 'what do', 'tell me', 'help me understand',
  'can you explain', 'walk me through', 'break down', 'clarify',
  'elaborate', 'define', 'meaning of', 'difference between', 'compare',
  'contrast', 'pros and cons', 'advantages', 'disadvantages',
  
  // Analysis and reasoning - TOP PRIORITY for Qwen3
  'analyze', 'analysis', 'architecture', 'design', 'strategy',
  'planning', 'requirements', 'complex reasoning', 'understand',
  'comprehensive', 'deep dive', 'investigate', 'research', 'review',
  'assess', 'evaluate', 'examine', 'study', 'inspect', 'audit',
  'critique', 'feedback', 'recommendation', 'suggest', 'advice',
  'best practices', 'optimization', 'improvement', 'enhancement',
  
  // Capabilities and general questions - ROUTE TO QWEN3
  'what can you do', 'capabilities', 'features', 'abilities', 'skills',
  'help with', 'assist with', 'support', 'what do you know',
  'can you help', 'are you able', 'do you support', 'how good are you',
  
  // Problem solving and logic - QWEN3 THINKING CAPABILITY
  'solve', 'solution', 'approach', 'methodology', 'process',
  'steps', 'workflow', 'procedure', 'logic', 'reasoning',
  'think through', 'work through', 'figure out', 'determine'
];

const COMPOUND_INDICATORS = [
  'and then', 'and also', 'create and', 'make and', 'write and',
  'first create', 'then modify', 'connect to', 'link to',
  'multiple', 'both', 'all of', 'several', 'compound operation'
];

// Comprehensive file extension mappings for Qwen routing
const FILE_EXTENSION_MAP: Record<string, keyof MultiModelConfig['models']> = {
  // Code files (Qwen2.5-coder optimized)
  '.js': 'code', '.ts': 'code', '.jsx': 'code', '.tsx': 'code',
  '.py': 'code', '.java': 'code', '.cpp': 'code', '.c': 'code',
  '.cs': 'code', '.go': 'code', '.rs': 'code', '.php': 'code',
  '.rb': 'code', '.swift': 'code', '.kt': 'code', '.scala': 'code',
  '.html': 'code', '.css': 'code', '.scss': 'code', '.sass': 'code',
  '.json': 'code', '.xml': 'code', '.yaml': 'code', '.yml': 'code',
  '.sql': 'code', '.sh': 'code', '.bash': 'code', '.zsh': 'code',
  '.dockerfile': 'code', '.makefile': 'code', '.toml': 'code',
  '.lock': 'code', '.gitignore': 'code', '.env': 'code',
  
  // Analysis/Documentation files (Qwen3 optimized)
  '.md': 'analysis', '.txt': 'analysis', '.rst': 'analysis',
  '.adoc': 'analysis', '.wiki': 'analysis', '.doc': 'analysis',
  
  // Creative content files
  '.poem': 'creative', '.story': 'creative', '.lyrics': 'creative',
  '.creative': 'creative'
};

export class EnhancedModelRouter {
  private config: MultiModelConfig;
  private userPreferences: UserPreferences;
  private performanceTracker: Map<string, ModelPerformance> = new Map();
  private healthStatus: Map<string, ModelHealth> = new Map();

  constructor() {
    this.config = this.loadConfig();
    this.userPreferences = this.loadUserPreferences();
    this.initializeTracking();
  }

  private loadConfig(): MultiModelConfig {
    const configPath = path.join(__dirname, '../llm.json');
    
    // Check if it's the new multi-model config
    if (fs.existsSync(configPath)) {
      const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      
      // If it's the old single-model config, convert it
      if (rawConfig.model && !rawConfig.models) {
        return this.convertLegacyConfig(rawConfig);
      }
      
      return rawConfig as MultiModelConfig;
    }
    
    // Return default config if file doesn't exist
    return this.getDefaultConfig();
  }

  private convertLegacyConfig(legacyConfig: any): MultiModelConfig {
    return {
      models: {
        code: {
          name: 'qwen2.5-coder:7b',
          ollama_url: legacyConfig.ollama_url,
          temperature: 0.1,
          max_tokens: 2048,
          use_cases: ['code_generation', 'code_editing', 'file_operations'],
          specializations: ['typescript', 'javascript', 'python'],
          strengths: ['precise_code_generation', 'syntax_accuracy']
        },
        analysis: {
          name: 'qwen3:latest',
          ollama_url: legacyConfig.ollama_url,
          temperature: 0.3,
          max_tokens: 3072,
          use_cases: ['analysis', 'documentation', 'complex_reasoning'],
          thinking_enabled: true
        },
        creative: {
          name: 'qwen3:latest',
          ollama_url: legacyConfig.ollama_url,
          temperature: 0.8,
          max_tokens: 1024,
          use_cases: ['songs', 'poems', 'stories']
        },
        fallback: {
          name: 'qwen2.5-coder:7b',
          ollama_url: legacyConfig.ollama_url,
          temperature: 0.4,
          max_tokens: 800,
          use_cases: ['simple_tasks']
        }
      },
      routing: {
        default: 'analysis',  // CHANGED: Default to Qwen3 for analysis capability
        auto_detect: true,
        confidence_threshold: 0.6,  // LOWERED: Make routing more sensitive
        enable_performance_tracking: true,
        enable_health_checks: true,
        qwen_specific: {
          use_thinking_for_compound: true,
          thinking_threshold_complexity: 0.5,  // LOWERED: Use thinking more often
          favor_analysis_model: true,  // NEW: Heavily favor Qwen3
          analysis_weight_multiplier: 3.0,  // NEW: 3x weight for analysis indicators
          question_detection_boost: 2.0,  // NEW: Boost question detection
          code_model_file_types: ['.ts', '.js', '.py', '.html', '.css'],
          analysis_model_operations: ['compound_planning', 'analysis'],
          force_analysis_for_compound: true
        }
      }
    };
  }

  private getDefaultConfig(): MultiModelConfig {
    return {
      models: {
        code: {
          name: 'qwen2.5-coder:7b',
          ollama_url: 'http://localhost:11434',
          temperature: 0.1,
          max_tokens: 2048,
          use_cases: ['code_generation', 'code_editing', 'file_operations'],
          specializations: ['typescript', 'javascript', 'python', 'go', 'rust'],
          strengths: ['precise_code_generation', 'syntax_accuracy']
        },
        analysis: {
          name: 'qwen3:latest',
          ollama_url: 'http://localhost:11434',
          temperature: 0.3,
          max_tokens: 3072,
          use_cases: ['analysis', 'documentation', 'complex_reasoning'],
          specializations: ['system_design', 'architecture_analysis'],
          strengths: ['deep_reasoning', 'thinking_capability'],
          thinking_enabled: true
        },
        creative: {
          name: 'qwen3:latest',
          ollama_url: 'http://localhost:11434',
          temperature: 0.8,
          max_tokens: 1024,
          use_cases: ['songs', 'poems', 'stories', 'creative_writing']
        },
        fallback: {
          name: 'qwen2.5-coder:7b',
          ollama_url: 'http://localhost:11434',
          temperature: 0.4,
          max_tokens: 800,
          use_cases: ['simple_tasks']
        }
      },
      routing: {
        default: 'analysis',  // CHANGED: Default to Qwen3 for analysis capability
        auto_detect: true,
        confidence_threshold: 0.6,  // LOWERED: Make routing more sensitive
        enable_performance_tracking: true,
        enable_health_checks: true,
        qwen_specific: {
          use_thinking_for_compound: true,
          thinking_threshold_complexity: 0.5,  // LOWERED: Use thinking more often
          favor_analysis_model: true,  // NEW: Heavily favor Qwen3
          analysis_weight_multiplier: 3.0,  // NEW: 3x weight for analysis indicators
          question_detection_boost: 2.0,  // NEW: Boost question detection
          code_model_file_types: ['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.rs', '.html', '.css'],
          analysis_model_operations: ['compound_planning', 'architecture_analysis', 'system_design', 'explanations', 'questions', 'capabilities'],
          force_analysis_for_compound: true,
          force_analysis_for_questions: true  // NEW: Always use Qwen3 for questions
        }
      }
    };
  }

  private enhancePromptForThinking(prompt: string, modelConfig: ModelConfig): string {
    if (!modelConfig.thinking_enabled) return prompt;
    
    return `<thinking>
Let me think about this step by step:
1. Analyze the request: ${prompt}
2. Consider the best approach
3. Plan the implementation or response
4. Execute the plan
</thinking>

${prompt}

Please provide a comprehensive and well-reasoned response.`;
  }

  private loadUserPreferences(): UserPreferences {
    const preferencesPath = path.join(os.homedir(), '.codeagent-preferences.json');
    
    if (fs.existsSync(preferencesPath)) {
      try {
        return JSON.parse(fs.readFileSync(preferencesPath, 'utf-8'));
      } catch (error) {
        console.warn('⚠️ Failed to load user preferences, using defaults');
      }
    }
    
    return {
      alwaysShowReasoning: false,
      enableHealthChecks: true,
      preferCodeModel: true,
      enableThinkingMode: false,
      compoundOperationPreference: 'auto',
      showThinkingText: false,  // Hide thinking text by default
      formatThinkingText: true   // Format thinking text when shown
    };
  }

  private saveUserPreferences(): void {
    const preferencesPath = path.join(os.homedir(), '.codeagent-preferences.json');
    
    try {
      fs.writeFileSync(preferencesPath, JSON.stringify(this.userPreferences, null, 2));
    } catch (error) {
      console.warn('⚠️ Failed to save user preferences');
    }
  }

  private initializeTracking(): void {
    Object.keys(this.config.models).forEach(modelKey => {
      const model = this.config.models[modelKey as keyof MultiModelConfig['models']];
      
      this.performanceTracker.set(model.name, {
        totalRequests: 0,
        successfulRequests: 0,
        averageResponseTime: 0,
        lastUsed: new Date(),
        successRate: 1.0
      });
      
      this.healthStatus.set(model.name, {
        status: 'unknown',
        lastChecked: new Date(),
        responseTime: undefined,
        errorRate: 0
      });
    });
  }

  public classifyContent(prompt: string, fileExtension?: string, userOverride?: keyof MultiModelConfig['models'], isCompound?: boolean): ContentClassification {
    const lowerPrompt = prompt.toLowerCase();
    let creativeScore = 0;
    let codeScore = 0;
    let analysisScore = 0;
    let compoundScore = 0;
    let fileExtensionBonus = false;
    let userOverrideFlag = false;
    let complexity = this.calculateComplexity(prompt);
    let requiresThinking = this.shouldUseThinking(prompt, complexity, isCompound);

    // Check for user override first
    if (userOverride) {
      userOverrideFlag = true;
      return {
        type: this.mapModelToType(userOverride),
        confidence: 1.0,
        suggestedModel: userOverride,
        reasoning: `User specified ${userOverride} model`,
        userOverride: true,
        isCompound: isCompound || false,
        complexity,
        requiresThinking
      };
    }

    // Check file extension overrides from user preferences
    if (fileExtension && this.userPreferences.fileExtensionOverrides?.[fileExtension]) {
      const preferredModel = this.userPreferences.fileExtensionOverrides[fileExtension];
      return {
        type: preferredModel === 'creative' ? 'creative' : preferredModel === 'documentation' ? 'documentation' : 'code',
        confidence: 0.9,
        suggestedModel: preferredModel,
        reasoning: `User preference override for ${fileExtension} files`,
        userOverride: true
      };
    }

    // Score based on keywords with HEAVILY WEIGHTED scoring for Qwen3 analysis
    const qwenConfig = this.config.routing.qwen_specific;
    const analysisMultiplier = qwenConfig?.analysis_weight_multiplier || 3.0;
    const questionBoost = qwenConfig?.question_detection_boost || 2.0;
    
    CREATIVE_INDICATORS.forEach(indicator => {
      if (lowerPrompt.includes(indicator)) {
        const weight = indicator.includes('write a') || indicator.includes('tell me') ? 2 : 1;
        creativeScore += weight;
      }
    });

    CODE_INDICATORS.forEach(indicator => {
      if (lowerPrompt.includes(indicator)) {
        const weight = indicator.includes('debug') || indicator.includes('error') || indicator.includes('implement') ? 2 : 1;
        codeScore += weight;
      }
    });

    // HEAVILY FAVOR ANALYSIS INDICATORS for Qwen3
    ANALYSIS_INDICATORS.forEach(indicator => {
      if (lowerPrompt.includes(indicator)) {
        let weight = 1;
        
        // High priority analytical terms get massive boost
        if (indicator.includes('analyze') || indicator.includes('explain') || indicator.includes('what is') || 
            indicator.includes('tell me') || indicator.includes('what can') || indicator.includes('what do')) {
          weight = questionBoost * 2; // 4x boost for questions
        } else if (indicator.includes('architecture') || indicator.includes('review') || indicator.includes('assess')) {
          weight = analysisMultiplier; // 3x boost for analysis
        } else {
          weight = analysisMultiplier * 0.7; // 2.1x boost for other analytical terms
        }
        
        analysisScore += weight;
      }
    });

    COMPOUND_INDICATORS.forEach(indicator => {
      if (lowerPrompt.includes(indicator)) {
        compoundScore += 2;
      }
    });

    // Boost compound score for detected compound operations
    if (isCompound) {
      compoundScore += 5;
    }

    // Enhanced file extension handling with Qwen-specific routing
    if (fileExtension) {
      const mappedModel = FILE_EXTENSION_MAP[fileExtension.toLowerCase()];
      if (mappedModel) {
        fileExtensionBonus = true;
        switch (mappedModel) {
          case 'creative':
            creativeScore += 3;
            break;
          case 'code':
            codeScore += 4; // Higher weight for code files with Qwen2.5-coder
            break;
          case 'analysis':
            analysisScore += 3;
            break;
        }
      }
      
      // Special handling for Qwen-optimized file types
      if (this.config.routing.qwen_specific?.code_model_file_types.includes(fileExtension.toLowerCase())) {
        codeScore += 2;
      }
    }

    // Determine primary type with Qwen-specific logic
    const maxScore = Math.max(creativeScore, codeScore, analysisScore, compoundScore);
    const totalScore = creativeScore + codeScore + analysisScore + compoundScore;
    
    let type: ContentClassification['type'];
    let suggestedModel: keyof MultiModelConfig['models'];
    let reasoning: string;

    // Force analysis model for compound operations if configured
    if (isCompound && this.config.routing.qwen_specific?.force_analysis_for_compound && requiresThinking) {
      type = 'compound';
      suggestedModel = 'analysis';
      reasoning = `Compound operation with high complexity (${complexity.toFixed(2)}) - using Qwen3 with thinking capability`;
    } else if (totalScore === 0) {
      type = 'analysis'; // CHANGED: Default to Qwen3 for analysis capability
      suggestedModel = this.userPreferences.defaultModel || this.config.routing.default;
      reasoning = 'No clear indicators found, using default Qwen3 model for analysis capability';
    } else if (compoundScore === maxScore && compoundScore > 0) {
      type = 'compound';
      suggestedModel = requiresThinking ? 'analysis' : 'code';
      reasoning = `Compound operation detected (score: ${compoundScore}, thinking: ${requiresThinking})`;
    } else if (creativeScore === maxScore && creativeScore > 0) {
      type = 'creative';
      suggestedModel = 'creative';
      reasoning = `Creative content detected (score: ${creativeScore}${fileExtensionBonus ? ', file extension bonus' : ''}) - using Qwen3`;
    } else if (codeScore === maxScore) {
      type = 'code';
      suggestedModel = 'code';
      reasoning = `Code content detected (score: ${codeScore}${fileExtensionBonus ? ', file extension bonus' : ''}) - using Qwen2.5-coder`;
    } else if (analysisScore === maxScore) {
      type = 'analysis';
      suggestedModel = 'analysis';
      reasoning = `Analysis content detected (score: ${analysisScore}${fileExtensionBonus ? ', file extension bonus' : ''}) - using Qwen3`;
    } else {
      type = 'mixed';
      suggestedModel = complexity > 0.7 ? 'analysis' : 'code';
      // For mixed content, heavily favor analysis model if configured
      if (qwenConfig?.favor_analysis_model && analysisScore > 0) {
        suggestedModel = 'analysis';
        reasoning = `Mixed content with analysis indicators detected - favoring Qwen3 (scores: code=${codeScore}, analysis=${analysisScore}, creative=${creativeScore}, compound=${compoundScore}, complexity=${complexity.toFixed(2)})`;
      } else {
        reasoning = `Mixed content detected (scores: code=${codeScore}, analysis=${analysisScore}, creative=${creativeScore}, compound=${compoundScore}, complexity=${complexity.toFixed(2)})`;
      }
    }

    const confidence = totalScore > 0 ? maxScore / totalScore : 0.5;

    return {
      type,
      confidence,
      suggestedModel,
      reasoning,
      fileExtensionBonus,
      userOverride: userOverrideFlag,
      isCompound,
      complexity,
      requiresThinking
    };
  }

  public selectModel(prompt: string, options?: {
    fileExtension?: string;
    forceModel?: keyof MultiModelConfig['models'];
    showReasoning?: boolean;
    isCompound?: boolean;
  }): ModelSelectionResult {
    const classification = this.classifyContent(prompt, options?.fileExtension, options?.forceModel, options?.isCompound);
    
    let selectedModel = classification.suggestedModel;
    let overrideType: ModelSelectionResult['override'] = 'auto';
    
    // Apply user override
    if (options?.forceModel) {
      selectedModel = options.forceModel;
      overrideType = 'user';
    } else if (classification.userOverride) {
      overrideType = 'user';
    } else if (classification.fileExtensionBonus) {
      overrideType = 'extension';
    } else if (classification.confidence < this.config.routing.confidence_threshold) {
      selectedModel = this.userPreferences.defaultModel || this.config.routing.default;
      overrideType = 'default';
    }

    // Generate alternatives
    const alternatives: ModelSelectionResult['alternatives'] = [];
    const allModels = Object.keys(this.config.models) as Array<keyof MultiModelConfig['models']>;
    
    allModels.forEach(model => {
      if (model !== selectedModel) {
        const tempClassification = this.classifyContent(prompt, options?.fileExtension, model);
        alternatives.push({
          model,
          score: tempClassification.confidence,
          reason: tempClassification.reasoning
        });
      }
    });

    alternatives.sort((a, b) => b.score - a.score);

    const result = {
      selectedModel,
      reasoning: classification.reasoning,
      confidence: classification.confidence,
      override: overrideType,
      alternatives: alternatives.slice(0, 2) // Top 2 alternatives
    };

    // Show reasoning if requested or always enabled
    if (options?.showReasoning || this.userPreferences.alwaysShowReasoning) {
      this.displayModelSelection(result);
    }

    return result;
  }

  private mapModelToType(model: keyof MultiModelConfig['models']): ContentClassification['type'] {
    switch (model) {
      case 'creative': return 'creative';
      case 'analysis': return 'analysis';
      case 'code': return 'code';
      case 'fallback': return 'code';
      default: return 'code';
    }
  }

  private calculateComplexity(prompt: string): number {
    let complexity = 0;
    const lowerPrompt = prompt.toLowerCase();
    
    // Length factor (longer prompts tend to be more complex)
    complexity += Math.min(prompt.length / 500, 0.3);
    
    // Multiple operations indicator
    const operationWords = ['create', 'edit', 'modify', 'generate', 'analyze', 'connect', 'link'];
    const operationCount = operationWords.filter(word => lowerPrompt.includes(word)).length;
    complexity += Math.min(operationCount * 0.15, 0.4);
    
    // Technical complexity indicators
    const complexWords = ['architecture', 'system', 'design', 'integration', 'dependency', 'compound'];
    const complexCount = complexWords.filter(word => lowerPrompt.includes(word)).length;
    complexity += Math.min(complexCount * 0.1, 0.3);
    
    // Conjunction words indicating compound operations
    const conjunctions = [' and ', ' then ', ' also ', ' both ', ' multiple '];
    const conjunctionCount = conjunctions.filter(conj => lowerPrompt.includes(conj)).length;
    complexity += Math.min(conjunctionCount * 0.1, 0.2);
    
    return Math.min(complexity, 1.0);
  }

  private shouldUseThinking(prompt: string, complexity: number, isCompound?: boolean): boolean {
    const config = this.config.routing.qwen_specific;
    if (!config) return false;
    
    // Use thinking for compound operations if enabled
    if (isCompound && config.use_thinking_for_compound) {
      return true;
    }
    
    // Use thinking for high complexity tasks
    if (complexity >= config.thinking_threshold_complexity) {
      return true;
    }
    
    // Use thinking for analysis model operations
    const lowerPrompt = prompt.toLowerCase();
    return config.analysis_model_operations.some(op => lowerPrompt.includes(op));
  }

  private displayModelSelection(result: ModelSelectionResult): void {
    console.log(`\n🤖 Qwen Model Selection:`);
    console.log(`   Selected: ${result.selectedModel} (${(result.confidence * 100).toFixed(1)}% confidence)`);
    console.log(`   Reason: ${result.reasoning}`);
    console.log(`   Override: ${result.override}`);
    
    if (result.alternatives && result.alternatives.length > 0) {
      console.log(`   Alternatives: ${result.alternatives.map(alt => 
        `${alt.model} (${(alt.score * 100).toFixed(1)}%)`).join(', ')}`);
    }
    console.log('');
  }

  public async generateResponse(prompt: string, optionsOrFileExtension?: string | { 
    maxTokens?: number; 
    temperature?: number; 
    showReasoning?: boolean;
    forceModel?: keyof MultiModelConfig['models'];
    isCompound?: boolean;
    requiresThinking?: boolean;
    showThinkingText?: boolean;
  }, forceModel?: keyof MultiModelConfig['models']): Promise<string> {
    let fileExtension: string | undefined;
    let options: { 
      maxTokens?: number; 
      temperature?: number; 
      showReasoning?: boolean;
      forceModel?: keyof MultiModelConfig['models'];
      isCompound?: boolean;
      requiresThinking?: boolean;
      showThinkingText?: boolean;
    } | undefined;

    // Handle the second parameter - could be file extension or options object
    if (typeof optionsOrFileExtension === 'string') {
      fileExtension = optionsOrFileExtension;
    } else if (typeof optionsOrFileExtension === 'object' && optionsOrFileExtension !== null) {
      options = optionsOrFileExtension;
    }

    // Force model can come from either parameter for backwards compatibility
    const finalForceModel = options?.forceModel || forceModel;

    const selection = this.selectModel(prompt, {
      fileExtension,
      forceModel: finalForceModel,
      showReasoning: options?.showReasoning,
      isCompound: options?.isCompound
    });

    const modelConfig = this.config.models[selection.selectedModel];
    
    // Track performance if enabled
    const startTime = Date.now();
    
    try {
      const response = await this.callModel(modelConfig, prompt, {
        ...options,
        requiresThinking: options?.requiresThinking
      });
      
      // Process thinking text in response
      const processedResponse = this.processThinkingText(response, {
        showThinking: options?.showThinkingText ?? this.userPreferences.showThinkingText ?? false,
        formatThinking: this.userPreferences.formatThinkingText ?? true
      });
      
      if (this.config.routing.enable_performance_tracking) {
        this.trackSuccess(modelConfig.name, Date.now() - startTime);
      }
      
      return processedResponse;
    } catch (error) {
      if (this.config.routing.enable_performance_tracking) {
        this.trackFailure(modelConfig.name, error.message);
      }
      throw error;
    }
  }

  private async callModel(modelConfig: ModelConfig, prompt: string, options?: { maxTokens?: number; temperature?: number; requiresThinking?: boolean; }): Promise<string> {
    // Use user preferences for temperature if available
    const finalTemperature = options?.temperature ?? 
      this.userPreferences.preferredTemperature?.[this.getModelKey(modelConfig.name)] ?? 
      modelConfig.temperature;

    // Enhance prompt with thinking capability if model supports it
    let enhancedPrompt = prompt;
    if (modelConfig.thinking_enabled && (options?.requiresThinking || this.userPreferences.enableThinkingMode)) {
      enhancedPrompt = this.enhancePromptForThinking(prompt, modelConfig);
    }

    const request = {
      model: modelConfig.name,
      prompt: enhancedPrompt,
      stream: false,
      options: {
        temperature: finalTemperature,
        num_predict: options?.maxTokens ?? modelConfig.max_tokens
      }
    };

    try {
      const response = await axios.post(
        `${modelConfig.ollama_url}/api/generate`,
        request,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 120000
        }
      );

      if (response.data && response.data.response) {
        return response.data.response.trim();
      } else {
        throw new Error('Invalid response from Ollama');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          console.warn(`⚠️ Model '${modelConfig.name}' not found. Falling back to default model.`);
          // Update health status
          this.updateHealthStatus(modelConfig.name, 'unavailable', error.message);
          
          // Fallback to default model if primary model isn't available
          if (modelConfig.name !== this.config.models.fallback.name) {
            return await this.callModel(this.config.models.fallback, prompt, options);
          }
        }
        if (error.code === 'ECONNREFUSED') {
          this.updateHealthStatus(modelConfig.name, 'unavailable', 'Connection refused');
          throw new Error('Cannot connect to Ollama. Is Ollama running on localhost:11434?');
        }
        this.updateHealthStatus(modelConfig.name, 'degraded', error.message);
        throw new Error(`Ollama API error: ${error.message}`);
      }
      throw error;
    }
  }

  private getModelKey(modelName: string): keyof MultiModelConfig['models'] {
    for (const [key, model] of Object.entries(this.config.models)) {
      if (model.name === modelName) {
        return key as keyof MultiModelConfig['models'];
      }
    }
    return 'fallback';
  }

  private trackSuccess(modelName: string, responseTime: number): void {
    const performance = this.performanceTracker.get(modelName);
    if (performance) {
      performance.totalRequests++;
      performance.successfulRequests++;
      performance.averageResponseTime = 
        (performance.averageResponseTime * (performance.totalRequests - 1) + responseTime) / performance.totalRequests;
      performance.lastUsed = new Date();
      performance.successRate = performance.successfulRequests / performance.totalRequests;
      
      this.updateHealthStatus(modelName, 'healthy');
    }
  }

  private trackFailure(modelName: string, error: string): void {
    const performance = this.performanceTracker.get(modelName);
    if (performance) {
      performance.totalRequests++;
      performance.successRate = performance.successfulRequests / performance.totalRequests;
      
      this.updateHealthStatus(modelName, 'degraded', error);
    }
  }

  private updateHealthStatus(modelName: string, status: ModelHealth['status'], error?: string): void {
    const health = this.healthStatus.get(modelName);
    if (health) {
      health.status = status;
      health.lastChecked = new Date();
      if (error) {
        health.lastError = error;
        health.errorRate = (health.errorRate || 0) + 0.1;
      } else if (status === 'healthy') {
        health.errorRate = Math.max(0, (health.errorRate || 0) - 0.05);
      }
    }
  }

  public async checkModelHealth(modelName?: string): Promise<Map<string, ModelHealth>> {
    const modelsToCheck = modelName ? [modelName] : Array.from(this.healthStatus.keys());
    
    for (const model of modelsToCheck) {
      const modelConfig = this.getModelConfigByName(model);
      if (!modelConfig) continue;
      
      try {
        const startTime = Date.now();
        await axios.post(
          `${modelConfig.ollama_url}/api/generate`,
          {
            model: modelConfig.name,
            prompt: 'test',
            stream: false,
            options: { num_predict: 1 }
          },
          { timeout: 10000 }
        );
        
        const responseTime = Date.now() - startTime;
        const health = this.healthStatus.get(model)!;
        health.status = 'healthy';
        health.responseTime = responseTime;
        health.lastChecked = new Date();
        health.errorRate = Math.max(0, (health.errorRate || 0) - 0.1);
      } catch (error) {
        this.updateHealthStatus(model, 'unavailable', error.message);
      }
    }
    
    return this.healthStatus;
  }

  private getModelConfigByName(modelName: string): ModelConfig | undefined {
    for (const model of Object.values(this.config.models)) {
      if (model.name === modelName) {
        return model;
      }
    }
    return undefined;
  }

  // Public API methods for the model command
  public getConfig(): MultiModelConfig {
    return this.config;
  }

  public getUserPreferences(): UserPreferences {
    return this.userPreferences;
  }

  public getPerformanceMetrics(): Map<string, ModelPerformance> {
    return this.performanceTracker;
  }

  public getHealthStatus(): Map<string, ModelHealth> {
    return this.healthStatus;
  }

  public updateUserPreference<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]): void {
    this.userPreferences[key] = value;
    this.saveUserPreferences();
  }

  public setFileExtensionOverride(extension: string, model: keyof MultiModelConfig['models']): void {
    if (!this.userPreferences.fileExtensionOverrides) {
      this.userPreferences.fileExtensionOverrides = {};
    }
    this.userPreferences.fileExtensionOverrides[extension] = model;
    this.saveUserPreferences();
  }

  public removeFileExtensionOverride(extension: string): void {
    if (this.userPreferences.fileExtensionOverrides) {
      delete this.userPreferences.fileExtensionOverrides[extension];
      this.saveUserPreferences();
    }
  }

  /**
   * Process thinking text in Qwen3 responses
   * Formats or removes <think> blocks based on user preferences
   */
  private processThinkingText(response: string, options: { showThinking: boolean; formatThinking: boolean }): string {
    // Check if response contains thinking blocks
    const thinkingRegex = /<think>(.*?)<\/think>/gs;
    const thinkingMatches = response.match(thinkingRegex);
    
    if (!thinkingMatches) {
      return response; // No thinking text found
    }
    
    if (!options.showThinking) {
      // Remove thinking blocks entirely
      return response.replace(thinkingRegex, '').trim();
    }
    
    if (options.formatThinking) {
      // Format thinking blocks nicely
      return response.replace(thinkingRegex, (match, thinkContent) => {
        const cleanThinking = thinkContent.trim();
        return `
🤔 **AI Thinking Process:**
\`\`\`
${cleanThinking}
\`\`\`
---
`;
      });
    }
    
    return response; // Show raw thinking text
  }

  // Qwen-specific methods for compound operations
  public async generateResponseForCompound(prompt: string, isCompound: boolean = false, complexity?: number): Promise<string> {
    const requiresThinking = complexity ? complexity > 0.8 : this.shouldUseThinking(prompt, this.calculateComplexity(prompt), isCompound);
    
    return this.generateResponse(prompt, {
      isCompound,
      requiresThinking,
      showReasoning: this.userPreferences.alwaysShowReasoning
    });
  }

  public selectModelForOperation(operation: 'code' | 'analysis' | 'creative' | 'compound', prompt: string, fileExtension?: string): keyof MultiModelConfig['models'] {
    const classification = this.classifyContent(prompt, fileExtension, undefined, operation === 'compound');
    
    // Override based on operation type
    switch (operation) {
      case 'code':
        return 'code';
      case 'analysis':
        return 'analysis';
      case 'creative':
        return 'creative';
      case 'compound':
        return classification.requiresThinking ? 'analysis' : 'code';
      default:
        return classification.suggestedModel;
    }
  }

  public getQwenCapabilities(): {
    codeModel: { name: string; strengths: string[] };
    analysisModel: { name: string; strengths: string[]; thinkingEnabled: boolean };
    creativeModel: { name: string; strengths: string[] };
  } {
    return {
      codeModel: {
        name: this.config.models.code.name,
        strengths: this.config.models.code.strengths || []
      },
      analysisModel: {
        name: this.config.models.analysis.name,
        strengths: this.config.models.analysis.strengths || [],
        thinkingEnabled: this.config.models.analysis.thinking_enabled || false
      },
      creativeModel: {
        name: this.config.models.creative.name,
        strengths: this.config.models.creative.strengths || []
      }
    };
  }

  // Backwards compatibility
  public async queryAI(prompt: string): Promise<string> {
    return this.generateResponse(prompt);
  }
}

// Export singleton instance for backwards compatibility
export const enhancedRouter = new EnhancedModelRouter();
export const generateResponse = (prompt: string, optionsOrFileExtension?: string | { maxTokens?: number; temperature?: number; showReasoning?: boolean; forceModel?: keyof MultiModelConfig['models']; }) => enhancedRouter.generateResponse(prompt, optionsOrFileExtension);
export const queryAI = (prompt: string) => enhancedRouter.queryAI(prompt);

// New exports for enhanced functionality
export const selectModel = (prompt: string, options?: { fileExtension?: string; forceModel?: keyof MultiModelConfig['models']; showReasoning?: boolean; }) => enhancedRouter.selectModel(prompt, options);
export const checkHealth = (modelName?: string) => enhancedRouter.checkModelHealth(modelName);
export const getModelConfig = () => enhancedRouter.getConfig();
export const getUserPreferences = () => enhancedRouter.getUserPreferences();
export const getPerformanceMetrics = () => enhancedRouter.getPerformanceMetrics();
export const getHealthStatus = () => enhancedRouter.getHealthStatus();

// Legacy compatibility exports
export function getLegacyModelConfig() {
  // For legacy code that expects the old format
  const router = new EnhancedModelRouter();
  const config = (router as any).config;
  return {
    model: config.models.code.name,
    ollama_url: config.models.code.ollama_url,
    temperature: config.models.code.temperature,
    max_tokens: config.models.code.max_tokens
  };
} 