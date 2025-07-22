/**
 * Enhanced Intent Parser for Natural Language File/Folder Operations
 * Designed using claude-prompter suggestions
 */

import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname } from 'path';

interface FileOperation {
  type: 'file';
  path: string;
  extension?: string;
}

interface FolderOperation {
  type: 'folder';
  path: string;
}

export type Operation = FileOperation | FolderOperation;

export interface ParseResult {
  operations: Operation[];
  errors: string[];
}

const folderKeywords = ['folder', 'directory', 'mkdir', 'dir'];
const fileKeywords = ['file', 'create', 'write', 'put', 'add'];
const fileTypeKeywords = ['html', 'css', 'js', 'ts', 'json', 'xml', 'md', 'txt', 'py', 'java', 'cpp'];
const defaultFileExtension = '.txt';

// Enhanced regex patterns for better natural language detection
const folderPatterns = [
  // More specific patterns that stop before common separators and don't match file creation
  new RegExp(`(?:create|make|build)\\s+(?:a\\s+)?(?:${folderKeywords.join('|')})\\s+(?:called\\s+|named\\s+)?([^\\s]+(?:\\s+[^\\s]+)*?)(?:\\s+(?:and|with|then)|$)(?!.*(?:${fileTypeKeywords.join('|')})\\s+file)`, 'i'),
  new RegExp(`(?:${folderKeywords.join('|')})\\s+(?:called\\s+|named\\s+)?([^\\s]+(?:\\s+[^\\s]+)*?)(?:\\s+(?:and|with|then)|$)(?!.*(?:${fileTypeKeywords.join('|')})\\s+file)`, 'i'),
  // Pattern for "in the FOLDER create..."
  new RegExp(`in\\s+(?:the\\s+)?([\\w\\-]+)\\s+(?:folder\\s+)?(?:create|make)`, 'i')
];

const filePatterns = [
  // Direct file paths like "create components/Button.tsx"
  new RegExp(`(?:create|make|build|write)\\s+([\\w\\/\\-]+\\.[\\w]+)(?:\\s|$)`, 'i'),
  // Match files with extensions like "helper.js", "index.ts", etc.
  new RegExp(`(?:create|make|build|put|add)\\s+(?:a\\s+)?(?:${fileKeywords.join('|')}\\s+)?(?:called\\s+|named\\s+)?([\\w\\-]+\\.[\\w]+)`, 'i'),
  new RegExp(`(?:with|add)\\s+(?:a\\s+)?([\\w\\-]+\\.[\\w]+)\\s+(?:${fileKeywords.join('|')})?`, 'i'),
  // Match file types like "create a html file", "make css file"
  new RegExp(`(?:create|make|build)\\s+(?:a\\s+)?(${fileTypeKeywords.join('|')})\\s+file(?:\\s+called\\s+([\\w\\-\\.]+))?`, 'i'),
  // Match generic file names
  new RegExp(`(?:create|make|build|put|add)\\s+(?:a\\s+)?(?:${fileKeywords.join('|')})\\s+(?:called\\s+|named\\s+)?([\\w\\s\\-\\.]+?)(?:\\s+in\\s+it)?(?:\\s|$)`, 'i'),
  new RegExp(`(?:${fileKeywords.join('|')})\\s+(?:called\\s+|named\\s+)?([\\w\\s\\-\\.]+?)(?:\\s+in\\s+it)?(?:\\s|$)`, 'i')
];

// Pattern to detect "put X in Y" relationships
const containmentPattern = /put\s+(?:a\s+)?(?:file\s+)?(?:called\s+)?([^\s]+)\s+in\s+(?:it|(?:the\s+)?(?:folder\s+)?(?:called\s+)?([^\s]+))/i;

function isFolderOnlyRequest(input: string): boolean {
  // Check if input mentions only folder creation without any file-related operations
  const hasFileKeywords = /\b(file|create.*file|add.*file|put.*file|with.*file|\.js|\.ts|\.txt|\.md|\.json)\b/i.test(input);
  const hasFolderKeywords = /\b(folder|directory|mkdir|dir)\b/i.test(input);
  
  // It's a folder-only request if it has folder keywords but no file keywords
  return hasFolderKeywords && !hasFileKeywords;
}

function cleanFolderName(name: string): string {
  // Replace spaces with underscores or hyphens for valid folder names
  return name.trim().replace(/\s+/g, '_');
}

