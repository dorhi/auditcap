import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthProvider';
import axios from 'axios';
import MenuManagement from './MenuManagement';
import RolePermissionManagement from './RolePermissionManagement';
import CustomScreenView from './CustomScreenView';
import SaeALogo from './common/SaeALogo';

// HTML Rich Text 에디터 컴포넌트
const HtmlEditor = ({ value, onChange, placeholder, disabled }) => {
  const editorRef = React.useRef(null);

  React.useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command, arg = '') => {
    document.execCommand(command, false, arg);
    handleInput();
  };

  const handleColorChange = (e) => {
    execCommand('foreColor', e.target.value);
  };

  const insertTable = () => {
    const rowsStr = window.prompt("생성할 표의 행(Row) 개수를 입력하세요 (예: 3)", "3");
    const colsStr = window.prompt("생성할 표의 열(Column) 개수를 입력하세요 (예: 3)", "3");

    const rows = parseInt(rowsStr, 10);
    const cols = parseInt(colsStr, 10);

    if (isNaN(rows) || isNaN(cols) || rows <= 0 || cols <= 0) {
      alert("올바른 행/열 개수를 입력해 주세요.");
      return;
    }

    let tableHtml = '<table style="width: 100%; border-collapse: collapse; border: 1px solid #d1d5db; margin: 10px 0;"><tbody>';
    for (let r = 0; r < rows; r++) {
      tableHtml += '<tr>';
      for (let c = 0; c < cols; c++) {
        tableHtml += '<td style="border: 1px solid #d1d5db; padding: 8px; min-width: 50px; height: 24px;">&nbsp;</td>';
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table>';

    execCommand('insertHTML', tableHtml);
  };

  return (
    <div style={editorStyles.editorContainer}>
      <div style={editorStyles.toolbar}>
        <button type="button" disabled={disabled} onClick={() => execCommand('bold')} style={editorStyles.toolBtn}><b>B</b></button>
        <button type="button" disabled={disabled} onClick={() => execCommand('italic')} style={editorStyles.toolBtn}><i>I</i></button>
        <button type="button" disabled={disabled} onClick={() => execCommand('underline')} style={editorStyles.toolBtn}><u>U</u></button>

        <span style={editorStyles.divider}>|</span>

        <button type="button" disabled={disabled} onClick={() => execCommand('insertUnorderedList')} style={editorStyles.toolBtn}>• 리스트</button>
        <button type="button" disabled={disabled} onClick={() => execCommand('insertOrderedList')} style={editorStyles.toolBtn}>1. 리스트</button>

        <span style={editorStyles.divider}>|</span>

        {/* 색상 선택 */}
        <div style={editorStyles.colorPickerContainer}>
          <label style={editorStyles.colorLabel}>🎨 색상: </label>
          <input
            type="color"
            disabled={disabled}
            onChange={handleColorChange}
            style={editorStyles.colorInput}
            title="글자색 변경"
          />
        </div>

        <span style={editorStyles.divider}>|</span>

        {/* 표 삽입 */}
        <button type="button" disabled={disabled} onClick={insertTable} style={editorStyles.toolBtn}>📅 표 삽입</button>

        <span style={editorStyles.divider}>|</span>

        <button type="button" disabled={disabled} onClick={() => execCommand('removeFormat')} style={editorStyles.toolBtn}>서식 지우기</button>
      </div>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        style={disabled ? editorStyles.editableAreaDisabled : editorStyles.editableArea}
        placeholder={placeholder}
      />
    </div>
  );
};

const editorStyles = {
  editorContainer: {
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    alignItems: 'center',
    padding: '6px 10px',
    backgroundColor: '#f3f4f6',
    borderBottom: '1px solid #d1d5db',
  },
  toolBtn: {
    padding: '4px 8px',
    fontSize: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
  divider: {
    color: '#d1d5db',
    alignSelf: 'center',
    margin: '0 2px',
    fontSize: '12px',
    userSelect: 'none',
  },
  colorPickerContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  colorLabel: {
    fontSize: '12px',
    color: '#4b5563',
    fontWeight: 'bold',
  },
  colorInput: {
    width: '24px',
    height: '24px',
    border: 'none',
    padding: '0',
    backgroundColor: 'transparent',
    cursor: 'pointer',
  },
  editableArea: {
    padding: '12px',
    minHeight: '150px',
    maxHeight: '400px',
    overflowY: 'auto',
    outline: 'none',
  },
  editableAreaDisabled: {
    padding: '12px',
    minHeight: '150px',
    maxHeight: '400px',
    overflowY: 'auto',
    outline: 'none',
    backgroundColor: '#f3f4f6',
    cursor: 'not-allowed',
  }
};

const Dashboard = () => {
  const { user, logout } = useAuth();

  // 동적 사용자 메뉴 목록 (백엔드 권한 기반)
  const [userMenus, setUserMenus] = useState([]);
  // 현재 활성화된 메뉴 탭 (코드 또는 번호)
  const [activeMenu, setActiveMenu] = useState('ACTION_PLAN_INPUT');

  // 기본 아이콘 매핑 (이모지 제거, 격식 있는 엔터프라이즈 스타일)
  const DEFAULT_ICONS = {
    PROJECT_REGISTER: '',
    ACTION_PLAN_INPUT: '',
    FINDING_MANAGEMENT: '',
    HEAD_FINAL_APPROVAL: '',
    REPORT_MONITORING: '',
    USER_MANAGEMENT: '',
    MENU_MANAGEMENT: '',
    ROLE_PERMISSION_MANAGEMENT: '',
  };

  // 사용자 권한 한글 명칭 및 정렬 순서 정의 (영문 제거 및 신규 명칭 적용)
  const ROLE_OPTIONS = [
    { value: 'SYSTEM_ADMIN', label: '시스템 관리자' },
    { value: 'AUDIT_LEADER', label: '감사책임자' },
    { value: 'AUDITOR', label: '감사담당자' },
    { value: 'CORP_HEAD', label: '법인장' },
    { value: 'LEAD_REP', label: '법인대표담당' },
    { value: 'MEMBER', label: '법인담당' },
    { value: 'EXEC', label: '경영진' },
    { value: 'DEPT_MEMBER', label: '유관부서' },
  ];

  const ROLE_NAMES = {
    SYSTEM_ADMIN: '시스템 관리자',
    AUDIT_LEADER: '감사책임자',
    AUDITOR: '감사담당자',
    CORP_HEAD: '법인장',
    LEAD_REP: '법인대표담당',
    MEMBER: '법인담당',
    EXEC: '경영진',
    DEPT_MEMBER: '유관부서',
  };

  const getRoleKoreanName = (roleCode) => ROLE_NAMES[roleCode] || roleCode;

  // 메뉴 아이콘 헬퍼 함수 (모든 메뉴 아이콘 제거)
  const getMenuIcon = (menu) => {
    return '';
  };

  // 메뉴 매칭 헬퍼 함수 (숫자 및 코드 호환)
  const isMenuActive = (menuOrCode) => {
    if (!menuOrCode) return false;
    const targetCode = typeof menuOrCode === 'object' ? menuOrCode.menuCode : menuOrCode;
    if (activeMenu === targetCode) return true;

    // 숫자 호환 매핑
    const codeNumMap = {
      1: 'PROJECT_REGISTER',
      2: 'ACTION_PLAN_INPUT',
      3: 'FINDING_MANAGEMENT',
      4: 'REPORT_MONITORING',
      5: 'USER_MANAGEMENT',
      6: 'MENU_MANAGEMENT',
      7: 'ROLE_PERMISSION_MANAGEMENT',
      8: 'HEAD_FINAL_APPROVAL',
    };
    if (codeNumMap[activeMenu] === targetCode) return true;
    if (codeNumMap[targetCode] === activeMenu) return true;

    return false;
  };

  // 그룹별 접기/펼치기 상태 ({ [groupName]: boolean })
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const toggleGroup = (groupName) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // 기본 Fallback 메뉴 생성 (백엔드 지연 또는 실패 시)
  const getDefaultFallbackMenus = (role) => {
    const all = [
      { id: 1, menuCode: 'PROJECT_REGISTER', menuName: '프로젝트 신규 등록', groupName: '감사 업무 관리', groupOrder: 1, icon: '', sortOrder: 1, screenType: 'INTERNAL', allowedRoles: ['SYSTEM_ADMIN', 'AUDIT_LEADER', 'AUDITOR'] },
      { id: 2, menuCode: 'ACTION_PLAN_INPUT', menuName: '감사 조치계획 & 필수 정보 입력', groupName: '감사 업무 관리', groupOrder: 1, icon: '', sortOrder: 2, screenType: 'INTERNAL', allowedRoles: ['SYSTEM_ADMIN', 'EXEC', 'CORP_HEAD', 'LEAD_REP', 'MEMBER', 'DEPT_MEMBER'] },
      { id: 3, menuCode: 'FINDING_MANAGEMENT', menuName: '감사 지적사항 (CAP) 관리', groupName: '감사 업무 관리', groupOrder: 1, icon: '', sortOrder: 3, screenType: 'INTERNAL', allowedRoles: ['SYSTEM_ADMIN', 'AUDIT_LEADER', 'AUDITOR'] },
      { id: 8, menuCode: 'HEAD_FINAL_APPROVAL', menuName: '프로젝트 최종 검증 및 확정', groupName: '감사 업무 관리', groupOrder: 1, icon: '', sortOrder: 4, screenType: 'INTERNAL', allowedRoles: ['SYSTEM_ADMIN', 'CORP_HEAD', 'AUDITOR', 'AUDIT_LEADER'] },
      { id: 4, menuCode: 'REPORT_MONITORING', menuName: '법인별 전체 감사 조치율 보고', groupName: '감사 업무 관리', groupOrder: 1, icon: '', sortOrder: 5, screenType: 'INTERNAL', allowedRoles: ['SYSTEM_ADMIN', 'EXEC', 'CORP_HEAD', 'LEAD_REP', 'MEMBER', 'DEPT_MEMBER'] },
      { id: 5, menuCode: 'USER_MANAGEMENT', menuName: '사용자 계정 관리', groupName: '시스템 관리', groupOrder: 2, icon: '', sortOrder: 1, screenType: 'INTERNAL', allowedRoles: ['SYSTEM_ADMIN', 'AUDIT_LEADER'] },
      { id: 6, menuCode: 'MENU_MANAGEMENT', menuName: '화면 / 메뉴 관리', groupName: '시스템 관리', groupOrder: 2, icon: '', sortOrder: 2, screenType: 'INTERNAL', allowedRoles: ['SYSTEM_ADMIN'] },
      { id: 7, menuCode: 'ROLE_PERMISSION_MANAGEMENT', menuName: '역할별 화면 접근 관리', groupName: '시스템 관리', groupOrder: 2, icon: '', sortOrder: 3, screenType: 'INTERNAL', allowedRoles: ['SYSTEM_ADMIN'] },
    ];
    return all.filter(m => m.allowedRoles.includes(role));
  };

  // 백엔드로부터 현재 사용자에게 허용된 메뉴 목록 로드
  const fetchUserMenus = async () => {
    try {
      const res = await axios.get('/api/menus/my-menus');
      let menus = res.data && res.data.length > 0 ? res.data : getDefaultFallbackMenus(user?.role);

      // 법인장, 감사팀, 시스템관리자 권한의 경우 '프로젝트 최종 검증 및 확정' 화면이 누락되지 않도록 확실하게 보장
      const canAccessHeadApproval = ['SYSTEM_ADMIN', 'CORP_HEAD', 'AUDITOR', 'AUDIT_LEADER'].includes(user?.role);
      if (canAccessHeadApproval && !menus.some(m => m.menuCode === 'HEAD_FINAL_APPROVAL')) {
        menus = [
          ...menus,
          {
            id: 8,
            menuCode: 'HEAD_FINAL_APPROVAL',
            menuName: '프로젝트 최종 검증 및 확정',
            groupName: '감사 업무 관리',
            groupOrder: 1,
            icon: '',
            sortOrder: 4,
            screenType: 'INTERNAL',
            allowedRoles: ['SYSTEM_ADMIN', 'CORP_HEAD', 'AUDITOR', 'AUDIT_LEADER']
          }
        ];
        menus.sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));
      }

      setUserMenus(menus);
    } catch (err) {
      console.warn('Failed to load my-menus, using fallback:', err);
      setUserMenus(getDefaultFallbackMenus(user?.role));
    }
  };

  useEffect(() => {
    fetchUserMenus();
    if (user?.role === 'CORP_HEAD') {
      setActiveMenu('HEAD_FINAL_APPROVAL');
    }
  }, [user?.role]);

  // userMenus를 groupName 기준으로 묶어 정렬
  const groupedUserMenus = useMemo(() => {
    const groups = {};
    userMenus.forEach(m => {
      const gName = m.groupName || '기타 메뉴';
      if (!groups[gName]) {
        groups[gName] = {
          groupName: gName,
          groupOrder: m.groupOrder || 99,
          items: []
        };
      }
      groups[gName].items.push(m);
    });

    return Object.values(groups).sort((a, b) => (a.groupOrder || 99) - (b.groupOrder || 99));
  }, [userMenus]);

  // API 데이터 상태
  const [projects, setProjects] = useState([]);
  const [findings, setFindings] = useState([]);
  const [usersList, setUsersList] = useState([]); // 권한 관리용
  const [filterCorp, setFilterCorp] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterProjCorp, setFilterProjCorp] = useState('');
  const [filterProjState, setFilterProjState] = useState('');
  const [filterProjApproval, setFilterProjApproval] = useState('');
  const [filterProjName, setFilterProjName] = useState('');
  const [filterProjDateFrom, setFilterProjDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [filterProjDateTo, setFilterProjDateTo] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [comments, setComments] = useState({}); // findingId별 댓글 목록
  const [newCommentText, setNewCommentText] = useState({});

  // 1번 메뉴 관련 상태 (프로젝트 등록)
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectCorp, setNewProjectCorp] = useState('');
  const [customProjectCorpInput, setCustomProjectCorpInput] = useState('');
  const [newAssignedDepts, setNewAssignedDepts] = useState(''); // 접근 허용 유관부서 목록 (하위호환)
  const [selectedCorpUsers, setSelectedCorpUsers] = useState([]); // 선택된 소속법인 사용자 ID 목록
  const [selectedDeptUsers, setSelectedDeptUsers] = useState([]); // 선택된 유관부서(DEPT_MEMBER) 담당자 ID 목록 (법인 무관)
  const [deadline1st, setDeadline1st] = useState('');
  const [deadline2nd, setDeadline2nd] = useState('');
  const [deadline3rd, setDeadline3rd] = useState('');

  // 1번 메뉴: 프로젝트 등록 모드 ('NEW' | 'FROM_FROZEN')
  const [projectCreateMode, setProjectCreateMode] = useState('NEW');
  const [selectedFrozenParentId, setSelectedFrozenParentId] = useState('');

  // 2번 메뉴 관련 상태 (일반담당자 조치 입력, 검색 필터 및 마스터-디테일 선택)
  const [selectedFindingId, setSelectedFindingId] = useState(null);
  const [actionFilterDateFrom, setActionFilterDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [actionFilterDateTo, setActionFilterDateTo] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [actionFilterCorp, setActionFilterCorp] = useState('');
  const [actionFilterDept, setActionFilterDept] = useState('');
  const [actionFilterProject, setActionFilterProject] = useState('');
  const [actionFilterAssignee, setActionFilterAssignee] = useState('');
  const [actionFilterApproval, setActionFilterApproval] = useState('');
  const [excludeCompleted, setExcludeCompleted] = useState(true); // 개선완료 기본 제외 필터
  const [actionInputs, setActionInputs] = useState({});
  const [uploadFiles, setUploadFiles] = useState({});
  const [findingAttachments, setFindingAttachments] = useState({});
  const [attachmentLoading, setAttachmentLoading] = useState(false);

  // 신규 워크플로우 상태 (법인 조치 마감기한, 개선완료일자, 조치상태코드, 이력 타임라인, 유관부서 내용 등)
  const [actionDeadlines, setActionDeadlines] = useState({});
  const [completionDates, setCompletionDates] = useState({});
  const [actionStatusCodes, setActionStatusCodes] = useState({});
  const [findingHistories, setFindingHistories] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deptAdditionalContent, setDeptAdditionalContent] = useState('');
  const [selectedFinalProjectId, setSelectedFinalProjectId] = useState(null);
  const [selectedFinalFindingId, setSelectedFinalFindingId] = useState(null);
  const [finalProjectFilterCorp, setFinalProjectFilterCorp] = useState('');
  const [finalProjectFilterStatus, setFinalProjectFilterStatus] = useState('ALL');
  const [finalProjectSearchText, setFinalProjectSearchText] = useState('');

  // 결재선(승인/반려) 관련 상태
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetFinding, setRejectTargetFinding] = useState(null);
  const [rejectReasonText, setRejectReasonText] = useState('');
  const [rejectType, setRejectType] = useState('LEAD'); // 'LEAD' (대표담당자 재수정요청) | 'AUDIT' (감사담당자 재작성요청)

  // 감사팀 발견사항 검토 모달 상태 (지적사항 단위)
  const [auditReviewModalOpen, setAuditReviewModalOpen] = useState(false);
  const [auditTargetFinding, setAuditTargetFinding] = useState(null);
  const [auditReviewStatus, setAuditReviewStatus] = useState('AUDIT_CONFIRMED'); // 'AUDIT_CONFIRMED', 'AUDIT_FEEDBACK'
  const [auditReviewComment, setAuditReviewComment] = useState('');

  // 4번 메뉴: 프로젝트 단위 감사 검토 및 승인 모달 상태
  const [auditorReviewProjModalOpen, setAuditorReviewProjModalOpen] = useState(false);
  const [leaderApproveProjModalOpen, setLeaderApproveProjModalOpen] = useState(false);
  const [auditRejectProjModalOpen, setAuditRejectProjModalOpen] = useState(false);
  const [targetAuditProject, setTargetAuditProject] = useState(null);
  const [auditProjCommentInput, setAuditProjCommentInput] = useState('');
  const [auditProjRejectReasonInput, setAuditProjRejectReasonInput] = useState('');

  // 3번 메뉴 관련 상태 (감사팀 발견사항 등록 및 수정)
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [includeFrozenProjects, setIncludeFrozenProjects] = useState(false);
  const [selectedCapId, setSelectedCapId] = useState(null); // null: 신규 등록 모드, number: 기존 CAP 수정/조회 모드
  const [categories, setCategories] = useState([]);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCatInputName, setNewCatInputName] = useState('');
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [newCategory, setNewCategory] = useState('재무');
  const [customCategoryInput, setCustomCategoryInput] = useState(''); // [1] 카테고리 직접 입력
  const [selectedAuditors, setSelectedAuditors] = useState([]); // [2] 담당 감사자 복수 선택 목록
  const [newTitle, setNewTitle] = useState('');
  const [newFindingText, setNewFindingText] = useState('');
  const [assignedUser, setAssignedUser] = useState(''); // [3] CAP 달성 피감법인 담당자 ID (선택 입력용)
  const [assignedDept, setAssignedDept] = useState(''); // [3] CAP 달성 피감법인 담당 부서명 (선택 입력용)
  const [selectedAssignedUsers, setSelectedAssignedUsers] = useState([]); // [3-1] CAP 달성 대상자 복수 추가 목록 [{ userId, name, deptName }]
  const [assignedDeptSelect, setAssignedDeptSelect] = useState(''); // 대상자 부서 드롭다운 선택용
  const [customAssignedDeptInput, setCustomAssignedDeptInput] = useState(''); // 대상자 부서 직접 입력용
  const [assignedUserSelect, setAssignedUserSelect] = useState(''); // 대상자 드롭다운 선택용
  const [customAssignedUserInput, setCustomAssignedUserInput] = useState(''); // 대상자 직접 입력용 (사번/이름)
  const [selectedRelatedMembers, setSelectedRelatedMembers] = useState([]); // [4] 유관부서 및 담당자 복수 목록 [{ deptName, userId, userName }]
  const [relatedDeptSelect, setRelatedDeptSelect] = useState(''); // 유관부서 선택 드롭다운용
  const [relatedUserSelect, setRelatedUserSelect] = useState(''); // 유관부서 담당자 선택 드롭다운용
  const [customRelatedDeptInput, setCustomRelatedDeptInput] = useState(''); // 유관부서 직접 입력용
  const [customRelatedUserInput, setCustomRelatedUserInput] = useState(''); // 유관부서 담당자 직접 입력용
  const [capDeadline1st, setCapDeadline1st] = useState('');
  const [capDeadline2nd, setCapDeadline2nd] = useState('');
  const [capDeadline3rd, setCapDeadline3rd] = useState('');
  const [targetDateText, setTargetDateText] = useState('');

  // 5번 메뉴: 시스템 관리자 사용자 신규 등록 모달 상태
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCorpId, setNewCorpId] = useState('');
  const [customCorpInput, setCustomCorpInput] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [newRole, setNewRole] = useState('MEMBER');
  const [createUserError, setCreateUserError] = useState('');
  // ID 중복확인 상태 ('AVAILABLE' | 'EXISTS' | 'CHECKING' | null)
  const [idCheckStatus, setIdCheckStatus] = useState(null);
  const [idCheckMessage, setIdCheckMessage] = useState('');

  // 5번 메뉴: 글로벌세아, 세아상역 사원 검색 및 자동등록 상태
  const [searchEmpName, setSearchEmpName] = useState('');
  const [searchEmpCorp, setSearchEmpCorp] = useState('ALL'); // 'ALL' | '글로벌세아' | '세아상역'
  const [searchEmpResults, setSearchEmpResults] = useState([]);
  const [searchEmpLoading, setSearchEmpLoading] = useState(false);
  const [searchEmpMessage, setSearchEmpMessage] = useState('');

  // 알림 상태
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // 권한 확인 헬퍼
  const isAuditTeam = ['SYSTEM_ADMIN', 'AUDIT_LEADER', 'AUDITOR'].includes(user?.role);
  const isAuditTeamOrExec = ['SYSTEM_ADMIN', 'AUDIT_LEADER', 'AUDITOR', 'EXEC'].includes(user?.role);
  const isCorpUser = ['CORP_HEAD', 'LEAD_REP', 'MEMBER'].includes(user?.role);

  // 지적사항(CAP) 이력 타임라인 로드 함수
  const fetchFindingHistories = async (findingId) => {
    if (!findingId) {
      setFindingHistories([]);
      return;
    }
    try {
      setHistoryLoading(true);
      const res = await axios.get(`/api/findings/${findingId}/histories`);
      const histories = res.data || [];
      histories.sort((a, b) => {
        const tA = new Date(a.actionAt || a.createdAt || 0).getTime();
        const tB = new Date(b.actionAt || b.createdAt || 0).getTime();
        return tB - tA;
      });
      setFindingHistories(histories);
    } catch (err) {
      console.error('이력 로드 실패:', err);
      setFindingHistories([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // 지적사항(CAP) 첨부파일 목록 로드 함수
  const fetchFindingAttachments = async (findingId) => {
    if (!findingId) return;
    try {
      setAttachmentLoading(true);
      const res = await axios.get(`/api/findings/${findingId}/attachments`);
      setFindingAttachments(prev => ({ ...prev, [findingId]: res.data || [] }));
    } catch (err) {
      console.error('첨부파일 목록 로드 실패:', err);
      setFindingAttachments(prev => ({ ...prev, [findingId]: [] }));
    } finally {
      setAttachmentLoading(false);
    }
  };

  // 1. 데이터베이스로부터 데이터 로드 (백엔드 프로시저 연동 API 호출)
  const loadData = async () => {
    try {
      setError('');
      loadUsers(); // 모든 화면에서 사용자 성명/부서 표시를 위해 항상 로드
      const projRes = await axios.get('/api/projects');
      setProjects(projRes.data);

      const findRes = await axios.get('/api/findings');
      setFindings(findRes.data);

      // 발견사항 항목 초기값 및 첫 항목 선택
      if (findRes.data.length > 0) {
        const initialDeadlines = {};
        const initialCompletions = {};
        const initialStatus = {};
        findRes.data.forEach(f => {
          if (f.actionDeadline) {
            initialDeadlines[f.findingId] = f.actionDeadline.substring(0, 10);
          }
          if (f.completionDate) {
            initialCompletions[f.findingId] = f.completionDate.substring(0, 10);
          }
          if (f.actionStatusCode) {
            initialStatus[f.findingId] = f.actionStatusCode;
          }
        });
        setActionDeadlines(prev => ({ ...initialDeadlines, ...prev }));
        setCompletionDates(prev => ({ ...initialCompletions, ...prev }));
        setActionStatusCodes(prev => ({ ...initialStatus, ...prev }));

        setSelectedFindingId(prev => {
          const nextId = (prev && findRes.data.some(f => f.findingId === prev)) ? prev : findRes.data[0].findingId;
          fetchFindingHistories(nextId);
          fetchFindingAttachments(nextId);
          return nextId;
        });
      }

      // 프로젝트는 사용자가 명시적으로 선택하기 전까지 미선택 상태 유지
    } catch (err) {
      console.error('백엔드 데이터 통신 실패 상세:', err);
      const detail = err.response?.data?.message || err.response?.statusText || err.message || '';
      setError(`백엔드 데이터 통신에 실패했습니다 (${detail}). (기본 Mock 데이터 로드함)`);

      // Fallback Mock 데이터 정의
      setProjects([
        { projectId: 1, projectName: '2026_법인A', corpId: 'CORP_A', projectState: 'OPEN', deadline1st: '2026-08-31T00:00:00', deadline2nd: '2026-09-30T00:00:00', deadline3rd: '2026-10-31T00:00:00', createdBy: 'AUDIT01' },
        { projectId: 2, projectName: '2026_법인B', corpId: 'CORP_B', projectState: 'FREEZE', deadline1st: '2026-07-15T00:00:00', deadline2nd: '2026-08-15T00:00:00', deadline3rd: '2026-09-15T00:00:00', createdBy: 'AUDIT01' }
      ]);
      setFindings([
        {
          findingId: 101,
          project: { projectId: 1, projectName: '2026_법인A', corpId: 'CORP_A', projectState: 'OPEN' },
          category: '재무',
          title: '구매 증빙 누락건 발생',
          findingText: '2026년 1분기 구매 증빙 일부가 전산에 누락되었습니다.',
          assignedUserId: 'EMP001',
          assignedDeptName: '회계팀',
          actionText: '',
          findingState: 'OPEN',
          targetDateText: '2026년 3차 마감 전까지'
        },
        {
          findingId: 102,
          project: { projectId: 2, projectName: '2026_법인B', corpId: 'CORP_B', projectState: 'FREEZE' },
          category: 'IT보안',
          title: '개발 서버 접근 제어 미흡',
          findingText: '개발 서버에 대한 비인가 IP 접근 제어 설정이 부재합니다.',
          assignedUserId: 'EMP002',
          assignedDeptName: 'IT지원부',
          actionText: '인프라 방화벽 IP 접근 제어 설정 완료됨.',
          findingState: 'APPROVED',
          targetDateText: '즉시 조치 완료'
        }
      ]);
    }
  };

  useEffect(() => {
    setError('');
    setMessage('');
    loadData();
    loadCategories();
    loadUsers();
  }, [activeMenu]);

  const loadCategories = async () => {
    try {
      const res = await axios.get('/api/categories');
      if (res.data && res.data.length > 0) {
        setCategories(res.data);
      }
    } catch (err) {
      setCategories([
        { categoryId: 1, categoryName: '재무', sortOrder: 1 },
        { categoryId: 2, categoryName: 'IT보안', sortOrder: 2 },
        { categoryId: 3, categoryName: '운영', sortOrder: 3 },
        { categoryId: 4, categoryName: '컴플라이언스', sortOrder: 4 },
      ]);
    }
  };

  const handleAddCategory = async () => {
    const trimmed = newCatInputName.trim();
    if (!trimmed) return;
    try {
      await axios.post('/api/categories', { categoryName: trimmed, sortOrder: categories.length + 1 });
      setNewCatInputName('');
      loadCategories();
      setMessage(`새 카테고리 '${trimmed}' 등록 완료`);
    } catch (err) {
      setError(err.response?.data?.message || '카테고리 등록 실패');
    }
  };

  const handleUpdateCategory = async (catId) => {
    const trimmed = editingCatName.trim();
    if (!trimmed) return;
    try {
      await axios.put(`/api/categories/${catId}`, { categoryName: trimmed });
      setEditingCatId(null);
      setEditingCatName('');
      loadCategories();
      setMessage('카테고리가 성공적으로 수정되었습니다.');
    } catch (err) {
      setError(err.response?.data?.message || '카테고리 수정 실패');
    }
  };

  const handleDeleteCategory = async (catId, name) => {
    if (!window.confirm(`'${name}' 카테고리를 정말 삭제하시겠습니까?`)) return;
    try {
      await axios.delete(`/api/categories/${catId}`);
      loadCategories();
      setMessage(`'${name}' 카테고리가 삭제되었습니다.`);
    } catch (err) {
      setError(err.response?.data?.message || '카테고리 삭제 실패');
    }
  };

  const handleSelectCap = (cap) => {
    if (!cap) {
      setSelectedCapId(null);
      setNewTitle('');
      setNewFindingText('');
      setNewCategory(categories.length > 0 ? categories[0].categoryName : '재무');
      setCustomCategoryInput('');
      // 로그인 사용자가 감사팀인 경우 기본 담당 감사자로 자동 포함
      const defaultAuditor = user?.username && isAuditTeam ? [user.username] : [];
      setSelectedAuditors(defaultAuditor);
      setSelectedAssignedUsers([]);
      setAssignedUser('');
      setAssignedDept('');
      setAssignedDeptSelect('');
      setCustomAssignedDeptInput('');
      setAssignedUserSelect('');
      setCustomAssignedUserInput('');
      setSelectedRelatedMembers([]);
      setRelatedDeptSelect('');
      setRelatedUserSelect('');
      setCustomRelatedDeptInput('');
      setCustomRelatedUserInput('');
      setCapDeadline1st('');
      setCapDeadline2nd('');
      setCapDeadline3rd('');
      setTargetDateText('');
      return;
    }

    setSelectedCapId(cap.findingId);

    // 1) 분류 카테고리: 기존 목록에 있는지 확인
    const catName = cap.category || '재무';
    const existsInList = categories.some(c => c.categoryName === catName);
    if (existsInList) {
      setNewCategory(catName);
      setCustomCategoryInput('');
    } else {
      setNewCategory('__NEW__');
      setCustomCategoryInput(catName);
    }

    setNewTitle(cap.title || '');
    setNewFindingText(cap.findingText || '');

    // 2) 담당 감사자 목록 (쉼표 구분 파싱 및 하위호환)
    if (cap.auditorsInCharge && cap.auditorsInCharge.trim()) {
      const list = cap.auditorsInCharge.split(',').map(s => s.trim()).filter(Boolean);
      setSelectedAuditors(list);
    } else if (cap.assignedUserId && usersList.some(u => u.username === cap.assignedUserId && ['SYSTEM_ADMIN', 'AUDIT_LEADER', 'AUDITOR'].includes(u.role))) {
      // 기존 단일 감사자 데이터인 경우
      setSelectedAuditors([cap.assignedUserId]);
    } else {
      const defaultAuditor = user?.username && isAuditTeam ? [user.username] : [];
      setSelectedAuditors(defaultAuditor);
    }

    // 3) CAP 달성 피감법인 담당자 (복수 파싱 지원)
    const rawAssigned = cap.assignedUserId ? cap.assignedUserId.trim() : '';
    setAssignedUser(rawAssigned);
    setAssignedDept(cap.assignedDeptName || '');
    if (rawAssigned) {
      const ids = rawAssigned.split(',').map(s => s.trim()).filter(Boolean);
      const parsedUsers = ids.map(id => {
        const found = usersList.find(u => u.username === id);
        return {
          userId: id,
          name: found ? found.name : id,
          deptName: found ? found.deptName : (cap.assignedDeptName || '')
        };
      });
      setSelectedAssignedUsers(parsedUsers);
    } else {
      setSelectedAssignedUsers([]);
    }
    setAssignedDeptSelect('');
    setCustomAssignedDeptInput('');
    setAssignedUserSelect('');
    setCustomAssignedUserInput('');

    // 4) 유관부서 및 협조 담당자 복수 목록 파싱
    if (cap.relatedDepts && cap.relatedDepts.trim()) {
      const items = cap.relatedDepts.split(',').map(s => s.trim()).filter(Boolean);
      const parsedMembers = items.map(item => {
        if (item.includes(' - ')) {
          const parts = item.split(' - ');
          const dept = parts[0].trim();
          const userPart = parts[1].trim();
          const match = userPart.match(/^(.*?)\((.*?)\)$/);
          if (match) {
            return { deptName: dept, userName: match[1].trim(), userId: match[2].trim() };
          }
          return { deptName: dept, userName: userPart, userId: '' };
        } else if (item.includes('(') && item.endsWith(')')) {
          const idx = item.indexOf('(');
          const dept = item.substring(0, idx).trim();
          const inner = item.substring(idx + 1, item.length - 1).trim();
          const slashParts = inner.split('/');
          const uName = slashParts[0].trim();
          const uId = slashParts.length > 1 ? slashParts[1].trim() : '';
          return { deptName: dept, userName: uName, userId: uId };
        }
        return { deptName: item, userName: '', userId: '' };
      });
      setSelectedRelatedMembers(parsedMembers);
    } else {
      setSelectedRelatedMembers([]);
    }
    setRelatedDeptSelect('');
    setRelatedUserSelect('');
    setCustomRelatedDeptInput('');
    setCustomRelatedUserInput('');

    setTargetDateText(cap.targetDateText || '');
    setCapDeadline1st(cap.deadline1st ? cap.deadline1st.substring(0, 10) : (cap.targetDate ? cap.targetDate.substring(0, 10) : ''));
    setCapDeadline2nd(cap.deadline2nd ? cap.deadline2nd.substring(0, 10) : '');
    setCapDeadline3rd(cap.deadline3rd ? cap.deadline3rd.substring(0, 10) : '');
  };

  // CAP 달성 대상자 추가/제거 핸들러 (상시 추가 지원)
  const handleAddAssignedUser = (userId, deptName, userName) => {
    if (!userId) return;
    const cleanId = userId.trim();
    if (selectedAssignedUsers.some(u => u.userId === cleanId)) {
      setError('이미 추가된 CAP 달성 대상자입니다.');
      setTimeout(() => setError(''), 3000);
      return;
    }
    const found = usersList.find(u => u.username === cleanId);
    const newUser = {
      userId: cleanId,
      name: userName || (found ? found.name : cleanId),
      deptName: deptName || (found ? found.deptName : '')
    };
    const updated = [...selectedAssignedUsers, newUser];
    setSelectedAssignedUsers(updated);
    setAssignedUser(updated.map(u => u.userId).join(','));
    setAssignedDept(Array.from(new Set(updated.map(u => u.deptName).filter(Boolean))).join(','));
    setAssignedUserSelect('');
    setCustomAssignedUserInput('');
  };

  const handleRemoveAssignedUser = (userId) => {
    const updated = selectedAssignedUsers.filter(u => u.userId !== userId);
    setSelectedAssignedUsers(updated);
    setAssignedUser(updated.map(u => u.userId).join(','));
    setAssignedDept(Array.from(new Set(updated.map(u => u.deptName).filter(Boolean))).join(','));
  };

  // 유관부서 및 협조 담당자 추가/제거 헬퍼 함수
  const handleAddRelatedMember = (dept, userObj, customName) => {
    const cleanDept = dept ? dept.trim() : '';
    if (!cleanDept) {
      setError('유관부서를 선택하거나 입력해 주세요.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    let userId = '';
    let userName = '';
    if (userObj && typeof userObj === 'object') {
      userId = userObj.username || '';
      userName = userObj.name || '';
    } else if (typeof userObj === 'string' && userObj.trim()) {
      userId = userObj.trim();
      const found = usersList.find(u => u.username === userId);
      userName = found ? found.name : (customName ? customName.trim() : userId);
    } else if (customName && customName.trim()) {
      userName = customName.trim();
    }

    if (!userName && !userId) {
      setError('유관부서의 담당자(성명 또는 사번)를 선택하거나 입력해 주세요.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const newMember = { deptName: cleanDept, userId, userName };
    const isDup = selectedRelatedMembers.some(m =>
      m.deptName === cleanDept && (userId ? m.userId === userId : m.userName === userName)
    );
    if (isDup) {
      setError('이미 추가된 유관부서 담당자입니다.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setSelectedRelatedMembers(prev => [...prev, newMember]);
    setRelatedDeptSelect('');
    setRelatedUserSelect('');
    setCustomRelatedDeptInput('');
    setCustomRelatedUserInput('');
  };

  const handleRemoveRelatedMember = (index) => {
    setSelectedRelatedMembers(prev => prev.filter((_, idx) => idx !== index));
  };

  // 담당 감사자 다중 추가/제거 핸들러
  const handleAddAuditor = (auditorId) => {
    if (!auditorId) return;
    if (!selectedAuditors.includes(auditorId)) {
      setSelectedAuditors(prev => [...prev, auditorId]);
    }
  };

  const handleRemoveAuditor = (auditorId) => {
    setSelectedAuditors(prev => prev.filter(id => id !== auditorId));
  };

  const loadUsers = async () => {
    try {
      // 1. 모든 로그인 사용자가 성명 표기에 필요한 기본 매핑 정보 로드 (/api/users/display-map)
      const mapRes = await axios.get('/api/users/display-map');
      if (mapRes.data && Array.isArray(mapRes.data) && mapRes.data.length > 0) {
        setUsersList(mapRes.data);
        return;
      }
    } catch (mapErr) {
      // display-map 실패 시 관리자/감사팀이면 /api/users 호출 시도
    }

    if (['SYSTEM_ADMIN', 'AUDIT_LEADER', 'AUDITOR'].includes(user?.role)) {
      try {
        const res = await axios.get('/api/users');
        setUsersList(res.data || []);
      } catch (err) {
        // 오류는 조용히 무시 (권한 부족 등)
      }
    }
  };

  // 프로젝트 생성 시 소속법인 사용자 다중 추가/제거 핸들러
  const handleAddCorpUser = (userId) => {
    if (!userId) return;
    if (!selectedCorpUsers.includes(userId)) {
      setSelectedCorpUsers(prev => [...prev, userId]);
    }
  };

  const handleRemoveCorpUser = (userId) => {
    setSelectedCorpUsers(prev => prev.filter(id => id !== userId));
  };

  // 프로젝트 생성 시 유관부서(DEPT_MEMBER) 담당자 다중 추가/제거 핸들러 (법인 무관)
  const handleAddDeptUser = (userId) => {
    if (!userId) return;
    if (!selectedDeptUsers.includes(userId)) {
      setSelectedDeptUsers(prev => [...prev, userId]);
    }
  };

  const handleRemoveDeptUser = (userId) => {
    setSelectedDeptUsers(prev => prev.filter(id => id !== userId));
  };

  const handleRoleChange = async (username, newRole) => {
    try {
      await axios.put(`/api/users/${username}/role`, { role: newRole });
      setMessage(`${username} 님의 권한이 ${newRole}(으)로 변경되었습니다.`);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || '권한 변경 실패');
    }
  };

  const handleToggleUserStatus = async (username, currentStatus) => {
    try {
      const nextStatus = !currentStatus;
      await axios.put(`/api/users/${username}/status`, { enabled: nextStatus });
      setMessage(`${username} 님의 계정이 ${nextStatus ? '사용 중' : '사용 안함'} 상태로 변경되었습니다.`);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || '사용자 상태 변경 실패');
    }
  };

  // 5번 메뉴: ID 중복확인 핸들러
  const handleCheckUsername = async () => {
    const trimmedId = newUsername.trim();
    if (!trimmedId) {
      setIdCheckStatus('EXISTS');
      setIdCheckMessage('확인할 ID를 입력해 주세요.');
      return;
    }

    // 1차 클라이언트단 usersList 검사
    const clientFound = usersList.some(u => u.username && u.username.toLowerCase() === trimmedId.toLowerCase());
    if (clientFound) {
      setIdCheckStatus('EXISTS');
      setIdCheckMessage('❌ 이미 사용 중인 ID입니다.');
      return;
    }

    // 2차 백엔드 API 검사
    try {
      setIdCheckStatus('CHECKING');
      setIdCheckMessage('중복 확인 중...');
      const res = await axios.get(`/api/users/check-username?username=${encodeURIComponent(trimmedId)}`);
      if (res.data.available) {
        setIdCheckStatus('AVAILABLE');
        setIdCheckMessage('✅ 사용 가능한 ID입니다.');
      } else {
        setIdCheckStatus('EXISTS');
        setIdCheckMessage('❌ 이미 등록된 ID입니다.');
      }
    } catch (err) {
      if (!clientFound) {
        setIdCheckStatus('AVAILABLE');
        setIdCheckMessage('✅ 사용 가능한 ID입니다.');
      } else {
        setIdCheckStatus('EXISTS');
        setIdCheckMessage('❌ 이미 등록된 ID입니다.');
      }
    }
  };

  // 5번 메뉴: 시스템 관리자 전용 사용자 신규 등록 핸들러
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateUserError('');

    if (!newUsername.trim()) {
      setCreateUserError('ID를 입력해 주세요.');
      return;
    }

    if (idCheckStatus !== 'AVAILABLE') {
      setCreateUserError('ID 중복확인을 먼저 완료해 주세요. (중복확인 버튼 클릭)');
      return;
    }

    if (!newPassword.trim()) {
      setCreateUserError('비밀번호를 입력해 주세요.');
      return;
    }
    if (!newName.trim()) {
      setCreateUserError('이름을 입력해 주세요.');
      return;
    }

    // 소속 법인 결정 (신규 입력 여부 확인)
    const targetCorp = newCorpId === '__NEW__' ? customCorpInput.trim() : (newCorpId.trim() || customCorpInput.trim());
    if (!targetCorp) {
      setCreateUserError('소속 법인을 선택하거나 신규 법인명을 직접 입력해 주세요.');
      return;
    }

    try {
      await axios.post('/api/users', {
        username: newUsername.trim(),
        password: newPassword.trim(),
        name: newName.trim(),
        email: newEmail.trim(),
        corpId: targetCorp,
        deptName: newDeptName.trim(),
        role: newRole,
      });

      setMessage(`[${newName} (${newUsername})] 사용자 계정이 성공적으로 등록되었습니다.`);
      setCreateUserModalOpen(false);

      // 필드 초기화
      setNewUsername('');
      setNewPassword('');
      setNewName('');
      setNewEmail('');
      setNewCorpId('');
      setCustomCorpInput('');
      setNewDeptName('');
      setNewRole('MEMBER');
      setIdCheckStatus(null);
      setIdCheckMessage('');

      loadUsers();
    } catch (err) {
      setCreateUserError(err.response?.data?.message || '사용자 등록 중 오류가 발생했습니다.');
    }
  };

  // 5번 메뉴: 신규 사용자 등록 모달 열기 (ID, PW 및 모든 입력필드 명시적 클리어)
  const handleOpenCreateUserModal = () => {
    setCreateUserError('');
    setNewUsername('');
    setNewPassword('');
    setNewName('');
    setNewEmail('');
    setNewCorpId('');
    setCustomCorpInput('');
    setNewDeptName('');
    setNewRole('MEMBER');
    setIdCheckStatus(null);
    setIdCheckMessage('');
    setSearchEmpName('');
    setSearchEmpResults([]);
    setSearchEmpMessage('');
    setCreateUserModalOpen(true);
  };

  // 5번 메뉴: 신규 사용자 등록 모달 닫기
  const handleCloseCreateUserModal = () => {
    setCreateUserModalOpen(false);
    setCreateUserError('');
    setNewUsername('');
    setNewPassword('');
    setNewName('');
    setNewEmail('');
    setNewCorpId('');
    setCustomCorpInput('');
    setNewDeptName('');
    setNewRole('MEMBER');
    setIdCheckStatus(null);
    setIdCheckMessage('');
    setSearchEmpName('');
    setSearchEmpResults([]);
    setSearchEmpMessage('');
  };

  // 5번 메뉴: 글로벌세아 / 세아상역 사원 검색 핸들러
  const handleSearchEmployee = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const query = searchEmpName.trim();
    if (!query) {
      setSearchEmpMessage('검색할 사원의 이름을 입력해 주세요.');
      return;
    }
    setSearchEmpLoading(true);
    setSearchEmpMessage('');
    setSearchEmpResults([]);
    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get('/api/users/search-employee', {
        params: {
          name: query,
          corp: searchEmpCorp === 'ALL' ? '' : searchEmpCorp,
        },
        headers
      });
      const data = res.data || [];
      setSearchEmpResults(data);
      if (data.length === 0) {
        setSearchEmpMessage(`'${query}' 사원 검색 결과가 없습니다. 직접 수동으로 입력해 주세요.`);
      } else if (data.length === 1) {
        handleSelectEmployee(data[0]);
        setSearchEmpMessage(`💡 [${data[0].corpId} / ${data[0].deptName}] ${data[0].name} 사원 정보가 자동 완성되었습니다.`);
      } else {
        setSearchEmpMessage(`👥 동명이인이 ${data.length}명 검색되었습니다. 등록할 대상 사원의 [선택] 또는 [즉시 등록]을 클릭하세요.`);
      }
    } catch (err) {
      console.error('사원 검색 실패:', err);
      let errorMsg = err.response?.data?.message;
      if (!errorMsg) {
        if (err.response?.status === 403) {
          errorMsg = '사원 검색 권한이 부족합니다. (관리자 권한 확인 필요)';
        } else if (err.response?.status === 401) {
          errorMsg = '인증 세션이 만료되었습니다. 다시 로그인해 주세요.';
        } else if (!err.response) {
          errorMsg = '백엔드 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.';
        } else {
          errorMsg = `사원 검색 처리 중 오류가 발생했습니다. (${err.response?.status || err.message})`;
        }
      }
      setSearchEmpMessage(errorMsg);
    } finally {
      setSearchEmpLoading(false);
    }
  };

  // 검색된 사원 선택 시 폼 필드 자동 완성 (ID, 성명, 법인, 부서 등 매핑, 비밀번호는 자동입력하지 않음)
  const handleSelectEmployee = (emp) => {
    setNewUsername(emp.username);
    setNewName(emp.name);
    setNewEmail(emp.email || `${emp.username}@sae-a.com`);
    setNewCorpId(emp.corpId || '글로벌세아');
    setCustomCorpInput('');
    setNewDeptName(emp.deptName || '현업부서');
    setNewPassword(''); // 비밀번호 자동 입력 방지
    if (emp.alreadyRegistered) {
      setIdCheckStatus('EXISTS');
      setIdCheckMessage('⚠️ 이미 등록된 사번(ID)입니다.');
    } else {
      setIdCheckStatus('AVAILABLE');
      setIdCheckMessage('✅ 사내 인사 시스템 연동 확인 완료 (등록 가능)');
    }
  };

  // 검색된 사원 즉시 등록 (원클릭 자동 등록)
  const handleQuickRegisterEmployee = async (emp) => {
    if (emp.alreadyRegistered) {
      alert(`[${emp.name}] (사번/ID: ${emp.username}) 계정은 이미 등록되어 있습니다.`);
      return;
    }
    try {
      const payload = {
        username: emp.username,
        password: newPassword.trim() || 'Sa123456!',
        name: emp.name,
        email: emp.email || `${emp.username}@sae-a.com`,
        corpId: emp.corpId || '글로벌세아',
        deptName: emp.deptName || '현업부서',
        role: newRole || 'MEMBER',
      };
      await axios.post('/api/users', payload);
      alert(`[${emp.name}] 사원(사번: ${emp.username}, 소속: ${emp.corpId} ${emp.deptName}) 계정이 성공적으로 자동 등록되었습니다.`);
      setCreateUserModalOpen(false);
      // 필드 초기화
      setNewUsername('');
      setNewPassword('');
      setNewName('');
      setNewEmail('');
      setNewCorpId('');
      setCustomCorpInput('');
      setNewDeptName('');
      setNewRole('MEMBER');
      setIdCheckStatus(null);
      setIdCheckMessage('');
      setSearchEmpName('');
      setSearchEmpResults([]);
      setSearchEmpMessage('');
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || '사용자 등록 중 오류가 발생했습니다.');
    }
  };

  // 1번 메뉴: 프로젝트 등록 핸들러
  const handleCreateProject = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!isAuditTeam) {
      setError('프로젝트 등록은 감사팀(시스템 관리자, 감사 책임자, 감사 담당자) 권한이 필요합니다.');
      return;
    }

    const selectedCorp = newProjectCorp === '__NEW__' ? customProjectCorpInput.trim() : newProjectCorp;
    if (!selectedCorp) {
      setError('소속법인을 선택하거나 직접 입력해 주세요.');
      return;
    }

    // 1. 소속법인 사용자 필수 선택 검증
    if (selectedCorpUsers.length === 0) {
      setError('소속법인 접근 허용 사용자를 최소 1명 이상 필수로 선택해 주세요.');
      return;
    }

    // 2. 마감일 필수 입력 검증 (마감일 1개만 필수)
    if (!deadline1st) {
      setError('마감일을 필수로 입력해 주세요.');
      return;
    }

    const allAssignedUsers = [...new Set([...selectedCorpUsers, ...selectedDeptUsers])];

    try {
      const res = await axios.post('/api/projects', {
        projectName: newProjectName,
        corpId: selectedCorp,
        assignedDepts: allAssignedUsers.join(','),
        deadline1st: deadline1st + 'T00:00:00',
        deadline2nd: null,
        deadline3rd: null,
      });
      setMessage(`새 프로젝트 '${res.data.projectName}' 등록이 완료되었습니다.`);
      setNewProjectName('');
      setNewAssignedDepts('');
      setSelectedCorpUsers([]);
      setSelectedDeptUsers([]);
      setDeadline1st('');
      setDeadline2nd('');
      setDeadline3rd('');
      setNewProjectCorp('');
      setCustomProjectCorpInput('');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || '프로젝트 등록에 실패했습니다. (네이밍 연도_법인명 규칙 준수 필수)');
    }
  };

  // 1번 메뉴: 완료(Completion) 프로젝트 기반 차기 프로젝트 생성 핸들러
  const handleCreateProjectFromFrozen = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!isAuditTeam) {
      setError('프로젝트 생성은 감사팀 권한이 필요합니다.');
      return;
    }
    if (!selectedFrozenParentId) {
      setError('기반이 될 완료 프로젝트를 선택해 주세요.');
      return;
    }
    if (!newProjectName.trim()) {
      setError('신규 프로젝트명을 입력해 주세요.');
      return;
    }
    if (!deadline1st) {
      setError('신규 마감일을 입력해 주세요.');
      return;
    }

    try {
      const res = await axios.post('/api/projects/create-from-frozen', {
        parentProjectId: selectedFrozenParentId,
        projectName: newProjectName.trim(),
        deadline1st: deadline1st + 'T00:00:00'
      });
      setMessage(`완료 프로젝트 기반 차기 프로젝트 '${res.data.projectName}'(${res.data.round || 2}차)가 성공적으로 생성되었습니다. (개선완료 건 제외 승계 완료)`);
      setNewProjectName('');
      setDeadline1st('');
      setSelectedFrozenParentId('');
      setProjectCreateMode('NEW');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || '완료 프로젝트 기반 차기 프로젝트 생성 실패');
    }
  };

  // 2번 메뉴: 일반사용자 조치사항 및 마감기한, 개선완료일자, 조치상태 임시저장 핸들러
  const handleUpdateAction = async (findingId, projectState, projectCorpId) => {
    setError('');
    setMessage('');

    if (projectState === 'FREEZE') {
      setError('이 프로젝트는 최종 승인 완료로 완료(Completion) 상태이므로 조치를 변경할 수 없습니다.');
      return;
    }

    if (!isAuditTeamOrExec && user.corpId !== projectCorpId && user.role !== 'DEPT_MEMBER') {
      setError('타 법인의 감사 데이터에 대한 조치 작성 권한이 없습니다.');
      return;
    }

    const currentFinding = findings.find(f => f.findingId === findingId);
    if (currentFinding?.approvalStatus === 'PENDING_AUDIT') {
      setError('감사실에 제출되어 검증이 진행 중인 지적사항은 수정할 수 없습니다.');
      return;
    }
    if (currentFinding?.approvalStatus === 'AUDIT_CONFIRMED') {
      setError('감사실 검증이 최종 완료된 지적사항은 수정할 수 없습니다.');
      return;
    }
    const actionText = actionInputs[findingId] !== undefined ? actionInputs[findingId] : (currentFinding?.actionText || '');
    const actionDeadline = actionDeadlines[findingId] ? actionDeadlines[findingId] + 'T00:00:00' : (currentFinding?.actionDeadline || null);
    const completionDate = completionDates[findingId] ? completionDates[findingId] + 'T00:00:00' : (currentFinding?.completionDate || null);
    const actionStatusCode = actionStatusCodes[findingId] || currentFinding?.actionStatusCode || 'NOT_WRITTEN';

    // 5단계 상태값 클라이언트단 유효성 검증
    if (actionStatusCode === 'IN_PROGRESS' && !actionDeadline) {
      setError("'개선중' 상태는 '개선 예상 시기' 날짜를 필수로 입력해야 합니다.");
      return;
    }
    if (actionStatusCode === 'COMPLETED') {
      if (!completionDate) {
        setError("'개선완료' 상태는 '개선완료일자'를 필수로 입력해야 합니다.");
        return;
      }
      if (!actionText || !actionText.trim()) {
        setError("'개선완료' 상태는 개선내용(답변)을 필수로 입력해야 합니다.");
        return;
      }
    }

    try {
      const res = await axios.put(`/api/findings/${findingId}/action`, {
        actionText,
        actionDeadline,
        completionDate: (actionStatusCode === 'ACTION_IMPOSSIBLE' || actionStatusCode === 'CONTINUOUS_MANAGEMENT') ? null : completionDate,
        actionStatusCode,
      });
      setMessage(res.data.message || '조치 사항이 임시저장되었습니다.');
      loadData();
      fetchFindingHistories(findingId);
    } catch (err) {
      setError(err.response?.data?.message || '조치 내역 저장 실패');
    }
  };

  // [결재선 1단계] 법인담당자 CONFIRM (대표담당자 확인 요청)
  const handleConfirmMember = async (findingId) => {
    setError('');
    setMessage('');

    const currentFinding = findings.find(f => f.findingId === findingId);
    const currentStatus = actionStatusCodes[findingId] || currentFinding?.actionStatusCode || 'NOT_WRITTEN';
    const currentDeadline = actionDeadlines[findingId] || currentFinding?.actionDeadline;
    const currentCompletion = completionDates[findingId] || currentFinding?.completionDate;

    if (currentStatus === 'NOT_WRITTEN') {
      setError("'미작성' 상태에서는 제출(CONFIRM)할 수 없습니다. 조치 상태(개선중/개선완료 등)를 선택하고 입력해 주세요.");
      return;
    }
    if (currentStatus === 'IN_PROGRESS' && !currentDeadline) {
      setError("'개선중' 상태는 '개선 예상 시기' 날짜가 필수입니다.");
      return;
    }
    if (currentStatus === 'COMPLETED' && !currentCompletion) {
      setError("'개선완료' 상태는 '개선완료일자'가 필수입니다.");
      return;
    }

    try {
      const res = await axios.post(`/api/findings/${findingId}/confirm-member`, {});
      setMessage(res.data.message || '법인 대표담당자에게 확인 요청(CONFIRM)되었습니다.');
      loadData();
      fetchFindingHistories(findingId);
    } catch (err) {
      setError(err.response?.data?.message || 'CONFIRM 요청 중 오류가 발생했습니다.');
    }
  };

  // [결재선 2단계-1] 법인 대표담당자 CONFIRM (감사팀 검증 요청 / 제출)
  const handleConfirmLead = async (findingId) => {
    setError('');
    setMessage('');

    const currentFinding = findings.find(f => f.findingId === findingId);
    const currentStatus = actionStatusCodes[findingId] || currentFinding?.actionStatusCode || 'NOT_WRITTEN';
    const currentDeadline = actionDeadlines[findingId] || currentFinding?.actionDeadline;
    const currentCompletion = completionDates[findingId] || currentFinding?.completionDate;

    if (currentStatus === 'NOT_WRITTEN') {
      setError("'미작성' 상태에서는 제출(CONFIRM)할 수 없습니다. 조치 상태(개선중/개선완료 등)를 선택하고 입력해 주세요.");
      return;
    }
    if (currentStatus === 'IN_PROGRESS' && !currentDeadline) {
      setError("'개선중' 상태는 '개선 예상 시기' 날짜가 필수입니다.");
      return;
    }
    if (currentStatus === 'COMPLETED' && !currentCompletion) {
      setError("'개선완료' 상태는 '개선완료일자'가 필수입니다.");
      return;
    }

    const comment = window.prompt('대표담당자 검토 의견(선택 사항)을 입력하세요:');
    if (comment === null) return;

    try {
      const res = await axios.post(`/api/findings/${findingId}/lead-confirm`, { comment });
      setMessage(res.data.message || '법인 대표담당자 확인이 완료되어 감사팀으로 제출되었습니다.');
      loadData();
      fetchFindingHistories(findingId);
    } catch (err) {
      setError(err.response?.data?.message || '대표담당자 확인 처리 실패');
    }
  };

  // [결재선 3단계-1] 감사담당자 CONFIRM (해당 CAP 종료)
  const handleConfirmAudit = async (findingId) => {
    setError('');
    setMessage('');
    const comment = window.prompt('감사 검증 완료 의견(선택 사항)을 입력하세요:');
    if (comment === null) return;

    try {
      const res = await axios.post(`/api/findings/${findingId}/audit-confirm`, { comment });
      setMessage(res.data.message || '감사담당자 검증이 완료되어 해당 CAP이 최종 종료되었습니다.');
      loadData();
      fetchFindingHistories(findingId);
    } catch (err) {
      setError(err.response?.data?.message || '감사담당자 검증 처리 실패');
    }
  };

  // [결재선 반려/재수정요청 모달 열기] type: 'LEAD' (대표 재수정) | 'AUDIT' (감사 재작성)
  const openRejectModal = (finding, type = 'LEAD') => {
    setRejectTargetFinding(finding);
    setRejectType(type);
    setRejectReasonText('');
    setRejectModalOpen(true);
  };

  // [결재선 반려/재수정요청 실행]
  const handleConfirmReject = async () => {
    if (!rejectReasonText.trim()) {
      alert('요청 사유를 필히 입력해 주세요.');
      return;
    }
    const findingId = rejectTargetFinding.findingId;
    const endpoint = rejectType === 'LEAD' ? 'lead-reject' : 'audit-reject';

    try {
      const res = await axios.post(`/api/findings/${findingId}/${endpoint}`, {
        reason: rejectReasonText.trim()
      });
      setMessage(res.data.message || '재수정(보완) 요청 처리가 완료되었습니다.');
      setRejectModalOpen(false);
      setRejectTargetFinding(null);
      loadData();
      fetchFindingHistories(findingId);
    } catch (err) {
      alert(err.response?.data?.message || '요청 처리 실패');
    }
  };

  // [유관부서 협조 내용/의견 추가 실행]
  const handleAddDeptContent = async (findingId) => {
    if (!deptAdditionalContent.trim()) {
      alert('추가할 내용을 입력해 주세요.');
      return;
    }
    try {
      const res = await axios.post(`/api/findings/${findingId}/dept-content`, {
        content: deptAdditionalContent.trim()
      });
      setMessage(res.data.message || '유관부서 내용이 성공적으로 추가되었습니다.');
      setDeptAdditionalContent('');
      loadData();
      fetchFindingHistories(findingId);
    } catch (err) {
      alert(err.response?.data?.message || '유관부서 내용 추가 실패');
    }
  };

  // [프로젝트 최종 결재] 1단계: 법인장 최종 확정
  const handleHeadConfirmProject = async (projectId) => {
    setError('');
    setMessage('');
    const comment = window.prompt('법인장 최종 확정 의견(선택 사항):');
    if (comment === null) return;

    try {
      const res = await axios.post(`/api/projects/${projectId}/head-confirm`, { comment });
      setMessage(res.data.message || '법인장 최종 확정이 완료되었습니다. (감사담당자 확인 대기)');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || '법인장 최종 확정 실패');
    }
  };

  // [프로젝트 최종 결재] 2단계: 감사담당자 확인 CONFIRM
  const handleAuditorConfirmProject = async (projectId) => {
    setError('');
    setMessage('');
    const comment = window.prompt('감사담당자 확인 의견(선택 사항):');
    if (comment === null) return;

    try {
      const res = await axios.post(`/api/projects/${projectId}/auditor-review`, { comment });
      setMessage(res.data.message || '감사담당자 확인이 완료되었습니다. (감사책임자 최종 승인 대기)');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || '감사담당자 확인 실패');
    }
  };

  // [프로젝트 최종 결재] 3단계: 감사팀 최종 CONFIRM & 완료(Completion)
  const handleLeaderConfirmFreezeProject = async (projectId) => {
    setError('');
    setMessage('');
    if (!window.confirm('감사팀 최종 승인을 진행하시겠습니까? 승인 시 프로젝트가 완료(Completion)되어 더 이상 수정할 수 없습니다.')) {
      return;
    }
    const comment = window.prompt('감사팀 최종 승인 및 완료 의견(선택 사항):', '감사팀 최종 승인 및 완료 처리');
    if (comment === null) return;

    try {
      const res = await axios.post(`/api/projects/${projectId}/leader-approve`, { comment });
      setMessage(res.data.message || '감사팀 최종 승인이 완료되어 프로젝트가 완료(Completion)되었습니다.');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || '감사팀 최종 승인 및 완료 처리 실패');
    }
  };

  // [증빙 파일 다운로드] 첨부파일 안전 다운로드
  const handleDownloadFile = async (fileId, fileName) => {
    try {
      const res = await axios.get(`/api/findings/attachments/${fileId}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || '증빙자료');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('파일 다운로드 실패:', err);
      alert('파일 다운로드 중 오류가 발생했습니다.');
    }
  };

  // [통합 매뉴얼 다운로드] 단일 통합 PPTX 파일 다운로드 핸들러
  const handleDownloadIntegratedManual = async () => {
    try {
      const res = await axios.get('/api/manual/download', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'SAE-A_CAP_Integrated_Manual.pptx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage('글로벌 세아 CAP 관리 시스템 통합 사용자 매뉴얼(PPT)이 다운로드되었습니다.');
    } catch (err) {
      console.warn('API 다운로드 실패 시 정적 파일 fallback 다운로드 시도');
      const link = document.createElement('a');
      link.href = '/manuals/SAE-A_CAP_Integrated_Manual.pptx';
      link.setAttribute('download', 'SAE-A_CAP_Integrated_Manual.pptx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMessage('글로벌 세아 CAP 관리 시스템 통합 사용자 매뉴얼(PPT)이 다운로드되었습니다.');
    }
  };

  // [감사팀] 감사 검토 모달 열기
  const openAuditReviewModal = (finding, status) => {
    setAuditTargetFinding(finding);
    setAuditReviewStatus(status || 'AUDIT_CONFIRMED');
    setAuditReviewComment(finding.auditReviewComment || '');
    setAuditReviewModalOpen(true);
  };

  // [감사팀] 감사 검토 실행
  const handleConfirmAuditReview = async () => {
    try {
      const res = await axios.post(`/api/findings/${auditTargetFinding.findingId}/audit-review`, {
        status: auditReviewStatus,
        comment: auditReviewComment
      });
      setMessage(res.data.message || '감사 검토가 저장되었습니다.');
      setAuditReviewModalOpen(false);
      setAuditTargetFinding(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || '감사 검토 저장 실패');
    }
  };

  // 4번 메뉴: [감사 담당자] 프로젝트 조치 확인 모달 열기
  const openAuditorReviewProjModal = (project) => {
    setTargetAuditProject(project);
    setAuditProjCommentInput(project.auditorComment || '');
    setAuditorReviewProjModalOpen(true);
  };

  // 4번 메뉴: [감사 담당자] 프로젝트 조치 확인 실행
  const handleConfirmAuditorProjReview = async () => {
    if (!targetAuditProject) return;
    try {
      const res = await axios.post(`/api/projects/${targetAuditProject.projectId}/auditor-review`, {
        comment: auditProjCommentInput
      });
      setMessage(res.data.message || '감사 담당자 조치내용 확인이 완료되었습니다.');
      setAuditorReviewProjModalOpen(false);
      setTargetAuditProject(null);
      setAuditProjCommentInput('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || '감사 담당자 확인 처리 실패');
    }
  };

  // 4번 메뉴: [감사 책임자] 조치내용 확인 및 즉시 최종 완료(Completion) 실행
  const handleConfirmAuditorProjReviewAndFreeze = async () => {
    if (!targetAuditProject) return;
    if (!window.confirm(`[${targetAuditProject.projectName}] 프로젝트의 조치내용을 확인하고, 즉시 최종 확정 및 완료(Completion) 처리하시겠습니까?`)) {
      return;
    }
    try {
      const commentText = auditProjCommentInput.trim() || '감사 책임자 조치내용 확인 및 최종 확정/완료 처리';

      // 1. 조치 확인 처리
      await axios.post(`/api/projects/${targetAuditProject.projectId}/auditor-review`, {
        comment: commentText
      });

      // 2. 최종 승인 및 완료(Completion) 처리
      await axios.post(`/api/projects/${targetAuditProject.projectId}/leader-approve`, {
        comment: commentText
      });

      setMessage(`[${targetAuditProject.projectName}] 프로젝트의 조치 확인 및 최종 완료(Completion) 처리가 완료되었습니다.`);
      setAuditorReviewProjModalOpen(false);
      setTargetAuditProject(null);
      setAuditProjCommentInput('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || '조치 확인 및 완료 처리 실패');
    }
  };

  // 4번 메뉴: [감사 책임자] 프로젝트 최종 승인 모달 열기
  const openLeaderApproveProjModal = (project) => {
    setTargetAuditProject(project);
    setAuditProjCommentInput(project.auditLeaderComment || '');
    setLeaderApproveProjModalOpen(true);
  };

  // 4번 메뉴: [감사 책임자] 프로젝트 최종 승인 및 완료(Completion) 실행
  const handleConfirmLeaderProjApprove = async () => {
    if (!targetAuditProject) return;
    try {
      const res = await axios.post(`/api/projects/${targetAuditProject.projectId}/leader-approve`, {
        comment: auditProjCommentInput
      });
      setMessage(res.data.message || '감사 책임자 최종 승인이 완료되어 프로젝트가 완료(Completion)되었습니다.');
      setLeaderApproveProjModalOpen(false);
      setTargetAuditProject(null);
      setAuditProjCommentInput('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || '감사 책임자 최종 승인 실패');
    }
  };

  // 4번 메뉴: [감사팀] 프로젝트 반려 / 보완요청 모달 열기
  const openAuditRejectProjModal = (project) => {
    setTargetAuditProject(project);
    setAuditProjRejectReasonInput('');
    setAuditRejectProjModalOpen(true);
  };

  // 4번 메뉴: [감사팀] 프로젝트 반려 / 보완요청 실행
  const handleConfirmAuditProjReject = async () => {
    if (!targetAuditProject) return;
    if (!auditProjRejectReasonInput.trim()) {
      alert('보완 요청 사유를 입력해 주세요.');
      return;
    }
    try {
      const res = await axios.post(`/api/projects/${targetAuditProject.projectId}/audit-reject`, {
        reason: auditProjRejectReasonInput
      });
      setMessage(res.data.message || '감사 보완 요청(반려)이 완료되었습니다.');
      setAuditRejectProjModalOpen(false);
      setTargetAuditProject(null);
      setAuditProjRejectReasonInput('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || '감사 보완 요청 처리 실패');
    }
  };

  // 2번 메뉴: 증빙 파일 업로드 핸들러 (다중 파일 일괄 업로드 및 상태값 사전 검증 적용)
  const handleFileUpload = async (findingId, projectState, approvalStatus, actionStatusCode) => {
    setError('');
    setMessage('');

    const rawFiles = uploadFiles[findingId];
    const fileList = Array.isArray(rawFiles) ? rawFiles : (rawFiles ? [rawFiles] : []);

    if (fileList.length === 0) {
      setError('업로드할 파일을 1개 이상 먼저 선택해 주세요.');
      return;
    }

    if (projectState === 'FREEZE') {
      setError('완료(Completion) 상태인 프로젝트에는 증빙 파일을 업로드할 수 없습니다.');
      return;
    }

    if (approvalStatus === 'PENDING_AUDIT') {
      setError('감사실에 제출되어 검증이 진행 중인 항목에는 증빙 파일을 추가 업로드할 수 없습니다.');
      return;
    }

    if (approvalStatus === 'AUDIT_CONFIRMED') {
      setError('감사실 검증이 최종 완료(조치종료)된 항목에는 증빙 파일을 업로드할 수 없습니다.');
      return;
    }

    // 각 파일 크기(최대 50MB) 및 확장자(exe, bat 차단) 일괄 검증
    for (const file of fileList) {
      if (file.size > 50 * 1024 * 1024) {
        setError(`파일 [${file.name}]의 용량이 50MB를 초과합니다 (파일당 최대 50MB).`);
        return;
      }

      const ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'exe' || ext === 'bat') {
        setError(`보안 규정 상 [${file.name}]과 같은 실행 파일(exe, bat)은 업로드할 수 없습니다.`);
        return;
      }
    }

    const formData = new FormData();
    fileList.forEach(file => {
      formData.append('files', file);
    });
    formData.append('uploadType', 'ACTION_EVIDENCE');

    try {
      const res = await axios.post(`/api/findings/${findingId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage(res.data?.message || `${fileList.length}개의 증빙 파일 업로드가 완료되었습니다.`);
      // 선택된 파일 목록 초기화
      setUploadFiles(prev => ({ ...prev, [findingId]: [] }));
      const fileInput = document.getElementById(`file-upload-input-${findingId}`);
      if (fileInput) fileInput.value = '';
      // 첨부파일 목록 및 전체 데이터 리프레시
      fetchFindingAttachments(findingId);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || '증빙 파일 업로드 실패');
    }
  };

  // 2번 메뉴: 증빙 파일 다운로드 핸들러
  const handleDownloadAttachment = async (fileId, fileName) => {
    try {
      const res = await axios.get(`/api/findings/attachments/${fileId}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || '증빙자료');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('파일 다운로드 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  // 2번 메뉴: 증빙 파일 삭제 핸들러
  const handleDeleteAttachment = async (fileId, findingId) => {
    if (!window.confirm('등록된 증빙 파일을 삭제하시겠습니까?')) return;
    try {
      await axios.delete(`/api/findings/attachments/${fileId}`);
      setMessage('증빙 파일이 정상적으로 삭제되었습니다.');
      fetchFindingAttachments(findingId);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || '증빙 파일 삭제 실패');
    }
  };

  // 3번 메뉴: 감사팀용 발견사항(CAP) 등록 및 수정 핸들러
  const handleSaveFinding = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!isAuditTeam) {
      setError('발견사항(CAP) 관리는 감사팀 전용 기능입니다.');
      return;
    }

    if (!selectedProjectId) {
      setError('대상 감사 프로젝트를 선택해 주세요.');
      return;
    }

    const finalCategory = newCategory === '__NEW__' ? customCategoryInput.trim() : newCategory;
    if (!finalCategory) {
      setError('분류 카테고리를 선택하거나 직접 입력해 주세요.');
      return;
    }

    const auditorsStr = selectedAuditors.join(',');

    const finalAssignedUserId = selectedAssignedUsers.length > 0
      ? selectedAssignedUsers.map(u => u.userId).join(',')
      : (assignedUser ? assignedUser.trim() : null);

    const finalAssignedDeptName = selectedAssignedUsers.length > 0
      ? Array.from(new Set(selectedAssignedUsers.map(u => u.deptName).filter(Boolean))).join(',')
      : (assignedDept ? assignedDept.trim() : null);

    const finalRelatedDepts = selectedRelatedMembers.length > 0
      ? selectedRelatedMembers.map(m => m.userName ? `${m.deptName} - ${m.userName}${m.userId ? `(${m.userId})` : ''}` : m.deptName).join(',')
      : null;

    try {
      if (selectedCapId) {
        // 기존 CAP 수정
        await axios.put(`/api/findings/${selectedCapId}`, {
          category: finalCategory,
          title: newTitle,
          findingText: newFindingText,
          auditorsInCharge: auditorsStr,
          assignedUserId: finalAssignedUserId,
          assignedDeptName: finalAssignedDeptName,
          relatedDepts: finalRelatedDepts,
          expectedDeadline: capDeadline1st ? capDeadline1st + 'T00:00:00' : null,
          targetDate: capDeadline1st ? capDeadline1st + 'T00:00:00' : null,
          targetDateText: targetDateText,
          deadline1st: capDeadline1st ? capDeadline1st + 'T00:00:00' : null,
          deadline2nd: null,
          deadline3rd: null,
        });
        setMessage(`발견사항(CAP #${selectedCapId}) 정보가 성공적으로 수정되었습니다.`);
      } else {
        // 신규 CAP 등록
        const res = await axios.post('/api/findings', {
          projectId: parseInt(selectedProjectId, 10),
          category: finalCategory,
          title: newTitle,
          findingText: newFindingText,
          auditorsInCharge: auditorsStr,
          assignedUserId: finalAssignedUserId,
          assignedDeptName: finalAssignedDeptName,
          relatedDepts: finalRelatedDepts,
          expectedDeadline: capDeadline1st ? capDeadline1st + 'T00:00:00' : null,
          targetDate: capDeadline1st ? capDeadline1st + 'T00:00:00' : null,
          targetDateText: targetDateText,
          deadline1st: capDeadline1st ? capDeadline1st + 'T00:00:00' : null,
          deadline2nd: null,
          deadline3rd: null,
        });
        setMessage(`새 발견사항(CAP #${res.data.findingId}) 등록이 완료되었습니다.`);
        handleSelectCap(null);
      }
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || '발견사항 저장에 실패했습니다.');
    }
  };

  // 4번 메뉴: 프로젝트 완료 (Completion) 처리
  const handleFreezeProject = async (projectId, projectCorpId) => {
    setError('');
    setMessage('');

    if (user.role !== 'CORP_HEAD' && !isAuditTeam) {
      setError('법인장(CORP_HEAD) 또는 감사팀만 프로젝트 완료(Completion) 처리를 실행할 수 있습니다.');
      return;
    }

    if (!isAuditTeam && user.corpId !== projectCorpId) {
      setError('본인 소속 법인의 프로젝트만 완료 처리가 가능합니다.');
      return;
    }

    try {
      await axios.post(`/api/projects/${projectId}/freeze`);
      setMessage('프로젝트가 안전하게 완료(Completion)되었습니다.');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || '완료(Completion) 처리 중 오류가 발생했습니다.');
    }
  };

  // 4번 메뉴: 프로젝트 Open (완료 해제) 처리
  const handleUnfreezeProject = async (projectId, projectCorpId) => {
    setError('');
    setMessage('');

    if (user.role !== 'CORP_HEAD' && !isAuditTeam) {
      setError('법인장(CORP_HEAD) 또는 감사팀만 프로젝트 Open(완료 해제)을 실행할 수 있습니다.');
      return;
    }

    if (!isAuditTeam && user.corpId !== projectCorpId) {
      setError('본인 소속 법인의 프로젝트만 완료 해제가 가능합니다.');
      return;
    }

    try {
      await axios.post(`/api/projects/${projectId}/unfreeze`);
      setMessage('프로젝트 완료가 해제되고 다시 오픈(Open)되었습니다.');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || '완료 해제(Open) 처리 중 오류가 발생했습니다.');
    }
  };

  return (
    <div style={styles.appContainer}>
      {/* 1. 좌측 사이드바 메뉴 */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <SaeALogo
            variant="blue"
            height={34}
            subtitleText="CAP Monitoring System"
            subColor="#94a3b8"
          />
        </div>

        <nav style={styles.navMenu}>
          {groupedUserMenus.map((group) => {
            const isCollapsed = collapsedGroups[group.groupName];
            return (
              <div key={group.groupName} style={styles.navGroupContainer}>
                {/* 그룹 헤더 (클릭 시 접기/펼치기) */}
                <div
                  onClick={() => toggleGroup(group.groupName)}
                  className="saea-nav-group-header"
                  style={styles.navGroupHeader}
                  title="클릭하여 그룹 접기/펼치기"
                >
                  <span className="saea-nav-group-title" style={styles.navGroupTitle}>
                    {group.groupName}
                  </span>
                  <span className="saea-nav-group-chevron" style={styles.navGroupChevron}>{isCollapsed ? '▶' : '▼'}</span>
                </div>

                {/* 그룹 내 화면 메뉴 목록 */}
                {!isCollapsed && (
                  <div className="saea-sub-menu-tree" style={styles.navSubMenuList}>
                    {group.items.map((menu) => {
                      const active = isMenuActive(menu);
                      return (
                        <button
                          key={menu.id || menu.menuCode}
                          onClick={() => setActiveMenu(menu.menuCode)}
                          className="saea-sub-menu-item"
                          style={active ? styles.activeNavItem : styles.navItem}
                          title={menu.description || menu.menuName}
                        >
                          <span style={styles.navItemText}>{menu.menuName}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div style={styles.sidebarFooter}>
        </div>
      </aside>

      {/* 2. 우측 메인 콘텐츠 영역 */}
      <main style={styles.mainContent}>
        <header style={{ ...styles.contentHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>
            {(() => {
              const current = userMenus.find(m => isMenuActive(m));
              if (current) {
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#475569', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: '4px', fontWeight: '600' }}>
                      {current.groupName || '메뉴'}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>&gt;</span>
                    <span style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>
                      {current.menuName}
                    </span>
                  </div>
                );
              }
              if (isMenuActive('PROJECT_REGISTER')) return '감사 프로젝트 신규 등록';
              if (isMenuActive('ACTION_PLAN_INPUT')) return '감사 조치계획 등록 및 관리';
              if (isMenuActive('FINDING_MANAGEMENT')) return '감사 지적사항 (CAP) 관리';
              if (isMenuActive('HEAD_FINAL_APPROVAL')) return '프로젝트 최종 검증 및 확정';
              if (isMenuActive('REPORT_MONITORING')) return '법인별 감사 조치율 현황 및 프로젝트 통제 관리';
              if (isMenuActive('USER_MANAGEMENT')) return '사용자 계정 관리';
              if (isMenuActive('MENU_MANAGEMENT')) return '화면 및 메뉴 관리';
              if (isMenuActive('ROLE_PERMISSION_MANAGEMENT')) return '역할별 화면 접근 권한 관리';
              return '화면 뷰어';
            })()}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={handleDownloadIntegratedManual}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#ffffff',
                color: '#0077C8',
                border: '1.5px solid #0077C8',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0, 119, 200, 0.15)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f7ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
              }}
              title="실무자, 법인대표, 법인장, 감사팀, 관리자 모든 권한의 내용이 포함된 통합 사용자 매뉴얼(PPT)을 하나의 파일로 다운로드합니다."
            >
              <span style={{ fontSize: '14px' }}>📥</span>
              <span>통합 매뉴얼 다운로드 (PPT)</span>
            </button>
            <div style={styles.topProfile}>
              <span style={styles.topProfileBadge}>{user.corpId} {user.deptName}</span>
              <span style={styles.topProfileName}><strong>{user.name || user.username}</strong> 님 환영합니다</span>
            </div>
            <button onClick={logout} style={styles.logoutBtn}>로그아웃</button>
          </div>
        </header>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {message && <div style={styles.successBanner}>{message}</div>}

        <div style={styles.scrollableContent}>

          {/* ================================================================= */}
          {/* 1번 탭: 프로젝트 신규 등록 (감사팀 전용) */}
          {/* ================================================================= */}
          {isMenuActive('PROJECT_REGISTER') && (() => {
            const frozenProjects = projects.filter(p => p.projectState === 'FREEZE');
            const selectedParentProject = projects.find(p => p.projectId === Number(selectedFrozenParentId));
            const parentFindings = selectedFrozenParentId ? findings.filter(f => f.project?.projectId === Number(selectedFrozenParentId)) : [];
            const completedFindings = parentFindings.filter(f => (f.actionStatusCode || '').toUpperCase() === 'COMPLETED');
            const inheritableFindings = parentFindings.filter(f => (f.actionStatusCode || '').toUpperCase() !== 'COMPLETED');

            return (
              <div style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>감사 프로젝트 생성 및 연계 관리</h3>
                    <p style={{ ...styles.cardSubtitle, margin: '4px 0 0 0' }}>
                      새로운 감사 프로젝트를 생성하거나, 이전 완료(Completion) 프로젝트를 승계하여 차기 프로젝트를 개설합니다. (감사팀 전용)
                    </p>
                  </div>

                  {/* 생성 모드 전환 탭 */}
                  <div style={{ display: 'flex', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '8px', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setProjectCreateMode('NEW');
                        setNewProjectName('');
                        setSelectedFrozenParentId('');
                        setDeadline1st('');
                      }}
                      style={{
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        backgroundColor: projectCreateMode === 'NEW' ? '#ffffff' : 'transparent',
                        color: projectCreateMode === 'NEW' ? '#1e293b' : '#64748b',
                        boxShadow: projectCreateMode === 'NEW' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      신규 프로젝트 등록
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProjectCreateMode('FROM_FROZEN');
                        setNewProjectName('');
                        setDeadline1st('');
                      }}
                      style={{
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        backgroundColor: projectCreateMode === 'FROM_FROZEN' ? '#ffffff' : 'transparent',
                        color: projectCreateMode === 'FROM_FROZEN' ? '#1d4ed8' : '#64748b',
                        boxShadow: projectCreateMode === 'FROM_FROZEN' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      완료 프로젝트 기반 차기 프로젝트 생성
                    </button>
                  </div>
                </div>

                {projectCreateMode === 'NEW' ? (
                  <form onSubmit={handleCreateProject} style={styles.form}>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>프로젝트명 (연도_법인명 규칙 필히 준수)</label>
                      <input
                        type="text"
                        placeholder="예: 2026_법인A"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        required
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>소속법인</label>
                      {(() => {
                        const existingCorps = Array.from(new Set(usersList.map(u => u.corpId).filter(Boolean))).sort();
                        const corpsToRender = existingCorps.length > 0 ? existingCorps : ['CORP_A', 'CORP_B', 'CORP_C'];
                        return (
                          <>
                            <select
                              value={newProjectCorp}
                              onChange={(e) => {
                                setNewProjectCorp(e.target.value);
                                if (e.target.value !== '__NEW__') {
                                  setCustomProjectCorpInput('');
                                }
                                setSelectedCorpUsers([]);
                              }}
                              style={styles.select}
                              required
                            >
                              <option value="">-- 소속법인 선택 --</option>
                              {corpsToRender.map(corp => (
                                <option key={corp} value={corp}>{corp}</option>
                              ))}
                              <option value="__NEW__">➕ 신규 법인 직접 입력...</option>
                            </select>

                            {newProjectCorp === '__NEW__' && (
                              <input
                                type="text"
                                placeholder="신규 소속법인 코드 또는 명칭 입력"
                                value={customProjectCorpInput}
                                onChange={(e) => setCustomProjectCorpInput(e.target.value)}
                                required
                                style={{ ...styles.input, marginTop: '6px' }}
                              />
                            )}
                          </>
                        );
                      })()}
                    </div>

                    {/* 1. 소속법인 접근 허용 사용자 (해당 법인 사용자 직접 선택 - 필수) */}
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>
                        소속법인 접근 허용 사용자 <span style={{ color: '#ef4444' }}>* (필수 선택)</span>
                      </label>
                      {(() => {
                        const effectiveCorp = newProjectCorp === '__NEW__' ? customProjectCorpInput.trim() : newProjectCorp;

                        if (!effectiveCorp) {
                          return (
                            <div style={{
                              padding: '10px 14px',
                              backgroundColor: '#f8fafc',
                              border: '1px dashed #cbd5e1',
                              borderRadius: '6px',
                              color: '#64748b',
                              fontSize: '12px'
                            }}>
                              👆 먼저 위의 <b>소속법인</b>을 선택하시면 해당 법인의 사용자 목록이 활성화됩니다.
                            </div>
                          );
                        }

                        const corpUsers = usersList.filter(u => u.corpId === effectiveCorp && u.enabled !== false);

                        return (
                          <div>
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAddCorpUser(e.target.value);
                                }
                              }}
                              style={styles.select}
                            >
                              <option value="">
                                {corpUsers.length > 0
                                  ? `-- [${effectiveCorp}] 소속 사용자 선택 (클릭 시 추가) --`
                                  : `-- [${effectiveCorp}] 소속 등록 사용자가 없습니다 --`}
                              </option>
                              {corpUsers.map(u => {
                                const isAlreadySelected = selectedCorpUsers.includes(u.username);
                                const roleLabel = getRoleKoreanName(u.role);
                                return (
                                  <option key={u.username} value={u.username} disabled={isAlreadySelected}>
                                    {u.name || u.username} (ID: {u.username} / {u.deptName ? `${u.deptName} · ` : ''}{roleLabel}) {isAlreadySelected ? ' [선택됨]' : ''}
                                  </option>
                                );
                              })}
                            </select>

                            {/* 선택된 소속법인 사용자 뱃지 태그 목록 */}
                            {selectedCorpUsers.length > 0 ? (
                              <div style={{ marginTop: '10px' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                  {selectedCorpUsers.map(userId => {
                                    const userObj = usersList.find(u => u.username === userId);
                                    const roleLabel = userObj ? getRoleKoreanName(userObj.role) : '';
                                    const displayName = userObj
                                      ? `${userObj.name || userObj.username} (ID: ${userId}${userObj.deptName ? ` / ${userObj.deptName}` : ''}${roleLabel ? ` · ${roleLabel}` : ''})`
                                      : userId;
                                    return (
                                      <span
                                        key={userId}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          padding: '6px 12px',
                                          backgroundColor: '#eff6ff',
                                          color: '#1d4ed8',
                                          border: '1px solid #bfdbfe',
                                          borderRadius: '6px',
                                          fontSize: '13px',
                                          fontWeight: 'bold',
                                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                        }}
                                      >
                                        <span>{displayName}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveCorpUser(userId)}
                                          title="제거"
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#1e40af',
                                            cursor: 'pointer',
                                            fontWeight: 'bold',
                                            fontSize: '14px',
                                            padding: 0,
                                            marginLeft: '4px',
                                            lineHeight: 1,
                                          }}
                                        >
                                          ✕
                                        </button>
                                      </span>
                                    );
                                  })}
                                </div>
                                <div style={{ fontSize: '12px', color: '#1d4ed8', marginTop: '8px', fontWeight: 'bold' }}>
                                  ※ 지정된 소속법인 {selectedCorpUsers.length}명의 사용자에게 해당 프로젝트 접근 권한이 부여됩니다.
                                </div>
                              </div>
                            ) : (
                              <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '6px', fontWeight: 'bold' }}>
                                ※ 소속법인 사용자는 <b>필수 선택 항목</b>입니다. 위 드롭다운에서 접근을 허용할 법인 사용자를 최소 1명 이상 추가해 주세요.
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* 2. 접근허용 유관부서 담당자 (법인에 관계없이 선택 가능) */}
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>접근허용 유관부서 담당자 (선택 - 법인 무관)</label>
                      {(() => {
                        const deptMemberUsers = usersList.filter(u => u.role === 'DEPT_MEMBER' && u.enabled !== false);
                        return (
                          <div>
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAddDeptUser(e.target.value);
                                }
                              }}
                              style={styles.select}
                            >
                              <option value="">
                                {deptMemberUsers.length > 0
                                  ? '-- 유관부서 담당자 선택 (법인에 상관없이 추가할 사용자를 클릭하세요) --'
                                  : '-- 등록된 유관부서 사용자가 없습니다 (사용자 관리에서 유관부서 권한 등록 필요) --'}
                              </option>
                              {deptMemberUsers.map(u => {
                                const isAlreadySelected = selectedDeptUsers.includes(u.username);
                                return (
                                  <option key={u.username} value={u.username} disabled={isAlreadySelected}>
                                    {u.name || u.username} (ID: {u.username} / {u.corpId} {u.deptName ? `· ${u.deptName}` : ''}) {isAlreadySelected ? ' [선택됨]' : ''}
                                  </option>
                                );
                              })}
                            </select>

                            {/* 선택된 유관부서 사용자 뱃지 태그 목록 */}
                            {selectedDeptUsers.length > 0 ? (
                              <div style={{ marginTop: '10px' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                  {selectedDeptUsers.map(userId => {
                                    const userObj = usersList.find(u => u.username === userId);
                                    const displayName = userObj
                                      ? `${userObj.name || userObj.username} (ID: ${userId} / ${userObj.corpId}${userObj.deptName ? ` · ${userObj.deptName}` : ''})`
                                      : userId;
                                    return (
                                      <span
                                        key={userId}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          padding: '6px 12px',
                                          backgroundColor: '#fdf2f8',
                                          color: '#db2777',
                                          border: '1px solid #fbcfe8',
                                          borderRadius: '6px',
                                          fontSize: '13px',
                                          fontWeight: 'bold',
                                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                        }}
                                      >
                                        <span>{displayName}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveDeptUser(userId)}
                                          title="제거"
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#be185d',
                                            cursor: 'pointer',
                                            fontWeight: 'bold',
                                            fontSize: '14px',
                                            padding: 0,
                                            marginLeft: '4px',
                                            lineHeight: 1,
                                          }}
                                        >
                                          ✕
                                        </button>
                                      </span>
                                    );
                                  })}
                                </div>
                                <div style={{ fontSize: '12px', color: '#db2777', marginTop: '8px', fontWeight: 'bold' }}>
                                  ※ 지정된 {selectedDeptUsers.length}명의 유관부서 담당자에게 본 프로젝트 접근 및 조치 참여 권한이 부여됩니다.
                                </div>
                              </div>
                            ) : (
                              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>
                                * 유관부서(DEPT_MEMBER) 권한을 가진 사용자를 <b>법인에 관계없이</b> 선택하여 지정할 수 있습니다. (선택된 유관부서 담당자는 해당 프로젝트를 열람하고 조치에 참여할 수 있습니다)
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '28px',
                      padding: '14px 18px',
                      backgroundColor: '#f0f7fc',
                      borderRadius: '8px',
                      border: '1px solid #b9daf2',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ ...styles.formLabel, whiteSpace: 'nowrap', marginBottom: 0, color: '#1e293b' }}>
                          마감일 <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="date"
                          value={deadline1st}
                          onChange={(e) => setDeadline1st(e.target.value)}
                          required
                          style={{ ...styles.input, width: '160px', padding: '8px 10px' }}
                        />
                      </div>
                    </div>

                    <button type="submit" style={styles.primaryBtn}>신규 프로젝트 저장</button>
                  </form>
                ) : (
                  /* 완료 프로젝트 기반 차기 프로젝트 생성 폼 */
                  <form onSubmit={handleCreateProjectFromFrozen} style={styles.form}>
                    <div style={{
                      padding: '16px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      marginBottom: '16px'
                    }}>
                      <div style={styles.formGroup}>
                        <label style={{ ...styles.formLabel, fontWeight: 'bold', color: '#1e293b' }}>
                          기반이 될 이전 완료(Completion) 프로젝트 선택 <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <select
                          value={selectedFrozenParentId}
                          onChange={(e) => {
                            const pid = e.target.value;
                            setSelectedFrozenParentId(pid);
                            const p = projects.find(x => x.projectId === Number(pid));
                            if (p) {
                              const nextRound = (p.round || 1) + 1;
                              setNewProjectName(`${p.projectName}_${nextRound}차`);
                            } else {
                              setNewProjectName('');
                            }
                          }}
                          style={styles.select}
                          required
                        >
                          <option value="">-- 완료(Completion) 프로젝트 선택 --</option>
                          {frozenProjects.map(fp => (
                            <option key={fp.projectId} value={fp.projectId}>
                              [{fp.corpId}] {fp.projectName} ({fp.round || 1}차 프로젝트)
                            </option>
                          ))}
                        </select>
                        {frozenProjects.length === 0 && (
                          <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '6px' }}>
                            ※ 현재 최종 완료(Completion)된 프로젝트가 없습니다. (법인장 최종 확정이 완료된 프로젝트만 모태로 승계 가능합니다)
                          </div>
                        )}
                      </div>

                      {/* 승계 분석 패널 */}
                      {selectedParentProject && (
                        <div style={{ marginTop: '14px', padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                            <h4 style={{ margin: 0, fontSize: '15px', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              이전 차수 CAP 승계 분석 결과
                            </h4>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0284c7', backgroundColor: '#e0f2fe', padding: '3px 8px', borderRadius: '4px' }}>
                              소속 법인: {selectedParentProject.corpId} · 차수: {(selectedParentProject.round || 1)}차 ➔ {(selectedParentProject.round || 1) + 1}차 생성
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 120px', padding: '10px 14px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                              <div style={{ fontSize: '12px', color: '#64748b' }}>이전 프로젝트 총 CAP</div>
                              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>{parentFindings.length}건</div>
                            </div>
                            <div style={{ flex: '1 1 120px', padding: '10px 14px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                              <div style={{ fontSize: '12px', color: '#166534' }}>제외 대상 (개선완료)</div>
                              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#15803d' }}>{completedFindings.length}건</div>
                            </div>
                            <div style={{ flex: '1 1 120px', padding: '10px 14px', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                              <div style={{ fontSize: '12px', color: '#1d4ed8' }}>승계 대상 (미완료 항목)</div>
                              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2563eb' }}>{inheritableFindings.length}건</div>
                            </div>
                          </div>

                          <div style={{ fontSize: '13px', color: '#0369a1', lineHeight: '1.5', marginBottom: inheritableFindings.length > 0 ? '12px' : '0' }}>
                            ※ <b>승계 규칙:</b> 이전 차수에서 '개선완료'된 {completedFindings.length}건은 종결되어 차기 프로젝트에서 자동 제외되며, <b>미완료({inheritableFindings.length}건)</b> 항목만 신규 프로젝트로 승계되어 계속 관리됩니다. (승계된 CAP은 '작성중(DRAFT)' 상태로 초기화되어 새로운 조치 답변을 등록할 수 있습니다)
                          </div>

                          {inheritableFindings.length > 0 && (
                            <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff' }}>
                              <table style={{ ...styles.table, marginTop: 0 }}>
                                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc' }}>
                                  <tr>
                                    <th style={{ ...styles.th, width: '80px', textAlign: 'center' }}>원래 CAP</th>
                                    <th style={{ ...styles.th, width: '100px' }}>분류</th>
                                    <th style={styles.th}>발견사항 제목</th>
                                    <th style={{ ...styles.th, width: '120px' }}>담당자</th>
                                    <th style={{ ...styles.th, width: '110px', textAlign: 'center' }}>현재 조치상태</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {inheritableFindings.map(f => (
                                    <tr key={f.findingId}>
                                      <td style={styles.tdCenter}>#{f.findingId}</td>
                                      <td style={styles.td}><span style={styles.badgeCategory}>{f.category}</span></td>
                                      <td style={styles.td}><strong>{f.title}</strong></td>
                                      <td style={styles.td}>{f.assignedUserId} ({f.assignedDeptName || '-'})</td>
                                      <td style={styles.tdCenter}>
                                        <span style={{
                                          fontSize: '11px',
                                          fontWeight: 'bold',
                                          color: f.actionStatusCode === 'IN_PROGRESS' ? '#d97706' : (f.actionStatusCode === 'ACTION_IMPOSSIBLE' ? '#dc2626' : (f.actionStatusCode === 'CONTINUOUS_MANAGEMENT' ? '#2563eb' : '#64748b'))
                                        }}>
                                          {f.actionStatusCode === 'IN_PROGRESS' ? '개선중' : (f.actionStatusCode === 'ACTION_IMPOSSIBLE' ? '개선불가' : (f.actionStatusCode === 'CONTINUOUS_MANAGEMENT' ? '지속관리' : '미작성'))}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>
                        신규 프로젝트명 <span style={{ color: '#ef4444' }}>*</span> (추천 명칭 자동 입력됨)
                      </label>
                      <input
                        type="text"
                        placeholder="예: 2026_법인A_2차"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        required
                        style={styles.input}
                      />
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '28px',
                      padding: '14px 18px',
                      backgroundColor: '#f0f7fc',
                      borderRadius: '8px',
                      border: '1px solid #b9daf2',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ ...styles.formLabel, whiteSpace: 'nowrap', marginBottom: 0, color: '#1e293b' }}>
                          차기 프로젝트 마감일 <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="date"
                          value={deadline1st}
                          onChange={(e) => setDeadline1st(e.target.value)}
                          required
                          style={{ ...styles.input, width: '160px', padding: '8px 10px' }}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!selectedFrozenParentId}
                      style={{
                        ...styles.primaryBtn,
                        backgroundColor: selectedFrozenParentId ? '#1d4ed8' : '#94a3b8',
                        cursor: selectedFrozenParentId ? 'pointer' : 'not-allowed'
                      }}
                    >
                      완료 프로젝트 기반 차기 프로젝트 생성 및 CAP 승계 ({inheritableFindings.length}건)
                    </button>
                  </form>
                )}
              </div>
            );
          })()}

          {/* ================================================================= */}
          {/* 2번 탭: 조치계획 & 필수 정보 입력 (검색조건 + 그리드 + 하단 조치/승인 패널) */}
          {/* ================================================================= */}
          {isMenuActive('ACTION_PLAN_INPUT') && (() => {
            // 필터용 고유 옵션 추출
            const uniqueActionCorps = Array.from(new Set(findings.map(f => f.project?.corpId).filter(Boolean))).sort();
            const uniqueActionDepts = Array.from(new Set(findings.map(f => f.assignedDeptName).filter(Boolean))).sort();
            const uniqueActionProjects = Array.from(new Set(findings.map(f => f.project?.projectName).filter(Boolean))).sort();
            const uniqueActionAssignees = Array.from(new Set(findings.map(f => f.assignedUserId).filter(Boolean))).sort();

            // 날짜 범위 확인 헬퍼 (마감기한 1/2/3차 중 하나라도 기간 내 포함 여부)
            const isFindingInRange = (f, fromDate, toDate) => {
              if (!fromDate && !toDate) return true;
              const p = f.project || {};
              const d1 = p.deadline1st ? p.deadline1st.substring(0, 10) : null;
              const d2 = p.deadline2nd ? p.deadline2nd.substring(0, 10) : null;
              const d3 = p.deadline3rd ? p.deadline3rd.substring(0, 10) : null;
              const tDate = f.targetDate ? f.targetDate.substring(0, 10) : null;
              const cDate = p.createdAt ? p.createdAt.substring(0, 10) : null;

              const dates = [d1, d2, d3, tDate, cDate].filter(Boolean);
              if (dates.length === 0) return true;

              return dates.some(d => {
                if (fromDate && d < fromDate) return false;
                if (toDate && d > toDate) return false;
                return true;
              });
            };

            // 검색 조건 필터링 적용 (개선완료 기본 제외 필터 반영)
            const filteredActionFindings = findings.filter(f => {
              if (excludeCompleted && (f.actionStatusCode || '').toUpperCase() === 'COMPLETED') return false;
              if (!isFindingInRange(f, actionFilterDateFrom, actionFilterDateTo)) return false;
              if (actionFilterCorp && f.project?.corpId !== actionFilterCorp) return false;
              if (actionFilterDept && f.assignedDeptName !== actionFilterDept) return false;
              if (actionFilterProject && (!f.project?.projectName || !f.project.projectName.toLowerCase().includes(actionFilterProject.toLowerCase()))) return false;
              if (actionFilterAssignee && f.assignedUserId !== actionFilterAssignee) return false;
              if (actionFilterApproval) {
                const status = f.approvalStatus || 'DRAFT';
                if (actionFilterApproval === 'REJECTED' && !status.startsWith('REJECTED')) return false;
                if (actionFilterApproval !== 'REJECTED' && status !== actionFilterApproval) return false;
              }
              return true;
            });

            // 현재 선택된 Finding
            const selectedFinding = findings.find(f => f.findingId === selectedFindingId) || (filteredActionFindings.length > 0 ? filteredActionFindings[0] : null);

            return (
              <div style={styles.containerCol}>
                {/* 1. 상단 안내 헤더 및 검색 조건 (스크롤 시 상단에 항상 고정) */}
                <div style={{
                  ...styles.card,
                  position: 'sticky',
                  top: '-30px',
                  zIndex: 20,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                  borderBottom: '2px solid #cbd5e1',
                }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>
                      감사 조치계획 및 필수 정보 입력
                    </h3>
                    <p style={{ ...styles.cardSubtitle, margin: '6px 0 0 0' }}>
                      프로젝트 및 발견사항을 검색/선택하고, 개선 조치계획을 등록하여 <b>일반담당자 ➔ 대표담당자 ➔ 감사팀</b> 순으로 결재 검증을 진행합니다.
                    </p>
                  </div>

                  {/* 2. 검색 조건 바 */}
                  <div style={{
                    marginTop: '16px',
                    padding: '14px 16px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                    alignItems: 'center'
                  }}>
                    {/* 1) 조회기간 from to */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>마감기한:</span>
                      <input
                        type="date"
                        value={actionFilterDateFrom}
                        onChange={(e) => setActionFilterDateFrom(e.target.value)}
                        style={{ padding: '5px 8px', fontSize: '13px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                      <span style={{ color: '#94a3b8' }}>~</span>
                      <input
                        type="date"
                        value={actionFilterDateTo}
                        onChange={(e) => setActionFilterDateTo(e.target.value)}
                        style={{ padding: '5px 8px', fontSize: '13px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                    </div>

                    {/* 2) 소속법인 콤보 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>소속법인:</span>
                      {isAuditTeamOrExec ? (
                        <select
                          value={actionFilterCorp}
                          onChange={(e) => setActionFilterCorp(e.target.value)}
                          style={{ padding: '5px 8px', fontSize: '13px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        >
                          <option value="">[ 전체 법인 ]</option>
                          {uniqueActionCorps.map(corp => (
                            <option key={corp} value={corp}>{corp}</option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', backgroundColor: '#e2e8f0', padding: '4px 8px', borderRadius: '4px' }}>
                          {user.corpId} (고정)
                        </span>
                      )}
                    </div>

                    {/* 3) 부서명 콤보 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>부서명:</span>
                      <select
                        value={actionFilterDept}
                        onChange={(e) => setActionFilterDept(e.target.value)}
                        style={{ padding: '5px 8px', fontSize: '13px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      >
                        <option value="">[ 전체 부서 ]</option>
                        {uniqueActionDepts.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    {/* 4) 프로젝트 명 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>프로젝트명:</span>
                      <input
                        list="actionPlanProjectDataList"
                        type="text"
                        placeholder="선택 또는 직접입력..."
                        value={actionFilterProject}
                        onChange={(e) => setActionFilterProject(e.target.value)}
                        style={{ padding: '5px 8px', fontSize: '13px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '170px' }}
                      />
                      <datalist id="actionPlanProjectDataList">
                        {uniqueActionProjects.map(pName => (
                          <option key={pName} value={pName} />
                        ))}
                      </datalist>
                    </div>

                    {/* 5) 담당자 콤보 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>담당자:</span>
                      <select
                        value={actionFilterAssignee}
                        onChange={(e) => setActionFilterAssignee(e.target.value)}
                        style={{ padding: '5px 8px', fontSize: '13px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      >
                        <option value="">[ 전체 담당자 ]</option>
                        {uniqueActionAssignees.map(ass => (
                          <option key={ass} value={ass}>{ass}</option>
                        ))}
                      </select>
                    </div>

                    {/* 6) 결재상태 콤보 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>결재현황:</span>
                      <select
                        value={actionFilterApproval}
                        onChange={(e) => setActionFilterApproval(e.target.value)}
                        style={{ padding: '5px 8px', fontSize: '13px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      >
                        <option value="">[ 전체 ]</option>
                        <option value="DRAFT">작성중 (임시저장)</option>
                        <option value="PENDING_LEAD">대표담당자 승인대기</option>
                        <option value="PENDING_AUDIT">감사실 검증대기</option>
                        <option value="REJECTED">재수정/재작성 요청 건</option>
                        <option value="AUDIT_CONFIRMED">감사팀 검토완료</option>
                      </select>
                    </div>

                    {/* 7) 개선완료 항목 제외 체크박스 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <label style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        padding: '5px 12px',
                        backgroundColor: excludeCompleted ? '#ecfdf5' : '#f1f5f9',
                        border: excludeCompleted ? '1.5px solid #10b981' : '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        color: excludeCompleted ? '#065f46' : '#64748b',
                        transition: 'all 0.15s ease'
                      }}>
                        <input
                          type="checkbox"
                          checked={excludeCompleted}
                          onChange={(e) => setExcludeCompleted(e.target.checked)}
                          style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                        />
                        <span>개선완료 항목 제외</span>
                      </label>
                    </div>

                    {/* 필터 초기화 버튼 */}
                    {(actionFilterDateFrom || actionFilterDateTo || actionFilterCorp || actionFilterDept || actionFilterProject || actionFilterAssignee || actionFilterApproval || !excludeCompleted) && (
                      <button
                        onClick={() => {
                          const d = new Date();
                          const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                          const d3 = new Date();
                          d3.setMonth(d3.getMonth() - 3);
                          const threeAgoStr = `${d3.getFullYear()}-${String(d3.getMonth() + 1).padStart(2, '0')}-${String(d3.getDate()).padStart(2, '0')}`;
                          setActionFilterDateFrom(threeAgoStr);
                          setActionFilterDateTo(todayStr);
                          setActionFilterCorp('');
                          setActionFilterDept('');
                          setActionFilterProject('');
                          setActionFilterAssignee('');
                          setActionFilterApproval('');
                          setExcludeCompleted(true);
                        }}
                        style={{
                          padding: '5px 12px',
                          fontSize: '12px',
                          backgroundColor: '#94a3b8',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        필터 초기화
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. 프로젝트 및 발견사항 그리드 리스트 */}
                <div style={styles.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ margin: 0, fontSize: '15px', color: '#334155' }}>
                      감사 대상 목록 <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#64748b' }}>(총 {filteredActionFindings.length}건{excludeCompleted ? ' · 개선완료 제외됨' : ''})</span>
                    </h4>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      ※ 행을 클릭하면 하단에서 상세 조치사항 작성 및 결재 승인을 진행할 수 있습니다.
                    </span>
                  </div>

                  <div style={{ overflowX: 'auto', maxHeight: '340px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                    <table style={{ ...styles.table, marginTop: 0 }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#f1f5f9' }}>
                        <tr>
                          <th style={{ ...styles.th, width: '40px', textAlign: 'center' }}>선택</th>
                          <th style={styles.th}>소속법인</th>
                          <th style={styles.th}>프로젝트명</th>
                          <th style={styles.th}>부서명</th>
                          <th style={styles.th}>담당자</th>
                          <th style={styles.th}>분류</th>
                          <th style={{ ...styles.th, minWidth: '200px' }}>발견사항 세부 제목</th>
                          <th style={styles.th}>감사팀 예상 마감일</th>
                          <th style={styles.th}>개선 예상 시기</th>
                          <th style={styles.th}>결재/검증 현황</th>
                          <th style={styles.th}>조치 상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredActionFindings.length === 0 ? (
                          <tr>
                            <td colSpan="11" style={styles.tdCenter}>조회 조건에 해당하는 감사 항목이 없습니다.</td>
                          </tr>
                        ) : (
                          filteredActionFindings.map((f, idx) => {
                            const isSelected = selectedFinding?.findingId === f.findingId;
                            const status = f.actionPlanStatus || f.approvalStatus || 'DRAFT';
                            const actionStatus = actionStatusCodes[f.findingId] || f.actionStatusCode || 'IN_PROGRESS';
                            const actDeadline = actionDeadlines[f.findingId] || (f.actionDeadline ? f.actionDeadline.substring(0, 10) : null);
                            const expDeadline = f.expectedDeadline ? f.expectedDeadline.substring(0, 10) : (f.deadline1st ? f.deadline1st.substring(0, 10) : '-');

                            return (
                              <tr
                                key={f.findingId}
                                onClick={() => {
                                  setSelectedFindingId(f.findingId);
                                  fetchFindingHistories(f.findingId);
                                }}
                                style={{
                                  cursor: 'pointer',
                                  backgroundColor: isSelected ? '#eff6ff' : (idx % 2 === 1 ? '#f8fafc' : '#ffffff'),
                                  borderLeft: isSelected ? '4px solid #2563eb' : '4px solid transparent',
                                  transition: 'background-color 0.15s ease'
                                }}
                              >
                                <td style={{ ...styles.td, textAlign: 'center' }}>
                                  <input
                                    type="radio"
                                    name="selectedFindingRadio"
                                    checked={isSelected}
                                    onChange={() => {
                                      setSelectedFindingId(f.findingId);
                                      fetchFindingHistories(f.findingId);
                                    }}
                                    style={{ cursor: 'pointer' }}
                                  />
                                </td>
                                <td style={styles.td}><span style={{ fontWeight: '600', color: '#1e293b' }}>{f.project?.corpId}</span></td>
                                <td style={styles.td}>
                                  <strong>{f.project?.projectName}</strong>
                                  {f.project?.round && f.project.round > 1 && (
                                    <span style={{ marginLeft: '6px', fontSize: '11px', padding: '1px 6px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontWeight: 'bold' }}>
                                      {f.project.round}차
                                    </span>
                                  )}
                                </td>
                                <td style={styles.td}>{f.assignedDeptName || '-'}</td>
                                <td style={styles.td}>{f.assignedUserId || '-'}</td>
                                <td style={styles.td}><span style={styles.badgeCategory}>{f.category}</span></td>
                                <td style={styles.td}>
                                  <div style={{ fontWeight: isSelected ? '700' : '500', color: isSelected ? '#1d4ed8' : '#334155' }}>
                                    {f.title}
                                  </div>
                                </td>
                                <td style={styles.td}>
                                  <span style={styles.dateBadge}>{expDeadline}</span>
                                </td>
                                <td style={styles.td}>
                                  {actDeadline ? (
                                    <span style={{ ...styles.dateBadge, backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                                      {actDeadline}
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>미설정</span>
                                  )}
                                </td>
                                <td style={styles.td}>
                                  {status === 'DRAFT' && <span style={{ ...styles.badgeStatus, backgroundColor: '#f1f5f9', color: '#475569' }}>작성중</span>}
                                  {status === 'PENDING_LEAD' && <span style={{ ...styles.badgeStatus, backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>대표확인대기</span>}
                                  {status === 'PENDING_AUDIT' && <span style={{ ...styles.badgeStatus, backgroundColor: '#ede9fe', color: '#6d28d9', border: '1px solid #ddd6fe' }}>감사검증대기</span>}
                                  {status === 'REJECTED_LEAD' && <span style={{ ...styles.badgeStatus, backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}>대표재수정요청</span>}
                                  {status === 'REJECTED_AUDIT' && <span style={{ ...styles.badgeStatus, backgroundColor: '#ffedd5', color: '#c2410c', border: '1px solid #fed7aa' }}>감사재작성요청</span>}
                                  {status === 'AUDIT_CONFIRMED' && <span style={{ ...styles.badgeStatus, backgroundColor: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>조치완료(종료)</span>}
                                </td>
                                <td style={styles.td}>
                                  {actionStatus === 'COMPLETED' && <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#16a34a' }}>개선완료</span>}
                                  {actionStatus === 'IN_PROGRESS' && <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#d97706' }}>개선중</span>}
                                  {actionStatus === 'ACTION_IMPOSSIBLE' && <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#dc2626' }}>개선불가</span>}
                                  {actionStatus === 'CONTINUOUS_MANAGEMENT' && <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#2563eb' }}>지속관리</span>}
                                  {(actionStatus === 'NOT_WRITTEN' || !actionStatus) && <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8' }}>미작성</span>}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4. 하단 상세 조치 내역 등록 및 단계별 승인 패널 */}
                {selectedFinding ? (() => {
                  const f = selectedFinding;
                  const status = f.actionPlanStatus || f.approvalStatus || 'DRAFT';
                  const isDraft = status === 'DRAFT';
                  const isPendingLead = status === 'PENDING_LEAD';
                  const isPendingAudit = status === 'PENDING_AUDIT';
                  const isAuditConfirmed = status === 'AUDIT_CONFIRMED';
                  const isRejectedLead = status === 'REJECTED_LEAD';
                  const isRejectedAudit = status === 'REJECTED_AUDIT';
                  const isRejected = isRejectedLead || isRejectedAudit;

                  const currentActionStatusCode = actionStatusCodes[f.findingId] !== undefined
                    ? actionStatusCodes[f.findingId]
                    : (f.actionStatusCode || 'NOT_WRITTEN');

                  const currentActionDeadline = actionDeadlines[f.findingId] !== undefined
                    ? actionDeadlines[f.findingId]
                    : (f.actionDeadline ? f.actionDeadline.substring(0, 10) : '');

                  const currentCompletionDate = completionDates[f.findingId] !== undefined
                    ? completionDates[f.findingId]
                    : (f.completionDate ? f.completionDate.substring(0, 10) : '');

                  const expDeadlineText = f.expectedDeadline ? f.expectedDeadline.substring(0, 10) : (f.deadline1st ? f.deadline1st.substring(0, 10) : '-');

                  return (
                    <div style={styles.findingCard}>
                      <div style={styles.findingHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={styles.badgeCategory}>{f.category}</span>
                          <h4 style={{ margin: 0, fontSize: '16px' }}>[{f.project?.projectName}{f.project?.round && f.project.round > 1 ? ` (${f.project.round}차)` : ''}] {f.title}</h4>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {/* 결재 상태 배지 */}
                          {isDraft && <span style={{ ...styles.badgeStatus, backgroundColor: '#f1f5f9', color: '#475569' }}>작성중 (임시저장)</span>}
                          {isPendingLead && <span style={{ ...styles.badgeStatus, backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>대표담당자 확인대기</span>}
                          {isPendingAudit && <span style={{ ...styles.badgeStatus, backgroundColor: '#ede9fe', color: '#6d28d9', border: '1px solid #ddd6fe' }}>감사실 검증대기</span>}
                          {isRejectedLead && <span style={{ ...styles.badgeStatus, backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}>대표담당자 재수정 요청</span>}
                          {isRejectedAudit && <span style={{ ...styles.badgeStatus, backgroundColor: '#ffedd5', color: '#c2410c', border: '1px solid #fed7aa' }}>감사실 재작성 요청 (보완)</span>}
                          {isAuditConfirmed && <span style={{ ...styles.badgeStatus, backgroundColor: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>감사담당자 확인완료 (조치종료)</span>}

                          <span style={f.project?.projectState === 'FREEZE' ? styles.badgeFreeze : styles.badgeOpen}>
                            {f.project?.projectState === 'FREEZE' ? '완료 (Completion)' : '진행중 (OPEN)'}
                          </span>
                        </div>
                      </div>

                      {/* 4단계 워크플로우 결재선 타임라인 진행 바 */}
                      <div style={styles.approvalTimelineBox}>
                        <div style={styles.timelineStep}>
                          <div style={{
                            ...styles.timelineCircle,
                            backgroundColor: 'var(--saea-blue, #0077C8)',
                            color: '#fff'
                          }}>1</div>
                          <span style={styles.timelineLabel}>법인담당자 조치</span>
                          <span style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap' }}>
                            {f.updatedAt ? new Date(f.updatedAt).toLocaleDateString() : (f.createdAt ? new Date(f.createdAt).toLocaleDateString() : '-')}
                          </span>
                        </div>
                        <div style={{ ...styles.timelineLine, backgroundColor: isPendingLead || isPendingAudit || isAuditConfirmed ? 'var(--saea-blue, #0077C8)' : '#cbd5e1' }} />
                        <div style={styles.timelineStep}>
                          <div style={{
                            ...styles.timelineCircle,
                            backgroundColor: isPendingAudit || isAuditConfirmed ? 'var(--saea-blue, #0077C8)' : (isPendingLead ? '#d97706' : '#94a3b8'),
                            color: '#fff'
                          }}>2</div>
                          <span style={styles.timelineLabel}>대표담당자 확인</span>
                          <span style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap' }}>
                            {f.leadApprovedAt ? new Date(f.leadApprovedAt).toLocaleDateString() : (isPendingLead ? '확인 진행중' : '-')}
                          </span>
                        </div>
                        <div style={{ ...styles.timelineLine, backgroundColor: isAuditConfirmed ? 'var(--saea-blue, #0077C8)' : (isPendingAudit ? '#7c3aed' : '#cbd5e1') }} />
                        <div style={styles.timelineStep}>
                          <div style={{
                            ...styles.timelineCircle,
                            backgroundColor: isAuditConfirmed ? 'var(--saea-blue, #0077C8)' : (isPendingAudit ? '#7c3aed' : '#94a3b8'),
                            color: '#fff'
                          }}>3</div>
                          <span style={styles.timelineLabel}>감사실 검증</span>
                          <span style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap' }}>
                            {isPendingAudit ? '검증 진행중' : (isAuditConfirmed ? '검증 완료' : '-')}
                          </span>
                        </div>
                        <div style={{ ...styles.timelineLine, backgroundColor: isAuditConfirmed ? '#059669' : '#cbd5e1' }} />
                        <div style={styles.timelineStep}>
                          <div style={{
                            ...styles.timelineCircle,
                            backgroundColor: isAuditConfirmed ? '#059669' : '#94a3b8',
                            color: '#fff'
                          }}>4</div>
                          <span style={styles.timelineLabel}>조치종료</span>
                          <span style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap' }}>
                            {f.auditReviewedAt ? new Date(f.auditReviewedAt).toLocaleDateString() : (isAuditConfirmed ? '완료' : '-')}
                          </span>
                        </div>
                      </div>

                      {/* 반려 및 재수정/재작성 요청 사유 배너 */}
                      {(f.rejectedReason || isRejected) && (
                        <div style={styles.rejectNoticeBox}>
                          <strong>※ {isRejectedLead ? '대표담당자 재수정 요청 사유' : (isRejectedAudit ? '감사실 재작성(보완) 요청 사유' : '반려 사유')}:</strong> {f.rejectedReason || '보완 요청 사항을 확인 후 조치내역을 수정하세요.'}
                          <div style={{ fontSize: '11px', marginTop: '3px', color: '#991b1b' }}>
                            발견사항에 대한 개선 조치를 보완/수정한 후 다시 [조치내역 임시저장] ➔ [CONFIRM (제출)]을 진행하세요.
                          </div>
                        </div>
                      )}

                      <div style={styles.infoGrid}>
                        <p><strong>소속 법인:</strong> {f.project?.corpId}</p>
                        <p><strong>프로젝트명:</strong> {f.project?.projectName}</p>
                        <div>
                          <strong>CAP 달성 대상자:</strong>{' '}
                          {(() => {
                            if (!f.assignedUserId) return <span style={{ color: '#94a3b8' }}>미지정</span>;
                            const ids = f.assignedUserId.split(',').map(s => s.trim()).filter(Boolean);
                            return ids.map(id => {
                              const found = usersList.find(u => u.username === id);
                              const displayName = found ? `${found.name}(${id})` : id;
                              return (
                                <span key={id} style={{ display: 'inline-block', backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #86efac', padding: '1px 6px', borderRadius: '4px', fontSize: '12px', marginRight: '4px', fontWeight: 'bold' }}>
                                  {displayName}
                                </span>
                              );
                            });
                          })()}
                          {f.assignedDeptName && (
                            <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '4px' }}>
                              [{f.assignedDeptName}]
                            </span>
                          )}
                        </div>
                        {f.relatedDepts && (
                          <div style={{ gridColumn: 'span 2' }}>
                            <strong>유관부서 및 협조 담당자:</strong>{' '}
                            {f.relatedDepts.split(',').map((item, idx) => (
                              <span key={idx} style={{ display: 'inline-block', backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', marginRight: '4px', fontWeight: 'bold' }}>
                                {item.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                        <p><strong>감사팀 예상 마감일:</strong> <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{expDeadlineText}</span></p>
                        <p><strong>개선 예상 시기:</strong> <span style={{ color: '#16a34a', fontWeight: 'bold' }}>{currentActionDeadline || '미설정'}</span></p>
                        <p><strong>조치 상태:</strong> <span style={{ fontWeight: 'bold' }}>
                          {currentActionStatusCode === 'COMPLETED' ? '개선완료' : (currentActionStatusCode === 'IN_PROGRESS' ? '개선중' : (currentActionStatusCode === 'ACTION_IMPOSSIBLE' ? '개선불가' : (currentActionStatusCode === 'CONTINUOUS_MANAGEMENT' ? '업무개선 후 지속관리' : '미작성')))}
                        </span></p>
                        {currentCompletionDate && (
                          <p><strong>개선완료일자:</strong> <span style={{ color: '#059669', fontWeight: 'bold' }}>{currentCompletionDate}</span></p>
                        )}
                      </div>

                      <div style={styles.descBox}>
                        <strong>감사 발견사항 내용:</strong>
                        <div
                          dangerouslySetInnerHTML={{ __html: f.findingText }}
                          style={{ marginTop: '5px', lineHeight: '1.6' }}
                        />
                      </div>

                      {/* 조치 기술 입력 폼 */}
                      <div style={styles.actionContainer}>
                        <strong>조치내역 및 개선 계획 입력</strong>

                        {/* 조치 상태 구분 및 마감일자/완료일자 설정 바 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '12px 0', flexWrap: 'wrap', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>조치 상태 구분:</label>
                            <select
                              value={currentActionStatusCode}
                              onChange={(e) => {
                                const nextCode = e.target.value;
                                setActionStatusCodes({ ...actionStatusCodes, [f.findingId]: nextCode });
                                if (nextCode === 'ACTION_IMPOSSIBLE' || nextCode === 'CONTINUOUS_MANAGEMENT') {
                                  setCompletionDates({ ...completionDates, [f.findingId]: '' });
                                }
                              }}
                              disabled={f.project?.projectState === 'FREEZE' || isAuditConfirmed || isPendingAudit}
                              style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: (isPendingAudit || isAuditConfirmed) ? '#f1f5f9' : '#fff', fontWeight: 'bold' }}
                            >
                              <option value="NOT_WRITTEN">미작성 (답변 미작성)</option>
                              <option value="IN_PROGRESS">개선중 ('개선 예상 시기' 필수)</option>
                              <option value="COMPLETED">개선완료 ('개선완료일자' 필수)</option>
                              <option value="ACTION_IMPOSSIBLE">개선불가 (리스크 수용)</option>
                              <option value="CONTINUOUS_MANAGEMENT">업무개선 후 지속관리</option>
                            </select>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>
                              개선 예상 시기 {currentActionStatusCode === 'IN_PROGRESS' && <span style={{ color: '#ef4444' }}>* (필수)</span>}:
                            </label>
                            <input
                              type="date"
                              value={currentActionDeadline}
                              onChange={(e) => setActionDeadlines({ ...actionDeadlines, [f.findingId]: e.target.value })}
                              disabled={f.project?.projectState === 'FREEZE' || isAuditConfirmed || isPendingAudit}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '4px',
                                border: (currentActionStatusCode === 'IN_PROGRESS' && !currentActionDeadline) ? '2px solid #ef4444' : '1px solid #cbd5e1',
                                fontSize: '13px',
                                backgroundColor: (isPendingAudit || isAuditConfirmed) ? '#f1f5f9' : '#fff'
                              }}
                            />
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>
                              개선완료일자 {currentActionStatusCode === 'COMPLETED' && <span style={{ color: '#ef4444' }}>* (필수)</span>}:
                            </label>
                            <input
                              type="date"
                              value={currentCompletionDate}
                              onChange={(e) => setCompletionDates({ ...completionDates, [f.findingId]: e.target.value })}
                              disabled={f.project?.projectState === 'FREEZE' || isAuditConfirmed || isPendingAudit || currentActionStatusCode !== 'COMPLETED'}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '4px',
                                border: (currentActionStatusCode === 'COMPLETED' && !currentCompletionDate) ? '2px solid #ef4444' : '1px solid #cbd5e1',
                                fontSize: '13px',
                                backgroundColor: (!isPendingAudit && !isAuditConfirmed && currentActionStatusCode === 'COMPLETED') ? '#fff' : '#f1f5f9',
                                cursor: (!isPendingAudit && !isAuditConfirmed && currentActionStatusCode === 'COMPLETED') ? 'auto' : 'not-allowed'
                              }}
                            />
                            {currentActionStatusCode === 'COMPLETED' && !currentCompletionDate && (
                              <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>완료일자 필수 기입</span>
                            )}
                            {(currentActionStatusCode === 'ACTION_IMPOSSIBLE' || currentActionStatusCode === 'CONTINUOUS_MANAGEMENT') && (
                              <span style={{ fontSize: '11px', color: '#64748b' }}>완료일 기재 불필요</span>
                            )}
                          </div>

                          {isAuditConfirmed && (
                            <span style={{ fontSize: '12px', color: '#1e40af', fontWeight: 'bold', backgroundColor: '#dbeafe', padding: '3px 8px', borderRadius: '4px' }}>
                              감사 검증 완료 (고정)
                            </span>
                          )}
                          {isPendingAudit && (
                            <span style={{ fontSize: '12px', color: '#6d28d9', fontWeight: 'bold', backgroundColor: '#ede9fe', padding: '3px 8px', borderRadius: '4px' }}>
                              감사실 제출 완료 (검증 진행 중 - 수정 불가)
                            </span>
                          )}
                        </div>

                        <div style={styles.currentAction}>
                          <strong>현재 등록된 조치내역:</strong>
                          {f.actionText ? (
                            <div
                              dangerouslySetInnerHTML={{ __html: f.actionText }}
                              style={styles.htmlContent}
                            />
                          ) : (
                            <span style={{ color: '#9ca3af', marginLeft: '5px' }}>등록된 내역이 없습니다.</span>
                          )}
                        </div>

                        {f.project?.projectState !== 'FREEZE' ? (
                          <div style={styles.actionForm}>
                            <HtmlEditor
                              value={actionInputs[f.findingId] !== undefined ? actionInputs[f.findingId] : (f.actionText || '')}
                              onChange={(val) => setActionInputs({ ...actionInputs, [f.findingId]: val })}
                              disabled={f.project?.projectState === 'FREEZE' || isAuditConfirmed || isPendingAudit}
                              placeholder="상세 조치 계획 및 실적을 서식으로 입력하세요..."
                            />

                            {/* 버튼 컨트롤 영역 (임시저장 및 단계별 결재 승인 액션) */}
                            <div style={styles.actionButtonRow}>
                              {/* 1) 법인담당자 / 유관부서 / 법인대표 / 관리자: 조치내역 임시저장 (감사실 제출 후에는 비노출) */}
                              {(!isAuditConfirmed && !isPendingAudit && (user.role === 'MEMBER' || user.role === 'DEPT_MEMBER' || user.role === 'LEAD_REP' || user.role === 'SYSTEM_ADMIN')) && (
                                <button
                                  onClick={() => handleUpdateAction(f.findingId, f.project?.projectState, f.project?.corpId)}
                                  style={styles.saveBtn}
                                >
                                  조치내역 임시저장
                                </button>
                              )}

                              {/* 2) 일반 담당자 / 유관부서: 법인대표 제출 (작성중 또는 반려/보완요청 상태) */}
                              {(!isAuditConfirmed && (user.role === 'MEMBER' || user.role === 'DEPT_MEMBER' || user.role === 'SYSTEM_ADMIN')) && (isDraft || isRejected) && (
                                <button
                                  onClick={() => handleConfirmMember(f.findingId)}
                                  style={styles.approvalReqBtn}
                                >
                                  CONFIRM (법인대표 제출)
                                </button>
                              )}

                              {/* 3) 법인 대표담당자: 
                                     - PENDING_LEAD 상태: 감사팀 제출 또는 담당자 재수정 요청(반려)
                                     - 보완요청/작성중 상태 (isDraft || isRejected): 대표담당자가 직접 수정 후 바로 감사팀 제출 가능 */}
                              {(user.role === 'LEAD_REP' || user.role === 'SYSTEM_ADMIN') && !isAuditConfirmed && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  {isPendingLead && (
                                    <>
                                      <button
                                        onClick={() => handleConfirmLead(f.findingId)}
                                        style={{ ...styles.approveActionBtn, backgroundColor: '#0284c7' }}
                                      >
                                        CONFIRM (감사팀 제출)
                                      </button>
                                      <button
                                        onClick={() => openRejectModal(f, 'LEAD')}
                                        style={styles.rejectActionBtn}
                                      >
                                        재수정 요청 (반려)
                                      </button>
                                    </>
                                  )}
                                  {(!isPendingLead && !isPendingAudit && (isDraft || isRejected)) && (
                                    <button
                                      onClick={() => handleConfirmLead(f.findingId)}
                                      style={{ ...styles.approveActionBtn, backgroundColor: '#0284c7' }}
                                    >
                                      CONFIRM (감사팀 제출)
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* 3) 감사실 (감사담당자 / 관리자): 검증 조치종료 CONFIRM 또는 재작성 요청 */}
                              {(isAuditTeam || user.role === 'AUDITOR' || user.role === 'SYSTEM_ADMIN') && isPendingAudit && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    onClick={() => handleConfirmAudit(f.findingId)}
                                    style={{ ...styles.approveActionBtn, backgroundColor: '#1d4ed8' }}
                                  >
                                    조치종료 CONFIRM (확인 완료)
                                  </button>
                                  <button
                                    onClick={() => openRejectModal(f, 'AUDIT')}
                                    style={{ ...styles.saveBtn, backgroundColor: '#c2410c', color: '#fff' }}
                                  >
                                    재작성 요청 (보완)
                                  </button>
                                </div>
                              )}

                              {isAuditConfirmed && (
                                <span style={{ fontSize: '13px', color: '#1e40af', fontWeight: 'bold' }}>
                                  ※ 본 발견사항(CAP)은 감사실 최종 검증(CONFIRM)이 완료되었습니다.
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div style={styles.freezeNotice}>※ 본 프로젝트는 최종 결재 승인 완료에 따라 완료(Completion)되어 조치 수정이 불가합니다.</div>
                        )}

                        {/* 유관부서 지정자 협조 내용 / 의견 추가 박스 */}
                        {!isAuditConfirmed && f.project?.projectState !== 'FREEZE' && (
                          <div style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <strong style={{ fontSize: '13px', color: '#0369a1' }}>유관부서 협조 내용 및 추가 의견 등록</strong>
                              <span style={{ fontSize: '11px', color: '#0284c7' }}>※ 유관부서 또는 협조자 작성 시 조치내역 및 누적 이력에 즉시 반영됩니다.</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <textarea
                                value={deptAdditionalContent}
                                onChange={(e) => setDeptAdditionalContent(e.target.value)}
                                placeholder="유관부서 협조 조치 내용 또는 협조 의견을 입력하세요..."
                                rows={2}
                                style={{ flex: 1, padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', resize: 'vertical' }}
                              />
                              <button
                                onClick={() => handleAddDeptContent(f.findingId)}
                                disabled={!deptAdditionalContent.trim()}
                                style={{
                                  padding: '8px 16px',
                                  backgroundColor: deptAdditionalContent.trim() ? '#0284c7' : '#94a3b8',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: deptAdditionalContent.trim() ? 'pointer' : 'not-allowed',
                                  fontWeight: 'bold',
                                  fontSize: '13px',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                협조 내용 추가
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 하단: 조치 및 검토 이력 타임라인 */}
                      <div style={{ marginTop: '24px', borderTop: '2px solid #e2e8f0', paddingTop: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <h4 style={{ margin: 0, fontSize: '15px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            조치 및 검토 이력 타임라인
                          </h4>
                          <button
                            onClick={() => fetchFindingHistories(f.findingId)}
                            style={{ fontSize: '12px', padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            새로고침
                          </button>
                        </div>

                        {historyLoading ? (
                          <div style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>이력을 불러오는 중입니다...</div>
                        ) : findingHistories && findingHistories.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                            {[...findingHistories].sort((a, b) => {
                              const tA = new Date(a.createdAt || a.actionAt || 0).getTime();
                              const tB = new Date(b.createdAt || b.actionAt || 0).getTime();
                              return tB - tA;
                            }).map((h, idx) => {
                              const getHistoryBadge = (actionType) => {
                                switch (actionType) {
                                  case 'SAVE_DRAFT': return { text: '조치 수정 / 임시저장', bg: '#f1f5f9', color: '#475569' };
                                  case 'UPDATE_ACTION': return { text: '조치 수정 / 임시저장', bg: '#f1f5f9', color: '#475569' };
                                  case 'CREATE_CAP': return { text: 'CAP 신규 등록', bg: '#eff6ff', color: '#1d4ed8' };
                                  case 'UPDATE_CAP': return { text: 'CAP 지적사항 수정', bg: '#f1f5f9', color: '#475569' };
                                  case 'CONFIRM_MEMBER': return { text: '법인담당자 제출', bg: '#fef3c7', color: '#b45309' };
                                  case 'CONFIRM_LEAD': return { text: '대표담당자 확인 및 제출', bg: '#ede9fe', color: '#6d28d9' };
                                  case 'REJECT_LEAD': return { text: '대표담당자 재수정요청 (반려)', bg: '#fee2e2', color: '#b91c1c' };
                                  case 'CONFIRM_AUDIT': return { text: '감사담당자 조치종료 확인 (완료)', bg: '#dbeafe', color: '#1d4ed8' };
                                  case 'REJECT_AUDIT': return { text: '감사실 재작성 (보완) 요청', bg: '#ffedd5', color: '#c2410c' };
                                  case 'ADD_DEPT_CONTENT': return { text: '유관부서 협조내용 추가', bg: '#e0f2fe', color: '#0369a1' };
                                  case 'COPIED_FROM_PARENT': return { text: '이전 차수 승계 건', bg: '#eff6ff', color: '#1d4ed8' };
                                  default: return { text: actionType, bg: '#f1f5f9', color: '#334155' };
                                }
                              };
                              const badge = getHistoryBadge(h.actionType);

                              const getActionStatusKorean = (code) => {
                                if (!code) return '';
                                switch (code.trim().toUpperCase()) {
                                  case 'NOT_WRITTEN': return '미작성';
                                  case 'IN_PROGRESS': return '개선중';
                                  case 'COMPLETED': return '개선완료';
                                  case 'ACTION_IMPOSSIBLE': return '개선불가';
                                  case 'CONTINUOUS_MANAGEMENT': return '업무개선 후 지속관리';
                                  default: return code;
                                }
                              };

                              const formatHistoryComment = (text) => {
                                if (!text) return '';
                                return text
                                  .replace(/IN_PROGRESS/g, '개선중')
                                  .replace(/COMPLETED/g, '개선완료')
                                  .replace(/ACTION_IMPOSSIBLE/g, '개선불가')
                                  .replace(/CONTINUOUS_MANAGEMENT/g, '업무개선 후 지속관리')
                                  .replace(/NOT_WRITTEN/g, '미작성')
                                  .replace(/PENDING_LEAD/g, '대표담당자 확인대기')
                                  .replace(/PENDING_AUDIT/g, '감사실 검증대기')
                                  .replace(/AUDIT_CONFIRMED/g, '조치종료');
                              };

                              const actionTime = h.createdAt || h.actionAt;
                              const formattedDateTime = actionTime
                                ? new Date(actionTime).toLocaleString('ko-KR', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                  })
                                : '-';

                              return (
                                <div key={h.historyId || idx} style={{
                                  padding: '12px 14px',
                                  borderRadius: '8px',
                                  backgroundColor: '#fff',
                                  border: '1px solid #e2e8f0',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                  borderLeft: `4px solid ${badge.color}`
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                      <span style={{
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        backgroundColor: badge.bg,
                                        color: badge.color
                                      }}>
                                        {badge.text}
                                      </span>
                                      {h.actionStatusCode && (
                                        <span style={{
                                          padding: '2px 8px',
                                          borderRadius: '4px',
                                          fontSize: '11px',
                                          fontWeight: 'bold',
                                          backgroundColor: h.actionStatusCode === 'COMPLETED' ? '#dcfce7' : (h.actionStatusCode === 'IN_PROGRESS' ? '#fef3c7' : '#f1f5f9'),
                                          color: h.actionStatusCode === 'COMPLETED' ? '#15803d' : (h.actionStatusCode === 'IN_PROGRESS' ? '#b45309' : '#475569'),
                                          border: '1px solid #cbd5e1'
                                        }}>
                                          상태: {getActionStatusKorean(h.actionStatusCode)}
                                        </span>
                                      )}
                                      <strong style={{ fontSize: '13px', color: '#1e293b' }}>{h.actorName || h.actorUserId}</strong>
                                      <span style={{ fontSize: '11px', color: '#64748b' }}>({getRoleKoreanName(h.actorRole)})</span>
                                    </div>
                                    <span style={{ fontSize: '12px', color: '#475569', fontWeight: 'bold' }}>
                                      🕒 {formattedDateTime}
                                    </span>
                                  </div>

                                  {h.comment && (
                                    <div style={{
                                      fontSize: '12px',
                                      color: (h.actionType === 'REJECT_LEAD' || h.actionType === 'REJECT_AUDIT') ? '#dc2626' : '#334155',
                                      backgroundColor: (h.actionType === 'REJECT_LEAD' || h.actionType === 'REJECT_AUDIT') ? '#fef2f2' : '#f8fafc',
                                      padding: '6px 10px',
                                      borderRadius: '4px',
                                      marginBottom: '6px',
                                      border: '1px solid #e2e8f0'
                                    }}>
                                      <strong>{(h.actionType === 'REJECT_LEAD' || h.actionType === 'REJECT_AUDIT') ? '요청 사유:' : '기록 / 내용:'}</strong> {formatHistoryComment(h.comment)}
                                    </div>
                                  )}

                                  {h.actionTextSnapshot && (
                                    <details style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                                      <summary style={{ cursor: 'pointer', color: '#0284c7', fontWeight: 'bold' }}>
                                        당시 조치내용 스냅샷 확인
                                      </summary>
                                      <div
                                        dangerouslySetInnerHTML={{ __html: h.actionTextSnapshot }}
                                        style={{ marginTop: '6px', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                                      />
                                    </details>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ padding: '14px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                            기록된 조치 및 검토 이력이 없습니다.
                          </div>
                        )}
                      </div>

                      {/* 증빙 업로드 및 등록된 첨부파일 관리 */}
                      {(() => {
                        const isProjectFrozen = f.project?.projectState === 'FREEZE';
                        const isActionImpossible = currentActionStatusCode === 'ACTION_IMPOSSIBLE';
                        const isUploadDisabled = isProjectFrozen || isAuditConfirmed || isPendingAudit || isActionImpossible;
                        const currentAttachments = findingAttachments[f.findingId] || [];

                        return (
                          <div style={styles.uploadContainer}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                              <strong style={{ fontSize: '14px', color: '#1e293b' }}>
                                증빙 자료 첨부 및 관리 (최대 50MB, exe/bat 확장자 차단)
                              </strong>
                              {isUploadDisabled && (
                                <span style={{
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  backgroundColor: '#fee2e2',
                                  color: '#b91c1c',
                                  border: '1px solid #fecaca'
                                }}>
                                  {isProjectFrozen
                                    ? '완료(Completion) 상태'
                                    : isAuditConfirmed
                                      ? '감사 검증완료/종료'
                                      : isPendingAudit
                                        ? '감사실 제출 완료'
                                        : '개선불가 상태'}
                                </span>
                              )}
                            </div>

                            {/* 업로드 컨트롤 행 (다중 파일 지원) - 업로드 불가 시 파일선택창 원천 차단 */}
                            {(() => {
                              if (isUploadDisabled) {
                                if (isActionImpossible) return null;
                                return (
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '12px 16px',
                                    backgroundColor: '#f1f5f9',
                                    borderRadius: '6px',
                                    border: '1.5px dashed #cbd5e1',
                                    color: '#64748b',
                                    fontSize: '13px'
                                  }}>
                                    <div>
                                      <b style={{ color: '#475569' }}>증빙자료 파일 선택 및 업로드 차단:</b>{' '}
                                      {isProjectFrozen
                                        ? '프로젝트가 완료(Completion) 상태이므로 파일 선택 및 추가 업로드가 차단되었습니다.'
                                        : isAuditConfirmed
                                          ? '감사팀의 최종 검증이 완료/종료되어 파일 선택 및 추가 업로드가 마감되었습니다.'
                                          : isPendingAudit
                                            ? '감사실에 제출되어 검증이 진행 중이므로 파일 선택 및 추가 업로드가 차단되었습니다.'
                                            : '개선불가 항목으로 지정되어 파일 선택 및 추가 업로드가 비활성화되었습니다.'}
                                    </div>
                                  </div>
                                );
                              }

                              const rawFiles = uploadFiles[f.findingId];
                              const selectedList = Array.isArray(rawFiles) ? rawFiles : (rawFiles ? [rawFiles] : []);
                              const hasFiles = selectedList.length > 0;

                              return (
                                <div>
                                  <div style={styles.uploadRow}>
                                    <input
                                      type="file"
                                      id={`file-upload-input-${f.findingId}`}
                                      multiple
                                      onChange={(e) => setUploadFiles({
                                        ...uploadFiles,
                                        [f.findingId]: Array.from(e.target.files)
                                      })}
                                      style={styles.fileInput}
                                    />
                                    <button
                                      disabled={!hasFiles}
                                      onClick={() => handleFileUpload(f.findingId, f.project?.projectState, f.approvalStatus, currentActionStatusCode)}
                                      style={{
                                        ...styles.uploadBtn,
                                        backgroundColor: !hasFiles ? '#94a3b8' : '#2563eb',
                                        cursor: !hasFiles ? 'not-allowed' : 'pointer',
                                        opacity: !hasFiles ? 0.7 : 1,
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      📤 {hasFiles ? `${selectedList.length}개 파일 일괄 업로드` : '증빙 파일 업로드'}
                                    </button>
                                  </div>

                                  {/* 선택된 다중 파일 목록 프리뷰 */}
                                  {hasFiles && (
                                    <div style={{
                                      marginTop: '8px',
                                      padding: '8px 12px',
                                      backgroundColor: '#eff6ff',
                                      borderRadius: '6px',
                                      border: '1px solid #bfdbfe',
                                      fontSize: '12px',
                                      color: '#1e40af',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '4px'
                                    }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <strong>📑 업로드 대기 중인 파일 ({selectedList.length}개):</strong>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setUploadFiles({ ...uploadFiles, [f.findingId]: [] });
                                            const el = document.getElementById(`file-upload-input-${f.findingId}`);
                                            if (el) el.value = '';
                                          }}
                                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                                        >
                                          ✕ 선택 취소
                                        </button>
                                      </div>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                                        {selectedList.map((fileItem, fIdx) => (
                                          <span
                                            key={fIdx}
                                            style={{
                                              padding: '2px 8px',
                                              borderRadius: '4px',
                                              backgroundColor: '#ffffff',
                                              border: '1px solid #93c5fd',
                                              fontSize: '11px',
                                              color: '#1e3a8a'
                                            }}
                                          >
                                            📄 {fileItem.name} <span style={{ color: '#64748b' }}>({(fileItem.size / 1024).toFixed(1)} KB)</span>
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* 등록된 증빙 자료 목록 */}
                            <div style={{ marginTop: '16px', borderTop: '1px dashed #cbd5e1', paddingTop: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>
                                  📎 등록된 증빙 자료 ({currentAttachments.length}건)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => fetchFindingAttachments(f.findingId)}
                                  style={{ fontSize: '11px', padding: '2px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                  🔄 목록 새로고침
                                </button>
                              </div>

                              {attachmentLoading && currentAttachments.length === 0 ? (
                                <div style={{ fontSize: '12px', color: '#64748b', padding: '10px', textAlign: 'center' }}>증빙 파일 목록을 불러오는 중...</div>
                              ) : currentAttachments.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {currentAttachments.map((att) => {
                                    const formatBytes = (bytes) => {
                                      if (!bytes || bytes === 0) return '0 Bytes';
                                      const k = 1024;
                                      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                                      const i = Math.floor(Math.log(bytes) / Math.log(k));
                                      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
                                    };

                                    return (
                                      <div
                                        key={att.fileId}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          padding: '8px 12px',
                                          backgroundColor: '#ffffff',
                                          border: '1px solid #e2e8f0',
                                          borderRadius: '6px',
                                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                          fontSize: '12px'
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                          <span style={{ fontSize: '16px' }}>📄</span>
                                          <strong style={{ color: '#1e293b', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {att.fileName}
                                          </strong>
                                          <span style={{ color: '#64748b', fontSize: '11px' }}>
                                            ({formatBytes(att.fileSize)})
                                          </span>
                                          <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                                            • {att.uploadedBy} • {att.uploadedAt ? new Date(att.uploadedAt).toLocaleString() : ''}
                                          </span>
                                        </div>

                                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                          <button
                                            type="button"
                                            onClick={() => handleDownloadAttachment(att.fileId, att.fileName)}
                                            style={{
                                              padding: '4px 10px',
                                              fontSize: '11px',
                                              fontWeight: 'bold',
                                              backgroundColor: '#0284c7',
                                              color: '#fff',
                                              border: 'none',
                                              borderRadius: '4px',
                                              cursor: 'pointer'
                                            }}
                                          >
                                            ⬇️ 다운로드
                                          </button>
                                          {!isUploadDisabled && (
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteAttachment(att.fileId, f.findingId)}
                                              style={{
                                                padding: '4px 10px',
                                                fontSize: '11px',
                                                fontWeight: 'bold',
                                                backgroundColor: '#fee2e2',
                                                color: '#b91c1c',
                                                border: '1px solid #fecaca',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                              }}
                                            >
                                              🗑️ 삭제
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div style={{ fontSize: '12px', color: '#94a3b8', padding: '12px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px dashed #e2e8f0' }}>
                                  현재 등록된 증빙 자료가 없습니다.
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })() : (
                  <div style={styles.noDataBox}>상단 그리드에서 감사 지적 항목을 선택해 주세요.</div>
                )}
              </div>
            );
          })()}

          {/* ================================================================= */}
          {/* 3번 탭: 발견사항 (CAP) 관리 및 피드백 (감사팀 전용) */}
          {/* ================================================================= */}
          {isMenuActive('FINDING_MANAGEMENT') && (() => {
            // 1. 대상 프로젝트 필터링 (기본: FREEZE 제외, 옵션 체크 시 FREEZE 포함)
            const selectableProjects = projects.filter(p => includeFrozenProjects || p.projectState !== 'FREEZE');

            // 현재 선택된 프로젝트가 selectableProjects 목록에 실제로 존재하는지 엄격하게 검증 (미선택 또는 목록 부재 시 false)
            const selectedProjectObj = selectableProjects.find(p => p.projectId.toString() === selectedProjectId?.toString());
            const isProjectSelected = Boolean(selectedProjectId && selectedProjectObj);

            // 2. 현재 유효하게 선택된 프로젝트의 등록된 CAP 목록 추출
            const projectCaps = isProjectSelected
              ? findings.filter(f => f.project?.projectId == selectedProjectId)
              : [];

            // 3. 현재 선택된 CAP 객체 및 수정 가능 여부 판단
            const currentCap = isProjectSelected && selectedCapId ? findings.find(f => f.findingId === selectedCapId) : null;
            const hasActionDone = currentCap && currentCap.actionText && currentCap.actionText.trim().length > 0;
            const isDraftStatus = !currentCap || currentCap.approvalStatus === 'DRAFT' || !currentCap.approvalStatus;
            const isProjectFrozen = currentCap?.project?.projectState === 'FREEZE';
            const canEditCurrentCap = !hasActionDone && isDraftStatus && !isProjectFrozen;

            // 프로젝트별 CAP 번호 (1번부터 시작)
            const selectedCapIndex = projectCaps.findIndex(f => f.findingId === selectedCapId);
            const selectedCapDisplayNum = selectedCapIndex >= 0 ? (selectedCapIndex + 1) : '';
            const nextCapDisplayNum = projectCaps.length + 1;

            // 4. 감사관련 사용자 목록 추출
            const auditUsers = usersList.filter(u =>
              ['SYSTEM_ADMIN', 'AUDIT_LEADER', 'AUDITOR'].includes(u.role) && u.enabled !== false
            );

            // 5. 대상 프로젝트 정보 및 해당 법인 소속 사용자 목록 추출
            const targetCorpId = selectedProjectObj?.corpId || '';
            const targetCorpUsers = usersList.filter(u => u.corpId === targetCorpId && u.enabled !== false);
            // 5-1. 해당 법인 소속 사용자의 고유 부서 목록 추출 (부서 선행 선택용)
            const targetCorpDepts = Array.from(new Set(targetCorpUsers.map(u => u.deptName).filter(Boolean))).sort();

            // 6. 기존 데이터(findings) 및 categories 테이블에 존재하는 유니크 카테고리 목록 생성
            const existingCatNames = Array.from(new Set([
              ...categories.map(c => c.categoryName),
              ...findings.map(f => f.category).filter(Boolean)
            ]));

            return (
              <div style={styles.containerCol}>
                {/* 1. 상단 고정 헤더 & CAP 선택 카드 (스크롤 시 상단에 항상 고정) */}
                <div style={{
                  ...styles.card,
                  position: 'sticky',
                  top: '-30px',
                  zIndex: 20,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                  borderBottom: '2px solid #cbd5e1',
                }}>
                  {/* 헤더: 타이틀과 안내사항을 한 줄 가로 배치하여 세로 공간 대폭 절약 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '12px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b', fontWeight: 'bold' }}>
                        감사 지적사항 (CAP) 관리 및 등록
                      </h3>
                      <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                        감사 프로젝트별 지적사항을 등록 및 수정하고, 감사팀 마감기한을 관리합니다.
                      </span>
                    </div>
                    {/* 카테고리 관리 버튼 */}
                    <button
                      type="button"
                      onClick={() => setCategoryModalOpen(true)}
                      style={{
                        padding: '6px 14px',
                        backgroundColor: 'var(--saea-blue, #0077C8)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0, 119, 200, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      분류 카테고리 관리
                    </button>
                  </div>

                  {/* 1) 대상 감사 프로젝트 선택 영역 (1행 정렬로 세로 공간 확보) */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    marginBottom: '14px',
                    flexWrap: 'wrap',
                  }}>
                    <label style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap' }}>
                      대상 감사 프로젝트 선택 <span style={{ color: '#ef4444' }}>*</span>
                    </label>

                    <select
                      value={isProjectSelected ? selectedProjectId : ''}
                      onChange={(e) => {
                        setSelectedProjectId(e.target.value);
                        handleSelectCap(null); // 프로젝트 변경 시 CAP 선택 초기화
                      }}
                      style={{ ...styles.select, flex: 1, minWidth: '300px', margin: 0, padding: '7px 10px', fontSize: '13px' }}
                      required
                    >
                      <option value="">-- 대상 프로젝트를 선택하세요 --</option>
                      {selectableProjects.map(p => (
                        <option key={p.projectId} value={p.projectId}>
                          {p.projectName} {p.round && p.round > 1 ? `[${p.round}차: ${p.parentProjectName || ''} 연계]` : ''} [{p.projectState === 'FREEZE' ? '완료(Completion)' : 'OPEN'}] ({p.corpId})
                        </option>
                      ))}
                    </select>

                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer', color: '#475569', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      <input
                        type="checkbox"
                        checked={includeFrozenProjects}
                        onChange={(e) => {
                          const nextVal = e.target.checked;
                          setIncludeFrozenProjects(nextVal);
                          if (!nextVal && selectedProjectObj?.projectState === 'FREEZE') {
                            setSelectedProjectId('');
                            handleSelectCap(null);
                          }
                        }}
                      />
                      <span>완료(Completion) 포함</span>
                    </label>
                  </div>

                  {/* 4) 대상 감사 프로젝트별 등록된 CAP 선택 항목 리스트 (프로젝트가 유효하게 선택되었을 때만 표시) */}
                  {isProjectSelected && (
                    <div style={{
                      padding: '14px 16px',
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      marginBottom: '14px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>
                          해당 프로젝트 등록 지적사항 (CAP) 선택 ({projectCaps.length}건 등록됨)
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectCap(null)}
                          style={{
                            padding: '6px 14px',
                            backgroundColor: selectedCapId === null ? '#16a34a' : '#ffffff',
                            color: selectedCapId === null ? '#ffffff' : '#16a34a',
                            border: '1.5px solid #16a34a',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: selectedCapId === null ? '0 2px 4px rgba(22,163,74,0.25)' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {selectedCapId === null ? `✔ CAP #${nextCapDisplayNum} 신규 등록 모드 활성` : `+ CAP #${nextCapDisplayNum} 신규 지적사항 등록`}
                        </button>
                      </div>

                      {projectCaps.length === 0 && (
                        <div style={{ fontSize: '12.5px', color: '#166534', backgroundColor: '#f0fdf4', padding: '8px 12px', borderRadius: '6px', border: '1px solid #bbf7d0', marginBottom: '8px' }}>
                          ※ 본 프로젝트에 기존 등록된 지적사항이 없습니다. 아래 <b>CAP #1</b> 카드를 작성하여 첫 번째 지적사항을 등록하세요.
                        </div>
                      )}

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '10px',
                        marginTop: '6px',
                        maxHeight: '220px',
                        overflowY: 'auto',
                        paddingRight: '4px'
                      }}>
                        {projectCaps.map((cap, capIdx) => {
                          const isSelected = selectedCapId === cap.findingId;
                          const hasAct = cap.actionText && cap.actionText.trim() !== '';

                          // 직관적이고 선명한 CAP 진행 상태 뱃지
                          const getStatusBadge = () => {
                            if (cap.project?.projectState === 'FREEZE') {
                              return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#334155', color: '#ffffff' }}>완료(Completion)</span>;
                            }
                            const st = cap.approvalStatus || 'DRAFT';
                            if (st === 'APPROVED') {
                              return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}>승인 완료</span>;
                            }
                            if (st === 'REJECTED') {
                              return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}>반려</span>;
                            }
                            if (st === 'PENDING_APPROVER') {
                              return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#ffedd5', color: '#c2410c', border: '1px solid #fdba74' }}>최종승인 대기</span>;
                            }
                            if (st === 'PENDING_AUDITOR') {
                              return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#f3e8ff', color: '#7e22ce', border: '1px solid #d8b4fe' }}>감사팀 검토중</span>;
                            }
                            if (hasAct) {
                              return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' }}>조치작성 완료</span>;
                            }
                            return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>조치 대기</span>;
                          };

                          return (
                            <div
                              key={cap.findingId}
                              onClick={() => handleSelectCap(cap)}
                              style={{
                                padding: '10px 14px',
                                backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                                border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                boxShadow: isSelected ? '0 2px 4px rgba(37,99,235,0.15)' : 'none',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b' }}>
                                  CAP #{capIdx + 1}
                                </span>
                                <span style={styles.badgeCategory}>{cap.category}</span>
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {cap.title}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                {getStatusBadge()}
                              </div>
                            </div>
                          );
                        })}

                        {/* 신규 등록용 CAP # 다음 번호 카드 (신규 등록 모드임을 한눈에 알 수 있도록 항상 생성) */}
                        <div
                          onClick={() => handleSelectCap(null)}
                          style={{
                            padding: '10px 14px',
                            backgroundColor: selectedCapId === null ? '#f0fdf4' : '#fafafa',
                            border: selectedCapId === null ? '2px solid #16a34a' : '1.5px dashed #94a3b8',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            boxShadow: selectedCapId === null ? '0 2px 6px rgba(22,163,74,0.25)' : 'none',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontSize: '12px', fontWeight: 'bold', color: selectedCapId === null ? '#15803d' : '#64748b' }}>
                                CAP #{nextCapDisplayNum}
                              </span>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                backgroundColor: selectedCapId === null ? '#dcfce7' : '#e2e8f0',
                                color: selectedCapId === null ? '#15803d' : '#64748b',
                                border: selectedCapId === null ? '1px solid #86efac' : '1px solid #cbd5e1'
                              }}>
                                {selectedCapId === null ? '신규 등록 중' : '+ 신규 추가'}
                              </span>
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: selectedCapId === null ? '#166534' : '#64748b', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {selectedCapId === null && newTitle.trim() ? newTitle : '(신규 지적사항 작성)'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: selectedCapId === null ? '#16a34a' : '#94a3b8' }}>
                              {selectedCapId === null ? '● 현재 입력 모드' : '클릭 시 신규 등록'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. 하단 선택된 CAP 상세 및 수정 폼 카드 (대상 프로젝트가 유효하게 선택되었을 때만 노출) */}
                {isProjectSelected && (
                  <div style={styles.card}>

                    {/* 완료(Completion) 프로젝트 또는 일반 사용자 읽기전용 시 간소 알림 */}
                    {selectedCapId && !canEditCurrentCap && !isAuditTeam && (
                      <div style={{
                        ...styles.freezeNotice,
                        marginBottom: '14px',
                        padding: '8px 14px',
                        fontSize: '12.5px',
                        borderRadius: '6px'
                      }}>
                        {isProjectFrozen
                          ? '※ 본 프로젝트는 최종 승인 완료로 완료(Completion) 상태이므로 지적사항을 수정할 수 없습니다 (읽기 전용).'
                          : '※ 본 지적사항은 이미 조치 작성 또는 결재 진행 중이므로 내용을 수정할 수 없습니다 (읽기 전용).'}
                      </div>
                    )}

                    {/* CAP 등록 / 수정 폼 */}
                    <form onSubmit={handleSaveFinding} style={styles.form}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {selectedCapId ? (
                            <>
                              <span style={{
                                padding: '3px 10px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                backgroundColor: '#eff6ff',
                                color: '#1d4ed8',
                                border: '1px solid #bfdbfe'
                              }}>
                                {canEditCurrentCap ? '수정 모드' : '상세 조회'}
                              </span>
                              <h4 style={{ margin: 0, fontSize: '15px', color: '#1e293b' }}>
                                지적사항 (CAP #{selectedCapDisplayNum}) {canEditCurrentCap ? '내용 수정' : '상세 조회'}
                              </h4>
                            </>
                          ) : (
                            <>
                              <span style={{
                                padding: '3px 10px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                backgroundColor: '#dcfce7',
                                color: '#15803d',
                                border: '1px solid #86efac'
                              }}>
                                신규 등록 모드
                              </span>
                              <h4 style={{ margin: 0, fontSize: '15px', color: '#15803d', fontWeight: 'bold' }}>
                                지적사항 (CAP #{nextCapDisplayNum}) 신규 등록 입력
                              </h4>
                            </>
                          )}
                        </div>
                        {selectedCapId && (
                          <button
                            type="button"
                            onClick={() => handleSelectCap(null)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#16a34a',
                              fontSize: '13px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              textDecoration: 'underline'
                            }}
                          >
                            + CAP #{nextCapDisplayNum} 신규 등록 모드로 전환
                          </button>
                        )}
                      </div>

                      <div style={styles.dateRow}>
                      {/* 1) 분류 카테고리 (기존 데이터 목록 + 직접 입력 지원) */}
                      <div style={{ ...styles.formGroup, flex: 1 }}>
                        <label style={styles.formLabel}>분류 카테고리 <span style={{ color: '#ef4444' }}>*</span></label>
                        <select
                          value={newCategory}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewCategory(val);
                            if (val !== '__NEW__') {
                              setCustomCategoryInput('');
                            }
                          }}
                          style={styles.select}
                          disabled={selectedCapId && !canEditCurrentCap}
                          required
                        >
                          <option value="">-- 분류 카테고리 선택 --</option>
                          {existingCatNames.map(name => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                          <option value="__NEW__">신규 카테고리 직접 입력...</option>
                        </select>
                        {newCategory === '__NEW__' && (
                          <div style={{ marginTop: '6px' }}>
                            <input
                              type="text"
                              value={customCategoryInput}
                              onChange={(e) => setCustomCategoryInput(e.target.value)}
                              placeholder="신규 카테고리명을 직접 입력하세요"
                              required
                              disabled={selectedCapId && !canEditCurrentCap}
                              style={{
                                ...styles.input,
                                backgroundColor: '#ffffff',
                                border: '1.5px solid var(--saea-blue, #0077C8)',
                                outline: 'none',
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* 발견사항 세부 제목 */}
                      <div style={{ ...styles.formGroup, flex: 3 }}>
                        <label style={styles.formLabel}>발견사항 세부 제목 <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                          type="text"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          required
                          disabled={selectedCapId && !canEditCurrentCap}
                          placeholder="발견사항 핵심 요약 제목을 입력하세요"
                          style={styles.input}
                        />
                      </div>
                    </div>

                    {/* 발견사항 기술 내용 */}
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>발견사항 기술 내용</label>
                      <HtmlEditor
                        value={newFindingText}
                        onChange={setNewFindingText}
                        disabled={selectedCapId && !canEditCurrentCap}
                        placeholder="발견사항 상세 기술 내용을 서식으로 작성하세요..."
                      />
                    </div>


                    {/* 3) CAP 달성 대상자 복수 지정 (상시 추가/제거 지원) */}
                    <div style={{
                      padding: '16px 20px',
                      backgroundColor: '#f0fdf4',
                      border: '1.5px solid #86efac',
                      borderRadius: '8px',
                      marginBottom: '16px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#166534' }}>
                            CAP 달성 대상자 지정 {targetCorpId ? `(소속 법인: ${targetCorpId})` : '(대상 프로젝트 선택 필요)'}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', border: '1px solid #86efac' }}>
                            {selectedAssignedUsers.length}명 지정됨
                          </span>
                        </div>
                      </div>

                      {/* 선택된 CAP 달성 대상자 태그 뱃지 리스트 */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px', minHeight: '34px', alignItems: 'center', backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px dashed #86efac' }}>
                        {selectedAssignedUsers.length === 0 ? (
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                            지정된 CAP 달성 대상자가 없습니다. 아래 1단계(부서), 2단계(담당자)를 선택 후 [대상자 추가] 버튼을 눌러주세요.
                          </span>
                        ) : (
                          selectedAssignedUsers.map(u => (
                            <span
                              key={u.userId}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '5px 12px',
                                backgroundColor: '#f0fdf4',
                                border: '1.5px solid #86efac',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                color: '#166534',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                              }}
                            >
                              <span>{u.name || u.userId} (사번: {u.userId}){u.deptName ? ` [${u.deptName}]` : ''}</span>
                              {(!selectedCapId || canEditCurrentCap || isAuditTeam) && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAssignedUser(u.userId)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#dc2626',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '13px',
                                    padding: '0 2px',
                                    lineHeight: 1
                                  }}
                                  title="대상자 제거"
                                >
                                  ✕
                                </button>
                              )}
                            </span>
                          ))
                        )}
                      </div>

                      {/* 대상자 추가 컨트롤 (감사팀 또는 권한자 상시 추가 가능) */}
                      {(!selectedCapId || canEditCurrentCap || isAuditTeam) && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          flexWrap: 'wrap',
                          gap: '12px',
                          backgroundColor: '#f8fafc',
                          padding: '12px 14px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1'
                        }}>
                          {/* 1단계: 소속 부서 선택 (직접입력란 삭제) */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 240px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#166534', marginBottom: 0 }}>
                              1단계: 소속 부서 선택
                            </label>
                            <select
                              value={assignedDeptSelect}
                              onChange={(e) => {
                                setAssignedDeptSelect(e.target.value);
                                setAssignedUserSelect(''); // 부서 변경 시 담당자 선택 초기화
                              }}
                              style={{ ...styles.select, fontSize: '12px', padding: '6px 8px', borderColor: '#86efac' }}
                            >
                              <option value="">-- 부서 선택 ({targetCorpDepts.length}개) --</option>
                              {targetCorpDepts.map(d => (
                                <option key={d} value={d}>
                                  {d} ({targetCorpUsers.filter(u => u.deptName === d).length}명)
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* 2단계: 담당자 선택 (선택된 부서 소속 직원만 표시) */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 280px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#166534', marginBottom: 0 }}>
                              2단계: 담당자 선택
                            </label>
                            {(() => {
                              const deptUsers = assignedDeptSelect
                                ? targetCorpUsers.filter(u => u.deptName === assignedDeptSelect)
                                : [];

                              return (
                                <select
                                  value={assignedUserSelect}
                                  onChange={(e) => setAssignedUserSelect(e.target.value)}
                                  disabled={!assignedDeptSelect}
                                  style={{
                                    ...styles.select,
                                    fontSize: '12px',
                                    padding: '6px 8px',
                                    borderColor: '#86efac',
                                    backgroundColor: assignedDeptSelect ? '#ffffff' : '#f1f5f9'
                                  }}
                                >
                                  {!assignedDeptSelect ? (
                                    <option value="">-- 먼저 1단계 부서를 선택해 주세요 --</option>
                                  ) : deptUsers.length === 0 ? (
                                    <option value="">해당 부서에 등록된 직원이 없습니다</option>
                                  ) : (
                                    <>
                                      <option value="">-- [{assignedDeptSelect}] 담당자 선택 ({deptUsers.length}명) --</option>
                                      {deptUsers.map(u => (
                                        <option key={u.username} value={u.username}>
                                          {u.name} (사번: {u.username}) - {getRoleKoreanName(u.role)}
                                        </option>
                                      ))}
                                    </>
                                  )}
                                </select>
                              );
                            })()}
                          </div>

                          {/* 대상자 추가 버튼 */}
                          <div style={{ display: 'flex', alignItems: 'flex-end', paddingTop: '20px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (!assignedDeptSelect) {
                                  setError('소속 부서를 먼저 선택해 주세요.');
                                  setTimeout(() => setError(''), 3000);
                                  return;
                                }
                                if (!assignedUserSelect) {
                                  setError('담당자를 선택해 주세요.');
                                  setTimeout(() => setError(''), 3000);
                                  return;
                                }
                                handleAddAssignedUser(assignedUserSelect, assignedDeptSelect, '');
                              }}
                              style={{
                                padding: '6px 14px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                backgroundColor: '#16a34a',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              대상자 추가
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 4) 유관부서 및 협조 담당자 다중 지정 (부서 및 담당자 필수 선택, 상시 추가/제거 지원) */}
                    <div style={{
                      padding: '16px 20px',
                      backgroundColor: '#f0f9ff',
                      border: '1.5px solid #7dd3fc',
                      borderRadius: '8px',
                      marginBottom: '16px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#0369a1' }}>
                            유관부서 및 협조 담당자 지정
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', border: '1px solid #7dd3fc' }}>
                            {selectedRelatedMembers.length}곳 지정됨
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#0284c7', fontWeight: '500' }}>
                          ※ 지적사항 해결을 위해 협업할 <b>유관부서와 해당 담당자</b>를 함께 지정할 수 있습니다.
                        </span>
                      </div>

                      {/* 선택된 유관부서 & 담당자 태그 뱃지 리스트 */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px', minHeight: '34px', alignItems: 'center', backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px dashed #7dd3fc' }}>
                        {selectedRelatedMembers.length === 0 ? (
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                            지정된 유관부서 및 협조 담당자가 없습니다. 아래에서 유관부서와 담당자를 선택 후 [협조 담당자 추가] 버튼을 눌러주세요.
                          </span>
                        ) : (
                          selectedRelatedMembers.map((m, idx) => (
                            <span
                              key={`${m.deptName}_${m.userId}_${idx}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                backgroundColor: '#e0f2fe',
                                color: '#0369a1',
                                border: '1.5px solid #7dd3fc',
                                padding: '5px 12px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                              }}
                            >
                              <span>{m.deptName}</span>
                              {m.userName && (
                                <span style={{ color: '#075985', fontWeight: 'normal' }}>
                                  • {m.userName}{m.userId ? `(${m.userId})` : ''}
                                </span>
                              )}
                              {(!selectedCapId || canEditCurrentCap || isAuditTeam) && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRelatedMember(idx)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#0284c7',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 'bold',
                                    padding: '0 2px',
                                    lineHeight: 1
                                  }}
                                  title="유관부서 및 담당자 제거"
                                >
                                  ✕
                                </button>
                              )}
                            </span>
                          ))
                        )}
                      </div>

                      {/* 유관부서 및 담당자 추가 컨트롤 (상시 추가 지원) */}
                      {(!selectedCapId || canEditCurrentCap || isAuditTeam) && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          flexWrap: 'wrap',
                          gap: '12px',
                          backgroundColor: '#f8fafc',
                          padding: '12px 14px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1'
                        }}>
                          {/* 1단계: 유관부서 선택 (직접입력란 삭제) */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 240px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#0369a1', marginBottom: 0 }}>
                              1단계: 유관부서 선택
                            </label>
                            <select
                              value={relatedDeptSelect}
                              onChange={(e) => {
                                setRelatedDeptSelect(e.target.value);
                                setRelatedUserSelect(''); // 부서 변경 시 협조 담당자 초기화
                              }}
                              style={{ ...styles.select, fontSize: '12px', padding: '6px 8px' }}
                            >
                              <option value="">-- 유관부서 드롭다운 선택 ({targetCorpDepts.length}개) --</option>
                              {targetCorpDepts.map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>

                          {/* 2단계: 유관부서 협조 담당자 선택 (선택된 부서 소속 직원만 표시) */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 280px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#0369a1', marginBottom: 0 }}>
                              2단계: 협조 담당자 선택 (필수)
                            </label>
                            {(() => {
                              const deptUsers = relatedDeptSelect
                                ? usersList.filter(u => u.deptName === relatedDeptSelect)
                                : [];

                              return (
                                <select
                                  value={relatedUserSelect}
                                  onChange={(e) => setRelatedUserSelect(e.target.value)}
                                  disabled={!relatedDeptSelect}
                                  style={{
                                    ...styles.select,
                                    fontSize: '12px',
                                    padding: '6px 8px',
                                    backgroundColor: relatedDeptSelect ? '#ffffff' : '#f1f5f9'
                                  }}
                                >
                                  {!relatedDeptSelect ? (
                                    <option value="">-- 먼저 1단계 유관부서를 선택해 주세요 --</option>
                                  ) : deptUsers.length === 0 ? (
                                    <option value="">해당 부서에 등록된 직원이 없습니다</option>
                                  ) : (
                                    <>
                                      <option value="">-- [{relatedDeptSelect}] 협조 담당자 선택 ({deptUsers.length}명) --</option>
                                      {deptUsers.map(u => (
                                        <option key={u.username} value={u.username}>
                                          {u.name} (사번: {u.username})
                                        </option>
                                      ))}
                                    </>
                                  )}
                                </select>
                              );
                            })()}
                          </div>

                          {/* 유관부서 및 담당자 추가 버튼 */}
                          <div style={{ display: 'flex', alignItems: 'flex-end', paddingTop: '20px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (!relatedDeptSelect) {
                                  setError('유관부서를 먼저 선택해 주세요.');
                                  setTimeout(() => setError(''), 3000);
                                  return;
                                }
                                if (!relatedUserSelect) {
                                  setError('유관부서의 협조 담당자를 선택해 주세요.');
                                  setTimeout(() => setError(''), 3000);
                                  return;
                                }
                                handleAddRelatedMember(relatedDeptSelect, relatedUserSelect, '');
                              }}
                              style={{
                                padding: '6px 14px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                backgroundColor: '#0284c7',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              협조 담당자 추가
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 6) 각 CAP 1차, 2차, 3차 조치기한 등록 */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '20px',
                      padding: '14px 18px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      marginBottom: '16px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ ...styles.formLabel, whiteSpace: 'nowrap', marginBottom: 0, color: '#374151' }}>감사팀 예상 마감일</label>
                        <input
                          type="date"
                          value={capDeadline1st}
                          onChange={(e) => setCapDeadline1st(e.target.value)}
                          disabled={selectedCapId && !canEditCurrentCap}
                          style={{ ...styles.input, width: '150px', padding: '7px 10px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
                        <label style={{ ...styles.formLabel, whiteSpace: 'nowrap', marginBottom: 0, color: '#374151' }}>텍스트 일정</label>
                        <input
                          type="text"
                          placeholder="예: 2026년 상반기 내"
                          value={targetDateText}
                          onChange={(e) => setTargetDateText(e.target.value)}
                          disabled={selectedCapId && !canEditCurrentCap}
                          style={{ ...styles.input, padding: '7px 10px' }}
                        />
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {selectedCapId ? (
                        canEditCurrentCap ? (
                          <button type="submit" style={{ ...styles.primaryBtn, backgroundColor: 'var(--saea-blue, #0077C8)' }}>
                            선택된 지적사항 (CAP #{selectedCapDisplayNum}) 수정 내용 저장
                          </button>
                        ) : isAuditTeam ? (
                          <button type="submit" style={{ ...styles.primaryBtn, backgroundColor: '#059669' }}>
                            지적사항 (CAP #{selectedCapDisplayNum}) 담당자 및 유관부서 변경 저장
                          </button>
                        ) : null
                      ) : (
                        <button type="submit" style={{ ...styles.primaryBtn, backgroundColor: '#16a34a' }}>
                          CAP #{nextCapDisplayNum} 신규 지적사항 등록 저장
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              )}

                {/* 카테고리 관리 모달 팝업 (선명한 배경과 고대비 음영 적용) */}
                {categoryModalOpen && (
                  <div
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(15, 23, 42, 0.65)',
                      backdropFilter: 'blur(5px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 9999,
                      padding: '16px',
                    }}
                    onClick={() => setCategoryModalOpen(false)}
                  >
                    <div
                      style={{
                        backgroundColor: '#ffffff',
                        width: '580px',
                        maxWidth: '94vw',
                        borderRadius: '12px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.1)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        animation: 'fadeIn 0.15s ease-out',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* 모달 헤더 (글로벌세아 브랜드 블루) */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px 22px',
                        backgroundColor: 'var(--saea-blue, #0077C8)',
                        color: '#ffffff',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 'bold', color: '#ffffff', letterSpacing: '-0.3px' }}>
                            분류 카테고리 관리
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCategoryModalOpen(false)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.15)',
                            border: 'none',
                            borderRadius: '6px',
                            width: '30px',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            color: '#ffffff',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                          title="닫기"
                        >
                          ✕
                        </button>
                      </div>

                      {/* 모달 본문 */}
                      <div style={{ padding: '22px 24px', backgroundColor: '#ffffff' }}>
                        {/* 카테고리 추가 입력창 */}
                        <div style={{
                          padding: '14px 16px',
                          backgroundColor: '#f8fafc',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          marginBottom: '18px',
                        }}>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
                            신규 카테고리 등록
                          </label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              placeholder="신규 카테고리명 입력 (예: 인사/노무, 안전보건, 품질관리)"
                              value={newCatInputName}
                              onChange={(e) => setNewCatInputName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddCategory();
                                }
                              }}
                              style={{
                                ...styles.input,
                                flex: 1,
                                backgroundColor: '#ffffff',
                                border: '1.5px solid #cbd5e1',
                                fontSize: '13px',
                                padding: '8px 12px',
                              }}
                            />
                            <button
                              type="button"
                              onClick={handleAddCategory}
                              style={{
                                padding: '8px 18px',
                                backgroundColor: 'var(--saea-blue, #0077C8)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 2px 4px rgba(0, 119, 200, 0.25)',
                              }}
                            >
                              추가
                            </button>
                          </div>
                        </div>

                        {/* 카테고리 목록 테이블 */}
                        <div style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>
                            📋 등록된 카테고리 목록 ({categories.length}개)
                          </span>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            ※ 발견사항 등록 시 분류 선택 목록에 반영됩니다.
                          </span>
                        </div>

                        <div style={{
                          maxHeight: '280px',
                          overflowY: 'auto',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.03)',
                        }}>
                          <table style={{ ...styles.table, marginTop: 0 }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f1f5f9', zIndex: 1 }}>
                              <tr>
                                <th style={{ ...styles.th, width: '50px', textAlign: 'center', backgroundColor: '#f1f5f9', borderBottom: '1.5px solid #cbd5e1' }}>No</th>
                                <th style={{ ...styles.th, backgroundColor: '#f1f5f9', borderBottom: '1.5px solid #cbd5e1' }}>카테고리명</th>
                                <th style={{ ...styles.th, width: '130px', textAlign: 'center', backgroundColor: '#f1f5f9', borderBottom: '1.5px solid #cbd5e1' }}>관리</th>
                              </tr>
                            </thead>
                            <tbody>
                              {categories.length === 0 ? (
                                <tr>
                                  <td colSpan="3" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                    등록된 카테고리가 없습니다. 상단에서 추가해 주세요.
                                  </td>
                                </tr>
                              ) : (
                                categories.map((cat, idx) => (
                                  <tr
                                    key={cat.categoryId}
                                    style={{
                                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfdfe',
                                      borderBottom: '1px solid #f1f5f9',
                                    }}
                                  >
                                    <td style={{ ...styles.td, textAlign: 'center', color: '#64748b', fontSize: '12px', padding: '10px 8px' }}>
                                      {idx + 1}
                                    </td>
                                    <td style={{ ...styles.td, padding: '10px 12px' }}>
                                      {editingCatId === cat.categoryId ? (
                                        <input
                                          type="text"
                                          value={editingCatName}
                                          onChange={(e) => setEditingCatName(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              handleUpdateCategory(cat.categoryId);
                                            } else if (e.key === 'Escape') {
                                              setEditingCatId(null);
                                            }
                                          }}
                                          autoFocus
                                          style={{
                                            ...styles.input,
                                            padding: '4px 8px',
                                            fontSize: '13px',
                                            backgroundColor: '#ffffff',
                                            border: '1.5px solid var(--saea-blue, #0077C8)',
                                          }}
                                        />
                                      ) : (
                                        <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '13px' }}>
                                          🏷️ {cat.categoryName}
                                        </span>
                                      )}
                                    </td>
                                    <td style={{ ...styles.td, textAlign: 'center', padding: '10px 8px' }}>
                                      {editingCatId === cat.categoryId ? (
                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateCategory(cat.categoryId)}
                                            style={{
                                              padding: '4px 10px',
                                              fontSize: '11px',
                                              fontWeight: 'bold',
                                              backgroundColor: '#059669',
                                              color: '#ffffff',
                                              border: 'none',
                                              borderRadius: '4px',
                                              cursor: 'pointer',
                                            }}
                                          >
                                            저장
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setEditingCatId(null)}
                                            style={{
                                              padding: '4px 10px',
                                              fontSize: '11px',
                                              fontWeight: 'bold',
                                              backgroundColor: '#94a3b8',
                                              color: '#ffffff',
                                              border: 'none',
                                              borderRadius: '4px',
                                              cursor: 'pointer',
                                            }}
                                          >
                                            취소
                                          </button>
                                        </div>
                                      ) : (
                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingCatId(cat.categoryId);
                                              setEditingCatName(cat.categoryName);
                                            }}
                                            style={{
                                              padding: '4px 10px',
                                              fontSize: '11px',
                                              fontWeight: 'bold',
                                              backgroundColor: '#f1f5f9',
                                              color: '#334155',
                                              border: '1px solid #cbd5e1',
                                              borderRadius: '4px',
                                              cursor: 'pointer',
                                            }}
                                          >
                                            수정
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteCategory(cat.categoryId, cat.categoryName)}
                                            style={{
                                              padding: '4px 10px',
                                              fontSize: '11px',
                                              fontWeight: 'bold',
                                              backgroundColor: '#fee2e2',
                                              color: '#dc2626',
                                              border: '1px solid #fca5a5',
                                              borderRadius: '4px',
                                              cursor: 'pointer',
                                            }}
                                          >
                                            삭제
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* 모달 푸터 */}
                      <div style={{
                        padding: '14px 24px',
                        backgroundColor: '#f8fafc',
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'flex-end',
                      }}>
                        <button
                          type="button"
                          onClick={() => setCategoryModalOpen(false)}
                          style={{
                            padding: '8px 20px',
                            backgroundColor: '#ffffff',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                          }}
                        >
                          닫기
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ================================================================= */}
          {/* 4번 탭: 법인별 전체 감사 조치율 및 프로젝트 완료(Completion)/Open 관리 */}
          {/* ================================================================= */}
          {isMenuActive('REPORT_MONITORING') && (() => {
            // 필터용 고유 옵션 리스트 동적 추출
            const uniqueProjCorps = Array.from(new Set(projects.map(p => p.corpId).filter(Boolean))).sort();
            const uniqueProjStates = Array.from(new Set(projects.map(p => p.projectState).filter(Boolean))).sort();

            // 법인 감사 담당자 / 감사 책임자 / 시스템 관리자가 아닌 경우 소속 법인으로 고정
            const effectiveProjCorp = isAuditTeam ? filterProjCorp : (user?.corpId || '');

            // 필터링 적용된 프로젝트 리스트 계산
            const filteredProjects = projects.filter(p => {
              if (p.createdAt) {
                const pDate = p.createdAt.substring(0, 10);
                if (filterProjDateFrom && pDate < filterProjDateFrom) return false;
                if (filterProjDateTo && pDate > filterProjDateTo) return false;
              } else {
                if (filterProjDateFrom || filterProjDateTo) return false;
              }
              if (effectiveProjCorp && p.corpId !== effectiveProjCorp) return false;
              if (filterProjState && p.projectState !== filterProjState) return false;
              if (filterProjName && (!p.projectName || !p.projectName.toLowerCase().includes(filterProjName.toLowerCase()))) return false;
              return true;
            });

            return (
              <div style={styles.containerCol}>
                {/* 상단 안내 헤더 및 검색 필터 바 (스크롤 시 상단에 항상 고정) */}
                <div style={{
                  ...styles.card,
                  position: 'sticky',
                  top: '-30px',
                  zIndex: 20,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                  borderBottom: '2px solid #cbd5e1',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>
                        법인별 전체 감사 조치율 및 프로젝트 완료(Completion) / Open 관리
                      </h3>
                      
                    </div>
                  </div>

                  {/* 검색 필터 바 */}
                  <div style={{
                    marginTop: '16px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                    alignItems: 'center',
                    padding: '14px 16px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    {/* Register Date 필터 (From ~ To 기간 검색) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>등록기간:</span>
                      <input
                        type="date"
                        value={filterProjDateFrom}
                        onChange={(e) => setFilterProjDateFrom(e.target.value)}
                        style={{ padding: '5px 8px', fontSize: '13px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }}
                      />
                      <span style={{ fontSize: '13px', color: '#64748b' }}>~</span>
                      <input
                        type="date"
                        value={filterProjDateTo}
                        onChange={(e) => setFilterProjDateTo(e.target.value)}
                        style={{ padding: '5px 8px', fontSize: '13px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }}
                      />
                    </div>

                    {/* 법인 필터 (콤보): 감사팀/시스템관리자가 아닌 경우 본인 소속 법인만 선택 가능 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>소속법인:</span>
                      {isAuditTeam ? (
                        <select
                          value={filterProjCorp}
                          onChange={(e) => setFilterProjCorp(e.target.value)}
                          style={{ padding: '5px 8px', fontSize: '13px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }}
                        >
                          <option value="">[ 전체 법인 ]</option>
                          {uniqueProjCorps.map(corp => (
                            <option key={corp} value={corp}>{corp}</option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={user?.corpId || ''}
                          disabled
                          style={{
                            padding: '5px 8px',
                            fontSize: '13px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#f1f5f9',
                            color: '#1e293b',
                            fontWeight: 'bold',
                            cursor: 'not-allowed'
                          }}
                          title="법인 감사 담당자 / 감사 책임자 / 시스템 관리자 외에는 해당 법인만 조회할 수 있습니다."
                        >
                          <option value={user?.corpId || ''}>{user?.corpId || '소속법인'}</option>
                        </select>
                      )}
                    </div>

                    {/* 상태 필터 (콤보) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>통제상태:</span>
                      <select
                        value={filterProjState}
                        onChange={(e) => setFilterProjState(e.target.value)}
                        style={{ padding: '5px 8px', fontSize: '13px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }}
                      >
                        <option value="">[ 전체 ]</option>
                        {uniqueProjStates.map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </div>

                    {/* 프로젝트명 필터 (인풋) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>프로젝트명:</span>
                      <input
                        type="text"
                        placeholder="프로젝트명 검색..."
                        value={filterProjName}
                        onChange={(e) => setFilterProjName(e.target.value)}
                        style={{
                          padding: '5px 8px',
                          fontSize: '13px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          outline: 'none',
                          width: '150px'
                        }}
                      />
                    </div>

                    {/* 필터 초기화 버튼 */}
                    {(
                      filterProjDateFrom !== (() => {
                        const d = new Date();
                        d.setMonth(d.getMonth() - 3);
                        const y = d.getFullYear();
                        const m = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        return `${y}-${m}-${day}`;
                      })() ||
                      filterProjDateTo !== (() => {
                        const d = new Date();
                        const y = d.getFullYear();
                        const m = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        return `${y}-${m}-${day}`;
                      })() ||
                      filterProjCorp ||
                      filterProjState ||
                      filterProjName
                    ) && (
                        <button
                          onClick={() => {
                            const today = new Date();
                            const tY = today.getFullYear();
                            const tM = String(today.getMonth() + 1).padStart(2, '0');
                            const tD = String(today.getDate()).padStart(2, '0');
                            const todayStr = `${tY}-${tM}-${tD}`;

                            const threeAgo = new Date();
                            threeAgo.setMonth(threeAgo.getMonth() - 3);
                            const aY = threeAgo.getFullYear();
                            const aM = String(threeAgo.getMonth() + 1).padStart(2, '0');
                            const aD = String(threeAgo.getDate()).padStart(2, '0');
                            const threeAgoStr = `${aY}-${aM}-${aD}`;

                            setFilterProjDateFrom(threeAgoStr);
                            setFilterProjDateTo(todayStr);
                            setFilterProjCorp(isAuditTeam ? '' : (user?.corpId || ''));
                            setFilterProjState('');
                            setFilterProjName('');
                          }}
                          style={{
                            padding: '5px 12px',
                            fontSize: '12px',
                            backgroundColor: '#94a3b8',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          필터 초기화
                        </button>
                      )}
                  </div>
                </div>

                {/* 하단 프로젝트 및 감사 조치율 테이블 카드 */}
                <div style={styles.card}>
                  <table style={{ ...styles.table, marginTop: '10px' }}>
                    <thead>
                      <tr>
                        <th style={styles.th}>프로젝트명</th>
                        <th style={styles.th}>소속법인</th>
                        <th style={styles.th}>마감일정 (1차 / 2차 / 3차)</th>
                        <th style={styles.th}>법인 내 결재 상태</th>
                        <th style={styles.th}>감사팀 결재 단계 (담당자 ➔ 책임자)</th>
                        <th style={styles.th}>통제 상태</th>
                        <th style={{ ...styles.th, minWidth: '200px' }}>감사 검토 & 최종승인 제어</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProjects.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={styles.tdCenter}>등록된 프로젝트가 존재하지 않습니다.</td>
                        </tr>
                      ) : (
                        filteredProjects.map(p => {
                          // 해당 프로젝트에 속한 발견사항 목록 및 결재 상태 계산
                          const projFindings = findings.filter(f => f.project?.projectId === p.projectId);
                          const totalCount = projFindings.length;
                          const headApprovedCount = projFindings.filter(f => f.approvalStatus === 'SUBMITTED' || f.approvalStatus === 'AUDIT_CONFIRMED').length;
                          const pendingHeadCount = projFindings.filter(f => f.approvalStatus === 'PENDING_HEAD').length;
                          const pendingLeadCount = projFindings.filter(f => f.approvalStatus === 'PENDING_LEAD').length;
                          const draftCount = projFindings.filter(f => !f.approvalStatus || f.approvalStatus === 'DRAFT').length;
                          const rejectedCount = projFindings.filter(f => f.approvalStatus && f.approvalStatus.startsWith('REJECTED')).length;

                          // 법인장 결재 완료 여부
                          const isAllHeadApproved = totalCount > 0 && headApprovedCount === totalCount;
                          const isHeadConfirmed = Boolean(p.headConfirmedBy || p.auditApprovalStatus === 'HEAD_CONFIRMED' || p.auditApprovalStatus === 'AUDITOR_CONFIRMED' || p.auditApprovalStatus === 'LEADER_APPROVED');
                          const canFreezeOrOpen = totalCount === 0 || isAllHeadApproved || isHeadConfirmed;
                          const auditStatus = p.auditApprovalStatus || 'PENDING_AUDIT';

                          return (
                            <tr key={p.projectId}>
                              <td style={styles.td}><strong>{p.projectName}</strong></td>
                              <td style={styles.td}>{p.corpId}</td>
                              <td style={styles.td}>
                                <span style={styles.dateBadge}>{p.deadline2nd || p.deadline3rd ? '1차: ' : '마감일: '}{p.deadline1st ? p.deadline1st.substring(0, 10) : '-'}</span>
                                {p.deadline2nd && <span style={styles.dateBadge}>2차: {p.deadline2nd.substring(0, 10)}</span>}
                                {p.deadline3rd && <span style={styles.dateBadge}>3차: {p.deadline3rd.substring(0, 10)}</span>}
                              </td>
                              <td style={styles.td}>
                                {/* 법인 내 결재 상태 */}
                                {totalCount === 0 ? (
                                  <span style={{ ...styles.badgeStatus, backgroundColor: '#f1f5f9', color: '#64748b' }}>
                                    등록 항목 없음 (0건)
                                  </span>
                                ) : (isAllHeadApproved || isHeadConfirmed) ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    <span style={{ ...styles.badgeStatus, backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
                                      법인장 결재 완료 {p.headConfirmedBy ? `(${p.headConfirmedBy})` : `(${headApprovedCount}/${totalCount})`}
                                    </span>
                                    {p.headConfirmedAt && (
                                      <span style={{ fontSize: '11px', color: '#166534' }}>
                                        확정: {new Date(p.headConfirmedAt).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    <span style={{ ...styles.badgeStatus, backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                                      결재 진행 중 (완료 {headApprovedCount}/{totalCount})
                                    </span>
                                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                                      {pendingHeadCount > 0 && <span style={{ color: '#7c3aed', marginRight: '5px' }}>법인장대기 {pendingHeadCount}건</span>}
                                      {pendingLeadCount > 0 && <span style={{ color: '#d97706', marginRight: '5px' }}>대표대기 {pendingLeadCount}건</span>}
                                      {draftCount > 0 && <span style={{ color: '#64748b', marginRight: '5px' }}>작성중 {draftCount}건</span>}
                                      {rejectedCount > 0 && <span style={{ color: '#dc2626' }}>반려 {rejectedCount}건</span>}
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td style={styles.td}>
                                {/* 감사팀 2단계 결재 진행 상태 (감사담당자 ➔ 감사책임자) */}
                                {auditStatus === 'AUDIT_REJECTED' && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ ...styles.badgeStatus, backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                                      감사 보완요청됨
                                    </span>
                                    {p.auditRejectedReason && (
                                      <span style={{ fontSize: '11px', color: '#b91c1c' }}>"{p.auditRejectedReason}"</span>
                                    )}
                                  </div>
                                )}
                                {auditStatus === 'LEADER_APPROVED' && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ ...styles.badgeStatus, backgroundColor: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                                      감사책임자 최종승인 완료
                                    </span>
                                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                                      • 담당자: <b>{p.auditorReviewedBy || '-'}</b> ({p.auditorReviewedAt ? new Date(p.auditorReviewedAt).toLocaleDateString() : ''})<br />
                                      • 책임자: <b>{p.auditLeaderApprovedBy || '-'}</b> ({p.auditLeaderApprovedAt ? new Date(p.auditLeaderApprovedAt).toLocaleDateString() : ''})
                                    </div>
                                  </div>
                                )}
                                {auditStatus === 'AUDITOR_CONFIRMED' && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ ...styles.badgeStatus, backgroundColor: '#ede9fe', color: '#6d28d9', border: '1px solid #ddd6fe' }}>
                                      담당자 확인완료 (책임자 승인대기)
                                    </span>
                                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                                      • 확인자: <b>{p.auditorReviewedBy}</b> ({p.auditorReviewedAt ? new Date(p.auditorReviewedAt).toLocaleDateString() : ''})
                                    </div>
                                  </div>
                                )}
                                {auditStatus === 'HEAD_CONFIRMED' && (
                                  <span style={{ ...styles.badgeStatus, backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}>
                                    감사팀 검토 대기 (법인장 확정완료)
                                  </span>
                                )}
                                {auditStatus === 'PENDING_AUDIT' && (
                                  <span style={{ ...styles.badgeStatus, backgroundColor: '#f1f5f9', color: '#64748b' }}>
                                    감사담당자 확인 대기
                                  </span>
                                )}
                              </td>
                              <td style={styles.td}>
                                <span style={p.projectState === 'FREEZE' ? styles.badgeFreeze : styles.badgeOpen}>
                                  {p.projectState}
                                </span>
                              </td>
                              <td style={styles.td}>
                                {/* 감사 검토 & 최종승인 액션 버튼 (감사담당자 확인 ➔ 감사책임자 최종승인 & Freeze) */}
                                {(!canFreezeOrOpen && !isAuditTeam) ? (
                                  <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 'bold' }}>
                                    ※ 법인장 결재 완료 후 가능
                                  </span>
                                ) : (
                                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {/* 1) 감사 담당자 전용 버튼 */}
                                    {user.role === 'AUDITOR' && (
                                      <>
                                        {auditStatus !== 'AUDITOR_CONFIRMED' && auditStatus !== 'LEADER_APPROVED' ? (
                                          <>
                                            <button
                                              onClick={() => openAuditorReviewProjModal(p)}
                                              style={{ ...styles.approveActionBtn, backgroundColor: '#4f46e5' }}
                                              title="감사 담당자로서 조치내용을 검토하고 확인합니다."
                                            >
                                              담당자 내용 확인
                                            </button>
                                            <button
                                              onClick={() => openAuditRejectProjModal(p)}
                                              style={styles.rejectActionBtn}
                                              title="내용이 미흡하여 보완을 요청합니다."
                                            >
                                              보완요청
                                            </button>
                                          </>
                                        ) : (
                                          <span style={{ fontSize: '12px', color: '#059669', fontWeight: 'bold' }}>
                                            담당자 확인완료
                                          </span>
                                        )}
                                      </>
                                    )}

                                    {/* 2) 감사 책임자 전용 버튼 (담당자 내용확인 / 보완요청 / 최종 확정 및 완료) */}
                                    {user.role === 'AUDIT_LEADER' && (
                                      <>
                                        {p.projectState === 'FREEZE' ? (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '12px', color: '#047857', fontWeight: 'bold', backgroundColor: '#d1fae5', padding: '3px 8px', borderRadius: '4px' }}>
                                              최종 확정 및 완료 (Completion)
                                            </span>
                                            <button
                                              onClick={() => handleUnfreezeProject(p.projectId, p.corpId)}
                                              style={styles.unfreezeBtn}
                                              title="프로젝트 완료를 해제(Open)합니다."
                                            >
                                              완료해제(Open)
                                            </button>
                                          </div>
                                        ) : (
                                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            {auditStatus === 'AUDITOR_CONFIRMED' && (
                                              <span style={{ fontSize: '11px', color: '#6d28d9', fontWeight: 'bold', backgroundColor: '#ede9fe', padding: '3px 8px', borderRadius: '4px' }}>
                                                담당자 확인완료
                                              </span>
                                            )}
                                            {auditStatus !== 'AUDITOR_CONFIRMED' && (
                                              <button
                                                onClick={() => openAuditorReviewProjModal(p)}
                                                style={{ ...styles.approveActionBtn, backgroundColor: '#4f46e5' }}
                                                title="감사 책임자로서 조치내용을 직접 확인합니다. (확인 후 바로 완료(Completion) 가능)"
                                              >
                                                담당자 내용 확인
                                              </button>
                                            )}
                                            <button
                                              onClick={() => openLeaderApproveProjModal(p)}
                                              style={{
                                                ...styles.approveActionBtn,
                                                backgroundColor: '#059669',
                                                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                              }}
                                              title="감사 책임자로서 최종 승인하고 프로젝트를 완료(Completion)합니다."
                                            >
                                              최종 확정 및 완료 (Completion)
                                            </button>
                                            <button
                                              onClick={() => openAuditRejectProjModal(p)}
                                              style={styles.rejectActionBtn}
                                              title="내용이 미흡하여 보완을 요청합니다."
                                            >
                                              보완요청
                                            </button>
                                          </div>
                                        )}
                                      </>
                                    )}

                                    {/* 3) 시스템 관리자 전용 (모든 액션 가능) */}
                                    {user.role === 'SYSTEM_ADMIN' && (
                                      <>
                                        {auditStatus !== 'AUDITOR_CONFIRMED' && auditStatus !== 'LEADER_APPROVED' && (
                                          <button
                                            onClick={() => openAuditorReviewProjModal(p)}
                                            style={{ ...styles.approveActionBtn, backgroundColor: '#4f46e5' }}
                                          >
                                            담당자 확인
                                          </button>
                                        )}
                                        {p.projectState !== 'FREEZE' ? (
                                          <button
                                            onClick={() => openLeaderApproveProjModal(p)}
                                            style={styles.approveActionBtn}
                                          >
                                            최종 확정 (Completion)
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => handleUnfreezeProject(p.projectId, p.corpId)}
                                            style={styles.unfreezeBtn}
                                          >
                                            완료해제(Open)
                                          </button>
                                        )}
                                        <button
                                          onClick={() => openAuditRejectProjModal(p)}
                                          style={styles.rejectActionBtn}
                                        >
                                          보완요청
                                        </button>
                                      </>
                                    )}

                                    {/* 4) 기타 역할 사용자 (법인장, 대표, 일반 등) */}
                                    {!isAuditTeam && (
                                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                                        {p.projectState === 'FREEZE' ? '최종 완료' : '감사팀 승인 진행 중'}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* ================================================================= */}
          {/* 5번 탭: 사용자 계정 관리 (SYSTEM_ADMIN 전용) */}
          {/* ================================================================= */}
          {isMenuActive('USER_MANAGEMENT') && (
            <div style={styles.containerCol}>
              {/* 상단 헤더 및 계정 검색 필터 (스크롤 시 상단에 항상 고정) */}
              <div style={{
                ...styles.card,
                position: 'sticky',
                top: '-30px',
                zIndex: 20,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                borderBottom: '2px solid #cbd5e1',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#1f2937' }}>임직원 계정 및 권한 관리</h3>
                    <p style={{ ...styles.cardSubtitle, margin: '4px 0 0 0' }}>모든 사용자의 부서 및 현재 권한을 조회하고, 실시간으로 시스템 접근 권한을 변경합니다.</p>
                  </div>
                  <button
                    onClick={handleOpenCreateUserModal}
                    style={{
                      padding: '9px 16px',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                    }}
                  >
                    신규 사용자 등록
                  </button>
                </div>

                {/* 신규 사용자 등록 모달 */}
                {createUserModalOpen && (
                  <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                  }}>
                    <div style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '10px',
                      width: '640px',
                      maxWidth: '95%',
                      maxHeight: '90vh',
                      overflowY: 'auto',
                      padding: '24px',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
                        <h3 style={{ margin: 0, fontSize: '17px', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          신규 사용자 등록 (시스템 관리자)
                        </h3>
                        <button
                          type="button"
                          onClick={handleCloseCreateUserModal}
                          style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#6b7280' }}
                        >
                          ✕
                        </button>
                      </div>

                      {/* 사내 인사 시스템 연동 사원 간편 검색 및 자동 등록 섹션 */}
                      <div style={{
                        padding: '16px',
                        backgroundColor: '#f0f9ff',
                        border: '1.5px solid #0284c7',
                        borderRadius: '8px',
                        marginBottom: '20px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            사내 인사 시스템 연동 사원 등록
                          </span>
                          <span style={{ fontSize: '11px', color: '#0284c7' }}>
                            ※ 성명 입력 시 사번(ID) 및 소속 정보를 조회하여 즉시 등록합니다.
                          </span>
                        </div>

                        {/* 검색 입력창 및 버튼 */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <select
                            value={searchEmpCorp}
                            onChange={(e) => setSearchEmpCorp(e.target.value)}
                            style={{
                              ...styles.select,
                              width: '120px',
                              fontSize: '12px',
                              padding: '7px 8px',
                              borderColor: '#38bdf8'
                            }}
                          >
                            <option value="ALL">전체 법인</option>
                            <option value="글로벌세아">글로벌세아</option>
                            <option value="세아상역">세아상역</option>
                          </select>

                          <input
                            type="text"
                            placeholder="사원 성명 입력 (예: 홍길동, 김철수)"
                            value={searchEmpName}
                            onChange={(e) => setSearchEmpName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSearchEmployee();
                              }
                            }}
                            style={{
                              ...styles.input,
                              flex: 1,
                              fontSize: '13px',
                              padding: '7px 12px',
                              borderColor: '#38bdf8'
                            }}
                          />

                          <button
                            type="button"
                            onClick={handleSearchEmployee}
                            disabled={searchEmpLoading}
                            style={{
                              padding: '7px 14px',
                              backgroundColor: '#0284c7',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: 'bold',
                              cursor: searchEmpLoading ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {searchEmpLoading ? '조회 중...' : '사원 검색'}
                          </button>
                        </div>

                        {/* 검색 상태 및 안내 메시지 */}
                        {searchEmpMessage && (
                          <div style={{
                            marginTop: '10px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: searchEmpResults.length > 0 ? '#0369a1' : '#dc2626',
                            backgroundColor: searchEmpResults.length > 0 ? '#e0f2fe' : '#fef2f2',
                            padding: '6px 10px',
                            borderRadius: '4px'
                          }}>
                            {searchEmpMessage}
                          </div>
                        )}

                        {/* 동명이인 및 검색 결과 사원 카드 목록 */}
                        {searchEmpResults.length > 0 && (
                          <div style={{
                            marginTop: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            maxHeight: '220px',
                            overflowY: 'auto',
                            paddingRight: '4px'
                          }}>
                            {searchEmpResults.map((emp, idx) => (
                              <div
                                key={emp.username || idx}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '10px 12px',
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #bae6fd',
                                  borderRadius: '6px',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                  gap: '10px'
                                }}
                              >
                                {/* 사원 식별 정보: ID와 소속(법인, 부서)을 명확하게 강조 표시 */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <strong style={{ fontSize: '14px', color: '#1e293b' }}>{emp.name}</strong>
                                    <span style={{
                                      padding: '2px 8px',
                                      backgroundColor: '#e0f2fe',
                                      color: '#0369a1',
                                      borderRadius: '4px',
                                      fontSize: '12px',
                                      fontWeight: 'bold'
                                    }}>
                                      ID(사번): {emp.username}
                                    </span>
                                    {emp.alreadyRegistered && (
                                      <span style={{
                                        padding: '2px 6px',
                                        backgroundColor: '#fee2e2',
                                        color: '#991b1b',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 'bold'
                                      }}>
                                        이미 등록된 계정
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>소속: <b>{emp.corpId}</b> / <b>{emp.deptName || '소속부서'}</b></span>
                                    {emp.email && <span style={{ color: '#64748b' }}>• {emp.email}</span>}
                                  </div>
                                </div>

                                {/* 선택 및 즉시 등록 액션 버튼 */}
                                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                  <button
                                    type="button"
                                    onClick={() => handleSelectEmployee(emp)}
                                    style={{
                                      padding: '5px 10px',
                                      backgroundColor: '#f1f5f9',
                                      color: '#0f172a',
                                      border: '1px solid #cbd5e1',
                                      borderRadius: '4px',
                                      fontSize: '12px',
                                      fontWeight: 'bold',
                                      cursor: 'pointer'
                                    }}
                                    title="이 사원의 정보를 아래 입력 폼에 자동으로 채웁니다"
                                  >
                                    선택 (폼 자동완성)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickRegisterEmployee(emp)}
                                    disabled={emp.alreadyRegistered}
                                    style={{
                                      padding: '5px 12px',
                                      backgroundColor: emp.alreadyRegistered ? '#94a3b8' : '#059669',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '4px',
                                      fontSize: '12px',
                                      fontWeight: 'bold',
                                      cursor: emp.alreadyRegistered ? 'not-allowed' : 'pointer'
                                    }}
                                    title="이 사원 정보를 바탕으로 계정을 즉시 생성합니다"
                                  >
                                    즉시 계정 등록
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '12px 0',
                        fontSize: '12px',
                        color: '#94a3b8',
                        fontWeight: '500'
                      }}>
                        <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
                        <span style={{ padding: '0 10px' }}>또는 사용자 정보 직접 수동 입력</span>
                        <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
                      </div>

                      {createUserError && (
                        <div style={{
                          padding: '10px 14px',
                          backgroundColor: '#fee2e2',
                          color: '#991b1b',
                          borderRadius: '6px',
                          fontSize: '13px',
                          marginBottom: '16px',
                          border: '1px solid #fca5a5',
                        }}>
                          ※ {createUserError}
                        </div>
                      )}

                      <form onSubmit={handleCreateUser} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* 브라우저의 ID/비밀번호 자동완성 가로채기 방지용 숨김 인풋 */}
                        <input type="text" name="fake_username_remembered" style={{ position: 'absolute', opacity: 0, height: 0, width: 0, zIndex: -1 }} tabIndex="-1" autoComplete="off" />
                        <input type="password" name="fake_password_remembered" style={{ position: 'absolute', opacity: 0, height: 0, width: 0, zIndex: -1 }} tabIndex="-1" autoComplete="new-password" />

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                          <div style={styles.formGroup}>
                            <label style={{ ...styles.formLabel, fontSize: '13px' }}>ID <span style={{ color: '#ef4444' }}>*</span></label>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <input
                                type="text"
                                name="create_new_user_id"
                                autoComplete="off"
                                placeholder="예: EMP001"
                                value={newUsername}
                                onChange={(e) => {
                                  setNewUsername(e.target.value);
                                  setIdCheckStatus(null);
                                  setIdCheckMessage('');
                                }}
                                required
                                style={{ ...styles.input, flex: 1 }}
                              />
                              <button
                                type="button"
                                onClick={handleCheckUsername}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: idCheckStatus === 'AVAILABLE' ? '#059669' : '#4b5563',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                }}
                              >
                                {idCheckStatus === 'AVAILABLE' ? '확인완료' : '중복확인'}
                              </button>
                            </div>
                            {idCheckMessage && (
                              <div style={{
                                fontSize: '11px',
                                marginTop: '3px',
                                fontWeight: 'bold',
                                color: idCheckStatus === 'AVAILABLE' ? '#059669' : '#dc2626'
                              }}>
                                {idCheckMessage}
                              </div>
                            )}
                          </div>

                          <div style={styles.formGroup}>
                            <label style={{ ...styles.formLabel, fontSize: '13px' }}>초기 비밀번호 <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="password"
                              name="create_new_user_password"
                              autoComplete="new-password"
                              placeholder="비밀번호 설정"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              required
                              style={styles.input}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div style={styles.formGroup}>
                            <label style={{ ...styles.formLabel, fontSize: '13px' }}>성명 <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="text"
                              placeholder="예: 홍길동"
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              required
                              style={styles.input}
                            />
                          </div>

                          <div style={styles.formGroup}>
                            <label style={{ ...styles.formLabel, fontSize: '13px' }}>이메일</label>
                            <input
                              type="email"
                              placeholder="user@sae-a.com"
                              value={newEmail}
                              onChange={(e) => setNewEmail(e.target.value)}
                              style={styles.input}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div style={styles.formGroup}>
                            <label style={{ ...styles.formLabel, fontSize: '13px' }}>소속 법인 <span style={{ color: '#ef4444' }}>*</span></label>
                            {(() => {
                              const existingCorps = Array.from(new Set(usersList.map(u => u.corpId).filter(Boolean))).sort();
                              const corpsToRender = existingCorps.length > 0 ? existingCorps : ['CORP_A', 'CORP_B', 'CORP_C'];
                              return (
                                <>
                                  <select
                                    value={newCorpId}
                                    onChange={(e) => {
                                      setNewCorpId(e.target.value);
                                      if (e.target.value !== '__NEW__') {
                                        setCustomCorpInput('');
                                      }
                                    }}
                                    style={styles.select}
                                  >
                                    <option value="">-- 소속 법인 선택 --</option>
                                    {corpsToRender.map(corp => (
                                      <option key={corp} value={corp}>{corp}</option>
                                    ))}
                                    <option value="__NEW__">[직접 입력] 신규 법인 입력...</option>
                                  </select>

                                  {newCorpId === '__NEW__' && (
                                    <input
                                      type="text"
                                      placeholder="신규 법인 코드 또는 명칭 입력"
                                      value={customCorpInput}
                                      onChange={(e) => setCustomCorpInput(e.target.value)}
                                      required
                                      style={{ ...styles.input, marginTop: '6px' }}
                                    />
                                  )}
                                </>
                              );
                            })()}
                          </div>

                          <div style={styles.formGroup}>
                            <label style={{ ...styles.formLabel, fontSize: '13px' }}>담당 부서명 <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="text"
                              placeholder="예: 감사팀, 회계팀"
                              value={newDeptName}
                              onChange={(e) => setNewDeptName(e.target.value)}
                              required
                              style={styles.input}
                            />
                          </div>
                        </div>

                        <div style={styles.formGroup}>
                          <label style={{ ...styles.formLabel, fontSize: '13px' }}>부여 권한 <span style={{ color: '#ef4444' }}>*</span></label>
                          <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            style={styles.select}
                          >
                            {ROLE_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                          <button
                            type="button"
                            onClick={handleCloseCreateUserModal}
                            style={{
                              padding: '9px 16px',
                              backgroundColor: '#e5e7eb',
                              color: '#374151',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                            }}
                          >
                            취소
                          </button>
                          <button
                            type="submit"
                            style={{
                              padding: '9px 18px',
                              backgroundColor: '#2563eb',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                            }}
                          >
                            사용자 등록 완료
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* 개별 항목별 검색 필터 (콤보 및 텍스트) */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '15px',
                  alignItems: 'center',
                  marginBottom: '20px',
                  padding: '12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0'
                }}>
                  {/* 법인 필터 (콤보) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>법인:</span>
                    <select
                      value={filterCorp}
                      onChange={(e) => setFilterCorp(e.target.value)}
                      style={{ padding: '5px 10px', fontSize: '13px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }}
                    >
                      <option value="">[ 전체 ]</option>
                      {Array.from(new Set(usersList.map(u => u.corpId).filter(Boolean))).sort().map(corp => (
                        <option key={corp} value={corp}>{corp}</option>
                      ))}
                    </select>
                  </div>

                  {/* 부서 필터 (콤보) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>부서:</span>
                    <select
                      value={filterDept}
                      onChange={(e) => setFilterDept(e.target.value)}
                      style={{ padding: '5px 10px', fontSize: '13px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }}
                    >
                      <option value="">[ 전체 ]</option>
                      {Array.from(new Set(usersList.map(u => u.deptName).filter(Boolean))).sort().map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  {/* 권한 필터 (콤보) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>권한:</span>
                    <select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      style={{ padding: '5px 10px', fontSize: '13px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }}
                    >
                      <option value="">[ 전체 ]</option>
                      {ROLE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* 이름 필터 (텍스트) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>이름:</span>
                    <input
                      type="text"
                      placeholder="이름 입력..."
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                      style={{
                        padding: '5px 10px',
                        fontSize: '13px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        outline: 'none',
                        width: '120px'
                      }}
                    />
                  </div>

                  {/* 필터 초기화 버튼 */}
                  {(filterCorp || filterDept || filterName || filterRole) && (
                    <button
                      onClick={() => {
                        setFilterCorp('');
                        setFilterDept('');
                        setFilterName('');
                        setFilterRole('');
                      }}
                      style={{
                        padding: '5px 10px',
                        fontSize: '12px',
                        backgroundColor: '#cbd5e1',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        color: '#334155'
                      }}
                    >
                      필터 초기화
                    </button>
                  )}
                </div>
              </div>

              {/* 하단 사용자 계정 목록 테이블 카드 */}
              <div style={styles.card}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>소속 법인</th>
                      <th style={styles.th}>부서명</th>
                      <th style={styles.th}>ID</th>
                      <th style={styles.th}>이름</th>
                      <th style={styles.th}>현재 권한</th>
                      <th style={styles.th}>권한 변경</th>
                      <th style={styles.th}>사용 여부</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList
                      .filter(u => {
                        if (filterCorp && u.corpId !== filterCorp) return false;
                        if (filterDept && u.deptName !== filterDept) return false;
                        if (filterName && (!u.name || !u.name.toLowerCase().includes(filterName.toLowerCase()))) return false;
                        if (filterRole && u.role !== filterRole) return false;
                        return true;
                      })
                      .map(u => (
                        <tr key={u.id || u.username} style={u.enabled === false ? { opacity: 0.6, backgroundColor: '#f8fafc' } : {}}>
                          <td style={styles.td}>{u.corpId}</td>
                          <td style={styles.td}>{u.deptName}</td>
                          <td style={styles.td}><strong>{u.username}</strong></td>
                          <td style={styles.td}>{u.name}</td>
                          <td style={styles.td}>
                            <span style={styles.badgeCategory}>{getRoleKoreanName(u.role)}</span>
                            {u.enabled === false && <span style={{ marginLeft: '5px', color: '#ef4444', fontSize: '11px', fontWeight: 'bold' }}>[사용 안함]</span>}
                          </td>
                          <td style={styles.td}>
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.username, e.target.value)}
                              style={{ ...styles.select, width: '150px', padding: '5px 8px', margin: '0' }}
                              disabled={u.enabled === false}
                            >
                              {ROLE_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </td>
                          <td style={styles.td}>
                            <button
                              onClick={() => handleToggleUserStatus(u.username, u.enabled !== false)}
                              style={u.enabled !== false ? styles.deactivateBtn : styles.activateBtn}
                            >
                              {u.enabled !== false ? '사용 안함' : '사용 함'}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 6번 탭: 시스템 화면 및 메뉴 관리 */}
          {/* ================================================================= */}
          {isMenuActive('MENU_MANAGEMENT') && (
            <MenuManagement onMenuChange={fetchUserMenus} />
          )}

          {/* ================================================================= */}
          {/* 7번 탭: 역할별 화면 접근 관리 */}
          {/* ================================================================= */}
          {isMenuActive('ROLE_PERMISSION_MANAGEMENT') && (
            <RolePermissionManagement onPermissionChange={fetchUserMenus} />
          )}

          {/* ================================================================= */}
          {/* 8번 탭: 프로젝트 최종 검증 및 확정 (프로젝트 종합 검증/CONFIRM 및 감사팀 FREEZE) */}
          {/* ================================================================= */}
          {isMenuActive('HEAD_FINAL_APPROVAL') && (() => {
            const isHead = user?.role === 'CORP_HEAD';
            const userCorp = (user?.corpId || '').trim();

            // 사용자 ID -> 이름 매핑 사전 (기본 계정 및 Fallback)
            const KNOWN_NAME_MAP = {
              'corp01': '법인담당자',
              'corp02': '법인대표담당',
              'corp03': '법인담당자2',
              'aud01': '감사책임자',
              'aud02': '감사담당자1',
              'aud03': '감사담당자2',
              'admin': '시스템관리자',
            };

            // [요구사항 2] 조치담당자 및 부서명 변환 헬퍼 (코드명/ID 대신 실제 성명/이름 표기)
            const getAssigneeName = (assignedUserId) => {
              if (!assignedUserId || String(assignedUserId).trim() === '' || String(assignedUserId).trim() === '-') return '-';
              const ids = String(assignedUserId).split(',').map(s => s.trim()).filter(Boolean);
              if (ids.length === 0) return '-';
              const names = ids.map(id => {
                // '이름(id)' 형식인 경우 이름 추출
                const parenMatch = id.match(/^(.*?)\((.*?)\)$/);
                if (parenMatch && parenMatch[1].trim()) {
                  return parenMatch[1].trim();
                }

                const u = usersList.find(user => 
                  String(user.userId) === id || 
                  String(user.username).toLowerCase() === id.toLowerCase() ||
                  String(user.name).toLowerCase() === id.toLowerCase()
                );

                if (u?.name && u.name.trim() && u.name.toLowerCase() !== id.toLowerCase()) {
                  return u.name.trim();
                }
                if (KNOWN_NAME_MAP[id.toLowerCase()]) {
                  return KNOWN_NAME_MAP[id.toLowerCase()];
                }
                return u?.name || u?.username || id;
              });
              return names.join(', ');
            };

            const getDeptName = (assignedUserId, assignedDeptName) => {
              if (assignedDeptName && !assignedDeptName.startsWith('DEPT_') && !assignedDeptName.startsWith('dept_')) {
                return assignedDeptName;
              }
              if (assignedUserId) {
                const ids = String(assignedUserId).split(',').map(s => s.trim()).filter(Boolean);
                for (const id of ids) {
                  const u = usersList.find(user => 
                    String(user.userId) === id || 
                    String(user.username).toLowerCase() === id.toLowerCase() ||
                    String(user.name).toLowerCase() === id.toLowerCase()
                  );
                  if (u?.deptName && !u.deptName.startsWith('DEPT_')) {
                    return u.deptName;
                  }
                }
              }
              return assignedDeptName || '';
            };

            const getAssigneeWithDept = (assignedUserId, assignedDeptName) => {
              const aName = getAssigneeName(assignedUserId);
              const dName = getDeptName(assignedUserId, assignedDeptName);
              if ((!aName || aName === '-') && (!dName || dName === '부서미지정')) return '-';
              if (!aName || aName === '-') return dName;
              if (!dName || dName === '부서미지정') return aName;
              return `${aName} (${dName})`;
            };

            const getActorDisplayName = (actorId) => {
              if (!actorId || String(actorId).trim() === '') return '시스템';
              return getAssigneeName(actorId);
            };

            // [요구사항 1] 프로젝트 단위 조회 필터링 (법인장은 본인 법인만 엄격 조회)
            const filteredProjects = projects.filter(p => {
              // 법인장 권한: 본인 소속 법인만 엄격하게 조회 (타 법인 원천 차단)
              if (isHead) {
                if (!userCorp) return false;
                if ((p.corpId || '').trim().toLowerCase() !== userCorp.toLowerCase()) return false;
              } else if (finalProjectFilterCorp) {
                if ((p.corpId || '').trim().toLowerCase() !== finalProjectFilterCorp.trim().toLowerCase()) return false;
              }

              // 검색어 필터 (프로젝트명, 법인명)
              if (finalProjectSearchText.trim()) {
                const query = finalProjectSearchText.trim().toLowerCase();
                const matchName = (p.projectName || '').toLowerCase().includes(query);
                const matchCorp = (p.corpId || '').toLowerCase().includes(query);
                if (!matchName && !matchCorp) return false;
              }

              // 결재/진행 상태 필터
              if (finalProjectFilterStatus && finalProjectFilterStatus !== 'ALL') {
                const pCaps = findings.filter(f => f.project?.projectId === p.projectId);
                const pTotal = pCaps.length;
                const pConfirmed = pCaps.filter(f => (f.actionPlanStatus || f.approvalStatus) === 'AUDIT_CONFIRMED').length;
                const isReady = pTotal > 0 && pConfirmed === pTotal;
                const isFreeze = p.projectState === 'FREEZE';
                const isHeadConfirmed = Boolean(p.headConfirmedBy || p.auditApprovalStatus === 'HEAD_CONFIRMED');

                if (finalProjectFilterStatus === 'FREEZE') {
                  if (!isFreeze) return false;
                } else if (finalProjectFilterStatus === 'CONFIRMED') {
                  if (!isHeadConfirmed || isFreeze) return false;
                } else if (finalProjectFilterStatus === 'READY') {
                  if (!isReady || isHeadConfirmed || isFreeze) return false;
                } else if (finalProjectFilterStatus === 'IN_PROGRESS') {
                  if (isReady || isHeadConfirmed || isFreeze) return false;
                }
              }

              return true;
            });

            // 현재 선택된 프로젝트 (법인장인 경우 본인 법인 프로젝트 목록 내에서만 선택)
            const currentProj = filteredProjects.find(p => p.projectId === selectedFinalProjectId)
              || filteredProjects[0]
              || null;

            // 선택된 프로젝트의 지적사항(CAP) 목록 (법인장인 경우 본인 법인 프로젝트에 대해서만 조회)
            const currentProjCaps = (currentProj && (!isHead || (currentProj.corpId || '').trim().toLowerCase() === userCorp.toLowerCase()))
              ? findings.filter(f => f.project?.projectId === currentProj.projectId)
              : [];

            const totalCapsCount = currentProjCaps.length;
            const auditConfirmedCapsCount = currentProjCaps.filter(f => (f.actionPlanStatus || f.approvalStatus) === 'AUDIT_CONFIRMED').length;
            const isAllAuditConfirmed = totalCapsCount > 0 && auditConfirmedCapsCount === totalCapsCount;

            // 현재 선택된 발견사항 (CAP)
            const currentFinding = currentProjCaps.find(f => f.findingId === selectedFinalFindingId)
              || currentProjCaps[0]
              || null;

            // 프로젝트 선택 변경 핸들러
            const handleSelectProject = (projId) => {
              setSelectedFinalProjectId(projId);
              const caps = findings.filter(f => f.project?.projectId === projId);
              if (caps.length > 0) {
                const firstCapId = caps[0].findingId;
                setSelectedFinalFindingId(firstCapId);
                fetchFindingAttachments(firstCapId);
                fetchFindingHistories(firstCapId);
              } else {
                setSelectedFinalFindingId(null);
                setFindingHistories([]);
              }
            };

            // 발견사항(CAP) 선택 핸들러
            const handleSelectFinding = (findingId) => {
              setSelectedFinalFindingId(findingId);
              fetchFindingAttachments(findingId);
              fetchFindingHistories(findingId);
            };

            // 선택된 CAP의 첨부파일 및 이력
            const currentAttachments = (currentFinding && findingAttachments[currentFinding.findingId]) || [];
            const currentHistories = findingHistories || [];

            // 고유 법인 목록 (감사팀/관리자용 필터 드롭다운)
            const uniqueCorps = isHead
              ? [userCorp]
              : Array.from(new Set(projects.map(p => p.corpId).filter(Boolean)));

            return (
              <div style={styles.containerCol}>
                {/* [요구사항 3] 상단 타이틀 & 안내 헤더 */}
                <div style={styles.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>
                        프로젝트 최종 검증 및 확정 (CONFIRM)
                      </h3>
                      <p style={styles.cardSubtitle}>
                        감사 프로젝트별 발견사항(CAP)의 조치 및 감사 검증 결과를 종합 검토하고 최종 확정(CONFIRM)을 진행합니다. 모든 발견사항이 조치 완료된 경우에만 확정할 수 있으며, 감사팀은 확정 완료 건을 조회하여 최종 승인 및 완료(Completion)합니다.
                      </p>
                    </div>
                  </div>

                  {/* 1. [요구사항 1] 프로젝트 단위 검색 및 필터 영역 (법인장은 자기 법인 고정) */}
                  <div style={{ marginTop: '16px', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                    {/* 법인 선택 필터: 법인장은 본인 법인 전용 고정 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>소속 법인:</label>
                      {isHead ? (
                        <div style={{ padding: '6px 12px', backgroundColor: '#e2e8f0', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', color: '#1e3a8a', border: '1px solid #cbd5e1' }}>
                          {userCorp} (본인 법인 전용)
                        </div>
                      ) : (
                        <select
                          value={finalProjectFilterCorp}
                          onChange={(e) => setFinalProjectFilterCorp(e.target.value)}
                          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                        >
                          <option value="">전체 법인 ({uniqueCorps.length}개)</option>
                          {uniqueCorps.map(corp => (
                            <option key={corp} value={corp}>{corp}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* 결재/진행 상태 필터 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>결재 상태:</label>
                      <select
                        value={finalProjectFilterStatus}
                        onChange={(e) => setFinalProjectFilterStatus(e.target.value)}
                        style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                      >
                        <option value="ALL">전체 상태</option>
                        <option value="READY">확정 대기 (전체 CAP 검증완료 건)</option>
                        <option value="CONFIRMED">확정 완료 건</option>
                        <option value="FREEZE">최종 완료 (Completion) 건</option>
                        <option value="IN_PROGRESS">진행중 (검증 미완료 건)</option>
                      </select>
                    </div>

                    {/* 프로젝트 검색어 필터 및 조회 버튼 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '260px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>검색어:</label>
                      <input
                        type="text"
                        placeholder="프로젝트명 검색..."
                        value={finalProjectSearchText}
                        onChange={(e) => setFinalProjectSearchText(e.target.value)}
                        style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />
                      {finalProjectSearchText && (
                        <button
                          onClick={() => setFinalProjectSearchText('')}
                          style={{ padding: '4px 8px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          ✕
                        </button>
                      )}
                      <button
                        onClick={loadData}
                        style={{
                          padding: '6px 16px',
                          backgroundColor: '#0077C8',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          fontSize: '13px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        조회
                      </button>
                    </div>

                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      조회 결과: <b>{filteredProjects.length}</b>건
                    </div>
                  </div>
                </div>

                {/* 1. 프로젝트 단위 그리드 (테이블) */}
                <div style={styles.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '15px', color: '#1e293b' }}>
                      감사 프로젝트 목록 ({filteredProjects.length}건)
                    </h4>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      ※ 프로젝트 행을 클릭하면 하단에 지적사항(CAP) 서브 그리드가 표시됩니다.
                    </span>
                  </div>

                  {filteredProjects.length === 0 ? (
                    <div style={styles.noDataBox}>
                      {isHead ? `'${userCorp}' 소속의 조회 가능한 감사 프로젝트가 없습니다.` : '조건에 부합하는 감사 프로젝트가 없습니다.'}
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                        <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                          <tr>
                            <th style={{ padding: '10px 12px', width: '50px', textAlign: 'center' }}>선택</th>
                            <th style={{ padding: '10px 12px', width: '100px' }}>소속 법인</th>
                            <th style={{ padding: '10px 12px' }}>감사 프로젝트명</th>
                            <th style={{ padding: '10px 12px', width: '60px', textAlign: 'center' }}>차수</th>
                            <th style={{ padding: '10px 12px', width: '110px' }}>마감기한</th>
                            <th style={{ padding: '10px 12px', width: '180px' }}>CAP 검증 진행률</th>
                            <th style={{ padding: '10px 12px', width: '150px', textAlign: 'center' }}>최종 확정 상태</th>
                            <th style={{ padding: '10px 12px', width: '110px', textAlign: 'center' }}>프로젝트 상태</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredProjects.map(p => {
                            const pCaps = findings.filter(f => f.project?.projectId === p.projectId);
                            const pTotal = pCaps.length;
                            const pConfirmed = pCaps.filter(f => (f.actionPlanStatus || f.approvalStatus) === 'AUDIT_CONFIRMED').length;
                            const isReady = pTotal > 0 && pConfirmed === pTotal;
                            const isSelected = (currentProj?.projectId === p.projectId);
                            const isFreeze = p.projectState === 'FREEZE';
                            const isHeadConfirmed = Boolean(p.headConfirmedBy || p.auditApprovalStatus === 'HEAD_CONFIRMED');
                            const percent = pTotal > 0 ? Math.round((pConfirmed / pTotal) * 100) : 0;

                            return (
                              <tr
                                key={p.projectId}
                                onClick={() => handleSelectProject(p.projectId)}
                                style={{
                                  backgroundColor: isSelected ? '#eff6ff' : '#fff',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid #e2e8f0',
                                  transition: 'background-color 0.15s ease'
                                }}
                              >
                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                  <input
                                    type="radio"
                                    name="selectedFinalProject"
                                    checked={isSelected}
                                    onChange={() => handleSelectProject(p.projectId)}
                                    style={{ cursor: 'pointer' }}
                                  />
                                </td>
                                <td style={{ padding: '10px 12px' }}>
                                  <span style={{ ...styles.badgeCategory, fontSize: '11px', fontWeight: 'bold' }}>
                                    {p.corpId}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 12px' }}>
                                  <strong style={{ color: isSelected ? '#0077C8' : '#1e293b', fontSize: '14px' }}>
                                    {p.projectName}
                                  </strong>
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 'bold', color: '#475569' }}>
                                  {p.round ? `${p.round}차` : '1차'}
                                </td>
                                <td style={{ padding: '10px 12px', color: '#64748b' }}>
                                  {p.deadline1st ? p.deadline1st.substring(0, 10) : '-'}
                                </td>
                                <td style={{ padding: '10px 12px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ flex: 1, backgroundColor: '#e2e8f0', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                                      <div
                                        style={{
                                          width: `${percent}%`,
                                          backgroundColor: isReady ? '#16a34a' : '#0077C8',
                                          height: '100%',
                                          borderRadius: '4px',
                                          transition: 'width 0.3s ease'
                                        }}
                                      />
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: isReady ? '#16a34a' : '#334155', minWidth: '70px', textAlign: 'right' }}>
                                      {pConfirmed}/{pTotal}건 ({percent}%)
                                    </span>
                                  </div>
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                  {isHeadConfirmed ? (
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#16a34a', backgroundColor: '#dcfce7', padding: '3px 8px', borderRadius: '4px', display: 'inline-block' }}>
                                      확정 완료 ({getAssigneeName(p.headConfirmedBy)})
                                    </span>
                                  ) : isReady ? (
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#d97706', backgroundColor: '#fffbeb', padding: '3px 8px', borderRadius: '4px', display: 'inline-block', border: '1px solid #fde68a' }}>
                                      확정 대기 (완료 가능)
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '11px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', display: 'inline-block' }}>
                                      진행중 ({pTotal - pConfirmed}건 미완료)
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                  {isFreeze ? (
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#047857', backgroundColor: '#d1fae5', padding: '3px 8px', borderRadius: '4px' }}>
                                      완료(Completion)
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#0284c7', backgroundColor: '#e0f2fe', padding: '3px 8px', borderRadius: '4px' }}>
                                      OPEN
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 2 & 4 & 5. 선택된 프로젝트 결재 종합 패널 */}
                {currentProj && (
                  <div style={{ ...styles.card, border: '2px solid #0077C8', backgroundColor: '#fafcff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #dbeafe', paddingBottom: '14px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ ...styles.badgeCategory, fontSize: '13px', padding: '4px 10px' }}>{currentProj.corpId}</span>
                        <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>
                          {currentProj.projectName}
                        </h3>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>
                          (차수: {currentProj.round ? `${currentProj.round}차` : '1차'} / 마감: {currentProj.deadline1st ? currentProj.deadline1st.substring(0, 10) : '-'})
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={currentProj.projectState === 'FREEZE' ? styles.badgeFreeze : styles.badgeOpen}>
                          {currentProj.projectState === 'FREEZE' ? '프로젝트 완료 (Completion)' : '진행중 (OPEN)'}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: isAllAuditConfirmed ? '#16a34a' : '#dc2626', backgroundColor: isAllAuditConfirmed ? '#dcfce7' : '#fee2e2', padding: '4px 10px', borderRadius: '6px' }}>
                          지적사항 검증: {auditConfirmedCapsCount} / {totalCapsCount}건 ({isAllAuditConfirmed ? '100% 완료' : `${totalCapsCount - auditConfirmedCapsCount}건 미완료`})
                        </span>
                      </div>
                    </div>

                    {/* 종합 결재 및 완료(Completion) 액션 바 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'stretch' }}>
                      {/* 좌측: [요구사항 4] 최종 확정 (CONFIRM) 영역 */}
                      <div style={{ padding: '16px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h4 style={{ margin: 0, fontSize: '14px', color: '#1e293b' }}>
                              [1단계] 최종 확정 (CONFIRM)
                            </h4>
                            {currentProj.headConfirmedBy ? (
                              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#16a34a', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                                확정 완료
                              </span>
                            ) : isAllAuditConfirmed ? (
                              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#d97706', backgroundColor: '#fffbeb', padding: '2px 8px', borderRadius: '4px' }}>
                                확정 가능
                              </span>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#dc2626', backgroundColor: '#fee2e2', padding: '2px 8px', borderRadius: '4px' }}>
                                확정 불가
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.6', marginBottom: '12px' }}>
                            {currentProj.headConfirmedBy ? (
                              <div>
                                <div style={{ color: '#166534', fontWeight: 'bold' }}>
                                  확정자: {getAssigneeName(currentProj.headConfirmedBy)} ({currentProj.headConfirmedAt ? new Date(currentProj.headConfirmedAt).toLocaleString() : ''})
                                </div>
                                {currentProj.headComment && (
                                  <div style={{ marginTop: '4px', color: '#334155' }}>
                                    확정 의견: {currentProj.headComment}
                                  </div>
                                )}
                              </div>
                            ) : isAllAuditConfirmed ? (
                              <div style={{ color: '#0284c7' }}>
                                모든 지적사항(CAP)의 감사 검증이 완료되었습니다. 아래 버튼을 눌러 최종 확정(CONFIRM)을 진행해 주십시오.
                              </div>
                            ) : (
                              <div style={{ color: '#dc2626' }}>
                                프로젝트 내 전체 {totalCapsCount}건 중 <b>{totalCapsCount - auditConfirmedCapsCount}건</b>이 아직 감사 검증완료되지 않아 CONFIRM을 진행할 수 없습니다.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 최종 확정 버튼 (모든 발견사항 조치완료 시에만 활성화) */}
                        <div>
                          {(isHead || user?.role === 'SYSTEM_ADMIN') && !currentProj.headConfirmedBy && (
                            <button
                              onClick={() => handleHeadConfirmProject(currentProj.projectId)}
                              disabled={!isAllAuditConfirmed}
                              style={{
                                width: '100%',
                                padding: '10px 16px',
                                backgroundColor: isAllAuditConfirmed ? '#0077C8' : '#cbd5e1',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: isAllAuditConfirmed ? 'pointer' : 'not-allowed',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: isAllAuditConfirmed ? '0 2px 6px rgba(0,119,200,0.3)' : 'none'
                              }}
                            >
                              {isAllAuditConfirmed ? '최종 확정 (CONFIRM 완료)' : '최종 확정 불가 (미완료 CAP 존재)'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 우측: [요구사항 5] 감사팀 조회 및 완료(Completion) 영역 */}
                      <div style={{ padding: '16px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h4 style={{ margin: 0, fontSize: '14px', color: '#1e293b' }}>
                              [2단계] 감사팀 최종 승인 및 완료 (Completion)
                            </h4>
                            {currentProj.projectState === 'FREEZE' ? (
                              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#047857', backgroundColor: '#d1fae5', padding: '2px 8px', borderRadius: '4px' }}>
                                완료
                              </span>
                            ) : (currentProj.headConfirmedBy || user?.role === 'AUDIT_LEADER' || user?.role === 'SYSTEM_ADMIN') ? (
                              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#059669', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '4px' }}>
                                완료 가능
                              </span>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#94a3b8', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                                최종 확정 대기
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.6', marginBottom: '12px' }}>
                            {currentProj.projectState === 'FREEZE' ? (
                              <div>
                                <div style={{ color: '#047857', fontWeight: 'bold' }}>
                                  승인 및 완료 처리 ({getAssigneeName(currentProj.auditLeaderApprovedBy) || '감사팀'} / {currentProj.auditLeaderApprovedAt ? new Date(currentProj.auditLeaderApprovedAt).toLocaleString() : ''})
                                </div>
                                {currentProj.auditLeaderComment && (
                                  <div style={{ marginTop: '4px', color: '#334155' }}>
                                    감사팀 의견: {currentProj.auditLeaderComment}
                                  </div>
                                )}
                              </div>
                            ) : currentProj.headConfirmedBy ? (
                              <div style={{ color: '#059669' }}>
                                최종 확정(CONFIRM)이 완료되었습니다. 감사팀에서 내용을 최종 검토한 후 프로젝트를 완료(Completion)할 수 있습니다.
                              </div>
                            ) : (user?.role === 'AUDIT_LEADER' || user?.role === 'SYSTEM_ADMIN') ? (
                              <div style={{ color: '#059669' }}>
                                감사 책임자 권한으로 프로젝트를 즉시 최종 승인 및 완료(Completion)할 수 있습니다.
                              </div>
                            ) : (
                              <div style={{ color: '#64748b' }}>
                                ※ 최종 확정(CONFIRM)이 완료된 건에 한하여 감사팀이 최종 승인 및 완료(Completion)를 실행할 수 있습니다.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 감사팀 완료(Completion) 버튼 */}
                        <div>
                          {(isAuditTeam || user?.role === 'SYSTEM_ADMIN') && currentProj.projectState !== 'FREEZE' && (
                            <button
                              onClick={() => handleLeaderConfirmFreezeProject(currentProj.projectId)}
                              disabled={!currentProj.headConfirmedBy && user?.role !== 'AUDIT_LEADER' && user?.role !== 'SYSTEM_ADMIN'}
                              style={{
                                width: '100%',
                                padding: '10px 16px',
                                backgroundColor: (currentProj.headConfirmedBy || user?.role === 'AUDIT_LEADER' || user?.role === 'SYSTEM_ADMIN') ? '#059669' : '#cbd5e1',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: (currentProj.headConfirmedBy || user?.role === 'AUDIT_LEADER' || user?.role === 'SYSTEM_ADMIN') ? 'pointer' : 'not-allowed',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: (currentProj.headConfirmedBy || user?.role === 'AUDIT_LEADER' || user?.role === 'SYSTEM_ADMIN') ? '0 2px 6px rgba(5,150,105,0.3)' : 'none'
                              }}
                            >
                              {(currentProj.headConfirmedBy || user?.role === 'AUDIT_LEADER' || user?.role === 'SYSTEM_ADMIN') ? '감사팀 최종 승인 및 완료 (Completion 실행)' : '감사팀 완료 불가 (최종 미확정)'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. [요구사항 2] 해당 프로젝트 선택 시 각각의 발견사항(CAP)을 선택할 수 있는 서브 선택 그리드 */}
                {currentProj && (
                  <div style={styles.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ margin: 0, fontSize: '15px', color: '#1e293b' }}>
                        해당 프로젝트 등록 발견사항(CAP) 서브 선택 그리드 ({currentProjCaps.length}건)
                      </h4>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        ※ 발견사항을 클릭하면 하단에서 상세 지적내용, 법인 조치내역, 증빙 파일 다운로드 및 이력을 검증할 수 있습니다.
                      </span>
                    </div>

                    {currentProjCaps.length === 0 ? (
                      <div style={styles.noDataBox}>해당 프로젝트에 등록된 발견사항(CAP)이 없습니다.</div>
                    ) : (
                      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                            <tr>
                              <th style={{ padding: '10px 12px', width: '50px', textAlign: 'center' }}>선택</th>
                              <th style={{ padding: '10px 12px', width: '50px', textAlign: 'center' }}>No.</th>
                              <th style={{ padding: '10px 12px', width: '90px' }}>분류</th>
                              <th style={{ padding: '10px 12px' }}>지적사항(CAP) 제목</th>
                              {/* [요구사항 2] 조치 담당자 / 부서 컬럼 (이름으로 표기) */}
                              <th style={{ padding: '10px 12px', width: '160px' }}>조치 담당자 / 부서</th>
                              <th style={{ padding: '10px 12px', width: '100px' }}>조치 기한</th>
                              <th style={{ padding: '10px 12px', width: '100px', textAlign: 'center' }}>피감사 조치상태</th>
                              <th style={{ padding: '10px 12px', width: '120px', textAlign: 'center' }}>감사 검증상태</th>
                              <th style={{ padding: '10px 12px', width: '80px', textAlign: 'center' }}>증빙파일</th>
                              <th style={{ padding: '10px 12px', width: '90px', textAlign: 'center' }}>검증 결과</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentProjCaps.map((c, idx) => {
                              const isCapSelected = currentFinding?.findingId === c.findingId;
                              const cStatus = c.actionPlanStatus || c.approvalStatus || 'DRAFT';
                              const cActionStatus = actionStatusCodes[c.findingId] || c.actionStatusCode || 'IN_PROGRESS';
                              const isCapDone = cStatus === 'AUDIT_CONFIRMED';
                              const capFiles = findingAttachments[c.findingId] || [];

                              return (
                                <tr
                                  key={c.findingId}
                                  onClick={() => handleSelectFinding(c.findingId)}
                                  style={{
                                    backgroundColor: isCapSelected ? '#eff6ff' : '#fff',
                                    borderBottom: '1px solid #e2e8f0',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.15s ease'
                                  }}
                                >
                                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                    <input
                                      type="radio"
                                      name="selectedFindingSubGrid"
                                      checked={isCapSelected}
                                      onChange={() => handleSelectFinding(c.findingId)}
                                      style={{ cursor: 'pointer' }}
                                    />
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 'bold', color: '#64748b' }}>
                                    #{idx + 1}
                                  </td>
                                  <td style={{ padding: '10px 12px' }}>
                                    <span style={{ ...styles.badgeCategory, fontSize: '11px' }}>
                                      {c.category}
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px 12px' }}>
                                    <strong style={{ color: isCapSelected ? '#0077C8' : '#1e293b', fontSize: '13px' }}>
                                      {c.title}
                                    </strong>
                                  </td>
                                  {/* [요구사항 2] 조치담당자 / 부서 (코드명이 아닌 사람 이름과 부서명으로 표기) */}
                                  <td style={{ padding: '10px 12px', fontSize: '12px', color: '#1e293b' }}>
                                    <span style={{ fontWeight: '500' }}>
                                      {getAssigneeWithDept(c.assignedUserId, c.assignedDeptName)}
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px 12px', fontSize: '12px', color: '#64748b' }}>
                                    {c.actionDeadline ? c.actionDeadline.substring(0, 10) : (c.expectedDeadline ? c.expectedDeadline.substring(0, 10) : '-')}
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                    {cActionStatus === 'COMPLETED' && (
                                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#16a34a', backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>개선완료</span>
                                    )}
                                    {cActionStatus === 'IN_PROGRESS' && (
                                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#d97706', backgroundColor: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>개선중</span>
                                    )}
                                    {cActionStatus === 'ACTION_IMPOSSIBLE' && (
                                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#dc2626', backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>개선불가</span>
                                    )}
                                    {cActionStatus === 'CONTINUOUS_MANAGEMENT' && (
                                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>지속관리</span>
                                    )}
                                    {cActionStatus === 'NOT_WRITTEN' && (
                                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>미작성</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                    {isCapDone ? (
                                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#15803d', backgroundColor: '#dcfce7', padding: '3px 8px', borderRadius: '4px' }}>
                                        감사 검증완료
                                      </span>
                                    ) : (
                                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#b45309', backgroundColor: '#fef3c7', padding: '3px 8px', borderRadius: '4px' }}>
                                        진행중 ({cStatus})
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '12px' }}>
                                    {capFiles.length > 0 ? (
                                      <span style={{ fontWeight: 'bold', color: '#0284c7' }}>{capFiles.length}개</span>
                                    ) : (
                                      <span style={{ color: '#cbd5e1' }}>-</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                    {isCapDone ? (
                                      <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 'bold' }}>완료</span>
                                    ) : (
                                      <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 'bold' }}>미완료</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. [요구사항 3] 발견사항 클릭 시 상세 내역 조회 패널 */}
                {currentFinding && (
                  <div style={{ ...styles.card, border: '1px solid #93c5fd', backgroundColor: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#2563eb', backgroundColor: '#eff6ff', padding: '4px 8px', borderRadius: '6px' }}>
                          상세 검증
                        </span>
                        <span style={styles.badgeCategory}>{currentFinding.category}</span>
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>
                          {currentFinding.title}
                        </h3>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* [요구사항 2] 담당자 및 담당부서 이름으로 명확히 표기 */}
                        <span style={{ fontSize: '12px', color: '#475569' }}>
                          조치담당자: <b style={{ color: '#1e293b' }}>{getAssigneeName(currentFinding.assignedUserId)}</b>
                        </span>
                        <span style={{ fontSize: '12px', color: '#475569' }}>
                          담당부서: <b style={{ color: '#1e293b' }}>{getDeptName(currentFinding.assignedUserId, currentFinding.assignedDeptName)}</b>
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          조치기한: <b>{currentFinding.actionDeadline ? currentFinding.actionDeadline.substring(0, 10) : '미설정'}</b>
                        </span>
                        {(currentFinding.actionPlanStatus || currentFinding.approvalStatus) === 'AUDIT_CONFIRMED' ? (
                          <span style={{ ...styles.badgeStatus, backgroundColor: '#dcfce7', color: '#15803d' }}>
                            감사 검증종료 (CONFIRM 완료)
                          </span>
                        ) : (
                          <span style={{ ...styles.badgeStatus, backgroundColor: '#fef3c7', color: '#b45309' }}>
                            검증 진행중 ({currentFinding.actionPlanStatus || currentFinding.approvalStatus})
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      {/* 지적 내용 원문 */}
                      <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <strong style={{ color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '14px' }}>
                          지적 내용 (Finding Details)
                        </strong>
                        <div
                          dangerouslySetInnerHTML={{ __html: currentFinding.findingText || '지적 내용이 없습니다.' }}
                          style={{ fontSize: '13px', color: '#1e293b', lineHeight: '1.6', maxHeight: '200px', overflowY: 'auto' }}
                        />
                      </div>

                      {/* 법인 조치계획 및 실행 결과 원문 */}
                      <div style={{ backgroundColor: '#f0fdf4', padding: '14px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <strong style={{ color: '#166534', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '14px' }}>
                          법인 조치 계획 및 실적 (Action Plan & Result)
                        </strong>
                        <div
                          dangerouslySetInnerHTML={{ __html: currentFinding.actionText || '<span style="color:#94a3b8;">등록된 조치 내역이 없습니다.</span>' }}
                          style={{ fontSize: '13px', color: '#14532d', lineHeight: '1.6', maxHeight: '200px', overflowY: 'auto' }}
                        />
                        {currentFinding.deptAdditionalContent && (
                          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #86efac', fontSize: '12px', color: '#166534' }}>
                            <b>[유관부서 추가의견]:</b> {currentFinding.deptAdditionalContent}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 첨부 증빙파일 검증 및 다운로드 영역 */}
                    <div style={{ marginBottom: '16px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <strong style={{ color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                          등록된 증빙자료 첨부파일 ({currentAttachments.length}건)
                        </strong>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          증빙 파일을 직접 다운로드하여 조치 사실을 육안 검증합니다.
                        </span>
                      </div>

                      {currentAttachments.length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', backgroundColor: '#fff', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                          등록된 첨부 증빙 파일이 없습니다.
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                          {currentAttachments.map(file => (
                            <div
                              key={file.fileId}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px 12px',
                                backgroundColor: '#fff',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                              }}
                            >
                              <div style={{ overflow: 'hidden', marginRight: '8px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={file.fileName}>
                                  {file.fileName}
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                  {file.fileSize ? `${Math.round(file.fileSize / 1024)} KB` : ''} | 등록자: {getAssigneeName(file.uploadedBy)} | {file.createdAt ? file.createdAt.substring(0, 10) : ''}
                                </div>
                              </div>
                              <button
                                onClick={() => handleDownloadFile(file.fileId, file.fileName)}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#0077C8',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  whiteSpace: 'nowrap',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                다운로드
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 조치 및 검토 이력 타임라인 */}
                    <div style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <strong style={{ color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontSize: '14px' }}>
                        조치 및 검토 이력 타임라인 ({currentHistories.length}건)
                      </strong>

                      {historyLoading ? (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>이력 로딩 중...</div>
                      ) : currentHistories.length === 0 ? (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>등록된 이력이 없습니다.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                          {currentHistories.map((h, hIdx) => {
                            const dateStr = h.actionAt || h.createdAt;
                            const formattedDate = dateStr ? new Date(dateStr).toLocaleString() : '-';
                            return (
                              <div
                                key={h.historyId || hIdx}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '8px 12px',
                                  backgroundColor: '#f8fafc',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  borderLeft: '3px solid #0077C8'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontWeight: 'bold', color: '#334155' }}>
                                    {h.actionType === 'CONFIRM_MEMBER' ? '법인담당자 제출' :
                                     h.actionType === 'CONFIRM_LEAD' ? '대표담당자 감사실 제출' :
                                     (h.actionType === 'AUDIT_CONFIRMED' || h.actionType === 'CONFIRM_AUDIT') ? '감사팀 검증종료' :
                                     h.actionType === 'AUDIT_FEEDBACK' ? '감사팀 보완요청' :
                                     h.actionType === 'SAVE_DRAFT' ? '조치계획 임시저장' :
                                     h.actionType === 'UPDATE_CAP' ? '지적사항 정보 수정' :
                                     h.actionType === 'HEAD_CONFIRM' ? '법인장 최종 확정' :
                                     h.actionType === 'FREEZE' ? '감사팀 완료 처리' :
                                     h.actionType || '이력'}
                                  </span>
                                  <span style={{ color: '#64748b' }}>
                                    작업자: <b>{getActorDisplayName(h.actorId)}</b>
                                  </span>
                                  {h.comments && (
                                    <span style={{ color: '#475569', fontStyle: 'italic' }}>
                                      "{h.comments}"
                                    </span>
                                  )}
                                </div>
                                <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                                  {formattedDate}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ================================================================= */}
          {/* 커스텀 화면 / 외부 링크 화면 탭 */}
          {/* ================================================================= */}
          {(() => {
            const standardCodes = [
              'PROJECT_REGISTER', 'ACTION_PLAN_INPUT', 'FINDING_MANAGEMENT',
              'REPORT_MONITORING', 'USER_MANAGEMENT', 'MENU_MANAGEMENT', 'ROLE_PERMISSION_MANAGEMENT',
              'HEAD_FINAL_APPROVAL'
            ];
            const isStandard = standardCodes.some(code => isMenuActive(code));
            if (!isStandard) {
              const currentCustomMenu = userMenus.find(m => isMenuActive(m));
              if (currentCustomMenu) {
                return <CustomScreenView menu={currentCustomMenu} />;
              }
            }
            return null;
          })()}
        </div>
      </main>

      {/* [모달 1] 결재 반려 및 재수정/재작성 사유 입력 모달 */}
      {rejectModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: rejectType === 'LEAD' ? '#dc2626' : '#c2410c' }}>
                {rejectType === 'LEAD' ? '대표담당자 재수정 요청 (반려)' : '감사실 재작성 요청 (보완)'}
              </h3>
              <button onClick={() => setRejectModalOpen(false)} style={styles.modalCloseBtn}>×</button>
            </div>
            <div style={styles.modalBody}>
              <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#4b5563' }}>
                대상 항목: <strong>{rejectTargetFinding?.title}</strong>
              </p>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#374151', display: 'block', marginBottom: '6px' }}>
                {rejectType === 'LEAD' ? '재수정 요청 사유' : '재작성(보완) 요청 사유'} (필수 입력) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                rows="4"
                placeholder={rejectType === 'LEAD' ? '담당자가 수정/보완해야 할 구체적인 재수정 요청 사유를 입력하세요...' : '감사실에서 요구하는 구체적인 보완/재작성 사유를 입력하세요...'}
                value={rejectReasonText}
                onChange={(e) => setRejectReasonText(e.target.value)}
                style={{ ...styles.textarea, width: '100%' }}
                autoFocus
              />
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setRejectModalOpen(false)} style={styles.cancelBtn}>
                취소
              </button>
              <button
                onClick={handleConfirmReject}
                style={{
                  ...styles.confirmRejectBtn,
                  backgroundColor: rejectType === 'LEAD' ? '#dc2626' : '#c2410c'
                }}
              >
                {rejectType === 'LEAD' ? '재수정 요청 확정' : '재작성 요청 확정'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* [모달 2] 감사팀 조치 검토 및 피드백 모달 */}
      {auditReviewModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: '#2563eb' }}>
                {auditReviewStatus === 'AUDIT_CONFIRMED' ? '감사 검토 확인 (승인)' : '감사 피드백 / 보완 요청'}
              </h3>
              <button onClick={() => setAuditReviewModalOpen(false)} style={styles.modalCloseBtn}>×</button>
            </div>
            <div style={styles.modalBody}>
              <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#4b5563' }}>
                지적사항: <strong>{auditTargetFinding?.title}</strong> ({auditTargetFinding?.project?.projectName})
              </p>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#374151', display: 'block', marginBottom: '4px' }}>
                  검토 결과 상태
                </label>
                <select
                  value={auditReviewStatus}
                  onChange={(e) => setAuditReviewStatus(e.target.value)}
                  style={styles.select}
                >
                  <option value="AUDIT_CONFIRMED">조치 확인 완료 (최종 승인)</option>
                  <option value="AUDIT_FEEDBACK">보완 요청 / 피드백</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#374151', display: 'block', marginBottom: '4px' }}>
                  감사팀 검토 의견 및 피드백 코멘트
                </label>
                <textarea
                  rows="4"
                  placeholder="조치 결과에 대한 종합 의견 또는 보완 필요 사항을 기술하세요..."
                  value={auditReviewComment}
                  onChange={(e) => setAuditReviewComment(e.target.value)}
                  style={{ ...styles.textarea, width: '100%' }}
                />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setAuditReviewModalOpen(false)} style={styles.cancelBtn}>
                취소
              </button>
              <button onClick={handleConfirmAuditReview} style={styles.primaryBtn}>
                검토 결과 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* [모달 3] 4번 메뉴: 감사 담당자 프로젝트 조치내용 확인 모달 */}
      {auditorReviewProjModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: '#4f46e5' }}>
                {user?.role === 'AUDIT_LEADER' ? '감사 책임자 조치내용 확인' : '감사 담당자 조치내용 확인'}
              </h3>
              <button onClick={() => setAuditorReviewProjModalOpen(false)} style={styles.modalCloseBtn}>×</button>
            </div>
            <div style={styles.modalBody}>
              <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#4b5563' }}>
                대상 프로젝트: <strong>{targetAuditProject?.projectName}</strong> ({targetAuditProject?.corpId})
              </p>
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 12px', borderRadius: '6px', marginBottom: '14px', fontSize: '12px', color: '#15803d' }}>
                ※ 법인장 결재가 완료된 지적사항 및 조치계획 내용을 검토하였음을 확인합니다.
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#374151', display: 'block', marginBottom: '4px' }}>
                  {user?.role === 'AUDIT_LEADER' ? '감사 책임자 검토 의견 (선택 사항)' : '감사 담당자 검토 의견 (선택 사항)'}
                </label>
                <textarea
                  rows="3"
                  placeholder="조치 내용에 대한 담당자 검토 소견을 입력하세요..."
                  value={auditProjCommentInput}
                  onChange={(e) => setAuditProjCommentInput(e.target.value)}
                  style={{ ...styles.textarea, width: '100%' }}
                />
              </div>
            </div>
            <div style={{ ...styles.modalFooter, display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button onClick={() => setAuditorReviewProjModalOpen(false)} style={styles.cancelBtn}>
                취소
              </button>
              <button onClick={handleConfirmAuditorProjReview} style={{ ...styles.primaryBtn, backgroundColor: '#4f46e5' }}>
                {user?.role === 'AUDIT_LEADER' ? '내용 확인만 완료' : '확인 완료'}
              </button>
              {(user?.role === 'AUDIT_LEADER' || user?.role === 'SYSTEM_ADMIN') && (
                <button
                  onClick={handleConfirmAuditorProjReviewAndFreeze}
                  style={{
                    ...styles.approveActionBtn,
                    backgroundColor: '#059669',
                    boxShadow: '0 2px 6px rgba(5, 150, 105, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="조치내용 확인과 동시에 프로젝트를 최종 확정하고 완료(Completion)합니다."
                >
                  확인 및 즉시 최종 완료 (Completion)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* [모달 4] 4번 메뉴: 감사 책임자 프로젝트 최종 승인 및 완료(Completion) 모달 */}
      {leaderApproveProjModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: '#059669' }}>
                감사 책임자 최종 확정 및 완료 (Completion)
              </h3>
              <button onClick={() => setLeaderApproveProjModalOpen(false)} style={styles.modalCloseBtn}>×</button>
            </div>
            <div style={styles.modalBody}>
              <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#4b5563' }}>
                대상 프로젝트: <strong>{targetAuditProject?.projectName}</strong> ({targetAuditProject?.corpId})
              </p>
              {targetAuditProject?.auditorReviewedBy && (
                <div style={{ backgroundColor: '#e0e7ff', border: '1px solid #c7d2fe', padding: '10px 12px', borderRadius: '6px', marginBottom: '12px', fontSize: '12px', color: '#3730a3' }}>
                  감사 담당자 확인: <b>{targetAuditProject.auditorReviewedBy}</b> ({targetAuditProject.auditorReviewedAt ? new Date(targetAuditProject.auditorReviewedAt).toLocaleString() : ''})<br />
                  {targetAuditProject.auditorComment && `의견: "${targetAuditProject.auditorComment}"`}
                </div>
              )}
              <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '10px 12px', borderRadius: '6px', marginBottom: '14px', fontSize: '12px', color: '#065f46' }}>
                ※ 최종 확정 시 프로젝트가 <b>완료(Completion)</b> 처리되며, 법인 및 담당자의 추가 수정이 차단됩니다.
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#374151', display: 'block', marginBottom: '4px' }}>
                  감사 책임자 확정 의견 (선택 사항)
                </label>
                <textarea
                  rows="3"
                  placeholder="최종 확정 및 완료 의견을 입력하세요..."
                  value={auditProjCommentInput}
                  onChange={(e) => setAuditProjCommentInput(e.target.value)}
                  style={{ ...styles.textarea, width: '100%' }}
                />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setLeaderApproveProjModalOpen(false)} style={styles.cancelBtn}>
                취소
              </button>
              <button onClick={handleConfirmLeaderProjApprove} style={{ ...styles.approveActionBtn, backgroundColor: '#059669' }}>
                최종 확정 및 완료 (Completion) 실행
              </button>
            </div>
          </div>
        </div>
      )}

      {/* [모달 5] 4번 메뉴: 감사팀 프로젝트 보완요청 (반려) 모달 */}
      {auditRejectProjModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: '#dc2626' }}>감사 보완요청 (반려)</h3>
              <button onClick={() => setAuditRejectProjModalOpen(false)} style={styles.modalCloseBtn}>×</button>
            </div>
            <div style={styles.modalBody}>
              <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#4b5563' }}>
                대상 프로젝트: <strong>{targetAuditProject?.projectName}</strong> ({targetAuditProject?.corpId})
              </p>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#374151', display: 'block', marginBottom: '6px' }}>
                보완요청 사유 (필수 입력) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                rows="4"
                placeholder="법인 및 조치 담당자가 수정/보완해야 할 사유를 상세히 입력하세요..."
                value={auditProjRejectReasonInput}
                onChange={(e) => setAuditProjRejectReasonInput(e.target.value)}
                style={{ ...styles.textarea, width: '100%' }}
                autoFocus
              />
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setAuditRejectProjModalOpen(false)} style={styles.cancelBtn}>
                취소
              </button>
              <button onClick={handleConfirmAuditProjReject} style={styles.confirmRejectBtn}>
                보완요청 확정
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Premium Dashboard Styles (Sleek Modern Layout)
const styles = {
  appContainer: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    fontFamily: 'var(--saea-font-main)',
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  sidebar: {
    width: '270px',
    backgroundColor: '#0a1628', // Formal Corporate Dark Navy
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '24px 16px',
    boxShadow: '2px 0 8px rgba(0, 0, 0, 0.08)',
    borderRight: '1px solid #1e293b',
  },
  sidebarHeader: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '18px',
    paddingLeft: '4px',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: 'var(--saea-blue, #0077C8)',
  },
  subLogoText: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  navMenu: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    margin: '20px 0',
    flexGrow: 1,
    overflowY: 'auto',
  },
  navGroupContainer: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '16px',
  },
  navGroupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 8px 8px 4px',
    fontSize: '13.5px',
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: '-0.02em',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'all 0.15s ease',
    backgroundColor: 'transparent',
    borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
    marginBottom: '6px',
  },
  navGroupTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13.5px',
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: '-0.01em',
  },
  navGroupChevron: {
    fontSize: '10px',
    color: '#94a3b8',
    fontWeight: '600',
  },
  navSubMenuList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    marginLeft: '8px',
    paddingLeft: '12px',
    borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
    marginTop: '4px',
  },
  navItem: {
    padding: '8px 12px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: 'none',
    borderRadius: '4px',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '12.5px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    letterSpacing: '-0.2px',
    transition: 'all 0.15s ease',
  },
  activeNavItem: {
    padding: '8px 12px',
    backgroundColor: 'rgba(0, 119, 200, 0.2)',
    color: '#ffffff',
    border: 'none',
    borderLeft: '3px solid var(--saea-blue, #0077C8)',
    borderRadius: '0 4px 4px 0',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '12.5px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    letterSpacing: '-0.2px',
  },
  navItemText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  sidebarFooter: {
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    paddingTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  profileBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '13px',
  },
  profileUser: {
    color: '#fff',
    marginBottom: '4px',
  },
  profileInfo: {
    color: '#9ca3af',
  },
  logoutBtn: {
    padding: '6px 12px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    color: '#475569',
    transition: 'all 0.15s ease',
  },
  mainContent: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
  },
  contentHeader: {
    backgroundColor: '#ffffff',
    padding: '16px 28px',
    borderBottom: '1px solid #e2e8f0',
  },
  scrollableContent: {
    padding: '30px',
    overflowY: 'auto',
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '25px',
  },
  containerCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  cardSubtitle: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '5px',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  formLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#4b5563',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
  },
  select: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#fff',
  },
  textarea: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    height: '60px',
    resize: 'none',
  },
  textareaBig: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    height: '100px',
    resize: 'vertical',
  },
  dateRow: {
    display: 'flex',
    gap: '15px',
  },
  primaryBtn: {
    padding: '12px',
    backgroundColor: 'var(--saea-blue, #0077C8)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    boxShadow: '0 2px 4px rgba(0, 119, 200, 0.25)',
  },
  errorBanner: {
    padding: '12px 20px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderLeft: '4px solid #ef4444',
    borderRadius: '4px',
    margin: '0 30px',
  },
  successBanner: {
    padding: '12px 20px',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    borderLeft: '4px solid #10b981',
    borderRadius: '4px',
    margin: '0 30px',
  },
  noDataBox: {
    textAlign: 'center',
    padding: '40px',
    backgroundColor: '#fff',
    color: '#9ca3af',
    borderRadius: '8px',
    border: '1px dashed #d1d5db',
  },
  findingCard: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    borderLeft: '4px solid var(--saea-blue, #0077C8)',
  },
  findingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #f3f4f6',
    paddingBottom: '12px',
    marginBottom: '15px',
  },
  badgeCategory: {
    padding: '3px 8px',
    backgroundColor: '#e1effa',
    color: 'var(--saea-blue, #0077C8)',
    border: '1px solid #b9daf2',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  badgeOpen: {
    padding: '4px 8px',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  badgeFreeze: {
    padding: '4px 8px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px',
    fontSize: '13px',
    color: '#4b5563',
    marginBottom: '15px',
  },
  descBox: {
    backgroundColor: '#f9fafb',
    padding: '15px',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#374151',
    marginBottom: '15px',
    lineHeight: '1.6',
  },
  actionContainer: {
    borderTop: '1px solid #f3f4f6',
    paddingTop: '15px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  currentAction: {
    fontSize: '13px',
    color: '#1f2937',
  },
  actionForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  saveBtn: {
    alignSelf: 'flex-end',
    padding: '8px 16px',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  freezeNotice: {
    padding: '10px',
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    borderRadius: '6px',
    fontSize: '13px',
    textAlign: 'center',
    border: '1px solid #e5e7eb',
  },
  uploadContainer: {
    marginTop: '15px',
    borderTop: '1px dashed #e5e7eb',
    paddingTop: '15px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  uploadRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  fileInput: {
    fontSize: '13px',
  },
  uploadBtn: {
    padding: '6px 12px',
    backgroundColor: '#4b5563',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '15px',
  },
  th: {
    backgroundColor: '#f0f7fc',
    padding: '12px',
    textAlign: 'left',
    fontSize: '13px',
    color: '#1e293b',
    fontWeight: '700',
    borderBottom: '2px solid #b9daf2',
  },
  td: {
    padding: '15px 12px',
    fontSize: '13px',
    color: '#334155',
    borderBottom: '1px solid #f1f5f9',
  },
  tdCenter: {
    padding: '30px',
    textAlign: 'center',
    color: '#94a3b8',
  },
  dateBadge: {
    display: 'block',
    fontSize: '11px',
    color: '#64748b',
    marginBottom: '2px',
  },
  freezeBtn: {
    padding: '6px 12px',
    backgroundColor: '#ea580c',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  unfreezeBtn: {
    padding: '6px 12px',
    backgroundColor: '#0284c7',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  deactivateBtn: {
    padding: '4px 8px',
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  activateBtn: {
    padding: '4px 8px',
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  htmlContent: {
    marginTop: '5px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    lineHeight: '1.6',
    whiteSpace: 'normal',
    wordBreak: 'break-all',
  },
  topProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#f9fafb',
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid #e5e7eb',
  },
  topProfileBadge: {
    backgroundColor: 'var(--saea-blue, #0077C8)',
    color: 'white',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  topProfileName: {
    fontSize: '15px',
    color: '#1f2937',
  },
  badgeStatus: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'inline-block',
  },
  approvalTimelineBox: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    margin: '12px 0',
  },
  timelineStep: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  timelineCircle: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  timelineLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#475569',
  },
  timelineLine: {
    flex: 1,
    height: '2px',
    margin: '0 8px',
    marginBottom: '16px',
  },
  rejectNoticeBox: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fca5a5',
    color: '#991b1b',
    padding: '10px 14px',
    borderRadius: '6px',
    margin: '10px 0',
    fontSize: '13px',
  },
  actionButtonRow: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  approvalReqBtn: {
    padding: '8px 16px',
    backgroundColor: 'var(--saea-blue, #0077C8)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    boxShadow: '0 2px 4px rgba(0, 119, 200, 0.25)',
  },
  approveActionBtn: {
    padding: '8px 16px',
    backgroundColor: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  rejectActionBtn: {
    padding: '8px 14px',
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  approvalHistoryBox: {
    marginTop: '12px',
    backgroundColor: '#f8fafc',
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: '10px',
    width: '550px',
    maxWidth: '90vw',
    overflow: 'hidden',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    fontSize: '22px',
    cursor: 'pointer',
    color: '#9ca3af',
  },
  modalBody: {
    padding: '20px',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    padding: '14px 20px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  cancelBtn: {
    padding: '8px 16px',
    backgroundColor: '#f3f4f6',
    color: '#4b5563',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
  confirmRejectBtn: {
    padding: '8px 18px',
    backgroundColor: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  }
};

export default Dashboard;
