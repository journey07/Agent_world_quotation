import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { getCompanyInfo, getTerms } from './pricingService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_PATH = join(__dirname, '../../assets');
const LOGO_PATH = join(ASSETS_PATH, 'world_logo.png');

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
            fitToHeight: 0,
            margins: {
                left: 0.5, right: 0.5,
                top: 0.5, bottom: 0.5,
                header: 0.3, footer: 0.3
            }
        }
    });
    
    // Set column widths
    sheet.columns = [
        { width: 5 },   // A
        { width: 15 },  // B
        { width: 15 },  // C
        { width: 15 },  // D
        { width: 15 },  // E
        { width: 15 },  // F
        { width: 15 },  // G
        { width: 5 },   // H
    ];
    
    let rowIndex = 1;
    
    // Add logo (increased height by 15% more)
    if (fs.existsSync(LOGO_PATH)) {
        const logoId = workbook.addImage({
            filename: LOGO_PATH,
            extension: 'png',
        });
        
        sheet.addImage(logoId, {
            tl: { col: 1, row: 0.3 },
            ext: { width: 140, height: 121 }  // 105 * 1.15 = 120.75 ≈ 121
        });
    }
    
    // Title Row (Large and Bold)
    rowIndex = 5;
    sheet.mergeCells(`B${rowIndex}:G${rowIndex}`);
    const titleCell = sheet.getCell(`B${rowIndex}`);
    titleCell.value = '견  적  서';
    titleCell.font = { name: 'Malgun Gothic', size: 36, bold: true, color: { argb: 'FF1E3A5F' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(rowIndex).height = 60;
    
    // Product Name (Large)
    rowIndex = 7;
    sheet.mergeCells(`B${rowIndex}:G${rowIndex}`);
    const productCell = sheet.getCell(`B${rowIndex}`);
    const { input } = quoteData;
    productCell.value = `물품보관함 ${input.columns}열 × ${input.tiers}단`;
    productCell.font = { name: 'Malgun Gothic', size: 20, bold: true };
    productCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(rowIndex).height = 40;
    
    // Recipient (Large)
    rowIndex = 9;
    sheet.mergeCells(`B${rowIndex}:G${rowIndex}`);
    const recipientCell = sheet.getCell(`B${rowIndex}`);
    recipientCell.value = `수신: ${customerInfo.companyName || '귀하'}`;
    recipientCell.font = { name: 'Malgun Gothic', size: 18 };
    recipientCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(rowIndex).height = 35;
    
    // Divider line
    rowIndex = 10;
    sheet.mergeCells(`B${rowIndex}:G${rowIndex}`);
    const dividerCell = sheet.getCell(`B${rowIndex}`);
    dividerCell.border = {
        bottom: { style: 'medium', color: { argb: 'FF1E3A5F' } }
    };
    sheet.getRow(rowIndex).height = 5;
    
    // 3D Installation Image Section (No title, just image)
    rowIndex = 11;
    
    // Add 3D Image (Very Large - dominates the page)
    if (imageBase64) {
        try {
            const imageId = workbook.addImage({
                base64: imageBase64,
                extension: 'png',
            });
            
            // Place image spanning B11:G40 (huge area for 3D image)
            sheet.addImage(imageId, {
                tl: { col: 1, row: rowIndex },
                br: { col: 7, row: rowIndex + 28 }
            });
            
            // Set rows height to accommodate image
            for (let i = rowIndex; i <= rowIndex + 28; i++) {
                sheet.getRow(i).height = 20;
            }
            rowIndex += 28;
        } catch (err) {
            console.error('Error adding 3D image:', err);
        }
    }
    
    // Company Footer
    rowIndex += 2;
    sheet.mergeCells(`B${rowIndex}:G${rowIndex}`);
    const footerCell = sheet.getCell(`B${rowIndex}`);
    footerCell.value = '월드락커 | World Locker';
    footerCell.font = { name: 'Malgun Gothic', size: 11, color: { argb: 'FF1E3A5F' }, bold: true };
    footerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(rowIndex).height = 25;
}

/**
 * Create Detail Sheet with itemized pricing
 */
async function createDetailSheet(workbook, quoteData, previewImageBase64, customerInfo, currentDate) {
    const sheet = workbook.addWorksheet('견적내역', {
        pageSetup: {
            paperSize: 9, // A4
            orientation: 'portrait',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            margins: {
                left: 0.5, right: 0.5,
                top: 0.5, bottom: 0.5,
                header: 0.3, footer: 0.3
            }
        }
    });
    
    // Set column widths
    sheet.columns = [
        { width: 3 },   // A (margin)
        { width: 30 },  // B (항목) - 더 넓게
        { width: 15 },  // C (규격)
        { width: 8 },   // D (수량) - 더 좁게
        { width: 18 },  // E (단가) - 더 넓게
        { width: 20 },  // F (금액) - 더 넓게
        { width: 3 },   // G (margin)
    ];
    
    const companyInfo = getCompanyInfo();
    let rowIndex = 1;
    
    // Add logo (increased height by 15% more)
    if (fs.existsSync(LOGO_PATH)) {
        const logoId = workbook.addImage({
            filename: LOGO_PATH,
            extension: 'png',
        });
        
        sheet.addImage(logoId, {
            tl: { col: 1, row: 0.3 },
            ext: { width: 120, height: 104 }  // 90 * 1.15 = 103.5 ≈ 104
        });
    }
    
    // Company Info (우측 상단)
    rowIndex = 1;
    sheet.mergeCells(`D${rowIndex}:F${rowIndex}`);
    const companyNameCell = sheet.getCell(`D${rowIndex}`);
    companyNameCell.value = '주식회사 월드락커';
    companyNameCell.font = { name: 'Malgun Gothic', size: 10, bold: true, color: { argb: 'FF1E3A5F' } };
    companyNameCell.alignment = { horizontal: 'right', vertical: 'middle' };
    sheet.getRow(rowIndex).height = 18;
    
    const companyDetails = [
        '사업자번호: 119-81-51855',
        '대표자: 권필목',
        '주소: 인천광역시 남동구 은봉로 52, NIC 지식산업센터 1010호',
        '업태: 제조업 | 종목: 키오스크 외',
        '전화: 032-819-2750 | 팩스: 032-819-2759'
    ];
    
    companyDetails.forEach((detail) => {
        rowIndex++;
        sheet.mergeCells(`D${rowIndex}:F${rowIndex}`);
        const detailCell = sheet.getCell(`D${rowIndex}`);
        detailCell.value = detail;
        detailCell.font = { name: 'Malgun Gothic', size: 8, color: { argb: 'FF666666' } };
        detailCell.alignment = { horizontal: 'right', vertical: 'middle' };
        sheet.getRow(rowIndex).height = 16;
    });
    
    // Title - Minimalist
    rowIndex = 8;
    sheet.mergeCells(`B${rowIndex}:F${rowIndex}`);
    const titleCell = sheet.getCell(`B${rowIndex}`);
    titleCell.value = '견적 내역서';
    titleCell.font = { name: 'Malgun Gothic', size: 22, bold: true, color: { argb: 'FF1E3A5F' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(rowIndex).height = 45;
    
    // Date & Customer in one line
    rowIndex = 10;
    sheet.mergeCells(`B${rowIndex}:C${rowIndex}`);
    const custCell = sheet.getCell(`B${rowIndex}`);
    custCell.value = `수신: ${customerInfo.companyName || '귀하'}`;
    custCell.font = { name: 'Malgun Gothic', size: 11, color: { argb: 'FF333333' } };
    custCell.alignment = { horizontal: 'left', vertical: 'middle' };
    
    sheet.mergeCells(`D${rowIndex}:F${rowIndex}`);
    const dateCell = sheet.getCell(`D${rowIndex}`);
    dateCell.value = `${currentDate}`;
    dateCell.font = { name: 'Malgun Gothic', size: 11, color: { argb: 'FF666666' } };
    dateCell.alignment = { horizontal: 'right', vertical: 'middle' };
    sheet.getRow(rowIndex).height = 25;
    
    // Divider
    rowIndex = 11;
    sheet.mergeCells(`B${rowIndex}:F${rowIndex}`);
    const divCell = sheet.getCell(`B${rowIndex}`);
    divCell.border = {
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } }
    };
    sheet.getRow(rowIndex).height = 5;
    
    const { input, breakdown } = quoteData;
    
    // Price Breakdown Section - Clean table header with borders
    rowIndex = 13;
    const headers = ['항목', '규격', '수량', '단가', '금액'];
    const headerCols = ['B', 'C', 'D', 'E', 'F'];
    
    // Helper function for full borders
    const getFullBorder = () => ({
        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'medium', color: { argb: 'FF1E3A5F' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
    });
    
    headers.forEach((header, idx) => {
        const cell = sheet.getCell(`${headerCols[idx]}${rowIndex}`);
        cell.value = header;
        cell.font = { name: 'Malgun Gothic', size: 11, bold: true, color: { argb: 'FF1E3A5F' } };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFB' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = getFullBorder();
    });
    
    sheet.getRow(rowIndex).height = 32;
    
    // Build price items - Simplified
    const priceItems = [];
    
    // 1. Base Price (제어부)
    priceItems.push({
        item: '제어부',
        spec: '기본',
        qty: 1,
        unitPrice: breakdown.basePrice,
        amount: breakdown.basePrice
    });
    
    // 2. Locker Body
    priceItems.push({
        item: '함체부',
        spec: `${input.tiers}단 × ${breakdown.bodyColumns}열`,
        qty: breakdown.bodyColumns,
        unitPrice: breakdown.unitBodyCost,
        amount: breakdown.lockerBodyCost
    });
    
    // 3. Options
    if (breakdown.optionsBreakdown && breakdown.optionsBreakdown.length > 0) {
        breakdown.optionsBreakdown.forEach(opt => {
            // 옵션 타입에 따라 spec 결정
            let spec = '-';
            if (opt.quantity) {
                // 아크릴 도어 등: 칸 수 표시
                spec = `${opt.quantity}칸`;
            } else if (opt.unitPrice === undefined && opt.price) {
                // 프레임, 듀얼컨트롤러 등: 세트당 1개
                spec = '1세트';
            }
            
            priceItems.push({
                item: opt.name,
                spec: spec,
                qty: opt.quantity || 1,
                unitPrice: opt.unitPrice || opt.price,
                amount: opt.price
            });
        });
    }
    
    // Add price items to sheet - Clean design with full borders
    const getCellBorder = () => ({
        top: { style: 'thin', color: { argb: 'FFE8E8E8' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFE8E8E8' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
    });
    
    priceItems.forEach((item, idx) => {
        rowIndex++;
        
        const itemCell = sheet.getCell(`B${rowIndex}`);
        itemCell.value = item.item;
        itemCell.font = { name: 'Malgun Gothic', size: 10 };
        itemCell.alignment = { horizontal: 'left', vertical: 'middle' };
        itemCell.border = getCellBorder();
        
        const specCell = sheet.getCell(`C${rowIndex}`);
        specCell.value = item.spec;
        specCell.font = { name: 'Malgun Gothic', size: 10, color: { argb: 'FF666666' } };
        specCell.alignment = { horizontal: 'center', vertical: 'middle' };
        specCell.border = getCellBorder();
        
        const qtyCell = sheet.getCell(`D${rowIndex}`);
        qtyCell.value = item.qty;
        qtyCell.font = { name: 'Malgun Gothic', size: 10 };
        qtyCell.alignment = { horizontal: 'center', vertical: 'middle' };
        qtyCell.border = getCellBorder();
        
        const unitPriceCell = sheet.getCell(`E${rowIndex}`);
        unitPriceCell.value = item.unitPrice;
        unitPriceCell.numFmt = '₩#,##0';
        unitPriceCell.font = { name: 'Malgun Gothic', size: 10, color: { argb: 'FF666666' } };
        unitPriceCell.alignment = { horizontal: 'right', vertical: 'middle' };
        unitPriceCell.border = getCellBorder();
        
        const amountCell = sheet.getCell(`F${rowIndex}`);
        amountCell.value = item.amount;
        amountCell.numFmt = '₩#,##0';
        amountCell.font = { name: 'Malgun Gothic', size: 11, bold: true };
        amountCell.alignment = { horizontal: 'right', vertical: 'middle' };
        amountCell.border = getCellBorder();
        
        sheet.getRow(rowIndex).height = 28;
    });
    
    // Divider before totals
    rowIndex++;
    sheet.mergeCells(`B${rowIndex}:F${rowIndex}`);
    const divCell2 = sheet.getCell(`B${rowIndex}`);
    divCell2.border = {
        top: { style: 'medium', color: { argb: 'FF1E3A5F' } }
    };
    sheet.getRow(rowIndex).height = 8;
    
    // Subtotal Row (1세트 단가) - Clean with borders
    rowIndex++;
    sheet.mergeCells(`B${rowIndex}:D${rowIndex}`);
    const subtotalLabelCell = sheet.getCell(`B${rowIndex}`);
    subtotalLabelCell.value = '1세트 단가';
    subtotalLabelCell.font = { name: 'Malgun Gothic', size: 11, color: { argb: 'FF666666' } };
    subtotalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };
    subtotalLabelCell.border = getCellBorder();
    ['C', 'D'].forEach(col => {
        sheet.getCell(`${col}${rowIndex}`).border = getCellBorder();
    });
    
    sheet.mergeCells(`E${rowIndex}:F${rowIndex}`);
    const subtotalValueCell = sheet.getCell(`E${rowIndex}`);
    subtotalValueCell.value = breakdown.subtotalPerUnit;
    subtotalValueCell.numFmt = '₩#,##0';
    subtotalValueCell.font = { name: 'Malgun Gothic', size: 11 };
    subtotalValueCell.alignment = { horizontal: 'right', vertical: 'middle' };
    subtotalValueCell.border = getCellBorder();
    sheet.getCell(`F${rowIndex}`).border = getCellBorder();
    sheet.getRow(rowIndex).height = 28;
    
    // Quantity Multiplier Row
    rowIndex++;
    sheet.mergeCells(`B${rowIndex}:D${rowIndex}`);
    const qtyLabelCell = sheet.getCell(`B${rowIndex}`);
    qtyLabelCell.value = `수량 × ${input.quantity}세트`;
    qtyLabelCell.font = { name: 'Malgun Gothic', size: 11, color: { argb: 'FF666666' } };
    qtyLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };
    qtyLabelCell.border = getCellBorder();
    ['C', 'D'].forEach(col => {
        sheet.getCell(`${col}${rowIndex}`).border = getCellBorder();
    });
    
    sheet.mergeCells(`E${rowIndex}:F${rowIndex}`);
    const productTotalCell = sheet.getCell(`E${rowIndex}`);
    productTotalCell.value = breakdown.subtotalPerUnit * input.quantity;
    productTotalCell.numFmt = '₩#,##0';
    productTotalCell.font = { name: 'Malgun Gothic', size: 11 };
    productTotalCell.alignment = { horizontal: 'right', vertical: 'middle' };
    productTotalCell.border = getCellBorder();
    sheet.getCell(`F${rowIndex}`).border = getCellBorder();
    sheet.getRow(rowIndex).height = 28;
    
    // Installation Cost Row
    rowIndex++;
    sheet.mergeCells(`B${rowIndex}:D${rowIndex}`);
    const installLabelCell = sheet.getCell(`B${rowIndex}`);
    installLabelCell.value = `설치운반비 (${breakdown.regionLabel})`;
    installLabelCell.font = { name: 'Malgun Gothic', size: 11, color: { argb: 'FF666666' } };
    installLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };
    installLabelCell.border = getCellBorder();
    ['C', 'D'].forEach(col => {
        sheet.getCell(`${col}${rowIndex}`).border = getCellBorder();
    });
    
    sheet.mergeCells(`E${rowIndex}:F${rowIndex}`);
    const installValueCell = sheet.getCell(`E${rowIndex}`);
    installValueCell.value = breakdown.installationCost;
    installValueCell.numFmt = '₩#,##0';
    installValueCell.font = { name: 'Malgun Gothic', size: 11 };
    installValueCell.alignment = { horizontal: 'right', vertical: 'middle' };
    installValueCell.border = getCellBorder();
    sheet.getCell(`F${rowIndex}`).border = getCellBorder();
    sheet.getRow(rowIndex).height = 28;
    
    // Divider before grand total
    rowIndex++;
    sheet.mergeCells(`B${rowIndex}:F${rowIndex}`);
    const divCell3 = sheet.getCell(`B${rowIndex}`);
    divCell3.border = {
        top: { style: 'double', color: { argb: 'FF1E3A5F' } }
    };
    sheet.getRow(rowIndex).height = 8;
    
    // Grand Total Row - Prominent with borders
    rowIndex++;
    sheet.mergeCells(`B${rowIndex}:D${rowIndex}`);
    const grandTotalLabelCell = sheet.getCell(`B${rowIndex}`);
    grandTotalLabelCell.value = '총 견적 금액';
    grandTotalLabelCell.font = { name: 'Malgun Gothic', size: 14, bold: true, color: { argb: 'FF1E3A5F' } };
    grandTotalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };
    grandTotalLabelCell.border = {
        top: { style: 'medium', color: { argb: 'FF1E3A5F' } },
        left: { style: 'medium', color: { argb: 'FF1E3A5F' } },
        bottom: { style: 'medium', color: { argb: 'FF1E3A5F' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
    };
    ['C', 'D'].forEach(col => {
        const cell = sheet.getCell(`${col}${rowIndex}`);
        cell.border = {
            top: { style: 'medium', color: { argb: 'FF1E3A5F' } },
            left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            bottom: { style: 'medium', color: { argb: 'FF1E3A5F' } },
            right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
        };
    });
    
    sheet.mergeCells(`E${rowIndex}:F${rowIndex}`);
    const grandTotalValueCell = sheet.getCell(`E${rowIndex}`);
    grandTotalValueCell.value = quoteData.summary.total;
    grandTotalValueCell.numFmt = '₩#,##0';
    grandTotalValueCell.font = { name: 'Malgun Gothic', size: 16, bold: true, color: { argb: 'FF1E3A5F' } };
    grandTotalValueCell.alignment = { horizontal: 'right', vertical: 'middle' };
    grandTotalValueCell.border = {
        top: { style: 'medium', color: { argb: 'FF1E3A5F' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'medium', color: { argb: 'FF1E3A5F' } },
        right: { style: 'medium', color: { argb: 'FF1E3A5F' } }
    };
    sheet.getCell(`F${rowIndex}`).border = grandTotalValueCell.border;
    sheet.getRow(rowIndex).height = 45;
    
    // VAT notice
    rowIndex++;
    sheet.mergeCells(`B${rowIndex}:F${rowIndex}`);
    const vatCell = sheet.getCell(`B${rowIndex}`);
    vatCell.value = '* 부가세(VAT) 별도';
    vatCell.font = { name: 'Malgun Gothic', size: 9, color: { argb: 'FF999999' } };
    vatCell.alignment = { horizontal: 'right', vertical: 'middle' };
    sheet.getRow(rowIndex).height = 20;
    
    // Add 2D Preview Image (if available) - Centered and clean
    if (previewImageBase64) {
        rowIndex += 3;
        
        try {
            const previewId = workbook.addImage({
                base64: previewImageBase64,
                extension: 'png',
            });
            
            sheet.addImage(previewId, {
                tl: { col: 2, row: rowIndex },
                ext: { width: 320, height: 260 }
            });
            
            // Reserve space for image
            for (let i = rowIndex; i <= rowIndex + 14; i++) {
                sheet.getRow(i).height = 18;
            }
            rowIndex += 14;
        } catch (err) {
            console.error('Error adding preview image:', err);
        }
    }
    
    // Terms and Conditions - Minimal
    rowIndex += 2;
    sheet.mergeCells(`B${rowIndex}:G${rowIndex}`);
    const termsTitleCell = sheet.getCell(`B${rowIndex}`);
    termsTitleCell.value = '유의사항';
    termsTitleCell.font = { name: 'Malgun Gothic', size: 10, bold: true, color: { argb: 'FF666666' } };
    termsTitleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    sheet.getRow(rowIndex).height = 25;
    
    const terms = getTerms();
    terms.forEach((term, idx) => {
        rowIndex++;
        sheet.mergeCells(`B${rowIndex}:G${rowIndex}`);
        const termCell = sheet.getCell(`B${rowIndex}`);
        termCell.value = `• ${term}`;
        termCell.font = { name: 'Malgun Gothic', size: 9, color: { argb: 'FF999999' } };
        termCell.alignment = { horizontal: 'left', vertical: 'middle' };
        sheet.getRow(rowIndex).height = 20;
    });
    
    // Company Footer - Clean
    rowIndex += 3;
    sheet.mergeCells(`B${rowIndex}:G${rowIndex}`);
    const footerCell = sheet.getCell(`B${rowIndex}`);
    footerCell.value = '월드락커 | World Locker';
    footerCell.font = { name: 'Malgun Gothic', size: 10, bold: true, color: { argb: 'FF1E3A5F' } };
    footerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(rowIndex).height = 25;
}

/**
 * Apply header cell style
 */
function applyHeaderStyle(cell) {
    cell.font = { name: 'Malgun Gothic', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2B579A' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = getBorder();
}

/**
 * Get standard border style
 */
function getBorder() {
    return {
        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
    };
}

/**
 * Generate Excel and return as base64
 */
export async function generateQuoteExcelBase64(quoteData, previewImageBase64, generatedImageBase64, customerInfo) {
    const buffer = await generateQuoteExcel(quoteData, previewImageBase64, generatedImageBase64, customerInfo);
    return buffer.toString('base64');
}
