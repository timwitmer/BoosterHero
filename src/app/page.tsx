import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-blue-600">
            GridGive
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/sign-in">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Digital Fundraising for Student Athletes
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Modernize your fundraising with interactive digital grids. Create personalized campaigns,
            share via QR code, and watch donations come in real-time.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/sign-up">
              <Button size="lg" className="text-lg px-8 py-6">
                Start Fundraising
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                Learn More
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div id="how-it-works" className="mt-24 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-lg shadow-sm border">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold mb-2">Create Your Grid</h3>
            <p className="text-gray-600">
              Set up your personalized fundraising grid in minutes. Choose your sport,
              set your goal, and customize your campaign.
            </p>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-sm border">
            <div className="text-4xl mb-4">📱</div>
            <h3 className="text-xl font-semibold mb-2">Share Anywhere</h3>
            <p className="text-gray-600">
              Get a unique QR code and link to share on social media, text to friends,
              or print on flyers.
            </p>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-sm border">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-2">Track in Real-Time</h3>
            <p className="text-gray-600">
              Watch your grid fill up live as donations come in. Donors see their
              name appear instantly.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-24 bg-blue-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Fundraising?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Join hundreds of student athletes raising funds with GridGive
          </p>
          <Link href="/sign-up">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
              Create Free Campaign
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-gray-50 mt-24">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="text-gray-600">
              © 2026 GridGive. All rights reserved.
            </div>
            <div className="flex gap-6 text-gray-600">
              <Link href="/privacy" className="hover:text-gray-900">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-gray-900">
                Terms
              </Link>
              <Link href="/support" className="hover:text-gray-900">
                Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
