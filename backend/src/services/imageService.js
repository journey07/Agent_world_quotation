import Jimp from 'jimp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createCanvas, registerFont } from 'canvas';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_PATH = join(__dirname, '../../assets');

// Asset image paths
const LOCKER_CELL_PATH = join(ASSETS_PATH, 'locker-cell.png');
const CONTROL_PANEL_PATH = join(ASSETS_PATH, 'control-panel.png');

// Font path - Pretendard Medium
const FONT_PATH = join(ASSETS_PATH, 'fonts', 'Pretendard-Medium.otf');

// Register Korean font if available
// Note: In Vercel Serverless Functions, file system access may be limited
// If font registration fails, fallback fonts will be used
let fontRegistered = false;
if (existsSync(FONT_PATH)) {
    try {
        registerFont(FONT_PATH, { family: 'Pretendard' });
        fontRegistered = true;
        console.log('✅ Pretendard font registered successfully');
    } catch (error) {
        console.warn('⚠️ Failed to register Pretendard font:', error.message);
        console.warn('⚠️ Will use fallback system fonts for Korean text');
    }
} else {
    console.warn('⚠️ Pretendard font file not found at:', FONT_PATH);
    console.warn('⚠️ Will use fallback system fonts for Korean text');
}

// Target cell dimensions for consistent sizing
const TARGET_CELL_WIDTH = 150;
const TARGET_CELL_HEIGHT = 137; // Maintains aspect ratio of original 258x236
const CONTROL_PANEL_WIDTH = 150; // Same width as one locker cell
const CONTROL_PANEL_HEIGHT = 208; // Maintains aspect ratio

/**
 * Generate a locker grid image based on configuration
 * @param {number} columns - Number of locker columns
 * @param {number} tiers - Number of tiers (rows)
 * @param {Object} options - Additional options
 * @param {number} options.controlPanelColumn - 1-based index of column to place control panel (1..columns)
 * @param {number} options.controlPanelTiers - Number of tiers the control panel occupies (1..tiers-1)
 * @param {string} options.frameType - Frame type: 'none', 'fullSet', 'topOnly', 'sideOnly', 'topAndSide'
 * @returns {Promise<Buffer>} PNG image buffer
 */
