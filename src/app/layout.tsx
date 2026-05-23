import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Golf Tracker Tarakdjian",
  description: "Sistema de seguimiento de golf",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a2e20',
              color: '#e8f0e9',
              border: '1px solid #2a4530',
            },
            success: {
              iconTheme: { primary: '#2d9e5f', secondary: '#e8f0e9' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#e8f0e9' },
            },
          }}
        />
      </body>
    </html>
  );
}
