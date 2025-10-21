import express from 'express';
import cors from 'cors';
import { env } from '../config/env.js';
import { registerRoutes } from '../routes/index.js';
import { seedAdminUser } from '../modules/users/user.admin.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: `${env.fileUploadLimitMb}mb` }));
app.use(express.urlencoded({ extended: true }));

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

registerRoutes(app);

export const startServer = async () => {
  await seedAdminUser();

  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on port ${env.port}`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start server', error);
    process.exit(1);
  });
}
