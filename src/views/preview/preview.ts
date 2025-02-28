import * as vscode from 'vscode';

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
  path: string,
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
  attachments?: { name: string; dataUrl: string; mimeType: string }[],
  noteId?: string,
  isLikedByCurrentUser?: boolean
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
      attachments,
      path,
      title,
      noteId,
      isLikedByCurrentUser
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
      attachments,
      path,
      title,
      noteId,
      isLikedByCurrentUser
    );

    currentPanel.onDidDispose(() => {
      currentPanel = undefined;
    }, null);
  }

  if (currentPanel) {
    currentPanel.webview.onDidReceiveMessage(
      async (message: { command: string; noteId: string; path?: string }) => {
        if (!currentPanel) return;

        try {
          switch (message.command) {
            case 'like':
              await vscode.commands.executeCommand(
                'kibela.likeNote',
                message.noteId
              );
              currentPanel.webview.postMessage({
                command: 'updateLikeState',
                isLiked: true,
              });
              break;
            case 'unlike':
              await vscode.commands.executeCommand(
                'kibela.unlikeNote',
                message.noteId
              );
              currentPanel.webview.postMessage({
                command: 'updateLikeState',
                isLiked: false,
              });
              break;
            case 'openNote':
              if (message.path) {
                await vscode.commands.executeCommand(
                  'kibela.openNoteFromPath',
                  message.path
                );
              }
              break;
          }
        } catch (error) {
          if (currentPanel) {
            if (message.command === 'like' || message.command === 'unlike') {
              currentPanel.webview.postMessage({
                command: 'updateLikeState',
                isLiked: message.command === 'unlike',
              });
            }
          }
        }
      }
    );
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
  attachments?: { name: string; dataUrl: string; mimeType: string }[],
  notePath?: string,
  title?: string,
  noteId?: string,
  isLikedByCurrentUser?: boolean
) {
  let updatedContent = content;
  // Transform img tags in content using attachments
  if (attachments?.length) {
    updatedContent = updatedContent.replace(
      /<img[^>]*?title="([^"]*)"[^>]*?>/g,
      (match, imgTitle) => {
        const attachment = attachments.find((a) => a.name === imgTitle);
        if (attachment) {
          return `<img src="${attachment.dataUrl}" alt="${attachment.name}" title="${attachment.name}">`;
        }
        return match;
      }
    );
  }

  // Kibelaノートリンクをhrefなしのカスタム要素に変換
  updatedContent = updatedContent.replace(
    /<a[^>]*?href="[^"]*?kibe\.la\/notes\/(\d+)[^"]*"[^>]*?>([^<]*(?:<(?!\/a>)[^<]*)*)<\/a>/g,
    (_, noteId, innerContent) => {
      return `<span class="kibela-note-link" data-path="/notes/${noteId}" style="color: var(--vscode-textLink-foreground); cursor: pointer;">${innerContent}</span>`;
    }
  );

  const config = vscode.workspace.getConfiguration('kibela');
  const team = config.get<string>('team');
  const baseUrl = team ? `https://${team}.kibe.la` : '';

  const metadataHtml = `
    <div class="metadata">
      ${
        baseUrl && notePath && noteId
          ? `<div class="note-link">
              <h1 class="note-title">${title}</h1>
              <div class="note-actions">
                <button id="likeButton" class="like-button ${
                  isLikedByCurrentUser ? 'liked' : ''
                }" data-note-id="${noteId}">
                  ${isLikedByCurrentUser ? '❤️ Liked' : '🤍 Like'}
                </button>
                <a href="${baseUrl}${notePath}" target="_blank" class="kibela-link" data-url="${baseUrl}${notePath}">View on Kibela</a>
              </div>
            </div>`
          : ''
      }
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
              .map(
                (folder) =>
                  `<li>${folder.fullName} (<a href="${baseUrl}${folder.path}" target="_blank" class="kibela-link" data-url="${baseUrl}${folder.path}">View folder</a>)</li>`
              )
              .join('')}
          </ul>
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
      :root {
        --vscode-foreground: var(--vscode-editor-foreground);
        --vscode-background: var(--vscode-editor-background);
        --vscode-border: var(--vscode-panel-border);
        --vscode-accent: var(--vscode-textLink-foreground);
        --vscode-secondary-text: var(--vscode-descriptionForeground);
      }
      body {
        padding: 20px;
        max-width: 1000px;
        margin: 0 auto;
        font-family: var(--vscode-font-family);
        line-height: 1.6;
        color: var(--vscode-foreground);
        background-color: var(--vscode-background);
      }
      .note-link {
        margin-bottom: 10px;
      }
      .note-title {
        margin: 0 0 10px 0;
        font-size: 1.8em;
        color: var(--vscode-foreground);
      }
      .note-link a {
        color: var(--vscode-accent);
        text-decoration: none;
      }
      .note-link a:hover {
        text-decoration: underline;
      }
      .metadata {
        margin-bottom: 30px;
        padding: 15px;
        background-color: var(--vscode-sideBar-background);
        border-radius: 6px;
        border-left: 4px solid var(--vscode-accent);
      }
      .metadata > div {
        margin: 5px 0;
      }
      .author {
        font-weight: bold;
        color: var(--vscode-foreground);
      }
      .last-updated, .published {
        color: var(--vscode-secondary-text);
        font-size: 0.9em;
      }
      .draft {
        display: inline-block;
        padding: 2px 6px;
        background-color: var(--vscode-statusBarItem-warningBackground);
        color: var(--vscode-statusBarItem-warningForeground);
        border-radius: 3px;
        font-size: 0.9em;
      }
      .groups h3, .folders h3, h3 {
        margin: 10px 0 5px;
        font-size: 1em;
        color: var(--vscode-foreground);
      }
      .content img {
        max-width: 100%;
        height: auto;
        border-radius: 6px;
        margin: 8px 0;
        cursor: pointer;
      }
      .comments {
        margin-top: 30px;
        border-top: 1px solid var(--vscode-border);
        padding-top: 20px;
      }
      .comment {
        background: var(--vscode-sideBar-background);
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 16px;
      }
      .comment-author {
        font-weight: bold;
        color: var(--vscode-foreground);
      }
      .comment-date {
        font-size: 0.8em;
        color: var(--vscode-secondary-text);
        margin: 4px 0;
      }
      .comment-content {
        margin-top: 8px;
      }
      .modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        z-index: 1000;
        justify-content: center;
        align-items: center;
      }
      .modal.show {
        display: flex;
      }
      .modal-content {
        position: relative;
        max-width: 90%;
        max-height: 90vh;
      }
      .modal-content img {
        max-width: 100%;
        max-height: 90vh;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 4px 12px var(--vscode-widget-shadow);
      }
      .modal-close {
        position: absolute;
        top: -40px;
        right: 0;
        color: white;
        font-size: 24px;
        cursor: pointer;
        background: none;
        border: none;
        padding: 8px;
      }
      .modal-close:hover {
        opacity: 0.8;
      }
      .modal-caption {
        position: absolute;
        bottom: -40px;
        left: 0;
        right: 0;
        color: white;
        text-align: center;
        font-size: 14px;
      }
      .note-actions {
        display: flex;
        gap: 10px;
        align-items: center;
        margin-bottom: 10px;
      }
      .like-button {
        padding: 6px 12px;
        border-radius: 4px;
        border: 1px solid var(--vscode-border);
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: all 0.2s ease;
      }
      .like-button:hover {
        background: var(--vscode-button-hoverBackground);
      }
      .like-button.liked {
        background: var(--vscode-statusBarItem-warningBackground);
        color: var(--vscode-statusBarItem-warningForeground);
      }
    </style>
  `;

  const modalHtml = `
    <div id="imageModal" class="modal">
      <div class="modal-content">
        <button class="modal-close">&times;</button>
        <img id="modalImage" src="" alt="">
        <div id="modalCaption" class="modal-caption"></div>
      </div>
    </div>
  `;

  const script = `
    <script>
      const vscode = acquireVsCodeApi();
      const modal = document.getElementById('imageModal');
      const modalImg = document.getElementById('modalImage');
      const modalCaption = document.getElementById('modalCaption');
      const closeBtn = document.querySelector('.modal-close');

      // Kibelaノートリンクのクリックハンドラ
      document.querySelectorAll('.kibela-note-link').forEach(link => {
        link.addEventListener('click', () => {
          const path = link.getAttribute('data-path');
          if (path) {
            vscode.postMessage({
              command: 'openNote',
              path: path
            });
          }
        });
      });

      // Add context menu for Kibela link
      document.querySelector('.kibela-link')?.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        const url = this.getAttribute('data-url');
        navigator.clipboard.writeText(url).then(() => {
          // Show feedback
          const feedback = document.createElement('div');
          feedback.textContent = 'URL copied!';
          feedback.style.position = 'fixed';
          feedback.style.left = e.clientX + 'px';
          feedback.style.top = e.clientY + 'px';
          feedback.style.background = 'var(--vscode-editor-background)';
          feedback.style.color = 'var(--vscode-editor-foreground)';
          feedback.style.padding = '4px 8px';
          feedback.style.borderRadius = '4px';
          feedback.style.border = '1px solid var(--vscode-border)';
          feedback.style.zIndex = '1000';
          document.body.appendChild(feedback);
          
          setTimeout(() => {
            feedback.remove();
          }, 1500);
        });
      });

      document.querySelectorAll('.attachment-item img, .content img').forEach(img => {
        img.addEventListener('click', function() {
          modal.classList.add('show');
          modalImg.src = this.src;
          modalCaption.textContent = this.alt || this.title || '';
        });
      });

      function closeModal() {
        modal.classList.remove('show');
      }

      closeBtn.addEventListener('click', closeModal);

      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          closeModal();
        }
      });

      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
          closeModal();
        }
      });

      const likeButton = document.getElementById('likeButton');
      if (likeButton) {
        likeButton.addEventListener('click', () => {
          const noteId = likeButton.getAttribute('data-note-id');
          const isLiked = likeButton.classList.contains('liked');
          vscode.postMessage({
            command: isLiked ? 'unlike' : 'like',
            noteId: noteId
          });
        });
      }

      window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
          case 'updateLikeState':
            if (likeButton) {
              likeButton.classList.toggle('liked', message.isLiked);
              likeButton.textContent = message.isLiked ? '❤️ Liked' : '🤍 Like';
            }
            break;
        }
      });
    </script>
  `;

  console.log('Preview content:', updatedContent);

  panel.webview.html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${styles}
    </head>
    <body>
      ${metadataHtml}
      <div class="content">
        ${updatedContent}
      </div>
      ${commentsHtml ? `<div class="comments">${commentsHtml}</div>` : ''}
      ${modalHtml}
      ${script}
    </body>
    </html>
  `;
}
