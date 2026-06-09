import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'db.json');

// قراءة قاعدة البيانات بأمان
export function readDb() {
  try {
    if (!fs.existsSync(dbPath)) {
      const defaultData = {
        places: [],
        products: [],
        orders: {},
        balances: {},
        config: { manualOverride: null }
      };
      fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    const data = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('حدث خطأ أثناء قراءة قاعدة البيانات:', error);
    return {
      places: [],
      products: [],
      orders: {},
      balances: {},
      config: { manualOverride: null }
    };
  }
}

// حفظ قاعدة البيانات بأمان
export function writeDb(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('حدث خطأ أثناء كتابة قاعدة البيانات:', error);
    return false;
  }
}

// جلب المطاعم والمحلات
export function getPlaces() {
  const db = readDb();
  return db.places || [];
}

// حفظ أو إضافة مطعم
export function savePlace(place) {
  const db = readDb();
  if (!db.places) db.places = [];
  
  if (place.id) {
    // تعديل
    db.places = db.places.map(p => p.id === place.id ? { ...p, ...place } : p);
  } else {
    // إضافة جديد
    const newPlace = {
      ...place,
      id: 'place_' + Date.now()
    };
    db.places.push(newPlace);
  }
  
  writeDb(db);
  return db.places;
}

// جلب المنتجات
export function getProducts() {
  const db = readDb();
  return db.products || [];
}

// حفظ أو إضافة منتج
export function saveProduct(product) {
  const db = readDb();
  if (!db.products) db.products = [];
  
  // التأكد من أن السعر رقم
  product.price = Number(product.price) || 0;

  if (product.id) {
    // تعديل
    db.products = db.products.map(p => p.id === product.id ? { ...p, ...product } : p);
  } else {
    // إضافة جديد
    const newProduct = {
      ...product,
      id: 'prod_' + Date.now()
    };
    db.products.push(newProduct);
  }
  
  writeDb(db);
  return db.products;
}

// حذف منتج
export function deleteProduct(productId) {
  const db = readDb();
  db.products = (db.products || []).filter(p => p.id !== productId);
  writeDb(db);
  return db.products;
}

// حذف مطعم والمنتجات المرتبطة به
export function deletePlace(placeId) {
  const db = readDb();
  db.places = (db.places || []).filter(p => p.id !== placeId);
  db.products = (db.products || []).filter(p => p.placeId !== placeId);
  writeDb(db);
  return { places: db.places, products: db.products };
}

// الحصول على التاريخ الحالي بصيغة YYYY-MM-DD لتصنيف طلبات اليوم
export function getTodayDateString() {
  // استخدام توقيت القاهرة أو توقيت السيرفر المحلي
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// جلب طلبات تاريخ معين
export function getOrders(date = getTodayDateString()) {
  const db = readDb();
  if (!db.orders) db.orders = {};
  return db.orders[date] || [];
}

// حفظ طلب لعسكري اليوم
export function submitOrder(userName, items) {
  const db = readDb();
  if (!db.orders) db.orders = {};
  const today = getTodayDateString();
  if (!db.orders[today]) db.orders[today] = [];

  // إزالة الطلب القديم لنفس العسكري إن وجد
  db.orders[today] = db.orders[today].filter(o => o.userName.trim().toLowerCase() !== userName.trim().toLowerCase());

  // حساب إجمالي الطلب
  const totalCost = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const newOrder = {
    id: 'order_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    userName: userName.trim(),
    items: items.map(item => ({
      productId: item.productId,
      name: item.name,
      placeId: item.placeId,
      placeName: item.placeName,
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 1,
      notes: item.notes || ''
    })),
    paidAmount: 0, // يملأه الأدمن لاحقاً
    change: 0, // يتم حسابه لاحقاً
    totalCost: totalCost,
    timestamp: new Date().toISOString()
  };

  db.orders[today].push(newOrder);
  writeDb(db);
  return newOrder;
}

// تحديث تفاصيل الدفع لطلب عسكري
export function updateOrderPayment(orderId, paidAmount, date = getTodayDateString()) {
  const db = readDb();
  if (!db.orders || !db.orders[date]) return null;

  let updatedOrder = null;
  db.orders[date] = db.orders[date].map(order => {
    if (order.id === orderId) {
      const paid = Number(paidAmount) || 0;
      const change = paid - order.totalCost;
      updatedOrder = {
        ...order,
        paidAmount: paid,
        change: change
      };
      
      // تحديث الرصيد تلقائياً إذا كان هناك باقي للعسكري
      // إذا دفع العسكري أكثر مما عليه، الباقي يضاف لرصيده
      // وإذا كان الرصيد يحتاج تحديث، الأدمن يمكنه تعديله أيضاً يدوياً في صفحة الأرصدة
      return updatedOrder;
    }
    return order;
  });

  writeDb(db);
  return updatedOrder;
}

// حذف طلب عسكري بالكامل (للأدمن)
export function deleteOrder(orderId, date = getTodayDateString()) {
  const db = readDb();
  if (!db.orders || !db.orders[date]) return false;

  db.orders[date] = db.orders[date].filter(order => order.id !== orderId);
  writeDb(db);
  return true;
}

// جلب أرصدة العملاء
export function getBalances() {
  const db = readDb();
  return db.balances || {};
}

// تعديل رصيد عسكري
export function updateBalance(userName, amount) {
  const db = readDb();
  if (!db.balances) db.balances = {};
  db.balances[userName.trim()] = Number(amount) || 0;
  writeDb(db);
  return db.balances;
}

// جلب إعدادات فتح وقفل الطلبات اليومية
export function getSystemConfig() {
  const db = readDb();
  return db.config || { manualOverride: null };
}

// تعديل إعدادات الطلبات
export function updateSystemConfig(manualOverride) {
  const db = readDb();
  if (!db.config) db.config = {};
  db.config.manualOverride = manualOverride;
  writeDb(db);
  return db.config;
}

// دالة لمعرفة هل باب الطلبات مفتوح حالياً أم مغلق
export function isOrderingOpen() {
  const db = readDb();
  const override = db.config?.manualOverride;
  
  if (override === true) return true;
  if (override === false) return false;
  
  // الوضع التلقائي: يفتح من 7:00 صباحاً وحتى 11:00 صباحاً
  const now = new Date();
  const currentHour = now.getHours();
  // بما أن التوقيت المحلي قد يختلف، نعتمد على الساعة المحلية للخادم/العميل
  return currentHour >= 7 && currentHour < 11;
}
