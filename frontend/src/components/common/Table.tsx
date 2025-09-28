import { useMemo, useState } from 'react';

type Column<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
};

export default function Table<T extends Record<string, any>>({ columns, rows }: Props<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = (a as any)[sort.key];
      const bv = (b as any)[sort.key];
      if (av === bv) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return sort.dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return copy;
  }, [rows, sort]);

  function toggleSort(key: string) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      return prev.dir === 'asc' ? { key, dir: 'desc' } : null;
    });
  }

  return (
    <div className="overflow-x-auto rounded-md border border-slate-800">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-900">
          <tr>
            {columns.map((c) => (
              <th
                key={String(c.key)}
                className="text-left px-3 py-2 font-medium text-slate-300 select-none"
                onClick={() => c.sortable && toggleSort(String(c.key))}
              >
                {c.header}
                {sort?.key === c.key && <span className="ml-1 text-slate-500">{sort.dir === 'asc' ? '▲' : '▼'}</span>}
              </th>
            ))}
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} className="border-t border-slate-800 hover:bg-slate-900/60">
              {columns.map((c) => (
                <td key={String(c.key)} className="px-3 py-2 text-slate-200">
                  {c.render ? c.render(row) : String((row as any)[c.key])}
                </td>
              ))}
              <td className="px-3 py-2"></td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="px-3 py-6 text-slate-400" colSpan={columns.length + 1}>
                No data.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
