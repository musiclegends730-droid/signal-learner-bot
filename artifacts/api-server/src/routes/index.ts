import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { authRouter } from "./auth";
import { signalsRouter } from "./signals";
import { adminRouter } from "./admin";
import { SUPPORTED_ASSETS } from "../marketData";

const router: IRouter = Router();

router.use(healthRouter);
router.use('/auth', authRouter);
router.use('/signals', signalsRouter);
router.use('/admin', adminRouter);
router.get('/assets', (_req, res) => res.json(SUPPORTED_ASSETS));

export default router;
