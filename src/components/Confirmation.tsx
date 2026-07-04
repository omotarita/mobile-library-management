import type { ReactNode } from 'react'
import { Button, Card } from './ui'

export default function Confirmation({
  emoji = '📚',
  heading,
  lines,
  onDone,
}: {
  emoji?: string
  heading: string
  lines: ReactNode[]
  onDone: () => void
}) {
  return (
    <Card className="max-w-md mx-auto text-center">
      <div className="text-6xl mb-4" aria-hidden="true">
        {emoji}
      </div>
      <h1 className="text-2xl font-bold text-coral-600 mb-4">{heading}</h1>
      <div className="space-y-2 text-ink/80 mb-8">
        {lines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
      <Button onClick={onDone} className="w-full">
        Done
      </Button>
    </Card>
  )
}
