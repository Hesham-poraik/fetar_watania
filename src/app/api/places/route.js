import { NextResponse } from 'next/server';
import { getPlaces, savePlace, deletePlace } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/auth';

// جلب كل المحلات
export async function GET() {
  try {
    const places = getPlaces();
    return NextResponse.json({ success: true, places });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'فشل جلب الأماكن' }, { status: 500 });
  }
}

// إضافة أو تعديل محل (للأدمن فقط)
export async function POST(request) {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ success: false, message: 'غير مصرح لك يا عسكري! للقيادة فقط 👮‍♂️' }, { status: 403 });
    }

    const placeData = await request.json();
    if (!placeData.name) {
      return NextResponse.json({ success: false, message: 'اسم المحل مطلوب يا بطل' }, { status: 400 });
    }

    const updatedPlaces = savePlace(placeData);
    return NextResponse.json({ success: true, places: updatedPlaces });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'فشل حفظ المحل' }, { status: 500 });
  }
}

// حذف محل (للأدمن فقط)
export async function DELETE(request) {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ success: false, message: 'غير مصرح لك يا عسكري! للقيادة فقط 👮‍♂️' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ success: false, message: 'المعرف مطلوب للحذف' }, { status: 400 });
    }

    const result = deletePlace(id);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'فشل حذف المحل' }, { status: 500 });
  }
}
