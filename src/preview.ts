import * as vscode from 'vscode';
import { KibelaAttachment } from './types';

const viewType = 'kibela.preview';
let currentPanel: vscode.WebviewPanel | undefined;
let currentEditor: vscode.TextEditor | undefined;
let currentDocument: vscode.TextDocument | undefined;

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (currentPanel && e.document === currentDocument) {
        const content = e.document.getText();
        updateContent(currentPanel, content);
      }
    }),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      currentEditor = editor;
      if (editor) {
        currentDocument = editor.document;
        if (currentPanel) {
          currentPanel.title = editor.document.fileName;
          updateContent(currentPanel, editor.document.getText());
        }
      }
    })
  );
}

export function show(
  content: string,
  title: string,
  comments: {
    content: string;
    author: { realName: string; account: string };
    createdAt: string;
  }[],
  author: { realName: string; account: string },
  lastUpdated: Date,
  publishedAt?: Date,
  groups?: { name: string }[],
  folders?: { fullName: string; path: string }[],
  attachments?: { name: string; dataUrl: string; mimeType: string }[]
) {
  const columnToShowIn = vscode.window.activeTextEditor
    ? vscode.window.activeTextEditor.viewColumn
    : undefined;

  if (currentPanel) {
    currentPanel.reveal(columnToShowIn);
    currentPanel.title = title;
    updateContent(
      currentPanel,
      content,
      comments,
      author,
      lastUpdated,
      publishedAt,
      groups,
      folders,
      attachments
    );
  } else {
    currentPanel = vscode.window.createWebviewPanel(
      viewType,
      title,
      columnToShowIn || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [],
      }
    );

    currentPanel.webview.options = {
      enableScripts: true,
    };

    updateContent(
      currentPanel,
      content,
      comments,
      author,
      lastUpdated,
      publishedAt,
      groups,
      folders,
      attachments
    );

    currentPanel.onDidDispose(() => {
      currentPanel = undefined;
    }, null);
  }
}

