'use client'

import { useActionState } from 'react'
import { signUp } from '@/app/actions/auth'

type State = { error?: string; message?: string } | undefined

export default function SignupForm() {
  const [state, formAction, pending] = useActionState<State, FormData>(signUp, undefined)

  return (
    <form action={formAction} className="space-y-4" aria-label="Sign up form">
      {state?.error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p role="alert" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          {state.message}
        </p>
      )}

      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={6}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        aria-disabled={pending}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {pending ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  )
}
