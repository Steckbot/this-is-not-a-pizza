import Replicate from "replicate";
import { ananasPilz_model, ananas_model, pilz_model, gemischt_model } from "./config.js";
import fs from "fs";
import fetch from "node-fetch";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { uploadToDrive } from "./drive.js";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
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
      case "gemischt_model":
        selectedModel = gemischt_model;
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
        aspect_ratio: "16:9",
        output_format: "jpg",
        guidance_scale: 3,
        output_quality: 100,
        prompt_strength: 0.8,
        extra_lora_scale: 1,
        num_inference_steps: 28,
        prompt: prompt,
      },
    });

    // Download the image from Replicate
    const imageUrl = output[0];
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate a unique filename
    const timestamp = Date.now();
    const filename = `generated-image-${timestamp}.jpg`;
    const filepath = join(__dirname, "public", filename);

    // Save the image locally
    fs.writeFileSync(filepath, buffer);

    // Upload to Google Drive
    const driveResult = await uploadToDrive(filepath, filename);
    console.log("Uploaded to Google Drive:", driveResult);

    // Return both the local URL and the Google Drive URL
    return {
      localUrl: `/generated/${filename}`,
      driveUrl: driveResult.imageUrl,
    };
  } catch (error) {
    console.error("❌ Error while generating image", error);
    throw error;
  }
}
