import { Metadata } from 'next'
import Link from 'next/link'
import LoginForm from './login-form'

export const metadata: Metadata = {
  title: 'Sign in',
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to CodePilot</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and password to continue
          </p>
        </div>

        <LoginForm />

        <p className="text-center text-sm text-muted-foreground">
          No account?{' '}
          <Link href="/signup" className="underline underline-offset-4 hover:text-foreground">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  )
}
