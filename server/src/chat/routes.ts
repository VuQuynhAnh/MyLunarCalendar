import { Router } from "express";
import { asyncHandler } from "../http";
import type { AiModel } from "../ai/model";
import { answer } from "./service";

/** `POST /api/chat` `{ messages, profiles?, readings? }` (HORO-UC02). Server không lưu nội dung chat. */
export function chatRouter(model: AiModel | undefined, now: () => Date): Router {
  const router = Router();
  router.post(
    "/",
    asyncHandler(async (req, res) => {
      res.json(await answer({ model, now }, req.body));
    }),
  );
  return router;
}
