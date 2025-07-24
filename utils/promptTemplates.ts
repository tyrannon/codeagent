/**
 * File-type-specific prompt templates optimized for Qwen models
 * Enhanced with Qwen3 thinking capability and Qwen2.5-coder precision
 * Designed using claude-prompter analysis for optimal content quality
 */

export interface PromptTemplate {
  template: string;
  postProcessingRequired: boolean;
  validationRules?: string[];
  modelPreference?: 'qwen3' | 'qwen2.5-coder' | 'auto';
  thinkingEnabled?: boolean;
  complexityThreshold?: number;
}

export const HTML_PROMPT_TEMPLATE: PromptTemplate = {
  template: `You are an expert web developer using Qwen2.5-coder for precise HTML generation.

<thinking>
I need to generate a complete, valid HTML5 document that:
1. Follows semantic HTML5 structure
2. Includes proper meta tags and responsive design
3. Contains well-structured CSS for styling
4. Is production-ready and accessible
5. Matches the specific requirements in the description
</thinking>

CRITICAL REQUIREMENTS FOR QWEN2.5-CODER:
- Generate ONLY the HTML content, no markdown code blocks or explanations
- Start with <!DOCTYPE html> declaration
- Include proper <html>, <head>, and <body> structure
- Add responsive viewport meta tag: <meta name="viewport" content="width=device-width, initial-scale=1.0">
- Include complete, valid CSS in a <style> tag (no incomplete rules)
- Use semantic HTML5 elements (header, main, section, article, footer)
- Ensure all tags are properly closed
- End the file with a single newline character
- NO markdown formatting (no \`\`\`html blocks)
- NO explanations or comments outside the HTML
- Make the page functional and visually appealing
- Focus on code precision and syntactic accuracy

DESCRIPTION: {description}
FILE NAME: {fileName}

Generate the complete HTML document with precise syntax:`,
  postProcessingRequired: true,
  validationRules: [
    'Must start with <!DOCTYPE html>',
    'Must have proper html/head/body structure',
    'All CSS rules must be complete with closing braces',
    'No markdown code blocks allowed'
  ],
  modelPreference: 'qwen2.5-coder',
  thinkingEnabled: true,
  complexityThreshold: 0.3
};

export const CSS_PROMPT_TEMPLATE: PromptTemplate = {
  template: `You are an expert CSS developer using Qwen2.5-coder for precise styling.

<thinking>
For this CSS generation task, I need to:
1. Analyze the styling requirements from the description
2. Create modern, responsive CSS with proper structure
3. Ensure all selectors and properties are syntactically correct
4. Include appropriate hover effects and animations where relevant
5. Use efficient CSS architecture (mobile-first, logical grouping)
</thinking>

CRITICAL REQUIREMENTS FOR QWEN2.5-CODER:
- Generate ONLY CSS code, no explanations or markdown blocks
- Use modern CSS properties and best practices (Grid, Flexbox, Custom Properties)
- Include responsive design considerations (mobile-first approach)
- All CSS rules must be complete with proper closing braces
- Use meaningful, semantic class and ID names (BEM methodology preferred)
- Include comments only for complex sections or calculations
- End the file with a single newline character
- Focus on syntactic precision and CSS specificity optimization
- Include accessibility considerations (focus states, contrast)

DESCRIPTION: {description}
FILE NAME: {fileName}

Generate the complete, syntactically precise CSS:`,
  postProcessingRequired: true,
  validationRules: [
    'All CSS rules must have closing braces',
    'No markdown code blocks allowed',
    'All selectors must be valid',
    'Properties must use correct values'
  ],
  modelPreference: 'qwen2.5-coder',
  thinkingEnabled: true,
  complexityThreshold: 0.2
};

