import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Wildfire Monitor",
  description: "Real-time wildfire risk monitoring, ML-driven early warning and decision support",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          theme="dark"
          toastOptions={{
            style: {
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              fontFamily: "inherit",
              fontSize: "0.7rem",
            },
          }}
        />
      </body>
    </html>
  );
}
