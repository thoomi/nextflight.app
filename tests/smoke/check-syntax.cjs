const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const roots = ['frontend/js', 'tests'];
const scriptExtensions = new Set(['.cjs', '.js', '.mjs']);

const files = roots
  .flatMap((root) => listScriptFiles(root))
  .sort((left, right) => left.localeCompare(right));

if (files.length === 0) {
  console.error(`No JavaScript files found under ${roots.join(', ')}`);
  process.exit(1);
}

let hasFailure = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.status !== 0) {
    hasFailure = true;
    process.stderr.write(result.stderr || result.stdout);
  }
}

if (hasFailure) {
  process.exit(1);
}

console.log(`Syntax OK: ${files.length} files checked`);

function listScriptFiles(root) {
  if (!fs.existsSync(root)) {
    return [];
  }

  const entries = fs.readdirSync(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      files.push(...listScriptFiles(entryPath));
      continue;
    }

    if (entry.isFile() && scriptExtensions.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}
