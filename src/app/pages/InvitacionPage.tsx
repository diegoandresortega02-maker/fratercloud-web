import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../AuthContext'
import AuthCard from '../components/AuthCard'

/**
 * Clave donde se guarda el código mientras la persona crea su cuenta.
 *
 * El registro y la confirmación por correo pasan por varias pantallas, así que
 * el código no puede vivir solo en la URL: se guarda acá y el asistente de alta
 * lo recoge cuando la persona vuelve con sesión.
 */
export const CLAVE_INVITACION = 'fratercloud:invitacion'

export default function InvitacionPage() {
  const { codigo = '' } = useParams()
  const navigate = useNavigate()
  const { session, fraternityUser, loading: cargandoSesion } = useAuth()
  const [nombre, setNombre] = useState<string | null>(null)
  const [buscando, setBuscando] = useState(true)

  useEffect(() => {
    const limpio = codigo.trim().toUpperCase()
    supabase
      .rpc('fraternity_name_for_code', { p_code: limpio })
      .then(({ data, error }) => {
        if (error) console.error('No se pudo leer la invitación', error)
        setNombre((data as string) ?? null)
        // Se guarda solo si el código existe: no tiene sentido arrastrar uno malo.
        if (data) localStorage.setItem(CLAVE_INVITACION, limpio)
        setBuscando(false)
      })
  }, [codigo])

  // Si ya tiene sesión y todavía no pertenece a ninguna fraternidad, se lo lleva
  // directo al alta, que va a encontrar el código guardado.
  useEffect(() => {
    if (buscando || cargandoSesion || !nombre) return
    if (session && !fraternityUser) navigate('/onboarding', { replace: true })
  }, [buscando, cargandoSesion, session, fraternityUser, nombre, navigate])

  if (buscando || cargandoSesion) {
    return (
      <AuthCard title="Un momento" subtitle="Estamos abriendo la invitación…">
        <p className="text-sm text-slate-500">Esto toma solo unos segundos.</p>
      </AuthCard>
    )
  }

  if (!nombre) {
    return (
      <AuthCard
        title="La invitación no es válida"
        subtitle="El enlace puede estar incompleto o haber cambiado"
        footer={
          <Link to="/login" className="text-sm text-brand-primary font-medium">
            Ir a iniciar sesión
          </Link>
        }
      >
        <p className="text-sm text-slate-600">
          Pedile a quien te invitó que te vuelva a compartir el enlace. Suele cortarse al pegarlo
          en un mensaje.
        </p>
      </AuthCard>
    )
  }

  // Ya está adentro de una fraternidad: no se lo saca de la suya sin avisar.
  if (session && fraternityUser) {
    return (
      <AuthCard title={`Invitación a ${nombre}`} subtitle="Ya perteneces a una fraternidad">
        <p className="text-sm text-slate-600 mb-4">
          Tu cuenta ya pertenece a una fraternidad, y una cuenta puede estar en una sola a la vez.
          Si querés sumarte a <strong className="text-ink">{nombre}</strong>, hacelo con otro correo.
        </p>
        <Link
          to="/dashboard"
          className="block text-center w-full bg-brand-primary hover:bg-brand-primary-dark text-white font-medium rounded-control py-2 text-sm"
        >
          Ir a mi panel
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title={`Te invitaron a ${nombre}`}
      subtitle="Creá tu cuenta y quedás dentro de la fraternidad"
      footer={
        <p className="text-sm text-slate-500">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-brand-primary font-medium">
            Iniciá sesión
          </Link>
        </p>
      }
    >
      <div className="rounded-control bg-brand-primary/5 border border-brand-primary/20 p-4 mb-5">
        <p className="text-sm text-ink">
          Al crear tu cuenta vas a entrar directo a <strong>{nombre}</strong>. No hace falta que
          copies ningún código.
        </p>
      </div>

      <Link
        to="/registro"
        className="block text-center w-full bg-brand-primary hover:bg-brand-primary-dark text-white font-medium rounded-control py-2.5 text-sm"
      >
        Crear mi cuenta
      </Link>
    </AuthCard>
  )
}
