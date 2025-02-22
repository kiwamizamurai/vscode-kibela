import * as vscode from 'vscode';
import { KibelaClient } from './api/kibelaClient';
import { MyNotesTreeDataProvider } from './views/tree/noteTreeView';
import { SearchTreeDataProvider } from './views/tree/searchTreeView';
import { GroupTreeProvider } from './views/tree/groupTreeView';
import { show } from './views/preview/preview';
import { KibelaNote } from './types';
import { SearchHistory } from './features/search/searchHistory';
import { SearchSettingsManager } from './features/search/settings';
import { AuthManager } from './features/auth/auth';

let kibelaClient: KibelaClient;
let searchTreeDataProvider: SearchTreeDataProvider;
let noteTreeDataProvider: MyNotesTreeDataProvider;
let groupTreeProvider: GroupTreeProvider;
let authManager: AuthManager;

const log = vscode.window.createOutputChannel('Kibela');

export function activate(context: vscode.ExtensionContext) {
  log.appendLine('Kibela extension is now active');
  const searchHistory = new SearchHistory(context);
  const searchSettings = new SearchSettingsManager(context);
  authManager = new AuthManager(context);

  const initializeTreeViews = () => {
    kibelaClient = authManager.getClient()!;
    if (!kibelaClient || !kibelaClient.isAuthenticated()) {
      log.appendLine(
        'Client not authenticated, skipping tree view initialization'
      );
      return;
    }

    log.appendLine('Initializing tree views');

    searchSettings.setClient(kibelaClient);
    searchTreeDataProvider = new SearchTreeDataProvider(
      kibelaClient,
      searchHistory,
      searchSettings,
      authManager
    );
    vscode.window.registerTreeDataProvider(
      'searchResults',
      searchTreeDataProvider
    );

    noteTreeDataProvider = new MyNotesTreeDataProvider(
      kibelaClient,
      authManager
    );
    vscode.window.registerTreeDataProvider('myNotes', noteTreeDataProvider);
    noteTreeDataProvider.refresh();

    groupTreeProvider = new GroupTreeProvider(kibelaClient, authManager);
    vscode.window.createTreeView('kibelaGroups', {
      treeDataProvider: groupTreeProvider,
      showCollapseAll: true,
    });
    groupTreeProvider.refresh();
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('kibela.authenticate', () =>
      authManager.authenticate()
    ),
    vscode.commands.registerCommand('kibela.logout', () =>
      authManager.logout()
    ),
    vscode.commands.registerCommand(
      'kibela.onAuthStateChanged',
      (isAuthenticated: boolean) => {
        if (isAuthenticated) {
          initializeTreeViews();
        } else {
          searchTreeDataProvider?.clear();
          noteTreeDataProvider?.clear();
          groupTreeProvider?.refresh();
        }
      }
    ),
    vscode.commands.registerCommand('kibela.refreshGroups', () => {
      groupTreeProvider.refresh();
    }),
    vscode.commands.registerCommand('kibela.refreshNotes', () => {
      noteTreeDataProvider.refresh();
    }),
    vscode.commands.registerCommand('kibela.refreshSearchResults', () => {
      searchTreeDataProvider.refresh();
    }),
    vscode.commands.registerCommand(
      'kibela.openFolder',
      async (path: string) => {
        try {
          const config = vscode.workspace.getConfiguration('kibela');
          const team = config.get<string>('team');
          if (team) {
            const url = `https://${team}.kibe.la${path}`;
            vscode.env.openExternal(vscode.Uri.parse(url));
          }
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to open folder: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
        }
      }
    ),
    vscode.commands.registerCommand(
      'kibela.openNote',
      async (noteOrId: KibelaNote | string) => {
        if (!kibelaClient) {
          vscode.window.showErrorMessage('Please authenticate first');
          return;
        }

        try {
          const noteId = typeof noteOrId === 'string' ? noteOrId : noteOrId.id;
          const noteData = await kibelaClient.getNote(noteId);
          if (noteData) {
            show(
              noteData.contentHtml,
              noteData.title,
              noteData.path,
              noteData.comments.nodes,
              noteData.author,
              new Date(noteData.contentUpdatedAt),
              noteData.publishedAt ? new Date(noteData.publishedAt) : undefined,
              noteData.groups,
              noteData.folders.nodes,
              noteData.attachments.nodes,
              noteData.id,
              noteData.isLikedByCurrentUser
            );
          }
        } catch (error) {
          log.appendLine(`Error opening note: ${error}`);
          vscode.window.showErrorMessage('Failed to load note content');
        }
      }
    ),
    vscode.commands.registerCommand('kibela.showSearch', async () => {
      const history = await searchHistory.getHistory();
      const settings = searchSettings.getSettings();

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
            const latestSettings = searchSettings.getSettings();
            const notes = await kibelaClient.searchNotes(query, latestSettings);
            await searchHistory.addSearch(query);
            await searchTreeDataProvider.setSearchResults(query, notes);
            quickPick.hide();
          } catch (error) {
            vscode.window.showErrorMessage('Search failed');
          }
        }
      });

      quickPick.show();
    }),
    vscode.commands.registerCommand('kibela.searchNotes', () => {
      if (!kibelaClient) {
        vscode.window.showErrorMessage('Please authenticate first');
        return;
      }
      searchTreeDataProvider.refresh();
    }),
    vscode.commands.registerCommand('kibela.searchSettings', async () => {
      if (!kibelaClient) {
        vscode.window.showErrorMessage('Please authenticate first');
        return;
      }
      await searchSettings.showSettingsUI();
    }),
    vscode.commands.registerCommand(
      'kibela.likeNote',
      async (noteId: string) => {
        if (!kibelaClient) {
          vscode.window.showErrorMessage('Please authenticate first');
          return;
        }

        try {
          await kibelaClient.likeNote(noteId);
          await kibelaClient.clearNoteCache(noteId);
          vscode.window.showInformationMessage('Note liked successfully');
        } catch (error) {
          vscode.window.showErrorMessage('Failed to like note');
          throw error;
        }
      }
    ),
    vscode.commands.registerCommand(
      'kibela.unlikeNote',
      async (noteId: string) => {
        if (!kibelaClient) {
          vscode.window.showErrorMessage('Please authenticate first');
          return;
        }

        try {
          await kibelaClient.unlikeNote(noteId);
          await kibelaClient.clearNoteCache(noteId);
          vscode.window.showInformationMessage('Note unliked successfully');
        } catch (error) {
          vscode.window.showErrorMessage('Failed to unlike note');
          throw error;
        }
      }
    )
  );

  authManager.initialize();
}

export function deactivate() {}
