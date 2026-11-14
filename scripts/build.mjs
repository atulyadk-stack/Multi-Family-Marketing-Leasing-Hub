import {copyFile, mkdir, readFile, writeFile} from 'node:fs/promises';

const files = {
  'digital.mjs':'text/javascript; charset=utf-8',
  'digital-model.mjs':'text/javascript; charset=utf-8',
  'digital.css':'text/css; charset=utf-8',
  'display-views.mjs':'text/javascript; charset=utf-8',
  'display-views.css':'text/css; charset=utf-8',
  'call-center-ui.mjs':'text/javascript; charset=utf-8',
  'events.mjs': 'text/javascript; charset=utf-8',
  'events-model.mjs': 'text/javascript; charset=utf-8',
  'events.css': 'text/css; charset=utf-8',
  'index.html': 'text/html; charset=utf-8',
  'app.mjs': 'text/javascript; charset=utf-8',
  'model.mjs': 'text/javascript; charset=utf-8',
  'styles.css': 'text/css; charset=utf-8',
  'marketing-touchpoints.mjs': 'text/javascript; charset=utf-8',
  'leasing.mjs': 'text/javascript; charset=utf-8',
  'prospects.mjs': 'text/javascript; charset=utf-8',
  'leasing.css': 'text/css; charset=utf-8',
  'call-center.mjs': 'text/javascript; charset=utf-8',
  'call-center.css': 'text/css; charset=utf-8',
  'portfolio.mjs': 'text/javascript; charset=utf-8',
  'portfolio.css': 'text/css; charset=utf-8',
  'interactions.css': 'text/css; charset=utf-8',
  'icon.svg': 'image/svg+xml',
};
const assets = {};
for (const [file, type] of Object.entries(files)) {
  assets[file === 'index.html' ? '/' : '/' + file] = {body: await readFile('dist/' + file, 'utf8'), type};
}
assets['/index.html'] = assets['/'];
await mkdir('dist/server', {recursive: true});
await mkdir('dist/.openai', {recursive: true});
await copyFile('.openai/hosting.json', 'dist/.openai/hosting.json');
await copyFile('worker/index.mjs', 'dist/server/index.js');
await copyFile('worker/property-listings.mjs', 'dist/server/property-listings.mjs');
await copyFile('worker/scrape.mjs', 'dist/server/scrape.mjs');
await copyFile('dist/model.mjs', 'dist/server/model.mjs');
const listings = await readFile('dist/server/property-listings.mjs', 'utf8');
await writeFile('dist/server/property-listings.mjs', listings.replace('../dist/model.mjs', './model.mjs'));
await writeFile('dist/server/assets.mjs', 'export const assets = ' + JSON.stringify(assets) + ';\n');

