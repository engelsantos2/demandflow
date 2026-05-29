import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Trash2,
  Plus,
  Paperclip,
  X,
  Check,
  Send,
  Download,
  History as HistoryIcon,
  ListChecks,
  MessageSquare,
  FileText,
} from 'lucide-react'
import { saveFile, deleteFile, downloadFile, humanSize } from '../lib/files'
import Modal from './Modal'
import Field from './Field'
import Avatar from './Avatar'
import DateInput from './DateInput'
import ClientSelect from './ClientSelect'
import { useDB, insert, update, remove } from '../data/store'
import { useUI } from './UIProvider'
import { uid, currency, formatDateTime } from '../lib/format'
import { KANBAN_COLUMNS, PRIORITIES, STATUS_LABEL } from '../lib/constants'

const BLANK = {
  title: '',
  clientId: '',
  serviceId: '',
  description: '',
  value: '',
  startDate: '',
  dueDate: '',
  priority: 'media',
  status: 'entrada',
  responsible: '',
  projectLink: '',
  notes: '',
  tags: [],
}

export default function DemandModal({ open, demandId, defaultStatus, onClose }) {
  const db = useDB()
  const { toast, confirm } = useUI()
  const demand = demandId ? db.demands.find((d) => d.id === demandId) : null
  const isEdit = !!demand

  const [tab, setTab] = useState('detalhes')
  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState({})
  const [tagInput, setTagInput] = useState('')
  const [checkInput, setCheckInput] = useState('')
  const [commentInput, setCommentInput] = useState('')
  const fileRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setTab('detalhes')
    setErrors({})
    if (demand) {
      setForm({
        title: demand.title,
        clientId: demand.clientId,
        serviceId: demand.serviceId || '',
        description: demand.description || '',
        value: demand.value || '',
        startDate: demand.startDate || '',
        dueDate: demand.dueDate || '',
        priority: demand.priority,
        status: demand.status,
        responsible: demand.responsible || '',
        projectLink: demand.projectLink || '',
        notes: demand.notes || '',
        tags: demand.tags || [],
      })
    } else {
      setForm({ ...BLANK, status: defaultStatus || 'entrada' })
    }
  }, [open, demandId, defaultStatus]) // eslint-disable-line

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target ? e.target.value : e }))

  const userName = db.users[0]?.name || 'Você'
  const userById = (id) => db.users.find((u) => u.id === id)?.name || '—'

  const validate = () => {
    const err = {}
    if (!form.title.trim()) err.title = 'Informe o título da demanda.'
    if (!form.clientId) err.clientId = 'Selecione o cliente.'
    if (form.value !== '' && Number(form.value) < 0) err.value = 'Valor inválido.'
    setErrors(err)
    return Object.keys(err).length === 0
  }

  const handleSave = () => {
    if (!validate()) {
      setTab('detalhes')
      return
    }
    const payload = {
      ...form,
      value: Number(form.value) || 0,
    }
    if (isEdit) {
      const statusChanged = demand.status !== form.status
      update('demands', demand.id, (d) => {
        const history = [...d.history]
        if (statusChanged) {
          history.push({
            id: uid('h'),
            date: new Date().toISOString(),
            text: `Status alterado para "${STATUS_LABEL[form.status]}"`,
          })
        }
        return { ...payload, history }
      })
      toast('Demanda atualizada com sucesso')
    } else {
      insert('demands', {
        ...payload,
        checklist: [],
        comments: [],
        files: [],
        history: [
          {
            id: uid('h'),
            date: new Date().toISOString(),
            text: `Demanda criada em "${STATUS_LABEL[form.status]}"`,
          },
        ],
      })
      toast('Demanda criada com sucesso')
    }
    onClose()
  }

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Excluir demanda',
      message: `A demanda "${demand.title}" será removida permanentemente. Deseja continuar?`,
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!ok) return
    remove('demands', demand.id)
    toast('Demanda excluída', 'info')
    onClose()
  }

  // --- tags ---
  const addTag = () => {
    const t = tagInput.trim()
    if (t && !form.tags.includes(t)) {
      setForm((f) => ({ ...f, tags: [...f.tags, t] }))
    }
    setTagInput('')
  }
  const removeTag = (t) =>
    setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }))

  // --- checklist (live, somente em edição) ---
  const toggleCheck = (id) =>
    update('demands', demand.id, (d) => ({
      checklist: d.checklist.map((c) =>
        c.id === id ? { ...c, completed: !c.completed } : c,
      ),
    }))
  const addCheck = () => {
    const t = checkInput.trim()
    if (!t) return
    update('demands', demand.id, (d) => ({
      checklist: [...d.checklist, { id: uid('t'), title: t, completed: false }],
    }))
    setCheckInput('')
  }
  const removeCheck = (id) =>
    update('demands', demand.id, (d) => ({
      checklist: d.checklist.filter((c) => c.id !== id),
    }))

  // --- comentários ---
  const addComment = () => {
    const t = commentInput.trim()
    if (!t) return
    update('demands', demand.id, (d) => ({
      comments: [
        ...d.comments,
        { id: uid('cm'), author: userName, text: t, date: new Date().toISOString() },
      ],
      history: [
        ...d.history,
        { id: uid('h'), date: new Date().toISOString(), text: 'Novo comentário adicionado' },
      ],
    }))
    setCommentInput('')
  }

  // --- arquivos ---
  const onPickFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const id = uid('f')
    try {
      await saveFile(id, file)
      update('demands', demand.id, (d) => ({
        files: [
          ...d.files,
          { id, name: file.name, size: humanSize(file.size), type: file.type, stored: true },
        ],
      }))
      toast('Anexo adicionado')
    } catch (err) {
      toast('Erro ao salvar anexo: ' + err.message, 'error')
    }
    e.target.value = ''
  }
  const removeFile = async (id) => {
    await deleteFile(id)
    update('demands', demand.id, (d) => ({
      files: d.files.filter((f) => f.id !== id),
    }))
  }
  const handleDownload = async (file) => {
    try {
      await downloadFile(file.id, file.name)
    } catch {
      toast('Este anexo de exemplo não tem arquivo associado.', 'warn')
    }
  }

  const progress = useMemo(() => {
    if (!demand?.checklist?.length) return 0
    const done = demand.checklist.filter((c) => c.completed).length
    return Math.round((done / demand.checklist.length) * 100)
  }, [demand])

  const TABS = isEdit
    ? [
        { id: 'detalhes', label: 'Detalhes', icon: FileText },
        { id: 'checklist', label: 'Checklist', icon: ListChecks },
        { id: 'comentarios', label: 'Comentários', icon: MessageSquare },
        { id: 'historico', label: 'Histórico', icon: HistoryIcon },
      ]
    : [{ id: 'detalhes', label: 'Detalhes', icon: FileText }]

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Editar demanda' : 'Nova demanda'}
      footer={
        <>
          {isEdit && (
            <button
              className="btn btn-danger"
              style={{ marginRight: 'auto' }}
              onClick={handleDelete}
            >
              <Trash2 size={15} /> Excluir
            </button>
          )}
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Check size={15} /> {isEdit ? 'Salvar alterações' : 'Criar demanda'}
          </button>
        </>
      }
    >
      <div className="flex gap-6 mb-16 wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`pill ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'detalhes' && (
        <div>
          <Field label="Título da demanda" required error={errors.title}>
            <input
              className={`input ${errors.title ? 'error' : ''}`}
              value={form.title}
              onChange={set('title')}
              placeholder="Ex.: Landing Page institucional"
            />
          </Field>

          <div className="form-row cols-2">
            <Field label="Cliente" required error={errors.clientId}>
              <ClientSelect
                value={form.clientId}
                error={errors.clientId}
                onChange={(id) => setForm((f) => ({ ...f, clientId: id }))}
              />
            </Field>
            <Field label="Tipo de serviço">
              <select className="select" value={form.serviceId} onChange={set('serviceId')}>
                <option value="">Selecione...</option>
                {db.services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Descrição">
            <textarea
              className="textarea"
              rows={3}
              value={form.description}
              onChange={set('description')}
              placeholder="Descreva o que precisa ser feito..."
            />
          </Field>

          <div className="form-row cols-3">
            <Field label="Valor (R$)" error={errors.value}>
              <input
                type="number"
                className={`input ${errors.value ? 'error' : ''}`}
                value={form.value}
                onChange={set('value')}
                placeholder="0,00"
                min="0"
              />
            </Field>
            <Field label="Data de início">
              <DateInput value={form.startDate} onChange={set('startDate')} />
            </Field>
            <Field label="Data de entrega">
              <DateInput value={form.dueDate} onChange={set('dueDate')} />
            </Field>
          </div>

          <div className="form-row cols-3">
            <Field label="Prioridade">
              <select className="select" value={form.priority} onChange={set('priority')}>
                {PRIORITIES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select className="select" value={form.status} onChange={set('status')}>
                {KANBAN_COLUMNS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Responsável">
              <select className="select" value={form.responsible} onChange={set('responsible')}>
                <option value="">Selecione...</option>
                {db.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Link do projeto">
            <input
              className="input"
              value={form.projectLink}
              onChange={set('projectLink')}
              placeholder="https://..."
            />
          </Field>

          <Field label="Tags">
            <div className="flex gap-6 wrap mb-16" style={{ marginBottom: form.tags.length ? 8 : 0 }}>
              {form.tags.map((t) => (
                <span key={t} className="tag" style={{ paddingRight: 4 }}>
                  {t}
                  <button
                    onClick={() => removeTag(t)}
                    style={{ background: 'none', border: 'none', color: 'inherit', display: 'flex' }}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
            <input
              className="input"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag()
                }
              }}
              placeholder="Digite uma tag e pressione Enter"
            />
          </Field>

          <Field label="Observações">
            <textarea
              className="textarea"
              rows={2}
              value={form.notes}
              onChange={set('notes')}
              placeholder="Notas internas..."
            />
          </Field>

          {isEdit && (
            <div className="muted-box">
              <div className="flex justify-between items-center mb-16">
                <span className="label" style={{ margin: 0 }}>
                  <Paperclip size={13} style={{ verticalAlign: -2 }} /> Anexos ({demand.files.length})
                </span>
                <button className="btn btn-sm" onClick={() => fileRef.current?.click()}>
                  <Plus size={13} /> Adicionar
                </button>
                <input type="file" ref={fileRef} onChange={onPickFile} style={{ display: 'none' }} />
              </div>
              {demand.files.length === 0 ? (
                <p className="text-xs text-2">Nenhum arquivo anexado.</p>
              ) : (
                demand.files.map((f) => (
                  <div key={f.id} className="file-row">
                    <FileText size={14} className="text-2" />
                    <span className="file-row-name">{f.name}</span>
                    <span className="text-xs text-2">{f.size}</span>
                    <button
                      className="btn btn-sm btn-icon"
                      title="Baixar"
                      onClick={() => handleDownload(f)}
                    >
                      <Download size={13} />
                    </button>
                    <button
                      className="btn btn-sm btn-icon"
                      title="Remover"
                      onClick={() => removeFile(f.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'checklist' && isEdit && (
        <div>
          <div className="flex items-center justify-between mb-16">
            <span className="text-sm text-2">
              {demand.checklist.filter((c) => c.completed).length} de{' '}
              {demand.checklist.length} concluídos
            </span>
            <span className="text-sm font-bold text-neon">{progress}%</span>
          </div>
          <div className="progress mb-16">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          {demand.checklist.map((c) => (
            <div key={c.id} className="flex items-center gap-8" style={{ padding: '6px 0' }}>
              <label className="checkbox" style={{ flex: 1 }}>
                <input
                  type="checkbox"
                  checked={c.completed}
                  onChange={() => toggleCheck(c.id)}
                />
                <span style={{ textDecoration: c.completed ? 'line-through' : 'none', color: c.completed ? 'var(--text-2)' : 'var(--text)' }}>
                  {c.title}
                </span>
              </label>
              <button
                onClick={() => removeCheck(c.id)}
                style={{ background: 'none', border: 'none', color: 'var(--text-2)', display: 'flex' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <div className="flex gap-8 mt-16">
            <input
              className="input"
              value={checkInput}
              onChange={(e) => setCheckInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCheck()}
              placeholder="Nova tarefa do checklist"
            />
            <button className="btn btn-primary" onClick={addCheck}>
              <Plus size={15} />
            </button>
          </div>
        </div>
      )}

      {tab === 'comentarios' && isEdit && (
        <div>
          {demand.comments.length === 0 && (
            <p className="text-sm text-2 mb-16">Nenhum comentário ainda.</p>
          )}
          {demand.comments.map((c) => (
            <div key={c.id} className="flex gap-12" style={{ padding: '8px 0' }}>
              <Avatar name={c.author} size={32} />
              <div style={{ flex: 1 }}>
                <div className="flex items-center gap-8">
                  <span className="text-sm font-bold">{c.author}</span>
                  <span className="text-xs text-2">{formatDateTime(c.date)}</span>
                </div>
                <div className="text-sm">{c.text}</div>
              </div>
            </div>
          ))}
          <div className="flex gap-8 mt-16">
            <textarea
              className="textarea"
              rows={2}
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Escreva um comentário interno..."
            />
            <button className="btn btn-primary" onClick={addComment}>
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      {tab === 'historico' && isEdit && (
        <div>
          {[...demand.history].reverse().map((h) => (
            <div key={h.id} className="list-row">
              <span className="dot-sm" style={{ background: 'var(--neon)', width: 8, height: 8 }} />
              <div style={{ flex: 1 }}>
                <div className="text-sm">{h.text}</div>
                <div className="text-xs text-2">{formatDateTime(h.date)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
