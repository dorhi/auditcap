import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tempToken, setTempToken] = useState(localStorage.getItem('temp_token') || null);
  const [accessToken, setAccessToken] = useState(localStorage.getItem('access_token') || null);
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

  const logout = () => {
    localStorage.clear();
    setAccessToken(null);
    setTempToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, tempToken, accessToken, loading, login, signup, verifyMfa, getMfaSetup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
