// Runs after `expo export`: lists every built JS/CSS file and injects the list into dist/sw.js so the service
// worker can pre-download all route bundles. Without it, tabs fetch their bundle on first visit.
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(js|css)$/.test(e.name) && e.name !== 'sw.js') files.push('/' + path.relative(dist, p).split(path.sep).join('/'));
  }
})(dist);

const swPath = path.join(dist, 'sw.js');
const sw = fs.readFileSync(swPath, 'utf8');
if (!sw.includes('/*__PRECACHE__*/')) throw new Error('sw.js has no __PRECACHE__ placeholder');
const version = 'crkvica-' + Date.now().toString(36);
fs.writeFileSync(swPath, sw.replace('/*__PRECACHE__*/', JSON.stringify(files).slice(1, -1)).replace("'crkvica-v1'", `'${version}'`));
console.log(`Precaching ${files.length} files as ${version}`);
