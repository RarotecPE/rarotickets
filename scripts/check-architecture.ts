import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Lint de arquitetura: garante que nenhuma camada importe na direção proibida
 * (ver agents/ARCHITECTURE.md, seção 7 — Regras de Importação).
 */

type LayerName = 'core' | 'shared' | 'domain' | 'application' | 'server' | 'client' | 'unknown';

export type LayerRule = { from: LayerName; forbidden: LayerName[] };

const RULES: LayerRule[] = [
  { from: 'domain', forbidden: ['application', 'server', 'client', 'shared'] },
  { from: 'application', forbidden: ['server', 'client'] },
  { from: 'client', forbidden: ['application', 'server'] },
  { from: 'server', forbidden: ['client'] },
];

const IGNORED_DIRECTORIES = new Set(['node_modules', 'dist', '.git', 'migrations']);

function resolveLayer(filePath: string): LayerName {
  const normalized = filePath.split(path.sep).join('/');
  if (normalized.startsWith('src/@core/')) return 'core';
  if (normalized.startsWith('src/shared/')) return 'shared';
  if (normalized.includes('/domain/')) return 'domain';
  if (normalized.includes('/application/')) return 'application';
  if (normalized.includes('/server/')) return 'server';
  if (normalized.includes('/client/')) return 'client';
  return 'unknown';
}

function resolveImportLayer(specifier: string, importerFile: string): LayerName {
  if (specifier.startsWith('@core/')) return 'core';
  if (specifier.startsWith('@shared/')) return 'shared';
  if (specifier.startsWith('@server/')) return 'server';
  if (specifier.startsWith('@client/')) return 'client';

  if (specifier.startsWith('@modules/')) {
    if (specifier.includes('/domain/')) return 'domain';
    if (specifier.includes('/application/')) return 'application';
    if (specifier.includes('/server/')) return 'server';
    if (specifier.includes('/client/')) return 'client';
    return 'unknown';
  }

  if (!specifier.startsWith('.')) return 'unknown';

  const resolved = path
    .normalize(path.join(path.dirname(importerFile), specifier))
    .split(path.sep)
    .join('/');

  const importerModule = importerFile.split(path.sep).join('/').match(/^src\/modules\/([^/]+)\//);
  const importedModule = resolved.match(/^(src\/modules\/([^/]+)\/)/);
  if (importerModule && importedModule && importerModule[1] !== importedModule[2]) {
    return 'unknown';
  }

  return resolveLayer(resolved);
}

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (IGNORED_DIRECTORIES.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry.name)) files.push(fullPath);
  }

  return files;
}

const IMPORT_PATTERN = /(?:from\s+|import\s*)['"]([^'"]+)['"]/g;

export async function checkArchitecture(rootDir: string): Promise<string[]> {
  const files = await collectFiles(rootDir);
  const violations: string[] = [];

  for (const file of files) {
    const relative = path.relative(rootDir, file);
    const importerLayer = resolveLayer(relative);
    const rule = RULES.find((item) => item.from === importerLayer);
    if (!rule) continue;

    const content = await readFile(file, 'utf8');
    for (const match of content.matchAll(IMPORT_PATTERN)) {
      const specifier = match[1] ?? '';
      const importedLayer = resolveImportLayer(specifier, relative);
      if (rule.forbidden.includes(importedLayer)) {
        violations.push(`${relative}: importa "${specifier}" (${importedLayer} → ${importerLayer} é proibido)`);
      }
    }
  }

  return violations;
}

async function main(): Promise<void> {
  const violations = await checkArchitecture(process.cwd());
  if (violations.length === 0) {
    console.log('✅ Arquitetura OK — nenhuma violação de importação encontrada.');
    return;
  }

  console.error(`❌ ${violations.length} violação(ões) de arquitetura encontradas:\n`);
  for (const violation of violations) console.error(`  - ${violation}`);
  process.exit(1);
}

void main().catch((error) => {
  console.error('[lint:architecture] Falha ao analisar:', error);
  process.exit(1);
});
