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

// Controller type assets (레이어 분리 합성 방식)
const CONTROLLER_BG_PATH = join(ASSETS_PATH, 'controller-bg.png');
const CONTROLLER_EQUIPMENT_PATH = join(ASSETS_PATH, 'controller-equipment.png');
const BARRIER_FREE_BG_PATH = join(ASSETS_PATH, 'barrier-free-bg.png');
const BARRIER_FREE_EQUIPMENT_PATH = join(ASSETS_PATH, 'barrier-free-equipment.png');
// 기존 단일 이미지 (폴백용)
const BARRIER_FREE_PATH = join(ASSETS_PATH, 'barrier_free.png');

// 화면 오버레이 (색상 틴트 후 덮어씌움 - 화면 색상 유지)
const SCREEN_PATH = join(ASSETS_PATH, 'screen.png');
// 듀얼컨트롤러 이미지
const DUAL_PATH = join(ASSETS_PATH, 'dual.png');

// 화면 오버레이 설정 (원본 제어부 이미지 기준)
// controller.png: 706 x 1058, screen.png: 237 x 177
// barrier_free.png: 245 x 307 → 90 x 205 (너비 60%, 높이 0.9배)
const SCREEN_CONFIG = {
    standard: { x: 91, y: 187, scaleX: 1.73, scaleY: 1.68 }, // 일반형: 가로 1.73배, 세로 1.68배
    'barrier-free': { x: 24, y: 47, scaleX: 0.64, scaleY: 0.71 }  // 배리어프리: 위치/크기 조정
};

// 듀얼컨트롤러 설정 (barrier_free 하단 아래에 배치)
const DUAL_CONFIG = {
    'barrier-free': { offsetX: 0, offsetY: 5, scale: 0.35 }  // barrier_free 하단 기준 오프셋
};

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
const CONTROL_PANEL_HEIGHT = 228;

// 배리어프리 셀 공간 (그리드에서 차지하는 영역) - 일반 제어부의 1.8배 높이
const BARRIER_FREE_CELL_HEIGHT = Math.round(CONTROL_PANEL_HEIGHT * 1.8); // 410px
// 배리어프리 이미지 원본 비율 (245 x 307 = 0.798)
const BARRIER_FREE_ORIGINAL_RATIO = 245 / 307;

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
 * Draw acrylic window (아크릴 창문) on a cell area
 * A thin horizontal window in the center with light reflection effect
 * @param {Jimp} image - The Jimp image to draw on
 * @param {number} cellX - Cell X position
 * @param {number} cellY - Cell Y position
 * @param {number} cellWidth - Cell width
 * @param {number} cellHeight - Cell height
 */
