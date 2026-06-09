import "./globals.css";

export const metadata = {
  title: "منظومة نجف لعساكر الفطار 🫡🧆",
  description: "المنظومة العسكرية الأقوى لتسهيل وتنسيق طوابير الفطار وتعيين العساكر في المحلات والمطاعم المتاحة!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
