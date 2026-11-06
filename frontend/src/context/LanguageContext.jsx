import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

// 1. 메뉴 코드 영문/한글 매핑
export const MENU_NAME_MAP = {
  PROJECT_REGISTER: {
    KO: '프로젝트 신규 등록',
    EN: 'New Project Reg.',
  },
  ACTION_PLAN_INPUT: {
    KO: '감사 조치계획 & 필수 정보 입력',
    EN: 'CAP Action Plan & Info',
  },
  FINDING_MANAGEMENT: {
    KO: '감사 지적사항 (CAP) 관리',
    EN: 'Audit Findings (CAP)',
  },
  HEAD_FINAL_APPROVAL: {
    KO: '프로젝트 최종 검증 및 확정',
    EN: 'Final Verification & Sign-off',
  },
  REPORT_MONITORING: {
    KO: '법인별 전체 감사 조치율 보고',
    EN: 'Action Rate Report',
  },
  USER_MANAGEMENT: {
    KO: '사용자 계정 관리',
    EN: 'User Account Admin',
  },
  MENU_MANAGEMENT: {
    KO: '화면 / 메뉴 관리',
    EN: 'Screen & Menu Admin',
  },
  ROLE_PERMISSION_MANAGEMENT: {
    KO: '역할별 화면 접근 관리',
    EN: 'Role & Permission Admin',
  },
  AUDIT_LOG_MANAGEMENT: {
    KO: '시스템 접속 및 사용 로그',
    EN: 'System Audit Logs',
  },
};

// 2. 메뉴 그룹 영문/한글 매핑
export const MENU_GROUP_MAP = {
  '감사 업무 관리': {
    KO: '감사 업무 관리',
    EN: 'Audit Operations',
  },
  '시스템 관리': {
    KO: '시스템 관리',
    EN: 'System Admin',
  },
};

// 3. 사용자 권한 영문/한글 매핑
export const ROLE_MAP = {
  SYSTEM_ADMIN: {
    KO: '시스템 관리자',
    EN: 'System Admin',
  },
  AUDIT_LEADER: {
    KO: '감사책임자',
    EN: 'Audit Leader',
  },
  AUDITOR: {
    KO: '감사담당자',
    EN: 'Auditor',
  },
  CORP_HEAD: {
    KO: '법인장',
    EN: 'Corp Head',
  },
  LEAD_REP: {
    KO: '법인대표담당',
    EN: 'Lead Rep.',
  },
  MEMBER: {
    KO: '법인담당',
    EN: 'Dept. Member',
  },
  EXEC: {
    KO: '경영진',
    EN: 'Executive',
  },
  DEPT_MEMBER: {
    KO: '부서담당',
    EN: 'Dept. Member',
  },
};

// 4. 상태 코드 영문/한글 매핑
export const STATUS_MAP = {
  OPEN: { KO: '진행중', EN: 'Open' },
  IN_PROGRESS: { KO: '조치중', EN: 'In Progress' },
  SUBMITTED: { KO: '승인대기', EN: 'Submitted' },
  COMPLETED: { KO: '완료', EN: 'Completed' },
  FREEZE: { KO: '동결(마감)', EN: 'Frozen' },
  ACTIVE: { KO: '진행중', EN: 'Active' },
  DRAFT: { KO: '작성중', EN: 'Draft' },
  APPROVED: { KO: '승인', EN: 'Approved' },
  REJECTED: { KO: '반려', EN: 'Rejected' },
};

