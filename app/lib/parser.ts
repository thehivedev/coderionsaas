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

  const patterns = [
    /(?:^|\s)(?:filepath|file|path)[:=]\s*[`"']?(.+?)[`"']?\s*$/i,
    [3, 4],
    /```(?:[a-zA-Z]+)?\s*\n?\s*(?:\/\/\s*)?(?:filepath|file|path)[:=]\s*[`"']?(.+?)[`"']?\s*$/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern as RegExp);
    if (match && match[1]) {
      return match[1].replace(/[`"']/g, '').trim();
    }
  }

  const filepathMatch = trimmed.match(/(?:\/\/|#|<!--)\s*(?:filepath|file|path)[:=]\s*(.+?)\s*(?:-->|$)/i);
  if (filepathMatch && filepathMatch[1]) {
    return filepathMatch[1].replace(/[`"']/g, '').trim();
  }

  return null;
}

export function parseGeneratedFiles(response: string): ParsedFile[] {
  const files: ParsedFile[] = [];
  const lines = response.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      let path: string | null = null;
      let language = '';

      const fenceMatch = line.match(/^```(\w*)/);
      if (fenceMatch) {
        language = fenceMatch[1] || '';
      }

      let checkIdx = i + 1;
      if (checkIdx < lines.length) {
        const pathFromNext = extractPath(lines[checkIdx]);
        if (pathFromNext) {
          path = pathFromNext;
          checkIdx++;
        }
      }

      if (!path) {
        const pathFromFence = extractPath(line);
        if (pathFromNext) {
          path = pathFromFence;
        }
      }

      if (!path) {
        const inlinePath = line.match(/```(?:\w+)?\s+(.+)/);
        if (inlinePath && inlinePath[1]) {
          const candidate = inlinePath[1].replace(/[`"']/g, '').trim();
          if (candidate.includes('/') || candidate.includes('.') || candidate.includes('\\')) {
            path = candidate;
          }
        }
      }

      if (!path) {
        i++;
        continue;
      }

      const contentLines: string[] = [];
      let foundClose = false;
      for (let j = checkIdx; j < lines.length; j++) {
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
    } else {
      i++;
    }
  }

  return files;
}

export function stripFileBlocks(response: string): string {
  const files = parseGeneratedFiles(response);
  let cleaned = response;

  for (const file of files) {
    const blockRegex = new RegExp(
      '```[a-zA-Z]*\\s*(?://\\s*)?(?:filepath|file|path)[:=]\\s*[^\\n]+\\n[\\s\\S]*?```\\n?',
      'g'
    );
    cleaned = cleaned.replace(blockRegex, '');
  }

  const genericBlockRegex = /```[a-zA-Z]+\s+\S[\s\S]*?```\n?/g;
  cleaned = cleaned.replace(genericBlockRegex, '');

  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned || 'Proyecto generado correctamente.';
}
