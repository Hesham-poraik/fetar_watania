import { NextResponse } from 'next/server';
import { setAdminSession } from '@/lib/auth';

export async function POST(request) {
  try {
    const { username, password } = await request.json();
    
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'nagaf_leader_2026';
    
    if (username === adminUser && password === adminPass) {
      await setAdminSession();
      return NextResponse.json({ success: true, message: 'تمام يا فندم! تم تسجيل الدخول بنجاح 🫡' });
    }
    
    return NextResponse.json(
      { success: false, message: 'غلط يا عسكري! الاسم أو الباسورد غلط، انتباه وركز! ❌' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'حدث خطأ في الاتصال بالخادم 💥' },
      { status: 500 }
    );
  }
}
