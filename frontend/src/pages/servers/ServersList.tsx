/* Purpose: Servers list fetching /servers with simple table */
import { useMemo, useState } from 'react';
import useFetch from '../../hooks/useFetch';
import api from '../../lib/api';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';

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
  const filtered = useMemo(() => {
    const list = data ?? [];
    return list.filter((srv) => srv.name.toLowerCase().includes(query.toLowerCase()));
  }, [data, query]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Servers"
        description="Provisioned compute targets connected to Harbor-Ops agents."
        action={
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="input md:w-56"
              aria-label="Search servers"
            />
            <Button variant="secondary" onClick={refetch}>Refresh</Button>
            <Button>Create server</Button>
          </div>
        }
      />

      {loading && <div className="text-slate-400">Loading servers…</div>}
      {error && <div className="text-red-400">{error}</div>}

      {!loading && filtered.length === 0 && (
        <EmptyState title="No servers found" action={<Button onClick={() => setQuery('')}>Clear filters</Button>} />
      )}

      {!loading && filtered.length > 0 && (
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Public IP</th>
                <th>Private IP</th>
                <th>SSH Port</th>
                <th>User</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((srv) => (
                <tr key={srv.id}>
                  <td className="font-medium text-white">{srv.name}</td>
                  <td>{srv.publicIp || '—'}</td>
                  <td>{srv.privateIp || '—'}</td>
                  <td>{srv.sshPort}</td>
                  <td>{srv.username}</td>
                  <td>{new Date(srv.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
