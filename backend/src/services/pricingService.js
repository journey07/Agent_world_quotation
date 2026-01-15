// Korean Pricing Table Data
const PRICING = {
    // Base price per control panel unit (제어부 기본가)
    basePrice: 1850000,

    // Control panel prices by tier count (제어부 단수별 가격)
    controlPanelTiers: {
        1: 320000,
        2: 321000,
        3: 384000,
        4: 408000,
        5: 429000,
        6: 456000,
        7: 480000,
        8: 503000,
        9: 527000,
        10: 552000
    },

    // Options (옵션가격)
    options: {
        dualController: 200000,    // 듀얼컨트롤러
        acrylic: 6000,            // 아크릴
        frameFullSet: 700000,      // 프레임 풀세트
        topFrameOnly: 350000,      // 상부 프레임만
        sideFrameOnly: 300000      // 사이드 프레임만
    },

    // Regional installation costs (지역별 설치운반비)
    regions: {
        seoul: 500000,      // 서울
        gyeonggi: 500000,   // 경기
        incheon: 500000,    // 인천
        chungcheong: 650000, // 충청
        gangwon: 650000,    // 강원
        jeolla: 750000,     // 전라
        gyeongsang: 750000, // 경상
        jeju: 1100000       // 제주
    }
};

/**
 * Calculate quote based on locker configuration with Korean pricing
 * @param {Object} config - Locker configuration
 * @param {number} config.columns - Number of columns (열)
 * @param {number} config.tiers - Number of tiers per column (단)
 * @param {number} config.quantity - Number of locker sets
 * @param {number} config.controlPanelTiers - Control panel tier count (제어부 단수)
 * @param {Object} config.options - Selected options
 * @param {boolean} config.options.dualController - Dual controller option
 * @param {boolean} config.options.acrylic - Acrylic option
 * @param {string} config.options.frameType - Frame type: 'none', 'fullSet', 'topOnly', 'sideOnly', 'topAndSide'
 * @param {string} config.region - Installation region
 * @returns {Object} Price breakdown
 */
export function calculateQuote({
    columns,
    tiers,
    quantity = 1,
    controlPanelTiers = 4,
    options = {},
    region = 'seoul'
}) {
    // Calculate total cells
    // 제어부가 있는 열은 제어부 단수로 계산, 나머지 열은 전체 단수로 계산
    const regularColumns = Math.max(0, columns - 1); // 제어부를 제외한 일반 열 수
    const regularCells = regularColumns * tiers; // 일반 열의 칸 수
    const controlPanelCells = controlPanelTiers; // 제어부 열의 칸 수 (제어부 단수만큼)
    const cellsPerUnit = regularCells + controlPanelCells;
    const totalCells = cellsPerUnit * quantity;

    // 1. Base price (제어부 기본가)
    const basePrice = PRICING.basePrice;

    // 2. Control panel tier cost (now Locker Body Cost based on total tiers)
    // "함체부" cost depends on the total height (tiers) and number of expansion columns
    // (Total columns - 1 Control Panel column)
    const bodyColumns = Math.max(0, columns - 1);
    const unitBodyCost = PRICING.controlPanelTiers[tiers] || 0;
    const lockerBodyCost = bodyColumns * unitBodyCost;

    // 3. Options cost
    let optionsCost = 0;
    const optionsBreakdown = [];

    // Frame options
    const frameType = options.frameType || 'none';
    if (frameType === 'fullSet') {
        optionsCost += PRICING.options.frameFullSet;
        optionsBreakdown.push({ name: '프레임 풀세트', price: PRICING.options.frameFullSet });
    } else if (frameType === 'topOnly') {
        optionsCost += PRICING.options.topFrameOnly;
        optionsBreakdown.push({ name: '상부 프레임만', price: PRICING.options.topFrameOnly });
    } else if (frameType === 'sideOnly') {
        optionsCost += PRICING.options.sideFrameOnly;
        optionsBreakdown.push({ name: '사이드 프레임만', price: PRICING.options.sideFrameOnly });
    } else if (frameType === 'topAndSide') {
        const topAndSideCost = PRICING.options.topFrameOnly + PRICING.options.sideFrameOnly;
        optionsCost += topAndSideCost;
        optionsBreakdown.push({ name: '상부 + 사이드 프레임', price: topAndSideCost });
    }

    if (options.dualController) {
        optionsCost += PRICING.options.dualController;
        optionsBreakdown.push({ name: '듀얼컨트롤러', price: PRICING.options.dualController });
    }

    if (options.acrylic) {
        const acrylicUnitPrice = PRICING.options.acrylic;
        const acrylicQuantity = totalCells;
        const acrylicCost = acrylicUnitPrice * acrylicQuantity;
        optionsCost += acrylicCost;
        optionsBreakdown.push({
            name: '아크릴 도어',
            quantity: acrylicQuantity,
            unitPrice: acrylicUnitPrice,
            price: acrylicCost
        });
    }

    // 4. Regional installation cost (설치운반비)
    const installationCost = PRICING.regions[region] || PRICING.regions.seoul;

    // 5. Subtotal for one unit (설치운반비 제외)
    const subtotalPerUnit = basePrice + lockerBodyCost + optionsCost;

    // 6. Total for quantity (설치운반비는 마지막에 한 번만 추가)
    const total = (subtotalPerUnit * quantity) + installationCost;

    return {
        input: {
            columns,
            tiers,
            quantity,
            controlPanelTiers,
            options,
            region,
            cellsPerUnit,
            totalCells
        },
        breakdown: {
            basePrice,
            lockerBodyLabel: `함체부 ${tiers}단 x ${bodyColumns}열`, // Renamed from controlPanelTierLabel
            lockerBodyCost, // Renamed from controlPanelCost
            unitBodyCost,
            bodyColumns,
            optionsCost,
            optionsBreakdown,
            installationCost,
            regionLabel: getRegionLabel(region),
            subtotalPerUnit,
            quantity,
            total
        },
        summary: {
            subtotal: subtotalPerUnit,
            quantity,
            total
        }
    };
}

function getRegionLabel(region) {
    const labels = {
        seoul: '서울',
        gyeonggi: '경기',
        incheon: '인천',
        chungcheong: '충청',
        gangwon: '강원',
        jeolla: '전라',
        gyeongsang: '경상',
        jeju: '제주'
    };
    return labels[region] || region;
}

export function getCompanyInfo() {
    return {
        name: '보관함 제조',
        phone: '02-1234-5678',
        email: 'info@locker.com'
    };
}

export function getTerms() {
    return [
        '견적 가격은 VAT 별도입니다.',
        '설치 조건에 따라 추가 비용이 발생할 수 있습니다.',
        '견적 유효기간: 발행일로부터 30일'
    ];
}