export const JAVASCRIPT_PROMPT_TEMPLATE: PromptTemplate = {
  template: `You are an expert JavaScript developer using Qwen2.5-coder for precise code generation.

<thinking>
For this JavaScript code generation:
1. Determine the most appropriate ES2023+ features to use
2. Plan the code structure and architecture
3. Consider error handling, performance, and maintainability
4. Ensure type safety where possible (without TypeScript)
5. Follow current JavaScript best practices and patterns
</thinking>

CRITICAL REQUIREMENTS FOR QWEN2.5-CODER:
- Generate ONLY JavaScript code, no explanations or markdown blocks
- Use modern ES2023+ syntax where appropriate (optional chaining, nullish coalescing, etc.)
- Follow JavaScript best practices and conventions (consistent formatting, proper scoping)
- Include comprehensive error handling with try-catch blocks where needed
- Use meaningful, descriptive variable and function names (camelCase convention)
- Add JSDoc comments for functions with proper type annotations
- End the file with a single newline character
- Focus on syntactic precision and runtime efficiency
- Implement proper async/await patterns for asynchronous operations
- Use const/let appropriately, avoid var

DESCRIPTION: {description}
FILE NAME: {fileName}

Generate the complete, syntactically precise JavaScript code:`,
  postProcessingRequired: true,
  validationRules: [
    'Must be valid JavaScript syntax',
    'No markdown code blocks allowed',
    'Must use modern ES6+ features appropriately',
    'Functions must have JSDoc comments'
  ],
  modelPreference: 'qwen2.5-coder',
  thinkingEnabled: true,
  complexityThreshold: 0.4
};

export const REACT_PROMPT_TEMPLATE: PromptTemplate = {
  template: `You are an expert React developer using Qwen2.5-coder for precise component generation.

<thinking>
For this React component:
1. Determine if TypeScript should be used (.tsx extension)
2. Plan the component architecture (state, props, hooks)
3. Consider performance optimizations (useMemo, useCallback, React.memo)
4. Plan accessibility features and proper semantic HTML
5. Structure the component for maintainability and testing
</thinking>

CRITICAL REQUIREMENTS FOR QWEN2.5-CODER:
- Generate ONLY React/JSX code, no explanations or markdown blocks
- Use functional components with React 18+ hooks patterns
- Include proper TypeScript types if filename ends with .tsx (strict typing)
- Follow React best practices and conventions (component composition, pure functions)
- Include proper imports at the top (React, hooks, types)
- Use meaningful, descriptive component and prop names (PascalCase for components)
- Add PropTypes or TypeScript interfaces where appropriate
- End the file with a single newline character
- Focus on component reusability and performance optimization
- Implement proper accessibility attributes (ARIA labels, roles)
- Use React 18+ features where appropriate (Suspense, concurrent features)
- Include proper key props for list items

DESCRIPTION: {description}
FILE NAME: {fileName}

Generate the complete, syntactically precise React component:`,
  postProcessingRequired: true,
  validationRules: [
    'Must export a React component',
    'Must have proper JSX syntax',
    'No markdown code blocks allowed',
    'Must include proper imports',
    'TypeScript types required for .tsx files'
  ],
  modelPreference: 'qwen2.5-coder',
  thinkingEnabled: true,
  complexityThreshold: 0.5
};

export const GENERIC_CODE_PROMPT_TEMPLATE: PromptTemplate = {
  template: `You are an expert software developer using Qwen2.5-coder for precise code generation.

<thinking>
For this {language} code generation:
1. Identify the most appropriate patterns and idioms for {language}
2. Plan the code structure following language-specific conventions
3. Consider error handling, performance, and maintainability
4. Ensure type safety and proper documentation
5. Follow current best practices for {language}
</thinking>

REQUIREMENTS FOR QWEN2.5-CODER:
- Generate ONLY code, no explanations or markdown blocks
- Follow {language}-specific best practices and conventions
- Include appropriate comments for clarity (language-specific comment style)
- Use meaningful names for variables and functions (follow language naming conventions)
- Make the code production-ready with proper error handling
- End the file with a single newline character
- Focus on syntactic precision and language-specific optimizations
- Include proper imports/includes for the language
- Use modern language features where appropriate
- Implement proper testing considerations where applicable

DESCRIPTION: {description}
FILE NAME: {fileName}
LANGUAGE: {language}

Generate the complete, syntactically precise {language} code:`,
  postProcessingRequired: false,
  validationRules: [
    'Must follow language-specific syntax',
    'Must include appropriate error handling',
    'Variable names must follow language conventions'
  ],
  modelPreference: 'qwen2.5-coder',
  thinkingEnabled: true,
  complexityThreshold: 0.3
};

