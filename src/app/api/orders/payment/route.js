import { NextResponse } from 'next/server';
import { updateOrderPayment } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/auth';

// تحديث المبلغ المدفوع لطلب ما (للأدمن فقط)
export async function POST(request) {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ success: false, message: 'غير مصرح لك يا عسكري! للقيادة فقط 👮‍♂️' }, { status: 403 });
    }

    const { orderId, paidAmount, date } = await request.json();
    
    if (!orderId) {
      return NextResponse.json({ success: false, message: 'معرف الطلب مطلوب لتحديث الدفع' }, { status: 400 });
    }

    const updatedOrder = updateOrderPayment(orderId, paidAmount, date);
    if (!updatedOrder) {
      return NextResponse.json({ success: false, message: 'الطلب غير موجود في هذا التاريخ' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: '💰 تم تحديث الحساب وحساب الباقي بنجاح يا قائد 🫡',
      order: updatedOrder
    });
  } catch (error) {
    console.error('خطأ في تحديث الدفع للطلب:', error);
    return NextResponse.json({ success: false, message: 'فشل تحديث بيانات الدفع' }, { status: 500 });
  }
}
