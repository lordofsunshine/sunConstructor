import { useEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronRight,
  Menu,
  Monitor,
  Smartphone,
  Tablet,
  Type,
  X,
} from 'lucide-react'
import { Brand } from './components/Brand'

type LandingProps = {
  onBuild: () => void
}

const fonts = [
  { name: 'Manrope', className: 'font-manrope', script: 'Cyrillic' },
  { name: 'Onest', className: 'font-onest', script: 'Cyrillic' },
  { name: 'PT Sans', className: 'font-pt', script: 'Cyrillic' },
  { name: 'IBM Plex Sans', className: 'font-plex', script: 'Cyrillic' },
  { name: 'Source Sans 3', className: 'font-source', script: 'Latin' },
]

const workSteps = [
  {
    number: '01',
    title: 'Give your website a name.',
    text: 'That is enough to begin a new project. You can change it later when the idea becomes clearer.',
  },
  {
    number: '02',
    title: 'Build it visually.',
    text: 'Add elements to the page and edit them in the same place where people will eventually see them.',
  },
  {
    number: '03',
    title: 'Keep it or take it with you.',
    text: 'Your project stays on this device. Export the finished website and a separate backup whenever you need them.',
  },
]

function HeroEditor() {
  const [device, setDevice] = useState('Desktop')
  const [selectedFont, setSelectedFont] = useState('Onest')
  const deviceIcon = device === 'Desktop' ? Monitor : device === 'Tablet' ? Tablet : Smartphone
  const DeviceIcon = deviceIcon

  return (
    <div className="hero-editor" aria-label="sunConstructor editor preview">
      <div className="hero-editor__top">
        <span className="editor-project">North Coffee</span>
        <div className="device-switch" aria-label="Preview size">
          {['Desktop', 'Tablet', 'Mobile'].map((item) => (
            <button key={item} className={device === item ? 'is-active' : ''} onClick={() => setDevice(item)}>
              {item}
            </button>
          ))}
        </div>
        <button className="editor-export">Export</button>
      </div>
      <div className="hero-editor__body">
        <aside className="hero-editor__layers">
          <strong>Layers</strong>
          <span>Navigation</span>
          <span className="is-open">Hero</span>
          <span className="is-child is-selected">Heading</span>
          <span className="is-child">Text</span>
          <span className="is-child">Button</span>
        </aside>
        <div className="hero-editor__stage">
          <div className="stage-meta"><DeviceIcon size={13} /> {device} preview</div>
          <div className={`stage-page stage-page--${device.toLowerCase()}`}>
            <nav><span>north coffee</span><span>Menu&nbsp;&nbsp;Visit</span></nav>
            <div className="stage-copy">
              <div className="stage-heading-select">
                <small>Heading</small>
                <h3 className={fonts.find((font) => font.name === selectedFont)?.className}>Coffee worth slowing down for.</h3>
                <i /><i /><i /><i />
              </div>
              <p>Small batches, familiar faces and a quiet place to spend the better part of your morning.</p>
              <button>Visit us</button>
            </div>
            <div className="coffee-shape" aria-hidden="true"><span /></div>
          </div>
        </div>
        <aside className="hero-editor__fonts">
          <div className="font-panel-title"><Type size={15} /><strong>Font</strong></div>
          {fonts.slice(0, 4).map((font) => (
            <button key={font.name} onClick={() => setSelectedFont(font.name)} className={selectedFont === font.name ? 'is-selected' : ''}>
              <span className={font.className}>{font.name}</span>
              {selectedFont === font.name && <Check size={13} />}
            </button>
          ))}
        </aside>
      </div>
    </div>
  )
}

