export interface CodeChunk {
  content: string;
  startLine: number;
  endLine: number;
  metadata: {
    language?: string;
    hasImports?: boolean;
    hasExports?: boolean;
  };
}

// Approximate tokens (4 chars = 1 token)
const MAX_CHUNK_SIZE = 2000; // ~500 tokens
const OVERLAP_SIZE = 200; // ~50 tokens overlap

export function chunkCode(
  content: string,
  filePath: string
): CodeChunk[] {
  const lines = content.split('\n');
  const chunks: CodeChunk[] = [];
  
  const language = getLanguageFromPath(filePath);
  let currentChunk: string[] = [];
  let currentStartLine = 0;
  let currentSize = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineSize = line.length;

    // If adding this line would exceed chunk size, save current chunk
    if (currentSize + lineSize > MAX_CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.join('\n'),
        startLine: currentStartLine,
        endLine: i - 1,
        metadata: {
          language,
          hasImports: hasImports(currentChunk.join('\n')),
          hasExports: hasExports(currentChunk.join('\n')),
        },
      });

      // Calculate overlap
      const overlapLines = Math.floor(OVERLAP_SIZE / (lineSize || 1));
      currentChunk = currentChunk.slice(-overlapLines);
      currentStartLine = i - overlapLines;
      currentSize = currentChunk.reduce((sum, l) => sum + l.length, 0);
    }

    currentChunk.push(line);
    currentSize += lineSize;
  }

  // Add final chunk
  if (currentChunk.length > 0) {
    chunks.push({
      content: currentChunk.join('\n'),
      startLine: currentStartLine,
      endLine: lines.length - 1,
      metadata: {
        language,
        hasImports: hasImports(currentChunk.join('\n')),
        hasExports: hasExports(currentChunk.join('\n')),
      },
    });
  }

  return chunks;
}

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    md: 'markdown',
    json: 'json',
    sql: 'sql',
    sh: 'shell',
    yaml: 'yaml',
    yml: 'yaml',
  };
  return languageMap[ext || ''] || 'text';
}

function hasImports(content: string): boolean {
  return /^import\s+/m.test(content) || /^from\s+\S+\s+import\s+/m.test(content);
}

function hasExports(content: string): boolean {
  return /^export\s+/m.test(content);
}

