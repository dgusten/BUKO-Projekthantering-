import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "BUKO Sverige – Ärendehantering",
  description: "Ärendehantering för TA-planer",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="sv">
      <body>
        <div className="shell">
          <Sidebar />
          <div className="main">{children}</div>
        </div>
      </body>
    </html>
  );
}
