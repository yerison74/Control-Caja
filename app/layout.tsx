import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  title: 'Control De Caja',
  description: 'Creado por Yerison',
  generator: 'version 11.2',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>{children}
         {/* Footer */}
        <footer className="text-center text-sm text-gray-500 py-4 border-t mt-8">
          © 2025 Derechos reservados – Yerison Javier
        </footer>
      </body>
    </html>
  )
}
