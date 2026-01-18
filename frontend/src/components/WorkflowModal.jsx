import React, { useEffect, useState } from 'react';
import './WorkflowModal.css';

// 각 단계별 예상 소요 시간 (초)
const STEP_DURATIONS = {
  1: 1,   // 견적 계산: 1초
  2: 2,   // 2D 레이아웃: 2초
  3: 20,  // 3D 이미지: 20초
  4: 2    // 엑셀 다운로드: 2초
};

// 각 단계의 시작 퍼센트 (총 25초 기준)
const STEP_START_PERCENTAGES = {
  1: 0,    // 0%
  2: 4,    // 4% (1초 / 25초)
  3: 12,   // 12% (3초 / 25초)
  4: 92    // 92% (23초 / 25초)
};

/**
 * WorkflowModal - Next Level Design
 * Premium Glassmorphism & Micro-interactions
 */
function WorkflowModal({
  loading,
  generating3D,
  generatingExcel,
  result,
  previewImage,
  generatedImage,
  workflowMode,
  isWorkflowRunning,
  workflowComplete,
  onClose
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStartTime, setStepStartTime] = useState(null);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [isClosed, setIsClosed] = useState(false);

  // 현재 단계 추적 및 진행률 계산
  useEffect(() => {
    let newStep = 0;

    if (generatingExcel) {
      newStep = 4;
    } else if (generating3D) {
      newStep = 3;
    } else if (loading || (isWorkflowRunning && !previewImage)) {
      newStep = 1;
    } else if (isWorkflowRunning && previewImage && generatedImage) {
      newStep = 3;
    } else if (isWorkflowRunning && previewImage && !generatedImage) {
      if (!generating3D) {
        newStep = 2;
      }
    } else if (workflowComplete) {
      newStep = 4;
    }

    // 단계가 변경되면 시작 시간 업데이트 및 진행률 즉시 업데이트
    if (newStep !== currentStep && newStep > 0) {
      // 이전 단계 완료 시 진행률을 해당 단계의 끝으로 설정
      if (currentStep > 0 && newStep > currentStep) {
        const completedStepEnd = STEP_START_PERCENTAGES[newStep] || 0;
        setProgressPercentage(completedStepEnd);
      } else if (newStep > currentStep) {
        // 첫 단계 시작 시 0%로 설정
        setProgressPercentage(STEP_START_PERCENTAGES[newStep] || 0);
      }

      setCurrentStep(newStep);
      setStepStartTime(Date.now());
    }
  }, [loading, generating3D, generatingExcel, previewImage, generatedImage, isWorkflowRunning, workflowComplete, currentStep]);

  // 워크플로우가 완전히 종료된 후 다시 시작되면 닫기 상태 초기화
  useEffect(() => {
    if (isWorkflowRunning && isClosed && !workflowComplete) {
      setIsClosed(false);
    }
  }, [isWorkflowRunning, isClosed, workflowComplete]);

  // 진행률 계산
  useEffect(() => {
    if (!isWorkflowRunning && !loading && !generating3D && !generatingExcel && !workflowComplete) {
      return;
    }

    if (currentStep === 0 || !stepStartTime) {
      return;
    }

    const interval = setInterval(() => {
      const elapsed = (Date.now() - stepStartTime) / 1000;
      const stepDuration = STEP_DURATIONS[currentStep] || 1;
      const stepProgress = Math.min(elapsed / stepDuration, 1);

      const stepStartPercent = STEP_START_PERCENTAGES[currentStep] || 0;
      const stepRange = currentStep === 4
        ? 100 - stepStartPercent
        : (STEP_START_PERCENTAGES[currentStep + 1] || 100) - stepStartPercent;

      const currentProgress = stepStartPercent + (stepProgress * stepRange);
      setProgressPercentage(Math.min(currentProgress, 100));
    }, 50);

    return () => clearInterval(interval);
  }, [currentStep, stepStartTime, isWorkflowRunning, loading, generating3D, generatingExcel, workflowComplete]);

  // 현재 단계와 메시지 결정
  const getStepInfo = () => {
    if (generatingExcel) {
      return { step: 4, totalSteps: 4, title: '견적서 작성 중', message: '최종 견적서를 생성하고 있습니다.', status: 'processing' };
    }
    if (generating3D) {
      return { step: 3, totalSteps: 4, title: '3D 렌더링 중', message: '설치 이미지를 시각화하고 있습니다.', status: 'processing' };
    }
    if (loading || (isWorkflowRunning && currentStep === 1)) {
      return { step: 1, totalSteps: 4, title: '데이터 분석 중', message: '요구사항을 분석하고 최적의 구성을 계산합니다.', status: 'processing' };
    }
    if (isWorkflowRunning && previewImage && !generatedImage && !generating3D && currentStep <= 2) {
      return { step: 2, totalSteps: 4, title: '도면 생성 중', message: '2D 레이아웃을 설계하고 있습니다.', status: 'processing' };
    }
    if (isWorkflowRunning && previewImage && generatedImage && !generatingExcel) {
      return { step: 3, totalSteps: 4, title: '3D 생성 완료', message: '렌더링 완료. 견적서를 준비합니다.', status: 'processing' };
    }
    if (workflowComplete) {
      return { step: 4, totalSteps: 4, title: '작업 완료', message: '견적서가 준비되었습니다.', status: 'completed' };
    }
    return null;
  };

  if (isClosed) return null;
  const stepInfo = getStepInfo();
  if (!stepInfo) return null;
  if (!isWorkflowRunning && !loading && !generating3D && !generatingExcel && !workflowComplete) return null;

  const finalProgress = workflowComplete ? 100 : progressPercentage;
  const steps = [
    { id: 1, name: '견적 계산', sub: 'Calculations' },
    { id: 2, name: '2D 도면', sub: 'Blueprint' },
    { id: 3, name: '3D 렌더링', sub: 'Visualization' },
    { id: 4, name: '견적서', sub: 'Documentation' }
  ];

  // Dynamic Hero Icon based on step
  const getHeroIcon = (step) => {
    switch (step) {
      case 1: // Calc
        return (
          <svg className="hero-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 7V17C4 19.2091 5.79086 21 8 21H16C18.2091 21 20 19.2091 20 17V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 7L12 11L20 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 11V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.5" />
            <path className="pulse-part" d="M8 15H16M8 18H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 2: // Blueprint
        return (
          <svg className="hero-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 3H5C3.89543 3 3 3.89543 3 5V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 21H5C3.89543 21 3 20.1046 3 19V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M15 3H19C20.1046 3 21 3.89543 21 5V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M15 21H19C20.1046 21 21 20.1046 21 19V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path className="draw-part" d="M7 7H17V17H7V7Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path className="draw-part-2" d="M7 12H17" stroke="currentColor" strokeWidth="1.5" />
            <path className="draw-part-2" d="M12 7V17" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        );
      case 3: // 3D
        return (
          <svg className="hero-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path className="rotate-part" d="M12 22L21 16.5V7.5L12 2L3 7.5V16.5L12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path className="rotate-part-inner" d="M12 22V11M12 11L3 7.5M12 11L21 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 2V5" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
            <path d="M3 16.5L6 14.5" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
            <path d="M21 16.5L18 14.5" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
          </svg>
        );
      case 4: // Completed/Doc
        return (
          <svg className="hero-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path className="check-part" d="M9 13L11 15L15 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="workflow-modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) {
        setIsClosed(true);
        if (onClose) onClose();
      }
    }}>
      <div className="workflow-modal">
        {/* Decorative Background Elements */}
        <div className="modal-glow modal-glow-1"></div>
        <div className="modal-glow modal-glow-2"></div>

        <button
          className="workflow-modal-close"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsClosed(true);
            if (onClose) onClose();
          }}
          aria-label="닫기"
          type="button"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12"></path>
          </svg>
        </button>

        {/* Hero Section */}
        <div className="workflow-hero-section">
          <div className="workflow-hero-icon-container">
            {getHeroIcon(stepInfo.step)}
            <div className={`hero-ring hero-ring-1 ${stepInfo.status === 'processing' ? 'spinning' : ''}`}></div>
            <div className="hero-ring hero-ring-2"></div>
          </div>
          <div className="workflow-header-text">
            <h3 className="workflow-title">{stepInfo.title}</h3>
            <p className="workflow-desc">{stepInfo.message}</p>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="workflow-global-progress">
          <div className="progress-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${finalProgress}%` }}
            />
          </div>
        </div>

        {/* Minimal Timeline Steps */}
        <div className="workflow-timeline">
          {steps.map((step, index) => {
            let status = 'pending';
            if (step.id < stepInfo.step) status = 'completed';
            else if (step.id === stepInfo.step) status = 'active';

            return (
              <div key={step.id} className={`timeline-item ${status}`}>
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="timeline-connector">
                    <div className="connector-line"></div>
                    <div className="connector-fill" style={{
                      height: status === 'completed' ? '100%' : '0%'
                    }}></div>
                  </div>
                )}

                {/* Dot Indicator */}
                <div className="timeline-dot-wrapper">
                  <div className="timeline-dot">
                    {status === 'completed' && (
                      <svg className="check-icon" viewBox="0 0 12 12" fill="none">
                        <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {status === 'active' && <div className="dot-pulse"></div>}
                  </div>
                </div>

                {/* Text Content */}
                <div className="timeline-content">
                  <span className="step-name">{step.name}</span>
                  <span className="step-sub">{step.sub}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default WorkflowModal;
