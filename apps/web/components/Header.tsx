'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { User } from 'lucide-react'

export default function Header() {
  const [asOf, setAsOf] = useState('2026-07-05')

  return (
    <header className="h-16 bg-white shadow-sm fixed top-0 left-60 right-0 z-10">
      <div className="h-full px-6 flex items-center justify-between">
        {/* 左側: ロゴ・タイトル */}
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">AI-Rathispherd</h1>
        </div>

        {/* 右側: 日付選択・ユーザー */}
        <div className="flex items-center gap-4">
          <Input
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            className="w-40"
          />
          <div className="flex items-center gap-2 text-slate-700">
            <User className="h-5 w-5" />
            <span className="font-medium">Admin</span>
          </div>
        </div>
      </div>
    </header>
  )
}



