// PostToolUse hook: after Claude writes/edits a file, run `eslint --fix` and then Prettier on it.
// ESLint runs first so Prettier has the final say on style. Lint errors that can't be auto-fixed
// are reported back to Claude (exit code 2 + stderr) so it can fix them.
// Skips files outside the repo, files ignored by ESLint/.prettierignore and unsupported file types.
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as prettier from 'prettier';

const LINTABLE = /\.(?:[cm]?[jt]sx?)$/;
const ESLINT_CONFIGS = ['eslint.config.mjs', 'eslint.config.js', 'eslint.config.ts'];

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));

const filePath = input.tool_response?.filePath ?? input.tool_input?.file_path;
if (!filePath) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const absolute = path.resolve(root, filePath);
const relative = path.relative(root, absolute);
if (relative.startsWith('..') || path.isAbsolute(relative) || !existsSync(absolute)) process.exit(0);

const lintErrors = LINTABLE.test(absolute) ? await lint(absolute) : '';
await format(absolute);

if (lintErrors) {
  process.stderr.write(`ESLint errors remain in ${relative} after --fix:\n${lintErrors}`);
  process.exit(2);
}

// Nearest directory (up to the repo root) with its own ESLint flat config, e.g. apps/api.
function findEslintDir(file) {
  for (let dir = path.dirname(file); ; dir = path.dirname(dir)) {
    if (ESLINT_CONFIGS.some((name) => existsSync(path.join(dir, name)))) return dir;
    if (dir === root || dir === path.dirname(dir)) return null;
  }
}

async function lint(file) {
  const dir = findEslintDir(file);
  if (!dir) return '';

  // Use the workspace's own ESLint install so its config and plugins resolve.
  const require = createRequire(path.join(dir, 'package.json'));
  const { ESLint } = await import(pathToFileURL(require.resolve('eslint')).href);
  const eslint = new ESLint({ cwd: dir, fix: true });
  if (await eslint.isPathIgnored(file)) return '';

  const results = await eslint.lintFiles([file]);
  await ESLint.outputFixes(results);

  return results
    .flatMap((result) => result.messages)
    .filter((message) => message.severity === 2)
    .map((m) => `  ${m.line}:${m.column}  ${m.message}${m.ruleId ? `  (${m.ruleId})` : ''}\n`)
    .join('');
}

async function format(file) {
  const info = await prettier.getFileInfo(file, { ignorePath: path.join(root, '.prettierignore') });
  if (info.ignored || !info.inferredParser) return;

  const source = await readFile(file, 'utf8');
  const options = await prettier.resolveConfig(file);
  const formatted = await prettier.format(source, { ...options, filepath: file });
  if (formatted !== source) await writeFile(file, formatted);
}
