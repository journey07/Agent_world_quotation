import { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import './index.css';
import Loader from './components/Loader';
import DataSection from './components/DataSection';

import WorkflowModal from './components/WorkflowModal';
import NumberStepper from './components/NumberStepper';

// 환경 변수에서 API URL 가져오기 (Vite는 import.meta.env 사용)
// 프로덕션에서는 Vercel Backend 사용 (일반 API)
const getApiUrl = () => {
  // 환경 변수가 설정되어 있으면 사용
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // 프로덕션 환경에서는 Vercel Backend URL 사용
  if (import.meta.env.PROD || window.location.hostname.includes('vercel.app') || window.location.hostname.includes('supersquad.kr')) {
    return 'https://world-quotation-backend.vercel.app/api/quote';
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

/**
 * 사용자 정보를 포함한 헤더 생성
 * @param {Object} user - 사용자 정보 객체
 * @returns {Object} 헤더 객체
 */
function getHeadersWithUser(user) {
  const headers = { 'Content-Type': 'application/json' };
  if (user && user.name) {
    headers['X-User-Name'] = user.name;
  }
  return headers;
}

function App({ user, onLogout }) {
  // user가 없으면 로그인 페이지로 리다이렉트 (안전장치)
  useEffect(() => {
    if (!user) {
      const savedUser = localStorage.getItem('user')
      if (!savedUser) {
        window.location.reload()
      }
    }
  }, [user])
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

  // 새로운 워크플로우 관련 상태 (기존 상태는 그대로 유지)
  const [workflowMode, setWorkflowMode] = useState('auto'); // 'auto' | 'manual'
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);
  const [workflowComplete, setWorkflowComplete] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // 최신 상태를 추적하기 위한 ref
  const stateRef = useRef({
    loading,
    generating3D,
    result,
    previewImage,
    generatedImage,
    error,
    formData
  });

  // 워크플로우 취소 플래그
  const workflowCancelRef = useRef(false);

  // 상태가 변경될 때마다 ref 업데이트
  useEffect(() => {
    stateRef.current = {
      loading,
      generating3D,
      result,
      previewImage,
      generatedImage,
      error
    };
  }, [loading, generating3D, result, previewImage, generatedImage, error, formData]);

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

  const handleStepperChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
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
        headers: getHeadersWithUser(user),
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
        headers: getHeadersWithUser(user),
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
      const res = await fetch(`${API_URL}/inquiries`, { 
        signal,
        headers: getHeadersWithUser(user)
      });
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
    // stateRef를 통해 최신 상태 확인 (비동기 상태 업데이트 문제 해결)
    const currentGeneratedImage = stateRef.current.generatedImage || generatedImage;
    const currentPreviewImage = stateRef.current.previewImage || previewImage;

    if (!currentGeneratedImage && !force) {
      setShowThreeDWarning(true);
      return;
    }

    setShowThreeDWarning(false);
    setGeneratingExcel(true);
    setError(null);

    try {
      const requestData = {
        ...formData,
        previewImage: currentPreviewImage || null,
        generatedImage: currentGeneratedImage || null
      };

      const res = await fetch(`${API_URL}/excel`, {
        method: 'POST',
        headers: getHeadersWithUser(user),
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
    // stateRef를 통해 최신 previewImage 확인 (비동기 상태 업데이트 문제 해결)
    const currentPreviewImage = stateRef.current.previewImage || previewImage;

    if (!currentPreviewImage) {
      setError('먼저 2D 미리보기를 생성해주세요.');
      return;
    }

    setGenerating3D(true);
    setError(null);

    try {
      // Extract base64 data from data URL
      const base64Data = currentPreviewImage.split(',')[1];

      // stateRef.current.formData를 사용하여 최신 상태 보장
      const currentFormData = stateRef.current.formData || formData;

      // 3D 생성 시 설치 장소(detailedLocation)가 있으면 그것을 최우선으로 사용
      // handleSubmit에서 업데이트된 state가 아직 반영되지 않았을 경우를 대비하여 명시적으로 확인
      const finalInstallationBackground = currentFormData.detailedLocation || currentFormData.installationBackground;

      const res = await fetch(`${API_3D_URL}/generate-3d-installation`, {
        method: 'POST',
        headers: getHeadersWithUser(user),
        body: JSON.stringify({
          image: base64Data,
          mimeType: 'image/png',
          frameType: currentFormData.options.frameType,
          columns: currentFormData.columns,
          tiers: currentFormData.tiers,
          installationBackground: finalInstallationBackground
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || '3D 이미지 생성 실패';
        const errorDetails = errorData.details || errorData.action || '';
        const fullErrorMessage = errorDetails
          ? `${errorMessage}\n\n${errorDetails}`
          : errorMessage;
        console.error('3D generation API error:', {
          status: res.status,
          error: errorData.error,
          message: errorData.message,
          details: errorData.details,
          action: errorData.action
        });
        throw new Error(fullErrorMessage);
      }

      const data = await res.json();
      if (!data.image) {
        throw new Error('3D 이미지 데이터가 응답에 없습니다.');
      }
      setGeneratedImage(`data:image/png;base64,${data.image}`);
      setViewMode('3d');
    } catch (err) {
      console.error('3D generation error:', err);
      // 에러 메시지가 여러 줄이면 첫 번째 줄만 표시하고 나머지는 콘솔에 출력
      const errorLines = err.message.split('\n');
      setError(errorLines[0]);
      if (errorLines.length > 1) {
        console.error('상세 에러 정보:', errorLines.slice(1).join('\n'));
      }
    } finally {
      setGenerating3D(false);
    }
  };

  const formatPrice = (num) => `₩${num.toLocaleString('ko-KR')}`;

  // 자동 워크플로우 실행 함수 (기존 함수들을 순차 호출만 함)
  const executeAutoWorkflow = async () => {
    setIsWorkflowRunning(true);
    setWorkflowComplete(false);
    setError(null);
    workflowCancelRef.current = false; // 취소 플래그 초기화

    try {
      console.log('🚀 자동 워크플로우 시작');

      // Step 1: 견적 계산 + 2D 미리보기 (기존 handleSubmit 호출)
      const submitEvent = { preventDefault: () => { } };
      await handleSubmit(submitEvent);

      console.log('📊 Step 1 실행 완료, previewImage 생성 대기 중...');

      // Step 1 완료 대기 (previewImage가 생성될 때까지)
      // previewImage가 설정되는 것이 가장 확실한 완료 신호
      let waitCount = 0;
      const maxWait = 100; // 최대 10초 대기
      while (waitCount < maxWait) {
        // 취소 확인
        if (workflowCancelRef.current) {
          console.log('⚠️ 워크플로우 취소됨 (Step 1)');
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;

        // ref를 통해 최신 상태 확인 - previewImage만 체크 (가장 확실한 완료 신호)
        const currentState = stateRef.current;
        if (currentState.previewImage) {
          console.log('✅ Step 1 완료! previewImage 생성됨:', currentState.previewImage.substring(0, 50) + '...');
          break;
        }

        // 디버깅용 로그
        if (waitCount % 10 === 0) {
          console.log(`⏳ 대기 중... (${waitCount * 100}ms) - previewImage: ${currentState.previewImage ? '있음' : '없음'}, loading: ${currentState.loading}`);
        }
      }

      // 취소 확인
      if (workflowCancelRef.current) {
        console.log('⚠️ 워크플로우 취소됨 (Step 1 완료 후)');
        return;
      }

      // Step 1 결과 확인
      const step1State = stateRef.current;
      if (!step1State.previewImage) {
        console.error('❌ Step 1 실패 - previewImage가 생성되지 않음');
        throw new Error('2D 레이아웃 생성에 실패했습니다.');
      }

      // 취소 확인
      if (workflowCancelRef.current) {
        console.log('⚠️ 워크플로우 취소됨 (Step 2 시작 전)');
        return;
      }

      console.log('🎨 Step 2 시작: 3D 이미지 생성');

      // Step 2: 3D 이미지 생성 (기존 handleGenerate3D 호출)
      // handleGenerate3D는 에러를 catch하므로, 에러 발생 여부를 확인하기 위해
      // 실행 전 에러 상태를 저장
      const errorBefore3D = stateRef.current.error;
      await handleGenerate3D();

      // 취소 확인
      if (workflowCancelRef.current) {
        console.log('⚠️ 워크플로우 취소됨 (Step 2 실행 후)');
        return;
      }

      console.log('📊 Step 2 실행 완료, generatedImage 생성 대기 중...');

      // Step 2 완료 대기 (generatedImage가 생성될 때까지)
      // generatedImage가 설정되는 것이 가장 확실한 완료 신호
      waitCount = 0;
      const maxWait3D = 600; // 최대 60초 대기 (3D 생성은 오래 걸림)
      let hasError = false;

      while (waitCount < maxWait3D) {
        // 취소 확인
        if (workflowCancelRef.current) {
          console.log('⚠️ 워크플로우 취소됨 (Step 2 대기 중)');
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;

        // ref를 통해 최신 상태 확인
        const currentState = stateRef.current;

        // 에러가 발생했는지 확인
        // generating3D가 false이고 generatedImage가 없고, 에러가 있으면 에러로 간주
        if (!currentState.generating3D && !currentState.generatedImage && waitCount > 5) {
          // 0.5초 이상 기다렸는데 generating3D가 false이고 generatedImage가 없으면 에러 가능성
          // 에러 메시지가 설정되었는지 확인
          if (currentState.error && currentState.error !== errorBefore3D) {
            hasError = true;
            console.warn('⚠️ 3D 생성 중 에러 발생:', currentState.error);
            break;
          }
        }

        // generatedImage가 생성되었으면 완료
        if (currentState.generatedImage) {
          console.log('✅ Step 2 완료! generatedImage 생성됨:', currentState.generatedImage.substring(0, 50) + '...');
          break;
        }

        // 디버깅용 로그
        if (waitCount % 30 === 0) {
          console.log(`⏳ 3D 생성 대기 중... (${waitCount * 100}ms) - generating3D: ${currentState.generating3D}, generatedImage: ${currentState.generatedImage ? '있음' : '없음'}, error: ${currentState.error || '없음'}`);
        }
      }

      // 취소 확인
      if (workflowCancelRef.current) {
        console.log('⚠️ 워크플로우 취소됨 (Step 2 완료 후)');
        return;
      }

      // Step 2 결과 확인
      const step2State = stateRef.current;
      if (!step2State.generatedImage) {
        if (hasError) {
          console.warn('⚠️ Step 2 실패 - 3D 이미지 생성 중 에러 발생');
          // 3D 생성 실패해도 워크플로우는 완료로 처리 (2D는 있으므로)
          // 에러 메시지는 이미 handleGenerate3D에서 설정됨
        } else {
          console.warn('⚠️ Step 2 타임아웃 - generatedImage가 생성되지 않음 (타임아웃)');
          if (!step2State.error) {
            setError('3D 이미지 생성이 시간 초과되었습니다. 2D 레이아웃은 생성되었습니다.');
          }
        }
      }

      // 취소 확인
      if (workflowCancelRef.current) {
        console.log('⚠️ 워크플로우 취소됨 (Step 3 시작 전)');
        return;
      }

      console.log('📄 Step 3 시작: 견적서 다운로드');

      // Step 3: 견적서 다운로드 (force=true로 호출하여 3D 이미지 없어도 다운로드)
      // 3D 이미지가 있으면 포함하고, 없으면 2D만 포함하여 다운로드
      await handleDownloadExcel(true);

      // 취소 확인
      if (workflowCancelRef.current) {
        console.log('⚠️ 워크플로우 취소됨 (Step 3 실행 후)');
        return;
      }

      // Step 3 완료 대기 (generatingExcel이 false가 될 때까지)
      waitCount = 0;
      const maxWaitExcel = 60; // 최대 6초 대기
      while (waitCount < maxWaitExcel) {
        // 취소 확인
        if (workflowCancelRef.current) {
          console.log('⚠️ 워크플로우 취소됨 (Step 3 대기 중)');
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;

        const currentState = stateRef.current;
        if (!currentState.generatingExcel) {
          console.log('✅ Step 3 완료! 견적서 다운로드 완료');
          break;
        }
      }

      // 취소 확인
      if (workflowCancelRef.current) {
        console.log('⚠️ 워크플로우 취소됨 (Step 3 완료 후)');
        return;
      }

      // 완료
      setWorkflowComplete(true);
      console.log('🎉 자동 워크플로우 완료!');

      // 결과 섹션으로 스크롤
      setTimeout(() => {
        if (resultSectionRef.current) {
          resultSectionRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500);
    } catch (err) {
      console.error('❌ Auto workflow error:', err);
      setError(err.message || '자동 워크플로우 실행 중 오류가 발생했습니다.');
    } finally {
      setIsWorkflowRunning(false);
    }
  };

  // 재생성 함수 (기존 함수들 재호출)
  const handleRegenerate = async () => {
    setIsEditMode(false);
    await executeAutoWorkflow();
  };

  // 수정 모드로 전환
  const handleEdit = () => {
    setIsEditMode(true);
    if (resultSectionRef.current) {
      resultSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 3D 이미지만 재생성 (기존 handleGenerate3D 재호출)
  const handleRegenerate3D = async () => {
    await handleGenerate3D();
  };

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
          {user && (
            <button 
              onClick={onLogout}
              className="logout-button"
              title="로그아웃"
            >
              로그아웃
            </button>
          )}
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
            <div className="config-header-row">
              <h2>
                <div className="icon-box">⚙️</div>
                보관함 구성
              </h2>

              <div className="workflow-mode-toggle">
                <div className="toggle-container">
                  <div
                    className={`toggle-option ${workflowMode === 'auto' ? 'active auto-active' : ''}`}
                    onClick={() => !isWorkflowRunning && setWorkflowMode('auto')}
                    style={{ cursor: isWorkflowRunning ? 'not-allowed' : 'pointer', opacity: isWorkflowRunning ? 0.6 : 1 }}
                    title="자동 모드: 버튼 한 번으로 견적서까지 완성"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C10.3431 2 9 3.34315 9 5V6H5C3.89543 6 3 6.89543 3 8V18C3 19.1046 3.89543 20 5 20H19C20.1046 20 21 19.1046 21 18V8C21 6.89543 20.1046 6 19 6H15V5C15 3.34315 13.6569 2 12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M9 12V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M15 12V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M9 17H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>자동</span>
                  </div>
                  <div
                    className={`toggle-option ${workflowMode === 'manual' ? 'active' : ''}`}
                    onClick={() => !isWorkflowRunning && setWorkflowMode('manual')}
                    style={{ cursor: isWorkflowRunning ? 'not-allowed' : 'pointer', opacity: isWorkflowRunning ? 0.6 : 1 }}
                    title="수동 모드: 사용자가 직접 확인 후 진행"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M6 21V19C6 17.9391 6.42143 16.9217 7.17157 16.1716C7.92172 15.4214 8.93913 15 10 15H14C15.0609 15 16.0783 15.4214 16.8284 16.1716C17.5786 16.9217 18 17.9391 18 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    수동
                  </div>
                  <div className={`toggle-slider ${workflowMode === 'auto' ? 'auto-mode' : 'manual-mode'}`} />
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-section-title">함 구성</div>
              <div className="input-row-split" style={{ marginBottom: '40px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <NumberStepper
                    label="열 (Column)"
                    name="columns"
                    value={formData.columns}
                    onChange={handleStepperChange}
                    min={1}
                    max={20}
                    suffix="열"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <NumberStepper
                    label="단 (Box)"
                    name="tiers"
                    value={formData.tiers}
                    onChange={handleStepperChange}
                    min={1}
                    max={10}
                    suffix="단"
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

              <div className="input-row-split">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <NumberStepper
                    label="제어부 단수"
                    name="controlPanelTiers"
                    value={formData.controlPanelTiers}
                    onChange={handleStepperChange}
                    min={1}
                    max={Math.max(1, formData.tiers - 2)}
                    suffix="단"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <NumberStepper
                    label="제어부 세트 수 (Set)"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleStepperChange}
                    min={1}
                    suffix="세트"
                  />
                </div>
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

              {workflowMode === 'auto' ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={executeAutoWorkflow}
                  disabled={isWorkflowRunning || loading || generating3D}
                >
                  {isWorkflowRunning ? (
                    <>
                      <span className="btn-spinner"></span>
                      자동 생성 중...
                    </>
                  ) : (
                    '🚀 견적서 만들기'
                  )}
                </button>
              ) : (
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? '계산 중...' : '레이아웃 & 견적 생성'}
                </button>
              )}
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

            {/* 완성된 견적서 확인 및 수정 패널 */}


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

      {/* 워크플로우 진행 상태 모달 */}
      <WorkflowModal
        loading={loading}
        generating3D={generating3D}
        generatingExcel={generatingExcel}
        result={result}
        previewImage={previewImage}
        generatedImage={generatedImage}
        workflowMode={workflowMode}
        isWorkflowRunning={isWorkflowRunning}
        workflowComplete={workflowComplete}
        onClose={() => {
          // 모달 닫을 때 워크플로우 취소
          if (isWorkflowRunning) {
            workflowCancelRef.current = true;
            setIsWorkflowRunning(false);
            setWorkflowComplete(false);
          }
        }}
      />
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