// 5. 종합 사전 (UI 라벨, 헤더, 안내문, 버튼 등)
export const DICTIONARY = {
  KO: {
    // 언어 라벨
    kor: '한국어',
    eng: '영어',
    langToggle: 'KOR',

    // 공통 버튼 & 동작
    search: '검색',
    searchBtn: '조회',
    reset: '초기화',
    create: '생성',
    register: '등록',
    save: '저장',
    cancel: '취소',
    delete: '삭제',
    edit: '수정',
    confirm: '확인',
    close: '닫기',
    submit: '제출 / 승인요청',
    approve: '승인',
    reject: '반려',
    excelDownload: '엑셀 다운로드',
    download: '다운로드',
    upload: '업로드',
    all: '전체',
    select: '선택',
    loading: '로딩 중...',
    saving: '저장 중...',
    processing: '처리 중...',
    noData: '데이터가 없습니다.',
    actions: '관리 / 작업',
    details: '상세보기',
    status: '상태',
    date: '일자',
    author: '작성자',
    notes: '비고',
    required: '필수',
    optional: '선택',

    // 상단 헤더 & 네비게이션
    manualDownload: '통합 매뉴얼 다운로드 (PPT)',
    welcomeSuffix: '님 환영합니다',
    logout: '로그아웃',
    menu: '메뉴',

    // 로그인 & 인증
    loginTitle: '시스템 로그인',
    loginSubtitle: '감사 지적사항 및 개선조치(CAP) 통합 관리 포털',
    idLabel: 'ID (아이디)',
    idPlaceholder: '사내 ID를 입력하세요',
    pwLabel: '비밀번호',
    pwPlaceholder: '비밀번호를 입력하세요',
    loginBtn: '로그인',
    loginChecking: '로그인 확인 중...',
    loginFooter: '신규 계정 발급 및 권한 문의는 감사팀 및 시스템 관리자에게 연락해 주세요.',
    copyright: '© GLOBAL SAE-A GROUP. All Rights Reserved.',

    // MFA 화면
    mfaTitle: '2차 인증 (MFA OTP)',
    mfaSubtitle: 'Google Authenticator 앱의 6자리 인증번호를 입력하세요',
    mfaPlaceholder: 'OTP 번호 6자리',
    mfaVerifyBtn: '인증 확인',
    mfaVerifying: '인증 확인 중...',
    mfaBackToLogin: '로그인 화면으로 돌아가기',

    // 프로젝트 & 감사 공통 용어
    project: '프로젝트',
    projectName: '프로젝트명',
    corp: '대상 법인',
    corpCode: '법인코드',
    auditYear: '감사 연도',
    auditRound: '차수',
    deadline: '마감기한',
    firstDeadline: '1차 마감기한',
    finalDeadline: '최종 마감기한',
    findings: '지적사항',
    findingCount: '지적건수',
    actionRate: '조치율',
    progress: '진행상황',
    category: '구분 / 분류',
    priority: '우선순위',
    dept: '담당부서',
    manager: '담당자',
    title: '제목',
    desc: '내용 / 설명',
    rootCause: '원인 분석',
    actionPlan: '조치 계획',
    actionResult: '조치 결과',
    evidence: '증빙 자료',
    evidenceAttach: '증빙자료 첨부',
    preventiveMeasure: '재발방지대책',
    auditorReview: '감사팀 검토의견',
    corpHeadReview: '법인장 최종검토의견',

    // 탭 1: 프로젝트 신규 등록
    tabProjectRegisterTitle: '감사 프로젝트 생성 및 연계 관리',
    tabProjectRegisterSub: '새로운 감사 프로젝트를 생성하거나, 이전 완료(Completion) 프로젝트를 승계하여 차기 프로젝트를 개설합니다. (감사팀 전용)',
    modeNewProject: '신규 독립 프로젝트 생성',
    modeInheritProject: '이전 완료 프로젝트 승계 개설',
    parentProjectSelect: '승계 대상 이전 완료 프로젝트 선택',
    targetCorpSelect: '대상 법인 선택',
    inputProjectName: '프로젝트명 입력',

    // 탭 2: 조치계획 입력
    tabActionPlanTitle: '감사 조치계획 & 필수 정보 입력',
    tabActionPlanSub: '부서별 지적사항에 대한 원인분석, 개선 조치계획 및 증빙자료를 등록합니다.',
    batchSave: '일괄 저장',
    requestApproval: '법인대표 승인요청',

    // 탭 3: 지적사항 관리
    tabFindingTitle: '감사 지적사항 (CAP) 관리',
    tabFindingSub: '감사팀에서 지적사항을 등록하고, 법인의 조치계획 및 증빙을 심사·확정합니다.',
    addFinding: '지적사항 추가',
    confirmFinding: '심사 완료 확정',
    requestRevise: '보완 요청',

    // 탭 4: 최종 검증 및 확정
    tabHeadApprovalTitle: '프로젝트 최종 검증 및 확정',
    tabHeadApprovalSub: '법인장 및 감사팀에서 법인의 전체 조치 결과를 최종 검증하고 프로젝트를 종결합니다.',
    headSignoff: '법인장 최종 승인 및 서명',
    headOpinion: '법인장 총평',

    // 탭 5: 조치율 보고
    tabReportTitle: '법인별 전체 감사 조치율 보고',
    tabReportSub: '법인별/프로젝트별 감사 조치율 현황을 모니터링하고 마감 통제를 수행합니다.',
    freezeProject: '프로젝트 동결 (Freeze)',
    unfreezeProject: '동결 해제 (Unfreeze)',

    // 시스템 관리 (6, 7, 8, 9)
    tabUserTitle: '사용자 계정 관리',
    tabMenuTitle: '화면 / 메뉴 관리',
    tabRoleTitle: '역할별 화면 접근 관리',
    tabAuditLogTitle: '시스템 접속 및 사용 감사 로그',
  },

  EN: {
    // Language labels
    kor: 'KOR',
    eng: 'ENG',
    langToggle: 'ENG',

    // Common Buttons & Actions
    search: 'Search',
    searchBtn: 'Query',
    reset: 'Reset',
    create: 'Create',
    register: 'Register',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    confirm: 'Confirm',
    close: 'Close',
    submit: 'Submit / Req. Approval',
    approve: 'Approve',
    reject: 'Reject',
    excelDownload: 'Excel Download',
    download: 'Download',
    upload: 'Upload',
    all: 'All',
    select: 'Select',
    loading: 'Loading...',
    saving: 'Saving...',
    processing: 'Processing...',
    noData: 'No data available.',
    actions: 'Actions',
    details: 'Details',
    status: 'Status',
    date: 'Date',
    author: 'Author',
    notes: 'Remarks',
    required: 'Req.',
    optional: 'Opt.',

    // Header & Navigation
    manualDownload: 'Download Manual (PPT)',
    welcomeSuffix: ', Welcome',
    logout: 'Logout',
    menu: 'Menu',

    // Login & Authentication
    loginTitle: 'System Login',
    loginSubtitle: 'Audit Findings & CAP Integrated Management Portal',
    idLabel: 'User ID',
    idPlaceholder: 'Enter your company ID',
    pwLabel: 'Password',
    pwPlaceholder: 'Enter your password',
    loginBtn: 'Sign In',
    loginChecking: 'Signing in...',
    loginFooter: 'For new accounts & permissions, contact the Audit Team / Admin.',
    copyright: '© GLOBAL SAE-A GROUP. All Rights Reserved.',

    // MFA Screen
    mfaTitle: '2-Factor Auth (MFA OTP)',
    mfaSubtitle: 'Enter the 6-digit code from Google Authenticator',
    mfaPlaceholder: '6-digit OTP code',
    mfaVerifyBtn: 'Verify',
    mfaVerifying: 'Verifying...',
    mfaBackToLogin: 'Back to Login',

    // Project & Audit Common Terms
    project: 'Project',
    projectName: 'Project Name',
    corp: 'Corporation',
    corpCode: 'Corp. Code',
    auditYear: 'Audit Year',
    auditRound: 'Round',
    deadline: 'Due Date',
    firstDeadline: '1st Due Date',
    finalDeadline: 'Final Due Date',
    findings: 'Findings',
    findingCount: 'Count',
    actionRate: 'Action Rate',
    progress: 'Progress',
    category: 'Category',
    priority: 'Priority',
    dept: 'Dept.',
    manager: 'Manager',
    title: 'Title',
    desc: 'Description',
    rootCause: 'Root Cause',
    actionPlan: 'Action Plan',
    actionResult: 'Action Result',
    evidence: 'Evidence',
    evidenceAttach: 'Attach Evidence',
    preventiveMeasure: 'Preventive Measure',
    auditorReview: 'Auditor Review',
    corpHeadReview: 'Corp. Head Review',

    // Tab 1: Project Register
    tabProjectRegisterTitle: 'Audit Project Creation & Continuity',
    tabProjectRegisterSub: 'Create new audit projects or succeed previous completion projects. (Audit Team Only)',
    modeNewProject: 'Create New Project',
    modeInheritProject: 'Succeed Completed Project',
    parentProjectSelect: 'Select Previous Project to Succeed',
    targetCorpSelect: 'Select Target Corporation',
    inputProjectName: 'Enter Project Name',

    // Tab 2: Action Plan Input
    tabActionPlanTitle: 'CAP Action Plan & Information',
    tabActionPlanSub: 'Enter root cause analysis, corrective action plans and attach evidence by department.',
    batchSave: 'Batch Save',
    requestApproval: 'Request Rep. Approval',

    // Tab 3: Finding Management
    tabFindingTitle: 'Audit Findings (CAP) Review',
    tabFindingSub: 'Audit team registers findings, reviews action plans and inspects completion evidence.',
    addFinding: 'Add Finding',
    confirmFinding: 'Confirm & Finalize',
    requestRevise: 'Request Revision',

    // Tab 4: Head Final Approval
    tabHeadApprovalTitle: 'Final Verification & Sign-off',
    tabHeadApprovalSub: 'Corp Head and Audit Team perform final verification and sign-off on the project.',
    headSignoff: 'Corp Head Final Approval & Sign-off',
    headOpinion: 'Corp Head Summary Review',

    // Tab 5: Report Monitoring
    tabReportTitle: 'Action Rate Status & Project Control',
    tabReportSub: 'Monitor audit action rates by corporation/project and manage deadline controls.',
    freezeProject: 'Freeze Project',
    unfreezeProject: 'Unfreeze Project',

    // System Admin (6, 7, 8, 9)
    tabUserTitle: 'User Account Admin',
    tabMenuTitle: 'Screen & Menu Admin',
    tabRoleTitle: 'Role & Permission Admin',
    tabAuditLogTitle: 'System Audit & Access Logs',
  },
};

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  // 로컬 스토리지에 저장된 언어 불러오기 (기본값: 'KO')
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem('app_lang');
      return saved === 'EN' ? 'EN' : 'KO';
    } catch {
      return 'KO';
    }
  });

  const setLang = (newLang) => {
    const validLang = newLang === 'EN' ? 'EN' : 'KO';
    setLangState(validLang);
    try {
      localStorage.setItem('app_lang', validLang);
    } catch (err) {
      console.warn('Failed to save language in localStorage:', err);
    }
  };

  const toggleLang = () => {
    setLang(lang === 'KO' ? 'EN' : 'KO');
  };

  const isEn = lang === 'EN';

  // 번역 텍스트 가져오기
  const t = (key, fallback = '') => {
    const currentDict = DICTIONARY[lang] || DICTIONARY.KO;
    if (currentDict && currentDict[key] !== undefined) {
      return currentDict[key];
    }
    // 영문 사전에 없으면 국문 사전 시도
    if (DICTIONARY.KO && DICTIONARY.KO[key] !== undefined) {
      return DICTIONARY.KO[key];
    }
    return fallback || key;
  };

  // 메뉴명 다국어 변환 (메뉴 객체 또는 menuCode)
  const getMenuName = (menuOrCode) => {
    if (!menuOrCode) return '';
    const code = typeof menuOrCode === 'string' ? menuOrCode : menuOrCode.menuCode;
    const defaultName = typeof menuOrCode === 'object' ? (menuOrCode.menuName || '') : code;

    if (MENU_NAME_MAP[code]) {
      return isEn ? MENU_NAME_MAP[code].EN : MENU_NAME_MAP[code].KO;
    }

    // 객체에 이미 영문명이 명시되어 있는 경우
    if (isEn && typeof menuOrCode === 'object' && menuOrCode.menuNameEn) {
      return menuOrCode.menuNameEn;
    }

    return defaultName;
  };

  // 메뉴 그룹명 다국어 변환
  const getGroupName = (groupName) => {
    if (!groupName) return '';
    if (MENU_GROUP_MAP[groupName]) {
      return isEn ? MENU_GROUP_MAP[groupName].EN : MENU_GROUP_MAP[groupName].KO;
    }
    return groupName;
  };

  // 역할(Role) 다국어 변환
  const getRoleName = (roleCode) => {
    if (!roleCode) return '';
    if (ROLE_MAP[roleCode]) {
      return isEn ? ROLE_MAP[roleCode].EN : ROLE_MAP[roleCode].KO;
    }
    return roleCode;
  };

  // 상태 코드 다국어 변환
  const getStatusName = (statusCode) => {
    if (!statusCode) return '';
    const upper = statusCode.toUpperCase();
    if (STATUS_MAP[upper]) {
      return isEn ? STATUS_MAP[upper].EN : STATUS_MAP[upper].KO;
    }
    return statusCode;
  };

  const value = useMemo(
    () => ({
      lang,
      setLang,
      toggleLang,
      isEn,
      t,
      getMenuName,
      getGroupName,
      getRoleName,
      getStatusName,
    }),
    [lang, isEn]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
