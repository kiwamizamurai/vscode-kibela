import { GraphQLClient, gql } from 'graphql-request';
import * as vscode from 'vscode';
import { CacheManager } from './cache';
import * as queries from './queries';
import {
  GET_FOLDER_NOTES,
  GET_GROUPS,
  GET_GROUP_FOLDERS,
  GET_GROUP_NOTES,
  GET_NOTE,
} from './queries';
import {
  AuthState,
  CurrentUserResponse,
  FolderNotesResponse,
  FoldersResponse,
  GroupNotesResponse,
  GroupsResponse,
  KibelaError,
  KibelaFolder,
  KibelaGroup,
  KibelaNote,
  KibelaUser,
  Note,
  NoteBrowsingHistoryResponse,
  NoteComment,
  NoteContent,
  NoteContentResponse,
  NoteResponse,
  NotesResponse,
  SearchResponse,
  UsersResponse,
} from './types';
import { SearchSettings } from './searchSettings';

export class KibelaClient {
  private client!: GraphQLClient;
  private noteContentCache: CacheManager<NoteContent>;
  private notesCache: CacheManager<KibelaNote[]>;
  private usersCache: CacheManager<KibelaUser[]>;
  private groupsCache: CacheManager<KibelaGroup[]>;
  private groupFoldersCache: CacheManager<KibelaFolder[]>;
  private readonly CACHE_TTL = 5 * 60 * 1000;
  private readonly USERS_CACHE_TTL = 30 * 60 * 1000;
  private readonly GROUPS_CACHE_TTL = 15 * 60 * 1000;
  private currentUserId: string | null = null;
  private logger: vscode.OutputChannel;
  private _onDidChangeAuthState = new vscode.EventEmitter<AuthState>();
  readonly onDidChangeAuthState = this._onDidChangeAuthState.event;
  private authState: AuthState = { isAuthenticated: false };
  private _team: string;
  private authCheckPromise: Promise<void> | null = null;

  constructor(team: string, token: string, logger: vscode.OutputChannel) {
    this.logger = logger;
    this.noteContentCache = new CacheManager(this.CACHE_TTL);
    this.notesCache = new CacheManager(this.CACHE_TTL);
    this.usersCache = new CacheManager(this.USERS_CACHE_TTL);
    this.groupsCache = new CacheManager(this.GROUPS_CACHE_TTL);
    this.groupFoldersCache = new CacheManager(this.GROUPS_CACHE_TTL);
    this._team = team;
    this.initializeClient(team, token);
  }

