import { useState, useEffect, lazy, Suspense } from 'react';
import type { OnMount } from '@monaco-editor/react';
import type { ProjectFile } from '~/lib/types';

const Editor = lazy(() => import('@monaco-editor/react').then((m) => ({ default: m.default })));

interface CodeEditorProps {
  file: ProjectFile | null;
  onContentChange: (fileId: string, content: string) => void;
  onClose?: () => void;
}

function mapLanguage(lang: string): string {
  const map: Record<string, string> = {
    tsx: 'typescript',
    ts: 'typescript',
    jsx: 'javascript',
    js: 'javascript',
    json: 'json',
    css: 'css',
    html: 'html',
    md: 'markdown',
    mdx: 'markdown',
    py: 'python',
    sh: 'shell',
    yaml: 'yaml',
    yml: 'yaml',
    sql: 'sql',
    toml: 'ini',
  };
  return map[lang] || 'plaintext';
}

export default function CodeEditor({ file, onContentChange, onClose }: CodeEditorProps) {
  const [content, setContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (file) {
      setContent(file.content);
      setHasUnsavedChanges(false);
    }
  }, [file?.id, file?.version]);

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#171717]">
        <div className="text-center">
          <svg className="w-12 h-12 text-[#3F3F3F] mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V9l-6-6z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 3v6h6" />
          </svg>
          <p className="text-sm text-[#A3A3A3]">Select a file to edit</p>
        </div>
      </div>
    );
  }

  const handleMount: OnMount = (editor) => {
    editor.focus();
  };

  function handleEditorChange(value: string | undefined) {
    const newValue = value || '';
    setContent(newValue);
    if (file && newValue !== file.content) {
      setHasUnsavedChanges(true);
      onContentChange(file.id, newValue);
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center justify-between bg-[#1E1E1E] border-b border-[#2F2F2F] px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#A3A3A3]">{file.path}</span>
          {hasUnsavedChanges && (
            <span className="w-2 h-2 rounded-full bg-[#6C9DE8]" title="Unsaved changes" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-1.5 py-0.5 rounded bg-[#262626] text-[#A3A3A3]">
            {file.language}
          </span>
          <span className="text-xs text-[#A3A3A3]">v{file.version}</span>
          <button
            onClick={() => navigator.clipboard.writeText(content)}
            className="text-xs text-[#A3A3A3] hover:text-white transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs text-[#A3A3A3] hover:text-white transition-colors flex items-center gap-1"
              title="Close editor and return to preview"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>
          )}
        </div>
      </div>

      {/* Monaco editor */}
      <div className="flex-1 overflow-hidden">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full bg-[#1E1E1E]">
              <svg className="w-6 h-6 text-[#A3A3A3] animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          }
        >
          <Editor
            height="100%"
            language={mapLanguage(file.language)}
            value={content}
            onMount={handleMount}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', monospace",
              fontLigatures: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              padding: { top: 12, bottom: 12 },
              lineNumbers: 'on',
              renderLineHighlight: 'all',
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              tabSize: 2,
              automaticLayout: true,
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}
