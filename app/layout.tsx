import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { getAppTitle } from "@/lib/vault-config";
import "./globals.css";

export const metadata: Metadata = {
  title: getAppTitle(),
  description: "Validate HashiCorp Vault credentials and test API endpoints for login, token lookup, and secret retrieval",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
