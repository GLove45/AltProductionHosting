import path from 'path';
import fs from 'fs/promises';
import { runtimeRoot, ensureDir, writeFile } from './utils.js';
import { updateState } from '../../orchestrator/stateStore.js';

export const provisionTenant = async ({ tenantId }) => {
  if (!tenantId) {
    throw new Error('tenantId is required');
  }
  const tenantRoot = path.join(runtimeRoot, 'tenants', tenantId);
  await ensureDir(tenantRoot);
  await ensureDir(path.join(tenantRoot, 'www'));
  await ensureDir(path.join(tenantRoot, 'logs'));
  await ensureDir(path.join(tenantRoot, 'backups'));
  await writeFile(path.join(tenantRoot, 'README.txt'), `Tenant ${tenantId} provisioned.`);

  await updateState((state) => {
    const tenant = state.tenants.find((entry) => entry.id === tenantId);
    if (tenant) {
      tenant.provisionedAt = new Date().toISOString();
      tenant.status = 'active';
    }
    return state;
  });

  await fs.chmod(tenantRoot, 0o750);
  return { tenantRoot };
};
