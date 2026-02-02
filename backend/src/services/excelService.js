import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import Jimp from 'jimp';
import { getCompanyInfo, getTerms } from './pricingService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_PATH = join(__dirname, '../../assets');
const LOGO_PATH = join(ASSETS_PATH, 'world_logo.png');
const STAMP_PATH = join(ASSETS_PATH, 'stamp.png');

/**
 * Generate quotation number (WL-YYYYMMDD-XXX)
 */
function generateQuotationNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `WL-${year}${month}${day}-${random}`;
}

/**
 * Convert number to Korean text
 * Example: 20779000 -> "이천칠십일만구천원정"
 */
function convertToKoreanNumber(amount) {
    if (amount === 0) return '영원정';

    const units = ['', '만', '억', '조'];
    const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
    const tenUnits = ['', '십', '백', '천'];

    // Remove decimals and convert to integer
    amount = Math.floor(amount);

    // Split into groups of 4 digits
    const groups = [];
    let temp = amount;
    while (temp > 0) {
        groups.push(temp % 10000);
        temp = Math.floor(temp / 10000);
    }

    let result = '';

    for (let i = groups.length - 1; i >= 0; i--) {
        const group = groups[i];
        if (group === 0) continue;

        let groupText = '';
        const groupDigits = [
            Math.floor(group / 1000),
            Math.floor((group % 1000) / 100),
            Math.floor((group % 100) / 10),
            group % 10
        ];

        for (let j = 0; j < 4; j++) {
            const digit = groupDigits[j];
            if (digit === 0) continue;

            // For 십, 백, 천: don't write "일" if digit is 1
            if (digit === 1 && j < 3) {
                groupText += tenUnits[3 - j];
            } else {
                groupText += digits[digit] + tenUnits[3 - j];
            }
        }

        result += groupText + units[i];
    }

    return result + '원정';
}

/**
 * Get dotted border style
 */
function getDottedBorder() {
    return {
        top: { style: 'dotted', color: { argb: 'FF000000' } },
        left: { style: 'dotted', color: { argb: 'FF000000' } },
        bottom: { style: 'dotted', color: { argb: 'FF000000' } },
        right: { style: 'dotted', color: { argb: 'FF000000' } }
    };
}

/**
 * Get gray header fill (#D3D3D3)
 */
function getGrayHeaderFill() {
    return {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
    };
}

/**
 * Get blue header fill (#4A6FA5)
 */
function getBlueHeaderFill() {
    return {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4A6FA5' }
    };
}

/**
 * Get light gray fill for total row (#E8E8E8)
 */
function getLightGrayFill() {
    return {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8E8E8' }
    };
}

/**
 * Generate Excel quote document with Korean manufacturing standard format
 * @param {Object} quoteData - Quote calculation result
 * @param {string} previewImageBase64 - 2D preview image (base64)
 * @param {string} generatedImageBase64 - 3D installation image (base64)
 * @param {Object} customerInfo - Customer information
 * @returns {Promise<Buffer>} Excel buffer
 */
export async function generateQuoteExcel(quoteData, previewImageBase64, generatedImageBase64, customerInfo = {}) {
    const workbook = new ExcelJS.Workbook();
    const companyInfo = getCompanyInfo();

    // Set workbook properties
    workbook.creator = companyInfo.name;
    workbook.created = new Date();
    workbook.modified = new Date();

    const currentDate = new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Create Cover Sheet
    await createCoverSheet(workbook, quoteData, generatedImageBase64 || previewImageBase64, customerInfo, currentDate);

    // Create Detail Sheet
    await createDetailSheet(workbook, quoteData, previewImageBase64, customerInfo, currentDate);

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
}

/**
 * Create Cover Sheet with customer info and 3D image
 */
