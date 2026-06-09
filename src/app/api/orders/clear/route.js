import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/auth';

// مسح كل الطلبات من كل التواريخ مع الحفاظ على الأرصدة
export async function POST() {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ success: false, message: 'غير مصرح لك يا عسكري! 👮‍♂️' }, { status: 403 });
    }

    const db = readDb();

    // امسح كل الطلبات من كل التواريخ
    db.orders = {};

    writeDb(db);

    return NextResponse.json({
      success: true,
      message: '🎖️ تم فتح المأمورية الجديدة بنجاح! كل طلبات المأمورية السابقة اتمسحت والأرصدة اتحفظت. 🫡'
    });
  } catch (err) {
    console.error('خطأ في مسح الطلبات:', err);
    return NextResponse.json({ success: false, message: 'فشل تنفيذ أمر فتح المأمورية الجديدة!' }, { status: 500 });
  }
}
