import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();
const distDir = join(projectRoot, 'dist');

const filesToCopy = [
  'index.html',
  'features.html',
  'categories.html',
  'roadmap.html',
  'reviews.html',
  'pricing.html',
  'enrollment.html',
  'enrollment-react.js',
  'styles.css',
  'main.js',
];

if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
}
mkdirSync(distDir, { recursive: true });

for (const file of filesToCopy) {
  cpSync(join(projectRoot, file), join(distDir, file), { force: true });
}

console.log(`Built Cloudflare Pages output in ${distDir}`);

