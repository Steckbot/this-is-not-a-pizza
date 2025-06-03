import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { generateImage } from "./generator.js";
import { listFiles, savePromptsToDrive, getPromptsFromDrive } from "./drive.js";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

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

// Generate image
app.post("/generate", async (req, res) => {
  try {
    const { prompt, model } = req.body;
    if (!prompt || !model) return res.status(400).json({ error: "Prompt and model are required." });

    const result = await generateImage(prompt, model);
    console.log("Generated image result:", result);
    
    // Save prompt mapping to Google Drive
    let prompts = await getPromptsFromDrive();
    prompts[result.driveUrl] = prompt;
    await savePromptsToDrive(prompts);

    const response = { 
      imageUrl: result.imageUrl,
      driveUrl: result.driveUrl
    };
    console.log("Sending response:", response);
    
    res.json(response);
  } catch (error) {
    console.error("❌ Error generating image:", error);
    res.status(500).json({ error: "Failed to generate image." });
  }
});

//  Image list from Google Drive
app.get("/images.json", async (req, res) => {
  try {
    const files = await listFiles();
    res.json(files);
  } catch (error) {
    console.error("❌ Error reading images:", error);
    res.status(500).json({ error: "Error reading images" });
  }
});

// Proxy Google Drive images
app.get("/drive-image/:fileId", async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'stream' }
    );
    response.data.pipe(res);
  } catch (error) {
    console.error("❌ Error proxying image:", error);
    res.status(500).send("Error loading image");
  }
});

// GET /prompts.json → Return prompt mapping
app.get("/prompts.json", async (req, res) => {
  try {
    const prompts = await getPromptsFromDrive();
    res.type("application/json").json(prompts);
  } catch (error) {
    console.error("❌ Error reading prompts.json:", error);
    res.status(500).json({ error: "Error reading prompts.json" });
  }
});

// Server starten
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server läuft auf http://localhost:${PORT}`);
});
