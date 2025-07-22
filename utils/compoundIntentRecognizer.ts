/**
 * Enhanced Compound Intent Recognition System
 * Handles multiple operations in a single natural language request
 * Based on claude-prompter architectural analysis
 */

export interface Operation {
  intent: 'write' | 'edit' | 'move' | 'ask' | 'plan';
  target: string;
  description: string;
  dependencies?: string[];
  priority: number;
}

export interface CompoundIntent {
  operations: Operation[];
  isCompound: boolean;
  originalInput: string;
  context: {
    folder?: string;
    mainAction?: string;
    relationships?: Array<{from: string, to: string, type: 'link' | 'import' | 'reference'}>;
  };
}

// Patterns that indicate compound operations
const COMPOUND_PATTERNS = [
  // "create X and modify Y" patterns
  /(?:create|make|write|generate)\s+([^,]+?)\s+and\s+(?:modify|edit|update|change)\s+([^,]+)/i,
  // "in FOLDER create X and modify Y" patterns  
  /in\s+(?:the\s+)?(\w+)\s+(?:folder\s+)?(?:create|make)\s+([^,]+?)\s+and\s+(?:modify|edit|update)\s+([^,]+)/i,
  // "create X, then modify Y" patterns
  /(?:create|make|write)\s+([^,]+?),?\s*(?:then|and then)\s+(?:modify|edit|update)\s+([^,]+)/i,
  // "make X and connect it to Y" patterns
  /(?:create|make)\s+([^,]+?)\s+and\s+(?:connect|link)\s+(?:it\s+)?to\s+([^,]+)/i
];

// Specific patterns for CSS + HTML linking
const CSS_HTML_LINKING_PATTERNS = [
  // "create css and modify html to connect"
  /(?:create|make)\s+(?:a\s+)?css\s+file.*?(?:and\s+)?(?:modify|edit|update)\s+.*?html.*?(?:connect|link)/i,
  // "create stylesheet and link it to html"
  /(?:create|make)\s+(?:a\s+)?(?:css|stylesheet).*?(?:and\s+)?(?:link|connect).*?(?:html|index)/i,
  // "in FOLDER create css and modify html to connect to css"
  /in\s+(?:the\s+)?(\w+)\s+.*?(?:create|make)\s+(?:a\s+)?css\s+file.*?(?:modify|edit).*?html.*?(?:connect|link).*?css/i
];

// File type detection patterns
const FILE_TYPE_PATTERNS = {
  css: /css\s+file|stylesheet|styles?\.css/i,
  html: /html\s+file|index\.html|\.html/i,
  js: /javascript|js\s+file|\.js/i,
  ts: /typescript|ts\s+file|\.ts/i,
  json: /json\s+file|\.json/i
};

/**
 * Main compound intent recognition function
 */
export function recognizeCompoundIntent(input: string): CompoundIntent {
  const normalizedInput = input.toLowerCase().trim();
  
  // Check if this is a compound request
  const isCompound = detectCompoundRequest(input);
  
  if (!isCompound) {
    // Fall back to single operation
    const singleOperation = parseSingleOperation(input);
    return {
      operations: singleOperation ? [singleOperation] : [],
      isCompound: false,
      originalInput: input,
      context: extractContext(input)
    };
  }
  
  // Parse compound operations
  const operations = parseCompoundOperations(input);
  const context = extractContext(input);
  
  // Sort operations by priority and dependencies
  const sortedOperations = sortOperationsByDependencies(operations, context);
  
  return {
    operations: sortedOperations,
    isCompound: true,
    originalInput: input,
    context
  };
}

/**
 * Detect if input contains multiple operations
 */
function detectCompoundRequest(input: string): boolean {
  // Check for explicit compound patterns
  for (const pattern of COMPOUND_PATTERNS) {
    if (pattern.test(input)) return true;
  }
  
  // Check for CSS + HTML linking patterns
  for (const pattern of CSS_HTML_LINKING_PATTERNS) {
    if (pattern.test(input)) return true;
  }
  
  // Check for multiple action verbs
  const actionVerbs = ['create', 'make', 'write', 'generate', 'modify', 'edit', 'update', 'change'];
  const foundActions = actionVerbs.filter(verb => 
    input.toLowerCase().includes(verb)
  );
  
  // If we have multiple different action types, it's likely compound
  const hasCreateAction = foundActions.some(action => ['create', 'make', 'write', 'generate'].includes(action));
  const hasEditAction = foundActions.some(action => ['modify', 'edit', 'update', 'change'].includes(action));
  
  return hasCreateAction && hasEditAction;
}

/**
 * Parse compound operations from input
 */
function parseCompoundOperations(input: string): Operation[] {
  const operations: Operation[] = [];
  
  // Handle CSS + HTML linking scenarios
  if (CSS_HTML_LINKING_PATTERNS.some(pattern => pattern.test(input))) {
    const cssHtmlOps = parseCSSHTMLLinkingOperations(input);
    operations.push(...cssHtmlOps);
  } else {
    // Handle general compound patterns
    operations.push(...parseGeneralCompoundOperations(input));
  }
  
  return operations;
}

/**
 * Parse CSS + HTML linking operations (most common compound request)
 */
