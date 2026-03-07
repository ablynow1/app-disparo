import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Evolution Web Control',
  description: 'O seu braço de Automação de Disparos Web',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      {/* 
        A classe "dark" adicionada no HTML inicializa o App já no Dark Mode elegante por padrão 
      */}
      <body className={`${inter.variable} font-sans antialiased bg-stone-950 text-stone-50 selection:bg-stone-800`}>
        {children}
        <Toaster theme="dark" position="bottom-right" />
      </body>
    </html>
  );
}
