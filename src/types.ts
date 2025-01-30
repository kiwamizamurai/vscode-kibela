export interface KibelaNote {
  id: string;
  title: string;
  url: string;
}

export interface NoteBrowsingHistoryResponse {
  noteBrowsingHistories: {
    nodes: Array<{
      note: KibelaNote;
    }>;
  };
}

export interface KibelaError extends Error {
  response?: {
    errors?: Array<{
      message: string;
      locations?: Array<{
        line: number;
        column: number;
      }>;
      path?: string[];
    }>;
  };
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export interface NotesResponse {
  currentUser: {
    latestNotes: {
      totalCount: number;
      edges: Array<{
        node: KibelaNote;
      }>;
    };
  };
}

export interface NoteComment {
  content: string;
  author: {
    realName: string;
  };
}

export interface NoteContentResponse {
  note: {
    contentHtml: string;
    comments: {
      nodes: NoteComment[];
    };
  };
}

export interface SearchResponse {
  search: {
    edges: Array<{
      node: {
        document: KibelaNote | null;
      };
    }>;
  };
}

export interface CurrentUserResponse {
  currentUser: {
    id: string;
  };
}