export function parseFileOperations(input: string): ParseResult {
  const operations: Operation[] = [];
  const errors: string[] = [];
  
  try {
    // Check if this is a folder-only request (no file-related keywords)
    const folderOnlyRequest = isFolderOnlyRequest(input);
    
    // First, check for containment patterns (put X in Y)
    const containmentMatch = input.match(containmentPattern);
    let folderName = '';
    let fileName = '';
    
    if (containmentMatch) {
      fileName = containmentMatch[1].trim();
      folderName = containmentMatch[2]?.trim() || extractFolderName(input);
      
      if (folderName) {
        operations.push({ type: 'folder', path: folderName });
      }
      
      if (fileName) {
        const extension = fileName.includes('.') ? '' : defaultFileExtension;
        const filePath = folderName ? `${folderName}/${fileName}${extension}` : `${fileName}${extension}`;
        operations.push({ type: 'file', path: filePath });
      }
    }
    // Check for "inside" patterns like "create a file inside the test2 folder called happytimes.txt"
    else if (input.includes('inside') && input.includes('called')) {
      const insidePatterns = [
        // "make a file inside folder called test2 called index2.html" (claude-prompter analysis)
        /(?:make|create|add)\s+(?:a\s+)?file\s+inside\s+(?:folder\s+called\s+)?(\w+)\s+called\s+([\w\-]+\.(html|css|js|ts|json|xml|md|txt|py|java|cpp))/i,
        // "create a file inside the test2 folder called happytimes.txt"
        /(?:make|create|add)\s+(?:a\s+)?file\s+inside\s+(?:the\s+)?(\w+)\s+(?:folder\s+)?called\s+([\w\-\.]+)/i,
        // "make a file inside the folder test2 called test1.txt"
        /(?:make|create|add)\s+(?:a\s+)?file\s+inside\s+(?:the\s+)?(?:folder\s+)?(\w+)\s+called\s+([\w\-\.]+)/i
      ];
      
      for (const pattern of insidePatterns) {
        const insideMatch = input.match(pattern);
        if (insideMatch) {
          folderName = insideMatch[1].trim();
          fileName = insideMatch[2].trim();
          
          operations.push({ type: 'folder', path: folderName });
          
          // For the first pattern (with explicit extensions), don't add default extension
          const extension = fileName.includes('.') ? '' : defaultFileExtension;
          operations.push({ type: 'file', path: `${folderName}/${fileName}${extension}` });
          break;
        }
      }
    }
    else {
      // Check for "make a file inside FOLDER called FILENAME" pattern (claude-prompter analysis)
      const makeFileInsideCalledPattern = /make\s+a\s+file\s+inside\s+(?:folder\s+called\s+)?(\w+)\s+called\s+([\w\-]+\.(html|css|js|ts|json|xml|md|txt|py|java|cpp))/i;
      const makeFileInsideCalledMatch = input.match(makeFileInsideCalledPattern);
      
      if (makeFileInsideCalledMatch) {
        folderName = makeFileInsideCalledMatch[1].trim();
        const fileName = makeFileInsideCalledMatch[2].trim();
        
        operations.push({ type: 'folder', path: folderName });
        operations.push({ type: 'file', path: `${folderName}/${fileName}` });
      }
      // Check for "create/make FILENAME inside FOLDER" patterns (existing)
      else {
        const fileInsideFolderPattern = /(create|make)\s+(?:an?\s+)?([\w\-]+\.(html|css|js|ts|json|xml|md|txt|py|java|cpp))\s+(?:file\s+)?inside\s+([^\s]+)\s+folder/i;
        const fileInsideFolderMatch = input.match(fileInsideFolderPattern);
        
        if (fileInsideFolderMatch) {
          const fileName = fileInsideFolderMatch[2].trim();
          folderName = fileInsideFolderMatch[4].trim();
          
          operations.push({ type: 'folder', path: folderName });
          operations.push({ type: 'file', path: `${folderName}/${fileName}` });
        }
      }
      // Check for "in the FOLDER create FILE" patterns  
      if (!operations.length) {
        const inFolderPattern = /in\s+(?:the\s+)?(\w+)\s+(?:folder\s+)?create\s+(?:a\s+)?(html|css|js|ts|json|xml|md|txt|py|java|cpp)\s+file/i;
        const inFolderMatch = input.match(inFolderPattern);
        
        if (inFolderMatch) {
          folderName = inFolderMatch[1].trim();
          const fileType = inFolderMatch[2].toLowerCase();
          
          operations.push({ type: 'folder', path: folderName });
          
          const extension = `.${fileType}`;
          const fileName = `index${extension}`;
          operations.push({ type: 'file', path: `${folderName}/${fileName}` });
        } else {
        // Fallback to individual pattern matching
        // Check for folder creation
        for (const pattern of folderPatterns) {
          const match = input.match(pattern);
          if (match) {
            const folder = cleanFolderName(match[1]);
            if (folder && !operations.some(op => op.type === 'folder' && op.path === folder)) {
              operations.push({ type: 'folder', path: folder });
              folderName = folder;
            }
            break;
          }
        }
      
        // Only check for file creation if it's not a folder-only request
        if (!folderOnlyRequest) {
        for (const pattern of filePatterns) {
          const match = input.match(pattern);
          if (match) {
            // Check if this is a file type pattern (like "create a html file")
            if (pattern.source.includes(fileTypeKeywords.join('|'))) {
              const fileType = match[1].toLowerCase(); // html, css, js, etc.
              const fileName = match[2] ? match[2].trim() : 'index'; // custom name or default
              const extension = fileType === 'js' ? '.js' : 
                               fileType === 'ts' ? '.ts' : 
                               fileType === 'css' ? '.css' : 
                               fileType === 'json' ? '.json' :
                               fileType === 'py' ? '.py' :
                               fileType === 'java' ? '.java' :
                               fileType === 'cpp' ? '.cpp' :
                               fileType === 'md' ? '.md' :
                               fileType === 'xml' ? '.xml' :
                               `.${fileType}`;
              
              const fullFileName = fileName.includes('.') ? fileName : `${fileName}${extension}`;
              const filePath = folderName ? `${folderName}/${fullFileName}` : fullFileName;
              operations.push({ type: 'file', path: filePath });
              break;
            } else {
              let file = match[1].trim();
              if (file && !operations.some(op => op.type === 'file' && op.path.includes(file))) {
                // If file already has an extension, use it as-is
                if (file.includes('.')) {
                  const filePath = folderName && !file.includes('/') ? `${folderName}/${file}` : file;
                  operations.push({ type: 'file', path: filePath });
                } else {
                  // Add default extension for files without one
                  const extension = defaultFileExtension;
                  const filePath = folderName ? `${folderName}/${file}${extension}` : `${file}${extension}`;
                  operations.push({ type: 'file', path: filePath });
                }
              }
              break;
            }
          }
        }
        }
      }
      }
    }
    
    // Handle nested paths and ensure folder structure
    const processedOps = handleNestedPaths(operations);
    operations.splice(0, operations.length, ...processedOps);
    
  } catch (error) {
    errors.push(`Failed to parse input: ${error}`);
  }
  
  return { operations, errors };
}

