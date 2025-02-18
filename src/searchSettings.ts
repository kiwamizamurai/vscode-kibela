import * as vscode from 'vscode';

export interface SearchSettings {
  coediting?: boolean;
  isArchived?: boolean;
  sortBy?: 'RELEVANT' | 'RECENT';
  resources?: ('NOTE' | 'COMMENT' | 'ATTACHMENT')[];
}

export class SearchSettingsManager {
  private static readonly SETTINGS_KEY = 'kibela.searchSettings';

  constructor(private context: vscode.ExtensionContext) {}

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
    const currentSettings = await this.getSettings();

    // Create QuickPick items for each setting
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
    }

    await this.updateSettings(currentSettings);
    vscode.window.showInformationMessage('Search settings updated');
  }
}
