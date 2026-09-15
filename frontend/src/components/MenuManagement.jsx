import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const ICON_PRESETS = [
  '📊', '✏️', '🔍', '📋', '👤', '🖥️', '🔐', '📁', '📈', '💡',
  '⚙️', '📑', '🌐', '📢', '🏷️', '📦', '🎯', '🚀', '⭐', '🛠️'
];

const DEFAULT_ICONS = {
  PROJECT_REGISTER: '📊',
  ACTION_PLAN_INPUT: '✏️',
  FINDING_MANAGEMENT: '🔍',
  REPORT_MONITORING: '📋',
  USER_MANAGEMENT: '👤',
  MENU_MANAGEMENT: '🖥️',
  ROLE_PERMISSION_MANAGEMENT: '🔐',
};

const getMenuIcon = (menu) => {
  if (!menu) return '📄';
  if (menu.icon && !menu.icon.includes('?') && menu.icon.trim()) {
    return menu.icon;
  }
  return DEFAULT_ICONS[menu.menuCode] || '📄';
};

const MenuManagement = ({ onMenuChange }) => {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL');

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('CREATE'); // 'CREATE' or 'EDIT'
  const [currentMenuId, setCurrentMenuId] = useState(null);

  // 폼 입력 상태
  const [formData, setFormData] = useState({
    menuCode: '',
    menuName: '',
    groupName: '감사 업무 관리',
    groupOrder: 1,
    menuPath: '',
    icon: '',
    sortOrder: 1,
    description: '',
    screenType: 'INTERNAL', // 'INTERNAL', 'CUSTOM_HTML', 'EXTERNAL_URL'
    customContent: '',
    enabled: true,
  });

  const fetchMenus = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get('/api/menus');
      setMenus(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || '메뉴 목록을 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  // 등록된 고유 그룹명 목록 추출
  const existingGroups = useMemo(() => {
    const set = new Set();
    menus.forEach(m => {
      if (m.groupName && m.groupName.trim()) {
        set.add(m.groupName.trim());
      }
    });
    if (set.size === 0) {
      set.add('감사 업무 관리');
      set.add('시스템 관리');
    }
    return Array.from(set);
  }, [menus]);

  // 그룹별로 정렬 및 묶음
  const groupedMenus = useMemo(() => {
    const groups = {};
    menus.forEach(m => {
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
  }, [menus]);

  const openCreateModal = () => {
    setModalMode('CREATE');
    setCurrentMenuId(null);
    const nextOrder = menus.length > 0 ? Math.max(...menus.map(m => m.sortOrder || 0)) + 1 : 1;
    setFormData({
      menuCode: '',
      menuName: '',
      groupName: existingGroups[0] || '감사 업무 관리',
      groupOrder: 1,
      menuPath: '',
      icon: '📄',
      sortOrder: nextOrder,
      description: '',
      screenType: 'CUSTOM_HTML',
      customContent: '<h3>새로운 화면</h3><p>여기에 화면 안내 및 콘텐츠를 입력하세요.</p>',
      enabled: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (menu) => {
    setModalMode('EDIT');
    setCurrentMenuId(menu.id);
    setFormData({
      menuCode: menu.menuCode || '',
      menuName: menu.menuName || '',
      groupName: menu.groupName || '감사 업무 관리',
      groupOrder: menu.groupOrder || 1,
      menuPath: menu.menuPath || '',
      icon: getMenuIcon(menu),
      sortOrder: menu.sortOrder || 1,
      description: menu.description || '',
      screenType: menu.screenType || 'INTERNAL',
      customContent: menu.customContent || '',
      enabled: menu.enabled ?? true,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    try {
      if (!formData.menuName.trim()) {
        alert('화면 / 메뉴명을 입력해 주세요.');
        return;
      }

      if (modalMode === 'CREATE') {
        await axios.post('/api/menus', formData);
        setSuccessMsg('새 화면(메뉴)이 성공적으로 등록되었습니다.');
      } else {
        await axios.put(`/api/menus/${currentMenuId}`, formData);
        setSuccessMsg(`[${formData.menuName}] 화면 정보가 성공적으로 수정되었습니다.`);
      }

      closeModal();
      await fetchMenus();
      if (onMenuChange) onMenuChange();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || '저장 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (menu) => {
    if (!window.confirm(`[${menu.menuName}] 화면을 삭제하시겠습니까?\n(해당 화면에 부여된 권한 정보도 함께 삭제됩니다)`)) {
      return;
    }

    try {
      setError('');
      await axios.delete(`/api/menus/${menu.id}`);
      setSuccessMsg(`[${menu.menuName}] 화면이 삭제되었습니다.`);
      await fetchMenus();
      if (onMenuChange) onMenuChange();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || '메뉴 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleToggleEnabled = async (menu) => {
    try {
      await axios.put(`/api/menus/${menu.id}`, {
        ...menu,
        enabled: !menu.enabled
      });
      await fetchMenus();
      if (onMenuChange) onMenuChange();
    } catch (err) {
      alert('상태 변경 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleMoveOrder = async (menu, direction) => {
    const currentIndex = menus.findIndex(m => m.id === menu.id);
    const targetIndex = direction === 'UP' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= menus.length) return;

    const targetMenu = menus[targetIndex];
    try {
      const tempOrder = menu.sortOrder;
      const tempGOrder = menu.groupOrder;
      await axios.put(`/api/menus/${menu.id}`, { ...menu, sortOrder: targetMenu.sortOrder, groupOrder: targetMenu.groupOrder });
      await axios.put(`/api/menus/${targetMenu.id}`, { ...targetMenu, sortOrder: tempOrder, groupOrder: tempGOrder });
      await fetchMenus();
      if (onMenuChange) onMenuChange();
    } catch (err) {
      alert('순서 변경 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div style={styles.container}>
      {/* 알림 메시지 */}
      {error && <div style={styles.errorBanner}>※ {error}</div>}
      {successMsg && <div style={styles.successBanner}>[안내] {successMsg}</div>}

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h3 style={styles.cardTitle}>시스템 화면 및 메뉴 그룹 관리</h3>
            <p style={styles.cardSubtitle}>
              메뉴를 그룹(대메뉴)별로 분류하고, 관리자가 각 화면의 이름, 소속 그룹, 표시 순서를 자유롭게 편집합니다.
            </p>
          </div>
          <button onClick={openCreateModal} style={styles.createBtn}>
            새 화면 / 메뉴 추가
          </button>
        </div>

        {/* 그룹 필터 탭 */}
        <div style={styles.filterBar}>
          <span style={styles.filterLabel}>그룹 필터:</span>
          <button
            type="button"
            onClick={() => setSelectedGroupFilter('ALL')}
            style={selectedGroupFilter === 'ALL' ? styles.filterBtnActive : styles.filterBtn}
          >
            전체 보기 ({menus.length})
          </button>
          {existingGroups.map(g => {
            const count = menus.filter(m => m.groupName === g).length;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGroupFilter(g)}
                style={selectedGroupFilter === g ? styles.filterBtnActive : styles.filterBtn}
              >
                {g} ({count})
              </button>
            );
          })}
        </div>

        {loading ? (
          <div style={styles.loadingArea}>메뉴 목록을 불러오는 중입니다...</div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: '70px', textAlign: 'center' }}>순서</th>
                  <th style={{ ...styles.th, width: '150px' }}>소속 그룹</th>
                  <th style={{ ...styles.th, width: '180px' }}>메뉴 코드</th>
                  <th style={{ ...styles.th, width: '240px' }}>화면 / 메뉴명 (클릭하여 수정)</th>
                  <th style={{ ...styles.th, width: '110px' }}>화면 유형</th>
                  <th style={{ ...styles.th, width: '130px' }}>경로 (URL)</th>
                  <th style={styles.th}>설명</th>
                  <th style={{ ...styles.th, width: '85px', textAlign: 'center' }}>사용 여부</th>
                  <th style={{ ...styles.th, width: '130px', textAlign: 'center' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {menus.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={styles.tdCenter}>등록된 메뉴가 없습니다.</td>
                  </tr>
                ) : (
                  groupedMenus
                    .filter(group => selectedGroupFilter === 'ALL' || group.groupName === selectedGroupFilter)
                    .map(group => (
                      <React.Fragment key={group.groupName}>
                        {/* 그룹 섹션 헤더 행 */}
                        <tr style={styles.groupHeaderRow}>
                          <td colSpan="9" style={styles.groupHeaderTd}>
                            <div style={styles.groupHeaderContent}>
                              <span style={styles.groupTitleText}>{group.groupName}</span>
                              <span style={styles.groupOrderBadge}>그룹 순서: {group.groupOrder}</span>
                              <span style={styles.groupCountBadge}>화면 {group.items.length}개</span>
                            </div>
                          </td>
                        </tr>

                        {/* 그룹 내 하위 화면 항목들 */}
                        {group.items.map((menu, idx) => (
                          <tr key={menu.id} style={styles.tr}>
                            {/* 순서 및 이동 버튼 */}
                            <td style={{ ...styles.td, textAlign: 'center' }}>
                              <div style={styles.orderContainer}>
                                <span style={styles.orderNumber}>{menu.sortOrder}</span>
                                <div style={styles.orderButtons}>
                                  <button
                                    type="button"
                                    onClick={() => handleMoveOrder(menu, 'UP')}
                                    style={styles.arrowBtn}
                                    title="위로 이동"
                                  >
                                    ▲
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMoveOrder(menu, 'DOWN')}
                                    style={styles.arrowBtn}
                                    title="아래로 이동"
                                  >
                                    ▼
                                  </button>
                                </div>
                              </div>
                            </td>

                            {/* 소속 그룹 */}
                            <td style={styles.td}>
                              <span style={styles.groupTag}>{menu.groupName || '기타 메뉴'}</span>
                            </td>

                            {/* 메뉴 코드 */}
                            <td style={styles.td}>
                              <span style={styles.codeBadge}>{menu.menuCode}</span>
                            </td>

                            {/* 메뉴명 (클릭 시 수정 모달 열림) */}
                            <td style={styles.td}>
                              <button
                                type="button"
                                onClick={() => openEditModal(menu)}
                                style={styles.menuNameBtn}
                                title="클릭하여 화면 이름 및 설정 수정"
                              >
                                {menu.menuName}
                              </button>
                            </td>

                            {/* 화면 유형 */}
                            <td style={styles.td}>
                              {menu.screenType === 'INTERNAL' && (
                                <span style={{ ...styles.typeBadge, backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                                  내장 기능
                                </span>
                              )}
                              {menu.screenType === 'CUSTOM_HTML' && (
                                <span style={{ ...styles.typeBadge, backgroundColor: '#f0fdf4', color: '#15803d' }}>
                                  커스텀
                                </span>
                              )}
                              {menu.screenType === 'EXTERNAL_URL' && (
                                <span style={{ ...styles.typeBadge, backgroundColor: '#fef3c7', color: '#b45309' }}>
                                  외부 링크
                                </span>
                              )}
                            </td>

                            {/* 경로 */}
                            <td style={{ ...styles.td, fontSize: '12px', color: '#6b7280' }}>
                              {menu.menuPath || '-'}
                            </td>

                            {/* 설명 */}
                            <td style={{ ...styles.td, fontSize: '12px', color: '#4b5563' }}>
                              {menu.description || '-'}
                            </td>

                            {/* 사용 여부 */}
                            <td style={{ ...styles.td, textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleToggleEnabled(menu)}
                                style={{
                                  ...styles.statusBadge,
                                  backgroundColor: menu.enabled ? '#dcfce7' : '#fee2e2',
                                  color: menu.enabled ? '#166534' : '#991b1b',
                                }}
                              >
                                {menu.enabled ? '● 사용' : '○ 미사용'}
                              </button>
                            </td>

                            {/* 관리 버튼 */}
                            <td style={{ ...styles.td, textAlign: 'center' }}>
                              <div style={styles.actionGroup}>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(menu)}
                                  style={styles.editBtn}
                                >
                                  수정
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(menu)}
                                  style={styles.deleteBtn}
                                >
                                  삭제
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 메뉴 등록 / 수정 모달 */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {modalMode === 'CREATE' ? '신규 화면 / 메뉴 등록' : '화면 정보 및 이름/순서 수정'}
              </h3>
              <button onClick={closeModal} style={styles.closeBtn}>×</button>
            </div>

            <form onSubmit={handleSubmit} style={styles.modalBody}>
              <div style={styles.formGrid}>
                {/* 메뉴 코드 */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    메뉴 식별 코드 <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === 'EDIT'}
                    placeholder="예: CUSTOM_AUDIT_GUIDE"
                    value={formData.menuCode}
                    onChange={(e) => handleFormChange('menuCode', e.target.value.toUpperCase())}
                    style={modalMode === 'EDIT' ? styles.inputDisabled : styles.input}
                  />
                  <span style={styles.hint}>
                    {modalMode === 'CREATE' ? '영문 대문자 및 언더바(_) 권장' : '메뉴 코드는 고유 식별자이므로 변경 불가'}
                  </span>
                </div>

                {/* 화면 이름 (수정 핵심) */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    화면 / 메뉴 이름 <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="예: 감사 업무 가이드라인"
                    value={formData.menuName}
                    onChange={(e) => handleFormChange('menuName', e.target.value)}
                    style={{ ...styles.input, fontWeight: '600', borderColor: '#4f46e5' }}
                  />
                  <span style={styles.hint}>사이드바 및 화면 상단에 표시될 화면 이름</span>
                </div>

                {/* 소속 메뉴 그룹 */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    소속 메뉴 그룹 <span style={styles.required}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select
                      value={formData.groupName}
                      onChange={(e) => handleFormChange('groupName', e.target.value)}
                      style={{ ...styles.select, flex: 1 }}
                    >
                      {existingGroups.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                      <option value="__NEW__">[직접 입력] 새 그룹명 입력...</option>
                    </select>
                  </div>
                  {formData.groupName === '__NEW__' || !existingGroups.includes(formData.groupName) ? (
                    <input
                      type="text"
                      placeholder="신규 그룹명 입력 (예: 경영 보고 관리)"
                      value={formData.groupName === '__NEW__' ? '' : formData.groupName}
                      onChange={(e) => handleFormChange('groupName', e.target.value)}
                      style={{ ...styles.input, marginTop: '6px' }}
                      autoFocus
                    />
                  ) : null}
                  <span style={styles.hint}>사이드바에서 메뉴를 묶어서 표시할 대분류 그룹</span>
                </div>

                {/* 그룹 순서 & 화면 순서 */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>표시 순서 (그룹 순서 / 화면 순서)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>그룹 순서:</span>
                      <input
                        type="number"
                        min="1"
                        value={formData.groupOrder}
                        onChange={(e) => handleFormChange('groupOrder', parseInt(e.target.value, 10) || 1)}
                        style={styles.input}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>화면 순서:</span>
                      <input
                        type="number"
                        min="1"
                        value={formData.sortOrder}
                        onChange={(e) => handleFormChange('sortOrder', parseInt(e.target.value, 10) || 1)}
                        style={styles.input}
                      />
                    </div>
                  </div>
                </div>

                {/* 화면 유형 */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>화면 유형</label>
                  <select
                    value={formData.screenType}
                    onChange={(e) => handleFormChange('screenType', e.target.value)}
                    style={styles.select}
                  >
                    <option value="INTERNAL">내장 기능 화면 (시스템 기본 탭 연동)</option>
                    <option value="CUSTOM_HTML">커스텀 화면 (HTML/서식 안내 페이지)</option>
                    <option value="EXTERNAL_URL">외부 웹 링크 (외부 URL 임베드/링크)</option>
                  </select>
                </div>

                {/* 경로 */}
                <div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
                  <label style={styles.label}>경로 (URL 또는 라우트)</label>
                  <input
                    type="text"
                    placeholder="예: /guidelines 또는 https://example.com"
                    value={formData.menuPath}
                    onChange={(e) => handleFormChange('menuPath', e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>

              {/* 화면 설명 */}
              <div style={{ ...styles.formGroup, marginTop: '12px' }}>
                <label style={styles.label}>화면 설명</label>
                <input
                  type="text"
                  placeholder="화면의 용도 및 간단한 설명을 입력하세요"
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  style={styles.input}
                />
              </div>

              {/* 커스텀 콘텐츠 또는 외부 URL (화면 유형에 따름) */}
              {formData.screenType !== 'INTERNAL' && (
                <div style={{ ...styles.formGroup, marginTop: '12px' }}>
                  <label style={styles.label}>
                    {formData.screenType === 'EXTERNAL_URL' ? '연결할 외부 URL' : '화면 상세 콘텐츠 (HTML/텍스트)'}
                  </label>
                  {formData.screenType === 'EXTERNAL_URL' ? (
                    <input
                      type="url"
                      placeholder="https://..."
                      value={formData.customContent}
                      onChange={(e) => handleFormChange('customContent', e.target.value)}
                      style={styles.input}
                    />
                  ) : (
                    <textarea
                      rows="8"
                      placeholder="HTML 태그 또는 서식 텍스트를 입력해 화면을 구성할 수 있습니다. (예: <h3>공지</h3><p>내용</p>)"
                      value={formData.customContent}
                      onChange={(e) => handleFormChange('customContent', e.target.value)}
                      style={styles.textarea}
                    />
                  )}
                </div>
              )}

              {/* 사용 여부 */}
              <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="enabledCheck"
                  checked={formData.enabled}
                  onChange={(e) => handleFormChange('enabled', e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="enabledCheck" style={{ fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
                  시스템 메뉴에 활성화(표시)합니다.
                </label>
              </div>

              {/* 모달 푸터 버튼 */}
              <div style={styles.modalFooter}>
                <button type="button" onClick={closeModal} style={styles.cancelBtn}>
                  취소
                </button>
                <button type="submit" style={styles.submitBtn}>
                  {modalMode === 'CREATE' ? '등록 완료' : '변경사항 저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #f3f4f6',
  },
  cardTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: '#111827',
  },
  cardSubtitle: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: '#6b7280',
  },
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    flexWrap: 'wrap',
  },
  filterLabel: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#475569',
  },
  filterBtn: {
    padding: '4px 10px',
    fontSize: '12px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '16px',
    cursor: 'pointer',
    color: '#475569',
  },
  filterBtnActive: {
    padding: '4px 10px',
    fontSize: '12px',
    backgroundColor: 'var(--saea-blue, #0077C8)',
    border: '1px solid var(--saea-blue, #0077C8)',
    borderRadius: '16px',
    cursor: 'pointer',
    color: '#ffffff',
    fontWeight: '600',
  },
  createBtn: {
    padding: '10px 18px',
    backgroundColor: 'var(--saea-blue, #0077C8)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 1px 2px rgba(79, 70, 229, 0.2)',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  th: {
    padding: '12px 14px',
    backgroundColor: '#f8fafc',
    color: '#475569',
    fontSize: '12px',
    fontWeight: '700',
    borderBottom: '1px solid #e2e8f0',
  },
  groupHeaderRow: {
    backgroundColor: '#eef2ff',
    borderTop: '2px solid #cbd5e1',
    borderBottom: '1px solid #c7d2fe',
  },
  groupHeaderTd: {
    padding: '8px 16px',
  },
  groupHeaderContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  groupIcon: {
    fontSize: '16px',
  },
  groupTitleText: {
    fontWeight: '700',
    fontSize: '13px',
    color: '#3730a3',
  },
  groupOrderBadge: {
    fontSize: '11px',
    backgroundColor: '#e0e7ff',
    color: '#4338ca',
    padding: '2px 8px',
    borderRadius: '10px',
    fontWeight: '600',
  },
  groupCountBadge: {
    fontSize: '11px',
    backgroundColor: '#ffffff',
    color: '#6366f1',
    padding: '2px 8px',
    borderRadius: '10px',
    border: '1px solid #c7d2fe',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '12px 14px',
    fontSize: '13px',
    color: '#334155',
    verticalAlign: 'middle',
  },
  tdCenter: {
    padding: '40px',
    textAlign: 'center',
    color: '#94a3b8',
  },
  orderContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  orderNumber: {
    fontWeight: '700',
    fontSize: '13px',
    width: '20px',
    textAlign: 'center',
  },
  orderButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  arrowBtn: {
    padding: '2px 4px',
    fontSize: '9px',
    backgroundColor: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: '3px',
    cursor: 'pointer',
    lineHeight: '1',
  },
  groupTag: {
    display: 'inline-block',
    fontSize: '11px',
    fontWeight: '600',
    color: '#4338ca',
    backgroundColor: '#eef2ff',
    padding: '3px 8px',
    borderRadius: '4px',
  },
  codeBadge: {
    display: 'inline-block',
    fontSize: '11px',
    fontWeight: '600',
    color: '#334155',
    backgroundColor: '#f1f5f9',
    padding: '2px 6px',
    borderRadius: '4px',
    fontFamily: 'monospace',
  },
  menuNameBtn: {
    background: 'none',
    border: 'none',
    padding: 0,
    fontWeight: '700',
    fontSize: '13px',
    color: '#1e40af',
    cursor: 'pointer',
    textAlign: 'left',
    textDecoration: 'underline',
  },
  typeBadge: {
    display: 'inline-block',
    fontSize: '11px',
    fontWeight: '600',
    padding: '3px 8px',
    borderRadius: '12px',
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  actionGroup: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  editBtn: {
    padding: '4px 10px',
    backgroundColor: '#e0e7ff',
    color: '#4338ca',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  deleteBtn: {
    padding: '4px 10px',
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  modalOverlay: {
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
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    width: '680px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  modalTitle: {
    margin: 0,
    fontSize: '17px',
    fontWeight: '700',
    color: '#111827',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#9ca3af',
  },
  modalBody: {
    padding: '24px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    padding: '8px 12px',
    fontSize: '13px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    outline: 'none',
  },
  inputDisabled: {
    padding: '8px 12px',
    fontSize: '13px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
  },
  select: {
    padding: '8px 12px',
    fontSize: '13px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    outline: 'none',
    backgroundColor: '#fff',
  },
  textarea: {
    padding: '10px 12px',
    fontSize: '13px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    outline: 'none',
    fontFamily: 'monospace',
    lineHeight: '1.5',
  },
  hint: {
    fontSize: '11px',
    color: '#6b7280',
  },
  iconPickerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  presetsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    maxWidth: '200px',
  },
  iconPresetBtn: {
    width: '28px',
    height: '28px',
    fontSize: '14px',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  cancelBtn: {
    padding: '8px 16px',
    backgroundColor: '#f3f4f6',
    color: '#4b5563',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '8px 20px',
    backgroundColor: 'var(--saea-blue, #0077C8)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  loadingArea: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    padding: '12px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
  },
  successBanner: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    padding: '12px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
  },
};

export default MenuManagement;
