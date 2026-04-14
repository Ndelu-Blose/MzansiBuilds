import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ProfilePage from './ProfilePage';
import { useAuth } from '../contexts/AuthContext';
import { MemoryRouter } from 'react-router-dom';

jest.mock(
  'react-router-dom',
  () => ({
    MemoryRouter: ({ children }) => <div>{children}</div>,
    Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  }),
  { virtual: true }
);

jest.mock('../components/Layout', () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>,
}));

jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../lib/api', () => ({
  profileAPI: {
    get: jest.fn(async () => ({
      data: {
        display_name: 'Tester',
        username: 'tester',
        skills: [],
      },
    })),
    update: jest.fn(async () => ({})),
  },
  activationAPI: {
    getChecklist: jest.fn(async () => ({ data: { profile_items: [], owner_items: [], top_items: [] } })),
  },
}));

describe('ProfilePage settings ownership', () => {
  test('does not render digest editor and links to settings', async () => {
    useAuth.mockReturnValue({
      user: { id: 'u1', name: 'Tester', email: 'tester@example.com' },
    });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/edit profile/i)).toBeTruthy());
    expect(screen.queryByText(/weekly builder digest preferences/i)).toBeNull();
    expect(screen.getByRole('link', { name: /settings/i })).toBeTruthy();
  });
});