function drawAcrylicWindow(image, cellX, cellY, cellWidth, cellHeight) {
    // 창문 크기: 너비 70%, 높이 13.3% (20%의 2/3), 우측으로 10px 오프셋
    const windowWidthRatio = 0.70;
    const windowHeightRatio = 0.133;

    const windowWidth = Math.floor(cellWidth * windowWidthRatio);
    const windowHeight = Math.floor(cellHeight * windowHeightRatio);

    // 중앙 정렬 + 우측으로 10px 이동 (15 - 5)
    const windowX = cellX + Math.floor((cellWidth - windowWidth) / 2) + 10;
    const windowY = cellY + Math.floor((cellHeight - windowHeight) / 2);

    // 창문 베이스 그리기 + 명확한 빛 반사 효과
    for (let py = windowY; py < windowY + windowHeight; py++) {
        for (let px = windowX; px < windowX + windowWidth; px++) {
            if (px < 0 || px >= image.bitmap.width || py < 0 || py >= image.bitmap.height) continue;

            // 정규화된 좌표 (0~1)
            const nx = (px - windowX) / windowWidth;
            const ny = (py - windowY) / windowHeight;

            // 베이스 검은색
            let r = 10, g = 12, b = 16;

            // 대각선 그라데이션 하이라이트 (좌상단에서 우하단으로)
            const diagonal = nx * 0.5 + ny * 0.5;

            // 메인 하이라이트: 좌상단 영역 (강한 대각선 반사)
            if (diagonal < 0.45) {
                const intensity = (0.45 - diagonal) / 0.45;
                const fade = Math.pow(intensity, 1.2);
                r += Math.floor(100 * fade);
                g += Math.floor(110 * fade);
                b += Math.floor(130 * fade);
            }

            // 서브 하이라이트: 뚜렷한 대각선 줄무늬
            if (diagonal > 0.5 && diagonal < 0.65) {
                const stripe = Math.sin((diagonal - 0.5) * Math.PI / 0.15);
                const intensity = Math.max(0, stripe) * 0.6;
                r += Math.floor(60 * intensity);
                g += Math.floor(70 * intensity);
                b += Math.floor(85 * intensity);
            }

            // 가장자리 밝기 (프레임 반사) - 더 강하게
            const edgeDist = Math.min(nx, 1 - nx, ny, 1 - ny);
            if (edgeDist < 0.12) {
                const edgeFade = (0.12 - edgeDist) / 0.12;
                r += Math.floor(25 * edgeFade);
                g += Math.floor(30 * edgeFade);
                b += Math.floor(35 * edgeFade);
            }

            // 색상 클램프
            r = Math.min(255, Math.max(0, r));
            g = Math.min(255, Math.max(0, g));
            b = Math.min(255, Math.max(0, b));

            image.setPixelColor(Jimp.rgbaToInt(r, g, b, 255), px, py);
        }
    }
}

/**
 * Draw perforation pattern (타공 패턴) on a cell area
 * Staggered/honeycomb pattern - alternating row offsets
 * @param {Jimp} image - The Jimp image to draw on
 * @param {number} cellX - Cell X position
 * @param {number} cellY - Cell Y position
 * @param {number} cellWidth - Cell width
 * @param {number} cellHeight - Cell height
 * @param {string} bgColor - Background color hex string
 */
function drawPerforationPattern(image, cellX, cellY, cellWidth, cellHeight, bgColor) {
    // 타공 영역: 가로 30%~100%, 세로는 고정 여백
    const leftMargin = cellWidth * 0.30;  // 왼쪽 30% 솔리드
    const topMargin = 20;     // 위 고정 20px 여백
    const bottomMargin = 20;  // 아래 고정 20px 여백

    const areaX = cellX + leftMargin;
    const areaY = cellY + topMargin;
    const areaWidth = cellWidth - leftMargin;
    const areaHeight = cellHeight - topMargin - bottomMargin;

    // 구멍 스펙 - 마름모 (작은 크기)
    const holeRadius = 1.2;    // 반경 1.2px (마름모)
    const holeSpacingX = 6;    // 가로 간격
    const holeSpacingY = 5;    // 세로 간격

    // 배경색에서 어둡게 한 색상 (깊이감)
    const bgR = parseInt(bgColor.slice(1, 3), 16);
    const bgG = parseInt(bgColor.slice(3, 5), 16);
    const bgB = parseInt(bgColor.slice(5, 7), 16);

    // 구멍 내부 색상: 어두운 깊이
    const holeColor = Jimp.rgbaToInt(
        Math.round(bgR * 0.10),
        Math.round(bgG * 0.10),
        Math.round(bgB * 0.10),
        255
    );

    // 엇갈린 패턴 (staggered/honeycomb) 그리기 - 세로 중앙 정렬
    const paddingX = holeSpacingX / 2;

    // 세로: 몇 줄이 들어갈 수 있는지 계산 후 중앙 정렬
    const availableHeight = areaHeight;
    const numRows = Math.floor((availableHeight - holeRadius * 2) / holeSpacingY);
    const totalPatternHeight = (numRows - 1) * holeSpacingY;
    const startY = areaY + (availableHeight - totalPatternHeight) / 2;

    for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
        const y = startY + rowIndex * holeSpacingY;

        // 짝수 줄은 x 시작점을 간격/2 만큼 오프셋
        const isEvenRow = (rowIndex % 2 === 1);
        const xOffset = isEvenRow ? holeSpacingX / 2 : 0;
        // 짝수 줄은 맨 오른쪽 원 제외 (간격/2 만큼 더 일찍 종료)
        const xEndOffset = isEvenRow ? holeSpacingX / 2 : 0;

        for (let x = areaX + paddingX + xOffset; x < areaX + areaWidth - paddingX - xEndOffset; x += holeSpacingX) {
            // 원형 구멍 그리기 (filled circle)
            const r = Math.ceil(holeRadius);
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    // 원의 방정식: x² + y² <= r²
                    if (dx * dx + dy * dy <= holeRadius * holeRadius) {
                        const px = Math.round(x + dx);
                        const py = Math.round(y + dy);

                        // 이미지 경계 체크
                        if (px < 0 || px >= image.bitmap.width || py < 0 || py >= image.bitmap.height) continue;

                        image.setPixelColor(holeColor, px, py);
                    }
                }
            }
        }
    }
}

