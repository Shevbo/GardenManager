export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-forest flex">
      {/* Left: decorative panel */}
      <div className="hidden lg:flex lg:w-2/5 flex-col justify-between p-10 relative overflow-hidden">
        {/* Geometric background shapes */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-forest-light/30 rounded-full -translate-y-1/3 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-forest-mid/40 rounded-full translate-y-1/3 -translate-x-1/4" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-amber/20 rounded-3xl rotate-12" />
          <div className="absolute top-1/3 right-12 w-4 h-4 bg-amber rounded-full" />
          <div className="absolute bottom-1/3 left-16 w-3 h-3 bg-amber/60 rounded-full" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber rounded-xl flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L17 8V18H13V13H7V18H3V8L10 2Z" fill="#1A1A18"/>
              </svg>
            </div>
            <span className="text-white font-display font-bold text-lg">Garden Manager</span>
          </div>
        </div>

        <div className="relative space-y-4">
          <h2 className="text-white font-display text-3xl font-bold leading-tight">
            Управляйте домом<br />
            <span className="text-amber">вместе</span>
          </h2>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Голосования, заявления, финансы и чаты —
            всё для собственников одного ЖК
          </p>
        </div>

        <div className="relative flex items-center gap-3">
          {['Прозрачность', 'Безопасность', 'Удобство'].map((t) => (
            <span key={t} className="text-[11px] text-white/50 bg-white/10 px-2.5 py-1 rounded-full">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Right: form panel */}
      <div className="flex-1 bg-cream flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
