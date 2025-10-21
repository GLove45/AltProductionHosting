import { Router } from 'express';
import { AuthController } from '../modules/auth/auth.controller.js';

const router = Router();
const controller = new AuthController();

router.post('/register', (req, res, next) => controller.register(req, res, next));
router.post('/login', (req, res, next) => controller.login(req, res, next));
router.get('/profile', (req, res, next) => controller.profile(req, res, next));
router.patch('/password', (req, res, next) => controller.changePassword(req, res, next));

export default router;
