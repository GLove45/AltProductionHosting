import fs from 'fs/promises';
import path from 'path';
import { readState } from './stateStore.js';
import { enqueueJob } from './jobQueue.js';

const runtimeRoot = path.join(process.cwd(), 'runtime');

const exists = async (target) => {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
};

const ensureRuntime = async () => {
  await fs.mkdir(runtimeRoot, { recursive: true });
};

const reconcileTenants = async (state, jobs) => {
  for (const tenant of state.tenants) {
    const tenantRoot = path.join(runtimeRoot, 'tenants', tenant.id);
    if (!(await exists(tenantRoot))) {
      jobs.push(
        await enqueueJob({
          action: 'tenant.provision',
          payload: { tenantId: tenant.id },
          requestedBy: 'reconciler',
        }),
      );
    }
  }
};

const reconcileDomains = async (state, jobs) => {
  for (const domain of state.domains) {
    const vhostPath = path.join(runtimeRoot, 'vhosts', `${domain.name}.conf`);
    if (!(await exists(vhostPath))) {
      jobs.push(
        await enqueueJob({
          action: 'domain.provision',
          payload: { domainId: domain.id },
          requestedBy: 'reconciler',
        }),
      );
    }
  }
};

const reconcileCertificates = async (state, jobs) => {
  for (const cert of state.certificates) {
    const certDir = path.join(runtimeRoot, 'certs', cert.domain);
    const certPath = path.join(certDir, 'fullchain.pem');
    if (!(await exists(certPath))) {
      jobs.push(
        await enqueueJob({
          action: 'cert.issue',
          payload: { certificateId: cert.id },
          requestedBy: 'reconciler',
        }),
      );
    }
  }
};

export const runReconcile = async () => {
  await ensureRuntime();
  const state = await readState();
  const jobs = [];
  await reconcileTenants(state, jobs);
  await reconcileDomains(state, jobs);
  await reconcileCertificates(state, jobs);
  return jobs;
};

if (process.argv[1] && process.argv[1].includes('reconciler.js')) {
  runReconcile()
    .then((jobs) => {
      console.log(`Reconciler queued ${jobs.length} job(s).`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Reconciler failed:', error);
      process.exit(1);
    });
}
