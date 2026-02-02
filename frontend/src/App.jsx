import { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import './index.css';
import Loader from './components/Loader';
import DataSection from './components/DataSection';

import WorkflowModal from './components/WorkflowModal';
import NumberStepper from './components/NumberStepper';
import ConsultationNoteModal from './components/ConsultationNoteModal';

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
  if (user) {
    const userName = user.name || user.username || null;
    if (userName) {
      try {
        let base64String;
        if (typeof TextEncoder !== 'undefined') {
          const utf8Bytes = new TextEncoder().encode(userName);
          base64String = btoa(String.fromCharCode(...utf8Bytes));
        } else {
          base64String = btoa(unescape(encodeURIComponent(userName)));
        }
        headers['X-User-Name'] = base64String;
        headers['X-User-Name-Encoded'] = 'base64';
      } catch (err) {
        headers['X-User-Name'] = userName;
      }
    }
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
    tierConfig: {
      type: 'uniform', // 'uniform', 'topLarge', 'bottomLarge', 'bothLarge', 'custom'
      ratios: null // Array of ratios when type is 'custom'
    },
    // 열별 설정 배열 (columns 길이와 동기화)
    columnConfigs: null, // null = 기본값 사용, 배열 = 열별 커스텀 설정
    options: {
      dualController: false,
      acrylic: false,
      perforation: false, // 타공 디자인 옵션
      frameType: 'none', // 'none', 'fullSet', 'topOnly', 'sideOnly', 'topAndSide'
      frameTextPreset: 'storage', // 'storage' | 'locker' | 'parcel' | 'custom'
      frameTextCustom: '', // 직접입력 시 사용
      lockerColor: 'white', // 'white', 'ivory', 'black', 'custom'
      customColor: '#808080', // Custom hex color
      handle: false, // 손잡이 옵션
      controllerType: 'standard' // 'qr', 'standard', 'barrier-free'
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
  // 이미지 생성 시점의 설정 (기본 구성과 독립)
  const [previewConfig, setPreviewConfig] = useState(null);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating3D, setGenerating3D] = useState(false);
  const [generatingExcel, setGeneratingExcel] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('2d'); // '2d' or '3d'
  const [activeTab, setActiveTab] = useState('config'); // 'config' or 'data'
  const [showThreeDWarning, setShowThreeDWarning] = useState(false);
  const [inquiries, setInquiries] = useState([]);
  const [openPopoverCol, setOpenPopoverCol] = useState(null); // 열별 높이 설정 팝오버 (null 또는 열 인덱스)
  const [copiedTierConfig, setCopiedTierConfig] = useState(null); // 복사된 열 설정 { tiers, tierConfig }
  const resultSectionRef = useRef(null);
  const [isRecalculating, setIsRecalculating] = useState(false); // 견적 재계산 중 상태
  const recalculateTimeoutRef = useRef(null); // 디바운스용 타이머

  // 상담 노트 모달 상태
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);


  // 새로운 워크플로우 관련 상태 (기존 상태는 그대로 유지)
  const [workflowMode, setWorkflowMode] = useState('manual'); // 'auto' | 'manual'
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
      error,
      formData
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

  // Sync columnConfigs when columns changes
  useEffect(() => {
    if (formData.columnConfigs) {
      const currentConfigs = formData.columnConfigs;
      if (currentConfigs.length !== formData.columns) {
        // 열 수에 맞게 배열 조정
        const newConfigs = Array.from({ length: formData.columns }, (_, i) =>
          currentConfigs[i] !== undefined
            ? currentConfigs[i]
            : { tiers: formData.tiers, tierConfig: { type: 'uniform', ratios: null } }
        );
        setFormData(prev => ({ ...prev, columnConfigs: newConfigs }));
      }
    }
  }, [formData.columns, formData.tiers]);

  // Ensure control panel tiers is valid when total tiers change (max = tiers - 2, 제어부가 2칸 차지)
  useEffect(() => {
    const maxCPTiers = Math.max(1, formData.tiers - 2);
    if (formData.controlPanelTiers > maxCPTiers) {
      setFormData(prev => ({ ...prev, controlPanelTiers: maxCPTiers }));
    }
  }, [formData.tiers, formData.controlPanelTiers]);

  // Sync tierConfig.ratios when tiers changes (for custom type)
  useEffect(() => {
    if (formData.tierConfig.type === 'custom') {
      const currentRatios = formData.tierConfig.ratios || [];
      if (currentRatios.length !== formData.tiers) {
        // Preserve existing ratios where possible, fill rest with 1
        const newRatios = Array.from({ length: formData.tiers }, (_, i) =>
          currentRatios[i] !== undefined ? currentRatios[i] : 1
        );
        setFormData(prev => ({
          ...prev,
          tierConfig: { ...prev.tierConfig, ratios: newRatios }
        }));
      }
    }
  }, [formData.tiers, formData.tierConfig.type]);

  // Reset view mode to 2d when 3D image is cleared
  useEffect(() => {
    if (!generatedImage && viewMode === '3d') {
      setViewMode('2d');
    }
  }, [generatedImage, viewMode]);

  // 팝오버 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openPopoverCol !== null && !e.target.closest('.tier-config-popover') && !e.target.closest('.tier-stepper-value')) {
        setOpenPopoverCol(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openPopoverCol]);

  // columnConfigs deep copy 헬퍼 (다른 열의 tierConfig 보존)
  const deepCopyColumnConfigs = (configs) => {
    if (!configs) return null;
    return configs.map(col => ({
      ...col,
      tierConfig: col.tierConfig ? {
        ...col.tierConfig,
        ratios: col.tierConfig.ratios ? [...col.tierConfig.ratios] : null
      } : { type: 'uniform', ratios: null }
    }));
  };

  // 견적 재계산 함수 (레이아웃 변경 시 호출)
  const recalculateQuote = async (config) => {
    setIsRecalculating(true);
    try {
      const calcRes = await fetch(`${API_URL}/calculate`, {
        method: 'POST',
        headers: getHeadersWithUser(user),
        body: JSON.stringify({
          columns: config.columns,
          tiers: config.tiers,
          quantity: formData.quantity,
          controlPanelTiers: config.controlPanelTiers,
          controlPanelColumn: config.controlPanelColumn,
          columnConfigs: config.columnConfigs,
          options: formData.options,
          region: formData.region
        })
      });

      if (calcRes.ok) {
        const calcData = await calcRes.json();
        setResult(calcData);
      }
    } catch (err) {
      console.error('Recalculate error:', err);
    } finally {
      setIsRecalculating(false);
    }
  };

  // 미리보기 이미지 갱신 함수 (이미지 위 버튼 클릭 시 호출)
  // previewConfig를 사용하여 기본 구성과 독립적으로 동작
  const refreshPreviewImage = async (updatedConfig = null) => {
    const config = updatedConfig || previewConfig;
    if (!previewImage || !config) return;

    try {
      const imgRes = await fetch(`${API_URL}/preview-image`, {
        method: 'POST',
        headers: getHeadersWithUser(user),
        body: JSON.stringify({
          columns: config.columns,
          tiers: config.tiers,
          controlPanelColumn: config.controlPanelColumn,
          controlPanelTiers: config.controlPanelTiers,
          controllerType: config.controllerType,
          frameType: formData.options.frameType,
          frameText: getFrameText(),
          lockerColor: formData.options.lockerColor,
          customColor: formData.options.customColor,
          handle: formData.options.handle,
          perforation: formData.options.perforation,
          acrylic: formData.options.acrylic,
          tierConfig: formData.tierConfig,
          dualController: formData.options.dualController,
          columnConfigs: config.columnConfigs
        })
      });

      if (imgRes.ok) {
        const imgData = await imgRes.json();
        setPreviewImage(`data:image/png;base64,${imgData.image}`);
        // 갱신된 config 저장
        if (updatedConfig) {
          setPreviewConfig(updatedConfig);

          // 가격 재계산 (디바운스 400ms)
          if (recalculateTimeoutRef.current) {
            clearTimeout(recalculateTimeoutRef.current);
          }
          recalculateTimeoutRef.current = setTimeout(() => {
            recalculateQuote(updatedConfig);
          }, 400);
        }
      }
    } catch (err) {
      console.error('Preview refresh error:', err);
    }
  };

  // 자동 갱신 제거 - '레이아웃 그리기' 버튼을 눌러야만 이미지 갱신
  // 단, 이미지 위의 열별 단수 조절 버튼은 직접 refreshPreviewImage() 호출

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' || type === 'range' ? parseInt(value) || 0 : value)
    }));
  };

  const handleOptionChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const newOptions = {
        ...prev.options,
        [name]: type === 'checkbox' ? checked : value
      };
      // 아크릴도어와 타공디자인은 상호 배타적 (둘 중 하나만 선택 가능)
      if (name === 'acrylic' && checked) {
        newOptions.perforation = false;
      } else if (name === 'perforation' && checked) {
        newOptions.acrylic = false;
      }
      return {
        ...prev,
        options: newOptions
      };
    });
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

  // 열별 단수 변경
  const handleColumnTiersChange = (colIdx, newTiers) => {
    setFormData(prev => {
      const newConfigs = [...(prev.columnConfigs || [])];
      newConfigs[colIdx] = {
        ...newConfigs[colIdx],
        tiers: newTiers,
        tierConfig: newConfigs[colIdx].tierConfig || { type: 'uniform', ratios: null }
      };
      return { ...prev, columnConfigs: newConfigs };
    });
  };

  // 프레임 상단 텍스트 계산 헬퍼 함수
  const getFrameText = () => {
    const presets = { storage: '물품보관함', unmanned: '무인물품보관함', refrigerator: '냉장보관함', prohibited: '반입금지물품보관함' };
    if (formData.options.frameTextPreset === 'custom') {
      return formData.options.frameTextCustom.trim() || '물품보관함';
    }
    return presets[formData.options.frameTextPreset] || '물품보관함';
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
    // stateRef를 통해 최신 formData 확인
    const currentFormData = stateRef.current.formData || formData;
    const updatedFormData = {
      ...currentFormData,
      installationBackground: currentFormData.detailedLocation || currentFormData.installationBackground
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

      // Get preview image with frame overlay (updatedFormData 사용으로 일관성 유지)
      const imgRes = await fetch(`${API_URL}/preview-image`, {
        method: 'POST',
        headers: getHeadersWithUser(user),
        body: JSON.stringify({
          columns: updatedFormData.columns,
          tiers: updatedFormData.tiers,
          controlPanelColumn: updatedFormData.controlPanelColumn,
          controlPanelTiers: updatedFormData.controlPanelTiers,
          controllerType: updatedFormData.options.controllerType,
          frameType: updatedFormData.options.frameType,
          frameText: getFrameText(),
          lockerColor: updatedFormData.options.lockerColor,
          customColor: updatedFormData.options.customColor,
          handle: updatedFormData.options.handle,
          perforation: updatedFormData.options.perforation,
          acrylic: updatedFormData.options.acrylic,
          tierConfig: updatedFormData.tierConfig,
          dualController: updatedFormData.options.dualController,
          columnConfigs: updatedFormData.columnConfigs
        })
      });

      if (imgRes.ok) {
        const imgData = await imgRes.json();
        setPreviewImage(`data:image/png;base64,${imgData.image}`);
        // 이미지 생성 시점의 설정 저장 (기본 구성과 독립적으로 관리)
        // columnConfigs는 항상 생성하여 각 열의 상태를 독립적으로 관리
        const initialColumnConfigs = formData.columnConfigs
          ? deepCopyColumnConfigs(formData.columnConfigs)
          : Array.from({ length: formData.columns }, () => ({
              tiers: formData.tiers,
              tierConfig: formData.tierConfig
                ? { ...formData.tierConfig, ratios: formData.tierConfig.ratios ? [...formData.tierConfig.ratios] : null }
                : { type: 'uniform', ratios: null }
            }));
        setPreviewConfig({
          columns: formData.columns,
          tiers: formData.tiers,
          tierConfig: formData.tierConfig, // 기본 tierConfig도 저장 (fallback용)
          columnConfigs: initialColumnConfigs,
          controlPanelColumn: formData.controlPanelColumn,
          controlPanelTiers: formData.controlPanelTiers,
          controllerType: formData.options.controllerType
        });

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
      tierConfig: inquiry.tierConfig || { type: 'uniform', ratios: null },
      options: {
        dualController: false,
        acrylic: false,
        frameType: 'none',
        frameTextPreset: 'storage',
        frameTextCustom: '',
        lockerColor: 'white',
        customColor: '#808080',
        handle: false,
        controllerType: 'standard',
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
    const controller = new AbortController();
    fetchInquiries(controller.signal);
    return () => controller.abort();
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

      // 프레임 텍스트 계산 (currentFormData 기반)
      const presets = { storage: '물품보관함', unmanned: '무인물품보관함', refrigerator: '냉장보관함', prohibited: '반입금지물품보관함' };
      const currentFrameText = currentFormData.options.frameTextPreset === 'custom'
        ? (currentFormData.options.frameTextCustom?.trim() || '물품보관함')
        : (presets[currentFormData.options.frameTextPreset] || '물품보관함');

      const res = await fetch(`${API_3D_URL}/generate-3d-installation`, {
        method: 'POST',
        headers: getHeadersWithUser(user),
        body: JSON.stringify({
          image: base64Data,
          mimeType: 'image/png',
          frameType: currentFormData.options.frameType,
          frameText: currentFrameText,
          columns: currentFormData.columns,
          tiers: currentFormData.tiers,
          installationBackground: finalInstallationBackground,
          // 배리어프리 관련 정보 추가
          controlPanelType: currentFormData.options.controlPanelType || 'standard',
          controlPanelColumn: currentFormData.controlPanelColumn || 0,
          columnConfigs: currentFormData.columnConfigs || null
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
          title={`${i}열에 제어부 배치`}
        >
          {isSelected ? <div className="col-icon">🖥️</div> : <div className="col-num">{i}</div>}
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
              <div className="subtitle-en">World Locker Quotation Agent</div>
              <h1>보관함 견적 에이전트</h1>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="tab-buttons">
            <button
              className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`}
              onClick={() => setActiveTab('config')}
            >
              견적
            </button>
            <button
              className={`tab-btn ${activeTab === 'data' ? 'active' : ''}`}
              onClick={() => setActiveTab('data')}
            >
              문의내역
            </button>
          </div>
          <button
            className="new-consultation-btn"
            onClick={async () => {
              setIsConsultationModalOpen(true);
              try {
                await fetch(`${API_URL}/activity-log`, {
                  method: 'POST',
                  headers: getHeadersWithUser(user),
                  body: JSON.stringify({ action: '새 상담 모달 열기', logType: 'info' })
                });
              } catch (e) {
                console.warn('Activity log failed:', e);
              }
            }}
            title="새 상담 시작"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            새 상담
          </button>
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
          {/* Top: Configuration Form (Full Width) */}
          <div className="glass-card config-panel config-panel-full">
            <form onSubmit={handleSubmit}>
              <div className="form-section-title">함 구성</div>
              <div className="config-row-inline">
                <span className="config-label">기본 구성</span>
                <NumberStepper
                  name="columns"
                  value={formData.columns}
                  onChange={handleStepperChange}
                  min={1}
                  max={20}
                  suffix="열"
                />
                <span className="config-separator">×</span>
                <NumberStepper
                  name="tiers"
                  value={formData.tiers}
                  onChange={handleStepperChange}
                  min={1}
                  max={10}
                  suffix="단"
                />
                <span className="config-divider"></span>
                <span className="config-label">함 높이</span>
                <div className="toggle-tabs">
                  <button
                    type="button"
                    className={`toggle-tab ${formData.tierConfig.type === 'uniform' ? 'active' : ''}`}
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      tierConfig: { type: 'uniform', ratios: null }
                    }))}
                  >
                    균등
                  </button>
                  <button
                    type="button"
                    className={`toggle-tab ${formData.tierConfig.type === 'custom' ? 'active' : ''}`}
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      tierConfig: { type: 'custom', ratios: new Array(prev.tiers).fill(1) }
                    }))}
                  >
                    비균등
                  </button>
                </div>
                <span className="config-divider"></span>
                <span className="config-label">제어부</span>
                <div className="toggle-tabs compact">
                  <button
                    type="button"
                    className={`toggle-tab ${formData.options.controllerType === 'standard' ? 'active' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, options: { ...prev.options, controllerType: 'standard' } }))}
                  >
                    일반
                  </button>
                  <button
                    type="button"
                    className={`toggle-tab ${formData.options.controllerType === 'qr' ? 'active' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, options: { ...prev.options, controllerType: 'qr' } }))}
                  >
                    QR
                  </button>
                  <button
                    type="button"
                    className={`toggle-tab ${formData.options.controllerType === 'barrier-free' ? 'active' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, options: { ...prev.options, controllerType: 'barrier-free', dualController: true } }))}
                  >
                    배리어프리
                  </button>
                </div>
                {formData.options.controllerType !== 'qr' && (
                  <>
                    <span className="config-gap"></span>
                    <span className="config-label">위치</span>
                    <div className="cp-selector-container">
                      {renderColumnSelector()}
                    </div>
                    {formData.options.controllerType !== 'barrier-free' && (
                      <>
                        <span className="config-gap"></span>
                        <span className="config-label">단 수</span>
                        <NumberStepper
                          name="controlPanelTiers"
                          value={formData.controlPanelTiers}
                          onChange={handleStepperChange}
                          min={1}
                          max={Math.max(1, formData.tiers - 2)}
                          suffix="단"
                        />
                      </>
                    )}
                  </>
                )}
              </div>

              {/* 커스텀 높이 설정 (비균등 선택시만 표시) */}
              {formData.tierConfig.type === 'custom' && (
                <div className="custom-tier-editor">
                  {/* 미리보기 열 */}
                  <div className="tier-preview-column">
                    {Array.from({ length: formData.tiers }, (_, i) => {
                      const ratio = formData.tierConfig.ratios?.[i] || 1;
                      const totalRatio = (formData.tierConfig.ratios || []).reduce((sum, r) => sum + (r || 1), 0) || formData.tiers;
                      const heightPercent = (ratio / totalRatio) * 100;
                      return (
                        <div
                          key={i}
                          className="tier-preview-cell"
                          style={{ flex: ratio }}
                        >
                          <span>{i + 1}단</span>
                        </div>
                      );
                    })}
                  </div>
                  {/* 슬라이더 열 */}
                  <div className="tier-sliders-column">
                    {Array.from({ length: formData.tiers }, (_, i) => (
                      <div key={i} className="tier-slider-row">
                        <input
                          type="range" min="0.5" max="2" step="0.1"
                          value={formData.tierConfig.ratios?.[i] || 1}
                          onChange={(e) => {
                            const newRatios = [...(formData.tierConfig.ratios || new Array(formData.tiers).fill(1))];
                            newRatios[i] = parseFloat(e.target.value);
                            setFormData(prev => ({ ...prev, tierConfig: { ...prev.tierConfig, ratios: newRatios } }));
                          }}
                        />
                        <span className="ratio-value">{(formData.tierConfig.ratios?.[i] || 1).toFixed(1)}x</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {/* 옵션 행: 세트 수, 프레임, 색상, 기타옵션 */}
              <div className="options-row">
                {/* 세트 수 */}
                <div className="option-group">
                  <label>세트 수</label>
                  <NumberStepper
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleStepperChange}
                    min={1}
                    suffix="세트"
                    className="stepper-narrow"
                  />
                </div>

                {/* 프레임 옵션 */}
                <div className="option-group">
                  <label>프레임</label>
                  <div className="toggle-tabs">
                    <button
                      type="button"
                      className={`toggle-tab ${formData.options.frameType === 'none' ? 'active' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, options: { ...prev.options, frameType: 'none' } }))}
                    >
                      없음
                    </button>
                    <button
                      type="button"
                      className={`toggle-tab ${formData.options.frameType === 'fullSet' ? 'active' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, options: { ...prev.options, frameType: 'fullSet' } }))}
                    >
                      풀옵션
                    </button>
                    <button
                      type="button"
                      className={`toggle-tab ${formData.options.frameType === 'topOnly' ? 'active' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, options: { ...prev.options, frameType: 'topOnly' } }))}
                    >
                      상부만
                    </button>
                    <button
                      type="button"
                      className={`toggle-tab ${formData.options.frameType === 'sideOnly' ? 'active' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, options: { ...prev.options, frameType: 'sideOnly' } }))}
                    >
                      사이드만
                    </button>
                  </div>
                </div>

                {/* 색상 */}
                <div className="option-group">
                  <label>함 색상</label>
                  <div className="color-selector compact">
                    {[
                      { id: 'white', hex: '#FFFFFF', name: '화이트' },
                      { id: 'ivory', hex: '#FFFFF0', name: '아이보리' },
                      { id: 'black', hex: '#2C2C2C', name: '블랙' }
                    ].map(color => (
                      <button
                        key={color.id}
                        type="button"
                        className={`color-btn ${formData.options.lockerColor === color.id ? 'active' : ''}`}
                        style={{ backgroundColor: color.hex, border: color.id !== 'black' ? '1px solid #ccc' : 'none' }}
                        onClick={() => setFormData(prev => ({ ...prev, options: { ...prev.options, lockerColor: color.id } }))}
                        data-tooltip={color.name}
                      >
                        {formData.options.lockerColor === color.id && <span className="color-check">✓</span>}
                      </button>
                    ))}
                    <label className={`color-btn ${formData.options.lockerColor === 'custom' ? 'active' : 'rainbow'}`}
                      style={formData.options.lockerColor === 'custom' ? { backgroundColor: formData.options.customColor } : {}}
                      data-tooltip="커스텀">
                      <input type="color" className="hidden-color-input" value={formData.options.customColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, options: { ...prev.options, lockerColor: 'custom', customColor: e.target.value } }))} />
                      {formData.options.lockerColor === 'custom' && <span className="color-check">✓</span>}
                    </label>
                  </div>
                </div>

                {/* 기타 옵션 */}
                <div className="option-group">
                  <label>추가옵션</label>
                  <div className="checkbox-row">
                    <label className="chip-checkbox">
                      <input type="checkbox" name="handle" checked={formData.options.handle} onChange={handleOptionChange} />
                      <span>손잡이</span>
                    </label>
                    <label className="chip-checkbox">
                      <input type="checkbox" name="dualController" checked={formData.options.dualController} onChange={handleOptionChange} />
                      <span>듀얼컨트롤러</span>
                    </label>
                    <label className={`chip-checkbox${formData.options.acrylic ? ' disabled' : ''}`}>
                      <input type="checkbox" name="perforation" checked={formData.options.perforation} onChange={handleOptionChange} disabled={formData.options.acrylic} />
                      <span>타공디자인</span>
                    </label>
                    <label className={`chip-checkbox${formData.options.perforation ? ' disabled' : ''}`}>
                      <input type="checkbox" name="acrylic" checked={formData.options.acrylic} onChange={handleOptionChange} disabled={formData.options.perforation} />
                      <span>아크릴도어</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* 프레임 문구 (상부 프레임이 있을 때만 표시) - 프레임 버튼 아래 정렬 */}
              {['fullSet', 'topOnly', 'topAndSide'].includes(formData.options.frameType) && (
                <div
                  className="frame-text-row-wrapper"
                  style={{
                    marginLeft: formData.options.frameType === 'fullSet' ? '227px'
                              : formData.options.frameType === 'topOnly' ? '287px'
                              : '95px'
                  }}
                >
                  <div className="frame-text-inline">
                    <span className="frame-text-label">프레임 문구</span>
                    <div className="toggle-tabs">
                      {[
                        { id: 'storage', label: '물품보관함' },
                        { id: 'unmanned', label: '무인물품보관함' },
                        { id: 'refrigerator', label: '냉장보관함' },
                        { id: 'prohibited', label: '반입금지물품보관함' },
                        { id: 'custom', label: '직접입력' }
                      ].map(preset => (
                        <button
                          key={preset.id}
                          type="button"
                          className={`toggle-tab ${formData.options.frameTextPreset === preset.id ? 'active' : ''}`}
                          onClick={() => setFormData(prev => ({ ...prev, options: { ...prev.options, frameTextPreset: preset.id } }))}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    {formData.options.frameTextPreset === 'custom' && (
                      <input
                        type="text"
                        className="frame-text-input"
                        placeholder="텍스트 입력 (최대 20자)"
                        maxLength={20}
                        value={formData.options.frameTextCustom}
                        onChange={(e) => setFormData(prev => ({ ...prev, options: { ...prev.options, frameTextCustom: e.target.value } }))}
                        style={{ width: '330px' }}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* 고객 정보 행 */}
              <div className="form-section-title">고객 정보</div>
              <div className="customer-info-row">
                <div className="option-group">
                  <label>업체명</label>
                  <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="(주)에이아이" />
                </div>
                <div className="option-group">
                  <label>연락처</label>
                  <input type="text" name="contact" value={formData.contact} onChange={handleChange} placeholder="010-0000-0000" />
                </div>
                <div className="option-group">
                  <label>이메일</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="example@email.com" />
                </div>
                <div className="option-group">
                  <label>설치지역</label>
                  <select name="region" value={formData.region} onChange={handleChange}>
                    <option value="seoul">서울</option>
                    <option value="gyeonggi">경기</option>
                    <option value="incheon">인천</option>
                    <option value="chungcheong">충청</option>
                    <option value="gangwon">강원</option>
                    <option value="jeolla">전라</option>
                    <option value="gyeongsang">경상</option>
                    <option value="jeju">제주</option>
                  </select>
                </div>
                <div className="option-group">
                  <label>상세 장소</label>
                  <input
                    type="text"
                    name="detailedLocation"
                    value={formData.detailedLocation}
                    onChange={handleChange}
                    placeholder="회사 1층 로비"
                  />
                </div>

                {/* 견적 생성 버튼 */}
                <div className="option-group submit-btn-group">
                  <div
                    className={`mode-switch ${workflowMode === 'auto' ? 'auto' : 'manual'}`}
                    onClick={() => !isWorkflowRunning && setWorkflowMode(workflowMode === 'auto' ? 'manual' : 'auto')}
                    style={{ opacity: isWorkflowRunning ? 0.6 : 1, cursor: isWorkflowRunning ? 'not-allowed' : 'pointer' }}
                  >
                    <span className={workflowMode === 'auto' ? 'active' : ''}>에이전트</span>
                    <span className={workflowMode === 'manual' ? 'active' : ''}>수동모드</span>
                    <div className="switch-slider" />
                  </div>
                  {workflowMode === 'auto' ? (
                    <button
                      type="button"
                      className="btn-primary btn-compact"
                      onClick={executeAutoWorkflow}
                      disabled={isWorkflowRunning || loading || generating3D}
                    >
                      {isWorkflowRunning ? '생성 중...' : '견적서 요청'}
                    </button>
                  ) : (
                    <button type="submit" className="btn-primary btn-compact" disabled={loading}>
                      {loading ? '계산 중...' : '레이아웃 그리기'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Bottom: Layout Preview + Quote Summary in 2 columns */}
          <div className="bottom-grid">
            {/* Left: Layout Preview */}
            <div className="glass-card preview-card" ref={resultSectionRef}>
              <h2>레이아웃 이미지</h2>

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
                  <div className="preview-with-controls">
                    {/* 열별 단수 조절 버튼 (이미지 위) - previewConfig 기준으로 렌더링 */}
                    {previewConfig && (
                      <div className="column-tier-controls">
                        {Array.from({ length: previewConfig.columns }, (_, idx) => {
                          const colNum = idx + 1;
                          const isControlPanel = previewConfig.controllerType !== 'qr' && colNum === previewConfig.controlPanelColumn;
                          const currentTiers = previewConfig.columnConfigs?.[idx]?.tiers ?? previewConfig.tiers;
                          const isDisabled = isControlPanel && previewConfig.controllerType === 'barrier-free';

                          const currentTierConfig = previewConfig.columnConfigs?.[idx]?.tierConfig || { type: 'uniform', ratios: null };
                          const isNonUniform = currentTierConfig.type === 'custom';

                          return (
                            <div key={idx} className={`col-tier-control ${isControlPanel ? 'is-control-panel' : ''}`}>
                              <div className="tier-stepper">
                                <button
                                  type="button"
                                  className="tier-stepper-btn decrement"
                                  onClick={() => {
                                    // previewConfig 업데이트 후 이미지 갱신
                                    const newConfig = { ...previewConfig };
                                    if (isControlPanel) {
                                      newConfig.controlPanelTiers = Math.max(1, previewConfig.controlPanelTiers - 1);
                                    } else {
                                      // columnConfigs가 없으면 기존 tierConfig 기반으로 생성 (거의 발생하지 않음)
                                      if (!newConfig.columnConfigs) {
                                        const baseTierConfig = previewConfig.tierConfig || { type: 'uniform', ratios: null };
                                        newConfig.columnConfigs = Array.from({ length: previewConfig.columns }, () => ({
                                          tiers: previewConfig.tiers,
                                          tierConfig: { ...baseTierConfig, ratios: baseTierConfig.ratios ? [...baseTierConfig.ratios] : null }
                                        }));
                                      } else {
                                        newConfig.columnConfigs = deepCopyColumnConfigs(newConfig.columnConfigs);
                                      }
                                      const newTiers = Math.max(1, currentTiers - 1);
                                      // 비균등 비율 배열도 조정
                                      const existingRatios = newConfig.columnConfigs[idx]?.tierConfig?.ratios;
                                      let newRatios = null;
                                      if (existingRatios && existingRatios.length > newTiers) {
                                        newRatios = existingRatios.slice(0, newTiers);
                                      } else if (existingRatios) {
                                        newRatios = existingRatios;
                                      }
                                      newConfig.columnConfigs[idx] = {
                                        ...newConfig.columnConfigs[idx],
                                        tiers: newTiers,
                                        tierConfig: newRatios ? { type: 'custom', ratios: newRatios } : { type: 'uniform', ratios: null }
                                      };
                                    }
                                    refreshPreviewImage(newConfig);
                                  }}
                                  disabled={isDisabled}
                                  aria-label="감소"
                                >
                                  <svg width="10" height="2" viewBox="0 0 10 2" fill="none">
                                    <path d="M1 1h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  </svg>
                                </button>
                                <span
                                  className={`tier-stepper-value ${!isControlPanel ? 'clickable' : ''} ${isNonUniform ? 'non-uniform' : ''}`}
                                  onClick={() => {
                                    if (!isControlPanel) {
                                      setOpenPopoverCol(openPopoverCol === idx ? null : idx);
                                    }
                                  }}
                                  title={!isControlPanel ? '클릭하여 높이 설정' : undefined}
                                >
                                  {isControlPanel ? previewConfig.controlPanelTiers : currentTiers}
                                  {isNonUniform && <span className="non-uniform-indicator">*</span>}
                                </span>
                                <button
                                  type="button"
                                  className="tier-stepper-btn increment"
                                  onClick={() => {
                                    // previewConfig 업데이트 후 이미지 갱신
                                    const newConfig = { ...previewConfig };
                                    if (isControlPanel) {
                                      newConfig.controlPanelTiers = Math.min(10, previewConfig.controlPanelTiers + 1);
                                    } else {
                                      // columnConfigs가 없으면 기존 tierConfig 기반으로 생성 (거의 발생하지 않음)
                                      if (!newConfig.columnConfigs) {
                                        const baseTierConfig = previewConfig.tierConfig || { type: 'uniform', ratios: null };
                                        newConfig.columnConfigs = Array.from({ length: previewConfig.columns }, () => ({
                                          tiers: previewConfig.tiers,
                                          tierConfig: { ...baseTierConfig, ratios: baseTierConfig.ratios ? [...baseTierConfig.ratios] : null }
                                        }));
                                      } else {
                                        newConfig.columnConfigs = deepCopyColumnConfigs(newConfig.columnConfigs);
                                      }
                                      const newTiers = Math.min(10, currentTiers + 1);
                                      // 비균등 비율 배열도 조정
                                      const existingRatios = newConfig.columnConfigs[idx]?.tierConfig?.ratios;
                                      let newRatios = null;
                                      if (existingRatios) {
                                        newRatios = [...existingRatios, 1]; // 새 단 추가 시 기본 비율 1
                                      }
                                      newConfig.columnConfigs[idx] = {
                                        ...newConfig.columnConfigs[idx],
                                        tiers: newTiers,
                                        tierConfig: newRatios ? { type: 'custom', ratios: newRatios } : { type: 'uniform', ratios: null }
                                      };
                                    }
                                    refreshPreviewImage(newConfig);
                                  }}
                                  disabled={isDisabled}
                                  aria-label="증가"
                                >
                                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                    <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  </svg>
                                </button>
                              </div>

                              {/* 열별 높이 설정 팝오버 */}
                              {!isControlPanel && openPopoverCol === idx && (
                                <div className="tier-config-popover">
                                  <div className="popover-header">
                                    <span className="popover-title">{colNum}열 높이 설정</span>
                                    <button
                                      type="button"
                                      className="popover-close"
                                      onClick={() => setOpenPopoverCol(null)}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                        <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                      </svg>
                                    </button>
                                  </div>

                                  <div className="popover-toggle-group">
                                    <button
                                      type="button"
                                      className={`popover-toggle-btn ${currentTierConfig.type === 'uniform' ? 'active' : ''}`}
                                      onClick={() => {
                                        const newConfig = { ...previewConfig };
                                        // columnConfigs가 없으면 기존 tierConfig 기반으로 생성 (거의 발생하지 않음)
                                        if (!newConfig.columnConfigs) {
                                          const baseTierConfig = previewConfig.tierConfig || { type: 'uniform', ratios: null };
                                          newConfig.columnConfigs = Array.from({ length: previewConfig.columns }, () => ({
                                            tiers: previewConfig.tiers,
                                            tierConfig: { ...baseTierConfig, ratios: baseTierConfig.ratios ? [...baseTierConfig.ratios] : null }
                                          }));
                                        } else {
                                          newConfig.columnConfigs = deepCopyColumnConfigs(newConfig.columnConfigs);
                                        }
                                        newConfig.columnConfigs[idx] = {
                                          ...newConfig.columnConfigs[idx],
                                          tierConfig: { type: 'uniform', ratios: null }
                                        };
                                        refreshPreviewImage(newConfig);
                                      }}
                                    >
                                      균등
                                    </button>
                                    <button
                                      type="button"
                                      className={`popover-toggle-btn ${currentTierConfig.type === 'custom' ? 'active' : ''}`}
                                      onClick={() => {
                                        const newConfig = { ...previewConfig };
                                        // columnConfigs가 없으면 기존 tierConfig 기반으로 생성 (거의 발생하지 않음)
                                        if (!newConfig.columnConfigs) {
                                          const baseTierConfig = previewConfig.tierConfig || { type: 'uniform', ratios: null };
                                          newConfig.columnConfigs = Array.from({ length: previewConfig.columns }, () => ({
                                            tiers: previewConfig.tiers,
                                            tierConfig: { ...baseTierConfig, ratios: baseTierConfig.ratios ? [...baseTierConfig.ratios] : null }
                                          }));
                                        } else {
                                          newConfig.columnConfigs = deepCopyColumnConfigs(newConfig.columnConfigs);
                                        }
                                        newConfig.columnConfigs[idx] = {
                                          ...newConfig.columnConfigs[idx],
                                          tierConfig: { type: 'custom', ratios: new Array(currentTiers).fill(1) }
                                        };
                                        refreshPreviewImage(newConfig);
                                      }}
                                    >
                                      비균등
                                    </button>
                                  </div>

                                  {/* 복사/붙여넣기 버튼 */}
                                  <div className="popover-copy-paste-group">
                                    <button
                                      type="button"
                                      className="popover-copy-btn"
                                      onClick={() => {
                                        setCopiedTierConfig({
                                          tiers: currentTiers,
                                          tierConfig: { ...currentTierConfig, ratios: currentTierConfig.ratios ? [...currentTierConfig.ratios] : null }
                                        });
                                      }}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                      </svg>
                                      복사
                                    </button>
                                    <button
                                      type="button"
                                      className={`popover-paste-btn ${!copiedTierConfig ? 'disabled' : ''}`}
                                      disabled={!copiedTierConfig}
                                      onClick={() => {
                                        if (!copiedTierConfig) return;

                                        const newConfig = { ...previewConfig };
                                        newConfig.columnConfigs = deepCopyColumnConfigs(newConfig.columnConfigs) || [];

                                        // 단 수와 tierConfig 모두 복사된 값으로 적용
                                        const copiedTiers = copiedTierConfig.tiers;
                                        const copiedTierConfigData = {
                                          ...copiedTierConfig.tierConfig,
                                          ratios: copiedTierConfig.tierConfig.ratios ? [...copiedTierConfig.tierConfig.ratios] : null
                                        };

                                        newConfig.columnConfigs[idx] = {
                                          ...newConfig.columnConfigs[idx],
                                          tiers: copiedTiers,
                                          tierConfig: copiedTierConfigData
                                        };

                                        // 팝오버 닫기 (단 수가 바뀌면 팝오버 내용도 달라지므로)
                                        setOpenPopoverCol(null);
                                        refreshPreviewImage(newConfig);
                                      }}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                                      </svg>
                                      붙여넣기
                                      {copiedTierConfig && ` (${copiedTierConfig.tiers}단)`}
                                    </button>
                                  </div>

                                  {currentTierConfig.type === 'custom' && (
                                    <div className="popover-sliders">
                                      {Array.from({ length: currentTiers }, (_, tierIdx) => {
                                        const ratio = currentTierConfig.ratios?.[tierIdx] || 1;
                                        const totalRatio = (currentTierConfig.ratios || []).reduce((sum, r) => sum + (r || 1), 0) || currentTiers;
                                        const percentage = Math.round((ratio / totalRatio) * 100);

                                        // 슬라이더 값 업데이트 (로컬 상태만, 이미지 갱신 X)
                                        const updateRatioLocally = (newRatio) => {
                                          const newConfig = { ...previewConfig };
                                          newConfig.columnConfigs = deepCopyColumnConfigs(newConfig.columnConfigs) || [];
                                          const newRatios = [...(currentTierConfig.ratios || new Array(currentTiers).fill(1))];
                                          newRatios[tierIdx] = newRatio;
                                          newConfig.columnConfigs[idx] = {
                                            ...newConfig.columnConfigs[idx],
                                            tierConfig: { type: 'custom', ratios: newRatios }
                                          };
                                          setPreviewConfig(newConfig);
                                        };

                                        // 드래그 종료 시 이미지 갱신
                                        const commitRatioChange = () => {
                                          refreshPreviewImage(previewConfig);
                                        };

                                        return (
                                          <div key={tierIdx} className="popover-slider-row">
                                            <span className="tier-label">{tierIdx + 1}단</span>
                                            <input
                                              type="range"
                                              min="0.5"
                                              max="2"
                                              step="0.1"
                                              value={ratio}
                                              onChange={(e) => updateRatioLocally(parseFloat(e.target.value))}
                                              onMouseUp={commitRatioChange}
                                              onTouchEnd={commitRatioChange}
                                              className="ratio-slider"
                                            />
                                            <span className="ratio-value">{ratio.toFixed(1)}x</span>
                                            <span className="ratio-percent">({percentage}%)</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <img key="2d-preview" src={previewImage} alt="Locker 2D Preview" className="preview-image" />
                  </div>
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
          </div>

          {/* Right: Quote Summary */}
          <div className="glass-card quote-summary-card">
            <h2>견적 요약 {isRecalculating && <span className="recalc-spinner">↻</span>}</h2>

            {result ? (
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

                  {/* 제품 섹션 */}
                  <div className="breakdown-section-title">제품</div>
                  <div className="breakdown-item">
                    <span>제어부</span>
                    <span>{formatPrice(result.breakdown.basePrice)}</span>
                  </div>
                  {/* 함체부 - 단수별 그룹화 */}
                  {result.breakdown.lockerBodiesBreakdown?.length > 0 ? (
                    result.breakdown.lockerBodiesBreakdown.map((body, idx) => (
                      <div key={idx} className="breakdown-item">
                        <span>함체부 {body.tiers}단</span>
                        <div className="breakdown-price-col">
                          <span className="sub-detail">
                            ({formatPrice(body.unitCost)} × {body.columns}열)
                          </span>
                          <span>{formatPrice(body.totalCost)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    /* 하위 호환 - 기존 단일 항목 */
                    <div className="breakdown-item">
                      <span>{result.breakdown.lockerBodyLabel}</span>
                      <div className="breakdown-price-col">
                        <span className="sub-detail">
                          ({formatPrice(result.breakdown.unitBodyCost)} × {result.breakdown.bodyColumns}열)
                        </span>
                        <span>{formatPrice(result.breakdown.lockerBodyCost)}</span>
                      </div>
                    </div>
                  )}

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
            ) : (
              <div className="empty-quote-summary">
                <span>견적 생성 버튼을 눌러주세요</span>
              </div>
            )}
          </div>
          </div>
          {/* End of bottom-grid */}

          {/* 3D Warning Modal */}
          {showThreeDWarning && (
              <div className="warning-modal-overlay" onClick={() => setShowThreeDWarning(false)}>
                <div className="warning-modal-card" onClick={(e) => e.stopPropagation()}>
                  {/* 3D Cube Icon */}
                  <div className="warning-modal-icon">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M24 4L42 14V34L24 44L6 34V14L24 4Z" stroke="url(#cube-gradient)" strokeWidth="2.5" strokeLinejoin="round" fill="none"/>
                      <path d="M24 4L24 44" stroke="url(#cube-gradient)" strokeWidth="2" strokeLinejoin="round" opacity="0.5"/>
                      <path d="M6 14L24 24L42 14" stroke="url(#cube-gradient)" strokeWidth="2" strokeLinejoin="round" opacity="0.5"/>
                      <circle cx="24" cy="24" r="4" fill="url(#cube-gradient)" opacity="0.3"/>
                      <defs>
                        <linearGradient id="cube-gradient" x1="6" y1="4" x2="42" y2="44">
                          <stop offset="0%" stopColor="#3b82f6"/>
                          <stop offset="100%" stopColor="#1e3a5f"/>
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="warning-modal-content">
                    <h3 className="warning-modal-title">3D 이미지 없이 진행할까요?</h3>
                    <p className="warning-modal-desc">
                      3D 설치 예시 이미지를 추가하면<br/>
                      더 완성도 높은 견적서를 만들 수 있어요
                    </p>
                  </div>

                  {/* Buttons */}
                  <div className="warning-modal-actions">
                    <button
                      className="warning-modal-btn warning-modal-btn-secondary"
                      onClick={() => handleDownloadExcel(true)}
                    >
                      <span>2D만 포함</span>
                    </button>
                    <button
                      className="warning-modal-btn warning-modal-btn-primary"
                      onClick={() => {
                        setShowThreeDWarning(false);
                        const currentPreviewImage = stateRef.current.previewImage || previewImage;
                        if (currentPreviewImage) {
                          handleGenerate3D();
                        } else {
                          setViewMode('2d');
                          const previewSection = document.querySelector('[id*="preview"]') || document.querySelector('.preview-section');
                          if (previewSection) {
                            previewSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2L20 7V17L12 22L4 17V7L12 2Z" strokeLinejoin="round"/>
                      </svg>
                      <span>3D 생성하기</span>
                    </button>
                  </div>

                  {/* Close button */}
                  <button
                    className="warning-modal-close"
                    onClick={() => setShowThreeDWarning(false)}
                    aria-label="닫기"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            )}
        </div>
      ) : (
        <DataSection
          inquiries={inquiries}
          onApplyInquiry={handleApplyInquiry}
          onSaveInquiry={(updatedInquiry) => {
            setInquiries(prev => prev.map(inq =>
              inq.id === updatedInquiry.id ? updatedInquiry : inq
            ));
          }}
          apiUrl={API_URL}
          getHeaders={() => getHeadersWithUser(user)}
        />
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

      {/* 상담 노트 모달 */}
      <ConsultationNoteModal
        isOpen={isConsultationModalOpen}
        onClose={() => setIsConsultationModalOpen(false)}
        onSave={(parsedFormData, extractedData) => {
          // 파싱된 데이터를 formData에 적용
          setFormData(prev => ({
            ...prev,
            columns: parsedFormData.columns || prev.columns,
            tiers: parsedFormData.tiers || prev.tiers,
            options: {
              ...prev.options,
              lockerColor: parsedFormData.options?.lockerColor || prev.options.lockerColor,
              frameType: parsedFormData.options?.frameType || prev.options.frameType,
              handle: parsedFormData.options?.handle ?? prev.options.handle,
              acrylic: parsedFormData.options?.acrylic ?? prev.options.acrylic,
              dualController: parsedFormData.options?.dualController ?? prev.options.dualController,
              perforation: parsedFormData.options?.perforation ?? prev.options.perforation,
              controllerType: parsedFormData.options?.controllerType || prev.options.controllerType
            },
            region: parsedFormData.region || prev.region,
            companyName: parsedFormData.companyName || prev.companyName,
            contact: parsedFormData.contact || prev.contact,
            email: parsedFormData.email || prev.email
          }));
          // 문의내역 새로고침
          fetchInquiries();
          // 문의 내역 탭으로 전환
          setActiveTab('data');
        }}
        apiUrl={API_URL}
        getHeaders={() => getHeadersWithUser(user)}
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
    filter: blur(var(--blur, 4px));
    background: var(--background, transparent);
    transform: translate(var(--x, 0), var(--y, 0)) translateZ(0);
    animation: var(--animation, none) var(--duration) var(--easing) infinite;
    will-change: transform;
  }

  .uiverse .wrapper .circle.circle-1,
  .uiverse .wrapper .circle.circle-9,
  .uiverse .wrapper .circle.circle-10 {
    --background: var(--c-color-4);
  }

  .uiverse .wrapper .circle.circle-3,
  .uiverse .wrapper .circle.circle-4 {
    --background: var(--c-color-2);
    --blur: 6px;
  }

  .uiverse .wrapper .circle.circle-5,
  .uiverse .wrapper .circle.circle-6 {
    --background: var(--c-color-3);
    --blur: 7px;
  }

  .uiverse .wrapper .circle.circle-2,
  .uiverse .wrapper .circle.circle-7,
  .uiverse .wrapper .circle.circle-8,
  .uiverse .wrapper .circle.circle-11,
  .uiverse .wrapper .circle.circle-12 {
    --background: var(--c-color-1);
    --blur: 5px;
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

