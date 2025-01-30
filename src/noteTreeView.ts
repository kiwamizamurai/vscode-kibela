import * as vscode from 'vscode';
import { KibelaClient } from './kibelaClient';
import { KibelaNote } from './types';

interface TreeSection {
  section: vscode.TreeItem;
  items: KibelaNote[];
}

export class NoteTreeDataProvider
  implements vscode.TreeDataProvider<TreeSection | KibelaNote>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    TreeSection | KibelaNote | undefined
  > = new vscode.EventEmitter<TreeSection | KibelaNote | undefined>();
  readonly onDidChangeTreeData: vscode.Event<
    TreeSection | KibelaNote | undefined
  > = this._onDidChangeTreeData.event;

  private sections: TreeSection[] = [];
  private notes: KibelaNote[] = [];
  private _view: vscode.TreeView<TreeSection | KibelaNote> | undefined;
  private searchBox: vscode.InputBox | undefined;
  private searchResults: KibelaNote[] = [];
  private isLoading = false;

  constructor(private kibelaClient: KibelaClient) {
    // Create tree view with search box in title
    this._view = vscode.window.createTreeView('myNotes', {
      treeDataProvider: this,
      showCollapseAll: true,
    });

    // Set the view title
    this._view.title = 'KIBELA NOTES';

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

    // Recently Viewed内の重複を削除（最初に出てきたものを残す）
    const seenIds = new Set<string>();
    const uniqueRecentlyViewed = recentlyViewed.filter((note) => {
      if (seenIds.has(note.id)) {
        return false;
      }
      seenIds.add(note.id);
      return true;
    });

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
        items: likedNotes,
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
      ...likedNotes,
      ...this.searchResults,
    ];
  }

  getTreeItem(element: TreeSection | KibelaNote): vscode.TreeItem {
    if (this.isLoading) {
      return new vscode.TreeItem(
        'Loading...',
        vscode.TreeItemCollapsibleState.None
      );
    }
    if ('section' in element) {
      return element.section;
    }
    return this.createNoteTreeItem(element);
  }

  getChildren(
    element?: TreeSection | KibelaNote
  ): (TreeSection | KibelaNote)[] {
    if (this.isLoading) {
      return [];
    }
    if (!element) {
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

  async loadNotes(): Promise<void> {
    try {
      this.isLoading = true;
      this._onDidChangeTreeData.fire(undefined);
      this.notes = await this.kibelaClient.getMyNotes();
      this.isLoading = false;
      this.refresh();
    } catch (error) {
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
