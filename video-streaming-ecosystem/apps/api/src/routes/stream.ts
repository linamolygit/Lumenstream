import { Router } from "express";
import prisma from "../prisma/client";

const router = Router();

router.get("/metadata/:uuid", async (req, res) => {
  const { uuid } = req.params;
  const video = await prisma.video.findUnique({ where: { uuid } });
  if (!video) {
    return res.status(404).json({ error: "Video not found" });
  }
  res.json({ uuid: video.uuid, m3u8Links: video.m3u8Links, sourcePageUrl: video.sourcePageUrl });
});

router.post("/log", async (req, res) => {
  const { videoUuid, ip, userAgent, referer, country, watchedSeconds } = req.body;
  const log = await prisma.streamLog.create({
    data: {
      videoUuid,
      ip,
      userAgent,
      referer,
      country,
      watchedSeconds: watchedSeconds ?? 0,
    },
  });
  res.status(201).json(log);
});

export default router;
