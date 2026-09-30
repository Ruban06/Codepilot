import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'

interface Props {
  children: ReactNode
}

export default async function DashboardLayout({ children }: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <nav
          className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3"
          aria-label="Main navigation"
        >
          <Link href="/dashboard" className="font-semibold tracking-tight hover:opacity-80">
            CodePilot
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>

            <Link
              href="/analyze"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              New analysis
            </Link>

            <form action={signOut}>
              <button
                type="submit"
                className="text-sm text-muted-foreground hover:text-foreground"
                aria-label="Sign out"
              >
                Sign out
              </button>
            </form>
          </div>
        </nav>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  )
}
