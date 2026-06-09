'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CustomerBalances() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState({});
  const [newSoldier, setNewSoldier] = useState({ name: '', balance: '' });
  const [editingSoldier, setEditingSoldier] = useState(null); // { name, amount }
  const [searchQuery, setSearchQuery] = useState('');

  const router = useRouter();

  useEffect(() => {
    async function checkAuthAndLoad() {
      try {
        const checkRes = await fetch('/api/admin/check');
        const checkData = await checkRes.json();
        
        if (!checkData.authenticated) {
          router.push('/admin/login');
          return;
        }
        
        setAuthorized(true);
        await fetchBalances();
      } catch (err) {
        console.error('فشل تحميل الأرصدة:', err);
      } finally {
        setLoading(false);
      }
    }
    checkAuthAndLoad();
  }, [router]);

  const fetchBalances = async () => {
    const res = await fetch('/api/balances');
    const data = await res.json();
    if (data.success) {
      setBalances(data.balances);
    }
  };

  // تعديل أو إضافة رصيد عسكري
  const handleUpdateBalance = async (name, amount) => {
    try {
      const res = await fetch('/api/balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: name, amount: Number(amount) })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBalances(data.balances);
        setEditingSoldier(null);
        alert(data.message);
      } else {
        alert(data.message || 'فشل التعديل!');
      }
    } catch (err) {
      alert('حدث خطأ بالاتصال بالخادم!');
    }
  };

  // فورم إضافة عسكري جديد للأرصدة
  const handleAddNewSoldier = async (e) => {
    e.preventDefault();
    if (!newSoldier.name.trim()) return;
    
    await handleUpdateBalance(newSoldier.name, newSoldier.balance || 0);
    setNewSoldier({ name: '', balance: '' });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '20px' }}>
        <span style={{ fontSize: '5rem' }}>⏳</span>
        <h2>جاري الكشف عن خزنة الأمانات العسكرية...</h2>
      </div>
    );
  }

  if (!authorized) return null;

  // فلترة الأرصدة حسب البحث
  const filteredSoldiers = Object.keys(balances).filter(name => 
    name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* هيدر الخزنة */}
      <header className="hud-header">
        <div className="hud-title-container">
          <span className="hud-logo">💰</span>
          <div>
            <h1 className="hud-title">خزنة أمانات عساكر الفطار 🫡💵</h1>
            <span className="hud-badge">سلاح الشؤون المالية والحسابات العسكرية</span>
          </div>
        </div>
        <div>
          <Link href="/admin" className="btn-military btn-military-primary" style={{ textDecoration: 'none' }}>
            📋 العودة لغرفة العمليات
          </Link>
        </div>
      </header>

      <div className="page-container">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
          
          {/* فورم إضافة عسكري جديد للخزنة */}
          <div className="restaurant-summary-card" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            <h3 style={{ marginBottom: '20px', color: 'var(--accent-gold)' }}>
              🪖 تسجيل عسكري جديد بالخزنة المجمعة
            </h3>
            <form onSubmit={handleAddNewSoldier}>
              <div className="form-group">
                <label className="form-label">الاسم الكامل للعسكري</label>
                <input
                  type="text"
                  className="form-input"
                  value={newSoldier.name}
                  onChange={(e) => setNewSoldier(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="مثال: العسكري أحمد محمد..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">الرصيد الابتدائي بالجنيه (موجب له / سالب عليه)</label>
                <input
                  type="number"
                  className="form-input"
                  value={newSoldier.balance}
                  onChange={(e) => setNewSoldier(prev => ({ ...prev, balance: e.target.value }))}
                  placeholder="مثال: 50 (له باقي) أو -20 (عليه)"
                />
              </div>

              <button type="submit" className="btn-military btn-military-gold" style={{ width: '100%' }}>
                سجل العسكري وافتح حسابه 🫡💰
              </button>
            </form>
          </div>

          {/* محرك البحث عن عسكري */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <h3>💵 كشف الحسابات العام والأرصدة</h3>
            <input
              type="text"
              className="form-input"
              style={{ maxWidth: '300px' }}
              placeholder="🔍 ابحث عن عسكري..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* جدول الأرصدة */}
          <div className="table-responsive">
            <table className="nagaf-table">
              <thead>
                <tr>
                  <th>اسم العسكري 🪖</th>
                  <th>الحالة المالية 📊</th>
                  <th>الرصيد الحالي 💰</th>
                  <th>تعديل الرصيد ✏️</th>
                </tr>
              </thead>
              <tbody>
                {filteredSoldiers.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '30px' }}>
                      مفيش عساكر بالاسم ده متسجلين في الخزنة!
                    </td>
                  </tr>
                ) : (
                  filteredSoldiers.map((name) => {
                    const balance = balances[name];
                    const isEditing = editingSoldier?.name === name;

                    return (
                      <tr key={name}>
                        <td style={{ fontWeight: '800' }}>{name}</td>
                        <td>
                          {balance > 0 ? (
                            <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>
                              🟢 ليه باقي عندنا فلوس 💵
                            </span>
                          ) : balance < 0 ? (
                            <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>
                              🔴 عليه فلوس عجز ومستحقة 🚨
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>⚪ خالص ملهوش ومفهوش</span>
                          )}
                        </td>
                        <td style={{ fontWeight: '900', fontSize: '1.1rem' }}>
                          {isEditing ? (
                            <input
                              type="number"
                              className="form-input"
                              style={{ width: '120px', padding: '6px 10px', textAlign: 'center' }}
                              value={editingSoldier.amount}
                              onChange={(e) => setEditingSoldier(prev => ({ ...prev, amount: e.target.value }))}
                              placeholder="الرصيد الجديد..."
                              autoFocus
                            />
                          ) : (
                            <span style={{ color: balance > 0 ? 'var(--accent-green)' : balance < 0 ? 'var(--accent-red)' : '#fff' }}>
                              {balance} جنيه
                            </span>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => handleUpdateBalance(name, editingSoldier.amount)}
                                className="btn-military btn-military-gold"
                                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                              >
                                حفظ ✅
                              </button>
                              <button
                                onClick={() => setEditingSoldier(null)}
                                className="btn-military btn-military-secondary"
                                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                              >
                                إلغاء ❌
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingSoldier({ name, amount: balance })}
                              className="btn-military btn-military-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                            >
                              عدل الرصيد 💰
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}
