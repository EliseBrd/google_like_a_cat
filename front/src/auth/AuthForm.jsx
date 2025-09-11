import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthForm() {
  const [mode, setMode] = useState('signin') 
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const redirectTo = `${window.location.origin}/auth/callback` 

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError(''); setMessage('')
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: redirectTo }
        })
        if (error) throw error
        setMessage("Compte créé. Vérifie tes emails pour confirmer (si activé).")
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        setMessage("Connecté ✅")
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async () => {
    setError(''); setMessage('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) setError(error.message)
    else setMessage("Email de réinitialisation envoyé (si le compte existe).")
  }

  return (
    <form onSubmit={handleSubmit} style={{ display:'grid', gap:8, maxWidth:360 }}>
      <h2>{mode === 'signup' ? 'Créer un compte' : 'Se connecter'}</h2>
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" required />
      <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mot de passe" type="password" required />
      <button type="submit" disabled={loading}>{loading ? '...' : (mode==='signup'?'Créer':'Se connecter')}</button>*
      <button type="button" onClick={resetPassword}>Mot de passe oublié ?</button>
      <div>
        {mode === 'signup' ? (
          <span>Déjà un compte ? <a href="#" onClick={()=>setMode('signin')}>Se connecter</a></span>
        ) : (
          <span>Nouveau ? <a href="#" onClick={()=>setMode('signup')}>Créer un compte</a></span>
        )}
      </div>
      {message && <div style={{ color:'#0a0' }}>{message}</div>}
      {error && <div style={{ color:'#c00' }}>Erreur: {error}</div>}
    </form>
  )
}
