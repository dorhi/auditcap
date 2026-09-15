import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const ROLE_INFO = {
  SYSTEM_ADMIN: { label: '시스템 관리자', badgeColor: '#0077C8', desc: '시스템 및 권한 총괄' },
  AUDIT_LEADER: { label: '감사책임자', badgeColor: '#7c3aed', desc: '감사 총괄 및 검토 승인' },
  AUDITOR: { label: '감사담당자', badgeColor: '#0891b2', desc: '감사 지적 및 현장 감사' },
  EXEC: { label: '경영진', badgeColor: '#0284c7', desc: '본사 및 그룹 경영진' },
  CORP_HEAD: { label: '법인장', badgeColor: '#059669', desc: '각 해외/국내 법인장' },
  LEAD_REP: { label: '법인대표담당', badgeColor: '#d97706', desc: '법인/부서 대표 조치자' },
  MEMBER: { label: '법인담당', badgeColor: '#6b7280', desc: '법인 조치 담당자' },
  DEPT_MEMBER: { label: '유관부서', badgeColor: '#ec4899', desc: '지정 프로젝트 유관부서' },
};

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

const RolePermissionManagement = ({ onPermissionChange }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [roles, setRoles] = useState([]);
  const [menus, setMenus] = useState([]);
  // permissions state: { [role]: { [menuCode]: boolean } }
  const [permissions, setPermissions] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  const fetchMatrix = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get('/api/menus/permissions');
      const data = res.data;
      setRoles(data.roles || []);
      setMenus(data.menus || []);
      setPermissions(data.permissions || {});
      setIsDirty(false);
    } catch (err) {
      setError(err.response?.data?.message || '권한 매트릭스를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, []);

  // 메뉴 그룹핑 계산
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

  const handleToggle = (role, menuCode) => {
    setPermissions(prev => {
      const rolePerms = { ...(prev[role] || {}) };
      rolePerms[menuCode] = !rolePerms[menuCode];
      return {
        ...prev,
        [role]: rolePerms,
      };
    });
    setIsDirty(true);
  };

  const handleSelectAllForRole = (role, select) => {
    setPermissions(prev => {
      const rolePerms = { ...(prev[role] || {}) };
      menus.forEach(m => {
        rolePerms[m.menuCode] = select;
      });
      return {
        ...prev,
        [role]: rolePerms,
      };
    });
    setIsDirty(true);
  };

  const handleSelectAllForMenu = (menuCode, select) => {
    setPermissions(prev => {
      const newPerms = { ...prev };
      roles.forEach(role => {
        newPerms[role] = {
          ...(newPerms[role] || {}),
          [menuCode]: select,
        };
      });
      return newPerms;
    });
    setIsDirty(true);
  };

  const handleSelectAllForGroup = (groupItems, select) => {
    setPermissions(prev => {
      const newPerms = { ...prev };
      roles.forEach(role => {
        const rolePerms = { ...(newPerms[role] || {}) };
        groupItems.forEach(item => {
          rolePerms[item.menuCode] = select;
        });
        newPerms[role] = rolePerms;
      });
      return newPerms;
    });
    setIsDirty(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccessMsg('');

      const permissionItems = [];
      roles.forEach(role => {
        menus.forEach(menu => {
          const hasAccess = permissions[role]?.[menu.menuCode] ?? false;
          permissionItems.push({
            role: role,
            menuId: menu.id,
            hasAccess: hasAccess,
          });
        });
      });

      await axios.put('/api/menus/permissions', {
        permissions: permissionItems,
      });

      setSuccessMsg('역할별 화면 접근 권한이 성공적으로 저장되었습니다.');
      setIsDirty(false);
      if (onPermissionChange) onPermissionChange();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || '권한 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* 알림 메시지 */}
      {error && <div style={styles.errorBanner}>⚠️ {error}</div>}
      {successMsg && <div style={styles.successBanner}>✨ {successMsg}</div>}

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h3 style={styles.cardTitle}>역할(권한)별 화면 접근 관리</h3>
            <p style={styles.cardSubtitle}>
              각 사용자 역할(Role)별로 접근 가능한 시스템 화면(메뉴)을 매트릭스로 제어합니다. 체크된 화면만 해당 역할의 사용자에게 노출되고 접근이 허용됩니다.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {isDirty && (
              <span style={styles.dirtyBadge}>● 저장되지 않은 변경사항이 있습니다</span>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              style={{
                ...styles.saveBtn,
                opacity: (!isDirty || saving) ? 0.6 : 1,
                cursor: (!isDirty || saving) ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? '저장 중...' : '💾 권한 설정 저장'}
            </button>
          </div>
        </div>

        {/* 역할 안내 카드들 */}
        <div style={styles.roleSummaryGrid}>
          {roles.map(role => {
            const info = ROLE_INFO[role] || { label: role, badgeColor: '#4f46e5', desc: '' };
            return (
              <div key={role} style={styles.roleCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ ...styles.roleBadge, backgroundColor: info.badgeColor }}>
                    {info.label}
                  </span>
                  <span style={styles.roleCode}>{role}</span>
                </div>
                <span style={styles.roleDesc}>{info.desc}</span>
              </div>
            );
          })}
        </div>

        {loading ? (
          <div style={styles.loadingArea}>권한 매트릭스를 불러오는 중입니다...</div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: '220px', minWidth: '220px' }}>화면 / 메뉴</th>
                  <th style={{ ...styles.th, width: '100px', textAlign: 'center' }}>일괄 제어</th>
                  {roles.map(role => {
                    const info = ROLE_INFO[role] || { label: role, badgeColor: '#4f46e5' };
                    return (
                      <th key={role} style={{ ...styles.thRole, minWidth: '130px', textAlign: 'center' }}>
                        <div style={styles.roleHeaderContainer}>
                          <span style={{ ...styles.roleHeaderBadge, backgroundColor: info.badgeColor }}>
                            {info.label}
                          </span>
                          <span style={styles.roleHeaderCode}>{role}</span>
                          <div style={styles.columnBulkBtns}>
                            <button
                              type="button"
                              onClick={() => handleSelectAllForRole(role, true)}
                              style={styles.bulkBtn}
                              title="이 역할에 모든 화면 허용"
                            >
                              전체선택
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectAllForRole(role, false)}
                              style={styles.bulkBtn}
                              title="이 역할의 모든 화면 해제"
                            >
                              전체해제
                            </button>
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {menus.length === 0 ? (
                  <tr>
                    <td colSpan={2 + roles.length} style={styles.tdCenter}>
                      등록된 메뉴가 없습니다.
                    </td>
                  </tr>
                ) : (
                  groupedMenus.map(group => (
                    <React.Fragment key={group.groupName}>
                      {/* 그룹 헤더 행 */}
                      <tr style={styles.groupHeaderRow}>
                        <td colSpan={2 + roles.length} style={styles.groupHeaderTd}>
                          <div style={styles.groupHeaderContent}>
                            <span style={styles.groupTitleText}>{group.groupName}</span>
                            <span style={styles.groupCountBadge}>화면 {group.items.length}개</span>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => handleSelectAllForGroup(group.items, true)}
                                style={styles.groupBulkBtn}
                                title="이 그룹의 모든 화면을 모든 역할에 허용"
                              >
                                그룹 전체 허용
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSelectAllForGroup(group.items, false)}
                                style={styles.groupBulkBtn}
                                title="이 그룹의 모든 화면을 모든 역할에서 해제"
                              >
                                그룹 전체 해제
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* 그룹 내 개별 화면 행 */}
                      {group.items.map(menu => (
                        <tr key={menu.id} style={styles.tr}>
                          {/* 메뉴 정보 */}
                          <td style={styles.tdMenu}>
                            <div style={styles.menuCell}>
                              <div>
                                <div style={styles.menuName}>{menu.menuName}</div>
                                <span style={styles.menuCodeBadge}>{menu.menuCode}</span>
                                {!menu.enabled && (
                                  <span style={styles.disabledBadge}>비활성</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 행(메뉴) 일괄 제어 */}
                          <td style={{ ...styles.td, textAlign: 'center' }}>
                            <div style={styles.rowBulkBtns}>
                              <button
                                type="button"
                                onClick={() => handleSelectAllForMenu(menu.menuCode, true)}
                                style={styles.rowBulkBtn}
                                title="모든 역할에 권한 허용"
                              >
                                전체
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSelectAllForMenu(menu.menuCode, false)}
                                style={styles.rowBulkBtn}
                                title="모든 역할의 권한 해제"
                              >
                                해제
                              </button>
                            </div>
                          </td>

                          {/* 각 Role별 권한 체크박스 */}
                          {roles.map(role => {
                            const hasAccess = permissions[role]?.[menu.menuCode] ?? false;
                            return (
                              <td
                                key={role}
                                onClick={() => handleToggle(role, menu.menuCode)}
                                style={{
                                  ...styles.tdCheck,
                                  backgroundColor: hasAccess ? '#f0fdf4' : '#fff',
                                }}
                              >
                                <div style={styles.checkWrapper}>
                                  <input
                                    type="checkbox"
                                    checked={hasAccess}
                                    onChange={() => {}} // onClick td에서 처리
                                    style={styles.checkbox}
                                  />
                                  <span style={{
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    color: hasAccess ? '#166534' : '#9ca3af',
                                  }}>
                                    {hasAccess ? '접근 허용' : '접근 불가'}
                                  </span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 하단 푸터 저장 안내 */}
        <div style={styles.cardFooter}>
          <p style={styles.footerNotice}>
            💡 <b>팁:</b> 권한 설정을 변경한 후 우측 상단의 <b>[💾 권한 설정 저장]</b> 버튼을 눌러야 실제 시스템에 즉시 반영됩니다.
          </p>
        </div>
      </div>
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
  dirtyBadge: {
    fontSize: '12px',
    color: '#ea580c',
    fontWeight: '600',
  },
  saveBtn: {
    padding: '10px 20px',
    backgroundColor: '#059669',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    boxShadow: '0 1px 2px rgba(5, 150, 105, 0.2)',
  },
  roleSummaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    padding: '16px 24px',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  roleCard: {
    backgroundColor: '#ffffff',
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  roleBadge: {
    color: '#fff',
    fontSize: '11px',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  roleCode: {
    fontSize: '10px',
    color: '#64748b',
    fontFamily: 'monospace',
  },
  roleDesc: {
    fontSize: '11px',
    color: '#64748b',
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
    padding: '14px 16px',
    backgroundColor: '#f1f5f9',
    color: '#334155',
    fontSize: '12px',
    fontWeight: '700',
    borderBottom: '2px solid #cbd5e1',
  },
  thRole: {
    padding: '14px 12px',
    backgroundColor: '#f1f5f9',
    borderBottom: '2px solid #cbd5e1',
  },
  roleHeaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  roleHeaderBadge: {
    color: '#fff',
    fontSize: '11px',
    fontWeight: '700',
    padding: '3px 10px',
    borderRadius: '12px',
  },
  roleHeaderCode: {
    fontSize: '10px',
    color: '#64748b',
    fontFamily: 'monospace',
  },
  columnBulkBtns: {
    display: 'flex',
    gap: '4px',
    marginTop: '4px',
  },
  bulkBtn: {
    padding: '2px 6px',
    fontSize: '10px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '3px',
    cursor: 'pointer',
    color: '#475569',
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
  groupTitleText: {
    fontWeight: '700',
    fontSize: '13px',
    color: '#3730a3',
  },
  groupCountBadge: {
    fontSize: '11px',
    backgroundColor: '#ffffff',
    color: '#6366f1',
    padding: '2px 8px',
    borderRadius: '10px',
    border: '1px solid #c7d2fe',
  },
  groupBulkBtn: {
    padding: '3px 8px',
    fontSize: '11px',
    backgroundColor: '#ffffff',
    border: '1px solid #a5b4fc',
    color: '#4338ca',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  tr: {
    borderBottom: '1px solid #e2e8f0',
  },
  td: {
    padding: '12px 14px',
    fontSize: '13px',
    color: '#334155',
    verticalAlign: 'middle',
  },
  tdMenu: {
    padding: '12px 16px',
    verticalAlign: 'middle',
    borderRight: '1px solid #f1f5f9',
  },
  menuCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  menuIcon: {
    fontSize: '20px',
  },
  menuName: {
    fontWeight: '600',
    fontSize: '13px',
    color: '#1e293b',
  },
  menuCodeBadge: {
    display: 'inline-block',
    fontSize: '10px',
    color: '#64748b',
    fontFamily: 'monospace',
    backgroundColor: '#f1f5f9',
    padding: '1px 5px',
    borderRadius: '3px',
    marginTop: '2px',
  },
  disabledBadge: {
    display: 'inline-block',
    fontSize: '10px',
    color: '#ef4444',
    backgroundColor: '#fee2e2',
    padding: '1px 5px',
    borderRadius: '3px',
    marginLeft: '6px',
  },
  rowBulkBtns: {
    display: 'flex',
    justifyContent: 'center',
    gap: '4px',
  },
  rowBulkBtn: {
    padding: '2px 6px',
    fontSize: '10px',
    backgroundColor: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '3px',
    cursor: 'pointer',
    color: '#475569',
  },
  tdCheck: {
    padding: '12px',
    textAlign: 'center',
    verticalAlign: 'middle',
    cursor: 'pointer',
    borderLeft: '1px solid #f1f5f9',
    transition: 'background-color 0.15s ease',
  },
  checkWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#16a34a',
  },
  tdCenter: {
    padding: '40px',
    textAlign: 'center',
    color: '#94a3b8',
  },
  cardFooter: {
    padding: '14px 24px',
    backgroundColor: '#f8fafc',
    borderTop: '1px solid #e2e8f0',
  },
  footerNotice: {
    margin: 0,
    fontSize: '12px',
    color: '#475569',
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

export default RolePermissionManagement;
