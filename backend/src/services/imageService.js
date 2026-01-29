import Jimp from 'jimp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createCanvas, registerFont } from 'canvas';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_PATH = join(__dirname, '../../assets');

// Asset image paths
const LOCKER_CELL_PATH = join(ASSETS_PATH, 'only_locker.png');
const HANDLE_PATH = join(ASSETS_PATH, 'handle.png');
const CONTROL_PANEL_PATH = join(ASSETS_PATH, 'controller.png');

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
const CONTROL_PANEL_HEIGHT = 225;

// Controller column optimization constants
const MIN_LOCKER_HEIGHT = 40; // Minimum usable locker height (낮춤 - 작은 셀도 그리기)

// Color palettes
const LOCKER_COLORS = {
    black: { hex: '#2C2C2C', name: '블랙' },
    white: { hex: '#F5F5F5', name: '화이트' },
    ivory: { hex: '#FFFFF0', name: '아이보리' }
};

// Frame color is fixed to black
const FRAME_COLOR = 0x000000FF;

/**
 * Get preset ratios for tier configuration
 * @param {number} tiers - Number of tiers
 * @param {string} type - Preset type: 'uniform', 'topLarge', 'bottomLarge', 'bothLarge'
 * @returns {number[]} Array of ratios for each tier
 */
function getPresetRatios(tiers, type) {
    const ratios = new Array(tiers).fill(1);

    switch (type) {
        case 'topLarge':
            // First tier is 2x height
            ratios[0] = 2;
            break;
        case 'bottomLarge':
            // Last tier is 2x height
            ratios[tiers - 1] = 2;
            break;
        case 'bothLarge':
            // First and last tiers are 2x height
            ratios[0] = 2;
            ratios[tiers - 1] = 2;
            break;
        case 'uniform':
        default:
            // All tiers equal (already filled with 1s)
            break;
    }

    return ratios;
}

/**
 * Get tier heights based on configuration
 * @param {number} tiers - Number of tiers
 * @param {Object} tierConfig - Tier configuration { type, ratios }
 * @param {number} totalHeight - Total height to distribute
 * @returns {number[]} Array of heights for each tier
 */
function getTierHeights(tiers, tierConfig, totalHeight) {
    const ratios = tierConfig?.type === 'custom' && Array.isArray(tierConfig.ratios)
        ? tierConfig.ratios
        : getPresetRatios(tiers, tierConfig?.type || 'uniform');

    const totalRatio = ratios.reduce((sum, r) => sum + r, 0);
    const unitHeight = totalHeight / totalRatio;

    return ratios.map(r => unitHeight * r);
}

/**
 * Apply color tint to an image
 * @param {Jimp} image - The Jimp image to modify
 * @param {string} hexColor - Hex color string (e.g., '#808080')
 * @returns {Jimp} Modified image
 */
function applyColorTint(image, hexColor) {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    // First convert to grayscale to remove original color
    image.grayscale();

    // Then apply color tint based on luminance
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
        // After grayscale, R=G=B, so just use one channel as luminance
        const luminance = this.bitmap.data[idx] / 255;

        // Apply target color scaled by luminance
        this.bitmap.data[idx] = Math.round(r * luminance);
        this.bitmap.data[idx + 1] = Math.round(g * luminance);
        this.bitmap.data[idx + 2] = Math.round(b * luminance);
        // Alpha channel (idx + 3) remains unchanged
    });

    return image;
}

/**
 * Generate a locker grid image based on configuration
 * @param {number} columns - Number of locker columns
 * @param {number} tiers - Number of tiers (rows)
 * @param {Object} options - Additional options
 * @param {number} options.controlPanelColumn - 1-based index of column to place control panel (1..columns)
 * @param {number} options.controlPanelTiers - Number of tiers the control panel occupies (1..tiers-1)
 * @param {string} options.frameType - Frame type: 'none', 'fullSet', 'topOnly', 'sideOnly', 'topAndSide'
 * @param {string} options.lockerColor - Locker color: 'black', 'gray', 'white', 'ivory', 'custom'
 * @param {string} options.customColor - Custom hex color (when lockerColor is 'custom')
 * @returns {Promise<Buffer>} PNG image buffer
 */
