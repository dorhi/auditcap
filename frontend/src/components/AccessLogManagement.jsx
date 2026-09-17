import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AccessLogManagement = () => {
  // 필터 상태
  const [logType, setLogType] = useState('ALL'); // ALL, LOGIN, PAGE_ACCESS
  const [status, setStatus] = useState('ALL'); // ALL, SUCCESS, FAILED
  const [keyword, setKeyword] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // 데이터 목록 및 페이징
  const [logs, setLogs] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    todayLoginSuccess: 0,
    todayLoginFailed: 0,
    todayPageAccess: 0,
    weekLoginSuccess: 0,
    weekLoginFailed: 0,
  });

  // 통계 데이터 로드
  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/logs/stats');
      if (res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.warn('통계 로드 실패 (무시):', err);
    }
  };

  // 로그 목록 로드
  const fetchLogs = useCallback(async (targetPage = page) => {
    setLoading(true);
    try {
      const params = {
        logType,
        status,
        keyword: keyword.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page: targetPage,
        size,
      };
      const res = await axios.get('/api/logs', { params });
      const data = res.data;
      setLogs(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
      setPage(targetPage);
    } catch (err) {
      console.error('로그 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [logType, status, keyword, startDate, endDate, page, size]);

  useEffect(() => {
    fetchStats();
    fetchLogs(0);
  }, []);

  // 검색 버튼 클릭
  const handleSearch = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    fetchStats();
    fetchLogs(0);
  };

  // 빠른 기간 선택
  const handleQuickPeriod = (days) => {
    const end = new Date();
    const start = new Date();
    if (days > 0) {
      start.setDate(start.getDate() - days);
    }
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  // CSV 다운로드
  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (logType) params.append('logType', logType);
    if (status) params.append('status', status);
    if (keyword.trim()) params.append('keyword', keyword.trim());
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const downloadUrl = `/api/logs/export-csv?${params.toString()}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `시스템_접속_감사로그_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* 상단 제목 및 설명 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '20px', color: '#0f172a', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📋</span> 시스템 접속 및 사용 감사 로그
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            사용자 로그인 성공/실패 내역, 실패 원인, 메뉴별 화면 접속 이력을 실시간 모니터링하고 추적합니다.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => { fetchStats(); fetchLogs(0); }}
            style={{
              padding: '8px 14px',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🔄 새로고침
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            style={{
              padding: '8px 16px',
              backgroundColor: '#059669',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)'
            }}
          >
            📥 엑셀(CSV) 다운로드
          </button>
        </div>
      </div>

      {/* 실시간 요약 통계 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '600' }}>오늘 로그인 성공</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#059669' }}>
              {stats.todayLoginSuccess.toLocaleString()}
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>건</span>
          </div>
          <span style={{ fontSize: '11px', color: '#10b981' }}>정상 접근 승인</span>
        </div>

        <div style={{
          backgroundColor: stats.todayLoginFailed > 0 ? '#fef2f2' : '#ffffff',
          borderRadius: '10px',
          padding: '16px 20px',
          border: stats.todayLoginFailed > 0 ? '1.5px solid #f87171' : '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <span style={{ fontSize: '12.5px', color: stats.todayLoginFailed > 0 ? '#b91c1c' : '#64748b', fontWeight: '600' }}>
            오늘 로그인 실패
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '26px', fontWeight: 'bold', color: stats.todayLoginFailed > 0 ? '#dc2626' : '#64748b' }}>
              {stats.todayLoginFailed.toLocaleString()}
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>건</span>
          </div>
          <span style={{ fontSize: '11px', color: stats.todayLoginFailed > 0 ? '#ef4444' : '#94a3b8' }}>
            {stats.todayLoginFailed > 0 ? '⚠️ 실패 사유 확인 필요' : '보안 위반 없음'}
          </span>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '600' }}>오늘 화면(메뉴) 접속</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#0284c7' }}>
              {stats.todayPageAccess.toLocaleString()}
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>회</span>
          </div>
          <span style={{ fontSize: '11px', color: '#38bdf8' }}>실시간 업무 화면 활동</span>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '600' }}>최근 7일 로그인 총계</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#4f46e5' }}>
              {(stats.weekLoginSuccess + stats.weekLoginFailed).toLocaleString()}
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>건 (실패 {stats.weekLoginFailed}건)</span>
          </div>
          <span style={{ fontSize: '11px', color: '#818cf8' }}>누적 접속 통계</span>
        </div>
      </div>

      {/* 다중 필터 바 */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        padding: '18px 20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'flex-end' }}>
          {/* 로그 유형 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>로그 유형</label>
            <select
              value={logType}
              onChange={(e) => setLogType(e.target.value)}
              style={{
                padding: '7px 10px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '13px',
                backgroundColor: '#fff',
                minWidth: '130px'
              }}
            >
              <option value="ALL">전체 유형</option>
              <option value="LOGIN">로그인 이력 (LOGIN)</option>
              <option value="PAGE_ACCESS">화면 접속 (PAGE_ACCESS)</option>
            </select>
          </div>

          {/* 성공/실패 상태 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>처리 상태</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                padding: '7px 10px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '13px',
                backgroundColor: '#fff',
                minWidth: '120px'
              }}
            >
              <option value="ALL">전체 상태</option>
              <option value="SUCCESS">성공 (SUCCESS)</option>
              <option value="FAILED">실패 (FAILED)</option>
            </select>
          </div>

          {/* 기간 필터 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>발생 기간</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => handleQuickPeriod(0)}
                  style={{ fontSize: '11px', padding: '1px 6px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '3px', cursor: 'pointer' }}
                >
                  오늘
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPeriod(7)}
                  style={{ fontSize: '11px', padding: '1px 6px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '3px', cursor: 'pointer' }}
                >
                  7일
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPeriod(30)}
                  style={{ fontSize: '11px', padding: '1px 6px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '3px', cursor: 'pointer' }}
                >
                  30일
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12.5px' }}
              />
              <span style={{ color: '#94a3b8' }}>~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12.5px' }}
              />
            </div>
          </div>

          {/* 통합 검색어 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1', minWidth: '220px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>통합 검색어</label>
            <input
              type="text"
              placeholder="사번(ID), 성명, 소속법인, 부서, 화면명, 실패사유, IP 검색"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{
                padding: '7px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '13px',
                width: '100%'
              }}
            />
          </div>

          {/* 검색 실행 버튼 */}
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '7px 18px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '36px'
            }}
          >
            {loading ? '검색 중...' : '🔍 검색'}
          </button>
        </form>
      </div>

      {/* 로그 데이터 테이블 */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '12px 18px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8fafc'
        }}>
          <span style={{ fontSize: '13px', color: '#475569', fontWeight: 'bold' }}>
            검색 결과: 총 <strong style={{ color: '#2563eb' }}>{totalElements.toLocaleString()}</strong>건
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>페이지당</span>
            <select
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value));
                setPage(0);
              }}
              style={{ padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}
            >
              <option value={20}>20건</option>
              <option value={50}>50건</option>
              <option value={100}>100건</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#334155' }}>
              <tr>
                <th style={{ padding: '10px 12px', width: '60px', textAlign: 'center' }}>No.</th>
                <th style={{ padding: '10px 12px', width: '150px' }}>발생 일시</th>
                <th style={{ padding: '10px 12px', width: '90px', textAlign: 'center' }}>유형</th>
                <th style={{ padding: '10px 12px', width: '170px' }}>사용자 식별 (ID / 성명)</th>
                <th style={{ padding: '10px 12px', width: '140px' }}>소속 (법인 / 부서)</th>
                <th style={{ padding: '10px 12px', width: '90px', textAlign: 'center' }}>권한</th>
                <th style={{ padding: '10px 12px', width: '180px' }}>접속 화면 / 작업 내용</th>
                <th style={{ padding: '10px 12px', width: '80px', textAlign: 'center' }}>상태</th>
                <th style={{ padding: '10px 12px' }}>상세 사유 / 실패 원인</th>
                <th style={{ padding: '10px 12px', width: '130px' }}>접속 IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                    감사 로그를 불러오는 중입니다...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    조회된 감사 로그 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                logs.map((item, idx) => {
                  const isSuccess = item.status === 'SUCCESS';
                  const isLogin = item.logType === 'LOGIN';
                  const rowNum = totalElements - (page * size) - idx;

                  return (
                    <tr
                      key={item.logId || idx}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        backgroundColor: !isSuccess ? '#fff5f5' : (idx % 2 === 0 ? '#ffffff' : '#fcfcfc'),
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      {/* 번호 */}
                      <td style={{ padding: '9px 12px', textAlign: 'center', color: '#64748b', fontSize: '11.5px' }}>
                        {rowNum}
                      </td>

                      {/* 일시 */}
                      <td style={{ padding: '9px 12px', whiteSpace: 'nowrap', color: '#334155' }}>
                        {item.createdAt ? item.createdAt.replace('T', ' ').substring(0, 19) : '-'}
                      </td>

                      {/* 유형 */}
                      <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                        {isLogin ? (
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            border: '1px solid #bae6fd'
                          }}>
                            로그인
                          </span>
                        ) : (
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #e2e8f0'
                          }}>
                            화면접속
                          </span>
                        )}
                      </td>

                      {/* 사용자 식별 (ID / 성명) */}
                      <td style={{ padding: '9px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong style={{ color: '#0f172a' }}>{item.userName || item.username || '(미확인)'}</strong>
                          {item.username && (
                            <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                              ({item.username})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 소속 (법인 / 부서) */}
                      <td style={{ padding: '9px 12px', fontSize: '12px', color: '#475569' }}>
                        {item.corpId ? (
                          <span>
                            <b>{item.corpId}</b> {item.deptName ? `/ ${item.deptName}` : ''}
                          </span>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>-</span>
                        )}
                      </td>

                      {/* 권한 */}
                      <td style={{ padding: '9px 12px', textAlign: 'center', fontSize: '11.5px' }}>
                        {item.role ? (
                          <span style={{ padding: '2px 6px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#475569' }}>
                            {item.role}
                          </span>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>-</span>
                        )}
                      </td>

                      {/* 접속 화면 / 작업 내용 */}
                      <td style={{ padding: '9px 12px' }}>
                        <div style={{ fontWeight: '500', color: '#1e293b' }}>
                          {item.targetMenuName || item.actionDetails || '-'}
                        </div>
                        {item.targetMenuCode && (
                          <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                            [{item.targetMenuCode}]
                          </div>
                        )}
                      </td>

                      {/* 상태 */}
                      <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                        {isSuccess ? (
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            border: '1px solid #bbf7d0'
                          }}>
                            성공
                          </span>
                        ) : (
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #fecaca'
                          }}>
                            실패
                          </span>
                        )}
                      </td>

                      {/* 상세 사유 / 실패 원인 */}
                      <td style={{ padding: '9px 12px' }}>
                        {!isSuccess ? (
                          <div style={{ color: '#b91c1c', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>⚠️</span>
                            <span>{item.failureReason || '상세 실패 원인 미제공'}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#64748b' }}>
                            {item.actionDetails || '-'}
                          </span>
                        )}
                      </td>

                      {/* 접속 IP */}
                      <td style={{ padding: '9px 12px', fontSize: '12px', color: '#475569', fontFamily: 'monospace' }}>
                        {item.clientIp || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 하단 페이징 네비게이션 */}
        {totalPages > 1 && (
          <div style={{
            padding: '12px 18px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#f8fafc'
          }}>
            <button
              type="button"
              onClick={() => fetchLogs(0)}
              disabled={page === 0}
              style={{
                padding: '5px 10px',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                backgroundColor: '#fff',
                fontSize: '12px',
                cursor: page === 0 ? 'not-allowed' : 'pointer',
                color: page === 0 ? '#cbd5e1' : '#334155'
              }}
            >
              « 처음
            </button>
            <button
              type="button"
              onClick={() => fetchLogs(page - 1)}
              disabled={page === 0}
              style={{
                padding: '5px 10px',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                backgroundColor: '#fff',
                fontSize: '12px',
                cursor: page === 0 ? 'not-allowed' : 'pointer',
                color: page === 0 ? '#cbd5e1' : '#334155'
              }}
            >
              ‹ 이전
            </button>

            <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: 'bold', padding: '0 8px' }}>
              {page + 1} / {totalPages} 페이지
            </span>

            <button
              type="button"
              onClick={() => fetchLogs(page + 1)}
              disabled={page >= totalPages - 1}
              style={{
                padding: '5px 10px',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                backgroundColor: '#fff',
                fontSize: '12px',
                cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                color: page >= totalPages - 1 ? '#cbd5e1' : '#334155'
              }}
            >
              다음 ›
            </button>
            <button
              type="button"
              onClick={() => fetchLogs(totalPages - 1)}
              disabled={page >= totalPages - 1}
              style={{
                padding: '5px 10px',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                backgroundColor: '#fff',
                fontSize: '12px',
                cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                color: page >= totalPages - 1 ? '#cbd5e1' : '#334155'
              }}
            >
              마지막 »
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccessLogManagement;
