import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ success: false, message: 'غير مصرح لك يا عسكري! للقيادة فقط 👮‍♂️' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ success: false, message: 'لم يتم اختيار ملف لرفعه يا بطل' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // إنشاء مسار حفظ الملفات في المجلد العام public/uploads
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // توليد اسم فريد للملف لتفادي الكتابة فوق الملفات القديمة
    const fileExtension = path.extname(file.name) || '.jpg';
    const fileName = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    // حفظ الملف
    fs.writeFileSync(filePath, buffer);

    // العودة بالمسار النسبي الذي يمكن استخدامه مباشرة في كارت الصورة بالمتصفح
    const relativePath = `/uploads/${fileName}`;

    return NextResponse.json({
      success: true,
      message: '📸 تم رفع الصورة بنجاح يا قائد 🫡',
      url: relativePath
    });
  } catch (error) {
    console.error('خطأ أثناء رفع الملف:', error);
    return NextResponse.json({ success: false, message: 'حدث خطأ أثناء رفع الصورة بالخادم' }, { status: 500 });
  }
}
