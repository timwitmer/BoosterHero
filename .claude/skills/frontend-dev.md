# Frontend Development Standards - BoosterHero

## Overview
This skill defines frontend development patterns and standards for the BoosterHero application using Next.js 15, React 19, TypeScript, and Tailwind CSS.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **React**: 19.0.0
- **TypeScript**: Strict mode enabled
- **Styling**: Tailwind CSS + Shadcn UI components
- **State**: React hooks (useState, useEffect, useCallback, useMemo)
- **Authentication**: Clerk

## Component Structure

### File Organization
```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Route groups with layout
│   ├── (dashboard)/       # Protected dashboard routes
│   └── give/[slug]/       # Public campaign pages
├── components/
│   ├── ui/                # Shadcn UI primitives (Button, Input, etc.)
│   ├── grid/              # Domain-specific components
│   ├── payment/           # Payment flow components
│   └── [feature]/         # Feature-specific components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and shared logic
└── services/              # Business logic and API calls

```

### Naming Conventions
- **Components**: PascalCase (e.g., `CampaignClient.tsx`, `PayPalButton.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useGrid.ts`, `useWebSocket.ts`)
- **Utilities**: camelCase (e.g., `formatCurrency.ts`)
- **Server Actions**: camelCase (e.g., `gridService.ts`)

## Component Patterns

### Server vs Client Components
**Default to Server Components** unless you need:
- Event handlers (onClick, onChange, etc.)
- Browser APIs (localStorage, window, etc.)
- React hooks (useState, useEffect, etc.)
- Real-time updates

```typescript
// ✅ Server Component (default)
// src/app/give/[slug]/page.tsx
export default async function CampaignPage({ params }: PageProps) {
  const { slug } = await params
  const campaign = await getCampaign(slug)

  return <CampaignClient campaign={campaign} />
}

// ✅ Client Component (only when needed)
// src/app/give/[slug]/CampaignClient.tsx
'use client'

export default function CampaignClient({ campaign }: Props) {
  const [selectedSquares, setSelectedSquares] = useState<string[]>([])
  // ... interactive logic
}
```

### Next.js 15 Route Params
All route params are now async Promises:

```typescript
// ✅ Correct - Async params
interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params
  // ...
}

// ❌ Incorrect - Sync params
interface PageProps {
  params: { slug: string }  // Wrong in Next.js 15
}
```

### State Management

**Use Built-in Hooks First**:
```typescript
// ✅ Local state with useState
const [isOpen, setIsOpen] = useState(false)

// ✅ Derived state with useMemo
const totalAmount = useMemo(() =>
  squares.reduce((sum, s) => sum + parseFloat(s.value), 0),
  [squares]
)

// ✅ Stable callbacks with useCallback
const handleClick = useCallback(() => {
  setIsOpen(true)
}, [])

// ✅ Refs for callbacks to avoid re-renders
const onSuccessRef = useRef(onSuccess)
useEffect(() => {
  onSuccessRef.current = onSuccess
}, [onSuccess])
```

**Avoid Over-Optimization**:
- Don't wrap everything in useCallback/useMemo
- Only optimize when you have measured performance issues
- Refs are useful for callbacks passed to third-party libraries (like PayPal SDK)

### TypeScript Patterns

**Strict Typing**:
```typescript
// ✅ Explicit interfaces for props
interface GridProps {
  squares: GridSquareData[]
  rows: number
  cols: number
  campaignSlug: string
  onSquaresSelected?: (selectedIds: string[]) => void
  readOnly?: boolean
}

// ✅ Type imports from shared types
import { GridSquareData } from '@/services/gridService'

// ✅ Discriminated unions for state
type Step = 'info' | 'payment' | 'success'
const [step, setStep] = useState<Step>('info')

// ❌ Avoid 'any' - use 'unknown' instead
try {
  // ...
} catch (error: unknown) {  // Not 'any'
  if (error instanceof Error) {
    console.error(error.message)
  }
}
```

