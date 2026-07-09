import type { ButtonHTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-black/5 p-5 sm:p-8 ${className}`}>
      {children}
    </div>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-5 py-3 text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-12'
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-coral-500 text-white hover:bg-coral-600',
    secondary: 'bg-teal-500 text-white hover:bg-teal-600',
    danger: 'bg-berry-500 text-white hover:bg-berry-600',
    ghost: 'bg-transparent text-ink border border-ink/15 hover:bg-black/5',
  }
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className="block text-sm font-semibold text-ink/80 mb-1" {...props} />
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-teal-400 min-h-12"
      {...props}
    />
  )
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className="w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-teal-400 min-h-12"
      {...props}
    />
  )
}

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div className="mb-4">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

export function Banner({ tone, children }: { tone: 'error' | 'warning' | 'info'; children: ReactNode }) {
  const tones = {
    error: 'bg-berry-500/10 text-berry-600 border-berry-500/30',
    warning: 'bg-sun-100 text-ink border-sun-500/40',
    info: 'bg-teal-50 text-teal-600 border-teal-400/30',
  }
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm font-medium mb-4 ${tones[tone]}`} role="status">
      {children}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="h-8 w-8 rounded-full border-4 border-teal-100 border-t-teal-500 animate-spin" />
    </div>
  )
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
}: {
  title: string
  message: ReactNode
  confirmLabel?: string
  confirmVariant?: ButtonVariant
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <Card className="max-w-sm w-full">
        <h2 className="text-lg font-bold mb-2">{title}</h2>
        <p className="text-sm text-ink/70 mb-6">{message}</p>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} className="flex-1">
            {confirmLabel}
          </Button>
        </div>
      </Card>
    </div>
  )
}
