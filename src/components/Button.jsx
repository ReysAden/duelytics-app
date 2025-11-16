export function Button({ 
  children, 
  variant = 'primary', 
  disabled = false,
  onClick,
  className = '',
  ...props 
}) {
  const baseStyles = 'px-6 py-2.5 rounded-full font-medium transition-all duration-200 cursor-pointer text-sm';
  
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: 'bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed',
    success: 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed',
    ghost: 'bg-transparent text-white border border-white/30 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed',
  };

  const variantClass = variants[variant] || variants.primary;

  return (
    <button 
      className={`${baseStyles} ${variantClass} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
