import type { ProjectFile } from '~/lib/types';

interface CodeFile {
  path: string;
  content: string;
}

function collectCodeFiles(files: ProjectFile[]): CodeFile[] {
  return files
    .filter((f) => {
      if (f.path.startsWith('node_modules/')) return false;
      const ext = f.path.split('.').pop()?.toLowerCase();
      return ['tsx', 'ts', 'jsx', 'js'].includes(ext || '');
    })
    .map((f) => ({ path: f.path, content: f.content }));
}

function findEntryPath(files: CodeFile[], isExpo: boolean): string | null {
  const expoCandidates = [
    'App.tsx', 'App.js',
    'app/App.tsx', 'app/App.js',
    'src/App.tsx', 'src/App.js',
    'app/_layout.tsx',
    'src/main.tsx', 'src/main.jsx',
    'index.tsx', 'index.js',
  ];
  const webCandidates = [
    'src/main.tsx', 'src/main.jsx',
    'src/index.tsx', 'src/index.jsx',
    'src/App.tsx', 'src/App.jsx',
    'App.tsx', 'App.jsx',
    'main.tsx', 'main.jsx',
    'index.tsx', 'index.jsx',
  ];
  const candidates = isExpo ? expoCandidates : webCandidates;
  for (const c of candidates) {
    if (files.some((f) => f.path === c)) return c;
  }
  return files[0]?.path || null;
}

function isRendererFile(path: string): boolean {
  const renderers = [
    'src/main.tsx', 'src/main.jsx',
    'src/index.tsx', 'src/index.jsx',
    'main.tsx', 'main.jsx',
    'index.tsx', 'index.jsx',
  ];
  return renderers.includes(path);
}

function buildCssTags(files: ProjectFile[]): string {
  const cssFiles = files.filter(
    (f) => f.language === 'css' || f.path.endsWith('.css')
  );
  return cssFiles
    .map((f) => `<style>\n${f.content}\n</style>`)
    .join('\n');
}

