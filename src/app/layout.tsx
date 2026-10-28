import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#211A1D",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "AFTERTHOUGHT — The Last Room Awake",
  description: "A little corner of the internet that belongs only to you. A personal diary for nocturnal thoughts.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌙</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark bg-[#211A1D]">
      <body className="bg-[#211A1D] text-[#F0E8DF] antialiased min-h-screen selection:bg-[#D78A70]/30 selection:text-[#FAF6F0] overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
