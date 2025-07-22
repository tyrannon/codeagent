/**
 * File-type-specific prompt templates for enhanced AI code generation
 * Designed using claude-prompter analysis for optimal content quality
 */

export interface PromptTemplate {
  template: string;
  postProcessingRequired: boolean;
  validationRules?: string[];
}

export const HTML_PROMPT_TEMPLATE: PromptTemplate = {
  template: `You are an expert web developer. Generate a complete, valid HTML5 document.

CRITICAL REQUIREMENTS:
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

DESCRIPTION: {description}
FILE NAME: {fileName}

Generate the complete HTML document:`,
  postProcessingRequired: true,
  validationRules: [
    'Must start with <!DOCTYPE html>',
    'Must have proper html/head/body structure',
    'All CSS rules must be complete with closing braces',
    'No markdown code blocks allowed'
  ]
};

export const CSS_PROMPT_TEMPLATE: PromptTemplate = {
  template: `You are an expert CSS developer. Generate clean, modern CSS code.

CRITICAL REQUIREMENTS:
- Generate ONLY CSS code, no explanations or markdown blocks
- Use modern CSS properties and best practices
- Include responsive design considerations
- All CSS rules must be complete with proper closing braces
- Use meaningful class and ID names
- Include comments only for complex sections
- End the file with a single newline character

DESCRIPTION: {description}
FILE NAME: {fileName}

Generate the complete CSS:`,
  postProcessingRequired: true,
  validationRules: [
    'All CSS rules must have closing braces',
    'No markdown code blocks allowed'
  ]
};

export const JAVASCRIPT_PROMPT_TEMPLATE: PromptTemplate = {
  template: `You are an expert JavaScript developer. Generate clean, modern JavaScript code.

CRITICAL REQUIREMENTS:
- Generate ONLY JavaScript code, no explanations or markdown blocks
- Use modern ES6+ syntax where appropriate
- Follow JavaScript best practices and conventions
- Include proper error handling where needed
- Use meaningful variable and function names
- Add JSDoc comments for functions
- End the file with a single newline character

DESCRIPTION: {description}
FILE NAME: {fileName}

Generate the complete JavaScript code:`,
  postProcessingRequired: true,
  validationRules: [
    'Must be valid JavaScript syntax',
    'No markdown code blocks allowed'
  ]
};

export const REACT_PROMPT_TEMPLATE: PromptTemplate = {
  template: `You are an expert React developer. Generate a clean, modern React component.

CRITICAL REQUIREMENTS:
- Generate ONLY React/JSX code, no explanations or markdown blocks
- Use functional components with hooks
- Include proper TypeScript types if filename ends with .tsx
- Follow React best practices and conventions
- Include proper imports at the top
- Use meaningful component and prop names
- Add PropTypes or TypeScript interfaces where appropriate
- End the file with a single newline character

DESCRIPTION: {description}
FILE NAME: {fileName}

Generate the complete React component:`,
  postProcessingRequired: true,
  validationRules: [
    'Must export a React component',
    'Must have proper JSX syntax',
    'No markdown code blocks allowed'
  ]
};

export const GENERIC_CODE_PROMPT_TEMPLATE: PromptTemplate = {
  template: `You are an expert software developer. Create clean, well-documented code.

REQUIREMENTS:
- Generate ONLY code, no explanations or markdown blocks
- Follow best practices for the language
- Include appropriate comments for clarity
- Use meaningful names for variables and functions
- Make the code production-ready
- End the file with a single newline character

DESCRIPTION: {description}
FILE NAME: {fileName}
LANGUAGE: {language}

Generate the complete code:`,
  postProcessingRequired: false,
  validationRules: []
};

export const CONTENT_PROMPT_TEMPLATE: PromptTemplate = {
  template: `Create text content for a file. Write the actual content that should be saved in this file.

REQUIREMENTS:
- Write directly as if you're filling the file with the requested content
- Do not include explanations or markdown formatting
- Make the content engaging and well-structured
- End with a single newline character

DESCRIPTION: {description}
FILE NAME: {fileName}

Content:`,
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