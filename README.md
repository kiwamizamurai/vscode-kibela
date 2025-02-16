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

- 🔍 **Quick Search**: Instantly find notes with real-time search
- 🎯 **Smart Organization**: My Notes, Recently Viewed, Liked Notes with group and folder
- 🖥️ **Rich Preview**: Markdown-rendered note preview with GitHub styling

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

- [Check this page for how to get credentials](https://support.kibe.la/hc/ja/articles/360035089312-Kibela%E3%81%AEWeb-API%E3%81%AB%E3%81%A4%E3%81%84%E3%81%A6)

> [!TIP]
> This extension uses GraphQL schema introspection with `buildClientSchema`, `getIntrospectionQuery`, and `printSchema` from the `graphql` package to interact with Kibela's API.

## ⚡️ Commands

- `Kibela: Authenticate` - Setup your Kibela credentials
- `Kibela: Search Notes` - Search through your notes

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

## 🙏 Credits

Built with ❤️ for the Kibela users