/**
 * Draw speaker holes pattern (스피커 구멍) - hexagonal area with diamond holes
 * Creates a hexagonal shaped area filled with small diamond holes
 * @param {Jimp} image - The Jimp image to draw on
 * @param {number} cellX - Cell X position
 * @param {number} cellY - Cell Y position
 * @param {number} cellWidth - Cell width
 * @param {number} cellHeight - Cell height
 * @param {string} bgColor - Background color hex string
 */
function drawSpeakerHoles(image, cellX, cellY, cellWidth, cellHeight, bgColor) {
    // 6각형 중심 위치
    const centerX = cellX + 32;
    const centerY = cellY + 38;
    const hexRadius = 14;  // 6각형 반경

    // 마름모 스펙
    const diamondSize = 1;   // 마름모 크기 (작게)
    const spacingX = 5;      // 가로 간격
    const spacingY = 4.5;    // 세로 간격

    // 배경색에서 어둡게 한 색상
    const bgR = parseInt(bgColor.slice(1, 3), 16);
    const bgG = parseInt(bgColor.slice(3, 5), 16);
    const bgB = parseInt(bgColor.slice(5, 7), 16);

    const holeColor = Jimp.rgbaToInt(
        Math.round(bgR * 0.08),
        Math.round(bgG * 0.08),
        Math.round(bgB * 0.08),
        255
    );

    // 6각형 내부인지 체크하는 함수
    function isInsideHexagon(x, y, cx, cy, r) {
        const dx = Math.abs(x - cx);
        const dy = Math.abs(y - cy);
        // 6각형 (세로로 긴 형태) 경계 체크
        return dy <= r * 0.866 && dx <= r - dy * 0.5;
    }

    // 마름모 그리기 함수
    function drawDiamond(img, cx, cy, size, color) {
        // 마름모: 상하좌우 4방향 픽셀
        const points = [
            [cx, cy - size],     // 상
            [cx + size, cy],     // 우
            [cx, cy + size],     // 하
            [cx - size, cy],     // 좌
            [cx, cy]             // 중심
        ];
        for (const [px, py] of points) {
            if (px >= 0 && px < img.bitmap.width && py >= 0 && py < img.bitmap.height) {
                img.setPixelColor(color, Math.round(px), Math.round(py));
            }
        }
    }

    // 벌집 패턴으로 마름모 배치 (6각형 영역 내부만)
    const rows = Math.ceil(hexRadius * 2 / spacingY);
    const cols = Math.ceil(hexRadius * 2 / spacingX);

    for (let row = -rows; row <= rows; row++) {
        const y = centerY + row * spacingY;
        const isEvenRow = (row % 2 === 0);
        const xOffset = isEvenRow ? 0 : spacingX / 2;

        for (let col = -cols; col <= cols; col++) {
            const x = centerX + col * spacingX + xOffset;

            // 6각형 영역 내부인지 체크
            if (isInsideHexagon(x, y, centerX, centerY, hexRadius)) {
                drawDiamond(image, x, y, diamondSize, holeColor);
            }
        }
    }

    // 스피커 옆 원형 버튼 (barrier_free.png 중앙과 수평 정렬)
    // barrier_free.png: xOffset=28, imgWidth=114 → 중앙 X = 28 + 57 = 85
    const circleX = cellX + 85;
    const circleY = centerY;  // 스피커와 같은 높이
    const circleRadius = 4;

    // 원 그리기 (filled circle)
    for (let dy = -circleRadius; dy <= circleRadius; dy++) {
        for (let dx = -circleRadius; dx <= circleRadius; dx++) {
            if (dx * dx + dy * dy <= circleRadius * circleRadius) {
                const px = Math.round(circleX + dx);
                const py = Math.round(circleY + dy);
                if (px >= 0 && px < image.bitmap.width && py >= 0 && py < image.bitmap.height) {
                    image.setPixelColor(holeColor, px, py);
                }
            }
        }
    }
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
        controllerType = 'standard', // 'qr' | 'standard' | 'barrier-free'
        frameType = 'none',
        frameText = '물품보관함', // 프레임 상단 텍스트 (커스터마이징 가능)
        lockerColor = 'black',  // Default locker color
        customColor = '#808080', // Custom color when lockerColor is 'custom'
        handle = false, // 손잡이 옵션
        perforation = false, // 타공 디자인 옵션
        acrylic = false, // 아크릴도어 옵션
        tierConfig = { type: 'uniform' }, // 비균등함 옵션 (전체 열 기본값)
        dualController = false, // 듀얼컨트롤러 옵션
        columnConfigs = null // 열별 설정 배열 [{ tiers, tierConfig }, ...]
    } = options;

    try {
        // 총 높이 고정 (단 수 상관없이 항상 동일)
        const FIXED_TOTAL_HEIGHT = 680;

        // 열별 tier heights 계산
        const columnTierHeights = [];
        const columnTierCounts = [];
        for (let col = 0; col < columns; col++) {
            const colConfig = columnConfigs?.[col] || { tiers, tierConfig };
            const colTiers = colConfig.tiers || tiers;
            const colTierConfig = colConfig.tierConfig || tierConfig;
            columnTierCounts.push(colTiers);
            columnTierHeights.push(getTierHeights(colTiers, colTierConfig, FIXED_TOTAL_HEIGHT));
        }

        // 기본 tierHeights (하위 호환 및 제어부 열용)
        const tierHeights = getTierHeights(tiers, tierConfig, FIXED_TOTAL_HEIGHT);
        console.log(`📐 Tier heights (${tierConfig?.type || 'uniform'}):`, tierHeights.map(h => Math.round(h)));
        if (columnConfigs) {
            console.log(`📐 Column configs enabled:`, columnTierCounts);
        }

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

        console.log(`🔍 DEBUG: controlPanelColumn=${controlPanelColumn}, controlPanelTiers=${controlPanelTiers}, controllerType=${controllerType}, columns=${columns}`);

        // QR타입일 때는 제어부 없음 - 해당 열을 일반 셀로 처리
        if (controlPanelColumn && controlPanelColumn >= 1 && controlPanelColumn <= columns && controllerType !== 'qr') {
            // NEW LOGIC: Controller in middle, lockers above AND below
            // 1. Controller image is placed at a fixed position (100px from top)
            // 2. Space above controller → fill with lockers if >= MIN_LOCKER_HEIGHT
            // 3. Space below controller → fill with lockers if >= MIN_LOCKER_HEIGHT
            // 4. Small spaces (< MIN_LOCKER_HEIGHT) get absorbed into controller area

            const totalColumnHeight = FIXED_TOTAL_HEIGHT;
            // 배리어프리: 제어부 셀 시작 위치 1px 아래로
            const CONTROLLER_IMAGE_TOP = controllerType === 'barrier-free' ? 113 : 113;
            // 셀 공간 높이 (그리드 레이아웃 계산용)
            const controllerCellHeight = controllerType === 'barrier-free'
                ? BARRIER_FREE_CELL_HEIGHT  // 410px (일반의 1.8배)
                : CONTROL_PANEL_HEIGHT;      // 228px
            const controllerCellBottom = CONTROLLER_IMAGE_TOP + controllerCellHeight;

            // Calculate space above and below controller cell
            let spaceAbove = CONTROLLER_IMAGE_TOP;
            let spaceBelow = totalColumnHeight - controllerCellBottom;

            // 제어부 단수: 배리어프리는 위 1칸, 아래 1칸 고정
            // 일반형: 위에 1칸 고정, 아래에 나머지 칸
            let lockersAbove = 1; // 항상 1칸 고정
            let lockersBelow = controllerType === 'barrier-free'
                ? 1  // 배리어프리: 아래 1칸 고정
                : Math.max(0, controlPanelTiers - 1); // 일반형: 나머지 아래에

            // Controller area bounds (셀 공간 기준)
            controllerAreaTop = spaceAbove; // 위 1칸 아래가 controller 시작
            controllerAreaBottom = controllerCellBottom; // controller 셀 끝

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
                const belowStartY = controllerCellBottom;
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
                    // Regular columns: use column-specific tier heights
                    const colHeights = columnTierHeights[col] || tierHeights;
                    const colTierCount = columnTierCounts[col] || tiers;
                    let yOffset = 0;
                    for (let tier = 0; tier < colTierCount; tier++) {
                        const cellX = lockerOffsetX + col * TARGET_CELL_WIDTH;
                        const cellY = Math.round(lockerOffsetY + yOffset);
                        const cellHeight = Math.round(colHeights[tier]);

                        const handleWidth = 50;
                        const handleHeight = Math.round(handleImage.bitmap.height * (handleWidth / handleImage.bitmap.width));
                        const resizedHandle = handleImage.clone().resize(handleWidth, handleHeight, Jimp.RESIZE_NEAREST_NEIGHBOR);
                        const handleX = cellX;
                        const handleY = cellY + Math.round((cellHeight - handleHeight) / 2);
                        image.composite(resizedHandle, handleX, handleY);

                        yOffset += colHeights[tier];
                    }
                }
            }
        }

        // STEP 1.6: 타공 패턴 그리기 (옵션)
        if (perforation) {
            for (let col = 0; col < columns; col++) {
                const isControllerColumn = controlPanelColumn && col === (controlPanelColumn - 1);

                if (isControllerColumn && controllerColumnCells.length > 0) {
                    // Controller column: use custom cell positions
                    for (const cell of controllerColumnCells) {
                        const cellX = lockerOffsetX + col * TARGET_CELL_WIDTH;
                        const cellY = Math.round(lockerOffsetY + cell.y);
                        const cellHeight = Math.round(cell.height);
                        drawPerforationPattern(image, cellX, cellY, TARGET_CELL_WIDTH, cellHeight, targetColor);
                    }
                } else if (!isControllerColumn || controllerColumnCells.length === 0) {
                    // Regular columns: use column-specific tier heights
                    const colHeights = columnTierHeights[col] || tierHeights;
                    const colTierCount = columnTierCounts[col] || tiers;
                    let yOffset = 0;
                    for (let tier = 0; tier < colTierCount; tier++) {
                        const cellX = lockerOffsetX + col * TARGET_CELL_WIDTH;
                        const cellY = Math.round(lockerOffsetY + yOffset);
                        const cellHeight = Math.round(colHeights[tier]);
                        drawPerforationPattern(image, cellX, cellY, TARGET_CELL_WIDTH, cellHeight, targetColor);
                        yOffset += colHeights[tier];
                    }
                }
            }
        }

        // STEP 1.7: 아크릴 창문 그리기 (옵션)
        if (acrylic) {
            for (let col = 0; col < columns; col++) {
                const isControllerColumn = controlPanelColumn && col === (controlPanelColumn - 1);

                if (isControllerColumn && controllerColumnCells.length > 0) {
                    // Controller column: use custom cell positions
                    for (const cell of controllerColumnCells) {
                        const cellX = lockerOffsetX + col * TARGET_CELL_WIDTH;
                        const cellY = Math.round(lockerOffsetY + cell.y);
                        const cellHeight = Math.round(cell.height);
                        drawAcrylicWindow(image, cellX, cellY, TARGET_CELL_WIDTH, cellHeight);
                    }
                } else if (!isControllerColumn || controllerColumnCells.length === 0) {
                    // Regular columns: use column-specific tier heights
                    const colHeights = columnTierHeights[col] || tierHeights;
                    const colTierCount = columnTierCounts[col] || tiers;
                    let yOffset = 0;
                    for (let tier = 0; tier < colTierCount; tier++) {
                        const cellX = lockerOffsetX + col * TARGET_CELL_WIDTH;
                        const cellY = Math.round(lockerOffsetY + yOffset);
                        const cellHeight = Math.round(colHeights[tier]);
                        drawAcrylicWindow(image, cellX, cellY, TARGET_CELL_WIDTH, cellHeight);
                        yOffset += colHeights[tier];
                    }
                }
            }
        }

        // STEP 2: 1px 그리드 선 그리기 (열별로 다른 높이 지원)
        const gridLeft = lockerOffsetX;
        const gridTop = lockerOffsetY;
        const gridRight = lockerOffsetX + lockerWidth;
        const gridBottom = lockerOffsetY + FIXED_TOTAL_HEIGHT;

        // 열별 수평선 그리기 (각 열의 tier 경계)
        for (let col = 0; col < columns; col++) {
            const colX = lockerOffsetX + col * TARGET_CELL_WIDTH;
            const colXEnd = colX + TARGET_CELL_WIDTH;
            const isControllerColumn = controlPanelColumn && col === (controlPanelColumn - 1);

            // 제어부 열은 별도 처리
            if (isControllerColumn && controllerColumnCells.length > 0) {
                continue;
            }

            const colHeights = columnTierHeights[col] || tierHeights;
            const colTierCount = columnTierCounts[col] || tiers;
            let yOffset = 0;

            // 상단 선
            for (let x = colX; x < colXEnd; x++) {
                image.setPixelColor(BORDER_COLOR, x, gridTop);
            }

            // 각 tier 경계선
            for (let tier = 0; tier < colTierCount; tier++) {
                yOffset += colHeights[tier];
                const lineY = Math.round(lockerOffsetY + yOffset);
                for (let x = colX; x < colXEnd; x++) {
                    if (lineY < gridBottom + 1) {
                        image.setPixelColor(BORDER_COLOR, x, lineY);
                    }
                }
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
                // frameText를 받아서 자간 추가 (한글 기준 한 글자씩 띄어쓰기)
                const displayText = frameText && frameText.length > 0
                    ? frameText.split('').join(' ')
                    : '물 품 보 관 함';

                // Ensure text is valid before rendering
                if (typeof displayText === 'string' && displayText.length > 0) {
                    // Measure text to verify it can be rendered
                    const metrics = ctx.measureText(displayText);
                    if (metrics.width > 0) {
                        // Render the text
                        ctx.fillText(displayText, canvasWidth / 2, TOP_FRAME_THICKNESS / 2);

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
        // controllerType: 'qr' (제어부 없음), 'standard' (기존), 'barrier-free' (배리어프리)
        if (pcPos) {
            let controlImage = null;

            // 배리어프리: 스피커 구멍 먼저 그리기 (제어부 이미지 아래에 위치)
            if (controllerType === 'barrier-free') {
                drawSpeakerHoles(image, pcPos.x, pcPos.y, CONTROL_PANEL_WIDTH, BARRIER_FREE_CELL_HEIGHT, targetColor);
                console.log('🔊 Speaker holes drawn for barrier-free controller');
            }

            // 배리어프리 타입 처리
            if (controllerType === 'barrier-free') {
                // 레이어 분리 합성 방식 시도
                const hasBgAsset = existsSync(BARRIER_FREE_BG_PATH);
                const hasEquipAsset = existsSync(BARRIER_FREE_EQUIPMENT_PATH);
                const hasSingleAsset = existsSync(BARRIER_FREE_PATH);

                if (hasBgAsset && hasEquipAsset) {
                    // 레이어 분리 합성 방식
                    console.log('🎛️ Using barrier-free layer composition');
                    const bgImage = await Jimp.read(BARRIER_FREE_BG_PATH);
                    applyColorTint(bgImage, targetColor); // 배경에 함체색 적용
                    const equipImage = await Jimp.read(BARRIER_FREE_EQUIPMENT_PATH);
                    bgImage.composite(equipImage, 0, 0); // 장비 레이어 합성
                    controlImage = bgImage;
                } else if (hasSingleAsset) {
                    // 단일 이미지 사용 + 색상 틴트 적용 + 화면 오버레이
                    console.log('🎛️ Using barrier-free single image with color tint + screen overlay');
                    controlImage = await Jimp.read(BARRIER_FREE_PATH);
                    applyColorTint(controlImage, targetColor);

                    // 화면 오버레이 (색상 유지)
                    if (existsSync(SCREEN_PATH)) {
                        const screenImage = await Jimp.read(SCREEN_PATH);
                        const config = SCREEN_CONFIG['barrier-free'];
                        const newWidth = Math.round(screenImage.bitmap.width * config.scaleX);
                        const newHeight = Math.round(screenImage.bitmap.height * config.scaleY);
                        screenImage.resize(newWidth, newHeight);
                        controlImage.composite(screenImage, config.x, config.y);
                        console.log('📺 Screen overlay applied for barrier-free');
                    }
                } else {
                    // 폴백: 기존 controller.png
                    console.log('⚠️ Barrier-free assets not found, falling back to standard controller');
                    controlImage = await Jimp.read(CONTROL_PANEL_PATH);
                }
            } else {
                // 일반형 (standard) - 기존 controller.png
                // 레이어 분리 합성 시도
                const hasBgAsset = existsSync(CONTROLLER_BG_PATH);
                const hasEquipAsset = existsSync(CONTROLLER_EQUIPMENT_PATH);

                if (hasBgAsset && hasEquipAsset) {
                    // 레이어 분리 합성 방식
                    console.log('🎛️ Using standard controller layer composition');
                    const bgImage = await Jimp.read(CONTROLLER_BG_PATH);
                    applyColorTint(bgImage, targetColor); // 배경에 함체색 적용
                    const equipImage = await Jimp.read(CONTROLLER_EQUIPMENT_PATH);
                    bgImage.composite(equipImage, 0, 0); // 장비 레이어 합성
                    controlImage = bgImage;
                } else {
                    // 단일 이미지 사용 + 색상 틴트 적용 + 화면 오버레이
                    console.log('🎛️ Using standard controller single image with color tint + screen overlay');
                    controlImage = await Jimp.read(CONTROL_PANEL_PATH);
                    applyColorTint(controlImage, targetColor);

                    // 화면 오버레이 (색상 유지)
                    if (existsSync(SCREEN_PATH)) {
                        const screenImage = await Jimp.read(SCREEN_PATH);
                        const config = SCREEN_CONFIG.standard;
                        const newWidth = Math.round(screenImage.bitmap.width * config.scaleX);
                        const newHeight = Math.round(screenImage.bitmap.height * config.scaleY);
                        screenImage.resize(newWidth, newHeight);
                        controlImage.composite(screenImage, config.x, config.y);
                        console.log('📺 Screen overlay applied for standard controller');
                    }
                }
            }

            // 리사이즈 및 합성
            const isBarrierFree = controllerType === 'barrier-free';
            let finalControllerWidth, finalControllerHeight;
            let xOffset = 0;
            let yOffset = 0;

            if (isBarrierFree) {
                // 배리어프리: 셀 공간 안에서 배치
                const cellWidth = CONTROL_PANEL_WIDTH;        // 150px
                const cellHeight = BARRIER_FREE_CELL_HEIGHT;  // 410px
                const paddingRight = 8; // 우측 여백

                // 기본 크기 계산 후 높이 +20%, 너비 -20% 적용
                let baseWidth = cellWidth - paddingRight;
                let baseHeight = Math.round(baseWidth / BARRIER_FREE_ORIGINAL_RATIO);

                // 높이 +20%, 너비 -20% 적용
                let imgWidth = Math.round(baseWidth * 0.8);   // 너비 20% 축소
                let imgHeight = Math.round(baseHeight * 1.2); // 높이 20% 증가

                // 높이가 셀을 초과하면 제한
                if (imgHeight > cellHeight) {
                    imgHeight = cellHeight;
                }

                finalControllerWidth = imgWidth;
                finalControllerHeight = imgHeight;
                controlImage.resize(finalControllerWidth, finalControllerHeight);

                // 우측 정렬 (우측에 약간의 여백만) + 아래로 2px
                xOffset = cellWidth - imgWidth - paddingRight;
                yOffset = Math.round((cellHeight - imgHeight) / 2) + 2;

                console.log(`📐 Barrier-free: cell=${cellWidth}x${cellHeight}, img=${imgWidth}x${imgHeight}, offset=(${xOffset},${yOffset})`);
            } else {
                // 일반형: 크기 2px 축소, 아래로 2px
                finalControllerWidth = CONTROL_PANEL_WIDTH - 2;
                finalControllerHeight = CONTROL_PANEL_HEIGHT - 2;
                controlImage.resize(finalControllerWidth, finalControllerHeight);
                yOffset = 2;
            }

            image.composite(controlImage, pcPos.x + xOffset, pcPos.y + yOffset);

            // 듀얼컨트롤러: barrier_free.png 하단 아래에 배치
            if (isBarrierFree && dualController && existsSync(DUAL_PATH)) {
                const dualImage = await Jimp.read(DUAL_PATH);
                const dualConfig = DUAL_CONFIG['barrier-free'];

                // dual.png 크기
                const dualWidth = Math.round(dualImage.bitmap.width * dualConfig.scale);
                const dualHeight = Math.round(dualImage.bitmap.height * dualConfig.scale);
                dualImage.resize(dualWidth, dualHeight);

                // barrier_free.png 하단 아래에 배치 (우측 정렬)
                const dualX = pcPos.x + xOffset + finalControllerWidth - dualWidth - dualConfig.offsetX;
                const dualY = pcPos.y + yOffset + finalControllerHeight + dualConfig.offsetY;

                image.composite(dualImage, dualX, dualY);
                console.log(`🎮 Dual controller: pos=(${dualX},${dualY}), size=${dualWidth}x${dualHeight}`);
            }

            // Draw left border of controller (grid line is covered by controller image)
            // 배리어프리의 경우 셀 공간 전체에 대해 border 그리기
            const borderHeight = isBarrierFree ? BARRIER_FREE_CELL_HEIGHT : finalControllerHeight;
            for (let y = 0; y < borderHeight; y++) {
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
