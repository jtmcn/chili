import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Permanent_Marker } from "next/font/google";
import "./globals.css";

const potFont = Permanent_Marker({
  variable: "--font-permanent-marker",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const bodyFont = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Overlook Chili Cook-Off",
};

export const viewport: Viewport = {
  themeColor: "#1D3F8F",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${potFont.variable} ${bodyFont.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-plate font-body text-ink antialiased">{children}</body>
    </html>
  );
}
