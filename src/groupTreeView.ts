import * as vscode from 'vscode';
import { KibelaClient } from './kibelaClient';
import { KibelaGroup } from './types';
import {
  FolderTreeItem,
  GroupTreeItem,
  KibelaTreeItem,
  NoteTreeItem,
} from './types';

interface NoteData {
  id: string;
  title: string;
  contentUpdatedAt: string;
  publishedAt: string | null;
  author: {
    account: string;
    realName: string;
  };
}

export class GroupTreeProvider
  implements vscode.TreeDataProvider<KibelaTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    KibelaTreeItem | undefined | null
  > = new vscode.EventEmitter<KibelaTreeItem | undefined | null>();
  readonly onDidChangeTreeData: vscode.Event<
    KibelaTreeItem | undefined | null
  > = this._onDidChangeTreeData.event;
  private groups: KibelaGroup[] = [];

  constructor(private kibelaClient: KibelaClient) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  clear(): void {
    this.groups = [];
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: KibelaTreeItem): vscode.TreeItem {
    const baseItem: vscode.TreeItem = {
      ...element,
      contextValue: element.type,
    };

    switch (element.type) {
      case 'group': {
        const groupItem = element as GroupTreeItem;
        return {
          ...baseItem,
          collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
          iconPath: new vscode.ThemeIcon('organization'),
          description: groupItem.isPrivate ? '(Private)' : undefined,
        };
      }
      case 'folder': {
        const folderItem = element as FolderTreeItem;
        return {
          ...baseItem,
          collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
          iconPath: new vscode.ThemeIcon('folder'),
          command: {
            command: 'kibela.openFolder',
            title: 'Open Folder',
            arguments: [folderItem.path],
          },
        };
      }
      case 'note': {
        const noteItem = element as NoteTreeItem;
        const publishedStatus = noteItem.publishedAt
          ? new Date(noteItem.publishedAt).toLocaleDateString()
          : 'Draft';

        // 複合IDから元のノートIDを抽出
        const originalNoteId = noteItem.id.split(':').pop() || noteItem.id;

        return {
          ...baseItem,
          collapsibleState: vscode.TreeItemCollapsibleState.None,
          iconPath: new vscode.ThemeIcon('note'),
          description: `${noteItem.author.realName} (${publishedStatus})`,
          command: {
            command: 'kibela.openNote',
            title: 'Open Note',
            arguments: [
              {
                id: originalNoteId, // 元のノートIDを使用
                title: noteItem.label,
                contentUpdatedAt: noteItem.contentUpdatedAt,
                publishedAt: noteItem.publishedAt,
                author: noteItem.author,
              },
            ],
          },
        };
      }
    }
  }

  async getChildren(element?: KibelaTreeItem): Promise<KibelaTreeItem[]> {
    if (!element) {
      const groups = await this.kibelaClient.getGroups();
      return groups.map(
        (group) =>
          ({
            type: 'group' as const,
            id: group.id,
            label: group.name,
            isPrivate: group.isPrivate,
            description: group.description,
          }) as GroupTreeItem
      );
    }

    if (element.type === 'group') {
      const folders = await this.kibelaClient.getGroupFolders(element.id);
      const rootFolders = folders.filter((f) => !f.parent);

      const groupNotes = await this.kibelaClient.getGroupNotes(element.id);

      return [
        ...rootFolders.map(
          (folder) =>
            ({
              type: 'folder' as const,
              id: folder.id,
              label: folder.name,
              groupId: element.id,
              parentId: folder.parent?.id,
              fullName: folder.fullName,
              path: folder.path,
            }) as FolderTreeItem
        ),
        ...groupNotes.map(
          (note: NoteData) =>
            ({
              type: 'note' as const,
              id: `${element.id}:${note.id}`,
              label: note.title,
              groupId: element.id,
              contentUpdatedAt: note.contentUpdatedAt,
              publishedAt: note.publishedAt,
              author: note.author,
              command: {
                command: 'kibela.openNote',
                title: 'Open Note',
                arguments: [
                  {
                    id: note.id,
                    title: note.title,
                    contentUpdatedAt: note.contentUpdatedAt,
                    publishedAt: note.publishedAt,
                    author: note.author,
                  },
                ],
              },
            }) as NoteTreeItem
        ),
      ];
    }

    if (element.type === 'folder') {
      const folderItem = element as FolderTreeItem;
      const folders = await this.kibelaClient.getGroupFolders(
        folderItem.groupId
      );
      const childFolders = folders.filter((f) => f.parent?.id === element.id);
      const folderNotes = await this.kibelaClient.getFolderNotes(element.id);

      return [
        ...childFolders.map(
          (folder) =>
            ({
              type: 'folder' as const,
              id: folder.id,
              label: folder.name,
              groupId: folderItem.groupId,
              parentId: folder.parent?.id,
              fullName: folder.fullName,
              path: folder.path,
            }) as FolderTreeItem
        ),
        ...folderNotes.map(
          (note: NoteData) =>
            ({
              type: 'note' as const,
              id: `${element.id}:${folderItem.id}:${note.id}`,
              label: note.title,
              groupId: folderItem.groupId,
              folderId: element.id,
              contentUpdatedAt: note.contentUpdatedAt,
              publishedAt: note.publishedAt,
              author: note.author,
              command: {
                command: 'kibela.openNote',
                title: 'Open Note',
                arguments: [
                  {
                    id: note.id,
                    title: note.title,
                    contentUpdatedAt: note.contentUpdatedAt,
                    publishedAt: note.publishedAt,
                    author: note.author,
                  },
                ],
              },
            }) as NoteTreeItem
        ),
      ];
    }

    return [];
  }
}
