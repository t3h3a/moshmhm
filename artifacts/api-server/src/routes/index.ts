import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import walletRouter from "./wallet";
import productsRouter from "./products";
import ordersRouter from "./orders";
import pointsRouter from "./points";
import marketplaceRouter from "./marketplace";
import adsRouter from "./ads";
import supportRouter from "./support";
import verificationRouter from "./verification";
import activityRouter from "./activity";
import adminRouter from "./admin";
import liveControlsRouter from "./liveControls";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(walletRouter);
router.use(productsRouter);
router.use(ordersRouter);
router.use(pointsRouter);
router.use(marketplaceRouter);
router.use(adsRouter);
router.use(supportRouter);
router.use(verificationRouter);
router.use(activityRouter);
router.use(adminRouter);
router.use(liveControlsRouter);

export default router;
