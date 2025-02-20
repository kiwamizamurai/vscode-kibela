import * as vscode from 'vscode';

export class SearchHistory {
  private static readonly HISTORY_KEY = 'kibela.searchHistory';
  private static readonly MAX_HISTORY = 20;

  constructor(private context: vscode.ExtensionContext) {}

  public async addSearch(query: string): Promise<void> {
    const history = await this.getHistory();

    const index = history.indexOf(query);
    if (index > -1) {
      history.splice(index, 1);
    }

    history.unshift(query);

    if (history.length > SearchHistory.MAX_HISTORY) {
      history.pop();
    }

    await this.context.globalState.update(SearchHistory.HISTORY_KEY, history);
  }

  public async getHistory(): Promise<string[]> {
    const history = this.context.globalState.get<string[]>(
      SearchHistory.HISTORY_KEY
    );
    return history || [];
  }

  public async clearHistory(): Promise<void> {
    await this.context.globalState.update(SearchHistory.HISTORY_KEY, []);
  }
}
