/* Purpose: Basic modal overlay with card */
import { ReactNode } from 'react';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

export default function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(8,15,35,0.65)] backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        {title && <h2 className="text-lg font-semibold mb-4">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
