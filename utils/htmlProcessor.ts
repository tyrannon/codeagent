/**
 * HTML Content Processing and Cleanup Utilities
 * Designed to clean up AI-generated HTML content for production use
 */

export interface ProcessingResult {
  content: string;
  warnings: string[];
  errors: string[];
  isValid: boolean;
}

export interface ValidationIssue {
  type: 'error' | 'warning';
  message: string;
  line?: number;
}

/**
 * Main HTML processing pipeline
 */
export async function processHTMLContent(rawContent: string): Promise<ProcessingResult> {
  const warnings: string[] = [];
  const errors: string[] = [];
  let content = rawContent;

  try {
    // Step 1: Remove markdown code blocks and AI artifacts
    content = removeMarkdownBlocks(content);
    content = removeAIArtifacts(content);

    // Step 2: Fix common HTML issues
    content = fixCommonHTMLIssues(content);

    // Step 3: Process embedded CSS
    const cssResult = await processCSSInHTML(content);
    content = cssResult.content;
    warnings.push(...cssResult.warnings);
    errors.push(...cssResult.errors);

    // Step 4: Ensure proper file ending
    content = ensureProperEnding(content);

    // Step 5: Validate the final HTML
    const validation = validateHTMLStructure(content);
    warnings.push(...validation.filter(issue => issue.type === 'warning').map(issue => issue.message));
    errors.push(...validation.filter(issue => issue.type === 'error').map(issue => issue.message));

    return {
      content,
      warnings,
      errors,
      isValid: errors.length === 0
    };

  } catch (error) {
    errors.push(`Processing failed: ${error instanceof Error ? error.message : String(error)}`);
    return {
      content: rawContent,
      warnings,
      errors,
      isValid: false
    };
  }
}

/**
 * Remove markdown code blocks and similar artifacts
 */
