import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const simpler = localFont({
  variable: "--font-simpler",
  display: "swap",
  src: [
    { path: "../public/fonts/SimplerPro_HLAR-Light.otf", weight: "300" },
    { path: "../public/fonts/SimplerPro_HLAR-Regular.otf", weight: "400" },
    { path: "../public/fonts/SimplerPro_HLAR-Semibold.otf", weight: "600" },
    { path: "../public/fonts/SimplerPro_HLAR-Bold.otf", weight: "700" },
    { path: "../public/fonts/SimplerPro_HLAR-Black.otf", weight: "900" },
  ],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://shiri-fit.vercel.app"),
  openGraph: { title: "Shiri Fit", description: "האימונים של שירי", siteName: "Shiri Fit", locale: "he_IL", type: "website" },
  title: { default: "Shiri Fit", template: "%s · Shiri Fit" },
  description: "האימונים של שירי",
  applicationName: "Shiri Fit",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Shiri Fit" },
  icons: { apple: "/icons/apple-touch-icon.png?v=2", icon: "/icons/icon.svg?v=2" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f3ee" },
    { media: "(prefers-color-scheme: dark)", color: "#171412" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl" className={`${simpler.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
