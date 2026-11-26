import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "km/h Speedometer",
  description: "GPS speedometer in km/h for cars that only show mph.",
  manifest: "/kmh-speedometer/manifest.webmanifest",
  icons: { icon: "/kmh-speedometer/icon.svg", apple: "/kmh-speedometer/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "km/h", statusBarStyle: "black-translucent" },
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#05070a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
