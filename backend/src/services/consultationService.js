import { GoogleGenAI } from "@google/genai";

// Lazy initialization for Gemini client
let ai = null;

function getAI() {
    if (!ai) {
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY environment variable is not set.');
        }
        ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    }
    return ai;
}

/**
 * 필수 정보 필드 정의
 */
const REQUIRED_FIELDS = ['company_name', 'columns', 'tiers', 'color', 'region', 'contact_name', 'contact_phone'];
const RECOMMENDED_FIELDS = ['frame_type', 'installation_date']; // industry는 AI가 알아서 판단
const OPTIONAL_FIELDS = ['contact_email', 'budget', 'handle', 'acrylic', 'dual_controller', 'perforation'];

/**
 * 상담 메모를 파싱하여 구조화된 데이터로 변환
 * @param {string} note - 자유 형식의 상담 메모
 * @returns {Promise<Object>} 파싱된 데이터와 미취합 정보
 */
export async function parseConsultationNote(note) {
    console.log('Parsing consultation note...');

    const prompt = `락커 상담 메모에서 정보를 추출하세요. 모든 값은 고객이 말한 그대로 기록합니다.

상담 메모:
${note}

JSON으로만 응답 (다른 텍스트 없이):
{
  "extracted": {
    "company_name": "업체명/상호명 그대로 또는 null",
    "industry": "업종 그대로 (피트니스, 리조트, 학원, 카페 등) 또는 null",
    "total_lockers": 숫자 또는 null,
    "columns": 숫자 또는 null,
    "tiers": 숫자 또는 null,
    "quantity": 숫자 또는 null,
    "color": "색상 그대로 (화이트, 블랙, 빨간색 등) 또는 null",
    "region": "지역 그대로 (서울, 경기, 태국, 방콕 등) 또는 null",
    "contact_name": "담당자명 또는 null",
    "contact_phone": "연락처 또는 null",
    "frame_type": "프레임 언급시만 (풀옵션/상부만/사이드만 등) 또는 null",
    "installation_date": "설치예정일 그대로 또는 null",
    "contact_email": "이메일 또는 null",
    "handle": true/false/null,
    "acrylic": true/false/null,
    "dual_controller": true/false/null,
    "perforation": true/false/null,
    "budget": 숫자 또는 null
  }
}

추출 규칙:
- 모든 텍스트 값은 고객이 말한 그대로 기록 (카테고리화 금지)
- total_lockers: "100칸", "80개", "520함" 등 → 숫자만 추출
- columns: "5열" 등 열 수 명시시만
- tiers: "4단" 등 단 수 명시시만
- quantity: "3세트", "6개" 등 세트/묶음 수
- color: 도어색상/함체색상/락커색상 등 → 색상명 그대로 (화이트, 블랙, 그린 등). 색상 언급 없으면 반드시 null
- 언급되지 않은 정보는 반드시 null`;

    try {
        const genAI = getAI();
        const response = await genAI.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
            config: {
                temperature: 0,
                maxOutputTokens: 1000,
            }
        });

        // Extract text from response
        let text = '';
        if (response.candidates && response.candidates.length > 0) {
            for (const part of response.candidates[0].content.parts) {
                if (part.text) {
                    text += part.text;
                }
            }
        }

        console.log('AI Raw Response:', text.substring(0, 500));

        // Clean up response - remove markdown and extra text
        text = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

        // Try to find JSON object in the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            text = jsonMatch[0];
        }

        // Fix string "null" to actual null
        text = text.replace(/:\s*"null"/gi, ': null');
        // Fix string booleans
        text = text.replace(/:\s*"true"/gi, ': true');
        text = text.replace(/:\s*"false"/gi, ': false');

        console.log('Cleaned JSON:', text.substring(0, 300));

        // Parse JSON response
        const parsed = JSON.parse(text);

        // Normalize extracted data
        const normalized = normalizeExtractedData(parsed.extracted);

        // Validate and identify missing fields
        const missingRequired = REQUIRED_FIELDS.filter(field =>
            normalized[field] === null || normalized[field] === undefined || normalized[field] === ''
        );
        const missingRecommended = RECOMMENDED_FIELDS.filter(field =>
            normalized[field] === null || normalized[field] === undefined || normalized[field] === ''
        );

        // 추천 질문은 항상 백엔드에서 우선순위대로 생성 (AI 질문 무시)
        const suggestedQuestions = generateSuggestedQuestions(missingRequired, missingRecommended);

        return {
            success: true,
            extracted: normalized,
            missing_required: missingRequired,
            missing_recommended: missingRecommended,
            suggested_questions: suggestedQuestions,
            is_complete: missingRequired.length === 0
        };

    } catch (error) {
        console.error('Error parsing consultation note:', error);
        return {
            success: false,
            error: error.message,
            extracted: null,
            missing_required: REQUIRED_FIELDS,
            missing_recommended: RECOMMENDED_FIELDS,
            suggested_questions: [],
            is_complete: false
        };
    }
}

