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

    // Create tree view with search box in title
    this._view = vscode.window.createTreeView('myNotes', {
      treeDataProvider: this,
      showCollapseAll: true,
    });

    // Set the view title
    if (this._view) {
      this._view.title = 'KIBELA NOTES';
    }

    // Register auth commands
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

    // Listen for auth state changes
    this.kibelaClient.onDidChangeAuthState(() => {
      this.refresh();
    });

    // Register search command
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
    const myNotes = await this.kibelaClient.getMyNotes();
    const recentlyViewed = await this.kibelaClient.getRecentlyViewedNotes();
    const likedNotes = await this.kibelaClient.getLikedNotes();

    // 不正なノートを除外
    const isValidNote = (note: KibelaNote): boolean => {
      return (
        note && typeof note === 'object' && 'id' in note && 'title' in note
      );
    };

    // Recently Viewed内の重複を削除（最初に出てきたものを残す）
    const seenIds = new Set<string>();
    const uniqueRecentlyViewed = recentlyViewed.filter((note) => {
      if (!isValidNote(note) || seenIds.has(note.id)) {
        return false;
      }
      seenIds.add(note.id);
      return true;
    });

    // 不正なノートを除外
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

    // Add search results section if there are results
    if (this.searchResults.length > 0) {
      this.sections.push({
        section: new vscode.TreeItem(
          'Search Results',
          vscode.TreeItemCollapsibleState.Expanded
        ),
        items: this.searchResults,
      });
    }

    this._onDidChangeTreeData.fire(undefined);
    this.notes = [
      ...myNotes,
      ...uniqueRecentlyViewed,
      ...validLikedNotes,
      ...this.searchResults,
    ];
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