export function buildPreviewHtml(
  files: ProjectFile[],
  isExpo: boolean
): string {
  const codeFiles = collectCodeFiles(files);
  const entryPath = findEntryPath(codeFiles, isExpo);
  const cssTags = buildCssTags(files);
  const entryIsRenderer = entryPath ? isRendererFile(entryPath) : false;
  const filesJson = JSON.stringify(
    codeFiles.map((f) => ({ path: f.path, content: f.content }))
  );

  const expoImports = isExpo
    ? `import { View, Text, ScrollView, Image, Pressable, TouchableOpacity, TouchableHighlight, TouchableWithoutFeedback, TextInput, FlatList, SectionList, StyleSheet, SafeAreaView, StatusBar, ActivityIndicator, Modal, Switch, Platform, Dimensions, KeyboardAvoidingView, Alert, Linking, Animated, Easing, PanResponder, RefreshControl, Button } from "https://esm.sh/react-native-web@0.19.13?external=react,react-dom";`
    : '';

  const expoPackages = isExpo
    ? `
    if (path === 'react-native' || path === 'react-native-web' || path.startsWith('react-native/')) {
      return { __esModule: true, default: {}, View, Text, ScrollView, Image, Pressable, TouchableOpacity, TouchableHighlight, TouchableWithoutFeedback, TextInput, FlatList, SectionList, StyleSheet, SafeAreaView, StatusBar, ActivityIndicator, Modal, Switch, Platform, Dimensions, KeyboardAvoidingView, Alert, Linking, Animated, Easing, PanResponder, RefreshControl, Button };
    }
    if (path === 'expo-status-bar') return { __esModule: true, default: function() { return null; }, StatusBar: function() { return null; } };
    if (path === 'expo-constants') return { __esModule: true, default: { expoConfig: {} } };
    if (path === 'expo-font') return { __esModule: true, default: { useFonts: () => [true] }, useFonts: () => [true] };
    if (path === 'expo-splash-screen') return { __esModule: true, default: { preventAutoHideAsync: () => Promise.resolve(), hideAsync: () => Promise.resolve() } };
    if (path.startsWith('expo-') || path.startsWith('@expo/')) return { __esModule: true, default: function() { return null; } };
    if (path.startsWith('@react-navigation/')) return { __esModule: true, default: function() { return null; }, NavigationContainer: function() { return null; }, createNativeStackNavigator: () => ({ Navigator: function() { return null; }, Screen: function() { return null; } }), createBottomTabNavigator: () => ({ Navigator: function() { return null; }, Screen: function() { return null; } }), createDrawerNavigator: () => ({ Navigator: function() { return null; }, Screen: function() { return null; } }), createMaterialTopTabNavigator: () => ({ Navigator: function() { return null; }, Screen: function() { return null; } }) };
    if (path === 'react-native-safe-area-context') return { __esModule: true, default: function() { return null; }, SafeAreaView: function() { return null; }, SafeAreaProvider: function() { return null; }, SafeAreaConsumer: function() { return null; }, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
    if (path === 'react-native-gesture-handler') return { __esModule: true, default: function() { return null; }, GestureHandlerRootView: function() { return null; }, PanGestureHandler: function() { return null; } };
    if (path === 'react-native-reanimated') return { __esModule: true, default: function() { return null; }, useSharedValue: () => ({ value: 0 }), useAnimatedStyle: () => ({}), withSpring: (v) => v, withTiming: (v) => v, withDecay: (v) => v, Easing: { bezier: () => ({}), linear: () => ({}), ease: () => ({}) } };
    if (path === 'react-native-svg') return { __esModule: true, default: function() { return null; }, Svg: function() { return null; }, Circle: function() { return null; }, Rect: function() { return null; }, Path: function() { return null; } };
`
    : '';

  const runtime = `
import { transform } from "https://esm.sh/@babel/standalone@7.24.7";
import React, { useState, useEffect, useRef, useCallback, useMemo, useReducer, useContext, useLayoutEffect, useDebugValue, useDeferredValue, useTransition, useId, useSyncExternalStore, useInsertionEffect, createContext, createElement, cloneElement, isValidElement, createRef, forwardRef, memo, lazy, Children, Fragment, StrictMode, Component, PureComponent } from "https://esm.sh/react@18.3.1";
import { createRoot, hydrateRoot } from "https://esm.sh/react-dom@18.3.1/client";
import { jsx, jsxs, Fragment as JsxFragment } from "https://esm.sh/react@18.3.1/jsx-runtime";
${expoImports}

const __files = ${filesJson};
const __entryPath = ${JSON.stringify(entryPath)};
const __entryIsRenderer = ${JSON.stringify(entryIsRenderer)};

const __modules = {};
const __errors = [];
for (const file of __files) {
  try {
    const result = transform(file.content, {
      filename: file.path,
      presets: [
        ['typescript', { allExtensions: true, isTSX: true }],
        ['react', { runtime: 'automatic' }],
        ['env', { modules: 'cjs', targets: { chrome: '100' } }]
      ]
    });
    __modules[file.path] = result.code;
  } catch (e) {
    __errors.push({ path: file.path, error: e.message });
  }
}

const __cache = {};

function __resolvePackage(path) {
  if (path === 'react') return { __esModule: true, default: React, createElement, cloneElement, isValidElement, createRef, forwardRef, memo, lazy, Children, Fragment, StrictMode, Component, PureComponent, createContext, useState, useEffect, useRef, useCallback, useMemo, useReducer, useContext, useLayoutEffect, useDebugValue, useDeferredValue, useTransition, useId, useSyncExternalStore, useInsertionEffect };
  if (path === 'react-dom') return { __esModule: true, default: { createRoot, hydrateRoot }, createRoot, hydrateRoot };
  if (path === 'react-dom/client') return { __esModule: true, default: { createRoot, hydrateRoot }, createRoot, hydrateRoot };
  if (path === 'react/jsx-runtime' || path === 'react/jsx-dev-runtime') return { __esModule: true, jsx, jsxs, Fragment: JsxFragment };
  ${expoPackages}
  if (/\\.(css|scss|sass|less|svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|eot|otf|json)$/.test(path)) {
    return { __esModule: true, default: '' };
  }
  throw new Error('Cannot resolve package: ' + path);
}

function __resolvePath(importer, importPath) {
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) return null;
  const lastSlash = importer.lastIndexOf('/');
  const dir = lastSlash >= 0 ? importer.substring(0, lastSlash) : '';
  let resolved;
  if (importPath.startsWith('./')) {
    resolved = dir + '/' + importPath.substring(2);
  } else if (importPath.startsWith('../')) {
    const dirParts = dir.split('/');
    dirParts.pop();
    resolved = dirParts.join('/') + '/' + importPath.substring(3);
  } else if (importPath.startsWith('/')) {
    resolved = importPath.substring(1);
  } else {
    resolved = dir + '/' + importPath;
  }
  resolved = resolved.replace(/\\/\\.\\//g, '/').replace(/\\/+/g, '/');
  while (resolved.includes('/../')) {
    resolved = resolved.replace(/\\/[^/]+\\/\\.\\.\\//, '/');
  }
  const exts = ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.jsx', '/index.js', '.json'];
  for (const ext of exts) {
    const candidate = resolved + ext;
    if (__modules[candidate]) return candidate;
  }
  return resolved;
}

function __require(importer, importPath) {
  if (/\\.(css|scss|sass|less|svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|eot|otf)$/.test(importPath)) {
    return { __esModule: true, default: '' };
  }
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return __resolvePackage(importPath);
  }
  const resolved = __resolvePath(importer, importPath);
  if (resolved && __cache[resolved]) return __cache[resolved];
  if (!resolved || !__modules[resolved]) {
    throw new Error('Cannot find module: ' + importPath + ' (from ' + importer + ')');
  }
  const module = { exports: {} };
  __cache[resolved] = module.exports;
  const localRequire = (p) => __require(resolved, p);
  const factory = new Function('module', 'exports', 'require', __modules[resolved]);
  factory(module, module.exports, localRequire);
  __cache[resolved] = module.exports;
  return module.exports;
}

try {
  if (__entryPath) {
    const mod = __require('__entry__', __entryPath);
    if (!__entryIsRenderer) {
      const Component = mod.default || mod.App;
      if (Component && typeof Component === 'function') {
        createRoot(document.getElementById('root')).render(createElement(Component));
      }
    }
  } else {
    document.getElementById('root').innerHTML = '<div style="padding:20px;font-family:monospace;font-size:13px;color:#666;">No entry file found. Add App.tsx or src/main.tsx</div>';
  }
} catch (err) {
  let msg = err && err.message ? err.message : String(err);
  let html = '<div style="padding:20px;font-family:monospace;font-size:13px;color:#cc0000;white-space:pre-wrap;">Runtime Error: ' + msg + '</div>';
  if (__errors.length > 0) {
    html += '<div style="padding:20px;font-family:monospace;font-size:11px;color:#999;white-space:pre-wrap;">Transpilation errors:\\n' + __errors.map(e => e.path + ': ' + e.error).join('\\n') + '</div>';
  }
  document.getElementById('root').innerHTML = html;
}
`;

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
${cssTags}
<script type="module">
${runtime}
</script>
</head>
<body>
<div id="root"></div>
</body>
</html>`;
}