export const CONTENT_PROMPT_TEMPLATE: PromptTemplate = {
  template: `You are using Qwen3 for creative and analytical content generation.

<thinking>
For this content creation task:
1. Analyze the type of content requested (creative, technical, documentation)
2. Determine the appropriate tone and style
3. Structure the content for maximum engagement and clarity
4. Consider the target audience and purpose
5. Plan the logical flow and organization
</thinking>

REQUIREMENTS FOR QWEN3:
- Write directly as if you're filling the file with the requested content
- Do not include explanations or markdown formatting unless specifically requested
- Make the content engaging, well-structured, and purposeful
- Use appropriate tone for the content type (creative, technical, professional)
- End with a single newline character
- Focus on content quality, creativity, and logical structure
- Include proper formatting for the content type (if applicable)
- Ensure content is comprehensive and valuable

DESCRIPTION: {description}
FILE NAME: {fileName}

Generate the complete, high-quality content:`,
  postProcessingRequired: false,
  validationRules: [
    'Content must be appropriate for file type',
    'Must be well-structured and engaging'
  ],
  modelPreference: 'qwen3',
  thinkingEnabled: true,
  complexityThreshold: 0.2
};

// Edit-specific templates for enhanced code modification
export const EDIT_HTML_PROMPT_TEMPLATE: PromptTemplate = {
  template: `You are an expert web developer. Edit the provided HTML5 document based on the requirements.

CRITICAL REQUIREMENTS:
- Generate ONLY the complete updated HTML content, no markdown code blocks or explanations
- Maintain <!DOCTYPE html> declaration and proper structure
- Keep responsive viewport meta tag and proper <html>, <head>, <body> structure
- Update CSS in <style> tags as needed (ensure all rules are complete)
- Use semantic HTML5 elements and ensure all tags are properly closed
- End the file with a single newline character
- NO markdown formatting (no \`\`\`html blocks)
- NO explanations or comments outside the HTML
- Make functional and visually appealing changes

CURRENT CONTENT:
{currentContent}

EDIT REQUIREMENTS: {description}
FILE NAME: {fileName}

Generate the complete updated HTML document:`,
  postProcessingRequired: true,
  validationRules: [
    'Must start with <!DOCTYPE html>',
    'Must maintain proper html/head/body structure',
    'All CSS rules must be complete with closing braces',
    'No markdown code blocks allowed'
  ]
};

export const EDIT_CSS_PROMPT_TEMPLATE: PromptTemplate = {
  template: `You are an expert CSS developer. Edit the provided CSS code based on the requirements.

CRITICAL REQUIREMENTS:
- Generate ONLY the complete updated CSS code, no explanations or markdown blocks
- Use modern CSS properties and maintain best practices
- Ensure all CSS rules are complete with proper closing braces
- Keep responsive design considerations intact
- Use meaningful class and ID names
- Include comments only for complex sections
- End the file with a single newline character

CURRENT CONTENT:
{currentContent}

EDIT REQUIREMENTS: {description}
FILE NAME: {fileName}

Generate the complete updated CSS:`,
  postProcessingRequired: true,
  validationRules: [
    'All CSS rules must have closing braces',
    'No markdown code blocks allowed'
  ]
};

export const EDIT_JAVASCRIPT_PROMPT_TEMPLATE: PromptTemplate = {
  template: `You are an expert JavaScript developer. Edit the provided JavaScript code based on the requirements.

CRITICAL REQUIREMENTS:
- Generate ONLY the complete updated JavaScript code, no explanations or markdown blocks
- Maintain modern ES6+ syntax where appropriate
- Follow JavaScript best practices and conventions
- Preserve proper error handling where it exists
- Keep meaningful variable and function names
- Update JSDoc comments as needed
- End the file with a single newline character

CURRENT CONTENT:
{currentContent}

EDIT REQUIREMENTS: {description}
FILE NAME: {fileName}

Generate the complete updated JavaScript code:`,
  postProcessingRequired: true,
  validationRules: [
    'Must be valid JavaScript syntax',
    'No markdown code blocks allowed'
  ]
};

