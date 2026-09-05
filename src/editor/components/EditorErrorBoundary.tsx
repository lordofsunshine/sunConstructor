import { Component, type ReactNode } from 'react'

interface State {
  failed: boolean
}

export class EditorErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return <main className="editor-recovery"><p>Something interrupted the editor.</p><h1>Your local projects are still there.</h1><button type="button" className="sun-button" onClick={() => window.location.reload()}>Reload builder</button><a href="/">Return home</a></main>
  }
}
