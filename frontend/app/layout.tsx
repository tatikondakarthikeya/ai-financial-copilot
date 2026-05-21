import type { Metadata } from "next";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";

export const metadata: Metadata = {
  title: "AI Financial Copilot - Smart Expense Tracking",
  description:
    "AI-powered expense tracking and financial insights. Categorize spending, detect subscriptions, and get plain-language summaries.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-inter flex min-h-screen bg-[#F8F9FE]">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
