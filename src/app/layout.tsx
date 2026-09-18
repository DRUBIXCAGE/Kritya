import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kritya | Travelocase Enterprise CRM & Flight Operations",
  description: "Kritya by Travelocase - Enterprise CRM with flight booking manifests, PCI card security vault, multi-department RBAC, and automated state transitions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen font-sans antialiased selection:bg-indigo-500 selection:text-white" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}


