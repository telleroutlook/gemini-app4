// Simple cache for processed Mermaid code to prevent unnecessary re-processing
const mermaidCache = new Map<string, string>();

export function fixMermaidSyntax(mermaidCode: string): string {
  // Enhanced Mermaid syntax fixer with optimal fault tolerance
  // Based on Context7 research and official Mermaid.js best practices
  // Handles Chinese characters, comments, syntax errors, and edge cases
  
  // Early return if empty
  if (!mermaidCode?.trim()) return mermaidCode || '';

  // Check cache first to prevent redundant processing
  if (mermaidCache.has(mermaidCode)) {
    return mermaidCache.get(mermaidCode)!;
  }

  let fixed = mermaidCode.trim();
  
  // console.log('Fixing Mermaid syntax using official best practices, input:', fixed);
  
  try {
    // Step 1: Handle comments properly - Mermaid expects comments on separate lines
    // Remove inline comments that cause "UNICODE_TEXT" parse errors
    const lines = fixed.split('\n');
    const processedLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // Skip empty lines
      if (!line) {
        continue;
      }
      
      // Handle Mermaid comment syntax (% comment)
      if (line.includes('%')) {
        const parts = line.split('%');
        const codePart = parts[0].trim();
        const commentPart = parts.slice(1).join('%').trim();
        
        // If there's code before the comment, keep it
        if (codePart) {
          processedLines.push(codePart);
        }
        
        // Add comment on separate line if it exists and isn't empty
        if (commentPart) {
          processedLines.push(`%% ${commentPart}`);
        }
        continue;
      }
      
      // Remove C-style comments that can interfere with parsing
      line = line.replace(/\/\*[\s\S]*?\*\//g, '');
      line = line.replace(/\/\/.*$/g, '');
      
      // Skip if line became empty after comment removal
      if (!line.trim()) {
        continue;
      }
      
      processedLines.push(line);
    }
    
    // Step 2: Process each line for syntax fixes
    const finalLines = processedLines.map(line => {
      let processedLine = line.trim();
      
      // Skip diagram type declarations and directives
      if (processedLine.startsWith('graph ') || 
          processedLine.startsWith('flowchart ') ||
          processedLine.startsWith('sequenceDiagram') ||
          processedLine.startsWith('classDiagram') ||
          processedLine.startsWith('stateDiagram') ||
          processedLine.startsWith('gantt') ||
          processedLine.startsWith('pie') ||
          processedLine.startsWith('journey') ||
          processedLine.startsWith('gitgraph') ||
          processedLine.startsWith('mindmap') ||
          processedLine.startsWith('timeline') ||
          processedLine.startsWith('sankey') ||
          processedLine.startsWith('block') ||
          processedLine.startsWith('zenuml') ||
          processedLine.startsWith('style ') ||
          processedLine.startsWith('class ') ||
          processedLine.startsWith('click ') ||
          processedLine.startsWith('accTitle:') ||
          processedLine.startsWith('accDescr:') ||
          processedLine.startsWith('%%')) {
        return processedLine;
      }
      
      // Step 3: Remove problematic trailing semicolons
      processedLine = processedLine.replace(/;+$/g, '');
      
      // Step 4: Fix Chinese punctuation marks that cause parsing issues
      processedLine = processedLine.replace(/？/g, '?');
      processedLine = processedLine.replace(/：/g, ':');
      processedLine = processedLine.replace(/，/g, ',');
      processedLine = processedLine.replace(/。/g, '.');
      processedLine = processedLine.replace(/（/g, '(');
      processedLine = processedLine.replace(/）/g, ')');
      processedLine = processedLine.replace(/【/g, '[');
      processedLine = processedLine.replace(/】/g, ']');
      processedLine = processedLine.replace(/｛/g, '{');
      processedLine = processedLine.replace(/｝/g, '}');
      
      // Step 5: The key fix for Chinese characters - use double quotes
      // This is the official solution from Mermaid.js documentation
      
      // Fix rectangular nodes: A[中文] -> A["中文"]
      processedLine = processedLine.replace(
        /([A-Za-z0-9_]+)\[([^\]]*[\u4e00-\u9fff][^\]]*)\]/g, 
        (match, nodeId, text) => {
          if (text.startsWith('"') && text.endsWith('"')) {
            return match;
          }
          // Escape any internal quotes
          const escapedText = text.replace(/"/g, '#quot;');
          return `${nodeId}["${escapedText}"]`;
        }
      );
      
      // Fix decision/rhombus nodes: A{中文} -> A{"中文"}
      processedLine = processedLine.replace(
        /([A-Za-z0-9_]+)\{([^}]*[\u4e00-\u9fff][^}]*)\}/g, 
        (match, nodeId, text) => {
          if (text.startsWith('"') && text.endsWith('"')) {
            return match;
          }
          const escapedText = text.replace(/"/g, '#quot;');
          return `${nodeId}{"${escapedText}"}`;
        }
      );
      
      // Fix round/circular nodes: A(中文) -> A("中文")
      processedLine = processedLine.replace(
        /([A-Za-z0-9_]+)\(([^)]*[\u4e00-\u9fff][^)]*)\)/g, 
        (match, nodeId, text) => {
          if (text.startsWith('"') && text.endsWith('"')) {
            return match;
          }
          const escapedText = text.replace(/"/g, '#quot;');
          return `${nodeId}("${escapedText}")`;
        }
      );
      
      // Fix edge labels with Chinese: -->|中文| -> -->|"中文"|
      processedLine = processedLine.replace(
        /(-->|---|===|==>|\.-\.|\.-.->)\|([^|]*[\u4e00-\u9fff][^|]*)\|/g,
        (match, arrow, text) => {
          if (text.startsWith('"') && text.endsWith('"')) {
            return match;
          }
          const escapedText = text.replace(/"/g, '#quot;');
          return `${arrow}|"${escapedText}"|`;
        }
      );
      
      // Step 6: Fix common syntax issues
      // Ensure proper spacing around arrows
      processedLine = processedLine.replace(/([A-Za-z0-9_]+)(-->|---|===|==>|\.-\.|\.-.->)([A-Za-z0-9_]+)/g, '$1 $2 $3');
      
      // Clean up excessive whitespace
      processedLine = processedLine.replace(/\s+/g, ' ').trim();
      
      return processedLine;
    });
    
    // Step 7: Final assembly and validation
    const result = finalLines.filter(line => line.length > 0).join('\n');
    
    // Basic validation - ensure we have a diagram type
    const hasValidDiagramType = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|gantt|pie|journey|gitgraph|mindmap|timeline|sankey|block|zenuml|quadrantChart|gitGraph|requirement|architecture|c4Context|c4Container|c4Component|c4Dynamic)/m.test(result);
    
    if (!hasValidDiagramType && result.length > 0) {
      // Check if it's a table-like structure that shouldn't be treated as Mermaid
      if (result.includes('title:') && result.includes('column_') && result.includes('row_')) {
        console.warn('Table-like structure detected, this is not a valid Mermaid diagram');
        // Return a special marker to indicate this is an unsupported table
        return 'UNSUPPORTED_TABLE_SYNTAX';
      }
      
      console.warn('No valid diagram type found, prepending graph TD');
      const withDiagramType = `graph TD\n${result}`;
      // console.log('Fixed Mermaid syntax using official best practices, output:', withDiagramType);
      mermaidCache.set(mermaidCode, withDiagramType);
      return withDiagramType;
    }
    
    // console.log('Fixed Mermaid syntax using official best practices, output:', result);
    mermaidCache.set(mermaidCode, result);
    return result;
    
  } catch (error) {
    console.error('Error in fixMermaidSyntax:', error);
    // Fallback: return original with minimal fixes
    const fallback = mermaidCode
      .replace(/[\u4e00-\u9fff：？，。（）【】｛｝]/g, (char) => {
        const charMap: { [key: string]: string } = {
          '：': ':', '？': '?', '，': ',', '。': '.',
          '（': '(', '）': ')', '【': '[', '】': ']',
          '｛': '{', '｝': '}'
        };
        return charMap[char] || char;
      })
      .replace(/;+$/gm, '')
      .trim();
    
    // console.log('Fallback Mermaid syntax fix applied:', fallback);
    mermaidCache.set(mermaidCode, fallback);
    return fallback;
  }
}

