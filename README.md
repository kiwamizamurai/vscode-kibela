# VSCode Kibela

<div align="center">

[英語](./README_EN.md) | 日本語

![logo](./media/kibela.png)

🚀 シームレスなKibela統合を実現するパワフルなVSCode拡張機能。
開発環境から直接Kibelaのノートにアクセス、検索、管理が可能です。

[![Version](https://img.shields.io/visual-studio-marketplace/v/kiwamizamurai-vscode.kibela-vscode)](https://marketplace.visualstudio.com/items?itemName=kiwamizamurai-vscode.kibela-vscode)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/kiwamizamurai-vscode.kibela-vscode)](https://marketplace.visualstudio.com/items?itemName=kiwamizamurai-vscode.kibela-vscode)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/kiwamizamurai-vscode.kibela-vscode)](https://marketplace.visualstudio.com/items?itemName=kiwamizamurai-vscode.kibela-vscode)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
</div>

## ✨ 機能
- 🔍 **高度な検索**
  - リアルタイム検索と履歴
  - カスタマイズ可能なフィルター（アーカイブ、リソースタイプ）
  - 関連性または最新順でソート
  - フォルダーやユーザーでフィルタリング

- 📁 **スマートな整理**
  - 個人用・グループノート
  - フォルダー階層
  - 最近表示したノート

- 🖥️ **リッチプレビュー**
  - メタデータ付きノート内容
  - コメントスレッド
  - プレビュー付きファイル添付
  - グループとフォルダー情報

- ❤️ **ノートインタラクション**
  - ノートのいいね/いいね解除

## 🚀 はじめ方
1. VSCode マーケットプレイスから拡張機能をインストール
2. `Kibela: Authenticate` コマンドを実行
3. チーム名とAPIトークンを入力
    - [APIトークンの生成方法](https://github.com/kibela/kibela-api-v1-document?tab=readme-ov-file#%E3%82%A2%E3%82%AF%E3%82%BB%E3%82%B9%E3%83%88%E3%83%BC%E3%82%AF%E3%83%B3)
4. VSCodeで直接Kibelaの利用開始！


> [!TIP]
> この拡張機能は、KibelaのAPIをリバースエンジニアリングするために`graphql`パッケージの`buildClientSchema`、`getIntrospectionQuery`、`printSchema`を使用してGraphQLスキーマイントロスペクションを行っています。[詳細はこちら](https://github.com/kiwamizamurai/vscode-kibela/blob/main/reverse_engineering/main.ts)

## 今後追加予定の機能
<details>
<summary>こちら</summary>

- 📝 ノート管理
  - [ ] 新規ノート作成
  - [ ] 既存ノートの編集/更新
  - [ ] ノート削除
  - [ ] 下書きサポート

- 💬 コメント
  - [ ] 新規コメント追加
  - [ ] コメントの編集/削除
  - [ ] コメントへの返信

- 🔄 同期
  - [ ] リアルタイム更新
</details>

## 🤝 コントリビューション
コントリビューションを歓迎します！[コントリビューションガイドライン](CONTRIBUTING.md)をご確認ください。
