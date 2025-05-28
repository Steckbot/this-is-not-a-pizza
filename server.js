import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { generateImage } from "./generator.js";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const publicDir = join(__dirname, "public");
const defaultImageDir = join(__dirname, "default_image");

// Ensure required directories exist
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);

// Middleware
app.use(express.json());
app.use(express.static(publicDir)); // For static files like CSS, JS, images
app.use("/generated", express.static(publicDir));
app.use("/default_image", express.static(defaultImageDir));

// HTML routes
app.get("/", (req, res) => res.sendFile(join(__dirname, "index.html")));
app.get("/gallery.html", (req, res) => res.sendFile(join(__dirname, "gallery.html")));

// POST /generate → Generate image
app.post("/generate", async (req, res) => {
  try {
    const { prompt, model } = req.body;
    if (!prompt || !model) return res.status(400).json({ error: "Prompt and model are required." });

    const imageUrl = await generateImage(prompt, model);
    res.json({ imageUrl });
  } catch (error) {
    console.error("❌ Error generating image:", error);
    res.status(500).json({ error: "Failed to generate image." });
  }
});

// GET /images.json → Image list (sorted newest first)
app.get("/images.json", (req, res) => {
  try {
    const files = fs.readdirSync(publicDir);
    const imageFiles = files.filter((file) => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
    imageFiles.sort((a, b) => fs.statSync(join(publicDir, b)).mtime - fs.statSync(join(publicDir, a)).mtime);
    res.json(imageFiles);
  } catch (error) {
    console.error("❌ Fehler beim Lesen der Bilder:", error);
    res.status(500).json({ error: "Fehler beim Lesen der Bilder" });
  }
});

// GET /prompts.json → Return prompt mapping
app.get("/prompts.json", (req, res) => {
  const promptFile = join(publicDir, "prompts.json");

  try {
    if (fs.existsSync(promptFile)) {
      const data = fs.readFileSync(promptFile, "utf8");
      res.type("application/json").send(data);
    } else {
      res.json({});
    }
  } catch (error) {
    console.error("❌ Fehler beim Lesen von prompts.json:", error);
    res.status(500).json({ error: "Fehler beim Lesen von prompts.json" });
  }
});

// Server starten
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server läuft auf http://localhost:${PORT}`);
});
