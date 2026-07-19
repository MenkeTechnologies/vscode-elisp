// vscode-elisp — language support, running, and debugging for Emacs Lisp (the elisp
// Rust implementation).
//
// Syntax highlighting and filetype detection are declarative (see package.json
// + syntaxes/elisp.tmLanguage.json). This module wires up the runtime pieces:
//   --lsp   Language Server (JSON-RPC on stdio) — diagnostics / hover / completion
//   --dap   Debug Adapter (DAP on stdio)        — breakpoints / stepping / variables
// Both flags are passed to the elisp binary; a missing flag/binary degrades to
// a single non-fatal warning (syntax highlighting keeps working).

const vscode = require('vscode');
const { LanguageClient } = require('vscode-languageclient/node');
const { resolveElispBinary } = require('./lib/resolveBinary');

let client;
let runTerminal;

function activate(context) {
  registerExecutionAndDebug(context);

  const config = vscode.workspace.getConfiguration('elisp');
  if (config.get('lsp.enabled', true)) {
    startLanguageServer(context, config);
  }
}

// Resolve the elisp binary or warn once, returning undefined when not found.
function resolveOrWarn(configured, action) {
  const command = resolveElispBinary(configured);
  if (!command) {
    vscode.window.showWarningMessage(
      `elisp not found for ${action}: could not find the \`${configured}\` binary. ` +
      `Set "elisp.path" to the absolute path (e.g. /opt/homebrew/bin/elisp) or install it (\`brew install menketechnologies/menketech/elisprs\`).`
    );
  }
  return command;
}

// Shell-quote a path for `Terminal.sendText` (POSIX shells vs Windows).
function shellQuote(s) {
  if (process.platform === 'win32') {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

function activeElispEditor(action) {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'elisp') {
    vscode.window.showWarningMessage(`Emacs Lisp: open a .el file to ${action}.`);
    return undefined;
  }
  return editor;
}

// `elisp.run` — execute the active file in an integrated terminal as `elisp <file>`.
function runFile() {
  const editor = activeElispEditor('run');
  if (!editor) return;
  const configured = vscode.workspace.getConfiguration('elisp').get('path', 'elisp');
  const command = resolveOrWarn(configured, 'running');
  if (!command) return;
  editor.document.save().then(() => {
    if (!runTerminal || runTerminal.exitStatus !== undefined) {
      runTerminal = vscode.window.createTerminal('elisp');
    }
    runTerminal.show(true);
    runTerminal.sendText(`${shellQuote(command)} ${shellQuote(editor.document.uri.fsPath)}`);
  });
}

// `elisp.debug` — launch a debug session for the active file.
function debugFile() {
  const editor = activeElispEditor('debug');
  if (!editor) return;
  editor.document.save().then(() => {
    vscode.debug.startDebugging(vscode.workspace.getWorkspaceFolder(editor.document.uri), {
      type: 'elisp',
      request: 'launch',
      name: 'Emacs Lisp: Debug Current File',
      program: editor.document.uri.fsPath,
      cwd: '${workspaceFolder}',
      stopOnEntry: false
    });
  });
}

// Fills in a debug config for F5-with-no-launch.json, and aborts cleanly if no
// program can be determined.
const debugConfigProvider = {
  resolveDebugConfiguration(_folder, config) {
    if (!config.type && !config.request && !config.name) {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === 'elisp') {
        config.type = 'elisp';
        config.request = 'launch';
        config.name = 'Emacs Lisp: Debug Current File';
        config.program = '${file}';
        config.cwd = '${workspaceFolder}';
        config.stopOnEntry = false;
      }
    }
    if (!config.program) {
      vscode.window.showWarningMessage('Emacs Lisp debug: no `program` to debug (open a .el file or set one in launch.json).');
      return undefined; // abort the session
    }
    return config;
  }
};

// Builds the debug adapter: `elisp --dap` over stdio. The binary is resolved
// the same way as the LSP, so it works under the GUI PATH; a per-session
// `elispPath` in the launch config overrides the `elisp.path` setting.
const debugAdapterFactory = {
  createDebugAdapterDescriptor(session) {
    const configured = session.configuration.elispPath
      || vscode.workspace.getConfiguration('elisp').get('path', 'elisp');
    const command = resolveElispBinary(configured);
    if (!command) {
      vscode.window.showErrorMessage(
        `elisp not found for debugging: could not find the \`${configured}\` binary. Set "elisp.path".`
      );
      return undefined;
    }
    return new vscode.DebugAdapterExecutable(command, ['--dap']);
  }
};

function registerExecutionAndDebug(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('elisp.run', runFile),
    vscode.commands.registerCommand('elisp.debug', debugFile),
    vscode.debug.registerDebugConfigurationProvider('elisp', debugConfigProvider),
    vscode.debug.registerDebugAdapterDescriptorFactory('elisp', debugAdapterFactory)
  );
}

function startLanguageServer(context, config) {
  const configured = config.get('path', 'elisp');
  const command = resolveElispBinary(configured);
  const args = config.get('lsp.args', ['--lsp']);

  // Binary not found — do NOT start the client. Starting it would spawn-fail
  // and trigger the internal retry/stop cascade described above. Warn once and
  // leave syntax highlighting (which needs no server) working.
  if (!command) {
    vscode.window.showWarningMessage(
      `elisp language server not started: could not find the \`${configured}\` binary. ` +
      `Set "elisp.path" to the absolute path (e.g. /opt/homebrew/bin/elisp), ` +
      `install it (\`brew install menketechnologies/menketech/elisprs\`), or disable "elisp.lsp.enabled". ` +
      `Syntax highlighting still works.`
    );
    return;
  }

  // NOTE: do NOT set `transport: TransportKind.stdio`. For a command-based
  // server, vscode-languageclient reacts to that by appending `--stdio` to the
  // argv (see vscode-languageclient/lib/node/main.js — the Executable branch),
  // so it would spawn `elisp --lsp --stdio`. elisp's CLI rejects the extra
  // arg and exits before the JSON-RPC handshake — which the client reports as
  // "Pending response rejected since connection got disposed" plus the
  // StartFailed retry cascade. With transport omitted the client still talks
  // JSON-RPC over the process stdout/stdin (the `transport === undefined` path
  // uses StreamMessageReader/Writer), but spawns bare `elisp --lsp`, which is
  // what the binary expects. (Same root cause that bit vscode-stryke.)
  const serverOptions = {
    run: { command, args },
    debug: { command, args }
  };

  const clientOptions = {
    documentSelector: [{ scheme: 'file', language: 'elisp' }],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.el')
    }
  };

  client = new LanguageClient(
    'elisp',
    'elisp Language Server',
    serverOptions,
    clientOptions
  );

  // Defensive: if start() still rejects (server crashes after a successful
  // spawn), surface it once instead of letting the rejection go uncaught.
  client.start().catch((err) => {
    vscode.window.showWarningMessage(
      `elisp language server failed to start (${command} --lsp): ${err.message}. ` +
      `Syntax highlighting still works.`
    );
  });

  context.subscriptions.push({ dispose: stopClient });
}

// stop() throws synchronously unless the client is actually Running — in the
// Starting / StartFailed states it raises "Client is not running and can't be
// stopped". Only stop a running client, and swallow any late rejection.
function stopClient() {
  if (!client || !client.isRunning()) {
    return undefined;
  }
  try {
    return Promise.resolve(client.stop()).catch(() => undefined);
  } catch (_e) {
    return undefined;
  }
}

function deactivate() {
  return stopClient();
}

module.exports = { activate, deactivate };
