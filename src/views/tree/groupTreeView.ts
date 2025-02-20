import * as vscode from 'vscode';
import { KibelaClient } from '../../api/kibelaClient';
import { AuthManager, AuthItem } from '../../features/auth/auth';

export class GroupTreeProvider
  implements vscode.TreeDataProvider<GroupTreeItem | AuthItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    GroupTreeItem | AuthItem | undefined | null | void
  > = new vscode.EventEmitter<
    GroupTreeItem | AuthItem | undefined | null | void
  >();
  readonly onDidChangeTreeData: vscode.Event<
    GroupTreeItem | AuthItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  constructor(
    private kibelaClient: KibelaClient,
    private authManager: AuthManager
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: GroupTreeItem | AuthItem): vscode.TreeItem {
    if ('type' in element && element.type === 'auth') {
      const item = new vscode.TreeItem(element.label);
      item.command = {
        command: element.command,
        title: element.label,
      };
      return item;
    }
    return element;
  }

  async getChildren(
    element?: GroupTreeItem
  ): Promise<(GroupTreeItem | AuthItem)[]> {
    if (!this.kibelaClient.isAuthenticated()) {
      return this.authManager.getAuthItems();
    }

    try {
      if (!element) {
        // Root level - show groups
        const groups = await this.kibelaClient.getGroups();
        return groups.map(
          (group) =>
            new GroupTreeItem(
              group.name,
              'group',
              group.id,
              vscode.TreeItemCollapsibleState.Collapsed,
              undefined,
              undefined,
              group.description || ''
            )
        );
      } else if (element.type === 'group') {
        // Group level - show folders and notes
        const [folders, notes] = await Promise.all([
          this.kibelaClient.getGroupFolders(element.id),
          this.kibelaClient.getGroupNotes(element.id),
        ]);

        const items: GroupTreeItem[] = [];

        // Add folders
        items.push(
          ...folders.map(
            (folder) =>
              new GroupTreeItem(
                folder.name,
                'folder',
                `folder:${element.id}/${folder.id}`,
                vscode.TreeItemCollapsibleState.Collapsed,
                element.id,
                undefined,
                undefined
              )
          )
        );

        // Add notes
        items.push(
          ...notes.map(
            (note) =>
              new GroupTreeItem(
                note.title,
                'note',
                `note:${note.id}`,
                vscode.TreeItemCollapsibleState.None,
                element.id,
                {
                  command: 'kibela.openNote',
                  title: 'Open Note',
                  arguments: [note],
                },
                `${note.author.realName} (${new Date(
                  note.contentUpdatedAt
                ).toLocaleDateString()})`
              )
          )
        );

        return items;
      } else if (element.type === 'folder') {
        // Folder level - show notes and subfolders
        const pathParts = element.id.split('/');
        const folderId = pathParts[pathParts.length - 1];
        const [notes, subFolders] = await Promise.all([
          this.kibelaClient.getFolderNotes(folderId),
          this.kibelaClient.getGroupFolders(element.parentId!, folderId),
        ]);

        const items: GroupTreeItem[] = [];

        // Add subfolders
        items.push(
          ...subFolders.map(
            (folder) =>
              new GroupTreeItem(
                folder.name,
                'folder',
                `${element.id}/${folder.id}`,
                vscode.TreeItemCollapsibleState.Collapsed,
                element.parentId,
                undefined,
                undefined
              )
          )
        );

        // Add notes
        items.push(
          ...notes.map(
            (note) =>
              new GroupTreeItem(
                note.title,
                'note',
                `note:${note.id}`,
                vscode.TreeItemCollapsibleState.None,
                element.parentId,
                {
                  command: 'kibela.openNote',
                  title: 'Open Note',
                  arguments: [note],
                },
                `${note.author.realName} (${new Date(
                  note.contentUpdatedAt
                ).toLocaleDateString()})`
              )
          )
        );

        return items;
      }

      return [];
    } catch (error) {
      console.error('Failed to get tree items:', error);
      return [];
    }
  }

  clear(): void {
    this._onDidChangeTreeData.fire();
  }
}

class GroupTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly type: 'group' | 'folder' | 'note',
    public readonly id: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly parentId?: string,
    public readonly command?: vscode.Command,
    description?: string
  ) {
    super(label, collapsibleState);
    this.contextValue = type;
    this.description = description;

    switch (type) {
      case 'group':
        this.iconPath = new vscode.ThemeIcon('organization');
        break;
      case 'folder':
        this.iconPath = new vscode.ThemeIcon('folder');
        break;
      case 'note':
        this.iconPath = new vscode.ThemeIcon('note');
        break;
    }
  }
}
