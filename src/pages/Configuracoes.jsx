import { useRef, useState } from 'react'
import {
  Building2,
  Save,
  RotateCcw,
  Database,
  Eraser,
  Download,
  Upload,
  Users as UsersIcon,
  Plus,
  Pencil,
  Trash2,
  Target,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Field from '../components/Field'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import UserModal from '../components/UserModal'
import {
  useDB,
  updateSettings,
  resetDB,
  resetEmpty,
  exportBackup,
  importBackup,
  remove,
} from '../data/store'
import { useUI } from '../components/UIProvider'
import { useAuth } from '../components/AuthProvider'
import { canManageUsers, permissionsSummary } from '../lib/permissions'
import { todayISO } from '../lib/format'

export default function Configuracoes() {
  const db = useDB()
  const { user: currentUser } = useAuth()
  const { toast, confirm } = useUI()
  const isAdmin = canManageUsers(currentUser)

  const [form, setForm] = useState(db.settings)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [editingUserId, setEditingUserId] = useState(null)
  const fileRef = useRef(null)

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target ? e.target.value : e }))

  const save = (e) => {
    e.preventDefault()
    updateSettings({ ...form, monthlyGoal: Number(form.monthlyGoal) || 0 })
    toast('Configurações salvas com sucesso')
  }

  const handleReset = async () => {
    const ok = await confirm({
      title: 'Apagar todos os dados',
      message:
        'Isso vai apagar todos os seus dados na nuvem. Esta ação não pode ser desfeita.',
      confirmLabel: 'Apagar tudo',
      danger: true,
    })
    if (!ok) return
    await resetDB()
    window.location.reload()
  }

  const handleResetAccount = async () => {
    const ok = await confirm({
      title: 'Resetar conta',
      message:
        'Isso vai APAGAR todos os cadastros (clientes, demandas, propostas, lançamentos financeiros e serviços). As configurações da empresa serão mantidas. Esta ação não pode ser desfeita.',
      confirmLabel: 'Resetar conta',
      danger: true,
    })
    if (!ok) return
    await resetEmpty()
    window.location.reload()
  }

  const handleExportBackup = () => {
    const json = exportBackup()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `demandflow-backup-${todayISO()}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast('Backup exportado')
  }

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ok = await confirm({
      title: 'Importar backup',
      message:
        'Isso vai SUBSTITUIR todos os dados atuais pelo conteúdo do arquivo. Tem certeza?',
      confirmLabel: 'Importar',
      danger: true,
    })
    if (!ok) {
      e.target.value = ''
      return
    }
    try {
      const text = await file.text()
      await importBackup(text)
      toast('Backup importado com sucesso')
      window.location.reload()
    } catch (err) {
      toast('Erro ao importar: ' + err.message, 'error')
    }
    e.target.value = ''
  }

  const openNewUser = () => {
    setEditingUserId(null)
    setUserModalOpen(true)
  }
  const openEditUser = (id) => {
    setEditingUserId(id)
    setUserModalOpen(true)
  }
  const handleDeleteUser = async (u) => {
    if (u.id === currentUser.id) {
      toast('Você não pode excluir o próprio usuário', 'error')
      return
    }
    const ok = await confirm({
      title: 'Excluir usuário',
      message: `O usuário "${u.name}" será removido. Deseja continuar?`,
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!ok) return
    remove('users', u.id)
    toast('Usuário removido', 'info')
  }

  return (
    <>
      <PageHeader
        title="Configurações"
        subtitle="Dados da empresa, backup e gestão do sistema"
      />

      <form onSubmit={save} className="grid" style={{ maxWidth: 880 }}>
        <div className="panel">
          <div className="panel-head">
            <div className="flex items-center gap-8">
              <Building2 size={18} className="text-neon" />
              <span className="panel-title">Dados da empresa</span>
            </div>
          </div>

          <Field label="Nome da empresa">
            <input className="input" value={form.companyName || ''} onChange={set('companyName')} />
          </Field>
          <div className="form-row cols-2">
            <Field label="E-mail">
              <input className="input" value={form.companyEmail || ''} onChange={set('companyEmail')} />
            </Field>
            <Field label="Telefone">
              <input className="input" value={form.companyPhone || ''} onChange={set('companyPhone')} />
            </Field>
          </div>
          <div className="form-row cols-2">
            <Field label="CNPJ / Documento">
              <input className="input" value={form.companyDocument || ''} onChange={set('companyDocument')} />
            </Field>
            <Field label="Endereço">
              <input className="input" value={form.companyAddress || ''} onChange={set('companyAddress')} />
            </Field>
          </div>
          <Field label="Dados bancários / PIX" hint="Aparecem nas propostas comerciais.">
            <input className="input" value={form.bankInfo || ''} onChange={set('bankInfo')} />
          </Field>
          <Field label="Termos padrão para propostas">
            <textarea
              className="textarea"
              rows={3}
              value={form.defaultTerms || ''}
              onChange={set('defaultTerms')}
            />
          </Field>

          <div className="divider" />
          <div className="flex items-center gap-8 mb-16">
            <Target size={16} className="text-neon" />
            <span className="panel-title">Meta mensal de faturamento</span>
          </div>
          <Field
            label="Meta mensal (R$)"
            hint="Aparece como barra de progresso no Dashboard."
          >
            <input
              type="number"
              min="0"
              className="input"
              value={form.monthlyGoal ?? ''}
              onChange={set('monthlyGoal')}
              placeholder="0,00"
            />
          </Field>

          <div className="flex justify-between items-center mt-8">
            <span className="text-xs text-2">
              Sistema: <strong className="text-neon">DemandFlow</strong>.
            </span>
            <button type="submit" className="btn btn-primary">
              <Save size={15} /> Salvar alterações
            </button>
          </div>
        </div>
      </form>

      {isAdmin && (
        <div className="panel mt-24" style={{ maxWidth: 880 }}>
          <div className="panel-head">
            <div className="flex items-center gap-8">
              <UsersIcon size={18} className="text-neon" />
              <span className="panel-title">Meu perfil</span>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Cargo</th>
                  <th>E-mail</th>
                  <th>Permissões</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {db.users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="avatar-row">
                        <Avatar name={u.name} size={32} />
                        <div>
                          <div className="font-bold">
                            {u.name}
                            {u.id === currentUser.id && (
                              <span className="text-xs text-neon" style={{ marginLeft: 6 }}>
                                (você)
                              </span>
                            )}
                          </div>
                          {u.isAdmin && (
                            <Badge label="Administrador" color="#00FF85" />
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-sm">{u.position || '—'}</td>
                    <td className="text-sm text-2">{u.email}</td>
                    <td className="text-xs text-2">{permissionsSummary(u)}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-icon"
                        title="Editar"
                        onClick={() => openEditUser(u.id)}
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divider" />
          <div className="text-xs text-2">
            Gestão de equipe com múltiplos membros e convites por e-mail está em
            desenvolvimento. Por enquanto, cada conta DemandFlow é independente —
            os dados ficam isolados por usuário.
          </div>
        </div>
      )}

      <div className="panel mt-24" style={{ maxWidth: 880 }}>
        <div className="panel-head">
          <div className="flex items-center gap-8">
            <Database size={18} className="text-neon" />
            <span className="panel-title">Backup de dados</span>
          </div>
        </div>
        <p className="text-sm text-2 mb-16">
          Seus dados ficam salvos na nuvem (Supabase) e sincronizam entre
          dispositivos. Mesmo assim, é boa prática exportar um JSON de backup
          em momentos importantes. Você pode reimportar para restaurar tudo.
        </p>
        <div className="flex gap-8 wrap">
          <button className="btn btn-primary" onClick={handleExportBackup}>
            <Download size={15} /> Exportar backup
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> Importar backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            onChange={handleImportFile}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      <div className="panel mt-24" style={{ maxWidth: 880, borderColor: 'rgba(239,68,68,0.3)' }}>
        <div className="panel-head">
          <div className="flex items-center gap-8">
            <Eraser size={18} className="text-danger" />
            <span className="panel-title">Zona de risco</span>
          </div>
        </div>
        <div className="muted-box" style={{ marginBottom: 12 }}>
          <div className="flex justify-between items-center wrap gap-12">
            <div>
              <div className="font-bold text-sm">Resetar conta</div>
              <div className="text-xs text-2">
                Apaga todos os cadastros e deixa o sistema vazio. Mantém os
                dados da empresa.
              </div>
            </div>
            <button type="button" className="btn btn-danger" onClick={handleResetAccount}>
              <Eraser size={15} /> Resetar conta
            </button>
          </div>
        </div>
        <div className="muted-box">
          <div className="flex justify-between items-center wrap gap-12">
            <div>
              <div className="font-bold text-sm">Restaurar dados de exemplo</div>
              <div className="text-xs text-2">
                Recria os dados de demonstração (clientes, demandas e propostas
                fictícios).
              </div>
            </div>
            <button type="button" className="btn" onClick={handleReset}>
              <RotateCcw size={15} /> Restaurar exemplo
            </button>
          </div>
        </div>
      </div>

      <UserModal
        open={userModalOpen}
        userId={editingUserId}
        onClose={() => setUserModalOpen(false)}
      />
    </>
  )
}
