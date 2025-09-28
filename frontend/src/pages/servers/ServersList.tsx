import { useMemo, useState } from 'react';
import useFetch from '../../hooks/useFetch';
import api from '../../lib/api';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import ServerForm from './ServerForm';
import ServerRow from './ServerRow';

export type Server = {
  id: number;
  name: string;
  publicIp: string;
  privateIp: string;
  sshPort: number;
  username: string;
  createdAt: string;
};

async function fetchServers(): Promise<Server[]> {
  const res = await api.get('/servers');
  return res.data as Server[];
}

export default function ServersList() {
  const { data, loading, error, refetch } = useFetch<Server[]>(fetchServers);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const servers = data || [];
  const filtered = useMemo(() => servers.filter((s) => s.name.toLowerCase().includes(query.toLowerCase())), [servers, query]);

  // Simple client-side pagination
  const pageSize = 25;
  const [page, setPage] = useState(0);
  const pageCount = Math.ceil(filtered.length / pageSize);
  const pageItems = filtered.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <input
          placeholder="Search servers..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(0); }}
          className="rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 w-64"
          aria-label="Search servers"
        />
        <Button onClick={() => setOpen(true)}>Create Server</Button>
      </div>

      {loading && <div className="text-slate-400">Loading...</div>}
      {error && <div className="text-red-400">{error}</div>}

      {!loading && filtered.length === 0 && (
        <EmptyState title="No servers found" action={<Button onClick={() => setOpen(true)}>Create your first server</Button>} />
      )}

      {!loading && filtered.length > 0 && (
        <Table
          columns={[
            { key: 'name', header: 'Name', sortable: true, render: (s: any) => <ServerRow server={s} onChanged={refetch} /> },
            { key: 'publicIp', header: 'Public IP', sortable: true },
            { key: 'privateIp', header: 'Private IP', sortable: true },
            { key: 'sshPort', header: 'SSH', sortable: true },
            { key: 'username', header: 'User', sortable: true },
            { key: 'createdAt', header: 'Created', sortable: true },
          ]}
          rows={pageItems}
        />
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-2 mt-3 text-sm">
          <Button variant="secondary" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Prev</Button>
          <div className="text-slate-400">Page {page + 1} / {pageCount}</div>
          <Button variant="secondary" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page + 1 >= pageCount}>Next</Button>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Create Server">
        <ServerForm open={open} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); refetch(); }} />
      </Modal>
    </div>
  );
}
