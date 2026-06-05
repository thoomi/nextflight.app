const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const frontend = path.join(root, 'frontend');
const dist = path.join(root, 'dist');

copyDirectory(path.join(frontend, 'assets'), path.join(dist, 'assets'));
copyDirectory(path.join(frontend, 'css'), path.join(dist, 'css'));
copyDirectory(path.join(frontend, 'js'), path.join(dist, 'js'));
copyDirectory(path.join(frontend, 'samples'), path.join(dist, 'samples'));

for (const file of ['robots.txt', 'sitemap.xml', 'script.js']) {
  copyFile(path.join(frontend, file), path.join(dist, file));
}

function copyDirectory(source, target) {
  if (!fs.existsSync(source)) {
    return;
  }

  fs.mkdirSync(target, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else if (entry.isFile()) {
      copyFile(sourcePath, targetPath);
    }
  }
}

function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}
