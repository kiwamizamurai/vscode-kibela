import * as vscode from 'vscode';

const viewType = 'kibela.preview';
let currentPanel: vscode.WebviewPanel | undefined;

export function show(
  content: string,
  title: string,
  comments?: { content: string; author: { realName: string } }[]
) {
  const columnToShowIn = vscode.window.activeTextEditor
    ? vscode.window.activeTextEditor.viewColumn
    : undefined;

  if (currentPanel) {
    currentPanel.reveal(columnToShowIn);
    currentPanel.title = title;
    updateContent(currentPanel, content, comments);
  } else {
    currentPanel = vscode.window.createWebviewPanel(
      viewType,
      title,
      columnToShowIn || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    updateContent(currentPanel, content, comments);

    currentPanel.onDidDispose(() => {
      currentPanel = undefined;
    }, null);
  }
}

function updateContent(
  panel: vscode.WebviewPanel,
  content: string,
  comments?: { content: string; author: { realName: string } }[]
) {
  const commentsHtml =
    comments
      ?.map(
        (comment) => `
    <div class="comment">
      <div class="comment-author">${comment.author.realName}</div>
      <div class="comment-content">${comment.content}</div>
    </div>
  `
      )
      .join('') || '';

  panel.webview.html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.2.0/github-markdown.min.css">
        <style>
          body {
            padding: 20px;
            max-width: 980px;
            margin: 0 auto;
          }
          .markdown-body {
            box-sizing: border-box;
            min-width: 200px;
            max-width: 980px;
            margin: 0 auto;
            padding: 45px;
          }
          .comments-section {
            margin-top: 40px;
            border-top: 1px solid #e1e4e8;
            padding-top: 20px;
          }
          .comment {
            margin-bottom: 20px;
            padding: 15px;
            background-color: #f6f8fa;
            border-radius: 6px;
          }
          .comment-author {
            font-weight: bold;
            margin-bottom: 8px;
            color: #24292e;
          }
          .comment-content {
            color: #24292e;
          }
        </style>
      </head>
      <body class="markdown-body">
        ${content}
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
      </body>
    </html>
  `;
}
