import React, { useState, useEffect } from 'react';

// 상태 정의 (DataSection과 동일)
const STATUS_OPTIONS = [
    { value: 'inquiry', label: '문의/견적중', color: '#6366f1', bgColor: '#eef2ff' },
    { value: 'sent', label: '견적서 발송', color: '#f59e0b', bgColor: '#fef3c7' },
    { value: 'ordered', label: '수주완료', color: '#10b981', bgColor: '#d1fae5' },
    { value: 'delivered', label: '납품완료', color: '#6b7280', bgColor: '#f3f4f6' }
];

function InquiryDetailModal({ inquiry, onClose, onSave, onApply, apiUrl, getHeaders }) {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [error, setError] = useState(null);

    // inquiry가 변경되면 formData 초기화
    useEffect(() => {
        if (inquiry) {
            setFormData({
                companyName: inquiry.companyName || '',
                industry: inquiry.industry || '',
                contact: inquiry.contact || '',
                email: inquiry.email || '',
                contactName: inquiry.contactName || '',
                region: inquiry.region || '',
                detailedLocation: inquiry.detailedLocation || '',
                installationDate: inquiry.installationDate || '',
                columns: inquiry.columns || '',
                tiers: inquiry.tiers || '',
                quantity: inquiry.quantity || '',
                status: inquiry.status || 'inquiry',
                options: {
                    lockerColor: inquiry.options?.lockerColor || '',
                    frameType: inquiry.options?.frameType || '',
                    handle: inquiry.options?.handle || false,
                    acrylic: inquiry.options?.acrylic || false,
                    dualController: inquiry.options?.dualController || false,
                    perforation: inquiry.options?.perforation || false
                },
                rawNote: inquiry.rawNote || ''
            });
            setIsEditing(false);
            setError(null);
        }
    }, [inquiry]);

    const getStatusInfo = (status) => {
        return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
    };

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                if (isEditing) {
                    setIsEditing(false);
                } else {
                    onClose();
                }
            }
        };

        if (inquiry) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [inquiry, onClose, isEditing]);

    if (!inquiry) return null;

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const yy = String(date.getFullYear()).slice(2);
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${yy}.${mm}.${dd} ${hh}:${min}`;
    };

    const getCompanyDisplay = () => {
        const name = formData.companyName || '-';
        const industry = formData.industry;
        if (industry && name !== '-') {
            return `${name}(${industry})`;
        }
        return name;
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleOptionChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            options: {
                ...prev.options,
                [name]: type === 'checkbox' ? checked : value
            }
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);

        try {
            const response = await fetch(`${apiUrl}/inquiries/${inquiry.id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({
                    ...formData,
                    columns: formData.columns ? parseInt(formData.columns) : null,
                    tiers: formData.tiers ? parseInt(formData.tiers) : null,
                    quantity: formData.quantity ? parseInt(formData.quantity) : null
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `저장 실패 (${response.status})`);
            }

            const result = await response.json();
            onSave(result.inquiry);

            // 성공 피드백 표시
            setSaveSuccess(true);
            setTimeout(() => {
                setSaveSuccess(false);
                setIsEditing(false);
            }, 1000);
        } catch (err) {
            console.error('Save error:', err);
            setError(err.message || '저장 중 오류가 발생했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        // 원래 값으로 복원
        setFormData({
            companyName: inquiry.companyName || '',
            industry: inquiry.industry || '',
            contact: inquiry.contact || '',
            email: inquiry.email || '',
            contactName: inquiry.contactName || '',
            region: inquiry.region || '',
            detailedLocation: inquiry.detailedLocation || '',
            installationDate: inquiry.installationDate || '',
            columns: inquiry.columns || '',
            tiers: inquiry.tiers || '',
            quantity: inquiry.quantity || '',
            status: inquiry.status || 'inquiry',
            options: {
                lockerColor: inquiry.options?.lockerColor || '',
                frameType: inquiry.options?.frameType || '',
                handle: inquiry.options?.handle || false,
                acrylic: inquiry.options?.acrylic || false,
                dualController: inquiry.options?.dualController || false,
                perforation: inquiry.options?.perforation || false
            },
            rawNote: inquiry.rawNote || ''
        });
        setIsEditing(false);
        setError(null);
    };

    // 총 칸 수 계산
    const totalCells = (formData.columns && formData.tiers && formData.quantity)
        ? parseInt(formData.columns) * parseInt(formData.tiers) * parseInt(formData.quantity)
        : null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="inquiry-detail-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>
                        <span className="header-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                            </svg>
                        </span>
                        {isEditing ? '문의 수정' : '문의 상세'}
                        {/* 상태 배지 - 타이틀 옆 (읽기 전용) */}
                        <span
                            className="status-badge-header"
                            style={{
                                '--status-color': getStatusInfo(formData.status).color,
                                '--status-bg': getStatusInfo(formData.status).bgColor
                            }}
                        >
                            <span className="status-dot" />
                            {getStatusInfo(formData.status).label}
                        </span>
                    </h2>
                    <div className="header-actions">
                        {isEditing ? (
                            <>
                                <button className="btn-secondary btn-sm" onClick={handleCancel} disabled={isSaving || saveSuccess}>
                                    취소
                                </button>
                                <button
                                    className={`btn-primary btn-sm ${saveSuccess ? 'btn-success' : ''}`}
                                    onClick={handleSave}
                                    disabled={isSaving || saveSuccess}
                                >
                                    {saveSuccess ? (
                                        <>
                                            <svg className="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                            완료
                                        </>
                                    ) : isSaving ? '저장 중...' : '저장'}
                                </button>
                            </>
                        ) : (
                            <>
                                <button className="btn-secondary btn-sm" onClick={() => setIsEditing(true)}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                    수정
                                </button>
                                <button className="btn-primary btn-sm" onClick={() => { onApply(inquiry); onClose(); }}>
                                    견적 생성
                                </button>
                            </>
                        )}
                        <button className="close-btn" onClick={onClose} aria-label="닫기">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="modal-body">
                    {error && (
                        <div className="error-banner">
                            {error}
                        </div>
                    )}

                    {/* 기본 정보 */}
                    <section className="detail-section">
                        <h3>기본 정보</h3>
                        <div className="detail-grid">
                            <div className="detail-item">
                                <label>문의 시각</label>
                                <span>{formatDate(inquiry.timestamp)}</span>
                            </div>
                            <div className="detail-item">
                                <label>업체명</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="companyName"
                                        value={formData.companyName}
                                        onChange={handleChange}
                                        placeholder="업체명"
                                    />
                                ) : (
                                    <span>{getCompanyDisplay()}</span>
                                )}
                            </div>
                            <div className="detail-item">
                                <label>연락처</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="contact"
                                        value={formData.contact}
                                        onChange={handleChange}
                                        placeholder="010-0000-0000"
                                    />
                                ) : (
                                    <span>{formData.contact || '-'}</span>
                                )}
                            </div>
                            <div className="detail-item">
                                <label>이메일</label>
                                {isEditing ? (
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="email@example.com"
                                    />
                                ) : (
                                    <span>{formData.email || '-'}</span>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* 설치 정보 */}
                    <section className="detail-section">
                        <h3>설치 정보</h3>
                        <div className="detail-grid">
                            <div className="detail-item">
                                <label>설치 지역</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="region"
                                        value={formData.region}
                                        onChange={handleChange}
                                        placeholder="서울, 경기 등"
                                    />
                                ) : (
                                    <span>{formData.region || '-'}</span>
                                )}
                            </div>
                            <div className="detail-item">
                                <label>상세 장소</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="detailedLocation"
                                        value={formData.detailedLocation}
                                        onChange={handleChange}
                                        placeholder="로비, 탈의실 등"
                                    />
                                ) : (
                                    <span>{formData.detailedLocation || '-'}</span>
                                )}
                            </div>
                            <div className="detail-item">
                                <label>설치 희망일</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="installationDate"
                                        value={formData.installationDate}
                                        onChange={handleChange}
                                        placeholder="2월 중순"
                                    />
                                ) : (
                                    <span>{formData.installationDate || '-'}</span>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* 보관함 구성 */}
                    <section className="detail-section">
                        <h3>보관함 구성</h3>
                        <div className="detail-grid">
                            <div className="detail-item">
                                <label>열 수</label>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        name="columns"
                                        value={formData.columns}
                                        onChange={handleChange}
                                        min="1"
                                        max="50"
                                    />
                                ) : (
                                    <span className="value-highlight">{formData.columns ? `${formData.columns}열` : '-'}</span>
                                )}
                            </div>
                            <div className="detail-item">
                                <label>단 수</label>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        name="tiers"
                                        value={formData.tiers}
                                        onChange={handleChange}
                                        min="1"
                                        max="10"
                                    />
                                ) : (
                                    <span className="value-highlight">{formData.tiers ? `${formData.tiers}단` : '-'}</span>
                                )}
                            </div>
                            <div className="detail-item">
                                <label>세트 수</label>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        name="quantity"
                                        value={formData.quantity}
                                        onChange={handleChange}
                                        min="1"
                                    />
                                ) : (
                                    <span className="value-highlight">{formData.quantity ? `${formData.quantity}세트` : '-'}</span>
                                )}
                            </div>
                            <div className="detail-item">
                                <label>총 칸 수</label>
                                <span className="value-highlight">{totalCells ? `${totalCells}칸` : '-'}</span>
                            </div>
                        </div>
                    </section>

                    {/* 옵션 */}
                    <section className="detail-section">
                        <h3>옵션</h3>
                        <div className="detail-grid">
                            <div className="detail-item">
                                <label>함 색상</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="lockerColor"
                                        value={formData.options?.lockerColor || ''}
                                        onChange={handleOptionChange}
                                        placeholder="화이트, 블랙 등"
                                    />
                                ) : (
                                    <span>{formData.options?.lockerColor || '-'}</span>
                                )}
                            </div>
                            <div className="detail-item">
                                <label>프레임</label>
                                {isEditing ? (
                                    <select
                                        name="frameType"
                                        value={formData.options?.frameType || ''}
                                        onChange={handleOptionChange}
                                    >
                                        <option value="">선택</option>
                                        <option value="풀옵션">풀옵션</option>
                                        <option value="상부만">상부만</option>
                                        <option value="사이드만">사이드만</option>
                                    </select>
                                ) : (
                                    <span>{formData.options?.frameType || '-'}</span>
                                )}
                            </div>
                            <div className="detail-item">
                                <label>손잡이</label>
                                {isEditing ? (
                                    <label className="checkbox-inline">
                                        <input
                                            type="checkbox"
                                            name="handle"
                                            checked={formData.options?.handle || false}
                                            onChange={handleOptionChange}
                                        />
                                        <span>있음</span>
                                    </label>
                                ) : (
                                    <span>{formData.options?.handle ? '있음' : '없음'}</span>
                                )}
                            </div>
                            <div className="detail-item">
                                <label>아크릴</label>
                                {isEditing ? (
                                    <label className="checkbox-inline">
                                        <input
                                            type="checkbox"
                                            name="acrylic"
                                            checked={formData.options?.acrylic || false}
                                            onChange={handleOptionChange}
                                        />
                                        <span>있음</span>
                                    </label>
                                ) : (
                                    <span>{formData.options?.acrylic ? '있음' : '없음'}</span>
                                )}
                            </div>
                            <div className="detail-item">
                                <label>듀얼 컨트롤러</label>
                                {isEditing ? (
                                    <label className="checkbox-inline">
                                        <input
                                            type="checkbox"
                                            name="dualController"
                                            checked={formData.options?.dualController || false}
                                            onChange={handleOptionChange}
                                        />
                                        <span>있음</span>
                                    </label>
                                ) : (
                                    <span>{formData.options?.dualController ? '있음' : '없음'}</span>
                                )}
                            </div>
                            <div className="detail-item">
                                <label>타공 디자인</label>
                                {isEditing ? (
                                    <label className="checkbox-inline">
                                        <input
                                            type="checkbox"
                                            name="perforation"
                                            checked={formData.options?.perforation || false}
                                            onChange={handleOptionChange}
                                        />
                                        <span>있음</span>
                                    </label>
                                ) : (
                                    <span>{formData.options?.perforation ? '있음' : '없음'}</span>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* 메모 */}
                    <section className="detail-section">
                        <h3>메모</h3>
                        {isEditing ? (
                            <textarea
                                className="memo-textarea"
                                name="rawNote"
                                value={formData.rawNote}
                                onChange={handleChange}
                                placeholder="기타 메모사항"
                                rows={3}
                            />
                        ) : (
                            <div className="memo-content">
                                {formData.rawNote || '-'}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}

export default InquiryDetailModal;
