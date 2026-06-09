import { NextResponse } from 'next/server';
import { getOrders, submitOrder, isOrderingOpen, getTodayDateString } from '@/lib/db';

// جلب طلبات اليوم أو تاريخ معين
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || getTodayDateString();
    const orders = getOrders(date);
    return NextResponse.json({ success: true, orders });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'فشل جلب الطلبات' }, { status: 500 });
  }
}

// تقديم طلب جديد (أو تعديل طلب اليوم لعسكري)
export async function POST(request) {
  try {
    // التحقق أولاً من أن باب الطلبات مفتوح
    if (!isOrderingOpen()) {
      return NextResponse.json({
        success: false,
        message: '🔒 الطابور مقفول يا عسكري! القائد قفل الطلبات لليوم أو برة مواعيد الهجوم الرسمية (من 7 لـ 11 صباحاً). ارجع الخدمة وتأدب! 🫡'
      }, { status: 400 });
    }

    const { userName, items } = await request.json();
    
    if (!userName || !userName.trim()) {
      return NextResponse.json({ success: false, message: 'فين اسمك يا عسكري؟ السلاح بدون اسم لا يضرب! 🪖' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: 'فين طلبك؟ السلة فاضية زي بطن العسكري المستجد! 🥖' }, { status: 400 });
    }

    const order = submitOrder(userName, items);
    return NextResponse.json({
      success: true,
      message: '✅ تمام يا فندم! أوردرك اتسجل في الدفتر العسكري وجاري التجهيز للمعركة! 🫡🥖',
      order
    });
  } catch (error) {
    console.error('خطأ في إرسال الأوردر:', error);
    return NextResponse.json({ success: false, message: 'حدث خطأ غير متوقع أثناء إرسال طلبك 💥' }, { status: 500 });
  }
}