function FontShowcase() {
  const [activeFont, setActiveFont] = useState(fonts[0])
  const [script, setScript] = useState('All')
  const [preview, setPreview] = useState('Make something people remember.')

  return (
    <section className="fonts-section" id="fonts">
      <div className="fonts-section__intro">
        <h2>Find the typeface that gives your site a voice.</h2>
        <p>Browse Google Fonts with a live preview, then narrow the library by language or style before you bring a typeface into the page.</p>
      </div>
      <div className="font-workbench">
        <div className="font-browser">
          <label className="search-field">
            <span>Search fonts</span>
            <input type="search" placeholder="Try Manrope or Onest" />
          </label>
          <div className="font-filters" aria-label="Writing system">
            {['All', 'Latin', 'Cyrillic'].map((item) => (
              <button key={item} className={script === item ? 'is-active' : ''} onClick={() => setScript(item)}>{item}</button>
            ))}
          </div>
          <div className="font-categories"><span>Sans Serif</span><span>Serif</span><span>Display</span><span>Monospace</span></div>
          <div className="font-list">
            {fonts.filter((font) => script === 'All' || font.script === script).map((font) => (
              <button key={font.name} className={activeFont.name === font.name ? 'is-active' : ''} onClick={() => setActiveFont(font)}>
                <span className="font-list__meta"><b>{font.name}</b><small>{font.script}</small></span>
                <span className={font.className}>A voice of its own</span>
              </button>
            ))}
          </div>
        </div>
        <div className="font-preview">
          <div className="font-preview__top">
            <span>Live preview</span>
            <span>{activeFont.name} · 64</span>
          </div>
          <textarea className={activeFont.className} value={preview} onChange={(event) => setPreview(event.target.value)} aria-label="Font preview text" />
          <div className="font-pairing">
            <span>Looks great with…</span>
            <strong className="font-onest">Onest for comfortable reading</strong>
          </div>
        </div>
      </div>
    </section>
  )
}

function SiteShowcase() {
  return (
    <section className="site-showcase">
      <header>
        <h2>One builder should not make every website look the same.</h2>
        <p>The tools keep the structure clear. You still decide how the colour, typography, composition and personality come together.</p>
      </header>
      <div className="site-collage">
        <article className="site-sample site-sample--coffee">
          <nav><b>north</b><span>Menu&nbsp;&nbsp;Visit</span></nav>
          <h3>Slow mornings,<br />proper coffee.</h3>
          <div className="sample-cup" aria-hidden="true"><span /></div>
          <small>Open daily from 7:30</small>
        </article>
        <article className="site-sample site-sample--studio">
          <span className="studio-dot" />
          <p>Independent creative studio</p>
          <h3>Make<br />some<br />noise.</h3>
          <button>See the work <ArrowRight size={15} /></button>
        </article>
        <article className="site-sample site-sample--portfolio">
          <header><b>AVA LIN</b><span>Selected work 2024–26</span></header>
          <div className="portfolio-art" aria-hidden="true" />
          <h3>Objects, identities and digital spaces.</h3>
          <footer><span>Based in Copenhagen</span><span>Available for selected projects</span></footer>
        </article>
      </div>
    </section>
  )
}

