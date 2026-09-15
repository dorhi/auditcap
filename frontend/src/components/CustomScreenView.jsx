import React from 'react';

const CustomScreenView = ({ menu }) => {
  if (!menu) {
    return (
      <div style={styles.emptyContainer}>
        <h3>화면 정보를 불러올 수 없습니다.</h3>
      </div>
    );
  }

  const isExternalUrl = menu.screenType === 'EXTERNAL_URL';

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.titleRow}>
            <div>
              <h3 style={styles.title}>{menu.menuName}</h3>
              <span style={styles.badge}>{menu.menuCode}</span>
            </div>
          </div>
          {menu.description && (
            <p style={styles.subtitle}>{menu.description}</p>
          )}
        </div>

        <div style={styles.contentArea}>
          {isExternalUrl ? (
            <div style={styles.externalBox}>
              <p style={{ marginBottom: '15px', color: '#4b5563', fontSize: '13px' }}>
                ※ 외부 연계 시스템 화면입니다. 아래 버튼을 클릭하여 새 창에서 열거나 연결할 수 있습니다.
              </p>
              {menu.customContent && (
                <div style={{ marginBottom: '15px' }}>
                  <a
                    href={menu.customContent}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.linkButton}
                  >
                    외부 사이트 바로가기 ({menu.customContent})
                  </a>
                </div>
              )}
              {menu.customContent && (
                <iframe
                  src={menu.customContent}
                  title={menu.menuName}
                  style={styles.iframe}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              )}
            </div>
          ) : (
            <div style={styles.htmlViewer}>
              {menu.customContent ? (
                <div
                  dangerouslySetInnerHTML={{ __html: menu.customContent }}
                  style={styles.renderedHtml}
                />
              ) : (
                <div style={styles.noContent}>
                  <p>등록된 화면 콘텐츠 내용이 없습니다.</p>
                  <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                    [화면 / 메뉴 관리]에서 화면 내용을 추가하거나 수정해 주세요.
                  </span>
                </div>
              )}
            </div>
          )}
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
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid #f3f4f6',
    backgroundColor: '#f9fafb',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '6px',
  },
  icon: {
    fontSize: '28px',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: '#111827',
  },
  badge: {
    display: 'inline-block',
    fontSize: '11px',
    fontWeight: '600',
    color: '#4f46e5',
    backgroundColor: '#eef2ff',
    padding: '2px 8px',
    borderRadius: '4px',
    marginTop: '3px',
  },
  subtitle: {
    margin: '8px 0 0 0',
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: '1.5',
  },
  contentArea: {
    padding: '24px',
    minHeight: '400px',
  },
  externalBox: {
    display: 'flex',
    flexDirection: 'column',
  },
  linkButton: {
    display: 'inline-block',
    padding: '10px 18px',
    backgroundColor: '#4f46e5',
    color: '#fff',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '13px',
  },
  iframe: {
    width: '100%',
    height: '600px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#fff',
  },
  htmlViewer: {
    lineHeight: '1.7',
    color: '#374151',
    fontSize: '14px',
  },
  renderedHtml: {
    overflowX: 'auto',
  },
  noContent: {
    padding: '60px 20px',
    textAlign: 'center',
    color: '#9ca3af',
  },
  emptyContainer: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
  },
};

export default CustomScreenView;
