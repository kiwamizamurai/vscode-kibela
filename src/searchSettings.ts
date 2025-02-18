import * as vscode from 'vscode';
import { KibelaClient } from './kibelaClient';

export interface SearchSettings {
  coediting?: boolean;
  isArchived?: boolean;
  sortBy?: 'RELEVANT' | 'RECENT';
  resources?: ('NOTE' | 'COMMENT' | 'ATTACHMENT')[];
  folderIds?: string[];
  userIds?: string[];
}

export class SearchSettingsManager {
  private static readonly SETTINGS_KEY = 'kibela.searchSettings';
  private kibelaClient?: KibelaClient;

  constructor(private context: vscode.ExtensionContext) {}

  public setClient(client: KibelaClient) {
    this.kibelaClient = client;
  }

  public async getSettings(): Promise<SearchSettings> {
    const settings = this.context.globalState.get<SearchSettings>(
      SearchSettingsManager.SETTINGS_KEY
    );
    return settings || {};
  }

  public async updateSettings(settings: SearchSettings): Promise<void> {
    await this.context.globalState.update(
      SearchSettingsManager.SETTINGS_KEY,
      settings
    );
  }

  public async showSettingsUI(): Promise<void> {
    if (!this.kibelaClient) {
      vscode.window.showErrorMessage('Client not initialized');
      return;
    }

    const currentSettings = await this.getSettings();

    const items: vscode.QuickPickItem[] = [
      {
        label: 'Coediting',
        description:
          currentSettings.coediting === undefined
            ? 'Not set'
            : currentSettings.coediting
              ? 'Yes'
              : 'No',
        picked: currentSettings.coediting,
      },
      {
        label: 'Include Archived',
        description: currentSettings.isArchived ? 'Yes' : 'No',
        picked: currentSettings.isArchived,
      },
      {
        label: 'Sort By',
        description: currentSettings.sortBy || 'RELEVANT',
      },
      {
        label: 'Search Resources',
        description: currentSettings.resources
          ? currentSettings.resources.join(', ')
          : 'All',
      },
      {
        label: 'Filter by Folders',
        description: currentSettings.folderIds?.length
          ? `${currentSettings.folderIds.length} folders selected`
          : 'All folders',
      },
      {
        label: 'Filter by Users',
        description: currentSettings.userIds?.length
          ? `${currentSettings.userIds.length} users selected`
          : 'All users',
      },
    ];

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select setting to change',
      canPickMany: false,
    });

    if (!selected) return;

    switch (selected.label) {
      case 'Coediting':
        const coediting = await vscode.window.showQuickPick(
          ['Yes', 'No', 'Not set'],
          {
            placeHolder: 'Filter by coediting?',
          }
        );
        if (coediting) {
          currentSettings.coediting =
            coediting === 'Yes' ? true : coediting === 'No' ? false : undefined;
        }
        break;

      case 'Include Archived':
        const archived = await vscode.window.showQuickPick(['Yes', 'No'], {
          placeHolder: 'Include archived notes?',
        });
        if (archived) {
          currentSettings.isArchived = archived === 'Yes';
        }
        break;

      case 'Sort By':
        const sortBy = await vscode.window.showQuickPick(
          ['RELEVANT', 'RECENT'],
          {
            placeHolder: 'Sort results by',
          }
        );
        if (sortBy) {
          currentSettings.sortBy = sortBy as 'RELEVANT' | 'RECENT';
        }
        break;

      case 'Search Resources':
        const resources = await vscode.window.showQuickPick(
          ['NOTE', 'COMMENT', 'ATTACHMENT'],
          {
            placeHolder: 'Select resources to search',
            canPickMany: true,
          }
        );
        if (resources) {
          currentSettings.resources = resources as (
            | 'NOTE'
            | 'COMMENT'
            | 'ATTACHMENT'
          )[];
        }
        break;

      case 'Filter by Folders':
        // Get all folders from all groups
        const groups = await this.kibelaClient.getGroups();
        const folderItems: vscode.QuickPickItem[] = [];

        for (const group of groups) {
          const folders = await this.kibelaClient.getGroupFolders(group.id);
          folders.forEach((folder) => {
            folderItems.push({
              label: folder.fullName,
              description: group.name,
              picked: currentSettings.folderIds?.includes(folder.id),
              detail: folder.id,
            });
          });
        }

        const selectedFolders = await vscode.window.showQuickPick(folderItems, {
          placeHolder: 'Select folders to filter by',
          canPickMany: true,
        });

        if (selectedFolders) {
          currentSettings.folderIds = selectedFolders.map((f) => f.detail!);
        }
        break;

      case 'Filter by Users':
        const users = await this.kibelaClient.getUsers();
        const userItems = users.map((user) => ({
          label: user.realName,
          description: user.account,
          picked: currentSettings.userIds?.includes(user.id),
          detail: user.id,
        }));

        const selectedUsers = await vscode.window.showQuickPick(userItems, {
          placeHolder: 'Select users to filter by',
          canPickMany: true,
        });

        if (selectedUsers) {
          currentSettings.userIds = selectedUsers.map((u) => u.detail!);
        }
        break;
    }

    await this.updateSettings(currentSettings);
    vscode.window.showInformationMessage('Search settings updated');
  }
}
