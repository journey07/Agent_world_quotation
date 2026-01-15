import React from 'react';

function DataSection({ inquiries, onApplyInquiry }) {
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

    const getFrameLabel = (type) => {
        const labels = {
            none: '없음',
            fullSet: '프레임 풀세트',
            topOnly: '상부 프레임만',
            sideOnly: '사이드 프레임만',
            topAndSide: '상부&사이드'
        };
        return labels[type] || type;
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

    return (
        <div className="glass-card data-section-card">
            <h2>
                <div className="icon-box">💬</div>
                문의내역
            </h2>
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>문의 시각</th>
                            <th>업체명</th>
                            <th>연락처</th>
                            <th>이메일</th>
                            <th>설치 지역</th>
                            <th>상세 설치 장소</th>
                            <th>단 수</th>
                            <th>열 수</th>
                            <th>세트 수</th>
                            <th>프레임 옵션</th>
                            <th>자동 생성</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inquiries.length === 0 ? (
                            <tr>
                                <td colSpan="11" className="empty-row">데이터가 없습니다.</td>
                            </tr>
                        ) : (
                            inquiries.map((item) => (
                                <tr key={item.id}>
                                    <td className="sticky-col">{formatDate(item.timestamp)}</td>
                                    <td>{item.companyName || '-'}</td>
                                    <td>{item.contact || '-'}</td>
                                    <td>{item.email || '-'}</td>
                                    <td>{getRegionLabel(item.region)}</td>
                                    <td>{item.detailedLocation || '-'}</td>
                                    <td>{item.tiers}단</td>
                                    <td>{item.columns}열</td>
                                    <td>{item.quantity}세트</td>
                                    <td>{getFrameLabel(item.options?.frameType)}</td>
                                    <td>
                                        <button
                                            className="btn-table-action"
                                            onClick={() => onApplyInquiry(item)}
                                        >
                                            레이아웃 & 견적 생성
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default DataSection;
