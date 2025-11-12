import { Router } from "express";
import { sendMessage } from "./services/sendmessage.js";
import { checkRegistered } from "../middlewares/registered.js";

const router = Router();

router.post("/send-messages", checkRegistered, sendMessage);

export default router;
