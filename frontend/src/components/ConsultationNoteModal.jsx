import React, { useState, useEffect } from 'react';
import './ConsultationNoteModal.css';

/**
 * 필드명 한글 매핑
 */
const FIELD_LABELS = {
  company_name: '고객명/회사명',
  columns: '열 수',
  tiers: '단 수',
  '함 수': '함 수',
  total_lockers: '함 수',
  TOTAL_LOCKERS: '함 수',
  '세트 수': '세트 수',
  quantity: '세트 수',
  QUANTITY: '세트 수',
  '함 색상': '함 색상',
  color: '함 색상',
  COLOR: '함 색상',
  region: '설치 지역',
  REGION: '설치 지역',
  contact_name: '담당자명',
  CONTACT_NAME: '담당자명',
  contact_phone: '연락처',
  CONTACT_PHONE: '연락처',
  industry: '업종',
  INDUSTRY: '업종',
  frame_type: '프레임 타입',
  FRAME_TYPE: '프레임 타입',
  installation_date: '설치 희망일',
  INSTALLATION_DATE: '설치 희망일',
  contact_email: '이메일',
  CONTACT_EMAIL: '이메일',
  budget: '예산',
  BUDGET: '예산',
  handle: '손잡이',
  HANDLE: '손잡이',
  acrylic: '아크릴 도어',
  ACRYLIC: '아크릴 도어',
  dual_controller: '듀얼컨트롤러',
  DUAL_CONTROLLER: '듀얼컨트롤러'
};

/**
 * ConsultationNoteModal - 상담 노트 모달
 * 자유 형식 메모 입력 → AI 파싱 → 구조화된 데이터
 */
