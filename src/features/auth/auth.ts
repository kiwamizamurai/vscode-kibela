import * as vscode from 'vscode';
import { KibelaClient } from '../../api/kibelaClient';

export interface AuthItem {
  type: 'auth';
  label: string;
  command: string;
}

export class AuthManager {
  private kibelaClient: KibelaClient | undefined;
  private readonly log: vscode.OutputChannel;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.log = vscode.window.createOutputChannel('Kibela');
  }

  private updateAuthContext(isAuthenticated: boolean) {
    vscode.commands.executeCommand(
      'setContext',
      'kibela:authenticated',
      isAuthenticated
    );
  }

  async initializeClient(team: string, token: string): Promise<boolean> {
    try {
      this.kibelaClient = new KibelaClient(team, token, this.log);
      this.log.appendLine('Kibela client initialized');

      this.kibelaClient.onDidChangeAuthState((state) => {
        this.log.appendLine(`Auth state changed: ${state.isAuthenticated}`);
        this.updateAuthContext(state.isAuthenticated);
        this.onAuthStateChanged(state.isAuthenticated);
      });

      await this.kibelaClient.waitForAuthCheck();
      return this.kibelaClient.isAuthenticated();
    } catch (error) {
      this.log.appendLine(`Failed to initialize client: ${error}`);
      vscode.window.showErrorMessage('Failed to initialize Kibela client');
      return false;
    }
  }

  private onAuthStateChanged(isAuthenticated: boolean) {
    vscode.commands.executeCommand(
      'kibela.onAuthStateChanged',
      isAuthenticated
    );
  }

  async authenticate() {
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
        const success = await this.initializeClient(team, token);
        if (success) {
          await this.context.secrets.store('kibela.token', token);
          await vscode.workspace
            .getConfiguration()
            .update('kibela.team', team, true);
          vscode.window.showInformationMessage(
            'Successfully authenticated with Kibela!'
          );
        }
      }
    } catch (error) {
      this.log.appendLine(`Authentication error: ${error}`);
      vscode.window.showErrorMessage('Authentication failed');
    }
  }

  async logout() {
    try {
      await this.context.secrets.delete('kibela.token');
      await vscode.workspace
        .getConfiguration()
        .update('kibela.team', undefined, true);
      if (this.kibelaClient) {
        await this.kibelaClient.logout();
      }
      vscode.window.showInformationMessage(
        'Successfully logged out from Kibela'
      );
    } catch (error) {
      this.log.appendLine(`Logout error: ${error}`);
      vscode.window.showErrorMessage('Logout failed');
    }
  }

  getClient(): KibelaClient | undefined {
    return this.kibelaClient;
  }

  async initialize() {
    const config = vscode.workspace.getConfiguration('kibela');
    const team = config.get<string>('team');
    const token = await this.context.secrets.get('kibela.token');
    if (team && token) {
      await this.initializeClient(team, token);
    }
    this.updateAuthContext(false);
  }

  getAuthItems(): AuthItem[] {
    if (this.kibelaClient?.isAuthenticated()) {
      return [
        {
          type: 'auth',
          label: 'Sign out from Kibela',
          command: 'kibela-vscode.signOut',
        },
      ];
    }
    return [
      {
        type: 'auth',
        label: 'Sign in to Kibela',
        command: 'kibela-vscode.signIn',
      },
    ];
  }
}