export async function generateLockerGrid(columns, tiers, options = {}) {
    const {
        controlPanelColumn = 0, // 0 means no control panel
        controlPanelTiers = 4,  // Number of tiers for control panel
        frameType = 'none',
        lockerColor = 'black',  // Default locker color
        customColor = '#808080', // Custom color when lockerColor is 'custom'
        handle = false, // 손잡이 옵션
        tierConfig = { type: 'uniform' } // 비균등함 옵션
    } = options;

    try {
        // 총 높이 고정 (단 수 상관없이 항상 동일)
        const FIXED_TOTAL_HEIGHT = 680;

        // Get tier heights based on configuration (supports non-uniform heights)
        const tierHeights = getTierHeights(tiers, tierConfig, FIXED_TOTAL_HEIGHT);
        console.log(`📐 Tier heights (${tierConfig?.type || 'uniform'}):`, tierHeights.map(h => Math.round(h)));

        // Border settings - 심플 그리드 방식
        // 셀은 전체 영역 채움, 그리드 선은 나중에 위에 그림
        const GRID_LINE_WIDTH = 1;
        const BORDER_COLOR = 0x000000FF; // Black

        // Load locker cell image and crop out its border completely
        const originalCellImage = await Jimp.read(LOCKER_CELL_PATH);
        // 원본 이미지 테두리 제거 (이미지 자체에 얇은 회색 선이 있음)
        const ORIGINAL_BORDER = 3; // 원본 테두리 두께
        const croppedWidth = originalCellImage.bitmap.width - (ORIGINAL_BORDER * 2);
        const croppedHeight = originalCellImage.bitmap.height - (ORIGINAL_BORDER * 2);
        originalCellImage.crop(ORIGINAL_BORDER, ORIGINAL_BORDER, croppedWidth, croppedHeight);

        // Apply color tint to the cropped cell (borderless content)
        const targetColor = lockerColor === 'custom'
            ? customColor
            : (LOCKER_COLORS[lockerColor]?.hex || LOCKER_COLORS.black.hex);
        console.log(`🎨 Applying color tint: lockerColor=${lockerColor}, targetColor=${targetColor}`);
        applyColorTint(originalCellImage, targetColor);

        // Load handle image if needed (will composite per cell with different heights)
        let handleImage = null;
        if (handle) {
            try {
                handleImage = await Jimp.read(HANDLE_PATH);
                handleImage.autocrop();
            } catch (handleError) {
                console.warn('⚠️ Failed to load handle image:', handleError.message);
            }
        }

        // Frame thickness constants
        const TOP_FRAME_THICKNESS = frameType === 'fullSet' || frameType === 'topOnly' || frameType === 'topAndSide' ? 100 : 0;
        const SIDE_FRAME_THICKNESS = frameType === 'fullSet' || frameType === 'sideOnly' || frameType === 'topAndSide' ? 20 : 0;

        // Calculate locker dimensions (without frames)
        const lockerWidth = columns * TARGET_CELL_WIDTH;
        const lockerHeight = FIXED_TOTAL_HEIGHT; // Always 680px

        // Calculate total canvas dimensions (including frames + border on right/bottom edges)
        const canvasWidth = lockerWidth + (SIDE_FRAME_THICKNESS * 2) + GRID_LINE_WIDTH;
        const canvasHeight = lockerHeight + TOP_FRAME_THICKNESS + GRID_LINE_WIDTH;

        // Offset for locker position (to make room for frames)
        const lockerOffsetX = SIDE_FRAME_THICKNESS;
        const lockerOffsetY = TOP_FRAME_THICKNESS;

        // Create base image with white background
        const image = new Jimp(canvasWidth, canvasHeight, 0xFFFFFFFF);

        // Draw frame backgrounds first (before locker cells)
        if (frameType !== 'none') {

            // Draw top frame
            if (TOP_FRAME_THICKNESS > 0) {
                for (let y = 0; y < TOP_FRAME_THICKNESS; y++) {
                    for (let x = 0; x < canvasWidth; x++) {
                        image.setPixelColor(FRAME_COLOR, x, y);
                    }
                }
            }

            // Draw side frames
            if (SIDE_FRAME_THICKNESS > 0) {
                // Left side frame
                for (let y = 0; y < canvasHeight; y++) {
                    for (let x = 0; x < SIDE_FRAME_THICKNESS; x++) {
                        image.setPixelColor(FRAME_COLOR, x, y);
                    }
                }

                // Right side frame
                for (let y = 0; y < canvasHeight; y++) {
                    for (let x = canvasWidth - SIDE_FRAME_THICKNESS; x < canvasWidth; x++) {
                        image.setPixelColor(FRAME_COLOR, x, y);
                    }
                }
            }
        }

        // Pre-calculate cumulative Y positions for each tier
        const tierYPositions = [0]; // Y position at start of each tier
        for (let i = 0; i < tiers; i++) {
            tierYPositions.push(tierYPositions[i] + tierHeights[i]);
        }

        // Define Control Panel area and controller column locker cells
        let controllerColumnCells = []; // Custom cells for controller column (above and below controller)
        let controllerAreaTop = 0; // Y position where controller area starts
        let controllerAreaBottom = 0; // Y position where controller area ends
        let pcPos = null;

        console.log(`🔍 DEBUG: controlPanelColumn=${controlPanelColumn}, controlPanelTiers=${controlPanelTiers}, columns=${columns}`);

        if (controlPanelColumn && controlPanelColumn >= 1 && controlPanelColumn <= columns) {
            // NEW LOGIC: Controller in middle, lockers above AND below
            // 1. Controller image is placed at a fixed position (100px from top)
            // 2. Space above controller → fill with lockers if >= MIN_LOCKER_HEIGHT
            // 3. Space below controller → fill with lockers if >= MIN_LOCKER_HEIGHT
            // 4. Small spaces (< MIN_LOCKER_HEIGHT) get absorbed into controller area

            const totalColumnHeight = FIXED_TOTAL_HEIGHT;
            const CONTROLLER_IMAGE_TOP = 110; // Fixed position: controller image starts 110px from grid top
            const controllerImageBottom = CONTROLLER_IMAGE_TOP + CONTROL_PANEL_HEIGHT;

            // Calculate space above and below controller image
            let spaceAbove = CONTROLLER_IMAGE_TOP;
            let spaceBelow = totalColumnHeight - controllerImageBottom;

            // 제어부 단수: 위에 1칸 고정, 아래에 나머지 칸
            // ex) controlPanelTiers = 4 → 위 1칸, 아래 3칸
            let lockersAbove = 1; // 항상 1칸 고정
            let lockersBelow = Math.max(0, controlPanelTiers - 1); // 나머지 아래에

            // Controller area bounds
            controllerAreaTop = spaceAbove; // 위 1칸 아래가 controller 시작
            controllerAreaBottom = controllerImageBottom; // controller 끝

            // Build locker cells ABOVE controller
            if (lockersAbove > 0) {
                const lockerHeightAbove = spaceAbove / lockersAbove;
                for (let i = 0; i < lockersAbove; i++) {
                    controllerColumnCells.push({
                        y: i * lockerHeightAbove,
                        height: lockerHeightAbove
                    });
                }
            }

            // Build locker cells BELOW controller
            if (lockersBelow > 0) {
                const lockerHeightBelow = spaceBelow / lockersBelow;
                const belowStartY = controllerImageBottom;
                for (let i = 0; i < lockersBelow; i++) {
                    controllerColumnCells.push({
                        y: belowStartY + i * lockerHeightBelow,
                        height: lockerHeightBelow
                    });
                }
            }

            console.log(`📦 Controller column: ${lockersAbove} above + ${lockersBelow} below = ${controllerColumnCells.length} lockers`);
            console.log(`   spaceAbove: ${spaceAbove}px, spaceBelow: ${spaceBelow}px`);
            console.log(`   controlPanelTiers received: ${controlPanelTiers}`);
            console.log(`   Cells:`, controllerColumnCells.map(c => `y=${Math.round(c.y)}, h=${Math.round(c.height)}`));

            // Controller image position
            pcPos = {
                x: lockerOffsetX + (controlPanelColumn - 1) * TARGET_CELL_WIDTH,
                y: lockerOffsetY + CONTROLLER_IMAGE_TOP
            };
        }

        // STEP 1: 락커 영역 전체를 단색으로 채우기 (이미지 resize 문제 완전 제거)
        const lockerColorInt = Jimp.cssColorToHex(targetColor);
        for (let y = lockerOffsetY; y < lockerOffsetY + FIXED_TOTAL_HEIGHT; y++) {
            for (let x = lockerOffsetX; x < lockerOffsetX + lockerWidth; x++) {
                image.setPixelColor(lockerColorInt, x, y);
            }
        }

        // STEP 1.5: 손잡이 그리기 (옵션)
        if (handleImage) {
            for (let col = 0; col < columns; col++) {
                const isControllerColumn = controlPanelColumn && col === (controlPanelColumn - 1);

                if (isControllerColumn && controllerColumnCells.length > 0) {
                    // Controller column: use custom cell positions
                    for (const cell of controllerColumnCells) {
                        const cellX = lockerOffsetX + col * TARGET_CELL_WIDTH;
                        const cellY = Math.round(lockerOffsetY + cell.y);
                        const cellHeight = Math.round(cell.height);

                        const handleWidth = 50;
                        const handleHeight = Math.round(handleImage.bitmap.height * (handleWidth / handleImage.bitmap.width));
                        const resizedHandle = handleImage.clone().resize(handleWidth, handleHeight, Jimp.RESIZE_NEAREST_NEIGHBOR);
                        const handleX = cellX;
                        const handleY = cellY + Math.round((cellHeight - handleHeight) / 2);
                        image.composite(resizedHandle, handleX, handleY);
                    }
                } else if (!isControllerColumn || controllerColumnCells.length === 0) {
                    // Regular columns: use tier-based positions
                    for (let tier = 0; tier < tiers; tier++) {
                        const cellX = lockerOffsetX + col * TARGET_CELL_WIDTH;
                        const cellY = Math.round(lockerOffsetY + tierYPositions[tier]);
                        const nextCellY = Math.round(lockerOffsetY + tierYPositions[tier + 1]);
                        const cellHeight = nextCellY - cellY;

                        const handleWidth = 50;
                        const handleHeight = Math.round(handleImage.bitmap.height * (handleWidth / handleImage.bitmap.width));
                        const resizedHandle = handleImage.clone().resize(handleWidth, handleHeight, Jimp.RESIZE_NEAREST_NEIGHBOR);
                        const handleX = cellX;
                        const handleY = cellY + Math.round((cellHeight - handleHeight) / 2);
                        image.composite(resizedHandle, handleX, handleY);
                    }
                }
            }
        }

        // STEP 2: 1px 그리드 선 그리기
        const gridLeft = lockerOffsetX;
        const gridTop = lockerOffsetY;
        const gridRight = lockerOffsetX + lockerWidth;
        const gridBottom = lockerOffsetY + FIXED_TOTAL_HEIGHT;

        // 수평선: 각 tier 경계에서 1px (제어부 열은 건너뜀)
        const ctrlColStart = controlPanelColumn ? lockerOffsetX + (controlPanelColumn - 1) * TARGET_CELL_WIDTH : -1;
        const ctrlColEnd = controlPanelColumn ? ctrlColStart + TARGET_CELL_WIDTH : -1;

        for (let tier = 0; tier <= tiers; tier++) {
            const lineY = Math.round(lockerOffsetY + tierYPositions[tier]);
            for (let x = gridLeft; x < gridRight; x++) {
                // 제어부 열 영역은 건너뛰기 (해당 열은 커스텀 수평선으로 별도 처리)
                if (controlPanelColumn && controllerColumnCells.length > 0 && x >= ctrlColStart && x < ctrlColEnd) {
                    continue;
                }
                image.setPixelColor(BORDER_COLOR, x, lineY);
            }
        }

        // 수직선: 각 column 경계에서 1px
        for (let col = 0; col <= columns; col++) {
            const lineX = lockerOffsetX + col * TARGET_CELL_WIDTH;
            for (let y = gridTop; y < gridBottom; y++) {
                image.setPixelColor(BORDER_COLOR, lineX, y);
            }
        }

        // 제어부 열 전용 수평선 (커스텀 셀 경계)
        if (controlPanelColumn && controllerColumnCells.length > 0) {
            const ctrlColLeft = lockerOffsetX + (controlPanelColumn - 1) * TARGET_CELL_WIDTH;
            const ctrlColRight = ctrlColLeft + TARGET_CELL_WIDTH;

            const customYs = new Set();
            // 맨 위 (0px)
            customYs.add(lockerOffsetY);
            // 맨 아래 (전체 높이)
            customYs.add(lockerOffsetY + FIXED_TOTAL_HEIGHT);
            // 컨트롤러 영역 경계
            customYs.add(Math.round(lockerOffsetY + controllerAreaTop));
            customYs.add(Math.round(lockerOffsetY + controllerAreaBottom));
            // 각 락커 셀 경계
            for (const cell of controllerColumnCells) {
                customYs.add(Math.round(lockerOffsetY + cell.y));
                customYs.add(Math.round(lockerOffsetY + cell.y + cell.height));
            }

            for (const lineY of customYs) {
                for (let x = ctrlColLeft; x < ctrlColRight; x++) {
                    image.setPixelColor(BORDER_COLOR, x, lineY);
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
            // Draw PC Image ON TOP (z-index highest)
            const controlImage = await Jimp.read(CONTROL_PANEL_PATH);
            controlImage.resize(CONTROL_PANEL_WIDTH, CONTROL_PANEL_HEIGHT); // FIXED SIZE

            image.composite(controlImage, pcPos.x, pcPos.y);

            // Draw left border of controller (grid line is covered by controller image)
            for (let y = 0; y < CONTROL_PANEL_HEIGHT; y++) {
                for (let t = 0; t < GRID_LINE_WIDTH; t++) {
                    image.setPixelColor(BORDER_COLOR, pcPos.x + t, pcPos.y + y);
                }
            }
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