export async function generateLockerGrid(columns, tiers, options = {}) {
    const {
        controlPanelColumn = 0, // 0 means no control panel
        controlPanelTiers = 4,  // Number of tiers for control panel
        frameType = 'none'
    } = options;

    try {
        // Calculate dimensions based on fixed total height (5-tier standard)
        const STANDARD_TIERS = 5;
        const FIXED_TOTAL_HEIGHT = STANDARD_TIERS * TARGET_CELL_HEIGHT; // 5 * 137 = 685px

        // Dynamic cell height to fit the fixed total height
        const currentCellHeight = FIXED_TOTAL_HEIGHT / tiers;

        // Load and resize locker cell image
        const cellImage = await Jimp.read(LOCKER_CELL_PATH);
        cellImage.resize(TARGET_CELL_WIDTH, currentCellHeight);

        // Frame thickness constants
        const TOP_FRAME_THICKNESS = frameType === 'fullSet' || frameType === 'topOnly' || frameType === 'topAndSide' ? 100 : 0;
        const SIDE_FRAME_THICKNESS = frameType === 'fullSet' || frameType === 'sideOnly' || frameType === 'topAndSide' ? 20 : 0;

        // Calculate locker dimensions (without frames)
        const lockerWidth = columns * TARGET_CELL_WIDTH;
        const lockerHeight = FIXED_TOTAL_HEIGHT; // Always 685px

        // Calculate total canvas dimensions (including frames)
        const canvasWidth = lockerWidth + (SIDE_FRAME_THICKNESS * 2); // Add left and right frames
        const canvasHeight = lockerHeight + TOP_FRAME_THICKNESS; // Add top frame

        // Offset for locker position (to make room for frames)
        const lockerOffsetX = SIDE_FRAME_THICKNESS;
        const lockerOffsetY = TOP_FRAME_THICKNESS;

        // Create base image with lighter gray background (almost white)
        const image = new Jimp(canvasWidth, canvasHeight, 0xFFFFFFFF); // Pure white background

        // Draw frame backgrounds first (before locker cells)
        if (frameType !== 'none') {
            const BLACK = 0x000000FF;

            // Draw top frame
            if (TOP_FRAME_THICKNESS > 0) {
                for (let y = 0; y < TOP_FRAME_THICKNESS; y++) {
                    for (let x = 0; x < canvasWidth; x++) {
                        image.setPixelColor(BLACK, x, y);
                    }
                }
            }

            // Draw side frames
            if (SIDE_FRAME_THICKNESS > 0) {
                // Left side frame
                for (let y = 0; y < canvasHeight; y++) {
                    for (let x = 0; x < SIDE_FRAME_THICKNESS; x++) {
                        image.setPixelColor(BLACK, x, y);
                    }
                }

                // Right side frame
                for (let y = 0; y < canvasHeight; y++) {
                    for (let x = canvasWidth - SIDE_FRAME_THICKNESS; x < canvasWidth; x++) {
                        image.setPixelColor(BLACK, x, y);
                    }
                }
            }
        }

        // Define Control Panel Rect (Area to be EMPTY of cells) and PC Position (Fixed)
        let emptyAreaRect = null;
        let pcPos = null;

        if (controlPanelColumn && controlPanelColumn >= 1 && controlPanelColumn <= columns) {
            // Logic Update: 'controlPanelTiers' input represents the NUMBER OF LOCKER CELLS in this column.
            // So, PC occupies the remaining space at the top.
            // Empty Area (for PC) = Total Tiers - Number of Lockers

            const numberOfLockers = Math.min(controlPanelTiers, tiers - 1); // Max lockers = tiers - 1 (need at least 1 tier for PC)
            const pcDateTiers = tiers - numberOfLockers; // Tiers occupied by PC (from top)

            const emptyH = currentCellHeight * pcDateTiers;
            const emptyY = lockerOffsetY; // Start from top

            emptyAreaRect = {
                x: lockerOffsetX + (controlPanelColumn - 1) * TARGET_CELL_WIDTH,
                y: emptyY,
                w: TARGET_CELL_WIDTH, // Full width of the column
                h: emptyH,
                startTier: 0,
                endTier: pcDateTiers // Skip drawing cells for these top tiers
            };

            // 2. Calculate fixed position for PC Image
            pcPos = {
                x: lockerOffsetX + (controlPanelColumn - 1) * TARGET_CELL_WIDTH,
                y: lockerOffsetY + 100 // Fixed 100px from top
            };
        }

        // Draw locker cells (offset by frame dimensions)
        for (let col = 0; col < columns; col++) {
            for (let tier = 0; tier < tiers; tier++) {
                const x = lockerOffsetX + col * TARGET_CELL_WIDTH;
                const y = lockerOffsetY + tier * currentCellHeight;

                // Determine if this cell should be hidden by Control Panel (Empty Area)
                let shouldSkip = false;
                if (emptyAreaRect && col === (controlPanelColumn - 1)) {
                    // Skip if current tier is within the empty area range
                    if (tier >= emptyAreaRect.startTier && tier < emptyAreaRect.endTier) {
                        shouldSkip = true;
                    }
                }

                if (!shouldSkip) {
                    image.composite(cellImage.clone(), x, y);
                }
            }
        }

        // Draw text on the top frame if it exists
        if (TOP_FRAME_THICKNESS > 0) {
            try {
                const canvas = createCanvas(canvasWidth, TOP_FRAME_THICKNESS);
                const ctx = canvas.getContext('2d');

                // Draw white text centered
                ctx.fillStyle = 'white';
                // Use registered Pretendard font if available, otherwise use fallback system fonts
                if (fontRegistered) {
                    ctx.font = '60px "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "Nanum Gothic", "AppleGothic", "Gulim", "Dotum", sans-serif';
                } else {
                    // Use system fonts that are available in most environments
                    ctx.font = '60px "Apple SD Gothic Neo", "Malgun Gothic", "Nanum Gothic", "AppleGothic", "Gulim", "Dotum", sans-serif';
                }
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Draw text with spaces as required for proper display
                // The text is already a proper JavaScript UTF-16 string, canvas will handle encoding
                const text = '물 품 보 관 함';
                
                // Ensure text is valid before rendering
                if (typeof text === 'string' && text.length > 0) {
                    // Measure text to verify it can be rendered
                    const metrics = ctx.measureText(text);
                    if (metrics.width > 0) {
                        // Render the text
                        ctx.fillText(text, canvasWidth / 2, TOP_FRAME_THICKNESS / 2);
                        
                        // Convert canvas to buffer and composite onto main image
                        const textBuffer = canvas.toBuffer('image/png');
                        const textImage = await Jimp.read(textBuffer);
                        image.composite(textImage, 0, 0);
                    } else {
                        console.warn('⚠️ Text measurement failed, font may not support Korean characters');
                    }
                } else {
                    console.warn('⚠️ Invalid text for rendering');
                }
            } catch (textError) {
                console.error('❌ Error rendering Korean text on frame:', textError);
                console.error('Error details:', textError.message);
                // If text rendering fails, the black frame will still be visible without text
                // This is better than showing corrupted hex codes
            }
        }

        // Draw Control Panel Image on top - ALWAYS FIXED SIZE & POSITION
        if (pcPos) {
            // 1. Draw border around the ENTIRE Control Panel Area (The "Background" / Empty Area) FIRST
            if (emptyAreaRect) {
                const BLACK = 0x000000FF;
                const borderThickness = 1; // Thin black stroke
                const topBorderThickness = 2; // Much thicker for top to simulate 'lid'

                // Top Border of Container
                for (let x = 0; x < emptyAreaRect.w; x++) {
                    for (let t = 0; t < topBorderThickness; t++) {
                        image.setPixelColor(BLACK, emptyAreaRect.x + x, emptyAreaRect.y + t);
                    }
                }
                // Left Border of Container
                for (let y = 0; y < emptyAreaRect.h; y++) {
                    for (let t = 0; t < borderThickness; t++) {
                        image.setPixelColor(BLACK, emptyAreaRect.x + t, emptyAreaRect.y + y);
                    }
                }
                // Right Border of Container
                for (let y = 0; y < emptyAreaRect.h; y++) {
                    for (let t = 0; t < borderThickness; t++) {
                        image.setPixelColor(BLACK, emptyAreaRect.x + emptyAreaRect.w - 1 - t, emptyAreaRect.y + y);
                    }
                }
                // Bottom Border of Container
                for (let x = 0; x < emptyAreaRect.w; x++) {
                    for (let t = 0; t < topBorderThickness; t++) {
                        image.setPixelColor(BLACK, emptyAreaRect.x + x, emptyAreaRect.y + emptyAreaRect.h - 1 - t);
                    }
                }
            }

            // 2. Draw PC Image ON TOP (z-index highest)
            // This ensures no border appears *over* the PC image.
            const controlImage = await Jimp.read(CONTROL_PANEL_PATH);
            controlImage.resize(CONTROL_PANEL_WIDTH, CONTROL_PANEL_HEIGHT); // FIXED SIZE
            image.composite(controlImage, pcPos.x, pcPos.y);
        }

        return image.getBufferAsync(Jimp.MIME_PNG);
    } catch (err) {
        console.error('Error generating locker grid:', err);
        return generateFallbackGrid(columns, tiers);
    }
}

