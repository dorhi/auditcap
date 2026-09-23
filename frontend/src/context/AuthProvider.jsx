import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { isTokenValid } from '../utils/authUtils';

// 1. Axios 요청 인터셉터: 모든 API 호출 시 localStorage의 최신 JWT 토큰을 자동으로 헤더에 첨부
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token') || localStorage.getItem('temp_token');
  
  // 로그인/회원가입 등 퍼블릭 요청이 아닌데 토큰이 만료된 경우 사전 차단
  const isPublicUrl = config.url && (config.url.includes('/api/auth/login') || config.url.includes('/api/auth/signup') || config.url.includes('/api/manual/'));
  if (token && !isPublicUrl && !isTokenValid(token)) {
    console.warn('[세션 가드] API 요청 전 토큰 만료 감지됨. 세션을 초기화합니다.');
    localStorage.clear();
    delete axios.defaults.headers.common['Authorization'];
    if (window.location.pathname !== '/login') {
      alert('세션이 만료되었습니다. 다시 로그인해 주세요.');
      window.location.href = '/login';
    }
    return Promise.reject(new Error('세션이 만료되었습니다.'));
  }

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// 2. Axios 응답 인터셉터: 서버에서 401(인증 실패/세션 만료) 또는 403(권한 없음) 수신 시 즉시 로그인으로 이동
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;
    const url = error.config ? error.config.url : '';
    const isPublicUrl = url && (url.includes('/api/auth/login') || url.includes('/api/auth/signup'));

    if ((status === 401 || status === 403) && !isPublicUrl) {
      console.warn('[세션 가드] 세션이 만료되었거나 접근 권한이 없습니다. 로그인 화면으로 이동합니다.');
      localStorage.clear();
      delete axios.defaults.headers.common['Authorization'];
      if (window.location.pathname !== '/login') {
        alert('세션이 만료되었거나 로그인 정보가 유효하지 않습니다. 로그인 화면으로 이동합니다.');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const initialToken = localStorage.getItem('access_token');
  const validInitialToken = isTokenValid(initialToken) ? initialToken : null;
  if (initialToken && !validInitialToken) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_info');
  }

  const [user, setUser] = useState(null);
  const [tempToken, setTempToken] = useState(localStorage.getItem('temp_token') || null);
  const [accessToken, setAccessToken] = useState(validInitialToken);
  const [loading, setLoading] = useState(true);

  // Axios 기본 인스턴스에 토큰 자동 적용 설정
  useEffect(() => {
    if (accessToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      // 토큰에서 사용자 정보 복원 (예시를 위해 단순 세션 스토리지 활용하거나 디코딩 적용)
      const storedUser = localStorage.getItem('user_info');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } else if (tempToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${tempToken}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
    }
    setLoading(false);
  }, [accessToken, tempToken]);

  // 1차 로그인 (사번, 비밀번호 검증 -> OTP 우회로 바로 최종 로그인 처리)
  const login = async (username, password) => {
    try {
      const response = await axios.post('/api/auth/login', { username, password });
      const { accessToken: finalToken, username: returnedUser, role, corpId, name, deptName } = response.data;
      
      const userInfo = { username: returnedUser, role, corpId, name, deptName };
      localStorage.setItem('access_token', finalToken);
      localStorage.setItem('user_info', JSON.stringify(userInfo));
      
      setAccessToken(finalToken);
      setUser(userInfo);
      
      return { success: true, mfaRequired: false };
    } catch (error) {
      const errMsg = error.response?.data?.message || '로그인에 실패했습니다.';
      return { success: false, message: errMsg };
    }
  };

  // 자체 회원가입 신청
  const signup = async (signupData) => {
    try {
      const response = await axios.post('/api/auth/signup', signupData);
      return { success: true, message: response.data.message };
    } catch (error) {
      const errMsg = error.response?.data?.message || '회원가입 신청에 실패했습니다.';
      return { success: false, message: errMsg };
    }
  };

  // 2차 MFA OTP 검증
  const verifyMfa = async (otpCode) => {
    try {
      const response = await axios.post('/api/auth/mfa/verify', { code: parseInt(otpCode, 10) });
      const { accessToken: finalToken, username, role, corpId, name, deptName } = response.data;

      // 임시 토큰 폐기 및 최종 토큰 셋팅
      localStorage.removeItem('temp_token');
      setTempToken(null);

      const userInfo = { username, role, corpId, name, deptName };
      localStorage.setItem('access_token', finalToken);
      localStorage.setItem('user_info', JSON.stringify(userInfo));

      setAccessToken(finalToken);
      setUser(userInfo);

      return { success: true };
    } catch (error) {
      const errMsg = error.response?.data?.message || 'OTP 인증에 실패했습니다.';
      return { success: false, message: errMsg };
    }
  };

  // MFA 2차 인증용 QR 코드 가져오기
  const getMfaSetup = async () => {
    try {
      const response = await axios.get('/api/auth/mfa/setup');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'MFA 설정 정보를 가져오지 못했습니다.' };
    }
  };

  // 세션 유효성 강제 확인 함수 (유효하지 않으면 즉시 로그인으로 이동)
  const checkSession = (showAlert = true) => {
    const token = localStorage.getItem('access_token');
    if (!token || !isTokenValid(token)) {
      logout(showAlert);
      return false;
    }
    return true;
  };

  // 브라우저 복귀 시(focus) 및 주기적으로 세션 유효성 검사 (10초 주기)
  useEffect(() => {
    const verifyActiveSession = () => {
      const currentToken = localStorage.getItem('access_token');
      // 로그인 화면이 아닌데 토큰이 없거나 만료되었으면 즉시 로그아웃 리다이렉트
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        if (!currentToken || !isTokenValid(currentToken)) {
          console.warn('[세션 가드] 활성 세션 없음 또는 만료 감지');
          logout(true);
        }
      }
    };

    // 10초마다 주기적 검증
    const intervalId = setInterval(verifyActiveSession, 10000);

    // 창 활성화 시 즉시 검증
    window.addEventListener('focus', verifyActiveSession);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', verifyActiveSession);
    };
  }, []);

  const logout = (showAlert = false) => {
    localStorage.clear();
    delete axios.defaults.headers.common['Authorization'];
    setAccessToken(null);
    setTempToken(null);
    setUser(null);

    if (window.location.pathname !== '/login') {
      if (showAlert) {
        alert('세션이 만료되었거나 존재하지 않습니다. 로그인 화면으로 이동합니다.');
      }
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, tempToken, accessToken, loading, login, signup, verifyMfa, getMfaSetup, logout, checkSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