function parseCSSHTMLLinkingOperations(input: string): Operation[] {
  const operations: Operation[] = [];
  const context = extractContext(input);
  const folder = context.folder || '';
  
  // Extract styling description
  const stylingDescription = extractStylingDescription(input);
  
  // Operation 1: Create CSS file
  const cssFileName = extractFileName(input, 'css') || 'styles.css';
  const cssPath = folder ? `${folder}/${cssFileName}` : cssFileName;
  
  operations.push({
    intent: 'write',
    target: cssPath,
    description: `Create a CSS file with ${stylingDescription || 'modern, colorful styling for the webpage'}. Include responsive design, attractive colors, and professional styling.`,
    priority: 1,
    dependencies: []
  });
  
  // Operation 2: Modify HTML file to link CSS
  const htmlFileName = extractFileName(input, 'html') || 'index.html';
  const htmlPath = folder ? `${folder}/${htmlFileName}` : htmlFileName;
  
  operations.push({
    intent: 'edit',
    target: htmlPath,
    description: `Modify the HTML file to link to the CSS file (${cssFileName}). Remove any existing inline styles and replace with a proper CSS link in the <head> section.`,
    priority: 2,
    dependencies: [cssPath]
  });
  
  return operations;
}

/**
 * Parse general compound operations
 */
function parseGeneralCompoundOperations(input: string): Operation[] {
  const operations: Operation[] = [];
  
  // This can be expanded for other compound patterns
  // For now, focus on the CSS+HTML use case
  
  return operations;
}

/**
 * Parse single operation (fallback)
 */
function parseSingleOperation(input: string): Operation | null {
  // Import and use the existing intent recognizer logic
  const intent = recognizeBasicIntent(input);
  
  if (intent === 'ask') return null; // Don't convert ask to operation
  
  return {
    intent: intent as 'write' | 'edit' | 'move' | 'plan',
    target: extractMainTarget(input),
    description: input,
    priority: 1,
    dependencies: []
  };
}

/**
 * Extract context information from input
 */
function extractContext(input: string): CompoundIntent['context'] {
  const context: CompoundIntent['context'] = {};
  
  // Extract folder context
  const folderMatch = input.match(/in\s+(?:the\s+)?(\w+)\s+(?:folder|directory)/i);
  if (folderMatch) {
    context.folder = folderMatch[1];
  }
  
  // Extract main action
  const actionMatch = input.match(/(create|make|modify|edit|update|write|generate)/i);
  if (actionMatch) {
    context.mainAction = actionMatch[1].toLowerCase();
  }
  
  // Extract relationships for CSS+HTML
  if (input.includes('connect') || input.includes('link')) {
    context.relationships = [{
      from: 'css',
      to: 'html', 
      type: 'link'
    }];
  }
  
  return context;
}

/**
 * Sort operations by dependencies and priority
 */
function sortOperationsByDependencies(operations: Operation[], context: CompoundIntent['context']): Operation[] {
  // Simple topological sort - create before edit
  const writeOps = operations.filter(op => op.intent === 'write').sort((a, b) => a.priority - b.priority);
  const editOps = operations.filter(op => op.intent === 'edit').sort((a, b) => a.priority - b.priority);  
  const otherOps = operations.filter(op => op.intent !== 'write' && op.intent !== 'edit').sort((a, b) => a.priority - b.priority);
  
  return [...writeOps, ...editOps, ...otherOps];
}

/**
 * Extract styling description from input
 */
function extractStylingDescription(input: string): string {
  const stylingPatterns = [
    /(?:with|do|add|include)\s+(?:some\s+)?([^.]+?)\s+styl/i,
    /(?:colorful|modern|responsive|attractive|professional|gradient|hover)\s+(?:styling|design|effects)/i
  ];
  
  for (const pattern of stylingPatterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }
  
  return 'colorful and modern styling';
}

/**
 * Extract filename from input based on type
 */
function extractFileName(input: string, type: 'css' | 'html' | 'js'): string | null {
  const typePatterns = {
    css: /(\w+\.css)|css\s+file/i,
    html: /(\w+\.html)|html\s+file/i,
    js: /(\w+\.js)|javascript\s+file/i
  };
  
  const match = input.match(typePatterns[type]);
  if (match && match[1]) {
    return match[1];
  }
  
  return null;
}

/**
 * Extract main target from input
 */
function extractMainTarget(input: string): string {
  // Look for file references
  const fileMatch = input.match(/[\w\/\.\-]+\.(ts|js|tsx|jsx|html|css|py|java|cpp|md|json)/i);
  if (fileMatch) return fileMatch[0];
  
  // Look for folder references
  const folderMatch = input.match(/(?:folder|directory)\s+(?:called\s+)?(\w+)/i);
  if (folderMatch) return folderMatch[1];
  
  return 'unknown';
}

/**
 * Basic intent recognition (simplified version of existing logic)
 */
function recognizeBasicIntent(input: string): string {
  const normalizedInput = input.toLowerCase().trim();

  // Check for specific patterns
  if (/(?:create|make|write|generate).*?(?:file|folder)/i.test(normalizedInput)) return 'write';
  if (/(?:edit|modify|change|update|refactor|fix)/i.test(normalizedInput)) return 'edit';  
  if (/(?:move|rename|relocate)/i.test(normalizedInput)) return 'move';
  if (/(?:plan|design|implement)/i.test(normalizedInput)) return 'plan';
  
  return 'ask';
}

/**
 * Check if operations can be executed in sequence
 */
export function validateOperationSequence(operations: Operation[]): {isValid: boolean, errors: string[]} {
  const errors: string[] = [];
  
  // Check for circular dependencies
  for (const op of operations) {
    if (op.dependencies) {
      for (const dep of op.dependencies) {
        const depOp = operations.find(o => o.target === dep);
        if (depOp && depOp.dependencies?.includes(op.target)) {
          errors.push(`Circular dependency detected between ${op.target} and ${dep}`);
        }
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}