**API Responses**:
```typescript
// ✅ Define response types
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

const response = await fetch('/api/campaigns')
const data: ApiResponse<Campaign[]> = await response.json()
```

## Styling Guidelines

### Tailwind CSS
**Use Tailwind utility classes directly**:
```typescript
// ✅ Inline utilities
<div className="flex items-center gap-4 p-6 bg-white rounded-lg shadow-lg">

// ✅ Conditional classes with template literals
<button className={`px-4 py-2 rounded ${isActive ? 'bg-blue-600' : 'bg-gray-200'}`}>

// ✅ Dynamic classes with cn() helper
import { cn } from '@/lib/utils'
<div className={cn(
  "base-classes",
  isActive && "active-classes",
  error && "error-classes"
)}>
```

**Responsive Design**:
```typescript
// ✅ Mobile-first approach
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">

// ✅ Responsive padding/spacing
<div className="px-4 py-8 md:px-8 lg:px-12">
```

### Shadcn UI Components
Use existing UI primitives from `@/components/ui/`:
- Button
- Input
- Label
- Dialog
- Card
- etc.

```typescript
// ✅ Import from ui folder
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// ✅ Use consistent variants
<Button variant="default" size="lg">Primary Action</Button>
<Button variant="outline" size="sm">Secondary</Button>
```

## Custom Hooks

### Creating Custom Hooks
```typescript
// ✅ Custom hook pattern
export function useGrid({ campaignSlug, pollInterval }: Options) {
  const [squares, setSquares] = useState<GridSquare[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/campaigns/${campaignSlug}/grid`)
      const data = await response.json()
      setSquares(data.squares)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setIsLoading(false)
    }
  }, [campaignSlug])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, pollInterval)
    return () => clearInterval(interval)
  }, [refresh, pollInterval])

  return { squares, isLoading, error, refresh }
}
```

### Hook Best Practices
- Return object with named properties (not array)
- Include loading/error states
- Provide refresh/refetch methods
- Clean up subscriptions in useEffect return
- Skip initial mount when needed with useRef

## Forms and Validation

### Form Handling
```typescript
// ✅ Controlled inputs with validation
const [email, setEmail] = useState('')
const [errors, setErrors] = useState<Record<string, string>>({})

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  // Client-side validation
  const newErrors: Record<string, string> = {}
  if (!email.includes('@')) {
    newErrors.email = 'Invalid email'
  }

  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors)
    return
  }

  // Submit to API
  try {
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error)
    }

    // Success handling
  } catch (error) {
    setErrors({ submit: error.message })
  }
}
```

## API Integration

### Fetching Data
```typescript
// ✅ Error handling with try-catch
const fetchCampaign = async (slug: string) => {
  try {
    const response = await fetch(`/api/campaigns/${slug}`)

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to fetch')
    }

    return await response.json()
  } catch (error) {
    console.error('Fetch error:', error)
    throw error
  }
}

// ✅ Loading states
const [data, setData] = useState(null)
const [isLoading, setIsLoading] = useState(true)
const [error, setError] = useState(null)

useEffect(() => {
  fetchCampaign(slug)
    .then(setData)
    .catch(setError)
    .finally(() => setIsLoading(false))
}, [slug])
```

### Optimistic Updates
```typescript
// ✅ Update UI immediately, rollback on error
const handleLike = async () => {
  const previousLikes = likes

  // Optimistic update
  setLikes(likes + 1)

  try {
    await fetch('/api/like', { method: 'POST' })
  } catch (error) {
    // Rollback on error
    setLikes(previousLikes)
    toast.error('Failed to like')
  }
}
```

## Performance

### Preventing Re-renders
```typescript
// ✅ Extract static content
const STATIC_OPTIONS = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
]

// ✅ Memoize expensive computations
const sortedData = useMemo(() =>
  data.sort((a, b) => a.value - b.value),
  [data]
)