/**
 * 추출된 데이터 정규화
 */
function normalizeExtractedData(data) {
    if (!data) return {};

    const normalized = {};

    // 키 정규화 매핑 (대문자 → 소문자)
    const keyMap = {
        'TOTAL_LOCKERS': 'total_lockers',
        'QUANTITY': 'quantity',
        'COLOR': 'color',
        'FRAME_COLOR': null, // 제외 (블랙 고정)
        'frame_color': null, // 제외 (블랙 고정)
        'COMPANY_NAME': 'company_name',
        'CONTACT_NAME': 'contact_name',
        'CONTACT_PHONE': 'contact_phone',
        'CONTACT_EMAIL': 'contact_email',
        'INDUSTRY': 'industry',
        'REGION': 'region',
        'FRAME_TYPE': 'frame_type',
        'INSTALLATION_DATE': 'installation_date',
        'BUDGET': 'budget',
        'HANDLE': 'handle',
        'ACRYLIC': 'acrylic',
        'DUAL_CONTROLLER': 'dual_controller',
        'PERFORATION': 'perforation',
        'COLUMNS': 'columns',
        'TIERS': 'tiers',
        // 한글 키 → 영문 키 (호환성)
        '함 수': 'total_lockers',
        '세트 수': 'quantity',
        '함 색상': 'color'
    };

    // 키 변환 및 데이터 복사
    for (const [key, value] of Object.entries(data)) {
        const mappedKey = keyMap[key] !== undefined ? keyMap[key] : key;

        // null로 매핑된 키는 제외 (frame_color)
        if (mappedKey === null) continue;

        // string "null" → actual null
        if (value === 'null' || value === 'undefined') {
            normalized[mappedKey] = null;
        } else {
            normalized[mappedKey] = value;
        }
    }

    // 색상, 지역, 업종: AI가 추출한 값 그대로 유지 (정규화 없음)
    // 프레임 타입도 그대로 유지

    // 숫자 필드 정규화
    if (normalized.columns) normalized.columns = parseInt(normalized.columns, 10) || null;
    if (normalized.tiers) normalized.tiers = parseInt(normalized.tiers, 10) || null;
    if (normalized.budget) normalized.budget = parseInt(normalized.budget, 10) || null;
    if (normalized.total_lockers) normalized.total_lockers = parseInt(normalized.total_lockers, 10) || null;
    if (normalized.quantity) normalized.quantity = parseInt(normalized.quantity, 10) || null;

    return normalized;
}

/**
 * 누락된 정보에 대한 추천 질문 생성 (중요도 순)
 */
