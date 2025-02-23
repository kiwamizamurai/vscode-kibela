import * as vscode from 'vscode';
import { KibelaClient } from '../../api/kibelaClient';
import { AuthItem, AuthManager } from '../../features/auth/auth';
import { SearchHistory } from '../../features/search/searchHistory';
import { SearchSettingsManager } from '../../features/search/settings';
import { KibelaNote } from '../../types';

const isValidNote = (note: KibelaNote): boolean => {
  return note && typeof note === 'object' && 'id' in note && 'title' in note;
};

interface TreeSection {
  section: vscode.TreeItem;
  items: KibelaNote[];
}

export class NoteTreeDataProvider
  implements vscode.TreeDataProvider<KibelaNote | AuthItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    KibelaNote | AuthItem | undefined
  > = new vscode.EventEmitter<KibelaNote | AuthItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<
    KibelaNote | AuthItem | undefined
  > = this._onDidChangeTreeData.event;

  private notes: KibelaNote[] = [];
  private _view: vscode.TreeView<KibelaNote | AuthItem> | undefined;
  private searchBox: vscode.InputBox | undefined;
  private searchResults: KibelaNote[] = [];
  private isLoading = false;
  private logger: vscode.OutputChannel;

  constructor(
    private kibelaClient: KibelaClient,
    private searchHistory: SearchHistory,
    private searchSettings: SearchSettingsManager,
    private authManager: AuthManager
  ) {
    this.logger = vscode.window.createOutputChannel('Kibela Notes');

    this._view = vscode.window.createTreeView('searchResults', {
      treeDataProvider: this,
      showCollapseAll: true,
    });

    if (this._view) {
      this._view.title = 'KIBELA SEARCH RESULTS';
    }

    vscode.commands.registerCommand('kibela.showSearch', async () => {
      const history = await this.searchHistory.getHistory();
      const settings = await this.searchSettings.getSettings();

      const quickPick = vscode.window.createQuickPick();
      quickPick.placeholder = 'Search notes...';
      quickPick.items = [
        ...history.map((h) => ({ label: h, description: 'Recent search' })),
      ];
      quickPick.onDidChangeValue((value) => {
        quickPick.items = [
          ...history
            .filter((h) => h.toLowerCase().includes(value.toLowerCase()))
            .map((h) => ({ label: h, description: 'Recent search' })),
        ];
      });

      quickPick.onDidAccept(async () => {
        const query = quickPick.value || quickPick.selectedItems[0]?.label;
        if (query) {
          try {
            this.isLoading = true;
            this._onDidChangeTreeData.fire(undefined);
            this.searchResults = await this.kibelaClient.searchNotes(
              query,
              settings
            );
            this.searchResults = this.searchResults.filter(isValidNote);
            await this.searchHistory.addSearch(query);
            this.isLoading = false;
            this._onDidChangeTreeData.fire(undefined);
          } catch (error) {
            this.isLoading = false;
            this._onDidChangeTreeData.fire(undefined);
            vscode.window.showErrorMessage('Search failed');
          }
        }
      });

      quickPick.show();
    });
  }

  async refresh(): Promise<void> {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: KibelaNote | AuthItem): vscode.TreeItem {
    if ('type' in element && element.type === 'auth') {
      const item = new vscode.TreeItem(element.label);
      item.command = {
        command: element.command,
        title: element.label,
      };
      return item;
    }

    return this.createNoteTreeItem(element as KibelaNote);
  }

  getChildren(element?: KibelaNote | AuthItem): (KibelaNote | AuthItem)[] {
    if (element) {
      return [];
    }

    if (!this.kibelaClient.isAuthenticated()) {
      return this.authManager.getAuthItems();
    }

    if (this.isLoading) {
      return [{ type: 'auth', label: 'Loading...', command: '' }];
    }

    return this.searchResults;
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
    const item = new vscode.TreeItem(
      note.title,
      vscode.TreeItemCollapsibleState.None
    );
    item.command = {
      command: 'kibela.openNote',
      title: 'Open Note',
      arguments: [note],
    };
    item.tooltip = note.title;
    item.description = new Date(note.contentUpdatedAt).toLocaleDateString();
    return item;
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

  constructor(
    private kibelaClient: KibelaClient,
    private authManager: AuthManager
  ) {
    this.logger = vscode.window.createOutputChannel('Kibela Notes');

    this._view = vscode.window.createTreeView('myNotes', {
      treeDataProvider: this,
      showCollapseAll: true,
    });

    if (this._view) {
      this._view.title = 'KIBELA NOTES';
    }
  }

  async refresh(): Promise<void> {
    if (!this.kibelaClient.isAuthenticated()) {
      this._onDidChangeTreeData.fire(undefined);
      return;
    }

    try {
      this.isLoading = true;
      this._onDidChangeTreeData.fire(undefined);

      const [myNotes, recentlyViewed, likedNotes] = await Promise.all([
        this.kibelaClient.getMyNotes(),
        this.kibelaClient.getRecentlyViewedNotes(),
        this.kibelaClient.getLikedNotes(),
      ]);

      const validMyNotes = myNotes.filter(isValidNote);
      const validRecentlyViewed = recentlyViewed.filter(isValidNote);
      const validLikedNotes = likedNotes.filter(isValidNote);

      // Remove duplicates from recentlyViewed
      const seenNoteIds = new Set<string>();
      const uniqueRecentlyViewed = validRecentlyViewed.filter((note) => {
        if (seenNoteIds.has(note.id)) {
          return false;
        }
        seenNoteIds.add(note.id);
        return true;
      });

      this.sections = [
        {
          section: new vscode.TreeItem(
            'My Notes',
            vscode.TreeItemCollapsibleState.Expanded
          ),
          items: validMyNotes,
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

      this.notes = [
        ...validMyNotes,
        ...uniqueRecentlyViewed,
        ...validLikedNotes,
      ];
    } catch (error) {
      vscode.window.showErrorMessage('Failed to refresh notes');
      this.logger?.appendLine(`Refresh error: ${error}`);
    } finally {
      this.isLoading = false;
      this._onDidChangeTreeData.fire(undefined);
    }
  }

  getTreeItem(element: TreeSection | KibelaNote | AuthItem): vscode.TreeItem {
    if ('type' in element && element.type === 'auth') {
      const item = new vscode.TreeItem(element.label);
      item.command = {
        command: element.command,
        title: element.label,
      };
      return item;
    }

    if ('section' in element) {
      return element.section;
    }

    return this.createNoteTreeItem(element as KibelaNote);
  }

  getChildren(
    element?: TreeSection | KibelaNote | AuthItem
  ): (TreeSection | KibelaNote | AuthItem)[] {
    if (element) {
      if ('section' in element) {
        return element.items;
      }
      return [];
    }

    if (!this.kibelaClient.isAuthenticated()) {
      return this.authManager.getAuthItems();
    }

    if (this.isLoading) {
      return [{ type: 'auth', label: 'Loading...', command: '' }];
    }

    return this.sections;
  }

  private createNoteTreeItem(note: KibelaNote): vscode.TreeItem {
    const item = new vscode.TreeItem(
      note.title,
      vscode.TreeItemCollapsibleState.None
    );
    item.command = {
      command: 'kibela.openNote',
      title: 'Open Note',
      arguments: [note],
    };
    item.tooltip = note.title;
    item.description = new Date(note.contentUpdatedAt).toLocaleDateString();
    return item;
  }

  clear(): void {
    this.sections = [];
    this.notes = [];
    this.refresh();
  }
}
