import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'inquiries.json');

/**
 * Ensure data directory and file exist
 */
async function ensureDataFile() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }

    try {
        await fs.access(DATA_FILE);
    } catch {
        await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2));
    }
}

/**
 * Save a new inquiry to the JSON file
 */
export async function saveInquiry(inquiryData) {
    await ensureDataFile();

    const fileContent = await fs.readFile(DATA_FILE, 'utf-8');
    const inquiries = JSON.parse(fileContent);

    const newInquiry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        ...inquiryData
    };

    inquiries.unshift(newInquiry); // Add to the beginning

    await fs.writeFile(DATA_FILE, JSON.stringify(inquiries, null, 2));
    return newInquiry;
}

/**
 * Get all inquiries from the JSON file
 */
export async function getAllInquiries() {
    await ensureDataFile();

    const fileContent = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(fileContent);
}
