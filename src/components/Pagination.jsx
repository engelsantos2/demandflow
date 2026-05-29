import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function usePaginated(items, defaultSize = 10) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultSize)
  const total = items.length
  const pages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    if (page > pages) setPage(1)
  }, [page, pages])

  const start = (page - 1) * pageSize
  const paged = items.slice(start, start + pageSize)
  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    pages,
    total,
    paged,
    from: total ? start + 1 : 0,
    to: Math.min(start + pageSize, total),
  }
}

export default function Pagination({
  page,
  pages,
  from,
  to,
  total,
  pageSize,
  onPage,
  onPageSize,
}) {
  if (total === 0) return null
  return (
    <div className="pagination">
      <span className="text-xs text-2">
        {from}–{to} de {total}
      </span>
      <div className="flex gap-8 items-center">
        {onPageSize && (
          <select
            className="select"
            style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }}
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} por página
              </option>
            ))}
          </select>
        )}
        <button
          className="btn btn-sm btn-icon"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs" style={{ minWidth: 100, textAlign: 'center' }}>
          Página {page} de {pages}
        </span>
        <button
          className="btn btn-sm btn-icon"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
