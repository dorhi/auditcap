import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

const LanguageToggle = ({ variant = 'light', size = 'normal' }) => {
  const { lang, setLang } = useLanguage();

  const isLight = variant === 'light';
  const isSmall = size === 'small';

  const containerStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.15)',
    borderRadius: '20px',
    padding: '3px',
    border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.25)',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    userSelect: 'none',
  };

  const getButtonStyle = (targetLang) => {
    const active = lang === targetLang;
    return {
      padding: isSmall ? '3px 9px' : '5px 12px',
      fontSize: isSmall ? '11px' : '12px',
      fontWeight: active ? '700' : '500',
      color: active
        ? '#ffffff'
        : isLight
        ? '#64748b'
        : 'rgba(255, 255, 255, 0.8)',
      backgroundColor: active
        ? '#0077C8'
        : 'transparent',
      borderRadius: '16px',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.18s ease-in-out',
      boxShadow: active ? '0 1px 4px rgba(0, 119, 200, 0.35)' : 'none',
      letterSpacing: '0.04em',
    };
  };

  return (
    <div style={containerStyle} title="Select Language (언어 선택)">
      <button
        type="button"
        style={getButtonStyle('KO')}
        onClick={() => setLang('KO')}
      >
        KOR
      </button>
      <button
        type="button"
        style={getButtonStyle('EN')}
        onClick={() => setLang('EN')}
      >
        ENG
      </button>
    </div>
  );
};

export default LanguageToggle;
