import { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import './index.css';
import Loader from './components/Loader';
import DataSection from './components/DataSection';

// 환경 변수에서 API URL 가져오기 (Vite는 import.meta.env 사용)
// 기본 API는 Vercel, 3D 생성만 Render로 분리
const getApiUrl = () => {
  // 환경 변수가 설정되어 있으면 사용
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // 프로덕션 환경에서는 자동으로 백엔드 URL 사용
  if (import.meta.env.PROD || window.location.hostname.includes('vercel.app')) {
    return 'https://agent-world-quotation-backend.vercel.app/api/quote';
  }
  // 개발 환경에서는 localhost 사용
  return 'http://localhost:3001/api/quote';
};

const getApi3DUrl = () => {
  // 환경 변수가 설정되어 있으면 사용
  if (import.meta.env.VITE_API_3D_URL) {
    return import.meta.env.VITE_API_3D_URL;
  }
  // 프로덕션 환경에서는 Render URL 사용 (3D 생성만 Render로 분리)
  if (import.meta.env.PROD || window.location.hostname.includes('vercel.app')) {
    return 'https://agent-world-quotation.onrender.com/api/quote';
  }
  // 개발 환경에서는 localhost 사용
  return 'http://localhost:3001/api/quote';
};

const API_URL = getApiUrl();
const API_3D_URL = getApi3DUrl();

function App() {
  const [formData, setFormData] = useState({
    columns: 5,
    tiers: 6,
    quantity: 1,
    controlPanelColumn: 2, // Which column has the control panel
    controlPanelTiers: 3,  // Control panel tier count for pricing (Default 3)
    options: {
      dualController: false,
      acrylic: false,
      frameType: 'none' // 'none', 'fullSet', 'topOnly', 'sideOnly', 'topAndSide'
    },
    region: 'seoul',
    installationBackground: '깔끔하고 현대적인 오피스 빌딩 로비',
    companyName: '',
    contact: '',
    email: '',
    detailedLocation: ''
  });

  const [result, setResult] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating3D, setGenerating3D] = useState(false);
  const [generatingExcel, setGeneratingExcel] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('2d'); // '2d' or '3d'
  const [activeTab, setActiveTab] = useState('config'); // 'config' or 'data'
  const [showThreeDWarning, setShowThreeDWarning] = useState(false);
  const [inquiries, setInquiries] = useState([]);
  const resultSectionRef = useRef(null);

  // Ensure control panel column is valid when total columns change
  useEffect(() => {
    if (formData.controlPanelColumn > formData.columns) {
      setFormData(prev => ({ ...prev, controlPanelColumn: prev.columns }));
    } else if (formData.controlPanelColumn < 1) {
      setFormData(prev => ({ ...prev, controlPanelColumn: 1 }));
    }
  }, [formData.columns]);

  // Ensure control panel tiers is valid when total tiers change (max = tiers - 2)
  useEffect(() => {
    const maxCPTiers = Math.max(1, formData.tiers - 2);
    if (formData.controlPanelTiers > maxCPTiers) {
      setFormData(prev => ({ ...prev, controlPanelTiers: maxCPTiers }));
    }
  }, [formData.tiers, formData.controlPanelTiers]);

  // Reset view mode to 2d when 3D image is cleared
  useEffect(() => {
    if (!generatedImage && viewMode === '3d') {
      setViewMode('2d');
    }
  }, [generatedImage, viewMode]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' || type === 'range' ? parseInt(value) || 0 : value)
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

  const handleColumnSelect = (colIndex) => {
    setFormData(prev => ({ ...prev, controlPanelColumn: colIndex }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Clear existing 3D image when generating new layout (it won't match the new layout)
    // Must clear before any async operations to ensure UI updates immediately
    if (generatedImage) {
      setGeneratedImage(null);
    }
    if (viewMode !== '2d') {
      setViewMode('2d');
    }

    // Sync detailed location with installation background for 3D generation
    const updatedFormData = {
      ...formData,
      installationBackground: formData.detailedLocation || formData.installationBackground
    };
    setFormData(updatedFormData);

    try {
      // Calculate price
      const calcRes = await fetch(`${API_URL}/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFormData)
      });

      if (!calcRes.ok) {
        const errorData = await calcRes.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.errors?.join(', ') || `가격 계산 실패 (${calcRes.status})`);
      }
      const calcData = await calcRes.json();
      setResult(calcData);

      // Get preview image with frame overlay
      const imgRes = await fetch(`${API_URL}/preview-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          columns: formData.columns,
          tiers: formData.tiers,
          controlPanelColumn: formData.controlPanelColumn,
          controlPanelTiers: formData.controlPanelTiers,
          frameType: formData.options.frameType
        })
      });

      if (imgRes.ok) {
        const imgData = await imgRes.json();
        setPreviewImage(`data:image/png;base64,${imgData.image}`);

        // Scroll to results section
        if (resultSectionRef.current) {
          resultSectionRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } catch (err) {
      console.error('Submit error:', err);
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요. (http://localhost:3001)');
      } else {
        setError(err.message || '알 수 없는 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
      // Refresh inquiries if we are in data tab or after successful save
      fetchInquiries();
    }
  };

  const handleApplyInquiry = (inquiry) => {
    setFormData({
      columns: inquiry.columns,
      tiers: inquiry.tiers,
      quantity: inquiry.quantity,
      controlPanelColumn: inquiry.controlPanelColumn || 1,
      controlPanelTiers: inquiry.controlPanelTiers || 3,
      options: {
        ...inquiry.options
      },
      region: inquiry.region,
      installationBackground: inquiry.installationBackground || '깔끔하고 현대적인 오피스 빌딩 로비',
      companyName: inquiry.companyName,
      contact: inquiry.contact,
      email: inquiry.email,
      detailedLocation: inquiry.detailedLocation
    });
    setActiveTab('config');

    // Clear previous results to force user to click 'Generate' if they want a fresh calculation
    setResult(null);
    setPreviewImage(null);
    setGeneratedImage(null);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fetchInquiries = async (signal) => {
    try {
      const res = await fetch(`${API_URL}/inquiries`, { signal });
      if (res.ok) {
        const data = await res.json();
        setInquiries(data);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Failed to fetch inquiries:', err);
    }
  };

  useEffect(() => {
    console.log('🏁 App component mounted - fetching inquiries');
    const controller = new AbortController();
    fetchInquiries(controller.signal);
    return () => {
      console.log('🛑 App component unmounting');
      controller.abort();
    };
  }, []);

  const handleDownloadExcel = async (force = false) => {
    if (!generatedImage && !force) {
      setShowThreeDWarning(true);
      return;
    }

    setShowThreeDWarning(false);
    setGeneratingExcel(true);
    setError(null);

    try {
      const requestData = {
        ...formData,
        previewImage: previewImage || null,
        generatedImage: generatedImage || null
      };

      const res = await fetch(`${API_URL}/excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || '엑셀 견적서 생성 실패');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // 파일명 형식: 클라이언트_YYMMDD
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2); // YY
      const month = String(now.getMonth() + 1).padStart(2, '0'); // MM
      const day = String(now.getDate()).padStart(2, '0'); // DD
      const dateStr = `${year}${month}${day}`;
      const clientName = formData.companyName || 'WorldLocker';
      const filename = `${clientName}_${dateStr}.xlsx`;

      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Excel download error:', err);
      setError(err.message);
    } finally {
      setGeneratingExcel(false);
    }
  };

  const handleGenerate3D = async () => {
    if (!previewImage) {
      setError('먼저 2D 미리보기를 생성해주세요.');
      return;
    }

    setGenerating3D(true);
    setError(null);

    try {
      // Extract base64 data from data URL
      const base64Data = previewImage.split(',')[1];

      // 3D 생성은 Render로 요청 (타임아웃 100분)
      const res = await fetch(`${API_3D_URL}/generate-3d-installation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Data,
          mimeType: 'image/png',
          frameType: formData.options.frameType,
          columns: formData.columns,
          tiers: formData.tiers,
          installationBackground: formData.installationBackground
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '3D 이미지 생성 실패');
      }

      const data = await res.json();
      setGeneratedImage(`data:image/png;base64,${data.image}`);
      setViewMode('3d');
    } catch (err) {
      console.error('3D generation error:', err);
      setError(err.message);
    } finally {
      setGenerating3D(false);
    }
  };

  const formatPrice = (num) => `₩${num.toLocaleString('ko-KR')}`;

  // Generate column visualizer
  const renderColumnSelector = () => {
    const cols = [];
    for (let i = 1; i <= formData.columns; i++) {
      const isSelected = formData.controlPanelColumn === i;
      cols.push(
        <div
          key={i}
          className={`col-selector-item ${isSelected ? 'selected' : ''}`}
          onClick={() => handleColumnSelect(i)}
          title={`Place Control Panel in Column ${i}`}
        >
          <div className="col-num">{`${i}열`}</div>
          {isSelected && <div className="col-icon">🖥️</div>}
        </div>
      );
    }
    return <div className="col-selector-grid">{cols}</div>;
  };

  return (
    <div className="app">
      <header>
        <div className="title-group">
          <div className="title-row">
            <Loader />
            <div className="title-text">
              <div className="subtitle-en">Locker Quotation Generating Agent</div>
              <h1>보관함 견적 생성 에이전트</h1>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="status-badge">
            <span className="status-dot"></span>
            SYSTEM ONLINE
          </div>
        </div>
      </header>

      <div className="tab-buttons-center">
        <div className="tab-buttons">
          <button
            className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            레이아웃 & 견적
          </button>
          <button
            className={`tab-btn ${activeTab === 'data' ? 'active' : ''}`}
            onClick={() => setActiveTab('data')}
          >
            문의내역
          </button>
        </div>
      </div>

      {/* Excel Generation Loading Modal */}
      {generatingExcel && (
        <div className="excel-loading-modal">
          <div className="excel-loading-content">
            <div className="excel-loading-spinner">
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
            </div>
            <div className="excel-loading-icon">📊</div>
            <h3>견적서 생성 중</h3>
            <p>엑셀 파일을 생성하고 있습니다...</p>
            <div className="excel-progress-bar">
              <div className="excel-progress-fill"></div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'config' ? (
        <div className="grid-container">
          {/* Left: Configuration Form */}
          <div className="glass-card config-panel">
            <h2>
              <div className="icon-box">⚙️</div>
              보관함 구성
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="form-section-title">함 구성</div>
              <div className="input-row-split">
                <div className="form-group">
                  <label>열 (Columns)</label>
                  <input
                    type="number"
                    name="columns"
                    value={formData.columns}
                    onChange={handleChange}
                    min="1"
                    max="20"
                  />
                </div>
                <div className="form-group">
                  <label>단 (Tiers)</label>
                  <input
                    type="number"
                    name="tiers"
                    value={formData.tiers}
                    onChange={handleChange}
                    min="1"
                    max="10"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>제어부 위치 (Control Panel Location)</label>
                <div className="cp-selector-container">
                  <p className="helper-text">Select which column will contain the Control PC:</p>
                  {renderColumnSelector()}
                </div>
              </div>

              <div className="form-group">
                <label>제어부 단수 (Control Panel Tiers)</label>
                <input
                  type="number"
                  name="controlPanelTiers"
                  value={formData.controlPanelTiers}
                  onChange={handleChange}
                  min="1"
                  max={Math.max(1, formData.tiers - 2)}
                />

              </div>

              <div className="form-group">
                <label>세트 수 (Set)</label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  min="1"
                />
              </div>

              <div className="form-section-title">프레임 옵션</div>
              <div className="form-group">
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="frameType"
                      value="none"
                      checked={formData.options.frameType === 'none'}
                      onChange={handleOptionChange}
                    />
                    <span>없음</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="frameType"
                      value="fullSet"
                      checked={formData.options.frameType === 'fullSet'}
                      onChange={handleOptionChange}
                    />
                    <span>프레임 풀세트 (+₩700,000)</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="frameType"
                      value="topOnly"
                      checked={formData.options.frameType === 'topOnly'}
                      onChange={handleOptionChange}
                    />
                    <span>상부 프레임만 (+₩350,000)</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="frameType"
                      value="sideOnly"
                      checked={formData.options.frameType === 'sideOnly'}
                      onChange={handleOptionChange}
                    />
                    <span>사이드 프레임만 (+₩350,000)</span>
                  </label>
                </div>
              </div>

              <div className="form-section-title">기타 옵션</div>
              <div className="form-group">
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="dualController"
                      checked={formData.options.dualController}
                      onChange={handleOptionChange}
                    />
                    <span>듀얼컨트롤러 (+₩200,000)</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="acrylic"
                      checked={formData.options.acrylic}
                      onChange={handleOptionChange}
                    />
                    <span>아크릴 도어 (+₩6,000)</span>
                  </label>
                </div>
              </div>

              <div className="form-section-title">고객 정보</div>

              <div className="form-group">
                <label>업체명</label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="예: (주)에이아이"
                />
              </div>

              <div className="input-row-split">
                <div className="form-group">
                  <label>연락처</label>
                  <input
                    type="text"
                    name="contact"
                    value={formData.contact}
                    onChange={handleChange}
                    placeholder="010-0000-0000"
                  />
                </div>
                <div className="form-group">
                  <label>이메일</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="example@email.com"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>설치 지역 (Installation Region)</label>
                <select name="region" value={formData.region} onChange={handleChange}>
                  <option value="seoul">서울 (+₩500,000)</option>
                  <option value="gyeonggi">경기 (+₩500,000)</option>
                  <option value="incheon">인천 (+₩500,000)</option>
                  <option value="chungcheong">충청 (+₩650,000)</option>
                  <option value="gangwon">강원 (+₩650,000)</option>
                  <option value="jeolla">전라 (+₩750,000)</option>
                  <option value="gyeongsang">경상 (+₩750,000)</option>
                  <option value="jeju">제주 (+₩1,100,000)</option>
                </select>
              </div>

              <div className="form-group">
                <label>상세 설치 장소</label>
                <input
                  type="text"
                  name="detailedLocation"
                  value={formData.detailedLocation}
                  onChange={handleChange}
                  placeholder="예: 회사 1층 로비"
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? '계산 중...' : '레이아웃 & 견적 생성'}
              </button>
            </form>
          </div>

          {/* Right: Preview & Results */}
          <div className="glass-card preview-card" ref={resultSectionRef}>
            <h2>
              <div className="icon-box">🖊️</div>
              레이아웃 & 견적
            </h2>

            <div className="preview-stage">
              {/* View Mode Toggle */}
              {previewImage && generatedImage && (
                <div className="view-mode-toggle">
                  <button
                    className={`mode-btn ${viewMode === '2d' ? 'active' : ''}`}
                    onClick={() => setViewMode('2d')}
                  >
                    📐 2D Layout
                  </button>
                  <button
                    className={`mode-btn ${viewMode === '3d' ? 'active' : ''}`}
                    onClick={() => setViewMode('3d')}
                  >
                    🏢 3D Image
                  </button>
                </div>
              )}

              {/* Loading Overlay */}
              {generating3D && (
                <div className="loading-overlay">
                  <div className="loading-spinner"></div>
                  <div className="loading-text">3D 이미지 생성중...</div>
                </div>
              )}

              {/* Image Display */}
              {viewMode === '2d' || !generatedImage ? (
                previewImage ? (
                  <img key="2d-preview" src={previewImage} alt="Locker 2D Preview" className="preview-image" />
                ) : (
                  <div className="empty-preview">
                    <span>견적 생성 버튼을 눌러주세요</span>
                  </div>
                )
              ) : (
                generatedImage ? (
                  <img key={`3d-${generatedImage.substring(0, 50)}`} src={generatedImage} alt="Locker 3D Installation" className="preview-image" />
                ) : (
                  <div className="empty-preview">
                    <span>3D 설치 이미지를 생성해주세요</span>
                  </div>
                )
              )}

              {/* 3D Generation Control Row */}
              {previewImage && viewMode === '2d' && (
                <div className="gen-control-row">
                  <div className="bg-input-container">
                    <label>상세 설치 장소</label>
                    <input
                      type="text"
                      name="installationBackground"
                      value={formData.installationBackground}
                      onChange={handleChange}
                      placeholder="예: 공항 로비, 헬스장, 지하철역..."
                      className="bg-input"
                    />
                  </div>
                  <UiverseButtonWrapper>
                    <button
                      className="uiverse"
                      onClick={handleGenerate3D}
                      disabled={generating3D}
                    >
                      <div className="wrapper">
                        <span>{generating3D ? '🎨 생성 중...' : '3D 이미지 생성'}</span>
                        <div className="circle circle-12" />
                        <div className="circle circle-11" />
                        <div className="circle circle-10" />
                        <div className="circle circle-9" />
                        <div className="circle circle-8" />
                        <div className="circle circle-7" />
                        <div className="circle circle-6" />
                        <div className="circle circle-5" />
                        <div className="circle circle-4" />
                        <div className="circle circle-3" />
                        <div className="circle circle-2" />
                        <div className="circle circle-1" />
                      </div>
                    </button>
                  </UiverseButtonWrapper>
                </div>
              )}
            </div>

            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}

            {result && (
              <div className="results-container">
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-label">구성</div>
                    <div className="stat-value">{result.input.columns}열 × {result.input.tiers}단</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">총 칸 수</div>
                    <div className="stat-value">{result.input.totalCells}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">세트 수</div>
                    <div className="stat-value">{formData.quantity}</div>
                  </div>
                </div>

                {/* Itemized Breakdown */}
                <div className="price-breakdown">
                  <h3>견적 요약</h3>

                  {/* 제품 섹션 */}
                  <div className="breakdown-section-title">제품</div>
                  <div className="breakdown-item">
                    <span>제어부</span>
                    <span>{formatPrice(result.breakdown.basePrice)}</span>
                  </div>
                  <div className="breakdown-item">
                    <span>{result.breakdown.lockerBodyLabel}</span>
                    <div className="breakdown-price-col">
                      <span className="sub-detail">
                        ({formatPrice(result.breakdown.unitBodyCost)} × {result.breakdown.bodyColumns}열)
                      </span>
                      <span>{formatPrice(result.breakdown.lockerBodyCost)}</span>
                    </div>
                  </div>

                  {result.breakdown.optionsBreakdown && result.breakdown.optionsBreakdown.length > 0 && (
                    <>
                      <div className="breakdown-divider"></div>
                      <div className="breakdown-section-title">옵션</div>
                      {result.breakdown.optionsBreakdown.map((opt, idx) => (
                        <div key={idx} className="breakdown-item option-item">
                          <span>
                            {opt.name}
                            {opt.quantity ? ` x ${opt.quantity}칸` : ''}
                          </span>
                          <div className="breakdown-price-col">
                            {opt.unitPrice && opt.quantity ? (
                              <>
                                <span className="sub-detail">
                                  ({formatPrice(opt.unitPrice)} × {opt.quantity}칸)
                                </span>
                                <span>{formatPrice(opt.price)}</span>
                              </>
                            ) : (
                              <span>{formatPrice(opt.price)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  <div className="breakdown-divider"></div>
                  <div className="breakdown-item subtotal-row">
                    <span>1세트 단가 합계</span>
                    <span>{formatPrice(result.breakdown.subtotalPerUnit)}</span>
                  </div>
                  <div className="breakdown-item quantity-row">
                    <span>세트 수</span>
                    <span>× {result.breakdown.quantity}</span>
                  </div>
                  <div className="breakdown-divider"></div>
                  <div className="breakdown-item">
                    <span>제품 총 합계</span>
                    <span className="total-amount">{formatPrice(result.breakdown.subtotalPerUnit * result.breakdown.quantity)}</span>
                  </div>

                  {/* 설치운반비 섹션 */}
                  <div className="breakdown-divider heavy"></div>
                  <div className="breakdown-section-title">설치운반비</div>
                  <div className="breakdown-item">
                    <span>설치운반비 ({result.breakdown.regionLabel})</span>
                    <span>{formatPrice(result.breakdown.installationCost)}</span>
                  </div>

                  {/* 최종 합계 */}
                  <div className="breakdown-divider heavy"></div>
                  <div className="breakdown-item final-total-row">
                    <span>총 합계</span>
                    <span className="total-amount">{formatPrice(result.summary.total)}</span>
                  </div>
                  <div className="vat-notice">* VAT 별도</div>

                  <div className="action-row">
                    <button
                      onClick={() => handleDownloadExcel(false)}
                      className="btn-excel"
                      disabled={generatingExcel}
                    >
                      {generatingExcel ? (
                        <>
                          <span className="btn-spinner"></span>
                          견적서 생성 중...
                        </>
                      ) : (
                        <>견적서 다운로드</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3D Warning Modal */}
            {showThreeDWarning && (
              <div className="excel-loading-modal" style={{ zIndex: 1000 }}>
                <div className="excel-loading-content" style={{ maxWidth: '400px' }}>
                  <div className="excel-loading-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="4" y="8" width="16" height="12" rx="2" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <line x1="12" y1="4" x2="12" y2="8" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="2" r="1.5" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      {/* Left Eye (Red X) */}
                      <path d="M7 11L10 14M10 11L7 14" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      {/* Right Eye (Red X) */}
                      <path d="M14 11L17 14M17 11L14 14" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      {/* Mouth */}
                      <path d="M9 17H15" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h3 style={{ marginBottom: '16px', color: '#0f172a', letterSpacing: '-0.02em' }}>3D 이미지가 없습니다</h3>
                  <p style={{ marginBottom: '24px', lineHeight: '1.6', fontSize: '1.35rem', color: '#475569' }}>
                    먼저 3D 이미지를 생성하시겠습니까?
                  </p>
                  <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                    <button
                      className="btn-primary btn-slate"
                      style={{ margin: 0, flex: 1 }}
                      onClick={() => handleDownloadExcel(true)}
                    >
                      그대로 다운로드
                    </button>
                    <button
                      className="btn-primary"
                      style={{ margin: 0, flex: 1 }}
                      onClick={() => {
                        setShowThreeDWarning(false);
                        setViewMode('2d');
                        // Scroll to 3D generation section
                        const genBtn = document.querySelector('.uiverse');
                        if (genBtn) genBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                    >
                      3D 이미지 생성
                    </button>
                  </div>
                  <button
                    style={{
                      marginTop: '32px',
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      fontSize: '1rem'
                    }}
                    onClick={() => setShowThreeDWarning(false)}
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <DataSection inquiries={inquiries} onApplyInquiry={handleApplyInquiry} />
      )}
    </div>
  );
}

const UiverseButtonWrapper = styled.div`
  .uiverse {
    --duration: 7s;
    --easing: linear;
    --c-color-1: rgba(30, 58, 138, 0.7);
    --c-color-2: #1e3a8a;
    --c-color-3: #1e40af;
    --c-color-4: rgba(30, 58, 138, 0.7);
    --c-shadow: rgba(30, 58, 138, 0.5);
    --c-shadow-inset-top: rgba(15, 23, 42, 0.9);
    --c-shadow-inset-bottom: rgba(59, 130, 246, 0.8);
    --c-radial-inner: #1e3a8a;
    --c-radial-outer: #3b82f6;
    --c-color: #fff;
    -webkit-tap-highlight-color: transparent;
    -webkit-appearance: none;
    outline: none;
    position: relative;
    cursor: pointer;
    border: none;
    display: table;
    border-radius: 22px;
    padding: 0;
    margin: 0;
    text-align: center;
    font-weight: 600;
    font-size: 16px;
    letter-spacing: 0.02em;
    line-height: 1.5;
    color: var(--c-color);
    background: radial-gradient(
      circle,
      var(--c-radial-inner),
      var(--c-radial-outer) 80%
    );
    box-shadow: 0 0 14px var(--c-shadow);
  }

  .uiverse:before {
    content: "";
    pointer-events: none;
    position: absolute;
    z-index: 3;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    border-radius: 22px;
    box-shadow:
      inset 0 3px 12px var(--c-shadow-inset-top),
      inset 0 -3px 4px var(--c-shadow-inset-bottom);
  }

  .uiverse .wrapper {
    -webkit-mask-image: -webkit-radial-gradient(white, black);
    overflow: hidden;
    border-radius: 22px;
    min-width: 200px;
    padding: 12px 0;
  }

  .uiverse .wrapper span {
    display: inline-block;
    position: relative;
    z-index: 1;
  }

  .uiverse:hover {
    --duration: 1400ms;
  }

  .uiverse .wrapper .circle {
    position: absolute;
    left: 0;
    top: 0;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    filter: blur(var(--blur, 8px));
    background: var(--background, transparent);
    transform: translate(var(--x, 0), var(--y, 0)) translateZ(0);
    animation: var(--animation, none) var(--duration) var(--easing) infinite;
  }

  .uiverse .wrapper .circle.circle-1,
  .uiverse .wrapper .circle.circle-9,
  .uiverse .wrapper .circle.circle-10 {
    --background: var(--c-color-4);
  }

  .uiverse .wrapper .circle.circle-3,
  .uiverse .wrapper .circle.circle-4 {
    --background: var(--c-color-2);
    --blur: 14px;
  }

  .uiverse .wrapper .circle.circle-5,
  .uiverse .wrapper .circle.circle-6 {
    --background: var(--c-color-3);
    --blur: 16px;
  }

  .uiverse .wrapper .circle.circle-2,
  .uiverse .wrapper .circle.circle-7,
  .uiverse .wrapper .circle.circle-8,
  .uiverse .wrapper .circle.circle-11,
  .uiverse .wrapper .circle.circle-12 {
    --background: var(--c-color-1);
    --blur: 12px;
  }

  .uiverse .wrapper .circle.circle-1 {
    --x: 0;
    --y: -40px;
    --animation: circle-1;
  }

  .uiverse .wrapper .circle.circle-2 {
    --x: 160px;
    --y: 8px;
    --animation: circle-2;
  }

  .uiverse .wrapper .circle.circle-3 {
    --x: -12px;
    --y: -12px;
    --animation: circle-3;
  }

  .uiverse .wrapper .circle.circle-4 {
    --x: 140px;
    --y: -12px;
    --animation: circle-4;
  }

  .uiverse .wrapper .circle.circle-5 {
    --x: 40px;
    --y: -4px;
    --animation: circle-5;
  }

  .uiverse .wrapper .circle.circle-6 {
    --x: 110px;
    --y: 16px;
    --animation: circle-6;
  }

  .uiverse .wrapper .circle.circle-7 {
    --x: 20px;
    --y: 28px;
    --animation: circle-7;
  }

  .uiverse .wrapper .circle.circle-8 {
    --x: 60px;
    --y: -4px;
    --animation: circle-8;
  }

  .uiverse .wrapper .circle.circle-9 {
    --x: 80px;
    --y: -12px;
    --animation: circle-9;
  }

  .uiverse .wrapper .circle.circle-10 {
    --x: 130px;
    --y: 16px;
    --animation: circle-10;
  }

  .uiverse .wrapper .circle.circle-11 {
    --x: 10px;
    --y: 4px;
    --animation: circle-11;
  }

  .uiverse .wrapper .circle.circle-12 {
    --blur: 14px;
    --x: 120px;
    --y: 4px;
    --animation: circle-12;
  }

  .uiverse:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    filter: grayscale(0.5);
  }

  @keyframes circle-1 {
    33% {
      transform: translate(0px, 16px) translateZ(0);
    }

    66% {
      transform: translate(12px, 64px) translateZ(0);
    }
  }

  @keyframes circle-2 {
    33% {
      transform: translate(140px, -10px) translateZ(0);
    }

    66% {
      transform: translate(130px, -48px) translateZ(0);
    }
  }

  @keyframes circle-3 {
    33% {
      transform: translate(20px, 12px) translateZ(0);
    }

    66% {
      transform: translate(12px, 4px) translateZ(0);
    }
  }

  @keyframes circle-4 {
    33% {
      transform: translate(120px, -12px) translateZ(0);
    }

    66% {
      transform: translate(160px, -8px) translateZ(0);
    }
  }

  @keyframes circle-5 {
    33% {
      transform: translate(140px, 28px) translateZ(0);
    }

    66% {
      transform: translate(80px, -32px) translateZ(0);
    }
  }

  @keyframes circle-6 {
    33% {
      transform: translate(60px, -16px) translateZ(0);
    }

    66% {
      transform: translate(130px, -56px) translateZ(0);
    }
  }

  @keyframes circle-7 {
    33% {
      transform: translate(20px, 28px) translateZ(0);
    }

    66% {
      transform: translate(40px, -60px) translateZ(0);
    }
  }

  @keyframes circle-8 {
    33% {
      transform: translate(60px, -4px) translateZ(0);
    }

    66% {
      transform: translate(100px, -20px) translateZ(0);
    }
  }

  @keyframes circle-9 {
    33% {
      transform: translate(80px, -12px) translateZ(0);
    }

    66% {
      transform: translate(140px, -8px) translateZ(0);
    }
  }

  @keyframes circle-10 {
    33% {
      transform: translate(120px, 20px) translateZ(0);
    }

    66% {
      transform: translate(180px, 28px) translateZ(0);
    }
  }

  @keyframes circle-11 {
    33% {
      transform: translate(10px, 4px) translateZ(0);
    }

    66% {
      transform: translate(120px, 20px) translateZ(0);
    }
  }

  @keyframes circle-12 {
    33% {
      transform: translate(100px, 0px) translateZ(0);
    }

    66% {
      transform: translate(110px, -32px) translateZ(0);
    }
  }
`;

export default App;

