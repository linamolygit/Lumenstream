import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Video Streaming Ecosystem",
  description: "Clean proxy streaming platform with admin stream link management.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
