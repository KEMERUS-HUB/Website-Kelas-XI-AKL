import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Menampilkan pesan error di layar (bukan layar putih kosong) agar mudah didiagnosis.
class Boundary extends React.Component<{ children: React.ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null }
  static getDerivedStateFromError(err: Error) { return { err } }
  render() {
    return this.state.err
      ? <pre style={{ padding: 24, whiteSpace: 'pre-wrap', color: '#b91c1c' }}>Terjadi error: {this.state.err.message}</pre>
      : this.props.children
  }
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Boundary><App /></Boundary></React.StrictMode>)
