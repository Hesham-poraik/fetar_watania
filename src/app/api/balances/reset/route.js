import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/auth';

export async function POST() {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ success: false, message: 'غير مصرح لك يا عسكري! 👮‍♂️' }, { status: 403 });
    }

    const db = readDb();
    // تصفير جميع الأرصدة بالكامل
    db.balances = {};
    writeDb(db);

    return NextResponse.json({
      success: true,
      message: '🧹 تم تصفير جميع أرصدة العساكر ومسح الديون والباقي بالكامل! 🫡'
    });
  } catch (error) {
    console.error('خطأ في تصفير الأرصدة:', error);
    return NextResponse.json({ success: false, message: 'فشل تصفير الأرصدة' }, { status: 500 });
  }
}
