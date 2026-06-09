'use client';

import { useState, useEffect } from 'react';

export default function CustomAlertProvider({ children }) {
  const [alert, setAlert] = useState({ isOpen: false, message: '' });
  const [confirmState, setConfirmState] = useState({ isOpen: false, message: '', resolve: null });

  useEffect(() => {
    // تجاوز نافذة التنبيه الافتراضية
    window.alert = (message) => {
      setAlert({ isOpen: true, message });
    };
    window.customAlert = window.alert;

    // إضافة نافذة التأكيد المخصصة (بترجع Promise)
    window.customConfirm = (message) => {
      return new Promise((resolve) => {
        setConfirmState({ isOpen: true, message, resolve });
      });
    };
  }, []);

  const closeAlert = () => setAlert({ isOpen: false, message: '' });

  const handleConfirmAction = (result) => {
    if (confirmState.resolve) {
      confirmState.resolve(result);
    }
    setConfirmState({ isOpen: false, message: '', resolve: null });
  };

  return (
    <>
      {children}
      
      {/* Alert Modal */}
      {alert.isOpen && (
        <div className="custom-modal-overlay" style={{ zIndex: 9999 }}>
          <div className="custom-modal" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="custom-modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '4rem', marginBottom: '15px', animation: 'pulseLogo 2s infinite ease-in-out' }}>
                🫡
              </div>
              <h3 className="custom-modal-title" style={{ marginBottom: '15px', fontSize: '1.5rem' }}>
                رسالة من القيادة!
              </h3>
              <p style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '25px', fontWeight: '600', whiteSpace: 'pre-wrap' }}>
                {alert.message}
              </p>
              <button
                onClick={closeAlert}
                className="btn-military btn-military-gold"
                style={{ width: '100%', fontSize: '1.1rem', padding: '12px' }}
              >
                علم ويُنفذ!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmState.isOpen && (
        <div className="custom-modal-overlay" style={{ zIndex: 9999 }}>
          <div className="custom-modal" style={{ maxWidth: '450px', textAlign: 'center' }}>
            <div className="custom-modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '4rem', marginBottom: '15px', animation: 'pulseLogo 2s infinite ease-in-out' }}>
                ⚠️
              </div>
              <h3 className="custom-modal-title" style={{ marginBottom: '15px', fontSize: '1.5rem', color: 'var(--accent-red)' }}>
                انتباه! مطلوب تأكيد
              </h3>
              <p style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '25px', fontWeight: '600', whiteSpace: 'pre-wrap' }}>
                {confirmState.message}
              </p>
              <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
                <button
                  onClick={() => handleConfirmAction(true)}
                  className="btn-military btn-military-danger"
                  style={{ flexGrow: 1, fontSize: '1.1rem', padding: '12px' }}
                >
                  أوافق 🫡
                </button>
                <button
                  onClick={() => handleConfirmAction(false)}
                  className="btn-military btn-military-secondary"
                  style={{ flexGrow: 1, fontSize: '1.1rem', padding: '12px' }}
                >
                  تراجع ❌
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
