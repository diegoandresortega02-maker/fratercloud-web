import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Envuelve una sección y la revela con un fade+slide cuando entra en pantalla.
 * Si el navegador reporta `prefers-reduced-motion`, el CSS deja todo visible sin animar.
 */
export default function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || shown) return

    // Se comprueba la posición directamente en vez de usar IntersectionObserver:
    // el observador no re-evalúa de forma fiable tras un salto por ancla (#preguntas),
    // y eso dejaba secciones enteras atrapadas en opacidad 0 —invisibles para el visitante.
    // La condición cubre tanto "entrando desde abajo" como "ya quedó arriba".
    const check = () => {
      const top = el.getBoundingClientRect().top
      if (top < window.innerHeight - 40) {
        setShown(true)
        return true
      }
      return false
    }

    if (check()) return

    let raf = 0
    const onMove = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(check)
    }
    window.addEventListener('scroll', onMove, { passive: true })
    window.addEventListener('resize', onMove)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onMove)
      window.removeEventListener('resize', onMove)
    }
  }, [shown])

  return (
    <div ref={ref} className={`fc-reveal${shown ? ' fc-revealed' : ''}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}
