import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Account Statement Reader",
  description: "An application to read and analyze bank account statements",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-100 text-slate-900 min-h-screen transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100`}
      >
        <main className="container mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
