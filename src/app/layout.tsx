import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ClerkProvider } from '@clerk/nextjs'
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "GridGive - Digital Fundraising for Student Athletes",
  description: "Modernize your fundraising with digital grids. Create personalized campaigns, share via QR code, and raise funds in real-time.",
  keywords: ["fundraising", "student athletes", "sports", "donations", "high school"],
  authors: [{ name: "GridGive" }],
  openGraph: {
    title: "GridGive - Digital Fundraising for Student Athletes",
    description: "Modernize your fundraising with digital grids",
    type: "website",
    url: process.env.NEXT_PUBLIC_APP_URL,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
