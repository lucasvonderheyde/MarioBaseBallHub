import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/Nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mario Baseball Hub",
  description: "League schedule, rosters, trades, and game stats",
};

const themeInitScript = `(function(){try{var t=localStorage.getItem("msb-theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){document.documentElement.classList.add("dark");document.documentElement.dataset.theme="dark";}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col text-zinc-100">
        <Nav />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
