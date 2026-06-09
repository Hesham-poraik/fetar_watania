import { NextResponse } from 'next/server';
import { getSystemConfig, updateSystemConfig, isOrderingOpen } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/auth';

// جلب حالة النظام الحالية (هل الباب مفتوح؟ وما هو خيار التجاوز؟)
export async function GET() {
  try {
    const config = getSystemConfig();
    const isOpen = isOrderingOpen();
    
    // حساب الوقت المتبقي للقفل التلقائي إذا كنا في الوضع التلقائي وكان الطلب مفتوحاً
    // التلقائي يغلق الساعة 11:00 صباحاً
    let timeLeftMsg = '';
    if (config.manualOverride === null) {
      const now = new Date();
      const currentHour = now.getHours();
      if (currentHour >= 7 && currentHour < 11) {
        const remainingHours = 10 - currentHour;
        const remainingMinutes = 60 - now.getMinutes();
        timeLeftMsg = `متبقي حوالي ${remainingHours} ساعة و ${remainingMinutes} دقيقة على القفل التلقائي ⏱️`;
      }
    }

    return NextResponse.json({
      success: true,
      isOpen,
      manualOverride: config.manualOverride,
      timeLeftMessage: timeLeftMsg,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'فشل جلب إعدادات النظام' }, { status: 500 });
  }
}

// تعديل خيار التجاوز اليدوي (للأدمن فقط)
export async function POST(request) {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ success: false, message: 'غير مصرح لك يا عسكري! للقيادة فقط 👮‍♂️' }, { status: 403 });
    }

    const { manualOverride } = await request.json(); // يمكن أن يكون true أو false أو null
    
    const updatedConfig = updateSystemConfig(manualOverride);
    const isOpen = isOrderingOpen();
    
    let message = '⚙️ تم تعديل وضع النظام بنجاح يا قائد 🫡';
    if (manualOverride === true) {
      message = '📢 انتباه! تم فتح باب الفطار للجميع يدوياً (مفتوح دائماً) 🫡🥖';
    } else if (manualOverride === false) {
      message = '🔒 انتباه! تم إغلاق باب الفطار يدوياً بقرار سيادي (مغلق دائماً) 🫡❌';
    } else {
      message = '⏰ تم إعادة النظام للوضع التلقائي (يفتح 7 صباحاً ويغلق 11 صباحاً) 🫡⏱️';
    }

    return NextResponse.json({
      success: true,
      message,
      config: updatedConfig,
      isOpen
    });
  } catch (error) {
    console.error('خطأ في تعديل إعدادات النظام:', error);
    return NextResponse.json({ success: false, message: 'فشل تعديل إعدادات النظام' }, { status: 500 });
  }
}
