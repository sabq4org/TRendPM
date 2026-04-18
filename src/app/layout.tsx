import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getLocale, getTheme, getAccent } from "@/lib/preferences";
import { dirFor } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Trend PM",
  description: "منصة إدارة المشاريع والمهام — ترند",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [locale, theme, accent] = await Promise.all([getLocale(), getTheme(), getAccent()]);
  const dir = dirFor(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      data-theme={theme}
      style={{ ["--accent-h" as string]: String(accent) }}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
