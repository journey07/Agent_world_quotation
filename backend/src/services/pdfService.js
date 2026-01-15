import PDFDocument from 'pdfkit';
import { generateLockerGrid } from './imageService.js';
import { getCompanyInfo, getTerms } from './pricingService.js';

/**
 * Generate a PDF quote document
 * @param {Object} quoteData - Quote calculation result
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function generateQuotePDF(quoteData) {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50,
                info: {
                    Title: '락커 견적서',
                    Author: getCompanyInfo().name
                }
            });

            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Register Korean font if available, fallback to Helvetica
            // Note: For production, embed a Korean font like NanumGothic

            const { input, breakdown, summary } = quoteData;
            const companyInfo = getCompanyInfo();
            const currentDate = new Date().toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Header
            doc.fontSize(24).text('견적서', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(12).text(`발행일: ${currentDate}`, { align: 'right' });
            doc.moveDown(2);

            // Company Info
            doc.fontSize(14).text(companyInfo.name, { underline: true });
            doc.fontSize(10)
                .text(companyInfo.address)
                .text(`Tel: ${companyInfo.phone}`)
                .text(`Email: ${companyInfo.email}`);
            doc.moveDown(2);

            // Locker Configuration Summary
            doc.fontSize(14).text('주문 사양', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(11);

            const specs = [
                ['열 수 (Columns)', `${input.columns}열`],
                ['단 수 (Tiers)', `${input.tiers}단`],
                ['수량 (Units)', `${input.quantity}개`],
                ['셀 당 개수', `${input.cellsPerUnit}칸`],
                ['총 셀 수', `${input.totalCells}칸`],
                ['재질', breakdown.materialName],
                ['색상', breakdown.colorName]
            ];

            specs.forEach(([label, value]) => {
                doc.text(`${label}: ${value}`);
            });

            doc.moveDown(2);

            // Generate and embed locker grid image
            doc.fontSize(14).text('설치 미리보기', { underline: true });
            doc.moveDown(0.5);

            try {
                const imageBuffer = await generateLockerGrid(input.columns, input.tiers);
                doc.image(imageBuffer, {
                    fit: [300, 300],
                    align: 'center'
                });
            } catch (imgErr) {
                doc.fontSize(10).text('[이미지 생성 오류]', { align: 'center' });
            }

            doc.moveDown(2);

            // Price Breakdown
            doc.fontSize(14).text('가격 명세', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(11);

            const formatPrice = (num) => `₩${num.toLocaleString('ko-KR')}`;

            const priceLines = [
                ['기본 단가 (셀 당)', formatPrice(breakdown.basePricePerCell)],
                ['기본 금액', formatPrice(breakdown.baseTotal)],
                [`재질 (${breakdown.materialName}) 적용`, `x ${breakdown.materialModifier}`],
                ['재질 적용 후 금액', formatPrice(breakdown.priceAfterMaterial)],
            ];

            if (breakdown.colorAddition > 0) {
                priceLines.push(['색상 추가 비용', formatPrice(breakdown.colorAddition)]);
            }

            priceLines.push(['소계', formatPrice(summary.subtotal)]);

            if (breakdown.discountRate > 0) {
                priceLines.push([`수량 할인 (${(breakdown.discountRate * 100).toFixed(0)}%)`, `-${formatPrice(summary.discount)}`]);
            }

            priceLines.forEach(([label, value]) => {
                doc.text(`${label}: ${value}`);
            });

            doc.moveDown(1);
            doc.fontSize(16).text(`총 견적 금액: ${formatPrice(summary.total)}`, {
                underline: true
            });

            doc.moveDown(2);

            // Terms & Conditions
            doc.fontSize(10)
                .fillColor('#666666')
                .text('유의사항', { underline: true })
                .moveDown(0.3)
                .text(getTerms());

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Generate PDF and return as base64
 */
export async function generateQuotePDFBase64(quoteData) {
    const buffer = await generateQuotePDF(quoteData);
    return buffer.toString('base64');
}
