import { getBackendOrigin } from './backendUrl';

describe('getBackendOrigin', () => {
  const orig = process.env.REACT_APP_BACKEND_URL;

  afterEach(() => {
    if (orig === undefined) {
      delete process.env.REACT_APP_BACKEND_URL;
    } else {
      process.env.REACT_APP_BACKEND_URL = orig;
    }
  });

  test('returns empty when unset', () => {
    delete process.env.REACT_APP_BACKEND_URL;
    expect(getBackendOrigin()).toBe('');
  });

  test('trims trailing slashes', () => {
    process.env.REACT_APP_BACKEND_URL = 'http://localhost:8000///';
    expect(getBackendOrigin()).toBe('http://localhost:8000');
  });

  test('strips trailing /api so axios baseURL does not become /api/api', () => {
    process.env.REACT_APP_BACKEND_URL = 'https://myapp.up.railway.app/api';
    expect(getBackendOrigin()).toBe('https://myapp.up.railway.app');
  });

  test('strips /api with trailing slash', () => {
    process.env.REACT_APP_BACKEND_URL = 'https://myapp.up.railway.app/api/';
    expect(getBackendOrigin()).toBe('https://myapp.up.railway.app');
  });
});
