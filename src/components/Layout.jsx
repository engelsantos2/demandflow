import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function Layout() {
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="app">
      <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />
      <div
        className={`scrim ${navOpen ? 'show' : ''}`}
        onClick={() => setNavOpen(false)}
      />
      <div className="main">
        <Topbar onToggleNav={() => setNavOpen((o) => !o)} />
        {/* key na rota força remount = cross-fade entre páginas */}
        <div className="content" key={location.pathname}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
