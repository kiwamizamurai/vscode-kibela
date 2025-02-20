import * as vscode from 'vscode';
import { KibelaClient } from '../../api/kibelaClient';
import { KibelaFolder, KibelaGroup, KibelaUser } from '../../types';

export interface SearchSettings {
  coediting?: boolean;
  isArchived?: boolean;
  sortBy?: 'RELEVANT' | 'RECENT';
  resources?: ('NOTE' | 'COMMENT' | 'ATTACHMENT')[];
  folderIds?: string[];
  userIds?: string[];
}

interface QuickPickItemWithValue extends vscode.QuickPickItem {
  value: string;
}

export class SearchSettingsManager {
  private static readonly SETTINGS_KEY = 'kibela.searchSettings';
  private settings: SearchSettings;
  private kibelaClient?: KibelaClient;

  constructor(private context: vscode.ExtensionContext) {
    this.settings = this.loadSettings();
  }

  setClient(client: KibelaClient) {
    this.kibelaClient = client;
  }

  private loadSettings(): SearchSettings {
    return this.context.globalState.get<SearchSettings>(
      SearchSettingsManager.SETTINGS_KEY,
      {
        coediting: undefined,
        isArchived: false,
        sortBy: 'RELEVANT',
        resources: ['NOTE'],
        folderIds: [],
        userIds: [],
      }
    );
  }

  private saveSettings(): void {
    this.context.globalState.update(
      SearchSettingsManager.SETTINGS_KEY,
      this.settings
    );
  }

  async showSettingsUI(): Promise<void> {
    if (!this.kibelaClient) {
      vscode.window.showErrorMessage('Kibela client not initialized');
      return;
    }

    const options = await vscode.window.showQuickPick<QuickPickItemWithValue>(
      [
        {
          label: `Coediting (${
            this.settings.coediting === undefined
              ? 'Not set'
              : this.settings.coediting
                ? 'Yes'
                : 'No'
          })`,
          value: 'coediting',
        },
        {
          label: `Include Archived (${
            this.settings.isArchived ? 'Yes' : 'No'
          })`,
          value: 'archived',
        },
        {
          label: `Sort By (${this.settings.sortBy || 'RELEVANT'})`,
          value: 'sort',
        },
        {
          label: `Search Resources (${
            this.settings.resources?.join(', ') || 'NOTE'
          })`,
          value: 'resources',
        },
        {
          label: 'Filter by Folders',
          value: 'folders',
        },
        {
          label: 'Filter by Users',
          value: 'users',
        },
        {
          label: 'Reset All Settings',
          value: 'reset',
        },
      ],
      {
        placeHolder: 'Select search settings to modify',
      }
    );

    if (!options) return;

    let settingsChanged = false;

    switch (options.value) {
      case 'coediting': {
        const coediting = await vscode.window.showQuickPick(
          ['Yes', 'No', 'Not set'],
          {
            placeHolder: 'Filter by coediting?',
          }
        );
        if (coediting) {
          this.settings.coediting =
            coediting === 'Yes' ? true : coediting === 'No' ? false : undefined;
          settingsChanged = true;
        }
        break;
      }
      case 'archived': {
        const archived = await vscode.window.showQuickPick(['Yes', 'No'], {
          placeHolder: 'Include archived notes?',
        });
        if (archived) {
          this.settings.isArchived = archived === 'Yes';
          settingsChanged = true;
        }
        break;
      }
      case 'sort': {
        const sortBy = await vscode.window.showQuickPick(
          ['RELEVANT', 'RECENT'],
          {
            placeHolder: 'Sort results by',
          }
        );
        if (sortBy) {
          this.settings.sortBy = sortBy as 'RELEVANT' | 'RECENT';
          settingsChanged = true;
        }
        break;
      }
      case 'resources': {
        const resources = await vscode.window.showQuickPick(
          ['NOTE', 'COMMENT', 'ATTACHMENT'],
          {
            placeHolder: 'Select resources to search',
            canPickMany: true,
          }
        );
        if (resources) {
          this.settings.resources = resources as (
            | 'NOTE'
            | 'COMMENT'
            | 'ATTACHMENT'
          )[];
          settingsChanged = true;
        }
        break;
      }
      case 'folders': {
        const folders = await this.kibelaClient.getFolders();
        const selectedFolders =
          await vscode.window.showQuickPick<QuickPickItemWithValue>(
            folders.map((folder: KibelaFolder) => ({
              label: folder.path,
              value: folder.id,
              picked: this.settings.folderIds?.includes(folder.id) ?? false,
            })),
            {
              placeHolder: 'Select folders to filter by',
              canPickMany: true,
            }
          );
        if (selectedFolders) {
          this.settings.folderIds = selectedFolders.map((f) => f.value);
          settingsChanged = true;
        }
        break;
      }
      case 'users': {
        const users = await this.kibelaClient.getUsers();
        const selectedUsers =
          await vscode.window.showQuickPick<QuickPickItemWithValue>(
            users.map((user: KibelaUser) => ({
              label: user.realName,
              description: user.account,
              value: user.id,
              picked: this.settings.userIds?.includes(user.id) ?? false,
            })),
            {
              placeHolder: 'Select users to filter by',
              canPickMany: true,
            }
          );
        if (selectedUsers) {
          this.settings.userIds = selectedUsers.map((u) => u.value);
          settingsChanged = true;
        }
        break;
      }
      case 'reset': {
        this.settings = {
          coediting: undefined,
          isArchived: false,
          sortBy: 'RELEVANT',
          resources: ['NOTE'],
          folderIds: [],
          userIds: [],
        };
        settingsChanged = true;
        break;
      }
    }

    if (settingsChanged) {
      this.saveSettings();
      vscode.window.showInformationMessage(
        'Successfully updated search settings'
      );
    }
  }

  getSettings(): SearchSettings {
    return { ...this.settings };
  }
}
