import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const packagesPath = path.join(process.cwd(), 'packages.txt');

const parsePackages = async () => {
  const raw = await fs.readFile(packagesPath, 'utf-8');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, version] = line.split(/\s+/);
      return { name, version };
    });
};

export const runPackageAction = async ({ name, action }) => {
  if (!name || !action) {
    throw new Error('Package name and action are required.');
  }
  const supportedActions = new Set(['install', 'remove', 'update', 'restart']);
  if (!supportedActions.has(action)) {
    throw new Error('Unsupported action.');
  }

  const packages = await parsePackages();
  const target = packages.find((pkg) => pkg.name === name);
  if (!target) {
    throw new Error('Package not found.');
  }

  const command = action === 'restart'
    ? ['systemctl', 'restart', name]
    : ['apt-get', '-y', action === 'remove' ? 'remove' : 'install', name];

  if (process.env.CONTROL_PANEL_APPLY !== 'true') {
    return {
      dryRun: true,
      command: command.join(' '),
      message: 'Set CONTROL_PANEL_APPLY=true in the agent environment to execute system changes.',
    };
  }

  const { stdout, stderr } = await execFileAsync(command[0], command.slice(1), { timeout: 1000 * 60 * 5 });
  return { dryRun: false, stdout, stderr };
};
