import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { authRouter } from "./auth";
import { signalsRouter } from "./signals";
import { adminRouter } from "./admin";
import { tickerRouter } from "./ticker";
import { SUPPORTED_ASSETS } from "../marketData";
import { ensureGlobalWeightsExist } from "../globalModel";

// Initialize global shared model on startup
ensureGlobalWeightsExist().then(() => {
  console.log('[GlobalModel] Shared AI model initialized with 26 indicators');
}).catch(err => {
  console.error('[GlobalModel] Failed to initialize:', err);
});

const router: IRouter = Router();

router.use(healthRouter);
router.use('/auth', authRouter);
router.use('/signals', signalsRouter);
router.use('/admin', adminRouter);
router.use(tickerRouter);
router.get('/assets', (_req, res) => res.json(SUPPORTED_ASSETS));

export default router;
