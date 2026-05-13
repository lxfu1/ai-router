'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function LoginModal({ open, onClose, onSuccess }: LoginModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setPassword('');
      setError('');
      setLoading(false);
      // Auto-focus input after open animation
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !loading) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, loading, onClose]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || loading) return;

    setError('');
    setLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('服务器返回格式错误');
      }

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem('admin_token', data.token);
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        setError(data.error || '登录失败，请检查密码');
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err instanceof Error && err.name === 'AbortError') {
        setError('请求超时，请稍后重试');
      } else {
        setError(
          err instanceof Error ? err.message : '网络错误，请检查网络连接'
        );
      }
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  if (!open) return null;

  return (
    <div
      className='modal-overlay'
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div className='modal' onClick={(e) => e.stopPropagation()}>
        <div className='modal-header'>
          <h3>管理后台登录</h3>
          <button
            className='btn btn-sm btn-ghost'
            onClick={onClose}
            disabled={loading}
          >
            关闭
          </button>
        </div>
        <div className='modal-body'>
          <form onSubmit={handleLogin}>
            <div className='form-group'>
              <label>管理员密码</label>
              <input
                ref={inputRef}
                className='form-input'
                type='password'
                placeholder='请输入管理员密码'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            {error && <p className='login-error'>{error}</p>}
            <button
              className='btn btn-primary login-btn'
              type='submit'
              disabled={loading || !password.trim()}
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '11px',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 'var(--radius)'
              }}
            >
              {loading ? (
                <span className='btn-loading'>
                  <span className='spinner-small' />
                  登录中...
                </span>
              ) : (
                '登 录'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
