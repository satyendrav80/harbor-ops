import { ReactNode } from 'react';
import Button from './Button';

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel }: {
  open: boolean;
  title?: string;
  message?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60" onClick={onCancel}>
      <div className="card w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
        {title && <h2 className="text-lg font-semibold mb-2">{title}</h2>}
        {message && <div className="text-slate-300 mb-4">{message}</div>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button onClick={onConfirm}>Confirm</Button>
        </div>
      </div>
    </div>
  );
}
