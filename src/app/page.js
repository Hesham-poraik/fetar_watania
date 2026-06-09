'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  // بيانات المستخدم
  const [userName, setUserName] = useState('');
  const [tempName, setTempName] = useState('');
  const [showNamePopup, setShowNamePopup] = useState(false);
  const [userBalance, setUserBalance] = useState(0);

  // بيانات النظام من السيرفر
  const [config, setConfig] = useState({ isOpen: false, manualOverride: null, timeLeftMessage: '' });
  const [places, setPlaces] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // السلة والتحكم بالمنتجات
  const [cart, setCart] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null); // المحل المفتوح حالياً لعرض منتجاته
  const [currentCustomizingProduct, setCurrentCustomizingProduct] = useState(null); // المنتج الجاري إعداده للإضافة
  const [customQty, setCustomQty] = useState(1);
  const [customNotes, setCustomNotes] = useState('');
  const [showCart, setShowCart] = useState(false);

  // حالات حفظ الطلب
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderFeedback, setOrderFeedback] = useState({ type: '', message: '' });

  // 1. استدعاء الاسم وحالة النظام عند الإقلاع
  useEffect(() => {
    // التحقق من الاسم المخزن
    const storedName = localStorage.getItem('nagaf_soldier_name');
    if (storedName && storedName.trim()) {
      setUserName(storedName.trim());
      fetchUserBalance(storedName.trim());
    } else {
      setShowNamePopup(true);
    }

    // جلب حالة النظام والمطاعم والمنتجات
    async function loadSystemData() {
      try {
        await Promise.all([
          fetchConfig(),
          fetchPlaces(),
          fetchProducts()
        ]);
      } catch (err) {
        console.error('حدث خطأ في تحميل البيانات الأساسية:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSystemData();

    // تحديث التوقيت تلقائياً كل دقيقة
    const interval = setInterval(fetchConfig, 60000);
    return () => clearInterval(interval);
  }, []);

  // جلب رصيد المستخدم
  const fetchUserBalance = async (name) => {
    try {
      const res = await fetch(`/api/balances?userName=${encodeURIComponent(name)}`);
      const data = await res.json();
      if (data.success) {
        setUserBalance(data.balance);
      }
    } catch (e) {
      console.error('فشل جلب الرصيد');
    }
  };

  const fetchConfig = async () => {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (data.success) {
      setConfig({
        isOpen: data.isOpen,
        manualOverride: data.manualOverride,
        timeLeftMessage: data.timeLeftMessage
      });
    }
  };

  const fetchPlaces = async () => {
    const res = await fetch('/api/places');
    const data = await res.json();
    if (data.success) {
      // إظهار المحلات المفعلة فقط للعساكر
      setPlaces(data.places.filter(p => p.enabled));
    }
  };

  const fetchProducts = async () => {
    const res = await fetch('/api/products');
    const data = await res.json();
    if (data.success) setProducts(data.products);
  };

  // 2. معالجة حفظ الاسم لأول مرة
  const handleSaveName = (e) => {
    e.preventDefault();
    if (!tempName.trim()) {
      alert('اكتب اسمك يا عسكري، الهروب من كشف الفطار خيانة! 🪖');
      return;
    }

    const finalName = tempName.trim();
    localStorage.setItem('nagaf_soldier_name', finalName);
    setUserName(finalName);
    setShowNamePopup(false);
    fetchUserBalance(finalName);
  };

  // تغيير الاسم المسجل (انصراف وتغيير نوبة)
  const handleChangeName = () => {
    if (confirm('هل تريد تغيير الاسم وتسجيل اسم عسكري آخر؟')) {
      localStorage.removeItem('nagaf_soldier_name');
      setUserName('');
      setTempName('');
      setShowNamePopup(true);
      setCart([]);
    }
  };

  // 3. التحكم في السلة
  const openCustomizer = (product) => {
    setCurrentCustomizingProduct(product);
    setCustomQty(1);
    setCustomNotes('');
  };

  const handleAddToCart = () => {
    if (!currentCustomizingProduct) return;

    const existingItemIndex = cart.findIndex(
      item => item.productId === currentCustomizingProduct.id
    );

    const newItem = {
      productId: currentCustomizingProduct.id,
      name: currentCustomizingProduct.name,
      price: currentCustomizingProduct.price,
      placeId: currentCustomizingProduct.placeId,
      placeName: selectedPlace.name,
      quantity: Number(customQty) || 1,
      notes: customNotes.trim()
    };

    if (existingItemIndex > -1) {
      // إذا كان المنتج موجوداً مسبقاً، نقوم بتحديث الكمية والملاحظات
      const updatedCart = [...cart];
      updatedCart[existingItemIndex].quantity = Number(customQty);
      updatedCart[existingItemIndex].notes = customNotes.trim();
      setCart(updatedCart);
    } else {
      setCart([...cart, newItem]);
    }

    setCurrentCustomizingProduct(null);
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const updateCartQty = (productId, newQty) => {
    const qty = Math.max(1, Number(newQty) || 1);
    setCart(cart.map(item =>
      item.productId === productId ? { ...item, quantity: qty } : item
    ));
  };

  const updateCartNotes = (productId, notesText) => {
    setCart(cart.map(item =>
      item.productId === productId ? { ...item, notes: notesText } : item
    ));
  };

  // حساب المجموع الكلي للسلة
  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  // 4. إرسال الطلب النهائي للسيرفر
  const handleOrderSubmit = async () => {
    if (cart.length === 0) return;
    setSubmittingOrder(true);
    setOrderFeedback({ type: '', message: '' });

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: userName,
          items: cart
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setOrderFeedback({ type: 'success', message: data.message });
        setCart([]); // تصفير السلة بعد النجاح
        setTimeout(() => {
          setShowCart(false);
          setOrderFeedback({ type: '', message: '' });
        }, 3000);
      } else {
        setOrderFeedback({ type: 'error', message: data.message || 'فشل إرسال طلبك للقائد!' });
      }
    } catch (err) {
      setOrderFeedback({ type: 'error', message: 'الاتصال مقطوع مع غرفة العمليات! حاول مرة أخرى 💥' });
    } finally {
      setSubmittingOrder(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '20px' }}>
        <span style={{ fontSize: '5rem' }}>⏳</span>
        <h2>جاري فحص الميدان وتجهيز الكتائب...</h2>
      </div>
    );
  }

  return (
    <div>
      {/* 1. نافذة الاسم المخصصة لأول مرة */}
      {showNamePopup && (
        <div className="custom-modal-overlay">
          <div className="custom-modal" style={{ maxWidth: '450px' }}>
            <div className="custom-modal-body name-popup-wrapper" style={{ padding: '40px 30px' }}>
              <div className="soldier-salute-icon">🫡</div>
              <h2 className="name-popup-title">ثبت اسمك يا عسكري! 🪖</h2>
              <p className="name-popup-desc">
                أهلاً بك في منظومة نجف العسكرية لتأمين وجبات العساكر. اكتب اسمك هنا عشان تظهر كشوفاتك عند القائد ويوافق على طلب فطارك اليوم.
              </p>

              <form onSubmit={handleSaveName}>
                <div className="form-group" style={{ marginBottom: '25px' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ textAlign: 'center', fontSize: '1.2rem', padding: '14px' }}
                    placeholder="اكتب اسمك الثلاثي هنا يا بطل..."
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <button type="submit" className="btn-military btn-military-gold" style={{ width: '100%', padding: '14px', fontSize: '1.1rem' }}>
                  سجل حضور في كشوف الأكل ✍️🥖
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* هيدر العسكري */}
      <header className="hud-header">
        <div className="hud-title-container">
          <span className="hud-logo">🎖️</span>
          <div>
            <h1 className="hud-title">منظومة نجف لفطار العساكر 🧆</h1>
            <span className="hud-badge">كتيبة التموين الغذائي</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {userName && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontWeight: 'bold' }}>🫡 جندي أح: {userName}</span>
            </div>
          )}
        </div>
      </header>

      <div className="page-container">

        {/* 2. تنبيه الأرصدة المتبقية (الباقي) */}
        {userName && userBalance !== 0 && (
          <section className="alert-balance-banner">
            <span style={{ fontSize: '2.5rem' }}>💰</span>
            <div className="alert-balance-text">
              {userBalance > 0 ? (
                <>
                  انتباه يا جنرال! ليك باقي أمانات في الخزنة قدره <span>{userBalance} جنيه</span>. روح اطلب فطارك وخصمهم من الحساب عند الاستلام! 💸🫡
                </>
              ) : (
                <>
                  ⚠️ انذار عسكري عاجل! عليك مديونية عجز مستحقة قدرها <span>{Math.abs(userBalance)} جنيه</span>. سدد العجز فوراً في الخزنة لتجنب المحاكمة العسكرية! 🚨🪖
                </>
              )}
            </div>
          </section>
        )}

        {/* 3. صندوق حالة الطابور والتوقيت */}
        <section className="status-bar">
          <div className="status-indicator">
            <span className={`dot ${config.isOpen ? 'open' : 'closed'}`}></span>
            <span className="status-text">
              حالة الطلبات: {config.isOpen ? 'مفتوح واطلب فطارك 🔓🥖' : 'مغلق بالأمر السيادي 🔒'}
            </span>
          </div>
          <span className="status-desc" style={{ fontWeight: 'bold' }}>
            {config.isOpen
              ? (config.timeLeftMessage || 'اطلب فطارك قبل إغلاق الباب ⏱️')
              : '🚫 طابور الفطار بيفتح تلقائياً من 7:00 ص لـ 11:00 ص كل يوم.'
            }
          </span>
        </section>

        {/* 4. قائمة المطاعم المتاحة */}
        <section style={{ marginBottom: '20px' }}>
          <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🏪 المطاعم المتاحة للطلب اليوم
          </h2>

          {places.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
              <span style={{ fontSize: '4rem' }}>🫙</span>
              <h3>مفيش مطاعم جاهزة لتموين الكتيبة حالياً. القائد العام شغال على القائمة!</h3>
            </div>
          ) : (
            <div className="places-grid">
              {places.map((place) => (
                <div
                  key={place.id}
                  className="place-card"
                  onClick={() => setSelectedPlace(place)}
                >
                  <div className="place-image-wrapper">
                    {place.image ? (
                      <img src={place.image} alt={place.name} className="place-image" />
                    ) : (
                      '🧆'
                    )}
                  </div>
                  <div className="place-info">
                    <h3 className="place-name">{place.name}</h3>
                    <span className="place-status-tag open" style={{ marginTop: 'auto' }}>
                      مفتوح للطلب 🛡️
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 5. نافذة منبثقة لعرض منتجات المطعم المحدد */}
        {selectedPlace && (
          <div className="custom-modal-overlay" onClick={() => setSelectedPlace(null)}>
            <div className="custom-modal" style={{ maxWidth: '650px' }} onClick={(e) => e.stopPropagation()}>

              <div className="custom-modal-header">
                <span className="custom-modal-title">🏪 قائمة منتجات: {selectedPlace.name}</span>
                <button className="custom-modal-close" onClick={() => setSelectedPlace(null)}>×</button>
              </div>

              <div className="custom-modal-body">
                {products.filter(p => p.placeId === selectedPlace.id).length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>مفيش أصناف متسجلة للمطعم ده لسه يا فندم!</p>
                ) : (
                  <div className="products-list-container">
                    {products
                      .filter(p => p.placeId === selectedPlace.id)
                      .map((product) => (
                        <div key={product.id} className="product-row">
                          <div className="product-left">
                            <div className="product-avatar">
                              {product.image ? (
                                <img src={product.image} alt={product.name} />
                              ) : (
                                '🍔'
                              )}
                            </div>
                            <div className="product-details">
                              <span className="product-title">{product.name}</span>
                              <span className="product-price">{product.price} جنيه</span>
                            </div>
                          </div>

                          <button
                            onClick={() => openCustomizer(product)}
                            className="btn-military btn-military-gold"
                            style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                            disabled={!config.isOpen}
                          >
                            {cart.some(item => item.productId === product.id) ? 'تعديل الأوردر ✏️' : 'إضافة للطلب ➕'}
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* 6. نافذة تخصيص كمية الصنف والملاحظات */}
        {currentCustomizingProduct && (
          <div className="custom-modal-overlay" onClick={() => setCurrentCustomizingProduct(null)}>
            <div className="custom-modal" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
              <div className="custom-modal-header">
                <span className="custom-modal-title">⚙️ تخصيص السلاح (الصنف)</span>
                <button className="custom-modal-close" onClick={() => setCurrentCustomizingProduct(null)}>×</button>
              </div>
              <div className="custom-modal-body">
                <h3 style={{ marginBottom: '15px', textAlign: 'center', color: '#fff' }}>{currentCustomizingProduct.name}</h3>

                <div className="form-group">
                  <label className="form-label">الكمية المطلوبة (العدد)</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn-military btn-military-secondary"
                      style={{ minWidth: '45px', padding: '10px' }}
                      onClick={() => setCustomQty(prev => Math.max(1, prev - 1))}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      className="form-input"
                      style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}
                      value={customQty}
                      onChange={(e) => setCustomQty(Math.max(1, Number(e.target.value) || 1))}
                      min="1"
                    />
                    <button
                      type="button"
                      className="btn-military btn-military-secondary"
                      style={{ minWidth: '45px', padding: '10px' }}
                      onClick={() => setCustomQty(prev => prev + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">ملاحظات خاصة (Notes) للتحضير</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="مثال: زيادة شطة، بدون بصل، الطعمية مقرمشة..."
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                  <button
                    onClick={handleAddToCart}
                    className="btn-military btn-military-primary"
                    style={{ flexGrow: 1 }}
                  >
                    تأكيد التعديل بالسلة 🫡🛒
                  </button>
                  <button
                    onClick={() => setCurrentCustomizingProduct(null)}
                    className="btn-military btn-military-secondary"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7. السلة العائمة وزر الاستدعاء */}
        {cart.length > 0 && (
          <button className="cart-floating-btn" onClick={() => setShowCart(true)}>
            🥖 أوردر النهارده
            <span className="badge-count">{cart.length} أصناف</span>
            <span>({getCartTotal()} جنيه)</span>
          </button>
        )}

        {/* 8. بوب اب سلة المشتريات (أوردر النهارده) */}
        {showCart && (
          <div className="custom-modal-overlay" onClick={() => setShowCart(false)}>
            <div className="custom-modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>

              <div className="custom-modal-header">
                <span className="custom-modal-title">🛒 سلة أوردر النهارده العسكرية</span>
                <button className="custom-modal-close" onClick={() => setShowCart(false)}>×</button>
              </div>

              <div className="custom-modal-body">
                {orderFeedback.message && (
                  <div style={{
                    backgroundColor: orderFeedback.type === 'success' ? 'rgba(57, 231, 95, 0.1)' : 'rgba(255, 77, 79, 0.1)',
                    border: `1px solid ${orderFeedback.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'}`,
                    color: orderFeedback.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>
                    {orderFeedback.message}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {cart.map((item) => (
                    <div key={item.productId} style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '10px',
                      padding: '15px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontWeight: '800', fontSize: '1.05rem' }}>{item.name} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({item.placeName})</span></span>
                        <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>{item.price * item.quantity} جنيه</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>العدد:</span>
                          <input
                            type="number"
                            className="form-input"
                            style={{ width: '60px', padding: '4px', textAlign: 'center' }}
                            value={item.quantity}
                            onChange={(e) => updateCartQty(item.productId, e.target.value)}
                            min="1"
                          />
                        </div>

                        <div style={{ flexGrow: 1, minWidth: '180px' }}>
                          <input
                            type="text"
                            className="form-input"
                            style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                            placeholder="ملاحظات الصنف..."
                            value={item.notes}
                            onChange={(e) => updateCartNotes(item.productId, e.target.value)}
                          />
                        </div>

                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="btn-military btn-military-danger"
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          حذف 🗑️
                        </button>
                      </div>
                    </div>
                  ))}

                  <div style={{
                    borderTop: '2px solid var(--border-glass)',
                    paddingTop: '15px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontWeight: '900',
                    fontSize: '1.2rem'
                  }}>
                    <span>الإجمالي المستحق للتسليم:</span>
                    <span style={{ color: 'var(--accent-green)' }}>{getCartTotal()} جنيه</span>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <button
                      onClick={handleOrderSubmit}
                      disabled={submittingOrder || !config.isOpen}
                      className="btn-military btn-military-gold"
                      style={{ flexGrow: 1, padding: '14px', fontSize: '1.1rem' }}
                    >
                      {submittingOrder ? 'جاري إرسال الإشارة للقيادة... 📡' : 'إرسال طلب اليوم للقائد 🫡🥖'}
                    </button>
                    <button
                      onClick={() => setShowCart(false)}
                      className="btn-military btn-military-secondary"
                    >
                      إغلاق السلة
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
