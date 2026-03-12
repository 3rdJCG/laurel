import { useState } from 'react'

function App(): JSX.Element {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <h1>Laurel</h1>
      <p>Electron + React + TypeScript</p>
      <button onClick={() => setCount((c) => c + 1)}>count: {count}</button>
    </div>
  )
}

export default App
