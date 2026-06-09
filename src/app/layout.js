import "./globals.css";

export const metadata = {
  title: "منظومة نجف لعساكر الفطار 🫡🧆",
  description: "المنظومة العسكرية الأقوى لتسهيل وتنسيق طوابير الفطار وتعيين العساكر في المحلات والمطاعم المتاحة!",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧆</text></svg>",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