function extractFolderName(input: string): string {
  for (const pattern of folderPatterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return '';
}

function handleNestedPaths(operations: Operation[]): Operation[] {
  const result: Operation[] = [];
  const createdFolders = new Set<string>();
  
  for (const operation of operations) {
    if (operation.type === 'folder') {
      // Add all parent folders if they don't exist
      const parts = operation.path.split('/');
      for (let i = 1; i <= parts.length; i++) {
        const folderPath = parts.slice(0, i).join('/');
        if (folderPath && !createdFolders.has(folderPath)) {
          result.push({ type: 'folder', path: folderPath });
          createdFolders.add(folderPath);
        }
      }
    } else if (operation.type === 'file') {
      const dir = dirname(operation.path);
      if (dir !== '.' && !createdFolders.has(dir)) {
        // Add parent directories
        const parts = dir.split('/');
        for (let i = 1; i <= parts.length; i++) {
          const folderPath = parts.slice(0, i).join('/');
          if (folderPath && !createdFolders.has(folderPath)) {
            result.push({ type: 'folder', path: folderPath });
            createdFolders.add(folderPath);
          }
        }
      }
      result.push(operation);
    }
  }
  
  return result;
}

export async function executeOperations(operations: Operation[]): Promise<{ success: Operation[], failed: Array<{ operation: Operation, error: string }> }> {
  const success: Operation[] = [];
  const failed: Array<{ operation: Operation, error: string }> = [];
  
  for (const operation of operations) {
    try {
      if (operation.type === 'folder') {
        if (!existsSync(operation.path)) {
          await mkdir(operation.path, { recursive: true });
          success.push(operation);
        } else {
          success.push(operation); // Already exists, consider successful
        }
      } else if (operation.type === 'file') {
        // File creation is handled by the writeCommand
        success.push(operation);
      }
    } catch (error) {
      failed.push({ 
        operation, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
  
  return { success, failed };
}

export function generateOperationSummary(operations: Operation[]): string {
  const folders = operations.filter(op => op.type === 'folder');
  const files = operations.filter(op => op.type === 'file');
  
  let summary = '';
  
  if (folders.length > 0) {
    summary += `📁 Created ${folders.length} folder(s): ${folders.map(f => f.path).join(', ')}\n`;
  }
  
  if (files.length > 0) {
    summary += `📝 Created ${files.length} file(s): ${files.map(f => f.path).join(', ')}\n`;
  }
  
  return summary || 'No operations detected';
}