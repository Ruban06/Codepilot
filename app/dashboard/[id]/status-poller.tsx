'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface StatusPollerProps {
  status: string
}

export default function StatusPoller({ status }: StatusPollerProps) {
  const router = useRouter()

  useEffect(() => {
    if (status !== 'pending') return

    const interval = setInterval(() => {
      router.refresh()
    }, 4_000)

    return () => clearInterval(interval)
  }, [status, router])

  return null
}