/**
 * Draw frame overlays on the image
 * @param {Jimp} image - The Jimp image object
 * @param {number} width - Total width of the locker
 * @param {number} height - Total height of the locker
 * @param {string} frameType - Frame type: 'none', 'fullSet', 'topOnly', 'sideOnly', 'topAndSide'
 */
function drawFrameOverlay(image, width, height, frameType) {
    const BLACK = 0x000000FF;
    const TOP_FRAME_THICKNESS = 150; // Thick frame on top
    const SIDE_FRAME_THICKNESS = 40; // Thin frame on sides

    const shouldDrawTop = frameType === 'fullSet' || frameType === 'topOnly' || frameType === 'topAndSide';
    const shouldDrawSide = frameType === 'fullSet' || frameType === 'sideOnly' || frameType === 'topAndSide';

    // Draw top frame (thick black rectangle on top edge)
    if (shouldDrawTop) {
        for (let y = 0; y < TOP_FRAME_THICKNESS; y++) {
            for (let x = 0; x < width; x++) {
                image.setPixelColor(BLACK, x, y);
            }
        }
    }

    // Draw side frames (thin black rectangles on left and right edges)
    if (shouldDrawSide) {
        // Left side frame
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < SIDE_FRAME_THICKNESS; x++) {
                image.setPixelColor(BLACK, x, y);
            }
        }

        // Right side frame
        for (let y = 0; y < height; y++) {
            for (let x = width - SIDE_FRAME_THICKNESS; x < width; x++) {
                image.setPixelColor(BLACK, x, y);
            }
        }
    }
}

/**
 * Fallback grid generation if images can't be loaded
 */
async function generateFallbackGrid(columns, tiers) {
    const cellWidth = 80;
    const cellHeight = 73;
    const width = columns * cellWidth;
    const height = tiers * cellHeight;

    const image = new Jimp(width, height, 0xF0F0F0FF);

    // Draw simple rectangles
    for (let col = 0; col < columns; col++) {
        for (let tier = 0; tier < tiers; tier++) {
            const x = col * cellWidth;
            const y = tier * cellHeight;
            image.setPixelColor(0x4A6FA5FF, x + 10, y + 10);
        }
    }

    return image.getBufferAsync(Jimp.MIME_PNG);
}

/**
 * Get base64 encoded image
 */
export async function generateLockerGridBase64(columns, tiers, options = {}) {
    const buffer = await generateLockerGrid(columns, tiers, options);
    return buffer.toString('base64');
}
