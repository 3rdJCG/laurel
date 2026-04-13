import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react'

type BackHandler = () => boolean | void

type BackHandlerContextValue = {
  register: (handler: BackHandler) => () => void
  runBack: () => boolean
}

const BackHandlerContext = createContext<BackHandlerContextValue | null>(null)

export function BackHandlerProvider({ children }: { children: ReactNode }): JSX.Element {
  const stackRef = useRef<BackHandler[]>([])

  const register = useCallback((handler: BackHandler) => {
    stackRef.current.push(handler)
    return () => {
      const idx = stackRef.current.lastIndexOf(handler)
      if (idx !== -1) stackRef.current.splice(idx, 1)
    }
  }, [])

  const runBack = useCallback((): boolean => {
    for (let i = stackRef.current.length - 1; i >= 0; i--) {
      const result = stackRef.current[i]()
      if (result !== false) return true
    }
    return false
  }, [])

  return (
    <BackHandlerContext.Provider value={{ register, runBack }}>
      {children}
    </BackHandlerContext.Provider>
  )
}

export function useBackHandlerRegistry(): BackHandlerContextValue {
  const ctx = useContext(BackHandlerContext)
  if (!ctx) throw new Error('useBackHandlerRegistry must be used within BackHandlerProvider')
  return ctx
}

/**
 * 有効な間だけ戻るハンドラを登録する。handler が false を返した場合は次の候補へフォールバック。
 */
export function useBackHandler(active: boolean, handler: BackHandler): void {
  const ctx = useContext(BackHandlerContext)
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!active || !ctx) return
    const unregister = ctx.register(() => handlerRef.current())
    return unregister
  }, [active, ctx])
}
