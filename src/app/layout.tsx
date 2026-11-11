import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { RegisterSW } from "@/components/RegisterSW";
import { AutoRefresh } from "@/components/AutoRefresh";

export const metadata: Metadata = {
  title: "Ghar ka Menu",
  description: "Our weekly menu, shopping lists and messages for the cook",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Menu", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#17130f" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <main className="mx-auto max-w-xl px-4 pt-[max(1rem,env(safe-area-inset-top))]">{children}</main>
        <BottomNav />
        <RegisterSW />
        <AutoRefresh />
      </body>
    </html>
  );
}