  private initializeClient(team: string, token: string): void {
    if (!team || !token) {
      throw new Error('Team and token are required');
    }
    this.client = new GraphQLClient(`https://${team}.kibe.la/api/v1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    this.authCheckPromise = this.checkAuthState();
  }

  private async checkAuthState() {
    try {
      await this.getCurrentUserId();
      this.authState = { isAuthenticated: true };
      this._onDidChangeAuthState.fire(this.authState);
    } catch (error) {
      this.handleAuthError(error as Error);
    }
  }

  private handleAuthError(error: Error) {
    this.currentUserId = null;
    this.authState = {
      isAuthenticated: false,
      error: error.message,
    };
    this._onDidChangeAuthState.fire(this.authState);
    this.clearCaches();
  }

  private clearCaches() {
    this.noteContentCache.clear();
    this.notesCache.clear();
    this.usersCache.clear();
    this.groupsCache.clear();
    this.groupFoldersCache.clear();
  }

  async logout() {
    this.client = new GraphQLClient('');
    this.handleAuthError(new Error('Logged out'));
  }

  async login(team: string, token: string) {
    this.initializeClient(team, token);
  }

  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  private logError(method: string, error: KibelaError) {
    this.logger.appendLine(`[ERROR] ${method}: ${error.message}`);
    if (error.response?.errors) {
      this.logger.appendLine(JSON.stringify(error.response.errors, null, 2));
    }
    if (this.isAuthenticationError(error)) {
      this.handleAuthError(error);
      vscode.window.showErrorMessage('Please login to Kibela to continue');
    }
  }

  private isAuthenticationError(error: KibelaError): boolean {
    const is403 = error.message?.includes('403');
    const hasUnauthorizedMessage =
      error.message?.toLowerCase().includes('unauthorized') ||
      error.message?.toLowerCase().includes('authentication') ||
      (error.response?.errors?.some(
        (e) =>
          e.message?.toLowerCase().includes('unauthorized') ||
          e.message?.toLowerCase().includes('authentication')
      ) ??
        false);

    return is403 || hasUnauthorizedMessage;
  }

  async searchNotes(
    query: string,
    settings: SearchSettings = {}
  ): Promise<KibelaNote[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.client.request<SearchResponse>(
        queries.SEARCH_NOTES,
        {
          query,
          coediting: settings.coediting,
          isArchived: settings.isArchived || false,
          sortBy: settings.sortBy || 'RELEVANT',
          resources: settings.resources,
        }
      );
      return response.search.edges
        .filter((edge) => edge.node.document !== null)
        .map((edge) => edge.node.document as KibelaNote);
    } catch (error) {
      this.logError('searchNotes', error as KibelaError);
      throw new Error('Failed to search notes');
    }
  }

  async getMyNotes(): Promise<KibelaNote[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const cacheKey = 'myNotes';
      const cached = this.notesCache.get(cacheKey);
      if (cached) {
        this.logger.appendLine('Returning cached notes');
        return cached;
      }

      this.logger.appendLine('Fetching my notes from API');
      const response = await this.client.request<NotesResponse>(
        queries.GET_MY_NOTES
      );
      const notes = response.currentUser.latestNotes.edges.map(
        (edge) => edge.node
      );

      this.notesCache.set(cacheKey, notes);
      return notes;
    } catch (error) {
      this.logError('getMyNotes', error as KibelaError);
      throw new Error('Failed to fetch notes');
    }
  }

  async getNoteContent(id: string): Promise<NoteContent> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const cached = this.noteContentCache.get(id);
      if (cached) {
        this.logger.appendLine(`Returning cached content for note ${id}`);
        return cached;
      }

      this.logger.appendLine(`Fetching note content for ${id}`);
      const response = await this.client.request<NoteContentResponse>(
        queries.GET_NOTE_CONTENT,
        { id }
      );
      const { contentHtml, comments, attachments } = response.note;

      const result: NoteContent = {
        contentHtml,
        comments,
        attachments: attachments.nodes,
      };
      this.noteContentCache.set(id, result);
      return result;
    } catch (error) {
      this.logError('getNoteContent', error as KibelaError);
      throw new Error('Failed to fetch note content');
    }
  }

  async getCurrentUserId(): Promise<string> {
    if (this.currentUserId) {
      return this.currentUserId;
    }

    try {
      const response = await this.client.request<CurrentUserResponse>(
        queries.GET_CURRENT_USER
      );
      this.currentUserId = response.currentUser.id;
      return this.currentUserId;
    } catch (error) {
      this.logError('getCurrentUserId', error as KibelaError);
      throw new Error('Failed to get current user ID');
    }
  }

  async getLikedNotes(): Promise<KibelaNote[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const userId = await this.getCurrentUserId();
      const response = await this.client.request<SearchResponse>(
        queries.GET_LIKED_NOTES,
        {
          userId: [userId],
        }
      );

      return response.search.edges
        .filter((edge) => edge.node.document !== null)
        .map((edge) => edge.node.document as KibelaNote);
    } catch (error) {
      this.logError('getLikedNotes', error as KibelaError);
      throw new Error('Failed to fetch liked notes');
    }
  }

  async getRecentlyViewedNotes(): Promise<KibelaNote[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.client.request<NoteBrowsingHistoryResponse>(
        queries.GET_RECENTLY_VIEWED_NOTES
      );
      return response.noteBrowsingHistories.nodes.map(
        (history) => history.note
      );
    } catch (error) {
      this.logError('getRecentlyViewedNotes', error as KibelaError);
      throw new Error('Failed to fetch recently viewed notes');
    }
  }

  public get team(): string {
    return this._team;
  }

  async getGroups(): Promise<KibelaGroup[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const cacheKey = 'groups';
      const cached = this.groupsCache.get(cacheKey);
      if (cached) {
        this.logger.appendLine('Returning cached groups');
        return cached;
      }

      this.logger.appendLine('Fetching groups from API');
      const response = await this.client.request<GroupsResponse>(GET_GROUPS);
      const groups = response.groups.nodes.filter((group) => group.isJoined);
      this.groupsCache.set(cacheKey, groups);
      return groups;
    } catch (error) {
      this.logError('getGroups', error as KibelaError);
      throw new Error('Failed to fetch groups');
    }
  }

  async getGroupFolders(groupId: string): Promise<KibelaFolder[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const cacheKey = `group_folders_${groupId}`;
      const cached = this.groupFoldersCache.get(cacheKey);
      if (cached) {
        this.logger.appendLine(`Returning cached folders for group ${groupId}`);
        return cached;
      }

      this.logger.appendLine(`Fetching folders for group ${groupId} from API`);
      const response = await this.client.request<FoldersResponse>(
        GET_GROUP_FOLDERS,
        { groupId }
      );
      const folders = response.group.folders.nodes;
      this.groupFoldersCache.set(cacheKey, folders);
      return folders;
    } catch (error) {
      this.logError('getGroupFolders', error as KibelaError);
      throw new Error('Failed to fetch group folders');
    }
  }

  async getGroupNotes(groupId: string) {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const data = await this.client.request<GroupNotesResponse>(
        GET_GROUP_NOTES,
        { groupId }
      );
      return data.group.notes.nodes;
    } catch (error) {
      this.logError('getGroupNotes', error as KibelaError);
      throw new Error('Failed to fetch group notes');
    }
  }

  async getFolderNotes(folderId: string) {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const data = await this.client.request<FolderNotesResponse>(
        GET_FOLDER_NOTES,
        { folderId }
      );
      return data.folder.notes.nodes;
    } catch (error) {
      this.logError('getFolderNotes', error as KibelaError);
      throw new Error('Failed to fetch folder notes');
    }
  }

  async getNote(noteId: string): Promise<Note> {
    try {
      const data = await this.client.request<NoteResponse>(GET_NOTE, {
        noteId,
      });
      return data.note;
    } catch (error) {
      console.error(
        'Error fetching note:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  async waitForAuthCheck(): Promise<void> {
    if (this.authCheckPromise) {
      await this.authCheckPromise;
    }
  }

  async getUsers(): Promise<KibelaUser[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const cacheKey = 'users';
      const cached = this.usersCache.get(cacheKey);
      if (cached) {
        this.logger.appendLine('Returning cached users');
        return cached;
      }

      this.logger.appendLine('Fetching users from API');
      const response = await this.client.request<UsersResponse>(
        queries.GET_USERS
      );
      const users = response.users.nodes;
      this.usersCache.set(cacheKey, users);
      return users;
    } catch (error) {
      this.logError('getUsers', error as KibelaError);
      throw new Error('Failed to fetch users');
    }
  }
}
