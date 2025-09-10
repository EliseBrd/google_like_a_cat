import { useState } from 'react'
import { useAuth } from './AuthContext'

export default function AuthPanel() {
  const { session, supabase } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function signUp() {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) return alert(error.message)
    alert('Compte créé. Vérifie tes emails si la confirmation est activée.')
  }
  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
  }
  async function signOut() { await supabase.auth.signOut() }

  if (session) return (
    <div>
      Connecté : {session.user.email} <button onClick={signOut}>Se déconnecter</button>
    </div>
  )

  return (
    <div>
      <input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input placeholder="mot de passe" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button onClick={signIn}>Se connecter</button>
      <button onClick={signUp}>Créer un compte</button>
    </div>
  )
}