function updateContent(
  panel: vscode.WebviewPanel,
  content: string,
  comments?: {
    content: string;
    author: { realName: string; account: string };
    createdAt: string;
  }[],
  author?: { realName: string; account: string },
  lastUpdated?: Date,
  publishedAt?: Date,
  groups?: { name: string }[],
  folders?: { fullName: string; path: string }[],
  attachments?: { name: string; dataUrl: string; mimeType: string }[]
) {
  const metadataHtml = `
    <div class="metadata">
      ${
        author
          ? `<div class="author">Author: ${author.realName} (@${author.account})</div>`
          : ''
      }
      ${
        lastUpdated
          ? `<div class="last-updated">Last Updated: ${lastUpdated.toLocaleString()}</div>`
          : ''
      }
      ${
        publishedAt
          ? `<div class="published">Published: ${publishedAt.toLocaleString()}</div>`
          : '<div class="draft">Draft</div>'
      }
      
      ${
        groups?.length
          ? `
        <div class="groups">
          <h3>Groups</h3>
          <ul>
            ${groups.map((group) => `<li>${group.name}</li>`).join('')}
          </ul>
        </div>
      `
          : ''
      }
      
      ${
        folders?.length
          ? `
        <div class="folders">
          <h3>Folders</h3>
          <ul>
            ${folders
              .map((folder) => `<li>${folder.fullName} (${folder.path})</li>`)
              .join('')}
          </ul>
        </div>
      `
          : ''
      }

      ${
        attachments?.length
          ? `
        <div class="attachments">
          <h3>Attachments</h3>
          <div class="attachment-grid">
            ${attachments
              .map((attachment) => {
                if (attachment.mimeType.startsWith('image/')) {
                  return `
                  <div class="attachment-item">
                    <img src="${attachment.dataUrl}" alt="${attachment.name}" title="${attachment.name}">
                    <div class="attachment-name">${attachment.name}</div>
                  </div>
                `;
                }
                return `
                  <div class="attachment-item">
                    <div class="attachment-file">
                      <span class="file-icon">📄</span>
                      <div class="attachment-name">${attachment.name}</div>
                      <div class="attachment-type">${attachment.mimeType}</div>
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      `
          : ''
      }
    </div>
  `;

  const commentsHtml =
    comments
      ?.map(
        (comment) => `
      <div class="comment">
        <div class="comment-author">${comment.author.realName} (@${
          comment.author.account
        })</div>
        <div class="comment-date">${new Date(
          comment.createdAt
        ).toLocaleString()}</div>
        <div class="comment-content">${comment.content}</div>
      </div>
    `
      )
      .join('') || '';

  const styles = `
    <style>
      body {
        padding: 20px;
        max-width: 1000px;
        margin: 0 auto;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
        line-height: 1.6;
      }
      .metadata {
        margin-bottom: 30px;
        padding: 15px;
        background-color: #f8f9fa;
        border-radius: 6px;
        border-left: 4px solid #0366d6;
      }
      .metadata > div {
        margin: 5px 0;
      }
      .author {
        font-weight: bold;
        color: #24292e;
      }
      .last-updated, .published {
        color: #586069;
        font-size: 0.9em;
      }
      .draft {
        display: inline-block;
        padding: 2px 6px;
        background-color: #ffd33d;
        color: #24292e;
        border-radius: 3px;
        font-size: 0.9em;
      }
      .groups, .folders {
        margin-top: 15px;
      }
      .groups h3, .folders h3 {
        margin: 10px 0 5px;
        font-size: 0.9em;
        color: #24292e;
      }
      .groups ul, .folders ul {
        margin: 0;
        padding-left: 20px;
        list-style-type: none;
      }
      .groups li, .folders li {
        font-size: 0.9em;
        color: #586069;
        margin: 3px 0;
      }
      .markdown-body {
        box-sizing: border-box;
        min-width: 200px;
        max-width: 1000px;
        margin: 0 auto;
        padding: 45px;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.12);
      }
      .comment {
        margin: 20px 0;
        padding: 15px;
        background-color: #f6f8fa;
        border-radius: 6px;
        border-left: 4px solid #0366d6;
      }
      .comment-author {
        font-weight: bold;
        color: #24292e;
      }
      .comment-date {
        font-size: 0.9em;
        color: #586069;
        margin: 5px 0;
      }
      .comment-content {
        margin-top: 10px;
        color: #24292e;
      }
      .attachments {
        margin-top: 20px;
      }
      .attachment-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 16px;
        margin-top: 10px;
      }
      .attachment-item {
        border: 1px solid #e1e4e8;
        border-radius: 6px;
        padding: 8px;
        background: white;
        transition: transform 0.2s;
      }
      .attachment-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      }
      .attachment-item img {
        width: 100%;
        height: auto;
        border-radius: 4px;
        object-fit: cover;
      }
      .attachment-name {
        margin-top: 8px;
        font-size: 0.9em;
        color: #24292e;
        word-break: break-all;
      }
      .attachment-file {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 16px;
      }
      .file-icon {
        font-size: 2em;
        margin-bottom: 8px;
      }
      .attachment-type {
        font-size: 0.8em;
        color: #586069;
        margin-top: 4px;
      }
    </style>
  `;

  panel.webview.html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https: vscode-webview: vscode-resource:; script-src 'unsafe-inline' https:; style-src 'unsafe-inline' https:;">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.2.0/github-markdown.min.css">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github.min.css">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js"></script>
        ${styles}
      </head>
      <body>
        ${metadataHtml}
        <div class="markdown-body">
          ${content}
        </div>
        ${
          comments?.length
            ? `
          <div class="comments-section">
            <h2>Comments</h2>
            ${commentsHtml}
          </div>
        `
            : ''
        }
        <script>
          hljs.highlightAll();
        </script>
      </body>
    </html>
  `;
}
