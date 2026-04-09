import { githubAPI, profileAPI, projectsAPI } from './api';

describe('api contract exports', () => {
  test('projectsAPI exposes github import methods', () => {
    expect(typeof projectsAPI.importFromGithub).toBe('function');
    expect(typeof projectsAPI.createManual).toBe('function');
    expect(typeof projectsAPI.refresh).toBe('function');
  });

  test('githubAPI exposes integration methods', () => {
    expect(typeof githubAPI.connectStart).toBe('function');
    expect(typeof githubAPI.getAccount).toBe('function');
    expect(typeof githubAPI.listRepos).toBe('function');
    expect(typeof githubAPI.disconnect).toBe('function');
  });

  test('profileAPI exposes profile methods', () => {
    expect(typeof profileAPI.get).toBe('function');
    expect(typeof profileAPI.update).toBe('function');
    expect(typeof profileAPI.getUser).toBe('function');
  });
});