export function removeMarkdownBlocks(content: string): string {
  let cleaned = content;

  // Remove markdown HTML code blocks
  cleaned = cleaned.replace(/```html\n?/gi, '');
  cleaned = cleaned.replace(/```\n?$/gm, '');
  
  // Remove other common markdown patterns
  cleaned = cleaned.replace(/```[a-z]*\n?/gi, '');
  
  return cleaned.trim();
}

/**
 * Remove common AI artifacts and explanatory text
 */
export function removeAIArtifacts(content: string): string {
  let cleaned = content;

  // Remove common AI response patterns
  const artifactPatterns = [
    /^Sure,.*?\n/gm,
    /^Here is.*?\n/gm,
    /^I'll create.*?\n/gm,
    /^This.*?HTML.*?\n/gm,
    /No newline at end of file/g,
    /^Based on.*?\n/gm,
    /^Please note.*?\n/gm
  ];

  artifactPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });

  // Remove any remaining leading/trailing whitespace per line but preserve structure
  cleaned = cleaned.replace(/^[ \t]+/gm, '').replace(/[ \t]+$/gm, '');
  
  return cleaned;
}

/**
 * Fix common HTML structure issues
 */
export function fixCommonHTMLIssues(content: string): string {
  let fixed = content;

  // Ensure DOCTYPE declaration exists and is first
  if (!fixed.trim().startsWith('<!DOCTYPE html>')) {
    if (fixed.includes('<!DOCTYPE html>')) {
      // Move DOCTYPE to the beginning
      fixed = fixed.replace(/<!DOCTYPE html>/i, '');
      fixed = '<!DOCTYPE html>\n' + fixed.trim();
    } else {
      // Add DOCTYPE if missing
      fixed = '<!DOCTYPE html>\n' + fixed;
    }
  }

  // Fix common viewport meta tag issues
  if (fixed.includes('<head>') && !fixed.includes('viewport')) {
    fixed = fixed.replace(
      /<head>/i,
      '<head>\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">'
    );
  }

  // Fix missing charset if needed
  if (fixed.includes('<head>') && !fixed.includes('charset')) {
    fixed = fixed.replace(
      /<meta name="viewport".*?>/i,
      '<meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">'
    );
  }

  return fixed;
}

/**
 * Process CSS embedded in HTML and fix common issues
 */
export async function processCSSInHTML(htmlContent: string): Promise<ProcessingResult> {
  const warnings: string[] = [];
  const errors: string[] = [];
  let content = htmlContent;

  // Find all CSS in <style> tags
  const styleTagRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  const matches = [...content.matchAll(styleTagRegex)];

  for (const match of matches) {
    const originalCSS = match[1];
    const cleanedCSS = await cleanupCSS(originalCSS);
    
    // Replace the original CSS with cleaned version
    content = content.replace(match[0], `<style>\n${cleanedCSS}\n</style>`);

    // Check for incomplete CSS rules
    const incompleteRules = findIncompleteCSSRules(originalCSS);
    if (incompleteRules.length > 0) {
      warnings.push(`Fixed ${incompleteRules.length} incomplete CSS rule(s)`);
    }
  }

  return {
    content,
    warnings,
    errors,
    isValid: errors.length === 0
  };
}

/**
 * Clean up CSS content
 */
export async function cleanupCSS(cssContent: string): Promise<string> {
  let cleaned = cssContent.trim();

  // Remove any remaining artifacts
  cleaned = cleaned.replace(/No newline at end of file/g, '');

  // Fix incomplete CSS rules (missing closing braces)
  cleaned = fixIncompleteCSSRules(cleaned);

  // Improve formatting
  cleaned = formatCSS(cleaned);

  return cleaned;
}

/**
 * Fix incomplete CSS rules by adding missing closing braces
 */
export function fixIncompleteCSSRules(css: string): string {
  const lines = css.split('\n');
  const result: string[] = [];
  let openBraces = 0;
  let inRule = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Count braces
    const openCount = (line.match(/{/g) || []).length;
    const closeCount = (line.match(/}/g) || []).length;
    
    openBraces += openCount - closeCount;
    
    if (openCount > 0) inRule = true;
    if (closeCount > 0 && openBraces === 0) inRule = false;

    result.push(lines[i]);

    // If we're at the end and still have open braces, close them
    if (i === lines.length - 1 && openBraces > 0) {
      while (openBraces > 0) {
        result.push('            }'); // Match typical indentation
        openBraces--;
      }
    }
  }

  return result.join('\n');
}

/**
 * Find incomplete CSS rules
 */
export function findIncompleteCSSRules(css: string): Array<{line: number, rule: string}> {
  const lines = css.split('\n');
  const incomplete: Array<{line: number, rule: string}> = [];
  let openBraces = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const openCount = (line.match(/{/g) || []).length;
    const closeCount = (line.match(/}/g) || []).length;
    
    openBraces += openCount - closeCount;
  }

  if (openBraces > 0) {
    incomplete.push({line: lines.length, rule: 'Unclosed CSS rules detected'});
  }

  return incomplete;
}

/**
 * Basic CSS formatting
 */
export function formatCSS(css: string): string {
  let formatted = css;

  // Basic indentation fix for properties
  formatted = formatted.replace(/^(\s*)([^{\s][^{]*?)\s*{/gm, '$1$2 {');
  formatted = formatted.replace(/^(\s*)([^}]*?[^;\s])\s*$/gm, '$1    $2;');

  return formatted;
}

/**
 * Ensure proper file ending
 */
export function ensureProperEnding(content: string): string {
  let result = content.trimEnd();
  
  if (!result.endsWith('\n')) {
    result += '\n';
  }
  
  return result;
}

/**
 * Validate HTML structure
 */
export function validateHTMLStructure(content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check for DOCTYPE
  if (!content.trim().startsWith('<!DOCTYPE html>')) {
    issues.push({
      type: 'error',
      message: 'Missing or incorrect DOCTYPE declaration'
    });
  }

  // Check for basic HTML structure
  const requiredTags = ['<html', '<head', '<body'];
  requiredTags.forEach(tag => {
    if (!content.includes(tag)) {
      issues.push({
        type: 'error',
        message: `Missing required tag: ${tag}>`
      });
    }
  });

  // Check for viewport meta tag
  if (!content.includes('viewport')) {
    issues.push({
      type: 'warning',
      message: 'Missing viewport meta tag for responsive design'
    });
  }

  // Check for charset
  if (!content.includes('charset')) {
    issues.push({
      type: 'warning',
      message: 'Missing charset declaration'
    });
  }

  return issues;
}