async function createCoverSheet(workbook, quoteData, imageBase64, customerInfo, currentDate) {
    const sheet = workbook.addWorksheet('표지', {
        pageSetup: {
            paperSize: 9, // A4
            orientation: 'portrait',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 1, // 한 페이지에 맞추기
            horizontalCentered: true, // 인쇄 시 가로 중앙 정렬
            margins: {
                left: 0.3, right: 0.3,
                top: 0.3, bottom: 0.5,
                header: 0.2, footer: 0.3
            }
        },
        headerFooter: {
            oddFooter: '&C&"맑은 고딕,Bold"&11&K1E3A5FWORLD LOCKER | 월드락커'
        }
    });

    // Set column widths (A~H 균등하게 - 상세견적서와 총 너비 동일하게 104)
    const colWidth = 13; // 104 / 8 = 13
    sheet.columns = [
        { width: colWidth },  // A
        { width: colWidth },  // B
        { width: colWidth },  // C
        { width: colWidth },  // D
        { width: colWidth },  // E
        { width: colWidth },  // F
        { width: colWidth },  // G
        { width: colWidth },  // H
    ];

    const { input } = quoteData;
    let rowIndex = 1;

    // ===== SECTION 1: Header with Logo (좌측 상단) =====
    // 로고를 좌측 상단에 배치
    if (fs.existsSync(LOGO_PATH)) {
        try {
            // 로고 원본 비율 확인
            const logoBuffer = fs.readFileSync(LOGO_PATH);
            const logoImage = await Jimp.read(logoBuffer);
            const logoAspect = logoImage.bitmap.width / logoImage.bitmap.height;

            const logoId = workbook.addImage({
                filename: LOGO_PATH,
                extension: 'png',
            });

            // 로고 크기: 너비 120pt, 높이는 비율에 맞게
            const logoWidth = 120;
            const logoHeight = logoWidth / logoAspect;

            // 좌측 상단 배치 (A열 시작, 약간의 여백)
            sheet.addImage(logoId, {
                tl: { col: 0.3, row: rowIndex },
                ext: { width: logoWidth, height: logoHeight }
            });
        } catch (err) {
            console.error('Logo error:', err);
        }
    }

    // 로고 공간 확보 (4행)
    for (let i = rowIndex; i <= rowIndex + 3; i++) {
        sheet.getRow(i).height = 18;
    }
    rowIndex += 4;

    // 추가 여백 (로고와 겹치지 않게 2행 추가)
    rowIndex += 2;

    // ===== SECTION 2: Title (세련된 디자인) =====
    // 상단 구분선
    sheet.mergeCells(`B${rowIndex}:G${rowIndex}`);
    const topDivider = sheet.getCell(`B${rowIndex}`);
    topDivider.border = {
        bottom: { style: 'medium', color: { argb: 'FF1E3A5F' } }
    };
    sheet.getRow(rowIndex).height = 8;
    rowIndex++;

    // 타이틀 "견 적 서"
    rowIndex++;
    sheet.mergeCells(`A${rowIndex}:H${rowIndex}`);
    const titleCell = sheet.getCell(`A${rowIndex}`);
    titleCell.value = '견  적  서';
    titleCell.font = { name: 'Malgun Gothic', size: 42, bold: true, color: { argb: 'FF1E3A5F' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(rowIndex).height = 65;
    rowIndex++;

    // 하단 구분선
    sheet.mergeCells(`B${rowIndex}:G${rowIndex}`);
    const bottomDivider = sheet.getCell(`B${rowIndex}`);
    bottomDivider.border = {
        top: { style: 'medium', color: { argb: 'FF1E3A5F' } }
    };
    sheet.getRow(rowIndex).height = 8;
    rowIndex += 2;

    // ===== SECTION 3: Product Info (제품명 + 수신자) =====
    // 제품명 (세트 수 기반)
    sheet.mergeCells(`A${rowIndex}:H${rowIndex}`);
    const productCell = sheet.getCell(`A${rowIndex}`);
    const frameText = input.options?.frameText || '물품보관함';
    const setCount = input.sets || 1;
    productCell.value = `${frameText} ${setCount}세트`;
    productCell.font = { name: 'Malgun Gothic', size: 22, bold: true, color: { argb: 'FF333333' } };
    productCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(rowIndex).height = 40;
    rowIndex++;

    // 수신자 (귀하 추가)
    sheet.mergeCells(`A${rowIndex}:H${rowIndex}`);
    const recipientCell = sheet.getCell(`A${rowIndex}`);
    const companyName = customerInfo.companyName || '';
    recipientCell.value = `수신: ${companyName} 귀하`;
    recipientCell.font = { name: 'Malgun Gothic', size: 16, color: { argb: 'FF666666' } };
    recipientCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(rowIndex).height = 30;
    rowIndex += 2;

    // ===== SECTION 4: 3D Image (시트 중앙 정렬) =====
    if (imageBase64) {
        try {
            // 원본 이미지 로드
            const imageBuffer = Buffer.from(imageBase64, 'base64');
            const image = await Jimp.read(imageBuffer);
            const imgWidth = image.bitmap.width;
            const imgHeight = image.bitmap.height;

            // 시트 전체 너비 계산 (8열 × 13너비 × 7.5px/단위 ≈ 780px)
            const sheetWidthPx = 8 * colWidth * 7.5;

            // 이미지 크기: 시트 너비의 75%로 리사이즈
            const targetWidth = Math.floor(sheetWidthPx * 0.75);
            const targetHeight = Math.floor(targetWidth * (imgHeight / imgWidth));

            // 이미지 리사이즈
            image.resize(targetWidth, targetHeight);

            // 이미지를 base64로 변환
            const resizedImageBase64 = await image.getBase64Async(Jimp.MIME_PNG);
            const base64Data = resizedImageBase64.replace(/^data:image\/png;base64,/, '');

            const imageId = workbook.addImage({
                base64: base64Data,
                extension: 'png',
            });

            // 시트 중앙에 배치: col 오프셋 계산
            // 시트 너비 = 8열, 이미지 너비 = targetWidth px
            // 엑셀 열 너비 1 = 약 7.5 픽셀 (ExcelJS 실제 렌더링 기준)
            const pxPerCol = colWidth * 7.5;
            const imageColSpan = targetWidth / pxPerCol; // 이미지가 차지하는 열 수
            const startCol = (8 - imageColSpan) / 2; // 중앙 시작 열

            sheet.addImage(imageId, {
                tl: { col: startCol, row: rowIndex },
                ext: { width: targetWidth, height: targetHeight }
            });

            console.log('Cover 3D Image: centered at col', startCol.toFixed(2),
                'size:', targetWidth, 'x', targetHeight);

            // 이미지 공간 확보
            const imageRowSpan = Math.ceil(targetHeight / 15);
            for (let i = rowIndex; i < rowIndex + imageRowSpan; i++) {
                sheet.getRow(i).height = 18;
            }
            rowIndex += imageRowSpan;

        } catch (err) {
            console.error('Error adding cover 3D image:', err);
            // Fallback: 시트 중앙에 배치
            const imageId = workbook.addImage({
                base64: imageBase64,
                extension: 'png',
            });

            // Fallback도 중앙 정렬 (이미지 너비 500px 가정)
            const fallbackWidth = 500;
            const fallbackHeight = 375;
            const colWidthPx = colWidth * 7.5;
            const fallbackColSpan = fallbackWidth / colWidthPx;
            const startCol = (8 - fallbackColSpan) / 2;

            sheet.addImage(imageId, {
                tl: { col: startCol, row: rowIndex },
                ext: { width: fallbackWidth, height: fallbackHeight }
            });

            const fallbackRowSpan = Math.ceil(fallbackHeight / 15);
            for (let i = rowIndex; i < rowIndex + fallbackRowSpan; i++) {
                sheet.getRow(i).height = 18;
            }
            rowIndex += fallbackRowSpan;
        }
    }

    // Footer는 pageSetup.headerFooter로 고정 출력됨
}

/**
 * Create Detail Sheet with itemized pricing (NEW 8-COLUMN FORMAT)
 */
async function createDetailSheet(workbook, quoteData, previewImageBase64, customerInfo, currentDate) {
    const sheet = workbook.addWorksheet('상세견적서', {
        pageSetup: {
            paperSize: 9, // A4
            orientation: 'portrait',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 1, // 무조건 1페이지에 맞춤
            horizontalCentered: true, // 인쇄 시 가로 중앙 정렬
            margins: {
                left: 0.3, right: 0.3,
                top: 0.3, bottom: 0.5,
                header: 0.2, footer: 0.3
            }
        },
        headerFooter: {
            oddFooter: '&C&"맑은 고딕,Bold"&11&K1E3A5FWORLD LOCKER | 월드락커'
        }
    });

    // Set column widths (8 columns - 정보박스 + 테이블 겸용)
    sheet.columns = [
        { width: 14 },    // A (품명 / 좌측 라벨)
        { width: 26.4 },  // B (사양 / 좌측 값) - 10% 증가
        { width: 8 },     // C (색상 / 빈 컬럼)
        { width: 8 },     // D (단위 / 우측 시작)
        { width: 8 },     // E (수량)
        { width: 12 },    // F (단가)
        { width: 14 },    // G (금액)
        { width: 16 },    // H (비고)
    ];

    const { input, breakdown } = quoteData;
    let rowIndex = 1;

    // ===== SECTION 1: Clean Title Header =====
    // 상단 여백
    sheet.getRow(rowIndex).height = 8;
    rowIndex++;

    // 타이틀 (심플하게)
    sheet.mergeCells(`A${rowIndex}:H${rowIndex}`);
    const titleCell = sheet.getCell(`A${rowIndex}`);
    titleCell.value = '상 세 견 적 서';
    titleCell.font = { name: 'Malgun Gothic', size: 24, bold: true, color: { argb: 'FF1E3A5F' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(rowIndex).height = 40;
    rowIndex++;

    // 타이틀 하단 구분선
    sheet.mergeCells(`A${rowIndex}:H${rowIndex}`);
    const titleDivider = sheet.getCell(`A${rowIndex}`);
    titleDivider.border = { bottom: { style: 'medium', color: { argb: 'FF1E3A5F' } } };
    sheet.getRow(rowIndex).height = 5;
    rowIndex += 2;

    // ===== SECTION 2: Info Boxes (좌측 3열 + 빈 컬럼 + 우측 3열) =====
    const infoStartRow = rowIndex;

    // Format current date in Korean
    const dateObj = new Date();
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const formattedDate = `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일 (${weekdays[dateObj.getDay()]})`;

    // 좌측 정보 (A-B열, C는 빈 컬럼)
    const leftInfoItems = [
        { label: '견 적 일 자', value: formattedDate },
        { label: '현  장  명', value: customerInfo.companyName || '귀하' },
        { label: '수  신  인', value: customerInfo.contactName || '담당자님' },
        { label: '견 적 품 목', value: `전자식 ${input.options?.frameText || '물품보관함'}` },
        { label: '유 효 기 간', value: '1년' }
    ];

    // 우측 정보 (D-E열)
    const rightInfoItems = [
        { label: '', value: '주식회사 월드락커', bold: true, size: 11 },
        { label: '', value: '대표이사 권 필 목', size: 10 },
        { label: '', value: '인천광역시 남동구 은봉로 52', size: 9 },
        { label: '', value: 'TEL: 032-819-2750 / FAX: 032-819-2759', size: 9 },
        { label: '', value: '기술영업부 권인전 (010-8930-2759)', size: 9 }
    ];

    // 테두리 스타일 (얇은 실선)
    const thinBorder = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
    };

    // 로고 추가 (F-H열 우측 상단)
    if (fs.existsSync(LOGO_PATH)) {
        try {
            const logoBuffer = fs.readFileSync(LOGO_PATH);
            const logoImage = await Jimp.read(logoBuffer);
            const logoAspect = logoImage.bitmap.width / logoImage.bitmap.height;

            // 높이 고정 (40) -> 너비 자동 계산
            const logoHeight = 40;
            const logoWidth = logoHeight * logoAspect;

            const logoId = workbook.addImage({
                filename: LOGO_PATH,
                extension: 'png',
            });

            // 위치 조정: 우측 끝으로 이동 (col 7.3)
            sheet.addImage(logoId, {
                tl: { col: 7.3, row: infoStartRow - 0.3 },
                ext: { width: logoWidth, height: logoHeight }
            });
        } catch (err) {
            console.error('Logo add error (Detail):', err);
        }
    }

    // 좌측 + 우측 정보 동시 작성
    for (let i = 0; i < 5; i++) {
        const row = infoStartRow + i;
        const leftItem = leftInfoItems[i];
        const rightItem = rightInfoItems[i];

        // --- 좌측 정보 ---
        // 라벨 (A열)
        const leftLabelCell = sheet.getCell(`A${row}`);
        leftLabelCell.value = leftItem.label + ':';
        leftLabelCell.font = { name: 'Malgun Gothic', size: 9, color: { argb: 'FF666666' } };
        leftLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };
        leftLabelCell.border = thinBorder;

        // 값 (B열)
        const leftValueCell = sheet.getCell(`B${row}`);
        leftValueCell.value = leftItem.value;
        leftValueCell.font = { name: 'Malgun Gothic', size: 9, bold: true };
        leftValueCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        leftValueCell.border = thinBorder;

        // --- 빈 컬럼 (C, D, E열) ---
        ['C', 'D', 'E'].forEach(col => {
            const gapCell = sheet.getCell(`${col}${row}`);
            gapCell.value = '';
        });

        // --- 우측 정보 ---
        // F-H열 병합 (3개 컬럼) + 좌측 정렬
        sheet.mergeCells(`F${row}:H${row}`);
        const rightCell = sheet.getCell(`F${row}`);
        rightCell.value = rightItem.value;
        rightCell.font = {
            name: 'Malgun Gothic',
            size: rightItem.size || 9,
            bold: rightItem.bold || false,
            color: { argb: rightItem.bold ? 'FF1E3A5F' : 'FF333333' }
        };
        rightCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        rightCell.border = thinBorder; // 병합된 첫 셀에 테두리 적용

        // 병합된 나머지 셀에도 테두리 적용 (ExcelJS 특성상 필요할 수 있음)
        sheet.getCell(`G${row}`).border = thinBorder;
        sheet.getCell(`H${row}`).border = thinBorder;

        sheet.getRow(row).height = 20;
    }

    // 인감 도장 추가 (우측 상단, H열 쪽)
    if (fs.existsSync(STAMP_PATH)) {
        const stampId = workbook.addImage({
            filename: STAMP_PATH,
            extension: 'png',
        });
        // 위치 조정 (기존 col 7 -> 7.1)
        sheet.addImage(stampId, {
            tl: { col: 7.1, row: infoStartRow - 0.2 },
            ext: { width: 35, height: 35 }
        });
    }

    rowIndex = infoStartRow + 6;

    // ===== SECTION 4: Total Amount Section (깔끔한 디자인) =====
    const totalAmount = quoteData.summary.total;
    const koreanAmount = convertToKoreanNumber(totalAmount);

    // 총액 배경 (전체 행)
    sheet.mergeCells(`A${rowIndex}:H${rowIndex}`);
    const amountTextCell = sheet.getCell(`A${rowIndex}`);
    amountTextCell.value = `총 견적금액:  일금 ${koreanAmount} (₩${totalAmount.toLocaleString('ko-KR')}원)  [VAT 포함]`;
    amountTextCell.font = { name: 'Malgun Gothic', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    amountTextCell.fill = getBlueHeaderFill();
    amountTextCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(rowIndex).height = 35;
    rowIndex += 2;

    // ===== SECTION 5: Table Header (단일 행, 깔끔하게) =====
    const headerRow = rowIndex;

    // 테이블 헤더 정의 (A-B 병합, C 빈칸 사용 안함)
    const tableHeaders = [
        { cols: 'A:B', label: '품명 / 사양', width: 2 },
        { cols: 'C', label: '색상', width: 1 },
        { cols: 'D', label: '단위', width: 1 },
        { cols: 'E', label: '수량', width: 1 },
        { cols: 'F', label: '단가', width: 1 },
        { cols: 'G', label: '금액', width: 1 },
        { cols: 'H', label: '비고', width: 1 }
    ];

    // 헤더 스타일
    const headerBorder = {
        top: { style: 'thin', color: { argb: 'FF1E3A5F' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FF1E3A5F' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
    };

    // A-B 병합 (품명/사양)
    sheet.mergeCells(`A${headerRow}:B${headerRow}`);
    const headerAB = sheet.getCell(`A${headerRow}`);
    headerAB.value = '품명 / 사양';
    headerAB.font = { name: 'Malgun Gothic', size: 10, bold: true, color: { argb: 'FF1E3A5F' } };
    headerAB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
    headerAB.alignment = { horizontal: 'center', vertical: 'middle' };
    headerAB.border = headerBorder;
    sheet.getCell(`B${headerRow}`).border = headerBorder;

    // 나머지 헤더 (C~H)
    const singleHeaders = [
        { col: 'C', label: '색상' },
        { col: 'D', label: '단위' },
        { col: 'E', label: '수량' },
        { col: 'F', label: '단가' },
        { col: 'G', label: '금액' },
        { col: 'H', label: '비고' }
    ];

    singleHeaders.forEach(h => {
        const cell = sheet.getCell(`${h.col}${headerRow}`);
        cell.value = h.label;
        cell.font = { name: 'Malgun Gothic', size: 10, bold: true, color: { argb: 'FF1E3A5F' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = headerBorder;
    });

    sheet.getRow(headerRow).height = 28;
    rowIndex++;

    // ===== SECTION 6: Table Data Rows (Dotted Border) =====
    // Build detailed price items with 8-column structure
    const priceItems = [];

    // 1. Control Unit (제어부 - 웹방식)
    const controlSpec = [
        '▸ W500mm × D600mm × H300mm',
        '▸ 웹 연동방식 산업용 PC',
        '▸ 카드 리더기 포함'
    ].join('\n');

    priceItems.push({
        name: '제어부\n(웹방식)',
        spec: controlSpec,
        color: '백색',
        unit: 'SET',
        qty: 1,
        unitPrice: breakdown.basePrice,
        amount: breakdown.basePrice,
        remark: '산업용 PC',
        isControlItem: true // 제어부 마킹
    });

    // 2. Locker Body (본체부) - 단수별 그룹화
    if (breakdown.lockerBodiesBreakdown && breakdown.lockerBodiesBreakdown.length > 0) {
        // 단수별 분리 표시
        breakdown.lockerBodiesBreakdown.forEach((body) => {
            const bodySpec = [
                `▸ W500mm × D600mm × H${body.tiers * 480}mm`,
                `▸ 1열${body.tiers}단 (비균등)`,
                '▸ 국산 고급형'
            ].join('\n');

            priceItems.push({
                name: `본체부\n(1열${body.tiers}단형)`,
                spec: bodySpec,
                color: '백색',
                unit: '열',
                qty: body.columns,
                unitPrice: body.unitCost,
                amount: body.totalCost,
                remark: '냉연강판',
                isBodyItem: true // 함체부 마킹
            });
        });
    } else {
        // 하위 호환: 기존 단일 항목 방식
        const bodySpec = [
            `▸ W500mm × D600mm × H${input.tiers * 480}mm`,
            `▸ 1열${input.tiers}단 (비균등)`,
            '▸ 국산 고급형'
        ].join('\n');

        priceItems.push({
            name: '본체부\n(1열' + input.tiers + '단형)',
            spec: bodySpec,
            color: '백색',
            unit: '열',
            qty: breakdown.bodyColumns,
            unitPrice: breakdown.unitBodyCost,
            amount: breakdown.lockerBodyCost,
            remark: '냉연강판',
            isBodyItem: true
        });
    }

    // 3. Program
    priceItems.push({
        name: '프로그램',
        spec: '▸ 웹 기반 관리 시스템\n▸ 사용자 인터페이스',
        color: '-',
        unit: 'SET',
        qty: 1,
        unitPrice: 0,
        amount: 0,
        remark: '제어부 포함'
    });

    // 4. Options
    if (breakdown.optionsBreakdown && breakdown.optionsBreakdown.length > 0) {
        breakdown.optionsBreakdown.forEach(opt => {
            let spec = '-';
            let unit = 'EA';
            let qty = opt.quantity || 1;
            let remark = '';

            // Determine spec and unit based on option type
            if (opt.name.includes('프레임')) {
                spec = '▸ 철제 프레임\n▸ 볼트 조립식';
                unit = 'SET';
                qty = 1;
                remark = '설치비 포함';
            } else if (opt.name.includes('듀얼')) {
                spec = '▸ 2개의 독립 제어\n▸ 동시 운영 가능';
                unit = 'SET';
                qty = 1;
            } else if (opt.name.includes('아크릴')) {
                spec = '▸ 투명 아크릴 도어\n▸ 내용물 가시성';
                unit = '칸';
                remark = '선택 칸 적용';
            } else if (opt.name.includes('타공')) {
                spec = '▸ 원형 타공 패턴\n▸ 통기성 및 디자인';
                unit = '칸';
                remark = '전체 칸 적용';
            } else {
                spec = '▸ ' + opt.name;
            }

            priceItems.push({
                name: opt.name,
                spec: spec,
                color: '-',
                unit: unit,
                qty: qty,
                unitPrice: opt.unitPrice || opt.price,
                amount: opt.price,
                remark: remark
            });
        });
    }

    // 5. Installation/Delivery
    priceItems.push({
        name: '운반/설치\n/시운전',
        spec: `▸ 현장 운반 및 설치\n▸ 시운전 및 교육\n▸ ${breakdown.regionLabel}`,
        color: '-',
        unit: 'SET',
        qty: 1,
        unitPrice: breakdown.installationCost,
        amount: breakdown.installationCost,
        remark: '기술 지원',
        isInstallItem: true // 설치 마킹
    });

    // 테이블 데이터 행용 깔끔한 border 스타일
    const tableBorder = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
    };

    // Write table data rows
    priceItems.forEach((item) => {
        // Name (A)
        const nameCell = sheet.getCell(`A${rowIndex}`);
        nameCell.value = item.name;
        nameCell.font = { name: 'Malgun Gothic', size: 9, bold: true };
        nameCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        nameCell.border = tableBorder;

        // Spec (B)
        const specCell = sheet.getCell(`B${rowIndex}`);
        specCell.value = item.spec;
        specCell.font = { name: 'Malgun Gothic', size: 8 };
        specCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 0.5 };
        specCell.border = tableBorder;

        // Color (C)
        const colorCell = sheet.getCell(`C${rowIndex}`);
        colorCell.value = item.color;
        colorCell.font = { name: 'Malgun Gothic', size: 9 };
        colorCell.alignment = { horizontal: 'center', vertical: 'middle' };
        colorCell.border = tableBorder;

        // Unit (D)
        const unitCellData = sheet.getCell(`D${rowIndex}`);
        unitCellData.value = item.unit;
        unitCellData.font = { name: 'Malgun Gothic', size: 9 };
        unitCellData.alignment = { horizontal: 'center', vertical: 'middle' };
        unitCellData.border = tableBorder;

        // Quantity (E)
        const qtyCell = sheet.getCell(`E${rowIndex}`);
        qtyCell.value = item.qty;
        qtyCell.font = { name: 'Malgun Gothic', size: 9 };
        qtyCell.alignment = { horizontal: 'center', vertical: 'middle' };
        qtyCell.border = tableBorder;

        // Unit Price (F)
        const unitPriceCell = sheet.getCell(`F${rowIndex}`);
        unitPriceCell.value = item.unitPrice;
        unitPriceCell.numFmt = '#,##0';
        unitPriceCell.font = { name: 'Malgun Gothic', size: 9 };
        unitPriceCell.alignment = { horizontal: 'right', vertical: 'middle' };
        unitPriceCell.border = tableBorder;

        // Total Price (G)
        const amountCell = sheet.getCell(`G${rowIndex}`);
        amountCell.value = item.amount;
        amountCell.numFmt = '#,##0';
        amountCell.font = { name: 'Malgun Gothic', size: 9, bold: true, color: { argb: 'FF1E3A5F' } };
        amountCell.alignment = { horizontal: 'right', vertical: 'middle' };
        amountCell.border = tableBorder;

        // Remark (H)
        const remarkCell = sheet.getCell(`H${rowIndex}`);
        remarkCell.value = item.remark;
        remarkCell.font = { name: 'Malgun Gothic', size: 8, color: { argb: 'FF888888' } };
        remarkCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        remarkCell.border = tableBorder;

        // Adjust row height based on content
        // 제어부, 함체부, 설치 항목은 높게, 나머지(옵션/프로그램)는 낮게
        const specLines = item.spec.split('\n').length;
        const isMainItem = item.isControlItem || item.isBodyItem || item.isInstallItem;
        const minHeight = isMainItem
            ? Math.max(38, specLines * 12) // 주요 항목: 기본 38pt
            : Math.max(24, specLines * 10); // 옵션/프로그램: 기본 24pt
        sheet.getRow(rowIndex).height = minHeight;

        rowIndex++;
    });

    // ===== SECTION 7: Total Row (깔끔한 디자인) =====
    const totalBorder = {
        top: { style: 'medium', color: { argb: 'FF1E3A5F' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'medium', color: { argb: 'FF1E3A5F' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
    };

    sheet.mergeCells(`A${rowIndex}:F${rowIndex}`);
    const totalLabelCell = sheet.getCell(`A${rowIndex}`);
    totalLabelCell.value = '합    계';
    totalLabelCell.font = { name: 'Malgun Gothic', size: 11, bold: true, color: { argb: 'FF1E3A5F' } };
    totalLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F8F8' } };
    totalLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
    totalLabelCell.border = totalBorder;

    // Apply borders to merged cells
    ['B', 'C', 'D', 'E', 'F'].forEach(col => {
        sheet.getCell(`${col}${rowIndex}`).border = totalBorder;
    });

    sheet.mergeCells(`G${rowIndex}:H${rowIndex}`);
    const totalValueCell = sheet.getCell(`G${rowIndex}`);
    totalValueCell.value = totalAmount;
    totalValueCell.numFmt = '#,##0';
    totalValueCell.font = { name: 'Malgun Gothic', size: 13, bold: true, color: { argb: 'FF1E3A5F' } };
    totalValueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F8F8' } };
    totalValueCell.alignment = { horizontal: 'right', vertical: 'middle' };
    totalValueCell.border = totalBorder;
    sheet.getCell(`H${rowIndex}`).border = totalBorder;

    sheet.getRow(rowIndex).height = 32;
    rowIndex += 2;

    // ===== SECTION 8: Condition + 2D Layout (나란히 배치) =====
    const sectionStartRow = rowIndex;

    // --- 좌측: Condition (A-B열) ---
    // Condition 타이틀
    sheet.mergeCells(`A${rowIndex}:B${rowIndex}`);
    const conditionTitleCell = sheet.getCell(`A${rowIndex}`);
    conditionTitleCell.value = 'Condition→';
    conditionTitleCell.font = { name: 'Malgun Gothic', size: 10, bold: true, color: { argb: 'FF1E3A5F' } };
    conditionTitleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    conditionTitleCell.border = { bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } } };

    // --- 우측: 납품 레이아웃 예시 타이틀 (D-H열) ---
    sheet.mergeCells(`D${rowIndex}:H${rowIndex}`);
    const layoutTitleCell = sheet.getCell(`D${rowIndex}`);
    layoutTitleCell.value = '납품 레이아웃 예시';
    layoutTitleCell.font = { name: 'Malgun Gothic', size: 10, bold: true, color: { argb: 'FF1E3A5F' } };
    layoutTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    layoutTitleCell.border = { bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } } };

    sheet.getRow(rowIndex).height = 25;
    rowIndex++;

    // --- 좌측: Condition 내용 ---
    const conditions = [
        '1. 납품기간은 발주 후 4주',
        '2. 무상유지보수 기간 1년',
        '3. 전기 및 통신 공사는 제외'
    ];

    const conditionStartRow = rowIndex;
    conditions.forEach((condition, idx) => {
        sheet.mergeCells(`A${rowIndex}:B${rowIndex}`);
        const condCell = sheet.getCell(`A${rowIndex}`);
        condCell.value = condition;
        condCell.font = { name: 'Malgun Gothic', size: 9, color: { argb: 'FF666666' } };
        condCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        sheet.getRow(rowIndex).height = 18;
        rowIndex++;
    });

    // 이미지 공간 확보 (기본값)
    let imageRowSpan = 15;

    // --- 우측: 2D 레이아웃 이미지 (D-H열, 1페이지 내 맞춤) ---
    if (previewImageBase64) {
        try {
            // 이미지 원본 비율 확인
            const imageBuffer = Buffer.from(previewImageBase64, 'base64');
            const image = await Jimp.read(imageBuffer);
            const imgWidth = image.bitmap.width;
            const imgHeight = image.bitmap.height;
            const aspectRatio = imgWidth / imgHeight;

            // D-H열 너비 계산 (5개 컬럼)
            // D=8, E=8, F=12, G=14, H=16 = 총 58
            const availableWidth = (8 + 8 + 12 + 14 + 16) * 7.2; // 약 417.6pt

            // 항목 수에 따라 이미지 크기 동적 조절
            // 기본 항목: 제어부(1) + 본체부(1~n) + 프로그램(1) + 설치(1) = 4+
            // 옵션 항목 추가 시 이미지 축소
            const baseItems = 4; // 제어부, 본체부(최소1), 프로그램, 설치
            const extraItems = Math.max(0, priceItems.length - baseItems);

            // 항목이 많을수록 이미지 최대 높이 축소
            // 기본: 286pt, 추가 항목당 15pt 감소 (최소 180pt)
            const maxImageHeight = Math.max(180, 286 - extraItems * 15);

            let targetWidth = availableWidth * 1.235; // 30% 증가 (0.95 * 1.3)
            let targetHeight = targetWidth / aspectRatio;

            // 높이가 최대값 초과 시 축소
            if (targetHeight > maxImageHeight) {
                targetHeight = maxImageHeight;
                targetWidth = targetHeight * aspectRatio;
                console.log(`2D Layout Image: scaled down (${priceItems.length} items, maxH=${maxImageHeight})`);
            }

            const previewId = workbook.addImage({
                base64: previewImageBase64,
                extension: 'png',
            });

            // D열(col: 3) 시작, 원본 비율 유지
            sheet.addImage(previewId, {
                tl: { col: 3.1, row: conditionStartRow },
                ext: { width: targetWidth, height: targetHeight }
            });

            console.log('2D Layout Image: aspect ratio', aspectRatio.toFixed(2),
                'width:', targetWidth.toFixed(0), 'height:', targetHeight.toFixed(0),
                'items:', priceItems.length);

            // 이미지 높이에 맞춰 행 확보 (1행당 약 18pt)
            imageRowSpan = Math.ceil(targetHeight / 18) + 2;

        } catch (err) {
            console.error('Error adding 2D preview image:', err);
        }
    }

    // 이미지 공간 확보
    for (let i = conditionStartRow; i < conditionStartRow + imageRowSpan; i++) {
        if (sheet.getRow(i).height < 18) {
            sheet.getRow(i).height = 18;
        }
    }
    rowIndex = Math.max(rowIndex, conditionStartRow + imageRowSpan) + 1;

    // Footer는 pageSetup.headerFooter로 고정 출력됨
}

/**
 * Generate Excel and return as base64
 */
export async function generateQuoteExcelBase64(quoteData, previewImageBase64, generatedImageBase64, customerInfo) {
    const buffer = await generateQuoteExcel(quoteData, previewImageBase64, generatedImageBase64, customerInfo);
    return buffer.toString('base64');
}
