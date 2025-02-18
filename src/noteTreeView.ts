import * as vscode from 'vscode';
import { KibelaClient } from './kibelaClient';
import { KibelaNote } from './types';

interface TreeSection {
  section: vscode.TreeItem;
  items: KibelaNote[];
}

interface AuthItem {
  type: 'auth';
  label: string;
  command: string;
}

export class NoteTreeDataProvider
  implements vscode.TreeDataProvider<TreeSection | KibelaNote | AuthItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    TreeSection | KibelaNote | AuthItem | undefined
  > = new vscode.EventEmitter<
    TreeSection | KibelaNote | AuthItem | undefined
  >();
  readonly onDidChangeTreeData: vscode.Event<
    TreeSection | KibelaNote | AuthItem | undefined
  > = this._onDidChangeTreeData.event;

  private sections: TreeSection[] = [];
  private notes: KibelaNote[] = [];
  private _view:
    | vscode.TreeView<TreeSection | KibelaNote | AuthItem>
    | undefined;
  private searchBox: vscode.InputBox | undefined;
  private searchResults: KibelaNote[] = [];
  private isLoading = false;
  private logger: vscode.OutputChannel;

  constructor(private kibelaClient: KibelaClient) {
    this.logger = vscode.window.createOutputChannel('Kibela Notes');

    this._view = vscode.window.createTreeView('searchResults', {
      treeDataProvider: this,
      showCollapseAll: true,
    });

    if (this._view) {
      this._view.title = 'KIBELA SEARCH RESULTS';
    }

    vscode.commands.registerCommand('kibela.login', async () => {
      const team = await vscode.window.showInputBox({
        prompt: 'Enter your Kibela team name',
        placeHolder: 'e.g. example',
      });
      const token = await vscode.window.showInputBox({
        prompt: 'Enter your Kibela API token',
        password: true,
      });
      if (team && token) {
        await this.kibelaClient.login(team, token);
        await this.refresh();
      }
    });

    vscode.commands.registerCommand('kibela.logout', async () => {
      await this.kibelaClient.logout();
      await this.refresh();
    });

    this.kibelaClient.onDidChangeAuthState(() => {
      this.refresh();
    });

    vscode.commands.registerCommand('kibela.showSearch', async () => {
      const searchBox = vscode.window.createInputBox();
      searchBox.placeholder = 'Search notes...';
      searchBox.show();

      searchBox.onDidAccept(async () => {
        const query = searchBox.value;
        if (query) {
          try {
            this.isLoading = true;
            this._onDidChangeTreeData.fire(undefined);
            this.searchResults = await this.kibelaClient.searchNotes(query);
            this.isLoading = false;
            this.refresh();
            searchBox.hide();
          } catch (error) {
            this.isLoading = false;
            this._onDidChangeTreeData.fire(undefined);
            vscode.window.showErrorMessage('Search failed');
          }
        }
      });

      searchBox.onDidHide(() => {
        searchBox.dispose();
      });
    });
  }

  async refresh(): Promise<void> {
    try {
      this.isLoading = true;
      this._onDidChangeTreeData.fire(undefined);

      this.sections = [];

      if (this.searchResults.length > 0) {
        const groupNotes = this.searchResults.filter(
          (note) => note.groups && note.groups.length > 0
        );
        const personalNotes = this.searchResults.filter(
          (note) => !note.groups || note.groups.length === 0
        );

        this.sections.push({
          section: new vscode.TreeItem(
            'All Results',
            vscode.TreeItemCollapsibleState.Expanded
          ),
          items: this.searchResults,
        });

        if (personalNotes.length > 0) {
          this.sections.push({
            section: new vscode.TreeItem(
              'Personal Notes',
              vscode.TreeItemCollapsibleState.Expanded
            ),
            items: personalNotes,
          });
        }

        if (groupNotes.length > 0) {
          this.sections.push({
            section: new vscode.TreeItem(
              'Group Notes',
              vscode.TreeItemCollapsibleState.Expanded
            ),
            items: groupNotes,
          });
        }
      }

      this.notes = [...this.searchResults];
    } catch (error) {
      vscode.window.showErrorMessage('Failed to refresh search results');
      this.logger?.appendLine(`Refresh error: ${error}`);
    } finally {
      this.isLoading = false;
      this._onDidChangeTreeData.fire(undefined);
    }
  }

  getTreeItem(element: TreeSection | KibelaNote | AuthItem): vscode.TreeItem {
    if (this.isLoading) {
      const item = new vscode.TreeItem(
        'Loading...',
        vscode.TreeItemCollapsibleState.None
      );
      item.iconPath = new vscode.ThemeIcon('loading~spin');
      return item;
    }

    if ('section' in element && 'items' in element) {
      return element.section;
    }

    if ('id' in element && 'title' in element) {
      return this.createNoteTreeItem(element);
    }

    this.logger?.appendLine(`Unknown element type: ${JSON.stringify(element)}`);
    return new vscode.TreeItem(
      'Error: Unknown Item',
      vscode.TreeItemCollapsibleState.None
    );
  }

  getChildren(
    element?: TreeSection | KibelaNote | AuthItem
  ): (TreeSection | KibelaNote | AuthItem)[] {
    if (!element) {
      if (this.isLoading) {
        return [{ section: new vscode.TreeItem('Loading...'), items: [] }];
      }
      return this.sections;
    }

    if ('section' in element) {
      return element.items;
    }

    return [];
  }

  setNotes(notes: KibelaNote[]) {
    this.notes = notes;
    this.refresh();
  }

  async loadNotes(retryCount = 3, delay = 1000): Promise<void> {
    try {
      this.isLoading = true;
      this._onDidChangeTreeData.fire(undefined);
      this.notes = await this.kibelaClient.getMyNotes();
      this.isLoading = false;
      this.refresh();
    } catch (error) {
      if (retryCount > 0) {
        this.logger.appendLine(
          `Retrying to load notes... (${retryCount} attempts left)`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.loadNotes(retryCount - 1, delay);
      }
      this.isLoading = false;
      this._onDidChangeTreeData.fire(undefined);
      vscode.window.showErrorMessage('Failed to load notes');
    }
  }

  private formatNoteData(note: Partial<KibelaNote>) {
    return {
      contentUpdatedAt: note.contentUpdatedAt || new Date().toISOString(),
      author: note.author
        ? {
            id: note.author.id || '',
            account: note.author.account || '',
            realName: note.author.realName || '不明',
          }
        : { id: '', account: '', realName: '不明' },
    };
  }

  private createNoteTreeItem(note: KibelaNote): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(
      note.title,
      vscode.TreeItemCollapsibleState.None
    );
    treeItem.iconPath = new vscode.ThemeIcon('note');
    treeItem.command = {
      command: 'kibela.openNote',
      title: 'Open Note',
      arguments: [note],
    };
    const formattedData = this.formatNoteData(note);
    const lastUpdated = new Date(
      formattedData.contentUpdatedAt
    ).toLocaleDateString('ja-JP');
    treeItem.description = `${formattedData.author.realName} (${lastUpdated})`;
    return treeItem;
  }

  clear(): void {
    this.notes = [];
    this._onDidChangeTreeData.fire(undefined);
  }
}

