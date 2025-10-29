/* Purpose: Shared layout wrapper for authentication screens */
const features = [
  'Unified server observability',
  'Zero-copy credential storage',
  'Release note automation'
];

type Props = {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export default function AuthLayout({ title, description, children, footer }: Props) {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>{title}</h1>
        <p className="text-sm text-slate-400 mb-4">{description}</p>
        {children}
        {footer && <div className="mt-4 text-sm text-slate-400">{footer}</div>}
      </div>
      <aside className="hidden max-w-md text-slate-300 lg:block">
        <h2 className="text-lg font-semibold text-white mb-3">Why Harbor-Ops?</h2>
        <ul className="space-y-3 text-sm">
          {features.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
