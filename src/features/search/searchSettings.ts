import * as vscode from 'vscode';
import { KibelaClient, SearchSettings } from '../../api/kibelaClient';
import { KibelaFolder, KibelaGroup, KibelaUser } from '../../types';

interface QuickPickItemWithValue extends vscode.QuickPickItem {
  value: string;
}

export class SearchSettingsManager {
  private static readonly SETTINGS_KEY = 'kibela.searchSettings';
  private settings: SearchSettings = {
    coediting: undefined,
    isArchived: false,
    sortBy: 'RELEVANT',
    resources: ['NOTE'],
    folderIds: [],
    userIds: [],
  };
  private kibelaClient?: KibelaClient;

  constructor(private context: vscode.ExtensionContext) {
    this.loadSettings();
  }

  setClient(client: KibelaClient) {
    this.kibelaClient = client;
  }

  private loadSettings(): void {
    const savedSettings = this.context.globalState.get<SearchSettings>(
      SearchSettingsManager.SETTINGS_KEY
    );
    if (savedSettings) {
      const resources = savedSettings.resources || ['NOTE'];
      const folderIds = savedSettings.folderIds || [];
      const userIds = savedSettings.userIds || [];

      this.settings = {
        coediting: savedSettings.coediting,
        isArchived: savedSettings.isArchived ?? false,
        sortBy: savedSettings.sortBy || 'RELEVANT',
        resources: resources as ('NOTE' | 'COMMENT' | 'ATTACHMENT')[],
        folderIds,
        userIds,
      };
    }
    console.log('Loaded search settings:', this.settings);
  }

  private async saveSettings(): Promise<void> {
    await this.context.globalState.update(
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
        }
        break;
      }
      case 'archived': {
        const archived = await vscode.window.showQuickPick(['Yes', 'No'], {
          placeHolder: 'Include archived notes?',
        });
        if (archived) {
          this.settings.isArchived = archived === 'Yes';
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
        }
        break;
      }
      case 'folders': {
        const folders = await this.kibelaClient.getFolders();
        const selectedFolders =
          await vscode.window.showQuickPick<QuickPickItemWithValue>(
            folders.map((folder: KibelaFolder) => ({
              label: folder.fullName,
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
          console.log('Updated folder settings:', this.settings.folderIds);
        }
        break;
      }
      case 'users': {
        const users = await this.kibelaClient.getUsers();
        const selectedUsers =
          await vscode.window.showQuickPick<QuickPickItemWithValue>(
            users.map((user: KibelaUser) => ({
              label: user.realName,
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
          console.log('Updated user settings:', this.settings.userIds);
        }
        break;
      }
      case 'reset':
        this.settings = {
          coediting: undefined,
          isArchived: false,
          sortBy: 'RELEVANT',
          resources: ['NOTE'],
          folderIds: [],
          userIds: [],
        };
        break;
    }

    await this.saveSettings();
    console.log('Saved settings:', this.settings);
  }

  getSettings(): SearchSettings {
    return { ...this.settings };
  }
}
