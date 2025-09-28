import { useEffect, useState } from 'react';

function App() {
  const [status, setStatus] = useState<string>('Checking...');
  const baseUrl = import.meta.env.BACKEND_URL || '';
  useEffect(() => {
    fetch(`${baseUrl}/health`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.ok) {
          setStatus('Backend OK');
        } else {
          setStatus('Backend Unavailable');
        }
      })
      .catch(() => setStatus('Backend Unavailable'));
  }, [baseUrl]);

  return (
    <div className="min-h-screen grid place-items-center p-8">
      <div className="text-2xl font-semibold">{status}</div>
    </div>
  );
}

export default App;
