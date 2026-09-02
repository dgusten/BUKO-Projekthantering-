import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BUKO Sverige – Ärendehantering",
  description: "Ärendehantering för TA-planer",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  );
}
