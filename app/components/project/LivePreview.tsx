import { useMemo, useState, useEffect } from 'react';
import type { ProjectFile, ProjectType } from '~/lib/types';

interface LivePreviewProps {
  files: ProjectFile[];
  projectType: ProjectType | null;
}

type DeviceMode = 'mobile' | 'desktop';

function findFile(files: ProjectFile[], path: string): ProjectFile | undefined {
  return files.find((f) => f.path === path || f.path.endsWith('/' + path));
}

function detectProjectType(files: ProjectFile[]): ProjectType {
  const hasExpoConfig = files.some(
    (f) =>
      f.path === 'app.json' &&
      f.content.includes('expo')
  );
  const hasRnImports = files.some(
    (f) =>
      (f.language === 'tsx' || f.language === 'ts' || f.language === 'jsx' || f.language === 'js') &&
      /from\s+['"]react-native['"]/.test(f.content)
  );
  if (hasExpoConfig || hasRnImports) return 'expo';
  return 'react-web';
}

function buildReactWebPreview(files: ProjectFile[]): string {
  const htmlFile = findFile(files, 'index.html') || findFile(files, 'index.htm');
  const cssFiles = files.filter((f) => f.language === 'css' || f.path.endsWith('.css'));
  const jsFiles = files.filter(
    (f) =>
      f.language === 'js' ||
      f.language === 'javascript' ||
      f.path.endsWith('.js')
  );
  const tsxFiles = files.filter(
    (f) =>
      f.language === 'tsx' ||
      f.language === 'jsx' ||
      f.language === 'ts' ||
      f.path.endsWith('.tsx') ||
      f.path.endsWith('.jsx')
  );

  let html = htmlFile?.content || '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n</head>\n<body>\n<div id="root"></div>\n</body>\n</html>';

  const styleTags = cssFiles
    .map((f) => `<style data-path="${f.path}">\n${f.content}\n</style>`)
    .join('\n');
  if (styleTags) {
    html = html.replace('</head>', `${styleTags}\n</head>`);
  }

  const hasReactRoot = html.includes('id="root"') || html.includes("id='root'");
  if (!hasReactRoot) {
    html = html.replace('</body>', '<div id="root"></div>\n</body>');
  }

  const babelScript = `
<script type="module">
import { transform } from "https://esm.sh/@babel/standalone@7.24.7";
window.babelTransform = (code, filename) => {
  const result = transform(code, {
    filename: filename || 'file.tsx',
    presets: [
      ['typescript', { allExtensions: true, isTSX: true }],
      ['react', { runtime: 'automatic' }]
    ],
  });
  return result.code;
};
</script>`;

  const reactPreamble = `
<script type="module">
import React, { useState, useEffect, useRef, useCallback, useMemo } from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
window.React = React;
window.useState = useState;
window.useEffect = useEffect;
window.useRef = useRef;
window.useCallback = useCallback;
window.useMemo = useMemo;
window.createRoot = createRoot;
</script>`;

  const fileModules = tsxFiles.map((f) => {
    const safePath = f.path.replace(/[^a-zA-Z0-9_]/g, '_');
    return `<script type="module" data-path="${f.path}">
const raw = ${JSON.stringify(f.content)};
const transformed = window.babelTransform(raw, "${f.path}");
const blob = new Blob([transformed], { type: 'text/javascript' });
const url = URL.createObjectURL(blob);
window.__module_${safePath} = url;
</script>`;
  }).join('\n');

  const entryFile = tsxFiles.find((f) =>
    f.path === 'src/App.tsx' ||
    f.path === 'src/App.jsx' ||
    f.path === 'src/main.tsx' ||
    f.path === 'src/main.jsx' ||
    f.path === 'src/index.tsx' ||
    f.path === 'src/index.jsx' ||
    f.path === 'App.tsx' ||
    f.path === 'App.jsx'
  );

  let entryScript = '';
  if (entryFile) {
    const safePath = entryFile.path.replace(/[^a-zA-Z0-9_/]/g, '_');
    entryScript = `<script type="module">
const mod = await import(window.__module_${safePath});
const root = createRoot(document.getElementById('root'));
const Component = mod.default || mod.App;
root.render(Component ? React.createElement(Component) : null);
</script>`;
  }

  const plainJsScripts = jsFiles
    .filter((f) => !tsxFiles.includes(f))
    .map((f) => `<script data-path="${f.path}">\n${f.content}\n</script>`)
    .join('\n');

  if (plainJsScripts) {
    html = html.replace('</body>', `${plainJsScripts}\n</body>`);
  }

  html = html.replace('</head>', `${babelScript}\n${reactPreamble}\n${fileModules}\n${entryScript}\n</head>`);

  return html;
}

function buildExpoPreview(files: ProjectFile[]): string {
  const appFile = files.find(
    (f) =>
      f.path === 'App.tsx' ||
      f.path === 'App.js' ||
      f.path === 'app/App.tsx' ||
      f.path === 'app/App.js' ||
      f.path === 'src/App.tsx' ||
      f.path === 'src/App.js'
  );

  const componentFiles = files.filter(
    (f) =>
      (f.language === 'tsx' || f.language === 'jsx' || f.path.endsWith('.tsx') || f.path.endsWith('.jsx')) &&
      f.path !== 'node_modules/' &&
      !f.path.startsWith('node_modules/')
  );

  const allRnFiles = appFile ? [appFile, ...componentFiles.filter((f) => f !== appFile)] : componentFiles;

  const fileModules = allRnFiles.map((f) => {
    const safePath = f.path.replace(/[^a-zA-Z0-9_]/g, '_');
    return `<script type="module">
const raw = ${JSON.stringify(f.content)};
const transformed = window.babelTransform(raw, "${f.path}");
const blob = new Blob([transformed], { type: 'text/javascript' });
const url = URL.createObjectURL(blob);
window.__module_${safePath} = url;
</script>`;
  }).join('\n');

  const entryPath = appFile?.path || componentFiles[0]?.path;
  const safeEntry = entryPath ? entryPath.replace(/[^a-zA-Z0-9_]/g, '_') : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { height: 100%; background: #fff; }
  #root { height: 100%; }
</style>
<script type="module">
import { transform } from "https://esm.sh/@babel/standalone@7.24.7";
window.babelTransform = (code, filename) => {
  const result = transform(code, {
    filename: filename || 'file.tsx',
    presets: [
      ['typescript', { allExtensions: true, isTSX: true }],
      ['react', { runtime: 'automatic' }]
    ],
  });
  return result.code;
};
</script>
<script type="module">
import React, { useState, useEffect, useRef, useCallback, useMemo } from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
window.React = React;
window.useState = useState;
window.useEffect = useEffect;
window.useRef = useRef;
window.useCallback = useCallback;
window.useMemo = useMemo;
window.createRoot = createRoot;
</script>
<script type="module">
import { View, Text, ScrollView, Image, Pressable, TouchableOpacity, TextInput, FlatList, StyleSheet, SafeAreaView, StatusBar, ActivityIndicator, Modal, Switch, Platform, Dimensions, KeyboardAvoidingView, TouchableWithoutFeedback, Alert, Linking, Animated, Easing, PanResponder } from "https://esm.sh/react-native-web@0.19.13?external=react,react-dom";
window.View = View;
window.Text = Text;
window.ScrollView = ScrollView;
window.Image = Image;
window.Pressable = Pressable;
window.TouchableOpacity = TouchableOpacity;
window.TextInput = TextInput;
window.FlatList = FlatList;
window.StyleSheet = StyleSheet;
window.SafeAreaView = SafeAreaView;
window.StatusBar = StatusBar;
window.ActivityIndicator = ActivityIndicator;
window.Modal = Modal;
window.Switch = Switch;
window.Platform = Platform;
window.Dimensions = Dimensions;
window.KeyboardAvoidingView = KeyboardAvoidingView;
window.TouchableWithoutFeedback = TouchableWithoutFeedback;
window.Alert = Alert;
window.Linking = Linking;
window.Animated = Animated;
window.Easing = Easing;
window.PanResponder = PanResponder;
</script>
${fileModules}
<script type="module">
const root = createRoot(document.getElementById('root'));
${safeEntry ? `
try {
  const mod = await import(window.__module_${safeEntry});
  const Component = mod.default || mod.App;
  root.render(Component ? React.createElement(Component) : React.createElement(Text, null, 'No default export found'));
} catch(err) {
  root.render(React.createElement('div', { style: { padding: 20, fontFamily: 'monospace', fontSize: 13, color: '#cc0000' } }, 'Error: ' + err.message));
}
` : `
root.render(React.createElement('div', { style: { padding: 20, fontFamily: 'monospace', fontSize: 13, color: '#666' } }, 'No App.tsx found'));
`}
</script>
</head>
<body>
<div id="root"></div>
</body>
</html>`;
}

function buildStaticHtmlPreview(files: ProjectFile[]): string {
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

export default function LivePreview({ files, projectType }: LivePreviewProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');

  const detectedType = useMemo(() => projectType || detectProjectType(files), [projectType, files]);

  const isExpo = detectedType === 'expo';

  const previewHtml = useMemo(() => {
    if (isExpo) return buildExpoPreview(files);
    const hasTsx = files.some(
      (f) => f.language === 'tsx' || f.language === 'jsx' || f.path.endsWith('.tsx') || f.path.endsWith('.jsx')
    );
    if (hasTsx) return buildReactWebPreview(files);
    return buildStaticHtmlPreview(files);
  }, [files, isExpo]);

  useEffect(() => {
    if (autoRefresh) {
      const timer = setTimeout(() => {
        setIframeKey((k) => k + 1);
        setLastRefresh(Date.now());
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [previewHtml, autoRefresh]);

  useEffect(() => {
    setDeviceMode(isExpo ? 'mobile' : 'desktop');
  }, [isExpo]);

  const hasContent = files.length > 0 && (
    files.some((f) => f.path.endsWith('.html') || f.path.endsWith('.htm')) ||
    files.some((f) => f.language === 'tsx' || f.language === 'jsx' || f.path.endsWith('.tsx') || f.path.endsWith('.jsx'))
  );

  if (!hasContent) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#171717]">
        <div className="text-center px-6">
          <svg className="w-12 h-12 text-[#3F3F3F] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <h3 className="text-sm font-medium text-white mb-1">Preview not available</h3>
          <p className="text-xs text-[#A3A3A3] max-w-xs">
            {isExpo
              ? 'Preview appears when the project has an App.tsx file.'
              : 'Live preview appears when the project has an index.html or App.tsx file.'}
          </p>
        </div>
      </div>
    );
  }

  const isMobile = deviceMode === 'mobile';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between bg-[#1E1E1E] border-b border-[#2F2F2F] px-3 py-1.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
          <span className="text-xs text-[#A3A3A3] ml-2">preview</span>
          <span className="text-[10px] text-[#555] ml-1 px-1.5 py-0.5 rounded bg-[#2A2A2A]">
            {isExpo ? 'Expo' : 'React Web'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-md bg-[#2A2A2A] p-0.5">
            <button
              onClick={() => setDeviceMode('mobile')}
              className={`flex h-6 w-7 items-center justify-center rounded transition-colors ${
                isMobile ? 'bg-[#3C5D8D] text-white' : 'text-[#777] hover:text-white'
              }`}
              title="Mobile view"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="7" y="3" width="10" height="18" rx="2" />
                <line x1="11" y1="18" x2="13" y2="18" />
              </svg>
            </button>
            <button
              onClick={() => setDeviceMode('desktop')}
              className={`flex h-6 w-7 items-center justify-center rounded transition-colors ${
                !isMobile ? 'bg-[#3C5D8D] text-white' : 'text-[#777] hover:text-white'
              }`}
              title="Desktop view"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="4" width="18" height="12" rx="1" />
                <line x1="8" y1="20" x2="16" y2="20" />
              </svg>
            </button>
          </div>
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

      <div className={`flex-1 bg-[#0F0F0F] overflow-hidden flex items-center justify-center ${isMobile ? 'p-4' : 'p-0'}`}>
        {isMobile ? (
          <div
            className="relative bg-white shadow-2xl overflow-hidden"
            style={{
              width: '390px',
              maxWidth: '100%',
              height: '100%',
              maxHeight: '844px',
              borderRadius: '40px',
              border: '8px solid #1a1a1a',
            }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#1a1a1a] rounded-b-2xl z-10" />
            <iframe
              key={iframeKey}
              srcDoc={previewHtml}
              title="preview-mobile"
              sandbox="allow-scripts allow-modals allow-forms allow-popups"
              className="w-full h-full border-0"
              style={{ borderRadius: '32px' }}
            />
          </div>
        ) : (
          <div className="w-full h-full bg-white overflow-hidden">
            <iframe
              key={iframeKey}
              srcDoc={previewHtml}
              title="preview-desktop"
              sandbox="allow-scripts allow-modals allow-forms allow-popups"
              className="w-full h-full border-0"
            />
          </div>
        )}
      </div>
    </div>
  );
}
