import * as vscode from 'vscode';
import { KibelaClient } from '../../api/kibelaClient';
import { KibelaNote } from '../../types';

export class SearchManager {
  private searchBox: vscode.InputBox | undefined;
  private onSearchComplete: (results: KibelaNote[]) => void;
  private onSearchError: (error: Error) => void;

  constructor(
    private kibelaClient: KibelaClient,
    onSearchComplete: (results: KibelaNote[]) => void,
    onSearchError: (error: Error) => void
  ) {
    this.onSearchComplete = onSearchComplete;
    this.onSearchError = onSearchError;
  }

  showSearchBox(): void {
    this.searchBox = vscode.window.createInputBox();
    this.searchBox.placeholder = 'Search notes...';
    this.searchBox.show();

    this.searchBox.onDidAccept(async () => {
      const query = this.searchBox?.value;
      if (query) {
        try {
          const results = await this.kibelaClient.searchNotes(query);
          this.onSearchComplete(results);
          this.searchBox?.hide();
        } catch (error) {
          this.onSearchError(error as Error);
        }
      }
    });

    this.searchBox.onDidHide(() => {
      this.searchBox?.dispose();
    });
  }
}
