import React, { useState } from 'react';
import { useAuth } from '../context/AuthProvider';
import SaeALogo from './common/SaeALogo';

const Login = () => {
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await login(username, password);
      if (!res.success) {
        setError(res.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* 글로벌세아 브랜드 상단 액센트 바 (Pantone 3005 C) */}
      <div style={styles.brandAccentBar} />

      <div style={styles.card}>
        {/* 글로벌세아 공식 로고 (0.5X 보호공간 준수) */}
        <div style={styles.logoWrapper}>
          <SaeALogo 
            variant="blue" 
            height={42} 
            subtitleText="CAP Monitoring System" 
          />
        </div>

        <div style={styles.headerTextBox}>
          <h2 style={styles.title}>시스템 로그인</h2>
          <p style={styles.subtitle}>감사 지적사항 및 개선조치(CAP) 통합 관리 포털</p>
        </div>
        
        {error && (
          <div style={styles.error}>
            <span style={{ marginRight: '6px' }}>※</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>ID (아이디)</label>
            <input 
              type="text" 
              placeholder="사내 ID를 입력하세요"
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
              style={styles.input}
              autoComplete="username"
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>비밀번호</label>
            <input 
              type="password" 
              placeholder="비밀번호를 입력하세요"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={styles.input}
              autoComplete="current-password"
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            style={styles.button}
          >
            {isSubmitting ? '로그인 확인 중...' : '로그인'}
          </button>
        </form>

        <div style={styles.footerNote}>
          신규 계정 발급 및 권한 문의는 <strong>감사팀 및 시스템 관리자</strong>에게 연락해 주세요.
        </div>

        <div style={styles.copyright}>
          © GLOBAL SAE-A GROUP. All Rights Reserved.
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f0f4f8',
    backgroundImage: 'radial-gradient(circle at 50% 0%, #e1effa 0%, #f0f4f8 70%)',
    position: 'relative',
    padding: '20px',
  },
  brandAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '5px',
    backgroundColor: 'var(--saea-blue, #0077C8)',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    padding: '40px 36px 30px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 10px 25px -5px rgba(0, 119, 200, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e2e8f0',
  },
  logoWrapper: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '24px',
    padding: '6px 0',
  },
  headerTextBox: {
    textAlign: 'center',
    marginBottom: '24px',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '16px',
  },
  title: {
    margin: '0 0 6px 0',
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    margin: 0,
    fontSize: '13px',
    color: '#64748b',
    lineHeight: '1.4',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#334155',
  },
  input: {
    padding: '11px 14px',
    fontSize: '14px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  button: {
    padding: '13px',
    fontSize: '15px',
    fontWeight: '700',
    color: '#ffffff',
    backgroundColor: 'var(--saea-blue, #0077C8)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginTop: '6px',
    transition: 'background-color 0.15s ease',
    boxShadow: '0 2px 4px rgba(0, 119, 200, 0.25)',
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 14px',
    marginBottom: '16px',
    fontSize: '13px',
    color: '#991b1b',
    backgroundColor: '#fef2f2',
    borderRadius: '6px',
    border: '1px solid #fecaca',
  },
  footerNote: {
    marginTop: '24px',
    textAlign: 'center',
    fontSize: '12px',
    color: '#64748b',
    lineHeight: '1.5',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '6px',
    border: '1px solid #f1f5f9',
  },
  copyright: {
    marginTop: '20px',
    textAlign: 'center',
    fontSize: '11px',
    color: '#94a3b8',
    letterSpacing: '0.02em',
  }
};

export default Login;
