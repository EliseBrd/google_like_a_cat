import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const [info, setInfo] = useState('Traitement en cours...')

  useEffect(() => {
    supabase.auth.exchangeCodeForSession(window.location.href)
      .then(({ data, error }) => {
        if (error) {
          console.warn(error.message)
        }
        setInfo('Connecté. Vous pouvez fermer cette page.')
      })
  }, [])

  return <p>{info}</p>
}
