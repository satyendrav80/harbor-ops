export default function EmptyState({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="border border-dashed border-slate-700 rounded-md p-10 text-center text-slate-400">
      <div className="mb-3">{title}</div>
      {action}
    </div>
  );
}
