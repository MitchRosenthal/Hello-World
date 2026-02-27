import { AuthStatus } from "@/components/AuthStatus";
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hello World",
  description: "Hello World app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <header className="border-b border-[var(--foreground)]/10 bg-[var(--background)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-semibold text-[var(--foreground)]">
              Humor Study
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/upload"
                className="text-sm font-medium text-[var(--foreground)]/80 hover:text-[var(--foreground)]"
              >
                Upload
              </Link>
              <AuthStatus />
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
