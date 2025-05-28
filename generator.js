import Replicate from "replicate";
import { ananasPilz_model, ananas_model, pilz_model } from "./config.js";
import { REPLICATE_API_TOKEN } from "./api.js";
import fs from "fs";
import fetch from "node-fetch";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const replicate = new Replicate({
  auth: REPLICATE_API_TOKEN,
});

export async function generateImage(prompt, modelName) {
  try {
    // Wähle das richtige Modell
    let selectedModel;
    switch (modelName) {
      case "ananasPilz_model":
        selectedModel = ananasPilz_model;
        break;
      case "ananas_model":
        selectedModel = ananas_model;
        break;
      case "pilz_model":
        selectedModel = pilz_model;
        break;
      default:
        throw new Error("Invalid model selected");
    }

    const output = await replicate.run(selectedModel, {
      input: {
        model: "schnell",
        go_fast: false,
        lora_scale: 1,
        megapixels: "1",
        num_outputs: 1,
        aspect_ratio: "16:9", // vom Druckcode übernommen
        output_format: "jpg",
        guidance_scale: 3,
        output_quality: 100,
        prompt_strength: 0.8,
        extra_lora_scale: 1,
        num_inference_steps: 28,
        prompt: prompt,
      },
    });

    const imageUrl = output[0];

    // Lade und speichere das Bild
    const response = await fetch(imageUrl);
    const imageBuffer = await response.arrayBuffer();

    const timestamp = Date.now();
    const filename = `generated-image-${timestamp}.jpg`;
    const filepath = join(__dirname, "public", filename);
    fs.writeFileSync(filepath, Buffer.from(imageBuffer));

    // Prompt-Mapping speichern
    const promptInfoPath = join(__dirname, "public", "prompts.json");
    let promptMap = {};
    if (fs.existsSync(promptInfoPath)) {
      const data = fs.readFileSync(promptInfoPath);
      promptMap = JSON.parse(data);
    }

    promptMap[filename] = prompt;
    fs.writeFileSync(promptInfoPath, JSON.stringify(promptMap, null, 2));

    return `/generated/${filename}`;
  } catch (error) {
    console.error("❌ Error in generateImage:", error);
    throw error;
  }
}
