/**
 * Intent Recognition for Natural Language to CLI Command Mapping
 */

interface IntentPattern {
  intent: string;
  patterns: RegExp[];
  keywords: string[];
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    intent: 'plan',
    patterns: [
      /plan\s+(a|the|this)\s+/i,
      /create\s+(a|the)\s+plan/i,
      /design\s+(a|the)\s+/i,
      /implement\s+(a|the)\s+/i,
      /build\s+(a|the)\s+/i,
      /develop\s+(a|the)\s+/i
    ],
    keywords: ['plan', 'design', 'implement', 'build', 'develop', 'create plan', 'strategy']
  },
  {
    intent: 'edit',
    patterns: [
      /edit\s+(the\s+)?[\w\/\.\-]+/i,
      /modify\s+(the\s+)?[\w\/\.\-]+/i,
      /change\s+(the\s+)?[\w\/\.\-]+/i,
      /update\s+(the\s+)?[\w\/\.\-]+/i,
      /refactor\s+(the\s+)?[\w\/\.\-]+/i,
      /fix\s+(the\s+)?[\w\/\.\-]+/i
    ],
    keywords: ['edit', 'modify', 'change', 'update', 'refactor', 'fix', 'improve']
  },
  {
    intent: 'write',
    patterns: [
      /write\s+(a|the)\s+/i,
      /create\s+(a|the)\s+file/i,
      /generate\s+(a|the)\s+/i,
      /make\s+(a|the)\s+/i,
      /add\s+(a|the)\s+new/i
    ],
    keywords: ['write', 'create', 'generate', 'make', 'add', 'new file']
  },
  {
    intent: 'move',
    patterns: [
      /move\s+[\w\/\.\-]+/i,
      /rename\s+[\w\/\.\-]+/i,
      /relocate\s+[\w\/\.\-]+/i,
      /reorganize\s+/i
    ],
    keywords: ['move', 'rename', 'relocate', 'reorganize', 'restructure']
  },
  {
    intent: 'ask',
    patterns: [
      /explain\s+/i,
      /what\s+(is|are|does)/i,
      /how\s+(does|do|can)/i,
      /why\s+/i,
      /where\s+(is|are)/i,
      /tell\s+me\s+about/i,
      /show\s+me/i
    ],
    keywords: ['explain', 'what', 'how', 'why', 'where', 'tell me', 'show me', 'help']
  }
];

export function recognizeIntent(input: string): string {
  const normalizedInput = input.toLowerCase().trim();

  // Check patterns first (more specific)
  for (const intentPattern of INTENT_PATTERNS) {
    for (const pattern of intentPattern.patterns) {
      if (pattern.test(normalizedInput)) {
        return intentPattern.intent;
      }
    }
  }

  // Check keywords (more general)
  for (const intentPattern of INTENT_PATTERNS) {
    for (const keyword of intentPattern.keywords) {
      if (normalizedInput.includes(keyword.toLowerCase())) {
        return intentPattern.intent;
      }
    }
  }

  // Default to 'ask' for general questions
  return 'ask';
}

export function extractFileReferences(input: string): string[] {
  const filePatterns = [
    /[\w\/\.\-]+\.(ts|js|tsx|jsx|py|java|cpp|c|h|md|json|yml|yaml|toml|cfg|conf)/gi,
    /['"]([\w\/\.\-]+)['"]/g
  ];

  const files: string[] = [];
  
  for (const pattern of filePatterns) {
    const matches = input.match(pattern);
    if (matches) {
      files.push(...matches);
    }
  }

  return [...new Set(files)]; // Remove duplicates
}

export function extractEntities(input: string): {
  files: string[];
  actions: string[];
  targets: string[];
} {
  const files = extractFileReferences(input);
  
  const actionWords = ['create', 'delete', 'modify', 'update', 'fix', 'improve', 'optimize'];
  const actions = actionWords.filter(action => 
    input.toLowerCase().includes(action)
  );

  const targetWords = ['component', 'function', 'class', 'module', 'feature', 'test', 'config'];
  const targets = targetWords.filter(target => 
    input.toLowerCase().includes(target)
  );

  return { files, actions, targets };
}