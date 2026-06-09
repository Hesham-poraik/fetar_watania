import { NextResponse } from 'next/server';
import { deleteOrder } from '@/lib/db';

export async function POST(request) {
  try {
    const { orderId, date } = await request.json();

    if (!orderId) {
      return NextResponse.json({ success: false, message: 'يا قائد! ID الطلب ناقص في الأمر!' }, { status: 400 });
    }

    const result = deleteOrder(orderId, date);

    if (!result) {
      return NextResponse.json({ success: false, message: 'الطلب مش موجود أصلاً يا فندم!' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: '✅ تم تنفيذ أمر الإبادة للطلب بنجاح يا قائد! 🗑️🫡' });
  } catch (err) {
    console.error('خطأ أثناء حذف الطلب:', err);
    return NextResponse.json({ success: false, message: 'حدث خطأ عسكري غير متوقع أثناء تنفيذ أمر الحذف!' }, { status: 500 });
  }
}
