import type { ParsedFile } from './types';

const LANGUAGE_MAP: Record<string, string> = {
  tsx: 'tsx',
  ts: 'ts',
  jsx: 'jsx',
  js: 'js',
  json: 'json',
  css: 'css',
  html: 'html',
  md: 'md',
  mdx: 'mdx',
  py: 'py',
  sh: 'sh',
  yaml: 'yaml',
  yml: 'yaml',
  sql: 'sql',
  toml: 'toml',
  env: 'env',
};

function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  return LANGUAGE_MAP[ext] || ext || 'text';
}

function extractPath(line: string): string | null {
  const trimmed = line.trim();

  // Pattern: filepath:src/App.tsx  OR  file:src/App.tsx  OR  path:src/App.tsx
  const directMatch = trimmed.match(/^(?:filepath|file|path)[:=]\s*[`"']?(.+?)[`"']?\s*$/i);
  if (directMatch) return directMatch[1].replace(/[`"']/g, '').trim();

  // Pattern: // filepath:src/App.tsx  OR  # filepath:src/App.tsx
  const commentMatch = trimmed.match(/(?:\/\/|#|<!--)\s*(?:filepath|file|path)[:=]\s*(.+?)\s*(?:-->|$)/i);
  if (commentMatch) return commentMatch[1].replace(/[`"']/g, '').trim();

  return null;
}

export function parseGeneratedFiles(response: string): ParsedFile[] {
  const files: ParsedFile[] = [];
  const lines = response.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim().startsWith('```')) {
      i++;
      continue;
    }

    // Try to extract path from the fence line itself:
    // ```tsx filepath:src/App.tsx
    const fenceMatch = line.match(/^```(\w*)\s+(.*)/);
    let path: string | null = null;
    let language = '';
    let contentStartIdx = i + 1;

    if (fenceMatch) {
      language = fenceMatch[1] || '';
      const afterLang = fenceMatch[2].trim();
      const pathFromFence = extractPath(afterLang);
      if (pathFromFence) {
        path = pathFromFence;
      }
    }

    // If no path on fence line, check the next line for a filepath comment
    if (!path && contentStartIdx < lines.length) {
      const pathFromNext = extractPath(lines[contentStartIdx]);
      if (pathFromNext) {
        path = pathFromNext;
        contentStartIdx++;
      }
    }

    if (!path) {
      i++;
      continue;
    }

    // Collect content until closing fence
    const contentLines: string[] = [];
    let foundClose = false;
    for (let j = contentStartIdx; j < lines.length; j++) {
      if (lines[j].trim() === '```') {
        foundClose = true;
        i = j + 1;
        break;
      }
      contentLines.push(lines[j]);
    }

    if (!foundClose) {
      i++;
      continue;
    }

    let content = contentLines.join('\n');
    content = content.replace(/^\n+/, '').replace(/\s+$/, '');

    const detectedLang = language || detectLanguage(path);

    files.push({ path, content, language: detectedLang });
  }

  return files;
}

export function stripFileBlocks(response: string): string {
  const files = parseGeneratedFiles(response);
  let cleaned = response;

  for (const file of files) {
    // Escape regex special chars in path
    const escapedPath = file.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Match the full block: ```lang filepath:path ... content ... ```
    const blockRegex = new RegExp(
      '```\\w*\\s*(?://\\s*)?(?:filepath|file|path)[:=]\\s*' +
        escapedPath +
        '[^\\n]*\\n[\\s\\S]*?```\\n?',
      'g'
    );
    cleaned = cleaned.replace(blockRegex, '');
  }

  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned || 'Project generated successfully.';
}
