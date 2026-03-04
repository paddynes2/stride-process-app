import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { OfflineBanner } from "@/components/ui/offline-banner";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s — Stride",
    default: "Stride — Process Mapping & Continuous Improvement",
  },
  description: "Map it, score it, fix it, run it. The operating system for business process improvement.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__testErrors=[];const _ce=console.error;console.error=function(){window.__testErrors.push([Date.now(),...arguments]);_ce.apply(console,arguments)};window.addEventListener('error',function(e){window.__testErrors.push([Date.now(),e.message,e.filename,e.lineno])});window.addEventListener('unhandledrejection',function(e){window.__testErrors.push([Date.now(),'UnhandledRejection',String(e.reason)])});`,
          }}
        />
        <OfflineBanner />
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
              fontSize: "var(--text-sm)",
            },
          }}
        />
      </body>
    </html>
  );
}
