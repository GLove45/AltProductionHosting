import { Router } from 'express';
import { DomainController } from '../modules/domains/domain.controller.js';

const router = Router();
const controller = new DomainController();

router.get('/', (req, res, next) => controller.listDomains(req, res, next));
router.post('/', (req, res, next) => controller.registerDomain(req, res, next));
router.get('/:id/analytics', (req, res, next) => controller.getAnalytics(req, res, next));
router.get('/:id', (req, res, next) => controller.getDomain(req, res, next));
router.post('/:id/verify', (req, res, next) => controller.verifyDomain(req, res, next));

export default router;
