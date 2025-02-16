import * as vscode from 'vscode';
import { GroupTreeProvider } from './groupTreeView';
import { KibelaClient } from './kibelaClient';
import { NoteTreeDataProvider } from './noteTreeView';
import { show } from './preview';
import { KibelaNote } from './types';

let kibelaClient: KibelaClient;

const log = vscode.window.createOutputChannel('Kibela');

export function activate(context: vscode.ExtensionContext) {
  log.appendLine('Kibela extension is now active');
  let noteTreeDataProvider: NoteTreeDataProvider | undefined;
  let groupTreeProvider: GroupTreeProvider | undefined;

  // 認証状態をコンテキストに設定
  const updateAuthContext = (isAuthenticated: boolean) => {
    vscode.commands.executeCommand(
      'setContext',
      'kibela:authenticated',
      isAuthenticated
    );
  };

  const initializeTreeViews = () => {
    if (!kibelaClient || !kibelaClient.isAuthenticated()) {
      log.appendLine(
        'Client not authenticated, skipping tree view initialization'
      );
      return;
    }

    log.appendLine('Initializing tree views');
    // ノートツリービュー
    noteTreeDataProvider = new NoteTreeDataProvider(kibelaClient);
    vscode.window.registerTreeDataProvider('myNotes', noteTreeDataProvider);
    noteTreeDataProvider.loadNotes();

    // グループツリービュー
    groupTreeProvider = new GroupTreeProvider(kibelaClient);
    const treeView = vscode.window.createTreeView('kibelaGroups', {
      treeDataProvider: groupTreeProvider,
      showCollapseAll: true,
    });

    // Register commands
    context.subscriptions.push(
      vscode.commands.registerCommand('kibela.refreshGroups', () => {
        groupTreeProvider?.refresh();
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
            const noteId =
              typeof noteOrId === 'string' ? noteOrId : noteOrId.id;
            const noteData = await kibelaClient.getNote(noteId);
            if (noteData) {
              show(
                noteData.contentHtml,
                noteData.title,
                noteData.comments.nodes,
                noteData.author,
                new Date(noteData.contentUpdatedAt),
                noteData.publishedAt
                  ? new Date(noteData.publishedAt)
                  : undefined,
                noteData.groups,
                noteData.folders.nodes
              );
            }
          } catch (error) {
            log.appendLine(`Error opening note: ${error}`);
            vscode.window.showErrorMessage('Failed to load note content');
          }
        }
      )
    );
  };

  const initializeClient = async (
    team: string,
    token: string
  ): Promise<boolean> => {
    try {
      kibelaClient = new KibelaClient(team, token, log);
      log.appendLine('Kibela client initialized');

      // 認証状態の変更を監視
      kibelaClient.onDidChangeAuthState((state) => {
        log.appendLine(`Auth state changed: ${state.isAuthenticated}`);
        updateAuthContext(state.isAuthenticated);
        if (state.isAuthenticated) {
          initializeTreeViews();
        } else {
          // 認証が失敗した場合はTreeViewをクリア
          noteTreeDataProvider?.clear();
          groupTreeProvider?.clear();
        }
      });

      // 認証状態の初期チェックを待つ
      await kibelaClient.waitForAuthCheck();
      return kibelaClient.isAuthenticated();
    } catch (error) {
      log.appendLine(`Failed to initialize client: ${error}`);
      vscode.window.showErrorMessage('Failed to initialize Kibela client');
      return false;
    }
  };

  const authenticate = vscode.commands.registerCommand(
    'kibela.authenticate',
    async () => {
      try {
        const team = await vscode.window.showInputBox({
          prompt: 'Enter your Kibela team name',
          validateInput: (text) => (text ? null : 'Team name is required'),
        });
        const token = await vscode.window.showInputBox({
          prompt: 'Enter your Kibela API token',
          validateInput: (text) => (text ? null : 'API token is required'),
        });

        if (team && token) {
          const success = await initializeClient(team, token);
          if (success) {
            await context.secrets.store('kibela.token', token);
            await vscode.workspace
              .getConfiguration()
              .update('kibela.team', team, true);
            vscode.window.showInformationMessage(
              'Successfully authenticated with Kibela!'
            );
          }
        }
      } catch (error) {
        log.appendLine(`Authentication error: ${error}`);
        vscode.window.showErrorMessage('Authentication failed');
      }
    }
  );

  const searchNotes = vscode.commands.registerCommand(
    'kibela.searchNotes',
    () => {
      if (!kibelaClient) {
        vscode.window.showErrorMessage('Please authenticate first');
        return;
      }
      // Show search box
      const provider = vscode.window.registerTreeDataProvider(
        'myNotes',
        new NoteTreeDataProvider(kibelaClient)
      );
    }
  );

  context.subscriptions.push(authenticate, searchNotes);

  // 初期状態は未認証
  updateAuthContext(false);

  // Initialize with stored credentials
  (async () => {
    const config = vscode.workspace.getConfiguration('kibela');
    const team = config.get<string>('team');
    const token = await context.secrets.get('kibela.token');
    if (team && token) {
      await initializeClient(team, token);
    }
  })();
}

export function deactivate() {}
