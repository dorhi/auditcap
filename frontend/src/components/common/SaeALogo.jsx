import React from 'react';

/**
 * GLOBAL SAE-A 공식 심볼 마크 컴포넌트
 * - 사용자가 제공한 공식 CI 마크 심볼 이미지(/saea-symbol.png 및 /saea-symbol-white.png) 적용
 * - 밝은 배경: Blue (#0077C8)
 * - 어두운 배경: White (#FFFFFF)
 */
export const SaeASymbol = ({ size = 32, variant = 'blue', color, style }) => {
  const isWhite = variant === 'white' || color === '#ffffff' || color === '#fff';
  const imageSrc = isWhite ? '/saea-symbol-white.png' : '/saea-symbol.png';

  return (
    <img 
      src={imageSrc} 
      alt="GLOBAL SAE-A Symbol" 
      width={size} 
      height={size} 
      style={{ 
        display: 'inline-block', 
        flexShrink: 0, 
        objectFit: 'contain',
        ...style 
      }}
    />
  );
};

/**
 * GLOBAL SAE-A Brand Guidelines 공식 로고 컴포넌트 (심볼 + 워드마크)
 */
const SaeALogo = ({ 
  variant = 'blue', // 'blue' (#0077C8) or 'white' (#ffffff)
  showSubtitle = true,
  subtitleText = 'CAP Monitoring System',
  korean = false,
  height = 36,
  textColor,
  subColor: customSubColor,
  style = {}
}) => {
  const isWhite = variant === 'white';
  const brandColor = textColor || (isWhite ? '#ffffff' : '#0077C8');
  const subColor = customSubColor || (isWhite ? '#cbd5e1' : '#64748b');

  return (
    <div 
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: `${Math.round(height * 0.35)}px`,
        textDecoration: 'none',
        userSelect: 'none',
        ...style 
      }}
    >
      {/* 공식 심볼 마크 */}
      <SaeASymbol size={height} variant={variant} color={brandColor} />

      {/* 공식 워드마크 */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ 
          fontSize: `${Math.round(height * 0.56)}px`, 
          fontWeight: '800', 
          fontFamily: "'Ubuntu', 'SUIT', sans-serif",
          color: brandColor,
          letterSpacing: '0.04em',
          lineHeight: 1.1,
          whiteSpace: 'nowrap'
        }}>
          {korean ? '글로벌세아' : 'GLOBAL SAE-A'}
        </div>

        {showSubtitle && (
          <div style={{ 
            fontSize: `${Math.max(10, Math.round(height * 0.28))}px`, 
            fontWeight: '600', 
            color: subColor,
            fontFamily: "'SUIT', sans-serif",
            letterSpacing: '-0.02em',
            marginTop: '2px',
            whiteSpace: 'nowrap'
          }}>
            {subtitleText}
          </div>
        )}
      </div>
    </div>
  );
};

export default SaeALogo;
