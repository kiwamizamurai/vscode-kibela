import { GraphQLClient } from 'graphql-request';
import {
  KibelaNote,
  NoteBrowsingHistoryResponse,
  KibelaError,
  CacheEntry,
  NotesResponse,
  NoteContentResponse,
  SearchResponse,
  CurrentUserResponse,
  NoteComment,
} from './types';
import * as vscode from 'vscode';

export class KibelaClient {
  private client: GraphQLClient;
  private noteCache: Map<
    string,
    CacheEntry<{ contentHtml: string; comments: { nodes: NoteComment[] } }>
  > = new Map();
  private notesCache: Map<string, CacheEntry<KibelaNote[]>> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分
  private currentUserId: string | null = null;
  private logger: vscode.OutputChannel;

  constructor(team: string, token: string, logger: vscode.OutputChannel) {
    this.client = new GraphQLClient(`https://${team}.kibe.la/api/v1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    this.logger = logger;
  }

  private logError(method: string, error: KibelaError) {
    this.logger.appendLine(`[ERROR] ${method}: ${error.message}`);
    if (error.response?.errors) {
      this.logger.appendLine(JSON.stringify(error.response.errors, null, 2));
    }
  }

  private getCached<T>(key: string): T | null {
    const cached = this.notesCache.get(key);
    if (cached && this.isCacheValid(cached.timestamp)) {
      this.logger.appendLine(`Cache hit for ${key}`);
      return cached.data as T;
    }
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.notesCache.set(key, {
      data: data as KibelaNote[],
      timestamp: Date.now(),
    });
    this.logger.appendLine(`Cache set for ${key}`);
  }

  async searchNotes(query: string): Promise<KibelaNote[]> {
    const operation = `
      query SearchNotes($query: String!) {
        search(query: $query, first: 15) {
          edges {
            node {
              document {
                ... on Note {
                  id
                  title
                  url
                }
              }
            }
          }
        }
      }
    `;

    const response = await this.client.request<SearchResponse>(operation, {
      query,
    });

    return response.search.edges
      .filter((edge) => edge.node.document !== null)
      .map((edge) => edge.node.document as KibelaNote);
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_TTL;
  }

  async getMyNotes(): Promise<KibelaNote[]> {
    try {
      const cached = this.getCached<KibelaNote[]>('myNotes');
      if (cached) return cached;

      this.logger.appendLine('Fetching my notes from API');
      const operation = `
        query GetMyNotes {
          currentUser {
            latestNotes(first: 50) {
              totalCount
              edges {
                node {
                  id
                  title
                  url
                }
              }
            }
          }
        }
      `;

      const response = await this.client.request<NotesResponse>(operation);
      const notes = response.currentUser.latestNotes.edges.map(
        (edge) => edge.node
      );

      this.setCache('myNotes', notes);
      return notes;
    } catch (error) {
      this.logError('getMyNotes', error as KibelaError);
      throw new Error('Failed to fetch notes');
    }
  }

  async getNoteContent(
    id: string
  ): Promise<{ contentHtml: string; comments: { nodes: NoteComment[] } }> {
    try {
      const cached = this.noteCache.get(id);
      if (cached && this.isCacheValid(cached.timestamp)) {
        this.logger.appendLine(`Cache hit for note content ${id}`);
        return cached.data;
      }

      this.logger.appendLine(`Fetching note content for ${id}`);
      const operation = `
        query GetNote($id: ID!) {
          note(id: $id) {
            contentHtml
            comments(first:5) {
              nodes {
                content
                author {
                  realName
                }
              }
            }
          }
        }
      `;

      const response = await this.client.request<NoteContentResponse>(
        operation,
        { id }
      );
      const { contentHtml, comments } = response.note;

      this.noteCache.set(id, {
        data: { contentHtml, comments },
        timestamp: Date.now(),
      });

      return { contentHtml, comments };
    } catch (error) {
      this.logError('getNoteContent', error as KibelaError);
      throw new Error('Failed to fetch note content');
    }
  }

  async getRecentlyViewedNotes(): Promise<KibelaNote[]> {
    const query = `
      query {
        noteBrowsingHistories(first: 15) {
          nodes {
            note {
              id,
              title,
              url
            }
          }
        }
      }
    `;

    const response =
      await this.client.request<NoteBrowsingHistoryResponse>(query);
    return response.noteBrowsingHistories.nodes.map((history) => history.note);
  }

  async getCurrentUserId(): Promise<string> {
    if (this.currentUserId) {
      return this.currentUserId;
    }

    const query = `
      query {
        currentUser {
          id
        }
      }
    `;

    const response = await this.client.request<CurrentUserResponse>(query);
    this.currentUserId = response.currentUser.id;
    return this.currentUserId;
  }

  async getLikedNotes(): Promise<KibelaNote[]> {
    const userId = await this.getCurrentUserId();

    const query = `
      query GetLikedNotes($userId: [ID!]) {
        search(query: "", first: 15, likerIds: $userId) {
          edges {
            node {
              document {
                ... on Note {
                  id
                  title
                  url
                }
              }
            }
          }
        }
      }
    `;

    const response = await this.client.request<SearchResponse>(query, {
      userId: [userId],
    });

    return response.search.edges
      .filter((edge) => edge.node.document !== null)
      .map((edge) => edge.node.document as KibelaNote);
  }
}
