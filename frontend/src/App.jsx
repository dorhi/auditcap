import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthProvider';
import { isTokenValid } from './utils/authUtils';
import Login from './components/Login';
import MfaVerify from './components/MfaVerify';
import Dashboard from './components/Dashboard';

// 1. 비로그인 사용자 전용 라우트 가드
const PublicRoute = ({ children }) => {
  const { accessToken, tempToken } = useAuth();
  
  if (accessToken && isTokenValid(accessToken)) {
    return <Navigate to="/dashboard" replace />;
  }
  if (tempToken && isTokenValid(tempToken)) {
    return <Navigate to="/mfa-verify" replace />;
  }
  return children;
};

// 2. 1차 로그인 완료 후 MFA OTP 대기 사용자용 라우트 가드
const MfaRoute = ({ children }) => {
  const { accessToken, tempToken } = useAuth();
  
  if (accessToken && isTokenValid(accessToken)) {
    return <Navigate to="/dashboard" replace />;
  }
  if (!tempToken || !isTokenValid(tempToken)) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// 3. 2차 MFA 인증 완료 사용자 전용 라우트 가드 (Protected)
// 세션이 없거나 만료되었으면 무조건 로그인 화면으로 이동
const ProtectedRoute = ({ children }) => {
  const { accessToken, tempToken, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>로딩 중...</div>;
  }
  
  if (!accessToken || !isTokenValid(accessToken)) {
    if (tempToken && isTokenValid(tempToken)) {
      return <Navigate to="/mfa-verify" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      
      {/* 2FA MFA OTP Pages */}
      <Route path="/mfa-verify" element={
        <MfaRoute>
          <MfaVerify />
        </MfaRoute>
      } />

      {/* Auth Protected Dashboard Pages */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />

      {/* Fallback Route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
