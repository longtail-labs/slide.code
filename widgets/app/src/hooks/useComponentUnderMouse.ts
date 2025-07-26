import { useState, useEffect, useRef, useCallback } from 'react'

const useComponentUnderMouse = () => {
  const [activeObjectId, setActiveObjectId] = useState<string | null>(null)
  const containerRef = useRef<HTMLElement | null>(null)
  const mousePosition = useRef<{ clientX: number; clientY: number } | null>(null)
  const rafId = useRef<number | null>(null)

  const updateActiveObject = useCallback(() => {
    if (mousePosition.current && containerRef.current) {
      const { clientX, clientY } = mousePosition.current
      const element = document.elementFromPoint(clientX, clientY)
      if (element && containerRef.current.contains(element)) {
        const objectElement = element.closest('[data-object-id]')
        const objectId = objectElement?.getAttribute('data-object-id')
        setActiveObjectId(objectId)
      } else {
        setActiveObjectId(null)
      }
    }
  }, [])

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mousePosition.current = { clientX: event.clientX, clientY: event.clientY }
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current)
      }
      rafId.current = requestAnimationFrame(updateActiveObject)
    }

    const handleScroll = () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current)
      }
      rafId.current = requestAnimationFrame(updateActiveObject)
    }

    document.addEventListener('mousemove', handleMouseMove)

    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true })
    }

    // Cleanup on unmount
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      if (container) {
        container.removeEventListener('scroll', handleScroll)
      }
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current)
      }
    }
  }, [updateActiveObject])

  return { activeObjectId, containerRef }
}

export default useComponentUnderMouse

// import { useState, useEffect, useRef } from 'react'

// const useComponentUnderMouse = () => {
//   const [elementUnderMouse, setElementUnderMouse] = useState<Element | null>(null)
//   const containerRef = useRef<HTMLElement | null>(null)
//   const mousePosition = useRef<{ clientX: number; clientY: number } | null>(null)
//   const rafId = useRef<number | null>(null)

//   useEffect(() => {
//     const handleMouseMove = (event: MouseEvent) => {
//       mousePosition.current = { clientX: event.clientX, clientY: event.clientY }
//       updateElementUnderMouse()
//     }

//     const handleScroll = () => {
//       // console.log('[DEBUGELEMENT] handleScroll')
//       updateElementUnderMouse()
//     }

//     const updateElementUnderMouse = () => {
//       if (rafId.current !== null) {
//         cancelAnimationFrame(rafId.current)
//       }
//       rafId.current = requestAnimationFrame(() => {
//         if (mousePosition.current) {
//           const { clientX, clientY } = mousePosition.current
//           const element = document.elementFromPoint(clientX, clientY)
//           if (element && containerRef.current?.contains(element)) {
//             setElementUnderMouse(element)
//           } else {
//             setElementUnderMouse(null)
//           }
//         }
//       })
//     }

//     document.addEventListener('mousemove', handleMouseMove)

//     const container = containerRef.current
//     if (container) {
//       console.log('[DEBUGELEMENT] Adding scroll event listener')
//       container.addEventListener('scroll', handleScroll, { passive: true })
//     }

//     // Cleanup on unmount
//     return () => {
//       document.removeEventListener('mousemove', handleMouseMove)
//       if (container) {
//         container.removeEventListener('scroll', handleScroll)
//       }
//       if (rafId.current !== null) {
//         cancelAnimationFrame(rafId.current)
//       }
//     }
//   }, [containerRef.current])

//   return { elementUnderMouse, containerRef }
// }

// export default useComponentUnderMouse
