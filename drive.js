import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the Google Drive API client
const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'credentials.json'),
    scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

// Helper function to validate and format file ID
function validateFileId(fileId) {
    if (!fileId || typeof fileId !== 'string') {
        throw new Error('Invalid file ID');
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
            throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set in environment variables');
        }

        const fileMetadata = {
            name: fileName,
            parents: [folderId],
        };

        const media = {
            mimeType: 'image/jpeg',
            body: fs.createReadStream(filePath),
        };

        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id',
        });

        // Make the file publicly accessible
        await drive.permissions.create({
            fileId: response.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone'
            }
        });

        const fileId = validateFileId(response.data.id);
        return {
            fileId,
            imageUrl: generateImageUrl(fileId)
        };
    } catch (error) {
        console.error('Error uploading to Google Drive:', error);
        throw error;
    }
}

// get a list of files from Google Drive
export async function listFiles() {
    try {
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        if (!folderId) {
            throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set in environment variables');
        }

        const response = await drive.files.list({
            q: `'${folderId}' in parents and mimeType contains 'image/'`,
            fields: 'files(id, name, createdTime)',
            orderBy: 'createdTime desc',
        });

        // Transform the response to include direct image URLs
        const files = response.data.files.map(file => ({
            id: file.id,
            imageUrl: generateImageUrl(file.id)
        }));

        return files;
    } catch (error) {
        console.error('Error listing files from Google Drive:', error);
        throw error;
    }
}

// get a direct download link for a file
export async function getDownloadLink(fileId) {
    try {
        return generateImageUrl(fileId);
    } catch (error) {
        console.error('Error getting download link:', error);
        throw error;
    }
}

// Save prompts to Google Drive
export async function savePromptsToDrive(prompts) {
    try {
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        if (!folderId) {
            throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set in environment variables');
        }

        // Convert prompts object to JSON string
        const promptsJson = JSON.stringify(prompts, null, 2);

        // Check if prompts.json already exists
        const response = await drive.files.list({
            q: `'${folderId}' in parents and name = 'prompts.json'`,
            fields: 'files(id)',
        });

        let fileId;
        if (response.data.files.length > 0) {
            // Update existing file
            fileId = response.data.files[0].id;
            await drive.files.update({
                fileId: fileId,
                media: {
                    mimeType: 'application/json',
                    body: promptsJson,
                },
            });
        } else {
            // Create new file
            const fileMetadata = {
                name: 'prompts.json',
                parents: [folderId],
                mimeType: 'application/json',
            };

            const media = {
                mimeType: 'application/json',
                body: promptsJson,
            };

            const createResponse = await drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id',
            });

            fileId = createResponse.data.id;

            // Make the file publicly accessible
            await drive.permissions.create({
                fileId: fileId,
                requestBody: {
                    role: 'reader',
                    type: 'anyone'
                }
            });
        }

        return fileId;
    } catch (error) {
        console.error('Error saving prompts to Google Drive:', error);
        throw error;
    }
}

// Get prompts from Google Drive
export async function getPromptsFromDrive() {
    try {
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        if (!folderId) {
            throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set in environment variables');
        }

        // Find prompts.json file
        const response = await drive.files.list({
            q: `'${folderId}' in parents and name = 'prompts.json'`,
            fields: 'files(id)',
        });

        if (response.data.files.length === 0) {
            return {};
        }

        const fileId = response.data.files[0].id;
        const file = await drive.files.get({
            fileId: fileId,
            alt: 'media'
        });

        // If file.data is a string, parse it. If it's already an object, return it.
        if (typeof file.data === 'string') {
            return JSON.parse(file.data);
        }
        return file.data;
    } catch (error) {
        console.error('Error getting prompts from Google Drive:', error);
        return {};
    }
} 