/**
 * 클라이언트 측 JWT 토큰 유효성 및 세션 상태 검증 유틸리티
 */

// JWT 토큰 형식 및 만료 여부 확인
export const isTokenValid = (token) => {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  try {
    // UTF-8 디코딩 처리
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);

    if (!payload.exp) {
      // exp 클레임이 없는 경우 형식만 맞으면 유효
      return true;
    }

    // 만료 시간 (ms) - 네트워크 지연 대비 5초 버퍼 적용
    const expirationTimeMs = payload.exp * 1000 - 5000;
    return Date.now() < expirationTimeMs;
  } catch (error) {
    console.error('JWT 토큰 파싱 실패:', error);
    return false;
  }
};

// 세션이 없거나 만료된 경우 강제로 로그인 화면으로 리다이렉트
export const checkSessionOrRedirect = (alertMessage = '세션이 만료되었거나 로그인 정보가 없습니다. 로그인 화면으로 이동합니다.') => {
  const token = localStorage.getItem('access_token');
  if (!token || !isTokenValid(token)) {
    console.warn('[세션 가드] 유효한 세션이 없습니다. 로그인 화면으로 이동합니다.');
    localStorage.clear();
    
    // 현재 로그인 화면이 아닐 때만 리다이렉트 및 알림
    if (window.location.pathname !== '/login') {
      if (alertMessage) {
        alert(alertMessage);
      }
      window.location.href = '/login';
    }
    return false;
  }
  return true;
};