export interface ParsedSection {
  type: 'text' | 'mermaid' | 'table' | 'math' | 'code';
  content: string | TableRow[];
  config?: SectionConfig;
  startIndex: number;
  endIndex: number;
}

export interface SectionConfig {
  headers?: string[];
  type?: string;
  language?: string;
  displayMode?: 'block' | 'inline';
}

export interface TableRow {
  [key: string]: string | number | boolean;
}

export interface TableData {
  headers: string[];
  data: TableRow[];
}


export function parseAIContent(content: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  let currentIndex = 0;

  // Parse Mermaid diagrams
  const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
  let match;
  while ((match = mermaidRegex.exec(content)) !== null) {
    // Add text before mermaid
    if (match.index > currentIndex) {
      sections.push({
        type: 'text',
        content: content.slice(currentIndex, match.index),
        startIndex: currentIndex,
        endIndex: match.index
      });
    }

    sections.push({
      type: 'mermaid',
      content: fixMermaidSyntax(match[1].trim()),
      startIndex: match.index,
      endIndex: match.index + match[0].length
    });

    currentIndex = match.index + match[0].length;
  }

  // Parse tables (CSV format)
  const tableRegex = /```table\n([\s\S]*?)\n```/g;
  while ((match = tableRegex.exec(content)) !== null) {
    // Add text before table
    if (match.index > currentIndex) {
      sections.push({
        type: 'text',
        content: content.slice(currentIndex, match.index),
        startIndex: currentIndex,
        endIndex: match.index
      });
    }

    try {
      const tableData = JSON.parse(match[1]) as TableData;
      sections.push({
        type: 'table',
        content: tableData.data,
        config: { headers: tableData.headers },
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    } catch (e) {
      console.error('Failed to parse table data:', e);
      // Fallback to text
      sections.push({
        type: 'text',
        content: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }

    currentIndex = match.index + match[0].length;
  }


  // Parse code blocks (excluding mermaid, table)
  const codeRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
  while ((match = codeRegex.exec(content)) !== null) {
    // Skip if already processed as mermaid or table
    const isProcessed = sections.some(section => 
      section.startIndex === match.index && section.endIndex === match.index + match[0].length
    );
    
    if (!isProcessed) {
      // Add text before code
      if (match.index > currentIndex) {
        sections.push({
          type: 'text',
          content: content.slice(currentIndex, match.index),
          startIndex: currentIndex,
          endIndex: match.index
        });
      }

      sections.push({
        type: 'code',
        content: match[2],
        config: { language: match[1] || 'text' },
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });

      currentIndex = match.index + match[0].length;
    }
  }

  // Parse math expressions (block)
  const blockMathRegex = /\$\$([\s\S]*?)\$\$/g;
  while ((match = blockMathRegex.exec(content)) !== null) {
    // Add text before math
    if (match.index > currentIndex) {
      sections.push({
        type: 'text',
        content: content.slice(currentIndex, match.index),
        startIndex: currentIndex,
        endIndex: match.index
      });
    }

    sections.push({
      type: 'math',
      content: match[1].trim(),
      config: { displayMode: 'block' },
      startIndex: match.index,
      endIndex: match.index + match[0].length
    });

    currentIndex = match.index + match[0].length;
  }

  // Parse inline math expressions
  const inlineMathRegex = /\$([^$\n]+?)\$/g;
  while ((match = inlineMathRegex.exec(content)) !== null) {
    // Add text before math
    if (match.index > currentIndex) {
      sections.push({
        type: 'text',
        content: content.slice(currentIndex, match.index),
        startIndex: currentIndex,
        endIndex: match.index
      });
    }

    sections.push({
      type: 'math',
      content: match[1].trim(),
      config: { displayMode: 'inline' },
      startIndex: match.index,
      endIndex: match.index + match[0].length
    });

    currentIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (currentIndex < content.length) {
    sections.push({
      type: 'text',
      content: content.slice(currentIndex),
      startIndex: currentIndex,
      endIndex: content.length
    });
  }

  return sections;
}

export function extractTextContent(sections: ParsedSection[]): string {
  return sections
    .filter(section => section.type === 'text')
    .map(section => {
      if (typeof section.content === 'string') {
        return section.content;
      }
      return '';
    })
    .join('\n\n');
}

export function hasRichContent(sections: ParsedSection[]): boolean {
  return sections.some(section => section.type !== 'text');
}

export function getContentSummary(sections: ParsedSection[]): {
  hasDiagrams: boolean;
  hasTables: boolean;
  hasMath: boolean;
  hasCode: boolean;
} {
  return {
    hasDiagrams: sections.some(s => s.type === 'mermaid'),
    hasTables: sections.some(s => s.type === 'table'),
    hasMath: sections.some(s => s.type === 'math'),
    hasCode: sections.some(s => s.type === 'code'),
  };
} 