import { useEffect, useRef, type RefObject } from 'react'
import { useLocation } from 'react-router'

export function useRouteFocus(
  mainContentRef: RefObject<HTMLElement | null>,
): void {
  const { pathname } = useLocation()
  const previousPath = useRef(pathname)

  useEffect(() => {
    if (previousPath.current === pathname) {
      return
    }

    previousPath.current = pathname
    const mainContent = mainContentRef.current
    const browserWindow = mainContent?.ownerDocument.defaultView
    if (!mainContent || !browserWindow) {
      return
    }

    const pendingFocus = browserWindow.setTimeout(() => {
      const target =
        mainContent.querySelector<HTMLElement>('h1') ?? mainContent

      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1')
      }
      target.focus()
    })

    return () => browserWindow.clearTimeout(pendingFocus)
  }, [mainContentRef, pathname])
}
