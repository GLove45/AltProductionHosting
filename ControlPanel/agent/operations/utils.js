import fs from 'fs/promises';
import path from 'path';

export const runtimeRoot = path.join(process.cwd(), 'runtime');

export const ensureDir = async (target) => {
  await fs.mkdir(target, { recursive: true });
};

export const writeFile = async (target, contents) => {
  await ensureDir(path.dirname(target));
  await fs.writeFile(target, contents);
};

export const renderTemplate = async (templatePath, values) => {
  const raw = await fs.readFile(templatePath, 'utf-8');
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, String(value)),
    raw,
  );
};
