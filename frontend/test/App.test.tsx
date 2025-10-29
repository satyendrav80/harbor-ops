import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthProvider } from '../src/state/AuthContext';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';

describe('App routing', () => {
  it('shows login page by default', async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      </AuthProvider>
    );
    expect(await screen.findByText(/Sign in to Harbor-Ops/i)).toBeTruthy();
  });
});
