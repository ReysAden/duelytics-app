export function FormGroup({ label, children, className = '' }) {
  return (
    <div className={`mb-5 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-white/90 mb-2">
          {label}
        </label>
      )}
      {children}
    </div>
  );
}
