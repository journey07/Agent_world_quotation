// Korean Pricing Table Data
const PRICING = {
    // Controller prices by type (제어부 타입별 가격)
    controllerPrices: {
        standard: 1800000,      // 일반
        qr: 1200000,            // QR
        'barrier-free': 2500000 // 배리어프리
    },

    // Control panel prices by tier count (함체부 단수별 가격 - 손잡이 없음)
    controlPanelTiers: {
        1: 320000,
        2: 370000,
        3: 430000,
        4: 480000,
        5: 530000,
        6: 580000,
        7: 660000,
        8: 710000,
        9: 760000,
        10: 810000
    },

    // Control panel prices with handle (함체부 단수별 가격 - 손잡이 있음)
    controlPanelTiersWithHandle: {
        1: 360000,
        2: 410000,
        3: 480000,
        4: 560000,
        5: 630000,
        6: 700000,
        7: 800000,
        8: 860000,
        9: 930000,
        10: 1000000
    },

    // Options (옵션가격)
    options: {
        dualController: 200000,    // 듀얼컨트롤러
        acrylic: 10000,            // 아크릴 (함 당)
        perforation: 8000,         // 타공 디자인 (셀당)
        frameFullSet: 350000,      // 프레임 풀세트
        topFrameOnly: 150000,      // 상부 프레임만
        sideFrameOnly: 200000      // 사이드 프레임만
    },

    // Regional installation costs (지역별 설치운반비)
    regions: {
        seoul: 550000,          // 서울
        gyeonggi: 550000,       // 경기
        incheon: 550000,        // 인천
        chungcheong: 750000,    // 충청
        gangwon: 750000,        // 강원
        jeolla: 850000,         // 전라도
        gyeongsangbuk: 850000,  // 경상북도
        gyeongsangnam: 950000,  // 경상남도
        jeju: 1050000           // 제주도
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
    controlPanelColumn = 1, // 제어부 열 위치 (1-based)
    columnConfigs = null, // 열별 설정 [{ tiers, tierConfig }, ...]
    options = {},
    region = 'seoul'
}) {
    // Calculate total cells (열별 설정 지원)
    let regularCells = 0;
    let maxTiers = tiers; // 함체부 가격 계산용 최대 단수

    if (columnConfigs && Array.isArray(columnConfigs)) {
        // 열별 설정이 있는 경우
        for (let i = 0; i < columns; i++) {
            const isControlPanel = (i + 1) === controlPanelColumn;
            if (isControlPanel) {
                continue; // 제어부 열은 별도 계산
            }
            const colTiers = columnConfigs[i]?.tiers || tiers;
            regularCells += colTiers;
            maxTiers = Math.max(maxTiers, colTiers);
        }
    } else {
        // 기존 방식: 제어부 제외한 모든 열이 동일 단수
        const regularColumns = Math.max(0, columns - 1);
        regularCells = regularColumns * tiers;
        maxTiers = tiers;
    }

    const controlPanelCells = controlPanelTiers; // 제어부 열의 칸 수
    const cellsPerUnit = regularCells + controlPanelCells;
    const totalCells = cellsPerUnit * quantity;

    // 1. Base price (제어부 타입별 가격)
    const controllerType = options.controllerType || 'standard';
    const basePrice = PRICING.controllerPrices[controllerType] || PRICING.controllerPrices.standard;

    // 2. Control panel tier cost (함체부 가격 - 단수별 그룹화)
    // 손잡이 옵션에 따라 가격표 선택
    const baseTierPriceTable = options.handle
        ? PRICING.controlPanelTiersWithHandle
        : PRICING.controlPanelTiers;

    // 타공디자인 선택 시 함체부 단가 10% 증가
    const perforationMultiplier = options.perforation ? 1.1 : 1;

    // 열별로 단수를 집계하여 그룹화
    const bodyColumns = Math.max(0, columns - 1);
    const tierGroups = {};

    for (let i = 0; i < columns; i++) {
        if ((i + 1) === controlPanelColumn) continue; // 제어부 열 제외
        const colTiers = columnConfigs?.[i]?.tiers || tiers;
        tierGroups[colTiers] = (tierGroups[colTiers] || 0) + 1;
    }

    // 그룹화된 함체부 breakdown 생성
    const lockerBodiesBreakdown = Object.entries(tierGroups)
        .map(([t, cols]) => {
            const baseUnitCost = baseTierPriceTable[t] || 0;
            const unitCost = Math.round(baseUnitCost * perforationMultiplier);
            return {
                tiers: Number(t),
                columns: cols,
                unitCost,
                totalCost: cols * unitCost
            };
        })
        .sort((a, b) => a.tiers - b.tiers); // 단수 오름차순 정렬

    // 총 함체부 비용
    const lockerBodyCost = lockerBodiesBreakdown.reduce((sum, g) => sum + g.totalCost, 0);
    const baseUnitBodyCost = baseTierPriceTable[maxTiers] || 0;
    const unitBodyCost = Math.round(baseUnitBodyCost * perforationMultiplier); // 하위 호환용

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
            lockerBodyLabel: `함체부 ${tiers}단 x ${bodyColumns}열`, // 하위 호환용
            lockerBodiesBreakdown, // 단수별 그룹화 배열
            lockerBodyCost, // 총 함체부 비용
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
        seoul: '서울시',
        gyeonggi: '경기도',
        incheon: '인천시',
        chungcheong: '충청도',
        gangwon: '강원도',
        jeolla: '전라도',
        gyeongsangbuk: '경상북도',
        gyeongsangnam: '경상남도',
        jeju: '제주도'
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
