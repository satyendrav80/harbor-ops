/* Purpose: Credentials placeholder page */
import Button from '../../components/common/Button';

export default function CredentialsList() {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Credentials</h1>
          <p className="text-sm text-slate-400">Secure SSH keys and API tokens centrally. Configure access control via roles.</p>
        </div>
        <Button>Store credential</Button>
      </div>
      <div className="rounded-2xl border border-dashed border-[#2b3857] bg-[#121b31] p-8 text-center text-sm text-slate-400">
        Once Harbor-Ops agents sync with your infrastructure, credentials will be listed here with quick revocation actions.
      </div>
    </div>
  );
}
