import crypto from 'crypto';
import { cookies } from 'next/headers';

const SECRET = process.env.JWT_SECRET || 'nagaf_fallback_secret_soldier_key_2026';
const COOKIE_NAME = 'nagaf_admin_session';

// إنشاء رمز توقيع رقمي للمصادقة لمنع التلاعب بالوقت
function generateSignature(data) {
  return crypto.createHmac('sha256', SECRET).update(data).digest('hex');
}

// إنشاء توكن الجلسة (صالح لمدة 7 أيام)
export function createSessionToken() {
  const expires = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const data = `admin|${expires}`;
  const signature = generateSignature(data);
  return `${data}|${signature}`;
}

// التحقق من صحة توكن الجلسة
export function verifySessionToken(token) {
  if (!token) return false;
  
  try {
    const parts = token.split('|');
    if (parts.length !== 3) return false;
    
    const [user, expiresStr, signature] = parts;
    const expires = parseInt(expiresStr, 10);
    
    if (isNaN(expires) || expires < Date.now()) {
      return false; // منتهي الصلاحية
    }
    
    const data = `${user}|${expires}`;
    const expectedSignature = generateSignature(data);
    
    return signature === expectedSignature;
  } catch (error) {
    console.error('خطأ أثناء التحقق من التوكن:', error);
    return false;
  }
}

// دالة للتحقق من هوية الأدمن من خلال الطلب
export async function isAdminAuthenticated() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    return verifySessionToken(token);
  } catch (e) {
    return false;
  }
}

// وضع الكوكي للأدمن
export async function setAdminSession() {
  const token = createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 أيام
    path: '/'
  });
}

// مسح كوكي الأدمن
export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
