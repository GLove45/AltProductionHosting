import { Router } from 'express';
import { HostingController } from '../modules/hosting/hosting.controller.js';

const router = Router();
const controller = new HostingController();

router.get('/spaces', (req, res, next) => controller.listSpaces(req, res, next));
router.post('/spaces', (req, res, next) => controller.createSpace(req, res, next));
router.get('/spaces/:spaceId', (req, res, next) => controller.getSpace(req, res, next));
router.post('/spaces/:spaceId/files', (req, res, next) => controller.uploadFile(req, res, next));
router.delete('/spaces/:spaceId/files/:fileId', (req, res, next) => controller.deleteFile(req, res, next));

export default router;
