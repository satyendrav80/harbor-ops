import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ServersList from '../../../src/pages/servers/ServersList';

vi.mock('../../../src/lib/api', () => {
  return {
    __esModule: true,
    default: {
      get: vi.fn().mockResolvedValue({ data: [
        { id: 1, name: 'alpha', publicIp: '', privateIp: '', sshPort: 22, username: 'root', createdAt: new Date().toISOString() },
        { id: 2, name: 'beta', publicIp: '', privateIp: '', sshPort: 22, username: 'root', createdAt: new Date().toISOString() },
      ] })
    }
  };
});

describe('ServersList', () => {
  it('renders server names', async () => {
    render(<ServersList />);
    expect(await screen.findByText('alpha')).toBeTruthy();
    expect(await screen.findByText('beta')).toBeTruthy();
  });
});
