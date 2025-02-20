import * as vscode from 'vscode';
import { KibelaClient } from '../../api/kibelaClient';
import { KibelaNote } from '../../types';
import { SearchHistory } from '../../features/search/searchHistory';
import {
  SearchSettingsManager,
  SearchSettings,
} from '../../features/search/settings';
import { AuthManager, AuthItem } from '../../features/auth/auth';

export class SearchTreeDataProvider
  implements vscode.TreeDataProvider<SearchTreeItem | AuthItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    SearchTreeItem | AuthItem | undefined
  > = new vscode.EventEmitter<SearchTreeItem | AuthItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<
    SearchTreeItem | AuthItem | undefined
  > = this._onDidChangeTreeData.event;
  private searchResults: KibelaNote[] = [];
  private currentQuery: string | undefined;
  private isLoading = false;

  constructor(
    private kibelaClient: KibelaClient,
    private searchHistory: SearchHistory,
    private searchSettings: SearchSettingsManager,
    private authManager: AuthManager
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  clear(): void {
    this.searchResults = [];
    this.currentQuery = undefined;
    this.refresh();
  }

  async setSearchResults(query: string, results: KibelaNote[]): Promise<void> {
    this.currentQuery = query;
    this.searchResults = results;
    this.refresh();
  }

  getTreeItem(element: SearchTreeItem | AuthItem): vscode.TreeItem {
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
    element?: SearchTreeItem
  ): Promise<(SearchTreeItem | AuthItem)[]> {
    if (!this.kibelaClient.isAuthenticated()) {
      return this.authManager.getAuthItems();
    }

    if (element) {
      return [];
    }

    if (this.isLoading) {
      return [{ type: 'auth', label: 'Loading...', command: '' }];
    }

    if (!this.currentQuery) {
      return [
        new SearchTreeItem(
          'Search notes using the search command',
          'info',
          vscode.TreeItemCollapsibleState.None,
          {
            command: 'kibela.showSearch',
            title: 'Search Notes',
          }
        ),
      ];
    }

    if (this.searchResults.length === 0) {
      const settings = this.searchSettings.getSettings();
      return [
        new SearchTreeItem(
          `No results with search condition: ${JSON.stringify(settings)}`,
          'info',
          vscode.TreeItemCollapsibleState.None
        ),
      ];
    }

    return this.searchResults.map(
      (note) =>
        new SearchTreeItem(
          note.title,
          'note',
          vscode.TreeItemCollapsibleState.None,
          {
            command: 'kibela.openNote',
            title: 'Open Note',
            arguments: [note],
          },
          `${note.author.realName} (${new Date(
            note.contentUpdatedAt
          ).toLocaleDateString()})`
        )
    );
  }
}

class SearchTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly type: 'note' | 'info',
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command,
    description?: string
  ) {
    super(label, collapsibleState);
    this.contextValue = type;
    this.description = description;
    this.iconPath = type === 'note' ? new vscode.ThemeIcon('note') : undefined;
  }
}
