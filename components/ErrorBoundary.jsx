import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0f',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '22px', marginBottom: '8px', color: '#f87171' }}>
            Ứng dụng gặp sự cố giao diện
          </h2>
          <p style={{ color: '#94a3b8', maxWidth: '520px', marginBottom: '20px', fontSize: '14px', lineHeight: '1.6' }}>
            Một lỗi không mong muốn đã xảy ra trong quá trình hiển thị. Bạn có thể nhấn nút bên dưới để tải lại giao diện mà không bị mất dữ liệu cấu hình.
          </p>
          <div style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '12px 16px',
            maxWidth: '600px',
            textAlign: 'left',
            marginBottom: '24px',
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#fca5a5',
            overflowX: 'auto',
          }}>
            {this.state.error?.toString()}
          </div>
          <button
            onClick={this.handleReload}
            style={{
              background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 28px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
            }}
          >
            🔄 Tải Lại Giao Diện Ngay
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
