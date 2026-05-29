import { Sparkles } from 'lucide-react'
import PageHeader from './PageHeader'

export default function ModulePlaceholder({ title, subtitle, icon: Icon, features }) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="panel">
        <div className="empty-state">
          <div className="empty-icon">
            <Icon />
          </div>
          <div className="empty-title">Módulo em construção</div>
          <p className="empty-text">
            Este módulo faz parte da próxima etapa do DemandFlow. O núcleo
            (Dashboard, Demandas e Clientes) já está funcional.
          </p>
          <div
            className="mt-24"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 10,
              width: '100%',
              maxWidth: 720,
            }}
          >
            {features.map((f) => (
              <div key={f} className="muted-box flex items-center gap-8" style={{ textAlign: 'left' }}>
                <Sparkles size={15} className="text-neon" />
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
