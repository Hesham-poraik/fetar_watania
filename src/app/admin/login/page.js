'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  // التحقق لو القائد مسجل دخول بالفعل لتوجيهه مباشرة للعمليات
  useEffect(() => {
    fetch('/api/admin/check')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          router.push('/admin');
        }
      });
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(data.message);
        setTimeout(() => {
          router.push('/admin');
        }, 1200);
      } else {
        setError(data.message || 'خطأ في المصادقة يا عسكري!');
      }
    } catch (err) {
      setError('انقطعت الاتصالات ببرج المراقبة! حاول تاني 💥');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div className="custom-modal" style={{ width: '100%', maxWidth: '420px', animation: 'scaleUp 0.4s ease' }}>
        <div className="custom-modal-header" style={{ justifyContent: 'center' }}>
          <h2 className="custom-modal-title" style={{ textAlign: 'center' }}>
            🔒 غرفة عمليات القائد (تسجيل الدخول)
          </h2>
        </div>
        
        <div className="custom-modal-body">
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <span style={{ fontSize: '4.5rem' }}>🕵️‍♂️</span>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '10px' }}>
              انتباه يا قائد! أدخل شفرة المرور السرية لفتح الدفتر العسكري وإدارة كتائب الفطار.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">الاسم الرمزي (Username)</label>
              <input
                type="text"
                className="form-input"
                placeholder="أدخل الاسم العسكري..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">شفرة المرور السرية (Password)</label>
              <input
                type="password"
                className="form-input"
                placeholder="أدخل شفرة الدفاع..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div style={{
                backgroundColor: 'rgba(255, 77, 79, 0.1)',
                border: '1px solid var(--accent-red)',
                color: 'var(--accent-red)',
                padding: '10px',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '0.9rem',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{
                backgroundColor: 'rgba(57, 231, 95, 0.1)',
                border: '1px solid var(--accent-green)',
                color: 'var(--accent-green)',
                padding: '10px',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '0.9rem',
                textAlign: 'center'
              }}>
                {success}
              </div>
            )}

            <button
              type="submit"
              className="btn-military btn-military-gold"
              style={{ width: '100%', padding: '14px' }}
              disabled={loading}
            >
              {loading ? 'جاري التحقق من الهوية... 🛡️' : 'افتح اللائحة العسكرية 🫡🗝️'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
