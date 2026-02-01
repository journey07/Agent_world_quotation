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
        status: 'inquiry', // 기본 상태: 문의/견적중
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

/**
 * Update an existing inquiry by ID
 */
export async function updateInquiry(id, updateData) {
    await ensureDataFile();

    const fileContent = await fs.readFile(DATA_FILE, 'utf-8');
    const inquiries = JSON.parse(fileContent);

    const index = inquiries.findIndex(item => item.id === id);
    if (index === -1) {
        throw new Error('Inquiry not found');
    }

    // 기존 데이터 유지하면서 업데이트
    inquiries[index] = {
        ...inquiries[index],
        ...updateData,
        id: inquiries[index].id, // ID는 변경 불가
        timestamp: inquiries[index].timestamp, // 생성 시각 유지
        updatedAt: new Date().toISOString()
    };

    await fs.writeFile(DATA_FILE, JSON.stringify(inquiries, null, 2));
    return inquiries[index];
}

/**
 * Delete an inquiry by ID
 */
export async function deleteInquiry(id) {
    await ensureDataFile();

    const fileContent = await fs.readFile(DATA_FILE, 'utf-8');
    const inquiries = JSON.parse(fileContent);

    const index = inquiries.findIndex(item => item.id === id);
    if (index === -1) {
        throw new Error('Inquiry not found');
    }

    const deleted = inquiries.splice(index, 1)[0];
    await fs.writeFile(DATA_FILE, JSON.stringify(inquiries, null, 2));
    return deleted;
}
