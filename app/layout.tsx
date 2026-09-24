import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "RSMS Reimagined — Student Portal",
  description: "A considered student workspace for academics and campus life. Independent demonstration using fictional data.",
  other: {
    "codex-preview": "development",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "RSMS", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/rsms-icon-192-v42.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.svg",
    apple: [
      { url: "/rsms-apple-touch-180-v42.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#112b40",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased"><PwaRegister/>{children}</body>
    </html>
  );
}
