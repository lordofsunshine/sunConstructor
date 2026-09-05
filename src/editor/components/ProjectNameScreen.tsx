import { ArrowRight } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { Brand } from '../../components/Brand'

interface ProjectNameScreenProps {
  onCreate: (name: string) => void
}

export const ProjectNameScreen = ({ onCreate }: ProjectNameScreenProps) => {
  const [name, setName] = useState('Untitled project')

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = name.trim()
    if (value) onCreate(value)
  }

  return <main className="project-name-screen">
    <a className="builder-brand" href="/" aria-label="sunConstructor home"><Brand /></a>
    <section className="project-name-card">
      <p className="eyebrow">New local project</p>
      <h1>Name the thing you’re making.</h1>
      <p>Your project stays in this browser until you decide to export it.</p>
      <form onSubmit={submit}>
        <label htmlFor="project-name">Project name</label>
        <input id="project-name" value={name} onChange={(event) => setName(event.target.value)} />
        <button className="sun-button" type="submit">Open builder <ArrowRight size={17} /></button>
      </form>
    </section>
  </main>
}
