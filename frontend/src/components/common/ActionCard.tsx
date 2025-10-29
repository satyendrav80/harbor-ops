/* Purpose: CTA card with icon, title, description, and optional link */
import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Props = {
  icon: ReactNode;
  title: string;
  description: string;
  to?: string;
  actionLabel?: string;
};

export default function ActionCard({ icon, title, description, to, actionLabel }: Props) {
  const content = (
    <div className="card p-5 flex items-start gap-3 hover:border-blue-600 transition-colors">
      <span className="mt-1 grid h-10 w-10 place-items-center rounded-full bg-[#1f2b46] text-blue-300">
        {icon}
      </span>
      <div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <p className="text-sm text-slate-400 mt-1">{description}</p>
        {actionLabel && <span className="mt-2 inline-block text-sm font-medium text-blue-300">{actionLabel} →</span>}
      </div>
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}
