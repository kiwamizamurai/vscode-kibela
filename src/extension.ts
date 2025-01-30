import * as vscode from 'vscode';
import { KibelaClient } from './kibelaClient';
import { NoteTreeDataProvider } from './noteTreeView';
import { KibelaNote } from './types';
import { show } from './preview';

let kibelaClient: KibelaClient;

const log = vscode.window.createOutputChannel('Kibela');

export function activate(context: vscode.ExtensionContext) {
  log.appendLine('Kibela extension is now active');

  const initializeTreeView = () => {
    if (kibelaClient) {
      log.appendLine('Initializing tree view');
      const noteTreeDataProvider = new NoteTreeDataProvider(kibelaClient);
      vscode.window.registerTreeDataProvider('myNotes', noteTreeDataProvider);
      noteTreeDataProvider.loadNotes();
    }
  };

  const openNote = vscode.commands.registerCommand(
    'kibela.openNote',
    async (note: KibelaNote) => {
      log.appendLine(`Opening note: ${note.title}`);

      try {
        const { contentHtml, comments } = await kibelaClient.getNoteContent(
          note.id
        );
        show(contentHtml, note.title, comments.nodes);
      } catch (error) {
        log.appendLine(`Error opening note: ${error}`);
        vscode.window.showErrorMessage('Failed to load note content');
      }
    }
  );

  const initializeClient = (team: string, token: string) => {
    try {
      kibelaClient = new KibelaClient(team, token, log);
      return true;
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

        if (team && token && initializeClient(team, token)) {
          await context.secrets.store('kibela.token', token);
          await vscode.workspace
            .getConfiguration()
            .update('kibela.team', team, true);
          vscode.window.showInformationMessage(
            'Successfully authenticated with Kibela!'
          );
          initializeTreeView();
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

  context.subscriptions.push(authenticate, openNote, searchNotes);

  // Initialize with stored credentials
  (async () => {
    const config = vscode.workspace.getConfiguration('kibela');
    const team = config.get<string>('team');
    const token = await context.secrets.get('kibela.token');
    if (team && token) {
      kibelaClient = new KibelaClient(team, token, log);
      initializeTreeView();
    }
  })();
}

export function deactivate() {}
