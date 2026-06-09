'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('orders'); // orders, places, products, balances
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // بيانات النظام والمدخلات
  const [config, setConfig] = useState({ isOpen: false, manualOverride: null, timeLeftMessage: '' });
  const [places, setPlaces] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  // أرصدة العملاء
  const [balances, setBalances] = useState({});
  const [editingSoldier, setEditingSoldier] = useState(null);
  const [balanceSearch, setBalanceSearch] = useState('');
  
  // أرصدة وتفاصيل مجمعة للتحليل المالي اليومي
  const [totals, setTotals] = useState({ totalOrdersCount: 0, totalRevenue: 0 });

  // نموذج إضافة محل جديد
  const [placeForm, setPlaceForm] = useState({ id: '', name: '', image: '', enabled: true });
  const [placeUploading, setPlaceUploading] = useState(false);
  
  // نموذج إضافة منتج جديد
  const [productForm, setProductForm] = useState({ id: '', name: '', price: '', image: '', placeId: '' });
  const [productUploading, setProductUploading] = useState(false);

  // تحديث الدفع
  const [paymentInputs, setPaymentInputs] = useState({});

  const router = useRouter();

  // التحقق من الهوية العسكرية وجلب البيانات الأساسية
  useEffect(() => {
    async function checkAuthAndLoadData() {
      try {
        const checkRes = await fetch('/api/admin/check');
        const checkData = await checkRes.json();
        
        if (!checkData.authenticated) {
          router.push('/admin/login');
          return;
        }
        
        setAuthorized(true);
        await Promise.all([
          fetchConfig(),
          fetchPlaces(),
          fetchProducts(),
          fetchOrders(),
          fetchBalances()
        ]);
      } catch (err) {
        console.error('فشل في جلب البيانات الأولية:', err);
      } finally {
        setLoading(false);
      }
    }

    checkAuthAndLoadData();
  }, [router]);

  // دوال جلب البيانات
  const fetchConfig = async () => {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (data.success) setConfig({ isOpen: data.isOpen, manualOverride: data.manualOverride, timeLeftMessage: data.timeLeftMessage });
  };

  const fetchPlaces = async () => {
    const res = await fetch('/api/places');
    const data = await res.json();
    if (data.success) setPlaces(data.places);
  };

  const fetchProducts = async () => {
    const res = await fetch('/api/products');
    const data = await res.json();
    if (data.success) {
      setProducts(data.products);
      if (data.products.length > 0 && !productForm.placeId) {
        setProductForm(prev => ({ ...prev, placeId: data.products[0].placeId }));
      }
    }
  };

  const fetchOrders = async () => {
    const res = await fetch('/api/orders');
    const data = await res.json();
    if (data.success) {
      setOrders(data.orders);
      
      // تهيئة مدخلات الدفع المسبقة للطلبات
      const initialPayments = {};
      data.orders.forEach(o => {
        initialPayments[o.id] = o.paidAmount || '';
      });
      setPaymentInputs(initialPayments);

      // حساب الإجماليات
      const count = data.orders.length;
      const rev = data.orders.reduce((sum, o) => sum + o.totalCost, 0);
      setTotals({ totalOrdersCount: count, totalRevenue: rev });
    }
  };

  const fetchBalances = async () => {
    const res = await fetch('/api/balances');
    const data = await res.json();
    if (data.success) setBalances(data.balances);
  };

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
      }
    } catch (err) {
      console.error('فشل تعديل الرصيد:', err);
    }
  };

  const handleResetAllBalances = async () => {
    if (!(await window.customConfirm('⚠️ تحذير خطير: هل أنت متأكد إنك عايز تصفر وتمسح أرصدة كل العساكر؟ (العملية دي هترجع كل الحسابات لصفر 0)'))) return;
    
    try {
      const res = await fetch('/api/balances/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        window.customAlert(data.message);
        fetchBalances();
      } else {
        window.customAlert(data.message);
      }
    } catch (err) {
      window.customAlert('فشل تصفير الحسابات!');
    }
  };

  // التحكم في حالة النظام (فتح/إغلاق يدوي)
  const handleConfigChange = async (overrideValue) => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manualOverride: overrideValue })
      });
      const data = await res.json();
      if (res.ok) {
        window.customAlert(data.message);
        fetchConfig();
      }
    } catch (err) {
      window.customAlert('حدث خطأ أثناء تعديل إعدادات فتح وإغلاق الطابور!');
    }
  };

  // تسجيل الخروج العسكري
  const handleLogout = async () => {
    if (await window.customConfirm('هل أنت متأكد من الانصراف يا فندم؟ 🫡')) {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin/login');
    }
  };

  // فتح مأمورية جديدة (مسح كل الطلبات مع الحفاظ على الأرصدة)
  const handleNewMission = async () => {
    if (!(await window.customConfirm('⚠️ انتبه يا قائد! فتح مأمورية جديدة هيحذف كل طلبات المأمورية السابقة نهائياً مع الحفاظ على أرصدة العساكر. موافق؟'))) return;
    try {
      const res = await fetch('/api/orders/clear', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        window.customAlert(data.message);
        await fetchOrders();
        await fetchBalances();
        setActiveTab('orders');
      } else {
        window.customAlert(data.message);
      }
    } catch (err) {
      window.customAlert('فشل تنفيذ أمر المأمورية الجديدة!');
    }
  };

  // رفع صور المحلات
  const handlePlaceImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPlaceUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setPlaceForm(prev => ({ ...prev, image: data.url }));
      } else {
        window.customAlert(data.message);
      }
    } catch (err) {
      window.customAlert('فشل رفع الصورة للأسف!');
    } finally {
      setPlaceUploading(false);
    }
  };

  // رفع صور المنتجات
  const handleProductImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setProductUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setProductForm(prev => ({ ...prev, image: data.url }));
      } else {
        window.customAlert(data.message);
      }
    } catch (err) {
      window.customAlert('فشل رفع الصورة للأسف!');
    } finally {
      setProductUploading(false);
    }
  };

  // إضافة أو تعديل محل
  const handlePlaceSubmit = async (e) => {
    e.preventDefault();
    if (!placeForm.name) return;

    try {
      const res = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(placeForm)
      });
      const data = await res.json();
      if (data.success) {
        setPlaces(data.places);
        setPlaceForm({ id: '', name: '', image: '', enabled: true });
        window.customAlert('🎉 تم حفظ بيانات المحل بنجاح يا فندم!');
      }
    } catch (err) {
      window.customAlert('فشل حفظ المحل!');
    }
  };

  // إضافة منتج
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!productForm.name || !productForm.placeId || !productForm.price) {
      window.customAlert('انتبه يا قائد! املأ جميع بيانات المنتج الأول!');
      return;
    }

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productForm)
      });
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
        setProductForm({ id: '', name: '', price: '', image: '', placeId: places[0]?.id || '' });
        window.customAlert('🎉 تم إضافة الصنف العسكري الجديد لترسانة الأكل بنجاح!');
      }
    } catch (err) {
      window.customAlert('فشل حفظ المنتج!');
    }
  };

  // حذف محل
  const handleDeletePlace = async (id) => {
    if (await window.customConfirm('⚠️ انتباه يا قائد! حذف المحل هيحذف كل المنتجات اللي فيه نهائياً، موافق؟')) {
      try {
        const res = await fetch(`/api/places?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          setPlaces(data.places);
          setProducts(data.products);
          window.customAlert('🪓 تم مسح المحل وإبادة منتجاته بنجاح!');
        }
      } catch (err) {
        window.customAlert('فشل الحذف!');
      }
    }
  };

  // حذف منتج
  const handleDeleteProduct = async (id) => {
    if (await window.customConfirm('هل تريد حذف هذا الصنف من الإمداد؟')) {
      try {
        const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          setProducts(data.products);
          window.customAlert('🗑️ تم التخلص من المنتج بنجاح!');
        }
      } catch (err) {
        window.customAlert('فشل الحذف!');
      }
    }
  };

  // حذف طلب عسكري (للأدمن فقط)
  const handleDeleteOrder = async (orderId, userName) => {
    if (!(await window.customConfirm(`⚠️ انتبه يا قائد! هتحذف أوردر العسكري "${userName}" نهائياً من الكشف. موافق؟`))) return;

    try {
      const res = await fetch('/api/orders/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });
      const data = await res.json();
      if (data.success) {
        window.customAlert(data.message);
        fetchOrders();
        fetchBalances();
      } else {
        window.customAlert(data.message);
      }
    } catch (err) {
      window.customAlert('فشل تنفيذ أمر الحذف للطلب!');
    }
  };

  // تحديث الدفع والـ Paid Amount لعسكري
  const handleUpdatePayment = async (orderId, totalCost) => {
    const inputVal = paymentInputs[orderId];
    const paidAmount = Number(inputVal) || 0;

    try {
      const res = await fetch('/api/orders/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, paidAmount })
      });
      const data = await res.json();
      if (data.success) {
        window.customAlert(data.message);
        fetchOrders();
        fetchBalances();
      } else {
        window.customAlert(data.message);
      }
    } catch (err) {
      window.customAlert('فشل تحديث بيانات الحساب للطلب!');
    }
  };

  const handlePaymentInputChange = (orderId, value) => {
    setPaymentInputs(prev => ({
      ...prev,
      [orderId]: value
    }));
  };

  // تجميع وتلخيص الطلبات اليومية للمطاعم
  const getAggregatedOrders = () => {
    const summary = {}; // { placeName: { placeId, items: { prodId: { name, count, price, notes: [] } } } }

    orders.forEach(order => {
      order.items.forEach(item => {
        const pName = item.placeName || 'مطعم مجهول ⁉️';
        if (!summary[pName]) {
          summary[pName] = {
            totalCost: 0,
            items: {}
          };
        }

        const itemTotalCost = item.price * item.quantity;
        summary[pName].totalCost += itemTotalCost;

        if (!summary[pName].items[item.productId]) {
          summary[pName].items[item.productId] = {
            name: item.name,
            quantity: 0,
            price: item.price,
            notes: []
          };
        }

        summary[pName].items[item.productId].quantity += item.quantity;
        
        if (item.notes && item.notes.trim()) {
          summary[pName].items[item.productId].notes.push({
            user: order.userName,
            note: item.notes.trim()
          });
        }
      });
    });

    return summary;
  };

  const aggregatedData = getAggregatedOrders();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '20px' }}>
        <span style={{ fontSize: '5rem' }}>⏳</span>
        <h2>جاري استدعاء الملفات العسكرية والاتصال بالخازن...</h2>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div>
      {/* هيدر القائد */}
      <header className="hud-header">
        <div className="hud-title-container">
          <span className="hud-logo">🎖️</span>
          <div>
            <h1 className="hud-title">منظومة نجف لعساكر الفطار - العمليات 🫡</h1>
            <span className="hud-badge">شاشات القائد العام لدفتر الحسابات</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button onClick={handleNewMission} className="btn-military btn-military-gold">
            🏆 فتح مأمورية جديدة
          </button>
          <button onClick={handleLogout} className="btn-military btn-military-danger">
            انصراف من الخدمة 🚪
          </button>
        </div>
      </header>

      <div className="page-container">
        {/* شريط حالة النظام والتحكم بفتح وقفل الطلب */}
        <section className="status-bar">
          <div style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
            <div className="status-indicator">
              <span className={`dot ${config.isOpen ? 'open' : 'closed'}`}></span>
              <span className="status-text">
                حالة باب الهجوم على الفطار: {config.isOpen ? 'مفتوح للطلبات 🔓' : 'مغلق بالأقفال 🔒'}
              </span>
            </div>
            {config.timeLeftMessage && (
              <span className="status-desc">({config.timeLeftMessage})</span>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>تجاوز التحكم اليومي:</span>
            <button
              onClick={() => handleConfigChange(true)}
              className={`btn-military btn-military-secondary ${config.manualOverride === true ? 'btn-military-primary' : ''}`}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              افتح بالعافية 🔓
            </button>
            <button
              onClick={() => handleConfigChange(false)}
              className={`btn-military btn-military-secondary ${config.manualOverride === false ? 'btn-military-danger' : ''}`}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              اقفل بالأمر 🔒
            </button>
            <button
              onClick={() => handleConfigChange(null)}
              className={`btn-military btn-military-secondary ${config.manualOverride === null ? 'btn-military-gold' : ''}`}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              تلقائي (7ص لـ 11ص) ⏰
            </button>
          </div>
        </section>

        {/* كروت الإحصائيات السريعة */}
        <section className="admin-stats-grid">
          <div className="stat-card">
            <span className="stat-title">عدد عساكر الفطار اليوم 🪖</span>
            <span className="stat-value gold">{totals.totalOrdersCount} عسكري</span>
          </div>
          <div className="stat-card">
            <span className="stat-title">الحساب الكلي المطلوب جمعه 💰</span>
            <span className="stat-value green">{totals.totalRevenue} جنيه</span>
          </div>
          <div className="stat-card">
            <span className="stat-title">أماكن الأكل 🏪</span>
            <span className="stat-value">{places.length} مكان</span>
          </div>
          <div className="stat-card">
            <span className="stat-title">عليهم مديونية 🔴</span>
            <span className="stat-value" style={{ color: 'var(--accent-red)' }}>
              {Object.values(balances).filter(b => Number(b) < 0).length} عسكري
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-title">ليهم باقي عندنا 🟢</span>
            <span className="stat-value" style={{ color: 'var(--accent-green)' }}>
              {Object.values(balances).filter(b => Number(b) > 0).length} عسكري
            </span>
          </div>
        </section>

        {/* ألسنة التبويب للوحة التحكم */}
        <nav className="admin-tabs">
          <button
            onClick={() => setActiveTab('orders')}
            className={`admin-tab ${activeTab === 'orders' ? 'active' : ''}`}
          >
            📋 كشف طلبات اليوم
          </button>
          <button
            onClick={() => setActiveTab('places')}
            className={`admin-tab ${activeTab === 'places' ? 'active' : ''}`}
          >
            🏪 أماكن الأكل (المحلات)
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`admin-tab ${activeTab === 'products' ? 'active' : ''}`}
          >
            🍔 الحجات اللي ممكن تنطلب (المنتجات)
          </button>
          <button
            onClick={() => setActiveTab('balances')}
            className={`admin-tab ${activeTab === 'balances' ? 'active' : ''}`}
          >
            💰 رصيد العملاء
          </button>
        </nav>

        {/* تبويب الطلبات */}
        {activeTab === 'orders' && (
          <div>
            <h2 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📋 دفتر الأوردرات التفصيلي اليومي
            </h2>

            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <span style={{ fontSize: '4rem' }}>📭</span>
                <h3>مفيش أوردرات اتسجلت النهاردة خالص يا فندم! العساكر شكلها صايمة أو مستجدين خايفين.</h3>
              </div>
            ) : (
              <>
                <div className="table-responsive">
                  <table className="nagaf-table">
                    <thead>
                      <tr>
                        <th>رتبة العسكري (الاسم) 🪖</th>
                        <th>الذخيرة المطلوبة (الأصناف) 🍔</th>
                        <th>الحساب المطلوب 💰</th>
                        <th>المبلغ المدفوع 💵</th>
                        <th>الرصيد الكلي للعسكري 💸</th>
                        <th>تأكيد الحساب 🫡</th>
                        <th>حذف الأمر 🗑️</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => {
                        const newPaid = Number(paymentInputs[order.id]) || 0;
                        const oldPaid = Number(order.paidAmount) || 0;
                        const currentUserBalance = Number(balances[order.userName.trim()]) || 0;
                        const expectedBalance = currentUserBalance + (newPaid - oldPaid);
                        
                        return (
                          <tr key={order.id}>
                            <td style={{ fontWeight: '800' }}>{order.userName}</td>
                            <td>
                              {order.items.map((item, idx) => (
                                <div key={idx} style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                                  🗡️ <strong>{item.name}</strong> × {item.quantity} 
                                  <span style={{ color: 'var(--text-muted)' }}> ({item.placeName})</span>
                                  {item.notes && (
                                    <span style={{ display: 'block', color: 'var(--accent-gold)', fontSize: '0.8rem', paddingRight: '15px' }}>
                                      📝 ملاحظة: {item.notes}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </td>
                            <td style={{ fontWeight: '800', color: 'var(--accent-gold)' }}>
                              {order.totalCost} جنيه
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-input"
                                style={{ width: '90px', padding: '6px 10px', textAlign: 'center' }}
                                value={paymentInputs[order.id]}
                                onChange={(e) => handlePaymentInputChange(order.id, e.target.value)}
                                placeholder="دفع كام؟"
                              />
                            </td>
                            <td style={{ fontWeight: '700', color: expectedBalance > 0 ? 'var(--accent-green)' : expectedBalance < 0 ? 'var(--accent-red)' : '#fff' }}>
                              {expectedBalance > 0 ? `له باقي: ${expectedBalance} ج` : expectedBalance < 0 ? `عليه: ${Math.abs(expectedBalance)} ج` : 'خالص (0)'}
                            </td>
                            <td>
                              <button
                                onClick={() => handleUpdatePayment(order.id, order.totalCost)}
                                className="btn-military btn-military-gold"
                                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                              >
                                سجل الدفعة ✏️
                              </button>
                            </td>
                            <td>
                              <button
                                onClick={() => handleDeleteOrder(order.id, order.userName)}
                                className="btn-military btn-military-danger"
                                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                              >
                                احذف 🗑️
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* جزء تجميع الطلبات للمطاعم */}
                <div className="aggregated-section">
                  <h2 style={{ marginBottom: '20px', color: 'var(--accent-gold)' }}>
                    📊 الطلبات المجمعة لكل مطعم (إرسال للديليفري)
                  </h2>
                  
                  {Object.keys(aggregatedData).map((placeName) => {
                    const place = aggregatedData[placeName];
                    return (
                      <div key={placeName} className="restaurant-summary-card">
                        <div className="restaurant-summary-header">
                          <h3 className="restaurant-summary-title">{placeName}</h3>
                          <div className="restaurant-summary-total">
                            إجمالي الفاتورة: {place.totalCost} جنيه
                          </div>
                        </div>

                        <div className="aggregated-items-list">
                          {Object.keys(place.items).map((prodId) => {
                            const item = place.items[prodId];
                            return (
                              <div key={prodId} className="aggregated-item">
                                <div className="aggregated-item-info">
                                  <span className="aggregated-item-count">{item.quantity} حبة</span>
                                  <span style={{ fontWeight: '700' }}>{item.name}</span>
                                </div>
                                <div style={{ color: 'var(--text-secondary)' }}>
                                  السعر الفردي: {item.price} ج | المجموع: {item.price * item.quantity} ج
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* تجميع الملاحظات لكل صنف من هذا المطعم */}
                        {Object.keys(place.items).some(prodId => place.items[prodId].notes.length > 0) && (
                          <div className="notes-container">
                            <h4 style={{ marginBottom: '8px', fontSize: '0.95rem', color: 'var(--accent-gold)' }}>
                              📌 كراسة الملاحظات الخاصة بالمطعم:
                            </h4>
                            {Object.keys(place.items).map((prodId) => {
                              const item = place.items[prodId];
                              if (item.notes.length === 0) return null;
                              return (
                                <div key={prodId} style={{ marginBottom: '10px' }}>
                                  <strong style={{ fontSize: '0.85rem', color: '#fff' }}>[{item.name}]:</strong>
                                  {item.notes.map((n, i) => (
                                    <div key={i} className="note-item">
                                      🪖 <span>{n.user}</span> بيقول: &quot;{n.note}&quot;
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* تبويب المحلات */}
        {activeTab === 'places' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
              
              {/* فورم إضافة محل */}
              <div className="restaurant-summary-card" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
                <h3 style={{ marginBottom: '20px', color: 'var(--accent-gold)' }}>
                  {placeForm.id ? '✏️ تعديل كتيبة الأكل الحالية' : '🏪 ضم كتيبة أكل جديدة (مطعم)'}
                </h3>
                
                <form onSubmit={handlePlaceSubmit}>
                  <div className="form-group">
                    <label className="form-label">اسم المطعم أو المكان</label>
                    <input
                      type="text"
                      className="form-input"
                      value={placeForm.name}
                      onChange={(e) => setPlaceForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="مثال: مطعم أبو عمار للفول..."
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">صورة المطعم (اختياري)</label>
                    <input
                      type="file"
                      className="form-input"
                      accept="image/*"
                      onChange={handlePlaceImageUpload}
                    />
                    {placeUploading && <p style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', marginTop: '5px' }}>جاري شحن الصورة وتأمينها... 📸</p>}
                    {placeForm.image && (
                      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={placeForm.image} alt="المعاينة" style={{ width: '80px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                        <span style={{ fontSize: '0.8rem', color: 'var(--accent-green)' }}>تم شحن الصورة بنجاح!</span>
                      </div>
                    )}
                  </div>

                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="checkbox"
                      id="place-enabled"
                      checked={placeForm.enabled}
                      onChange={(e) => setPlaceForm(prev => ({ ...prev, enabled: e.target.checked }))}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor="place-enabled" style={{ cursor: 'pointer', fontWeight: 'bold' }}>متاح للعساكر يطلبوا منه حالياً (Enabled)</label>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn-military btn-military-primary" style={{ flexGrow: 1 }}>
                      {placeForm.id ? 'حفظ التعديلات 💾' : 'أرسل الأمر بالإعتماد 🫡'}
                    </button>
                    {placeForm.id && (
                      <button
                        type="button"
                        className="btn-military btn-military-secondary"
                        onClick={() => setPlaceForm({ id: '', name: '', image: '', enabled: true })}
                      >
                        إلغاء التعديل
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* قائمة المحلات المضافة */}
              <div>
                <h3 style={{ marginBottom: '15px' }}>🏪 أماكن الأكل المعتمدة حالياً في المنظومة</h3>
                {places.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>مفيش مطاعم مضافة حالياً. أضف مطعم لفتح التموين!</p>
                ) : (
                  <div className="places-grid">
                    {places.map((place) => (
                      <div key={place.id} className={`place-card ${!place.enabled ? 'disabled' : ''}`}>
                        <div className="place-image-wrapper">
                          {place.image ? (
                            <img src={place.image} alt={place.name} className="place-image" />
                          ) : (
                            '🏪'
                          )}
                        </div>
                        <div className="place-info">
                          <h4 className="place-name">{place.name}</h4>
                          <span className={`place-status-tag ${place.enabled ? 'open' : 'closed'}`} style={{ marginBottom: '15px' }}>
                            {place.enabled ? 'نشط ومتاح' : 'معطل ومحظور'}
                          </span>
                          <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                            <button
                              onClick={() => setPlaceForm(place)}
                              className="btn-military btn-military-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.85rem', flexGrow: 1 }}
                            >
                              تعديل ✏️
                            </button>
                            <button
                              onClick={() => handleDeletePlace(place.id)}
                              className="btn-military btn-military-danger"
                              style={{ padding: '6px 12px', fontSize: '0.85rem', flexGrow: 1 }}
                            >
                              إبادة 🪓
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* تبويب المنتجات */}
        {activeTab === 'products' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
              
              {/* فورم إضافة منتج */}
              <div className="restaurant-summary-card" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
                <h3 style={{ marginBottom: '20px', color: 'var(--accent-gold)' }}>
                  🍔 شحن صنف سلاح جديد (منتج)
                </h3>
                
                {places.length === 0 ? (
                  <div style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>
                    🚨 انتباه يا قائد! لازم تضيف مطعم واحد على الأقل في التبويب التاني قبل ما تضيف منتجات هنا!
                  </div>
                ) : (
                  <form onSubmit={handleProductSubmit}>
                    <div className="form-group">
                      <label className="form-label">المطعم التابع له المنتج</label>
                      <select
                        className="form-input"
                        value={productForm.placeId}
                        onChange={(e) => setProductForm(prev => ({ ...prev, placeId: e.target.value }))}
                        required
                      >
                        <option value="" disabled>اختر الكتيبة (المطعم)...</option>
                        {places.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">اسم الصنف أو الذخيرة</label>
                      <input
                        type="text"
                        className="form-input"
                        value={productForm.name}
                        onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="مثال: ساندوتش فول مدمر..."
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">السعر بالجنيه (EGP)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={productForm.price}
                        onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="مثال: 15"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">صورة المنتج (اختياري)</label>
                      <input
                        type="file"
                        className="form-input"
                        accept="image/*"
                        onChange={handleProductImageUpload}
                      />
                      {productUploading && <p style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', marginTop: '5px' }}>جاري شحن صورة الصنف... 📸</p>}
                      {productForm.image && (
                        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img src={productForm.image} alt="المعاينة" style={{ width: '80px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                          <span style={{ fontSize: '0.8rem', color: 'var(--accent-green)' }}>تم تأمين الصورة!</span>
                        </div>
                      )}
                    </div>

                    <button type="submit" className="btn-military btn-military-gold" style={{ width: '100%' }}>
                      اشحن الصنف للترسانة 🫡🚀
                    </button>
                  </form>
                )}
              </div>

              {/* قائمة المنتجات المعروضة مجمعة حسب المطعم */}
              <div>
                <h3 style={{ marginBottom: '15px' }}>🍔 ترسانة المأكولات المتاحة</h3>
                
                {places.map(place => {
                  const placeProducts = products.filter(p => p.placeId === place.id);
                  return (
                    <div key={place.id} style={{ marginBottom: '35px', background: 'rgba(255,255,255,0.01)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                      <h4 style={{ color: 'var(--accent-gold)', marginBottom: '15px', borderBottom: '1px dashed var(--border-glass)', paddingBottom: '8px' }}>
                        🏪 {place.name} ({placeProducts.length} أصناف)
                      </h4>

                      {placeProducts.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>لا توجد أصناف في هذا المطعم بعد.</p>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '15px' }}>
                          {placeProducts.map(prod => (
                            <div key={prod.id} className="product-row" style={{ padding: '10px 15px' }}>
                              <div className="product-left">
                                <div className="product-avatar" style={{ width: '45px', height: '45px', fontSize: '1.5rem' }}>
                                  {prod.image ? <img src={prod.image} alt={prod.name} /> : '🥯'}
                                </div>
                                <div className="product-details">
                                  <span className="product-title" style={{ fontSize: '0.95rem' }}>{prod.name}</span>
                                  <span className="product-price" style={{ fontSize: '0.9rem' }}>{prod.price} جنيه</span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteProduct(prod.id)}
                                className="btn-military btn-military-danger"
                                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                              >
                                مسح 🗑️
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        )}
        {/* تبويب رصيد العملاء */}
        {activeTab === 'balances' && (() => {
          const allSoldiers = Object.keys(balances).sort((a, b) => {
            const ba = balances[a], bb = balances[b];
            if (ba < 0 && bb >= 0) return -1;
            if (bb < 0 && ba >= 0) return 1;
            return ba - bb;
          });
          const filtered = allSoldiers.filter(n =>
            n.toLowerCase().includes(balanceSearch.toLowerCase())
          );
          return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  💰 كشف الحسابات العام والأرصدة
                </h2>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleResetAllBalances}
                    className="btn-military btn-military-danger"
                    style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                  >
                    تصفير كل الحسابات 🧹
                  </button>
                  <input
                    type="text"
                    className="form-input"
                    style={{ maxWidth: '280px' }}
                    placeholder="🔍 ابحث عن عسكري..."
                    value={balanceSearch}
                    onChange={e => setBalanceSearch(e.target.value)}
                  />
                </div>
              </div>

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
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '30px' }}>
                          {balanceSearch ? 'مفيش عسكري بالاسم ده في الكشف!' : '📭 الكشف فاضي - مفيش عساكر طلبوا لحد دلوقتي!'}
                        </td>
                      </tr>
                    ) : (
                      filtered.map(name => {
                        const balance = balances[name];
                        const isEditing = editingSoldier?.name === name;
                        return (
                          <tr key={name}>
                            <td style={{ fontWeight: '800' }}>{name}</td>
                            <td>
                              {balance > 0 ? (
                                <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>🟢 ليه باقي عندنا</span>
                              ) : balance < 0 ? (
                                <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>🔴 عليه مديونية</span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>⚪ خالص</span>
                              )}
                            </td>
                            <td style={{ fontWeight: '900', fontSize: '1.1rem' }}>
                              {isEditing ? (
                                <input
                                  type="number"
                                  className="form-input"
                                  style={{ width: '120px', padding: '6px 10px', textAlign: 'center' }}
                                  value={editingSoldier.amount}
                                  onChange={e => setEditingSoldier(prev => ({ ...prev, amount: e.target.value }))}
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
          );
        })()}

      </div>
    </div>
  );
}
