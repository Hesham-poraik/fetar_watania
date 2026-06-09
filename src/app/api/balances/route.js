import { NextResponse } from 'next/server';
import { getBalances, updateBalance, readDb } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/auth';

// جلب الأرصدة كلها أو رصيد عسكري محدد
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userName = searchParams.get('userName');
    const balances = getBalances();
    
    if (userName) {
      const userBalance = balances[userName.trim()] ?? 0;
      return NextResponse.json({ success: true, balance: userBalance });
    }

    // دمج كل العساكر: اللي عندهم رصيد + اللي عملوا أوردرات في أي تاريخ
    const db = readDb();
    const allOrders = db.orders || {};
    const mergedBalances = { ...balances };

    Object.values(allOrders).forEach((dayOrders) => {
      dayOrders.forEach((order) => {
        const name = order.userName?.trim();
        if (name && !(name in mergedBalances)) {
          mergedBalances[name] = 0;
        }
      });
    });

    return NextResponse.json({ success: true, balances: mergedBalances });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'فشل جلب الأرصدة' }, { status: 500 });
  }
}

// تعديل رصيد عسكري (للأدمن فقط)
export async function POST(request) {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ success: false, message: 'غير مصرح لك يا عسكري! للقيادة فقط 👮‍♂️' }, { status: 403 });
    }

    const { userName, amount } = await request.json();
    
    if (!userName || userName.trim() === '') {
      return NextResponse.json({ success: false, message: 'اسم العسكري مطلوب لتعديل الرصيد' }, { status: 400 });
    }

    const updatedBalances = updateBalance(userName, amount);
    return NextResponse.json({
      success: true,
      message: `💰 تم تعديل رصيد العسكري "${userName}" إلى ${amount} جنيه بنجاح يا قائد 🫡`,
      balances: updatedBalances
    });
  } catch (error) {
    console.error('خطأ في تعديل الرصيد:', error);
    return NextResponse.json({ success: false, message: 'فشل تعديل رصيد العسكري' }, { status: 500 });
  }
}
