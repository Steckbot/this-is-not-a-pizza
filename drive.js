import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the Google Drive API client
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, "credentials.json"),
  scopes: ["https://www.googleapis.com/auth/drive.file"],
});

const drive = google.drive({ version: "v3", auth });

// Helper function to validate and format file ID
function validateFileId(fileId) {
  if (!fileId || typeof fileId !== "string") {
    throw new Error("Invalid file ID");
  }
  return fileId.trim();
}

// Helper function to generate image URL
function generateImageUrl(fileId) {
  const validFileId = validateFileId(fileId);
  return `https://lh3.googleusercontent.com/d/${validFileId}`;
}

// upload a file to Google Drive
export async function uploadToDrive(filePath, fileName) {
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
      throw new Error("GOOGLE_DRIVE_FOLDER_ID is not set in environment variables");
    }

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: "image/jpeg",
      body: fs.createReadStream(filePath),
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id",
    });

    // Make the file publicly accessible
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    const fileId = validateFileId(response.data.id);
    return {
      fileId,
      imageUrl: generateImageUrl(fileId),
    };
  } catch (error) {
    console.error("Error uploading to Google Drive:", error);
    throw error;
  }
}

// get a list of files from Google Drive
export async function listFiles() {
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
      throw new Error("GOOGLE_DRIVE_FOLDER_ID is not set in environment variables");
    }

    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/'`,
      fields: "files(id, name, createdTime)",
      orderBy: "createdTime desc",
    });

    // Transform the response to include direct image URLs
    const files = response.data.files.map((file) => ({
      id: file.id,
      imageUrl: generateImageUrl(file.id),
    }));

    return files;
  } catch (error) {
    console.error("Error listing files from Google Drive:", error);
    throw error;
  }
}

// get a direct download link for a file
export async function getDownloadLink(fileId) {
  try {
    return generateImageUrl(fileId);
  } catch (error) {
    console.error("Error getting download link:", error);
    throw error;
  }
}
