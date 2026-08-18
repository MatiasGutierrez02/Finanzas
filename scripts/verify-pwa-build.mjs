import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../dist/pwa/', import.meta.url);
const rootPath = decodeURIComponent(root.pathname).replace(/^\/(?:([A-Za-z]:))/u, '$1');

function fail(message) {
  throw new Error(`PWA build inválido: ${message}`);
}

for (const file of ['index.html', 'manifest.json', 'sw.js']) {
  if (!existsSync(join(rootPath, file))) fail(`falta ${file}`);
}

const index = readFileSync(join(rootPath, 'index.html'), 'utf8');
const manifest = JSON.parse(readFileSync(join(rootPath, 'manifest.json'), 'utf8'));
const serviceWorker = readFileSync(join(rootPath, 'sw.js'), 'utf8');
const assetNames = readdirSync(join(rootPath, 'assets'));

if (/https?:\/\//iu.test(index)) fail('index.html contiene recursos HTTP externos');
if (!serviceWorker.includes('index.html') || !serviceWorker.includes('manifest.json'))
  fail('el app shell no está precacheado');
if (!serviceWorker.includes('NavigationRoute')) fail('falta el fallback de navegación');
if (!assetNames.some((name) => name.endsWith('.woff2'))) fail('falta la fuente local de iconos');

for (const fragment of [
  'DashboardPage-',
  'CategoryDetailPage-',
  'TransactionDetailPage-',
  'TransactionEditorPage-',
  'SettingsPage-',
]) {
  const asset = assetNames.find((name) => name.startsWith(fragment));
  if (asset === undefined || !serviceWorker.includes(`assets/${asset}`))
    fail(`falta ${fragment} en el precache`);
}

for (const icon of manifest.icons ?? []) {
  if (!existsSync(join(rootPath, icon.src))) fail(`falta el icono ${icon.src}`);
  if (!serviceWorker.includes(icon.src)) fail(`el icono ${icon.src} no está precacheado`);
}

for (const asset of assetNames.filter((name) => /\.(?:js|css|woff2?|png|svg)$/iu.test(name))) {
  if (!serviceWorker.includes(`assets/${asset}`)) fail(`el asset ${asset} no está precacheado`);
}

process.stdout.write(
  `PWA verificada: app shell, ${assetNames.length} assets locales y ${manifest.icons.length} iconos precacheados.\n`,
);
