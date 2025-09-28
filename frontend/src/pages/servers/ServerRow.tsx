import { useState } from 'react';
import type { Server } from './ServersList';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Modal from '../../components/common/Modal';
import ServerForm from './ServerForm';
import api from '../../lib/api';

export default function ServerRow({ server, onChanged }: { server: Server; onChanged: () => void }) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function onDelete() {
    await api.delete(`/servers/${server.id}`);
    setConfirmOpen(false);
    onChanged();
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <a href="#" className="text-blue-400 hover:underline" onClick={(e) => e.preventDefault()}>{server.name}</a>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => setEditOpen(true)}>Edit</Button>
        <Button variant="ghost" onClick={() => setConfirmOpen(true)}>Delete</Button>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Server">
        <ServerForm open={editOpen} onClose={() => setEditOpen(false)} initialData={server} onSaved={() => { setEditOpen(false); onChanged(); }} />
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete server?"
        message={`Are you sure you want to delete ${server.name}?`}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={onDelete}
      />
    </div>
  );
}