export const EDIT_REACT_PROMPT_TEMPLATE: PromptTemplate = {
  template: `You are an expert React developer. Edit the provided React component based on the requirements.

CRITICAL REQUIREMENTS:
- Generate ONLY the complete updated React/JSX code, no explanations or markdown blocks
- Maintain functional components with hooks pattern
- Keep proper TypeScript types if filename ends with .tsx
- Follow React best practices and conventions
- Preserve proper imports at the top
- Maintain meaningful component and prop names
- Update PropTypes or TypeScript interfaces as needed
- End the file with a single newline character

CURRENT CONTENT:
{currentContent}

EDIT REQUIREMENTS: {description}
FILE NAME: {fileName}

Generate the complete updated React component:`,
  postProcessingRequired: true,
  validationRules: [
    'Must export a React component',
    'Must have proper JSX syntax',
    'No markdown code blocks allowed'
  ]
};

export const EDIT_GENERIC_CODE_PROMPT_TEMPLATE: PromptTemplate = {
  template: `You are an expert software developer. Edit the provided code based on the requirements.

REQUIREMENTS:
- Generate ONLY the complete updated code, no explanations or markdown blocks
- Follow best practices for the language
- Maintain appropriate comments for clarity
- Keep meaningful names for variables and functions
- Make the code production-ready
- End the file with a single newline character

CURRENT CONTENT:
{currentContent}

EDIT REQUIREMENTS: {description}
FILE NAME: {fileName}
LANGUAGE: {language}

Generate the complete updated code:`,
  postProcessingRequired: false,
  validationRules: []
};

/**
 * Get the appropriate prompt template based on file extension
 */
export function getPromptTemplate(fileExtension: string, isContentFile: boolean = false): PromptTemplate {
  if (isContentFile) {
    return CONTENT_PROMPT_TEMPLATE;
  }

  const ext = fileExtension.toLowerCase();
  
  switch (ext) {
    case '.html':
    case '.htm':
      return HTML_PROMPT_TEMPLATE;
    
    case '.css':
      return CSS_PROMPT_TEMPLATE;
    
    case '.js':
    case '.mjs':
      return JAVASCRIPT_PROMPT_TEMPLATE;
    
    case '.jsx':
    case '.tsx':
      return REACT_PROMPT_TEMPLATE;
    
    case '.ts':
      return JAVASCRIPT_PROMPT_TEMPLATE; // Can be enhanced for TypeScript specifics
    
    default:
      return GENERIC_CODE_PROMPT_TEMPLATE;
  }
}

/**
 * Get the appropriate edit-specific prompt template based on file extension
 */
export function getEditPromptTemplate(fileExtension: string, isContentFile: boolean = false): PromptTemplate {
  if (isContentFile) {
    return CONTENT_PROMPT_TEMPLATE;
  }

  const ext = fileExtension.toLowerCase();
  
  switch (ext) {
    case '.html':
    case '.htm':
      return EDIT_HTML_PROMPT_TEMPLATE;
    
    case '.css':
      return EDIT_CSS_PROMPT_TEMPLATE;
    
    case '.js':
    case '.mjs':
      return EDIT_JAVASCRIPT_PROMPT_TEMPLATE;
    
    case '.jsx':
    case '.tsx':
      return EDIT_REACT_PROMPT_TEMPLATE;
    
    case '.ts':
      return EDIT_JAVASCRIPT_PROMPT_TEMPLATE; // Can be enhanced for TypeScript specifics
    
    default:
      return EDIT_GENERIC_CODE_PROMPT_TEMPLATE;
  }
}

/**
 * Generate a complete prompt by filling in the template variables
 */
export function generatePrompt(
  template: PromptTemplate,
  description: string,
  fileName: string,
  language?: string
): string {
  return template.template
    .replace('{description}', description)
    .replace('{fileName}', fileName)
    .replace('{language}', language || 'Text');
}

/**
 * Generate a complete edit prompt by filling in the template variables including current content
 */
export function generateEditPrompt(
  template: PromptTemplate,
  description: string,
  fileName: string,
  currentContent: string,
  language?: string
): string {
  return template.template
    .replace('{description}', description)
    .replace('{fileName}', fileName)
    .replace('{currentContent}', currentContent)
    .replace('{language}', language || 'Text');
}