import { Router, type IRouter } from "express";
import healthRouter from "./health";
import campaignsRouter from "./campaigns";
import ticketsRouter from "./tickets";
import chatRouter from "./chat";
import leaderboardRouter from "./leaderboard";
import userRouter from "./user";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(campaignsRouter);
router.use(ticketsRouter);
router.use(chatRouter);
router.use(leaderboardRouter);
router.use(userRouter);
router.use("/auth", authRouter);

export default router;
