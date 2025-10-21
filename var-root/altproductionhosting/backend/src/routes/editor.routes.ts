import { Router } from 'express';
import { EditorController } from '../modules/editor/editor.controller.js';

const router = Router();
const controller = new EditorController();

router.get('/templates', (req, res, next) => controller.listTemplates(req, res, next));
router.post('/drafts', (req, res, next) => controller.saveDraft(req, res, next));
router.post('/publish', (req, res, next) => controller.publishSite(req, res, next));

export default router;
