/**
 * Traduce los errores de Supabase Auth, que llegan en inglés y con jerga, a
 * mensajes que un fraterno pueda entender y accionar.
 */

interface SupabaseAuthError {
  code?: string
  message?: string
  status?: number
}

const POR_CODIGO: Record<string, string> = {
  invalid_credentials: 'El correo o la contraseña son incorrectos.',
  email_not_confirmed: 'Todavía no confirmaste tu correo. Revisá tu bandeja de entrada y el spam.',
  user_already_exists: 'Ya existe una cuenta con este correo. Iniciá sesión o recuperá tu contraseña.',
  email_exists: 'Ya existe una cuenta con este correo. Iniciá sesión o recuperá tu contraseña.',
  weak_password: 'La contraseña es muy débil. Usá al menos 8 caracteres.',
  same_password: 'La contraseña nueva tiene que ser distinta de la anterior.',
  over_email_send_rate_limit:
    'Se enviaron demasiados correos en poco tiempo. Esperá unos minutos y volvé a intentarlo.',
  over_request_rate_limit: 'Demasiados intentos seguidos. Esperá un momento y volvé a intentarlo.',
  validation_failed: 'Revisá los datos ingresados.',
}

/** Cuando el error no trae `code` (versiones viejas del SDK), se mira el texto. */
const POR_TEXTO: [RegExp, string][] = [
  [/invalid login credentials/i, POR_CODIGO.invalid_credentials],
  [/email not confirmed/i, POR_CODIGO.email_not_confirmed],
  [/user already registered|already registered/i, POR_CODIGO.user_already_exists],
  [/password should be at least|weak password/i, POR_CODIGO.weak_password],
  [/should be different from the old password/i, POR_CODIGO.same_password],
  [/email rate limit|rate limit exceeded/i, POR_CODIGO.over_email_send_rate_limit],
  [/for security purposes|only request this after/i, 'Esperá unos segundos antes de volver a intentarlo.'],
  [/failed to fetch|network|networkerror/i, 'No se pudo conectar. Revisá tu conexión a internet.'],
  [/unable to validate email|invalid email/i, 'El correo no parece válido.'],
]

export function getAuthErrorMessage(err: unknown, porDefecto = 'Ocurrió un error. Intentá de nuevo.'): string {
  if (!err) return porDefecto

  const e = err as SupabaseAuthError
  if (e.code && POR_CODIGO[e.code]) return POR_CODIGO[e.code]

  const texto = e.message ?? (err instanceof Error ? err.message : '')
  if (texto) {
    for (const [patron, mensaje] of POR_TEXTO) {
      if (patron.test(texto)) return mensaje
    }
  }

  return porDefecto
}

/** `true` si el error es el genérico de credenciales inválidas. */
export function esCredencialInvalida(err: unknown): boolean {
  const e = err as SupabaseAuthError
  if (e?.code === 'invalid_credentials') return true
  const texto = e?.message ?? (err instanceof Error ? err.message : '')
  return /invalid login credentials/i.test(texto)
}
