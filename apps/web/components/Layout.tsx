'use client'

import Navigation from './Navigation'
import Header from './Header'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Navigation />
      <div className="flex-1 ml-60">
        <Header />
        <main className="mt-16 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

