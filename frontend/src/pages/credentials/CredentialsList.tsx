/* Purpose: Credentials placeholder page */
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';

export default function CredentialsList() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Credentials"
        description="Secure SSH keys and API tokens centrally. Configure access control via roles."
        action={<Button>Store credential</Button>}
      />
      <div className="card p-8 text-center text-sm text-slate-400">
        Once Harbor-Ops agents sync with your infrastructure, credentials will be listed here with quick revocation actions.
      </div>
    </div>
  );
}
