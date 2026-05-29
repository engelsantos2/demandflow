export default function Field({ label, required, error, children, hint }) {
  return (
    <div className="field">
      {label && (
        <label className="label">
          {label} {required && <span className="req">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <span className="text-xs text-2">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </div>
  )
}
