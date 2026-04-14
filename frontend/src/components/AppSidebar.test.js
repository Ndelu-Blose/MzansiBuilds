import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AppSidebar from './AppSidebar';
import { useAuth } from '../contexts/AuthContext';
import { MemoryRouter } from 'react-router-dom';

jest.mock(
  'react-router-dom',
  () => ({
    MemoryRouter: ({ children }) => <div>{children}</div>,
    Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
    NavLink: ({ children, to, className, ...props }) => {
      const isFn = typeof className === 'function';
      return (
        <a href={to} className={isFn ? className({ isActive: false }) : className} {...props}>
          {typeof children === 'function' ? children({ isActive: false }) : children}
        </a>
      );
    },
    useNavigate: () => jest.fn(),
    useLocation: () => ({ pathname: '/dashboard' }),
  }),
  { virtual: true }
);

jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../lib/api', () => ({
  collaborationAPI: {
    getMyRequests: jest.fn(async () => ({ data: { items: [] } })),
  },
  notificationsAPI: {
    list: jest.fn(async () => ({ data: { unread_count: 0, items: [] } })),
  },
}));

describe('AppSidebar sign out behavior', () => {
  test('sign out is an action button and ignores double click while pending', async () => {
    let resolveLogout;
    const logoutPromise = new Promise((resolve) => {
      resolveLogout = resolve;
    });
    const logout = jest.fn(() => logoutPromise);
    useAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@example.com' },
      isAuthenticated: true,
      logout,
    });

    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>
    );

    const signoutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signoutButton);
    fireEvent.click(signoutButton);

    expect(logout).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/signing out/i)).toBeTruthy();

    resolveLogout();
    await waitFor(() => expect(screen.getByRole('button', { name: /sign out/i })).toBeTruthy());
  });
});