function ConsultationNoteModal({
  isOpen,
  onClose,
  onSave,
  apiUrl,
  getHeaders
}) {
  const [note, setNote] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [error, setError] = useState(null);

  // 모달 닫기 및 초기화
  const handleClose = () => {
    setNote('');
    setParseResult(null);
    setError(null);
    setIsParsing(false);
    onClose();
  };

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, handleClose]);

  // AI 분석하기
  const handleParse = async () => {
    if (!note.trim()) {
      setError('상담 내용을 입력해주세요.');
      return;
    }

    setIsParsing(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/parse-consultation`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ note: note.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `파싱 실패 (${response.status})`);
      }

      const result = await response.json();
      setParseResult(result);
    } catch (err) {
      console.error('Parse error:', err);
      setError(err.message || 'AI 분석 중 오류가 발생했습니다.');
    } finally {
      setIsParsing(false);
    }
  };

  // 문의 목록에 저장 + DB 저장
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!parseResult || !parseResult.formData) return;

    setIsSaving(true);
    setError(null);

    try {
      // DB에 저장
      const response = await fetch(`${apiUrl}/inquiries`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          ...parseResult.formData,
          rawNote: note,
          industry: parseResult.extracted?.industry || null,
          contactName: parseResult.extracted?.contact_name || null,
          installationDate: parseResult.extracted?.installation_date || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `저장 실패 (${response.status})`);
      }

      // 성공 시 부모 컴포넌트에 알림
      onSave(parseResult.formData, parseResult.extracted);
      handleClose();
    } catch (err) {
      console.error('Save error:', err);
      setError(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 계속 메모하기 (결과 화면에서 돌아가기)
  const handleContinueNote = () => {
    setParseResult(null);
  };

  // 값 포맷팅
  const formatValue = (key, value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'O' : 'X';

    const keyLower = key.toLowerCase();

    // 함 색상: AI가 추출한 값 그대로 표시
    if (keyLower === 'color' || key === '함 색상') {
      return value;
    }

    // 지역, 프레임: 그대로 표시
    if (keyLower === 'region' || keyLower === 'frame_type') {
      return value;
    }

    // 예산
    if (keyLower === 'budget') return `${value.toLocaleString()}원`;

    return value;
  };

  if (!isOpen) return null;

  return (
    <div className="consultation-modal-overlay" onClick={handleClose}>
      <div className="consultation-modal" onClick={(e) => e.stopPropagation()}>
        <div className={`consultation-modal-header ${parseResult ? 'header-complete' : 'header-new'}`}>
          <div className="header-content">
            <span className="header-status-dot"></span>
            <h2>{parseResult ? '분석 완료' : '새 상담'}</h2>
          </div>
          <button className="close-btn" onClick={handleClose} aria-label="닫기">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="consultation-modal-body">
          {!parseResult ? (
            /* 메모 입력 화면 */
            <>
              <div className="note-input-section">
                <textarea
                  className="note-textarea"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={`전화하면서 자유롭게 메모하세요.

예시)
크로스핏짐, 300칸, 3세트, 8단 구성. 함체 블랙, 다음달 초 오픈 희망, 홍길동 010-1234-5678`}
                  rows={12}
                  autoFocus
                />
              </div>

              {error && (
                <div className="error-message">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                  {error}
                </div>
              )}

              <div className="note-actions">
                <button
                  className="parse-btn"
                  onClick={handleParse}
                  disabled={isParsing || !note.trim()}
                >
                  {isParsing ? (
                    <>
                      <span className="spinner"></span>
                      분석 중...
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                        <path d="M11 8v6M8 11h6" />
                      </svg>
                      분석해줘
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            /* 파싱 결과 화면 */
            <>
              <div className="parse-result-section">
                {/* 취합된 정보 */}
                <div className="result-card extracted-card">
                  <h3 className="result-card-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 12l2 2 4-4" />
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                    </svg>
                    취합된 정보
                  </h3>
                  <div className="extracted-grid">
                    {Object.entries(parseResult.extracted || {}).map(([key, value]) => {
                      // 제외할 필드: frame_color (블랙 고정)
                      if (value === null || value === undefined) return null;
                      if (key.toLowerCase() === 'frame_color') return null;

                      return (
                        <div key={key} className="extracted-item">
                          <span className="extracted-label">{FIELD_LABELS[key] || key}</span>
                          <span className="extracted-value">{formatValue(key, value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 미취합 정보 */}
                {(parseResult.missing_required?.length > 0 || parseResult.missing_recommended?.length > 0) && (
                  <div className="result-card missing-card">
                    <h3 className="result-card-title">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      미취합 정보
                    </h3>
                    <div className="missing-list">
                      {parseResult.missing_required?.map((field) => (
                        <span key={field} className="missing-tag required">
                          {FIELD_LABELS[field] || field}
                          <span className="tag-type">필수</span>
                        </span>
                      ))}
                      {parseResult.missing_recommended?.map((field) => (
                        <span key={field} className="missing-tag recommended">
                          {FIELD_LABELS[field] || field}
                          <span className="tag-type">권장</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 에이전트의 추천 - 추천 질문 + 컨설턴트 조언 통합 */}
                {(parseResult.suggested_questions?.length > 0 || parseResult.consultant_advice) && (
                  <div className="result-card consultant-card">
                    <div className="consultant-header">
                      <h3 className="result-card-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M12 2L2 7l10 5 10-5-10-5z" />
                          <path d="M2 17l10 5 10-5" />
                          <path d="M2 12l10 5 10-5" />
                        </svg>
                        에이전트의 추천
                      </h3>
                      <span className="consultant-badge">AI Consultant</span>
                    </div>
                    <div className="advice-content">
                      {/* 추천 질문 */}
                      {parseResult.suggested_questions?.length > 0 && (
                        <div className="advice-section questions-section">
                          <h4 className="advice-section-title">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            추천 질문
                          </h4>
                          <ul className="insight-question-list">
                            {parseResult.suggested_questions.map((q, i) => (
                              <li key={i} className="insight-question-item">{q}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {/* 추천 구성 */}
                      {parseResult.consultant_advice?.recommended_config && (
                        <div className="advice-section">
                          <h4 className="advice-section-title">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="3" width="7" height="7" />
                              <rect x="14" y="3" width="7" height="7" />
                              <rect x="14" y="14" width="7" height="7" />
                              <rect x="3" y="14" width="7" height="7" />
                            </svg>
                            추천 구성
                          </h4>
                          <p className="advice-text">{parseResult.consultant_advice.recommended_config}</p>
                        </div>
                      )}
                      {/* 업종 맞춤 옵션 */}
                      {parseResult.consultant_advice?.industry_options && (
                        <div className="advice-section">
                          <h4 className="advice-section-title">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M2 20h20M5 20V10l7-7 7 7v10M9 20v-6h6v6" />
                            </svg>
                            업종 맞춤 옵션
                          </h4>
                          <p className="advice-text">{parseResult.consultant_advice.industry_options}</p>
                        </div>
                      )}
                      {/* 예산 검토 */}
                      {parseResult.consultant_advice?.budget_review && (
                        <div className="advice-section">
                          <h4 className="advice-section-title">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="12" y1="1" x2="12" y2="23" />
                              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                            </svg>
                            예산 검토
                          </h4>
                          <p className="advice-text">{parseResult.consultant_advice.budget_review}</p>
                        </div>
                      )}
                      {/* 주의사항 */}
                      {parseResult.consultant_advice?.warnings && (
                        <div className="advice-section warning-section">
                          <h4 className="advice-section-title">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                              <line x1="12" y1="9" x2="12" y2="13" />
                              <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            주의사항
                          </h4>
                          <p className="advice-text">{parseResult.consultant_advice.warnings}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 완료 상태 표시 */}
                {parseResult.is_complete && (
                  <div className="complete-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 12l2 2 4-4" />
                      <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                    </svg>
                    필수 정보 취합 완료
                  </div>
                )}
              </div>

              <div className="result-actions">
                <button className="continue-btn" onClick={handleContinueNote}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  계속 메모
                </button>
                <button
                  className="save-btn"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <span className="spinner"></span>
                      저장 중...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                      </svg>
                      저장
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConsultationNoteModal;
