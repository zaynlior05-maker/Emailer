import { Router, type IRouter } from "express";
import healthRouter from "./health";
import templatesRouter from "./templates";
import notificationsRouter from "./notifications";
import statsRouter from "./stats";
import brandsRouter from "./brands";
import emailRouter from "./email";

const router: IRouter = Router();

router.use(healthRouter);
router.use(brandsRouter);
router.use(templatesRouter);
router.use(notificationsRouter);
router.use(emailRouter);
router.use(statsRouter);

export default router;
