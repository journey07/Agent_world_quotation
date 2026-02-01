import React, { useState, useRef, useEffect } from 'react';
import InquiryDetailModal from './InquiryDetailModal';

// 상태 정의
const STATUS_OPTIONS = [
    { value: 'inquiry', label: '문의/견적중', color: '#6366f1', bgColor: '#eef2ff' },
    { value: 'sent', label: '견적서 발송', color: '#f59e0b', bgColor: '#fef3c7' },
    { value: 'ordered', label: '수주완료', color: '#10b981', bgColor: '#d1fae5' },
    { value: 'delivered', label: '납품완료', color: '#6b7280', bgColor: '#f3f4f6' }
];

function DataSection({ inquiries, onApplyInquiry, onSaveInquiry, apiUrl, getHeaders }) {
    const [selectedInquiry, setSelectedInquiry] = useState(null);
    const [openStatusDropdown, setOpenStatusDropdown] = useState(null);
    const [updatingStatus, setUpdatingStatus] = useState(null);
    const dropdownRef = useRef(null);

    // 드롭다운 외부 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpenStatusDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getRegionLabel = (region) => {
        const regions = {
            seoul: '서울',
            gyeonggi: '경기',
            incheon: '인천',
            chungcheong: '충청',
            gangwon: '강원',
            jeolla: '전라',
            gyeongsang: '경상',
            jeju: '제주'
        };
        return regions[region] || region;
    };

    const getConfigSummary = (item) => {
        const totalLockers = item.columns * item.tiers * item.quantity;
        return `${totalLockers}칸 | ${item.quantity}세트 | ${item.columns}열x${item.tiers}단`;
    };

    const getStatusInfo = (status) => {
        return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
    };

    const handleStatusClick = (e, itemId) => {
        e.stopPropagation();
        setOpenStatusDropdown(openStatusDropdown === itemId ? null : itemId);
    };

    const handleStatusChange = async (e, item, newStatus) => {
        e.stopPropagation();
        if (item.status === newStatus) {
            setOpenStatusDropdown(null);
            return;
        }

        setUpdatingStatus(item.id);
        setOpenStatusDropdown(null);

        try {
            const response = await fetch(`${apiUrl}/inquiries/${item.id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                throw new Error('상태 변경 실패');
            }

            const result = await response.json();
            onSaveInquiry(result.inquiry);
        } catch (err) {
            console.error('Status update error:', err);
        } finally {
            setUpdatingStatus(null);
        }
    };

    const handleRowClick = (item, e) => {
        // 버튼 클릭 시 row click 무시
        if (e.target.closest('.btn-table-actions')) return;
        // 상태 드롭다운 클릭 시 row click 무시
        if (e.target.closest('.status-cell')) return;
        setSelectedInquiry(item);
    };

    return (
        <div className="glass-card data-section-card">
            <h2>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                문의내역
            </h2>
            <div className="table-container">
                <table className="data-table data-table-compact">
                    <thead>
                        <tr>
                            <th>문의 시각</th>
                            <th>업체명</th>
                            <th>구성</th>
                            <th>연락처</th>
                            <th>지역</th>
                            <th className="col-actions">견적</th>
                            <th className="col-status">상태</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inquiries.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="empty-row">데이터가 없습니다.</td>
                            </tr>
                        ) : (
                            inquiries.map((item) => {
                                const statusInfo = getStatusInfo(item.status);
                                const isDropdownOpen = openStatusDropdown === item.id;
                                const isUpdating = updatingStatus === item.id;

                                return (
                                    <tr
                                        key={item.id}
                                        onClick={(e) => handleRowClick(item, e)}
                                        className="clickable-row"
                                    >
                                        <td>{formatDate(item.timestamp)}</td>
                                        <td className="cell-company">{item.companyName || '-'}</td>
                                        <td className="cell-config">{getConfigSummary(item)}</td>
                                        <td>{item.contact || '-'}</td>
                                        <td>{getRegionLabel(item.region)}</td>
                                        <td className="col-actions">
                                            <div className="btn-table-actions">
                                                <button
                                                    className="btn-table-action"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onApplyInquiry(item);
                                                    }}
                                                >
                                                    Go
                                                </button>
                                            </div>
                                        </td>
                                        <td className="col-status">
                                            <div
                                                className="status-cell"
                                                ref={isDropdownOpen ? dropdownRef : null}
                                            >
                                                <button
                                                    className={`status-badge ${isUpdating ? 'updating' : ''}`}
                                                    style={{
                                                        '--status-color': statusInfo.color,
                                                        '--status-bg': statusInfo.bgColor
                                                    }}
                                                    onClick={(e) => handleStatusClick(e, item.id)}
                                                    disabled={isUpdating}
                                                >
                                                    <span className="status-dot" />
                                                    <span className="status-label">{statusInfo.label}</span>
                                                    <svg className="status-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <polyline points="6 9 12 15 18 9" />
                                                    </svg>
                                                </button>

                                                {isDropdownOpen && (
                                                    <div className="status-dropdown">
                                                        {STATUS_OPTIONS.map((option) => (
                                                            <button
                                                                key={option.value}
                                                                className={`status-option ${item.status === option.value ? 'selected' : ''}`}
                                                                style={{
                                                                    '--option-color': option.color,
                                                                    '--option-bg': option.bgColor
                                                                }}
                                                                onClick={(e) => handleStatusChange(e, item, option.value)}
                                                            >
                                                                <span className="option-dot" />
                                                                <span>{option.label}</span>
                                                                {item.status === option.value && (
                                                                    <svg className="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                                        <polyline points="20 6 9 17 4 12" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* 상세 보기/수정 모달 */}
            <InquiryDetailModal
                inquiry={selectedInquiry}
                onClose={() => setSelectedInquiry(null)}
                onSave={(updatedInquiry) => {
                    onSaveInquiry(updatedInquiry);
                    setSelectedInquiry(updatedInquiry);
                }}
                onApply={onApplyInquiry}
                apiUrl={apiUrl}
                getHeaders={getHeaders}
            />
        </div>
    );
}

export default DataSection;
