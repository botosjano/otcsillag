import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { LenisProvider } from "@/components/LenisProvider";
import { CookieConsent } from "@/components/CookieConsent";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://otcsillag.hu"),
  applicationName: "Ötcsillag",
  title: {
    default: "Ötcsillag – Google-értékeléskérés automatikusan",
    template: "%s – Ötcsillag",
  },
  description:
    "A jó munkád ötcsillagos nyomot hagy. Küldj Google-értékeléskérést SMS-ben vagy e-mailben pár érintéssel, és lásd a kézbesítést és a kattintást.",
  icons: {
    icon: [{ url: "/icon-192.png", type: "image/png", sizes: "192x192" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f4f7ff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/* Ha a JS egyáltalán nem fut le, a .reveal elemek a statikus CSS miatt
            opacity:0-n maradnának -- ez felülírja azokat láthatóra. */}
        <noscript>
          <style>{`.reveal { opacity: 1 !important; transform: none !important; }`}</style>
        </noscript>
        <LenisProvider />
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
