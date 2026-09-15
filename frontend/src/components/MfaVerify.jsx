import React, { useState } from 'react';
import { useAuth } from '../context/AuthProvider';
import SaeALogo from './common/SaeALogo';

const MfaVerify = () => {
  const { verifyMfa, getMfaSetup, logout } = useAuth();
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [qrCodeUri, setQrCodeUri] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // OTP 셋업 정보 조회 (최초 1회 설정이 필요한 경우)
  const handleSetupMfa = async () => {
    const res = await getMfaSetup();
    if (res.success) {
      setQrCodeUri(res.data.qrCodeUri);
      setSecretKey(res.data.secret);
      setShowSetup(true);
    } else {
      setError(res.message);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');

    if (otpCode.length !== 6 || isNaN(otpCode)) {
      setError('6자리 숫자를 정확히 입력해 주세요.');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await verifyMfa(otpCode);
      if (!res.success) {
        setError(res.message);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* 글로벌세아 브랜드 상단 액센트 바 */}
      <div style={styles.brandAccentBar} />

      <div style={styles.card}>
        <div style={styles.logoWrapper}>
          <SaeALogo 
            variant="blue" 
            height={38} 
            subtitleText="CAP Monitoring System" 
          />
        </div>

        <div style={styles.headerTextBox}>
          <h2 style={styles.title}>2단계 OTP 보안 인증</h2>
          <p style={styles.subtitle}>
            보안 정책에 따라 사내 인증기 앱(Google/MS Authenticator)의 일회용 비밀번호(6자리)를 입력하세요.
          </p>
        </div>

        {error && (
          <div style={styles.error}>
            <span style={{ marginRight: '6px' }}>※</span>
            <span>{error}</span>
          </div>
        )}

        {!showSetup ? (
          <div style={styles.setupPrompt}>
            <button type="button" onClick={handleSetupMfa} style={styles.linkButton}>
              처음 로그인하시나요? OTP 등록 정보 확인 (QR코드)
            </button>
          </div>
        ) : (
          <div style={styles.qrContainer}>
            <p style={styles.infoText}>아래 QR코드를 인증 앱으로 스캔하거나 보안 키를 수동 등록하세요.</p>
            <div style={styles.qrImageContainer}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrCodeUri)}`} 
                alt="MFA QR Code" 
                style={styles.qrImage}
              />
            </div>
            <p style={styles.secretKey}>보안 키: <strong>{secretKey}</strong></p>
            <button type="button" onClick={() => setShowSetup(false)} style={styles.confirmButton}>
              등록 완료 및 인증번호 입력으로 이동
            </button>
          </div>
        )}

        {!showSetup && (
          <form onSubmit={handleVerify} style={styles.form}>
            <div style={styles.inputGroup}>
              <input
                type="text"
                maxLength={6}
                placeholder="인증코드 6자리 입력 (예: 123456)"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                style={styles.input}
                autoFocus
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={isVerifying}
              style={styles.button}
            >
              {isVerifying ? '인증 확인 중...' : '인증 확인'}
            </button>
          </form>
        )}

        <div style={styles.footer}>
          <button type="button" onClick={logout} style={styles.logoutButton}>
            ← 이전 단계로 (로그아웃)
          </button>
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
    maxWidth: '430px',
    padding: '38px 34px 28px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 10px 25px -5px rgba(0, 119, 200, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e2e8f0',
    textAlign: 'center',
  },
  logoWrapper: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  headerTextBox: {
    marginBottom: '20px',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '14px',
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
    lineHeight: '1.5',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  input: {
    padding: '13px',
    fontSize: '20px',
    textAlign: 'center',
    letterSpacing: '6px',
    fontWeight: '700',
    border: '2px solid #cbd5e1',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    outline: 'none',
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
    boxShadow: '0 2px 4px rgba(0, 119, 200, 0.25)',
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 14px',
    marginBottom: '16px',
    fontSize: '13px',
    color: '#991b1b',
    backgroundColor: '#fef2f2',
    borderRadius: '6px',
    border: '1px solid #fecaca',
  },
  setupPrompt: {
    marginBottom: '18px',
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: 'var(--saea-blue, #0077C8)',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '600',
    textDecoration: 'underline',
  },
  qrContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '18px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  infoText: {
    fontSize: '12px',
    color: '#475569',
    marginBottom: '12px',
  },
  qrImageContainer: {
    padding: '10px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    marginBottom: '12px',
  },
  qrImage: {
    display: 'block',
    width: '160px',
    height: '160px',
  },
  secretKey: {
    fontSize: '13px',
    color: '#334155',
    marginBottom: '14px',
    wordBreak: 'break-all',
  },
  confirmButton: {
    padding: '9px 16px',
    fontSize: '13px',
    fontWeight: '700',
    color: '#ffffff',
    backgroundColor: 'var(--saea-blue, #0077C8)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  footer: {
    marginTop: '22px',
    borderTop: '1px solid #f1f5f9',
    paddingTop: '16px',
  },
  logoutButton: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: '13px',
    cursor: 'pointer',
  },
};

export default MfaVerify;
