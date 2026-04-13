import { activationAPI, bookmarksAPI, collaborationAPI, digestAPI, discoveryAPI, githubAPI, profileAPI, projectsAPI, shareAPI, usersAPI } from './api';

describe('api contract exports', () => {
  test('projectsAPI exposes github import methods', () => {
    expect(typeof projectsAPI.importFromGithub).toBe('function');
    expect(typeof projectsAPI.createManual).toBe('function');
    expect(typeof projectsAPI.refresh).toBe('function');
    expect(typeof projectsAPI.getMatched).toBe('function');
    expect(typeof projectsAPI.getSuggestedCollaborators).toBe('function');
    expect(typeof projectsAPI.getTimeline).toBe('function');
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

  test('bookmarksAPI exposes bookmark methods', () => {
    expect(typeof bookmarksAPI.add).toBe('function');
    expect(typeof bookmarksAPI.remove).toBe('function');
    expect(typeof bookmarksAPI.list).toBe('function');
  });

  test('collaborationAPI exposes receipt method', () => {
    expect(typeof collaborationAPI.createReceipt).toBe('function');
  });

  test('usersAPI exposes reputation methods', () => {
    expect(typeof usersAPI.getBuilderScore).toBe('function');
    expect(typeof usersAPI.getReceipts).toBe('function');
  });

  test('discoveryAPI exposes open roles and trending methods', () => {
    expect(typeof discoveryAPI.getOpenRoles).toBe('function');
    expect(typeof discoveryAPI.getTrendingProjects).toBe('function');
    expect(typeof discoveryAPI.getTrendingBuilders).toBe('function');
  });

  test('digestAPI exposes digest methods', () => {
    expect(typeof digestAPI.getPreview).toBe('function');
    expect(typeof digestAPI.updatePreferences).toBe('function');
  });

  test('activationAPI exposes activation methods', () => {
    expect(typeof activationAPI.getChecklist).toBe('function');
    expect(typeof activationAPI.getDashboardState).toBe('function');
    expect(typeof activationAPI.trackEvent).toBe('function');
  });

  test('shareAPI exposes share-card methods', () => {
    expect(typeof shareAPI.getProjectCard).toBe('function');
    expect(typeof shareAPI.getProfileCard).toBe('function');
  });
});
