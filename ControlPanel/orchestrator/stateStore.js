import fs from 'fs/promises';
import path from 'path';

const statePath = path.join(process.cwd(), 'state', 'state.json');

const ensureStateFile = async () => {
  try {
    await fs.access(statePath);
  } catch {
    const initialState = {
      metadata: { version: 1, updatedAt: new Date(0).toISOString() },
      tenants: [],
      domains: [],
      certificates: [],
      plans: [],
    };
    await fs.mkdir(path.dirname(statePath), { recursive: true });
    await fs.writeFile(statePath, JSON.stringify(initialState, null, 2));
  }
};

export const readState = async () => {
  await ensureStateFile();
  const raw = await fs.readFile(statePath, 'utf-8');
  return JSON.parse(raw);
};

export const writeState = async (state) => {
  const nextState = {
    ...state,
    metadata: {
      ...(state.metadata || {}),
      updatedAt: new Date().toISOString(),
    },
  };
  await fs.writeFile(statePath, JSON.stringify(nextState, null, 2));
  return nextState;
};

export const updateState = async (mutator) => {
  const state = await readState();
  const nextState = await mutator(state);
  return writeState(nextState);
};
