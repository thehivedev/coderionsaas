import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildClientDir = path.join(__dirname, '..', 'build', 'client');
const distDir = path.join(__dirname, '..', 'dist');

const assetsDir = path.join(buildClientDir, 'assets');
if (!fs.existsSync(assetsDir)) {
  console.error('No assets directory found in build/client/');
  process.exit(1);
}

const files = fs.readdirSync(assetsDir);

const cssFile = files.find((f) => f.endsWith('.css'));
const entryFile = files.find((f) => f.startsWith('entry.client') && f.endsWith('.js'));
const rootFile = files.find((f) => f.startsWith('root-') && f.endsWith('.js'));
const manifestFile = files.find((f) => f.startsWith('manifest-') && f.endsWith('.js'));
const jsxFile = files.find((f) => f.startsWith('jsx-runtime') && f.endsWith('.js'));
const componentsFile = files.find((f) => f.startsWith('components-') && f.endsWith('.js'));
const indexFile = files.find((f) => f.startsWith('_index-') && f.endsWith('.js'));

const scripts = [
  manifestFile,
  jsxFile,
  entryFile,
  rootFile,
  componentsFile,
  indexFile,
].filter(Boolean);

const cssLink = cssFile ? `<link rel="stylesheet" href="/assets/${cssFile}">` : '';
const scriptTags = scripts.map((f) => `<script type="module" src="/assets/${f}"></script>`).join('\n    ');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Coderion</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
  ${cssLink}
</head>
<body class="bg-[#0e0e10] text-white antialiased">
  <div id="root"></div>
    ${scriptTags}
</body>
</html>`;

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}
fs.writeFileSync(path.join(distDir, 'index.html'), html);

// Copy assets to dist
const distAssetsDir = path.join(distDir, 'assets');
if (!fs.existsSync(distAssetsDir)) {
  fs.mkdirSync(distAssetsDir, { recursive: true });
}
for (const f of files) {
  fs.copyFileSync(path.join(assetsDir, f), path.join(distAssetsDir, f));
}

console.log('Generated dist/index.html and copied assets');
