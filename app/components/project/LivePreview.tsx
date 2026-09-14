import { useMemo, useState, useEffect } from 'react';
import type { ProjectFile } from '~/lib/types';

interface LivePreviewProps {
  files: ProjectFile[];
}

function findFile(files: ProjectFile[], path: string): ProjectFile | undefined {
  return files.find((f) => f.path === path || f.path.endsWith('/' + path));
}

function buildPreview(files: ProjectFile[]): string {
  const htmlFile = findFile(files, 'index.html') || findFile(files, 'index.htm');
  const cssFiles = files.filter((f) => f.language === 'css' || f.path.endsWith('.css'));
  const jsFiles = files.filter(
    (f) =>
      f.language === 'js' ||
      f.language === 'javascript' ||
      f.path.endsWith('.js')
  );

  let html = htmlFile?.content || '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n</head>\n<body>\n</body>\n</html>';

  const styleTags = cssFiles
    .map((f) => `<style data-path="${f.path}">\n${f.content}\n</style>`)
    .join('\n');
  if (styleTags) {
    html = html.replace('</head>', `${styleTags}\n</head>`);
  }

  const scriptTags = jsFiles
    .map((f) => `<script data-path="${f.path}">\n${f.content}\n</script>`)
    .join('\n');
  if (scriptTags) {
    html = html.replace('</body>', `${scriptTags}\n</body>`);
  }

  return html;
}

export default function LivePreview({ files }: LivePreviewProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const previewHtml = useMemo(() => buildPreview(files), [files]);

  useEffect(() => {
    if (autoRefresh) {
      const timer = setTimeout(() => {
        setIframeKey((k) => k + 1);
        setLastRefresh(Date.now());
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [previewHtml, autoRefresh]);

  const hasHtml = files.some(
    (f) => f.path.endsWith('.html') || f.path.endsWith('.htm')
  );

  if (!hasHtml) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#171717]">
        <div className="text-center px-6">
          <svg className="w-12 h-12 text-[#3F3F3F] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <h3 className="text-sm font-medium text-white mb-1">Preview not available</h3>
          <p className="text-xs text-[#A3A3A3] max-w-xs">
            Live preview appears when the project has an index.html file.
            For React projects, add an HTML file with the entry point.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Preview toolbar */}
      <div className="flex items-center justify-between bg-[#1E1E1E] border-b border-[#2F2F2F] px-3 py-1.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
          <span className="text-xs text-[#A3A3A3] ml-2">preview</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              autoRefresh
                ? 'text-[#8FB9FF] bg-[#4B82D1]/10'
                : 'text-[#A3A3A3] hover:text-white'
            }`}
          >
            {autoRefresh ? 'Auto' : 'Manual'}
          </button>
          <button
            onClick={() => {
              setIframeKey((k) => k + 1);
              setLastRefresh(Date.now());
            }}
            className="text-[#A3A3A3] hover:text-white transition-colors p-1"
            aria-label="Refresh"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.582m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <span className="text-xs text-[#A3A3A3]">
            {new Date(lastRefresh).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>

      {/* iframe */}
      <div className="flex-1 bg-white overflow-hidden">
        <iframe
          key={iframeKey}
          srcDoc={previewHtml}
          title="preview"
          sandbox="allow-scripts allow-modals allow-forms allow-popups"
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
}