// ✅ Use refs for callback stability
const callbackRef = useRef(callback)
useEffect(() => {
  callbackRef.current = callback
}, [callback])
```

### Code Splitting
```typescript
// ✅ Dynamic imports for heavy components
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <div>Loading chart...</div>,
  ssr: false,
})
```

## Error Handling

### Error Boundaries (Class Component)
```typescript
// Note: React 19 doesn't have hook-based error boundaries yet
class ErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />
    }
    return this.props.children
  }
}
```

### User-Facing Errors
```typescript
// ✅ Show user-friendly messages
try {
  await submitForm(data)
  toast.success('Successfully saved!')
} catch (error) {
  const message = error instanceof Error
    ? error.message
    : 'Something went wrong. Please try again.'
  toast.error(message)
}
```

## Accessibility

### Semantic HTML
```typescript
// ✅ Use semantic elements
<main>
  <header>
    <h1>Page Title</h1>
  </header>

  <section>
    <h2>Section Title</h2>
  </section>

  <footer>...</footer>
</main>

// ✅ ARIA attributes when needed
<button
  aria-label="Close modal"
  aria-pressed={isOpen}
  onClick={handleClose}
>
  <X className="h-4 w-4" />
</button>
```

### Keyboard Navigation
```typescript
// ✅ Handle keyboard events
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick()
    }
  }}
>
```

## Testing Considerations

### Component Design for Testing
```typescript
// ✅ Separate logic from UI
const usePaymentLogic = () => {
  const [status, setStatus] = useState('idle')

  const processPayment = async (amount: number) => {
    setStatus('processing')
    // ... payment logic
  }

  return { status, processPayment }
}

// Component uses the hook
export function PaymentButton() {
  const { status, processPayment } = usePaymentLogic()

  return (
    <Button
      onClick={() => processPayment(10)}
      disabled={status === 'processing'}
    >
      Pay Now
    </Button>
  )
}
```

## Common Patterns

### Modal/Dialog Pattern
```typescript
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

export function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <button onClick={onClose} className="float-right">×</button>
        {children}
      </div>
    </div>
  )
}
```

### Loading States
```typescript
// ✅ Skeleton loaders
if (isLoading) {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
      <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
    </div>
  )
}

// ✅ Spinner for actions
<Button disabled={isSubmitting}>
  {isSubmitting ? (
    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
  ) : (
    'Submit'
  )}
</Button>
```

## Anti-Patterns to Avoid

❌ **Don't mix server and client logic**
```typescript
// Bad - trying to use hooks in server component
export default async function ServerPage() {
  const [state, setState] = useState()  // Error!
  return <div>...</div>
}
```

❌ **Don't put heavy logic in render**
```typescript
// Bad - computing on every render
function Component({ data }) {
  const sorted = data.sort()  // Sorts on every render!
  return <List items={sorted} />
}

// Good - memoize
function Component({ data }) {
  const sorted = useMemo(() => data.sort(), [data])
  return <List items={sorted} />
}
```

❌ **Don't forget cleanup**
```typescript
// Bad - memory leak
useEffect(() => {
  const interval = setInterval(doSomething, 1000)
  // Missing cleanup!
}, [])

// Good - cleanup
useEffect(() => {
  const interval = setInterval(doSomething, 1000)
  return () => clearInterval(interval)
}, [])
```

## Summary Checklist

When creating a new component:
- [ ] Is it a server or client component? (default to server)
- [ ] Are props properly typed with interfaces?
- [ ] Are route params awaited (for Next.js 15)?
- [ ] Is state management appropriate (local vs global)?
- [ ] Are callbacks stable (useCallback/useRef when needed)?
- [ ] Is error handling implemented?
- [ ] Are loading states shown?
- [ ] Is the component accessible (semantic HTML, ARIA)?
- [ ] Are dependencies in useEffect correct?
- [ ] Is cleanup implemented for subscriptions?
- [ ] Are styles using Tailwind utilities?
- [ ] Are existing UI components reused?
