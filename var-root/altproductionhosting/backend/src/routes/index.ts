import { Express } from 'express';
import authRouter from './auth.routes.js';
import domainRouter from './domain.routes.js';
import hostingRouter from './hosting.routes.js';
import editorRouter from './editor.routes.js';

export const registerRoutes = (app: Express) => {
  app.use('/api/auth', authRouter);
  app.use('/api/domains', domainRouter);
  app.use('/api/hosting', hostingRouter);
  app.use('/api/editor', editorRouter);
};

export default registerRoutes;