function generateSuggestedQuestions(missingRequired, missingRecommended) {
    const questions = [];

    // 중요도 순서 정의 (핵심 스펙 → 연락처 → 기타)
    const priorityOrder = [
        'total_lockers', 'columns', 'tiers', 'quantity',  // 스펙 (최우선)
        'color', 'region',                                  // 기본 정보
        'company_name', 'contact_name', 'contact_phone',   // 연락처
        'frame_type', 'installation_date'                   // 권장 (industry 제외 - AI가 판단)
    ];

    const questionMap = {
        'total_lockers': '보관함 몇 칸 정도 필요하세요?',
        'columns': '함 구성은 몇 열로 하시겠어요?',
        'tiers': '한 열에 몇 칸으로 구성하시겠어요?',
        'quantity': '몇 세트 필요하세요?',
        'color': '함 색상(도어 색상)은 어떤 걸로 하시겠어요? (화이트, 블랙, 아이보리 등)',
        'region': '설치 지역은 어디신가요?',
        'company_name': '고객사명(또는 상호명)이 어떻게 되시나요?',
        'contact_name': '담당자분 성함을 알 수 있을까요?',
        'contact_phone': '연락 가능한 전화번호 알려주시겠어요?',
        'frame_type': '프레임은 상부와 사이드 모두 포함할까요, 아니면 상부만 / 사이드만 해드릴까요?',
        'installation_date': '설치 희망일이 언제쯤이세요?'
    };

    // 모든 누락 필드 합치기
    const allMissing = [...missingRequired, ...missingRecommended];

    // 중요도 순으로 정렬
    const sortedMissing = allMissing.sort((a, b) => {
        const aIndex = priorityOrder.indexOf(a);
        const bIndex = priorityOrder.indexOf(b);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

    // 상위 3개만 질문 생성
    for (const field of sortedMissing.slice(0, 3)) {
        if (questionMap[field]) {
            questions.push(questionMap[field]);
        }
    }

    return questions;
}

/**
 * total_lockers로부터 추천 열/단 계산
 * 일반적인 구성: 5열6단(30), 5열8단(40), 6열6단(36), 6열8단(48)
 */
function suggestConfiguration(totalLockers) {
    if (!totalLockers) return { columns: 5, tiers: 6 };

    // 일반적인 구성 옵션 (최대 20열 10단)
    const configs = [
        { columns: 4, tiers: 6, total: 24 },
        { columns: 5, tiers: 6, total: 30 },
        { columns: 4, tiers: 8, total: 32 },
        { columns: 5, tiers: 8, total: 40 },
        { columns: 6, tiers: 6, total: 36 },
        { columns: 6, tiers: 8, total: 48 },
        { columns: 7, tiers: 8, total: 56 },
        { columns: 8, tiers: 8, total: 64 },
        { columns: 10, tiers: 8, total: 80 },
        { columns: 10, tiers: 10, total: 100 },
        { columns: 12, tiers: 10, total: 120 },
        { columns: 15, tiers: 10, total: 150 },
        { columns: 20, tiers: 10, total: 200 },
    ];

    // 가장 가까운 구성 찾기
    let best = configs[0];
    let minDiff = Math.abs(totalLockers - best.total);

    for (const config of configs) {
        const diff = Math.abs(totalLockers - config.total);
        if (diff < minDiff) {
            minDiff = diff;
            best = config;
        }
    }

    return { columns: best.columns, tiers: best.tiers };
}

/**
 * 파싱된 데이터를 formData 형식으로 변환
 * 주의: 기본값을 설정하지 않고 null 유지 (사용자가 입력하지 않은 정보 구분)
 */
export function convertToFormData(extracted) {
    let columns = extracted.columns || null;
    let tiers = extracted.tiers || null;
    const quantity = extracted.quantity || 1;
    const totalLockers = extracted.total_lockers || null;

    // 총 칸수로부터 열/단 계산
    if (totalLockers) {
        if (tiers && !columns) {
            // 단 수가 있고 열 수가 없으면 → 열 수 계산
            // 총칸수 = 열 × 단 × 세트 → 열 = 총칸수 / (단 × 세트)
            columns = Math.ceil(totalLockers / (tiers * quantity));
        } else if (columns && !tiers) {
            // 열 수가 있고 단 수가 없으면 → 단 수 계산
            tiers = Math.ceil(totalLockers / (columns * quantity));
        } else if (!columns && !tiers) {
            // 둘 다 없으면 → 추천 구성 사용
            const suggested = suggestConfiguration(totalLockers);
            columns = suggested.columns;
            tiers = suggested.tiers;
        }
    }

    return {
        columns,
        tiers,
        quantity,
        controlPanelColumn: 2,
        controlPanelTiers: 3,
        tierConfig: { type: 'uniform', ratios: null },
        options: {
            dualController: extracted.dual_controller || false,
            acrylic: extracted.acrylic || false,
            perforation: extracted.perforation || false,
            frameType: extracted.frame_type || null,
            lockerColor: extracted.color || null, // 색상 기본값 없음!
            customColor: '#808080',
            handle: extracted.handle || false
        },
        region: extracted.region || null, // 지역 기본값 없음!
        installationBackground: '',
        companyName: extracted.company_name || '',
        contact: extracted.contact_phone || '',
        email: extracted.contact_email || '',
        detailedLocation: '',
        // 추가 메타데이터
        contactName: extracted.contact_name || '',
        industry: extracted.industry || '',
        installationDate: extracted.installation_date || '',
        budget: extracted.budget || null,
        // 원본 총 칸수 (참고용)
        total_lockers: extracted.total_lockers || null
    };
}

/**
 * AI 컨설턴트 조언 생성
 * 추출된 정보와 계산된 구성을 기반으로 맞춤형 조언 제공
 * @param {Object} extracted - 파싱된 고객 정보
 * @param {Object} formData - 자동 계산된 견적 데이터
 * @returns {Promise<Object>} 컨설턴트 조언 객체
 */
export async function generateConsultantAdvice(extracted, formData) {
    if (!extracted || !formData) {
        return null;
    }

    // 기본 가격 정보
    const BASE_PRICE_PER_CELL = 25000;
    const OPTION_PRICES = {
        handle: 3000,        // 손잡이 (칸당)
        perforation: 5000,   // 타공 (칸당)
        acrylic: 8000,       // 아크릴 도어 (칸당)
        frame_fullSet: 150000,  // 프레임 풀세트 (세트당)
        frame_topOnly: 80000,   // 상부 프레임 (세트당)
        frame_sideOnly: 100000, // 사이드 프레임 (세트당)
        dualController: 200000  // 듀얼 컨트롤러 (세트당)
    };

    // 총 칸수 계산
    const columns = formData.columns || 5;
    const tiers = formData.tiers || 6;
    const quantity = formData.quantity || 1;
    const totalCells = columns * tiers * quantity;

    // 기본 가격 계산
    const basePrice = totalCells * BASE_PRICE_PER_CELL;

    const prompt = `당신은 락커(물품보관함) 견적 전문 컨설턴트입니다.
내부 영업 직원에게 이 고객 건에 대해 조언해주세요.

[고객 정보]
- 업체명: ${extracted.company_name || '미입력'}
- 업종: ${extracted.industry || '미입력'}
- 요청 칸수: ${extracted.total_lockers || '미입력'}칸
- 설치 지역: ${extracted.region || '미입력'}
- 예산: ${extracted.budget ? extracted.budget.toLocaleString() + '원' : '미입력'}
- 색상 요청: ${extracted.color || '미입력'}
- 설치 희망일: ${extracted.installation_date || '미입력'}
- 담당자: ${extracted.contact_name || '미입력'}

[자동 계산된 구성]
- 열: ${columns}열
- 단: ${tiers}단
- 세트: ${quantity}세트
- 총 칸수: ${totalCells}칸

[가격 정보]
- 기본 가격: 칸당 ${BASE_PRICE_PER_CELL.toLocaleString()}원
- 본체 예상가: ${basePrice.toLocaleString()}원
- 옵션 추가비: 손잡이 ${OPTION_PRICES.handle.toLocaleString()}원/칸, 타공 ${OPTION_PRICES.perforation.toLocaleString()}원/칸, 아크릴 ${OPTION_PRICES.acrylic.toLocaleString()}원/칸
- 프레임: 풀세트 ${OPTION_PRICES.frame_fullSet.toLocaleString()}원, 상부만 ${OPTION_PRICES.frame_topOnly.toLocaleString()}원, 사이드만 ${OPTION_PRICES.frame_sideOnly.toLocaleString()}원

다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "recommended_config": "추천 구성과 그 이유 (2-3문장)",
  "industry_options": "업종 특성에 맞는 옵션 추천 (2-3문장). 업종 정보 없으면 null",
  "budget_review": "예산 대비 검토 (2-3문장). 예산 정보 없으면 null",
  "warnings": "일정, 지역, 특이사항 등 주의점 (1-2문장). 특이사항 없으면 null"
}

조언 규칙:
1. 짧고 핵심만 말하세요
2. 영업 직원이 바로 고객에게 제안할 수 있도록 구체적으로
3. 업종별 특성:
   - 피트니스/헬스장: 타공(환기), 손잡이 권장, 아크릴은 불필요
   - 사우나/찜질방: 타공 필수, 손잡이 권장
   - 학원/학교: 아크릴 권장 (내용물 확인), 타공 선택
   - 사무실: 깔끔한 디자인, 프레임 권장
   - 카페/상업시설: 디자인 중시, 프레임+아크릴 고려
4. 세트 분할 제안: 큰 규격보다 중간 규격 2세트가 설치 유연성 높음`;

    try {
        const genAI = getAI();
        const response = await genAI.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
            config: {
                temperature: 0.3,
                maxOutputTokens: 500,
            }
        });

        // Extract text from response
        let text = '';
        if (response.candidates && response.candidates.length > 0) {
            for (const part of response.candidates[0].content.parts) {
                if (part.text) {
                    text += part.text;
                }
            }
        }

        console.log('Consultant Advice Raw Response:', text.substring(0, 300));

        // Clean up response
        text = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

        // Extract JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            text = jsonMatch[0];
        }

        // Fix string "null" to actual null
        text = text.replace(/:\s*"null"/gi, ': null');

        const advice = JSON.parse(text);

        return {
            recommended_config: advice.recommended_config || null,
            industry_options: advice.industry_options || null,
            budget_review: advice.budget_review || null,
            warnings: advice.warnings || null
        };

    } catch (error) {
        console.error('Error generating consultant advice:', error);
        return null;
    }
}

export default {
    parseConsultationNote,
    convertToFormData,
    generateConsultantAdvice
};
