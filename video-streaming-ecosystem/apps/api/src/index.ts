import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import videoRoutes from "./routes/videos";
import streamRoutes from "./routes/stream";
import mediaRoutes from "./routes/media";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api/videos", videoRoutes);
app.use("/api/stream", streamRoutes);
app.use("/api/media", mediaRoutes);

app.get("/", (req, res) => {
  res.send({ status: "ok", service: "vse-api" });
});

app.listen(port, () => {
  console.log(`VSE API listening on port ${port}`);
});
