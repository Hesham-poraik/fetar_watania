import { NextResponse } from 'next/server';
import { getProducts, saveProduct, deleteProduct } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/auth';

// جلب كل المنتجات
export async function GET() {
  try {
    const products = getProducts();
    return NextResponse.json({ success: true, products });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'فشل جلب المنتجات' }, { status: 500 });
  }
}

// إضافة أو تعديل منتج (للأدمن فقط)
export async function POST(request) {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ success: false, message: 'غير مصرح لك يا عسكري! للقيادة فقط 👮‍♂️' }, { status: 403 });
    }

    const productData = await request.json();
    if (!productData.name || !productData.placeId || productData.price === undefined) {
      return NextResponse.json({ success: false, message: 'بيانات المنتج غير كاملة يا بطل' }, { status: 400 });
    }

    const updatedProducts = saveProduct(productData);
    return NextResponse.json({ success: true, products: updatedProducts });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'فشل حفظ المنتج' }, { status: 500 });
  }
}

// حذف منتج (للأدمن فقط)
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

    const updatedProducts = deleteProduct(id);
    return NextResponse.json({ success: true, products: updatedProducts });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'فشل حذف المنتج' }, { status: 500 });
  }
}
