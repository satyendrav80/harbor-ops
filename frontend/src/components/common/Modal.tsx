import { ReactNode } from 'react';

export default function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60" onClick={onClose}>
      <div className="card w-full max-w-lg p-4" onClick={(e) => e.stopPropagation()}>
        {title && <h2 className="text-lg font-semibold mb-3">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
