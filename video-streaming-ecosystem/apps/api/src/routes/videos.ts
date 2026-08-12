import { Router } from "express";
import prisma from "../prisma/client";

const router = Router();

router.get("/", async (req, res) => {
  const videos = await prisma.video.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json(videos);
});

router.get("/:uuid", async (req, res) => {
  const { uuid } = req.params;
  const video = await prisma.video.findUnique({ where: { uuid } });
  if (!video) {
    return res.status(404).json({ error: "Video not found" });
  }
  res.json(video);
});

router.get("/slug/:slug", async (req, res) => {
  const { slug } = req.params;
  const video = await prisma.video.findFirst({ where: { slug } });
  if (!video) {
    return res.status(404).json({ error: "Video not found" });
  }
  res.json(video);
});

router.post("/", async (req, res) => {
  const payload = req.body;
  const video = await prisma.video.create({ data: payload });
  res.status(201).json(video);
});

export default router;
