import { useState } from 'react';
import Button from '../../components/common/Button';
import InputField from '../../components/forms/InputField';
import api from '../../lib/api';
import type { Server } from './ServersList';

export default function ServerForm({ open, onClose, initialData, onSaved }: { open: boolean; onClose: () => void; initialData?: Server | null; onSaved: () => void; }) {
  const [name, setName] = useState(initialData?.name || '');
  const [publicIp, setPublicIp] = useState(initialData?.publicIp || '');
  const [privateIp, setPrivateIp] = useState(initialData?.privateIp || '');
  const [sshPort, setSshPort] = useState<number>(initialData?.sshPort || 22);
  const [username, setUsername] = useState(initialData?.username || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate() {
    if (!name.trim()) return 'Name is required';
    if (!username.trim()) return 'Username is required';
    if (sshPort < 1 || sshPort > 65535) return 'SSH port must be between 1 and 65535';
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    if (v) return setError(v);
    setError(null);
    setLoading(true);
    try {
      const payload: any = { name, publicIp, privateIp, sshPort, username };
      if (password) payload.password = password;
      if (initialData) await api.put(`/servers/${initialData.id}`, payload);
      else await api.post('/servers', payload);
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <InputField label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
      <InputField label="Public IP" value={publicIp} onChange={(e) => setPublicIp(e.target.value)} />
      <InputField label="Private IP" value={privateIp} onChange={(e) => setPrivateIp(e.target.value)} />
      <InputField label="SSH Port" type="number" value={sshPort} onChange={(e) => setSshPort(parseInt(e.target.value || '0', 10))} min={1} max={65535} required />
      <InputField label="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
      <InputField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={initialData ? 'Leave blank to keep' : ''} />
      {error && <div className="text-red-400 text-sm">{error}</div>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={loading}>{initialData ? 'Save Changes' : 'Create Server'}</Button>
      </div>
    </form>
  );
}
