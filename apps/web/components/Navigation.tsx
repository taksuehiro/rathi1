'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  Truck,
  Package,
  LineChart,
  Settings,
  Shield,
} from 'lucide-react'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: TrendingUp, label: 'Trades', href: '/trades' },
  { icon: Users, label: 'Customers', href: '/customers' },
  { icon: Truck, label: 'Deliveries', href: '/deliveries' },
  { icon: Package, label: 'Positions', href: '/positions' },
  { icon: LineChart, label: 'Curve', href: '/curve' },
  { icon: Shield, label: 'Limits', href: '/limits' },
  { icon: Settings, label: 'Settings', href: '/settings' },
]

export default function Navigation() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="w-60 h-screen bg-white shadow-lg fixed left-0 top-0 z-20">
      <div className="h-full flex flex-col">
        {/* Logo/Title */}
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-slate-900">AI-Rathispherd</h2>
          <p className="text-xs text-slate-600 mt-1">錫取引リスク管理</p>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  active
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}



