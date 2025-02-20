# VSCode Kibela

<div align="center">

![logo](./media/kibela.png)

🚀 A powerful VSCode extension for seamless Kibela integration.
Access, search, and manage your Kibela notes directly from your development environment.

[![Version](https://img.shields.io/visual-studio-marketplace/v/kiwamizamurai-vscode.kibela-vscode)](https://marketplace.visualstudio.com/items?itemName=kiwamizamurai-vscode.kibela-vscode)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/kiwamizamurai-vscode.kibela-vscode)](https://marketplace.visualstudio.com/items?itemName=kiwamizamurai-vscode.kibela-vscode)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/kiwamizamurai-vscode.kibela-vscode)](https://marketplace.visualstudio.com/items?itemName=kiwamizamurai-vscode.kibela-vscode)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

## ✨ Features

- 🔍 **Advanced Search**
  - Real-time search with history
  - Customizable filters (archived, resource types)
  - Sort by relevance or recency
  - Filter by folders and users
- 📁 **Smart Organization**
  - Personal and group notes
  - Folder hierarchy
  - Recently viewed notes
- 🖥️ **Rich Preview**
  - Note content with metadata
  - Comments thread
  - File attachments with preview
  - Group and folder information

## 🚀 Getting Started

1. Install the extension from VSCode Marketplace
2. Run `Kibela: Authenticate` command
3. Enter your team name and API token
4. Start using Kibela directly in VSCode!

## 🔑 Authentication

Get your API token from:
1. Go to Kibela Settings
2. Navigate to API Tokens
3. Generate a new token

- [How to generate api token](https://github.com/kibela/kibela-api-v1-document?tab=readme-ov-file#%E3%82%A2%E3%82%AF%E3%82%BB%E3%82%B9%E3%83%88%E3%83%BC%E3%82%AF%E3%83%B3)

> [!TIP]
> This extension uses GraphQL schema introspection with `buildClientSchema`, `getIntrospectionQuery`, and `printSchema` from the `graphql` package to interact with Kibela's API. [For more detail](https://github.com/kiwamizamurai/vscode-kibela/blob/main/reverse_engineering/main.ts)

## Upcoming Features
<details>
<summary>Here</summary>

- 📝 Note Management
  - [ ] Create new notes
  - [ ] Edit/Update existing notes
  - [ ] Delete notes
  - [ ] Draft support
- 💬 Comments
  - [ ] Add new comments
  - [ ] Edit/Delete comments
  - [ ] Reply to comments
- 🔄 Sync
  - [ ] Real-time updates
- 📎 Attachments
  - [ ] Image preview
</details>

## 🤝 Contributing

Contributions welcome! Please read our [contributing guidelines](CONTRIBUTING.md).

## 📝 License

MIT
