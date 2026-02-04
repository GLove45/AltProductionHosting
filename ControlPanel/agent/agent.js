import fs from 'fs/promises';
import path from 'path';
import { allowlistedActions } from './allowlist.js';
import { queuePaths, listJobs, updateJob, ensureQueueDirs } from '../orchestrator/jobQueue.js';
import { provisionTenant } from './operations/tenantProvision.js';
import { provisionDomain } from './operations/domainProvision.js';
import { issueCertificate } from './operations/certIssue.js';
import { runPackageAction } from './operations/packageAction.js';

const actionHandlers = {
  'tenant.provision': provisionTenant,
  'domain.provision': provisionDomain,
  'cert.issue': issueCertificate,
  'package.action': runPackageAction,
};

const processJob = async (job) => {
  if (!allowlistedActions.has(job.action)) {
    throw new Error(`Action ${job.action} is not allowlisted.`);
  }
  const handler = actionHandlers[job.action];
  if (!handler) {
    throw new Error(`No handler registered for ${job.action}.`);
  }
  return handler(job.payload || {});
};

const claimNextJob = async () => {
  await ensureQueueDirs();
  const pendingJobs = await listJobs('pending');
  if (!pendingJobs.length) {
    return null;
  }
  const job = pendingJobs[0];
  await updateJob(job, 'running');
  return job;
};

const persistJobLog = async (job, logEntry) => {
  const nextLogs = [...(job.logs || []), logEntry];
  const updatedJob = { ...job, logs: nextLogs };
  const sourcePath = path.join(queuePaths[job.status], `${job.id}.json`);
  await fs.writeFile(sourcePath, JSON.stringify(updatedJob, null, 2));
  return updatedJob;
};

const runLoop = async () => {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const job = await claimNextJob();
    if (!job) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }
    let currentJob = job;
    try {
      currentJob = await persistJobLog(currentJob, { at: new Date().toISOString(), message: 'Job started.' });
      const result = await processJob(currentJob);
      currentJob = await persistJobLog(currentJob, {
        at: new Date().toISOString(),
        message: 'Job completed.',
        result,
      });
      await updateJob(currentJob, 'completed', { result });
    } catch (error) {
      currentJob = await persistJobLog(currentJob, {
        at: new Date().toISOString(),
        message: 'Job failed.',
        error: error.message,
      });
      await updateJob(currentJob, 'failed', { error: error.message });
    }
  }
};

runLoop().catch((error) => {
  console.error('Agent crashed:', error);
  process.exit(1);
});
