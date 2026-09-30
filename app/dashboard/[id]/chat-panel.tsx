'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import type { ChatMessage } from '@/types'

interface ChatPanelProps {
  analysisId: string
  initialMessages: ChatMessage[]
}

export default function ChatPanel({ analysisId, initialMessages }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || streaming) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      analysis_id: analysisId,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setStreaming(true)

    // Optimistic assistant placeholder
    const assistantId = crypto.randomUUID()
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        analysis_id: analysisId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
      },
    ])

    try {
      const response = await fetch(`/api/chat/${analysisId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })

      if (!response.ok || !response.body) {
        throw new Error('Stream request failed')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        // SSE lines: "data: <token>\n\n"
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const token = line.slice(6)
            if (token === '[DONE]') break
            accumulated += token
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: accumulated } : m
              )
            )
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'Something went wrong. Please try again.' }
            : m
        )
      )
    } finally {
      setStreaming(false)
    }
  }

  return (
    <section className="rounded-lg border" aria-label="Q&A chat">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">Ask about this codebase</h2>
      </div>

      <div
        className="flex h-80 flex-col gap-4 overflow-y-auto px-6 py-4"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No messages yet. Ask anything about the codebase.
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-prose rounded-lg px-4 py-2 text-sm ${
              msg.role === 'user'
                ? 'ml-auto bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
            }`}
          >
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t px-6 py-4" aria-label="Send a message">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          disabled={streaming}
          aria-label="Message input"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          aria-disabled={streaming || !input.trim()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {streaming ? 'Thinking…' : 'Send'}
        </button>
      </form>
    </section>
  )
}