export function Landing({ onBuild }: LandingProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const heroRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const element = heroRef.current
    if (!element) return
    const move = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 1.4
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 1.4
      element.style.setProperty('--hero-x', `${x}deg`)
      element.style.setProperty('--hero-y', `${y}deg`)
    }
    element.addEventListener('pointermove', move)
    return () => element.removeEventListener('pointermove', move)
  }, [])

  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="landing">
      <header className={`site-nav ${menuOpen ? 'is-open' : ''}`}>
        <a href="#top" aria-label="sunConstructor home"><Brand /></a>
        <nav className="site-nav__links" aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#fonts">Fonts</a>
        </nav>
        <button className="button button--dark site-nav__cta" onClick={onBuild}>Start creating <ArrowRight size={16} /></button>
        <button className="nav-toggle" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Toggle navigation">
          {menuOpen ? <X /> : <Menu />}
        </button>
        <div className="mobile-nav">
          <a href="#features" onClick={closeMenu}>Features</a>
          <a href="#how" onClick={closeMenu}>How it works</a>
          <a href="#fonts" onClick={closeMenu}>Fonts</a>
          <button className="button button--dark" onClick={onBuild}>Start creating <ArrowRight size={16} /></button>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero__copy">
            <h1 ref={heroRef}>Build a website that actually feels like yours.</h1>
            <p>Create, arrange and style every part of your website visually, then keep the finished project with you without setting up accounts or learning complicated tools.</p>
            <div className="hero__actions">
              <button className="button button--sun" onClick={onBuild}>Create your website <ArrowRight size={18} /></button>
              <a className="text-link" href="#how">See how it works <ArrowDown size={16} /></a>
            </div>
            <span className="hero__trust"><Check size={15} /> No account required. Your projects stay on your device.</span>
          </div>
          <div className="hero__product"><HeroEditor /></div>
        </section>

        <section className="feature-stage" id="features">
          <header className="section-heading">
            <h2>Everything you need, without everything getting in the way.</h2>
          </header>
          <div className="feature-story feature-story--edit">
            <div className="feature-story__copy">
              <span className="story-index">A</span>
              <h3>Move things around until the page feels right.</h3>
              <p>Add headings, images, buttons and complete sections, then edit them where they appear instead of hunting through a separate settings screen.</p>
            </div>
            <div className="drag-demo" aria-label="Selected heading editing preview">
              <div className="drag-demo__toolbar"><span>Heading</span><b>Move</b><b>Edit</b><b>Style</b></div>
              <div className="drag-demo__canvas">
                <span className="drag-tag">Heading</span>
                <h4>Quiet rooms.<br />Loud ideas.</h4>
                <i /><i /><i /><i />
              </div>
            </div>
          </div>
          <div className="feature-story feature-story--devices">
            <div className="devices-demo" aria-label="Desktop, tablet and mobile page previews">
              {['desktop', 'tablet', 'mobile'].map((device) => (
                <div className={`device-page device-page--${device}`} key={device}>
                  <span /><h4>Field Notes</h4><p>Stories from a slower road.</p><i />
                </div>
              ))}
            </div>
            <div className="feature-story__copy">
              <span className="story-index">B</span>
              <h3>Make it look right on every screen.</h3>
              <p>Move between desktop, tablet and mobile views, then adjust the details that need a little more care on smaller screens.</p>
            </div>
          </div>
          <div className="feature-story feature-story--local">
            <div className="feature-story__copy">
              <span className="story-index">C</span>
              <h3>Your work stays with you.</h3>
              <p>The project is kept in your browser and can be saved as a separate backup file, so opening an account is not part of getting started.</p>
            </div>
            <div className="save-demo" aria-label="Local project export options">
              <div><Check size={20} /><span><b>North Coffee</b><small>Saved on this device</small></span></div>
              <button>Project backup <ArrowRight size={16} /></button>
              <button>Finished website <ArrowRight size={16} /></button>
            </div>
          </div>
        </section>

        <FontShowcase />
        <SiteShowcase />

        <section className="process" id="how">
          <header><h2>Start with a page, not a manual.</h2></header>
          <ol>
            {workSteps.map((step) => (
              <li key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
                <ChevronRight aria-hidden="true" />
              </li>
            ))}
          </ol>
        </section>

        <section className="privacy" id="privacy">
          <div className="privacy__sun" aria-hidden="true"><span /></div>
          <div className="privacy__copy">
            <h2>Your draft does not need to live on somebody else’s server.</h2>
            <p>sunConstructor keeps your projects in your browser by default, so you can start creating without making an account or sending every unfinished idea to a cloud workspace.</p>
          </div>
          <div className="privacy__facts"><span>No account to start</span><span>Local project storage</span><span>Portable project backups</span></div>
        </section>

        <section className="final-cta">
          <span className="final-cta__sun" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></span>
          <h2>Your next website can start as an empty page.</h2>
          <div>
            <p>Give it a name, choose a direction and start shaping it in your browser.</p>
            <button className="button button--dark" onClick={onBuild}>Open sunConstructor <ArrowRight size={19} /></button>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="site-footer__identity">
          <Brand compact />
          <a className="creator-mark" href="https://github.com/lordofsunshine" target="_blank" rel="noreferrer" data-tooltip="it's been a tradition since 2020, and I'm still following it :З" aria-label="brought to life by lordofsunshine on GitHub">brought to life by lordofsunshine</a>
        </div>
        <span>2026</span>
        <nav><a href="#top">About</a><a href="#privacy">Privacy</a><a href="https://github.com/lordofsunshine" target="_blank" rel="noreferrer">GitHub</a></nav>
      </footer>
    </div>
  )
}
