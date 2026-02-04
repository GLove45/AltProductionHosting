import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const baseDir = path.join(process.cwd(), 'jobs');
const queueDirs = {
  pending: path.join(baseDir, 'pending'),
  running: path.join(baseDir, 'running'),
  completed: path.join(baseDir, 'completed'),
  failed: path.join(baseDir, 'failed'),
};

export const ensureQueueDirs = async () => {
  await Promise.all(Object.values(queueDirs).map((dir) => fs.mkdir(dir, { recursive: true })));
};

export const enqueueJob = async ({ action, payload, requestedBy }) => {
  await ensureQueueDirs();
  const job = {
    id: uuidv4(),
    action,
    payload,
    requestedBy,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    logs: [],
  };
  const jobPath = path.join(queueDirs.pending, `${job.id}.json`);
  await fs.writeFile(jobPath, JSON.stringify(job, null, 2));
  return job;
};

export const getJob = async (id) => {
  await ensureQueueDirs();
  const locations = Object.values(queueDirs);
  for (const location of locations) {
    try {
      const raw = await fs.readFile(path.join(location, `${id}.json`), 'utf-8');
      return JSON.parse(raw);
    } catch {
      continue;
    }
  }
  return null;
};

export const listJobs = async (status = 'pending') => {
  await ensureQueueDirs();
  const dir = queueDirs[status];
  const files = await fs.readdir(dir);
  const jobs = await Promise.all(
    files.filter((file) => file.endsWith('.json')).map((file) => fs.readFile(path.join(dir, file), 'utf-8')),
  );
  return jobs.map((raw) => JSON.parse(raw));
};

export const updateJob = async (job, status, updates = {}) => {
  await ensureQueueDirs();
  const sourcePath = path.join(queueDirs[job.status], `${job.id}.json`);
  const nextJob = {
    ...job,
    ...updates,
    status,
    updatedAt: new Date().toISOString(),
  };
  const targetPath = path.join(queueDirs[status], `${job.id}.json`);
  await fs.writeFile(targetPath, JSON.stringify(nextJob, null, 2));
  if (sourcePath !== targetPath) {
    await fs.unlink(sourcePath);
  }
  return nextJob;
};

export const queuePaths = queueDirs;