export class NoteTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly note?: KibelaNote
  ) {
    super(label, collapsibleState);
    this.iconPath = new vscode.ThemeIcon('note');
    this.command = {
      command: 'kibela.openNote',
      title: 'Open Note',
      arguments: [note],
    };
  }
}

export class MyNotesTreeDataProvider
  implements vscode.TreeDataProvider<TreeSection | KibelaNote | AuthItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    TreeSection | KibelaNote | AuthItem | undefined
  > = new vscode.EventEmitter<
    TreeSection | KibelaNote | AuthItem | undefined
  >();
  readonly onDidChangeTreeData: vscode.Event<
    TreeSection | KibelaNote | AuthItem | undefined
  > = this._onDidChangeTreeData.event;

  private sections: TreeSection[] = [];
  private notes: KibelaNote[] = [];
  private _view:
    | vscode.TreeView<TreeSection | KibelaNote | AuthItem>
    | undefined;
  private isLoading = false;
  private logger: vscode.OutputChannel;

  constructor(private kibelaClient: KibelaClient) {
    this.logger = vscode.window.createOutputChannel('My Notes');

    this._view = vscode.window.createTreeView('myNotes', {
      treeDataProvider: this,
      showCollapseAll: true,
    });

    if (this._view) {
      this._view.title = 'KIBELA NOTES';
    }

    this.kibelaClient.onDidChangeAuthState(() => {
      this.refresh();
    });
  }

  async refresh(): Promise<void> {
    try {
      this.isLoading = true;
      this._onDidChangeTreeData.fire(undefined);

      const myNotes = await this.kibelaClient.getMyNotes();
      const recentlyViewed = await this.kibelaClient.getRecentlyViewedNotes();
      const likedNotes = await this.kibelaClient.getLikedNotes();

      const isValidNote = (note: KibelaNote): boolean => {
        return (
          note && typeof note === 'object' && 'id' in note && 'title' in note
        );
      };

      const seenIds = new Set<string>();
      const uniqueRecentlyViewed = recentlyViewed.filter((note) => {
        if (!isValidNote(note) || seenIds.has(note.id)) {
          return false;
        }
        seenIds.add(note.id);
        return true;
      });

      const validLikedNotes = likedNotes.filter(isValidNote);

      this.sections = [
        {
          section: new vscode.TreeItem(
            'My Notes',
            vscode.TreeItemCollapsibleState.Expanded
          ),
          items: myNotes,
        },
        {
          section: new vscode.TreeItem(
            'Recently Viewed',
            vscode.TreeItemCollapsibleState.Expanded
          ),
          items: uniqueRecentlyViewed,
        },
        {
          section: new vscode.TreeItem(
            'Liked Notes',
            vscode.TreeItemCollapsibleState.Expanded
          ),
          items: validLikedNotes,
        },
      ];

      this.notes = [...myNotes, ...uniqueRecentlyViewed, ...validLikedNotes];
    } catch (error) {
      vscode.window.showErrorMessage('Failed to refresh notes');
      this.logger?.appendLine(`Refresh error: ${error}`);
    } finally {
      this.isLoading = false;
      this._onDidChangeTreeData.fire(undefined);
    }
  }

  getTreeItem(element: TreeSection | KibelaNote | AuthItem): vscode.TreeItem {
    if (this.isLoading) {
      const item = new vscode.TreeItem(
        'Loading...',
        vscode.TreeItemCollapsibleState.None
      );
      item.iconPath = new vscode.ThemeIcon('loading~spin');
      return item;
    }

    if ('section' in element && 'items' in element) {
      return element.section;
    }

    if ('id' in element && 'title' in element) {
      return this.createNoteTreeItem(element);
    }

    this.logger?.appendLine(`Unknown element type: ${JSON.stringify(element)}`);
    return new vscode.TreeItem(
      'Error: Unknown Item',
      vscode.TreeItemCollapsibleState.None
    );
  }

  getChildren(
    element?: TreeSection | KibelaNote | AuthItem
  ): (TreeSection | KibelaNote | AuthItem)[] {
    if (!element) {
      if (this.isLoading) {
        return [{ section: new vscode.TreeItem('Loading...'), items: [] }];
      }
      return this.sections;
    }

    if ('section' in element) {
      return element.items;
    }

    return [];
  }

  private createNoteTreeItem(note: KibelaNote): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(
      note.title,
      vscode.TreeItemCollapsibleState.None
    );
    treeItem.iconPath = new vscode.ThemeIcon('note');
    treeItem.command = {
      command: 'kibela.openNote',
      title: 'Open Note',
      arguments: [note],
    };
    const formattedData = this.formatNoteData(note);
    const lastUpdated = new Date(
      formattedData.contentUpdatedAt
    ).toLocaleDateString('ja-JP');
    treeItem.description = `${formattedData.author.realName} (${lastUpdated})`;
    return treeItem;
  }

  private formatNoteData(note: Partial<KibelaNote>) {
    return {
      contentUpdatedAt: note.contentUpdatedAt || new Date().toISOString(),
      author: note.author
        ? {
            id: note.author.id || '',
            account: note.author.account || '',
            realName: note.author.realName || '不明',
          }
        : { id: '', account: '', realName: '不明' },
    };
  }

  clear(): void {
    this.notes = [];
    this._onDidChangeTreeData.fire(undefined);
  }
}
