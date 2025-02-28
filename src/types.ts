import { TreeItem } from 'vscode';

export interface KibelaNote {
  id: string;
  title: string;
  contentHtml: string;
  contentUpdatedAt: string;
  publishedAt?: string;
  author: KibelaUser;
  comments: {
    nodes: KibelaComment[];
  };
  groups: KibelaGroup[];
  folders: {
    nodes: KibelaFolder[];
  };
  attachments: {
    nodes: KibelaAttachment[];
  };
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

export interface KibelaAttachment {
  id: string;
  name: string;
  url: string;
  dataUrl: string;
  mimeType: string;
  contentType: string;
  size: number;
}

export interface NoteContentResponse {
  note: {
    contentHtml: string;
    comments: {
      nodes: NoteComment[];
    };
    attachments: {
      nodes: KibelaAttachment[];
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

export interface NoteContent {
  contentHtml: string;
  comments: { nodes: NoteComment[] };
  attachments: KibelaAttachment[];
}

export interface AuthState {
  isAuthenticated: boolean;
  error?: string;
}

export interface KibelaFolder {
  id: string;
  name: string;
  fullName: string;
  path: string;
  parent?: {
    id: string;
    name: string;
  };
}

export interface KibelaGroup {
  id: string;
  name: string;
  description?: string;
  isJoined: boolean;
}

export interface GroupsResponse {
  groups: {
    nodes: KibelaGroup[];
  };
}

export interface FoldersResponse {
  group: {
    folders: {
      nodes: KibelaFolder[];
    };
  };
}

export interface Note {
  id: string;
  title: string;
  content: string;
  contentHtml: string;
  contentUpdatedAt: string;
  publishedAt?: string;
  url: string;
  path: string;
  isLikedByCurrentUser: boolean;
  author: {
    id: string;
    account: string;
    realName: string;
  };
  groups: {
    id: string;
    name: string;
  }[];
  folders: {
    nodes: {
      id: string;
      name: string;
      fullName: string;
      path: string;
    }[];
  };
  comments: {
    nodes: {
      id: string;
      content: string;
      contentHtml: string;
      author: {
        account: string;
        realName: string;
      };
      createdAt: string;
    }[];
  };
  attachments: {
    nodes: {
      id: string;
      name: string;
      dataUrl: string;
      mimeType: string;
    }[];
  };
}

export interface NoteResponse {
  note: Note;
}

export interface GroupNotesResponse {
  group: {
    notes: {
      nodes: Array<{
        id: string;
        title: string;
        contentUpdatedAt: string;
        publishedAt: string;
        author: {
          account: string;
          realName: string;
        };
      }>;
    };
  };
}

export interface FolderNotesResponse {
  folder: {
    notes: {
      nodes: Array<{
        id: string;
        title: string;
        contentUpdatedAt: string;
        publishedAt: string;
        author: {
          account: string;
          realName: string;
        };
      }>;
    };
  };
}

export interface KibelaTreeItem extends TreeItem {
  type: 'group' | 'folder' | 'note';
  id: string;
  parentId?: string;
}

export interface GroupTreeItem extends KibelaTreeItem {
  type: 'group';
  isPrivate: boolean;
  description: string;
  isJoined: boolean;
}

export interface FolderTreeItem extends KibelaTreeItem {
  type: 'folder';
  groupId: string;
  fullName: string;
  path: string;
}

export interface NoteTreeItem extends KibelaTreeItem {
  type: 'note';
  groupId: string;
  folderId?: string;
  contentUpdatedAt: string;
  publishedAt: string | null;
  author: {
    account: string;
    realName: string;
  };
}

export interface KibelaUser {
  id: string;
  account: string;
  realName: string;
  avatarImage?: {
    url: string;
  };
}

export interface UsersResponse {
  users: {
    nodes: KibelaUser[];
  };
}

export interface KibelaComment {
  id: string;
  content: string;
  author: KibelaUser;
  createdAt: string;
}
