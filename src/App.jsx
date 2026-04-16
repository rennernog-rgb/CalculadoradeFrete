import { useState } from 'react'
import LockScreen from './components/LockScreen'
import FreightCalculator from './components/FreightCalculator'

function App() {
  const [autenticado, setAutenticado] = useState(
    () => sessionStorage.getItem('fc_auth') === '1'
  )

  if (!autenticado) {
    return <LockScreen onUnlock={() => setAutenticado(true)} />
  }

  return <FreightCalculator />
}

export default App
