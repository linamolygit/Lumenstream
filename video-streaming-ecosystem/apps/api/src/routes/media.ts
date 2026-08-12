import { Router } from "express";
import prisma from "../prisma/client";

const router = Router();

router.get("/", async (req, res) => {
  const action = String(req.query.action || "");
  const uuid = String(req.query.uuid || "");

  if (!action || !uuid) {
    return res.status(400).json({ success: false, error: "Missing action or uuid" });
  }

  const video = await prisma.video.findUnique({ where: { uuid } });
  if (!video) {
    return res.status(404).json({ success: false, error: "Video not found" });
  }

  if (action === "get_thumb") {
    const thumbnail = video.thumbnail || (Array.isArray(video.thumbnails) ? video.thumbnails[0] : null);
    return res.json({
      success: true,
      uuid: video.uuid,
      title: video.title,
      thumbnail,
    });
  }

  if (action === "get_stream") {
    const workerUrl = String(process.env.WORKER_URL || "https://mediahosterpro.vercel.app").replace(/\/+$/, "");
    const streamUrl = `${workerUrl}/api/media?uuid=${encodeURIComponent(video.uuid)}`;
    const playerHtml = `
      <video controls playsinline width="100%" poster="${video.thumbnail || ""}" style="max-width:100%; border-radius:16px; background:#000;" src="${streamUrl}"></video>
    `;

    return res.json({
      success: true,
      uuid: video.uuid,
      stream_url: streamUrl,
      player_html: playerHtml,
    });
  }

  return res.status(400).json({ success: false, error: "Invalid action" });
});

export default router;
