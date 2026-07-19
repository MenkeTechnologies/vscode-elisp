```
                         _                 _ _
__   _____  ___ ___   __| | ___        ___| (_)___ _ __
\ \ / / __|/ __/ _ \ / _` |/ _ \_____ / _ \ | / __| '_ \
 \ V /\__ \ (_| (_) | (_| |  __/_____|  __/ | \__ \ |_) |
  \_/ |___/\___\___/ \__,_|\___|      \___|_|_|___/ .__/
                                                  |_|
```

[![CI](https://img.shields.io/badge/CI-passing-39ff14.svg?labelColor=0d0221)](https://github.com/MenkeTechnologies/vscode-elisp/actions/workflows/ci.yml)
[![Docs](https://img.shields.io/badge/docs-online-05d9e8.svg?labelColor=0d0221)](https://menketechnologies.github.io/vscode-elisp/)
[![Report](https://img.shields.io/badge/engineering-report-d300c5.svg?labelColor=0d0221)](https://menketechnologies.github.io/vscode-elisp/report.html)
[![License: MIT](https://img.shields.io/badge/License-MIT-ff2a6d.svg?labelColor=0d0221)](https://opensource.org/licenses/MIT)

### `[VS CODE EXTENSION // EMACS LISP // fusevm/JIT // LSP + DAP]`

> *"Open a `.el`. Forms, quoting, and the builtin surface light up — and `elisp` jacks in."*

VS Code / VSCodium support for **Emacs Lisp**, driven by **[elisprs](https://github.com/MenkeTechnologies/elisprs)** — an Emacs Lisp interpreter written in Rust that lowers `.el` to the **fusevm** bytecode VM + three-tier Cranelift JIT (the engine behind `zshrs`, `stryke`, and `arb`). A standalone TextMate grammar, filetype detection, language-server integration via `elisp --lsp`, one-key running, and full debugging (breakpoints, stepping, variables) via `elisp --dap`.

### [`Read the Docs`](https://menketechnologies.github.io/vscode-elisp/) &middot; [`Engineering Report`](https://menketechnologies.github.io/vscode-elisp/report.html) · [`vscode-stryke`](https://github.com/MenkeTechnologies/vscode-stryke) · [`zshrs`](https://github.com/MenkeTechnologies/zshrs)

---

## [0x00] OVERVIEW

**vscode-elisp** is the VS Code / VSCodium extension for **Emacs Lisp**, backed by the `elisp` interpreter. It provides:

- **Filetype detection** — `*.el` files, the `.emacs` / `_emacs` init files, and files whose first line is an `elisp` shebang.
- **Syntax highlighting** — a standalone TextMate grammar (`source.elisp`).
- **Language server** — `elisp --lsp` via [vscode-languageclient](https://github.com/microsoft/vscode-languageserver-node): completion, hover, and diagnostics.
- **Run** — `Emacs Lisp: Run File` (Ctrl+F5) evaluates the active file in a terminal as `elisp <file>`.
- **Debugging** — breakpoints, stepping, call stack, variables, and watch via `elisp --dap`.

The grammar covers the Emacs Lisp surface: the special forms (`defun`, `defmacro`, `let`, `let*`, `cond`, `lambda`, `setq`, `if`, `when`, `unless`, `while`, `progn`, `quote`, …), the builtin functions / subrs (`car`, `cdr`, `cons`, `mapcar`, `funcall`, `apply`, `format`, `message`, `string-match`, …), keyword symbols (`:keyword`), char literals (`?a`, `?\n`), the quoting sugar (`'` `` ` `` `,` `,@` `#'`), strings, numbers (integer, float, `#x` / `#o` / `#b` radix), and `;` comments.

---

## [0x01] FEATURE MATRIX

| Capability | Status |
|---|---|
| Filetype detection — `*.el`, `.emacs`, `_emacs` | **Implemented** — `contributes.languages` extension + filename map |
| Filetype detection — shebang | **Implemented** — `firstLine` regex `^#!.*\belisp\b` |
| Syntax highlighting | **Implemented** — TextMate grammar (`source.elisp`) |
| Comments / brackets / autoclose | **Implemented** — `language-configuration.json` |
| Indentation | **Implemented** — paren-based `indentationRules` |
| Language server | **Implemented** — `elisp --lsp` via vscode-languageclient |
| Run | **Implemented** — `Emacs Lisp: Run File` (Ctrl+F5 / editor-title ▶) runs `elisp <file>` in a terminal |
| Debugging | **Implemented** — breakpoints, step over/into/out, call stack, scopes, variables, watch/hover, run-without-debugging, via `elisp --dap` (native DAP) |
| Config | `elisp.path`, `elisp.lsp.enabled`, `elisp.lsp.args` |

> The language server needs the `elisp` binary. The extension resolves it from
> `$PATH` plus the common install locations (`/opt/homebrew/bin`, `/usr/local/bin`,
> `~/.cargo/bin`, `~/.local/bin`) — so it works even when the editor is launched
> from the macOS Dock / Finder, which doesn't inherit your shell `$PATH`. Install
> with `brew install menketechnologies/menketech/elisprs`. If it lives elsewhere,
> set `elisp.path` to the absolute path.

---

## [0x02] INSTALL

This extension is not yet on the Marketplace. Build and install the `.vsix` locally:

```bash
git clone https://github.com/MenkeTechnologies/vscode-elisp
cd vscode-elisp
npm install
npx @vscode/vsce package          # produces vscode-elisp-<version>.vsix
code --install-extension vscode-elisp-*.vsix
```

Or drop the folder into your extensions dir for development:

```bash
git clone https://github.com/MenkeTechnologies/vscode-elisp \
    ~/.vscode/extensions/vscode-elisp
```

Open any `.el` file — it lights up. The language server starts automatically when `elisp` is on `$PATH`.

---

## [0x03] RUN & DEBUG

**Run** — open a `.el` file and press **Ctrl+F5**, click the **▶** in the editor
title bar, or run **Emacs Lisp: Run File** from the command palette. The file is saved
and evaluated as `elisp <file>` in an integrated terminal.

**Debug** — set breakpoints in the gutter and press **F5** (or click the **debug**
icon in the editor title bar). No `launch.json` is required: F5 on a `.el` file
debugs the active file. You get the full debugger — breakpoints, step
over/into/out, call stack, scopes, local + global variables, watch expressions,
and hover-to-evaluate — driven by the native debug adapter (`elisp --dap`).

For a saved configuration, add to `.vscode/launch.json`:

```json
{
  "type": "elisp",
  "request": "launch",
  "name": "Emacs Lisp: Debug Current File",
  "program": "${file}",
  "cwd": "${workspaceFolder}",
  "stopOnEntry": false,
  "args": []
}
```

Launch attributes: `program`, `args`, `cwd`, `stopOnEntry`, `noDebug`,
`interpreterArgs`, and `elispPath` (override the binary for one session). The
adapter binary is resolved the same way as the language server, so it works under
the macOS GUI `$PATH`.

---

## [0x04] SYNTAX // SCOPES

The grammar maps Emacs Lisp tokens to standard TextMate scopes, so every VS Code theme colors them:

| Token group | Scope | Sample |
|---|---|---|
| Special forms | `keyword.control.elisp` | `defun` `defmacro` `let` `let*` `cond` `lambda` `setq` `if` `when` `unless` `while` `progn` `quote` `and` `or` |
| Definition names | `entity.name.function.elisp` | the name in `(defun NAME …)` / `(defvar NAME …)` |
| Builtin functions | `support.function.elisp` | `car` `cdr` `cons` `list` `append` `mapcar` `funcall` `apply` `format` `message` `string-match` `+` `-` `*` `/` `1+` |
| Keyword symbols | `constant.other.keyword.elisp` | `:test` `:key` `:initial-value` |
| Char literals | `constant.character.elisp` | `?a` `?\n` `?\C-x` |
| Constants | `constant.language.elisp` | `t` `nil` |
| Numbers | `constant.numeric.elisp` | `42` `3.14` `#xFF` `#o17` `#b1010` |
| Quoting | `keyword.operator.quote.elisp` | `'` `` ` `` `,` `,@` `#'` |

Strings (double-quoted with escapes), `;` comments, and shebang lines are scoped too.

---

## [0x05] LANGUAGE SERVER

The extension launches `elisp --lsp` (stdio JSON-RPC) through `vscode-languageclient`. Configure it in Settings:

| Setting | Default | Effect |
|---|---|---|
| `elisp.path` | `elisp` | Path to the elisp executable |
| `elisp.lsp.enabled` | `true` | Start the language server (set `false` for highlighting only) |
| `elisp.lsp.args` | `["--lsp"]` | Args passed to start the server |

The transport is omitted so the client spawns bare `elisp --lsp` and never
appends `--stdio` — the arg-rejection / "connection got disposed" failure mode
learned from vscode-stryke. If the binary is missing, the extension shows one
non-fatal warning and syntax highlighting keeps working.

---

## [0x06] VERIFYING THE GRAMMAR

Verify the grammar tokenizes correctly with the real VS Code grammar engine
(`vscode-textmate` + `vscode-oniguruma`, the engine VS Code itself uses):

```bash
npm install
node scripts/tokenize_test.js
```

---

## [0x07] LAYOUT

```
vscode-elisp/
├── package.json                 # extension manifest (language, grammar, config, LSP, DAP)
├── language-configuration.json  # comments, brackets, autoclose, indent rules
├── extension.js                 # LSP client (elisp --lsp) + run + debug (elisp --dap)
├── lib/resolveBinary.js         # GUI-PATH-safe elisp binary resolver
├── syntaxes/elisp.tmLanguage.json # TextMate grammar (source.elisp)
├── scripts/tokenize_test.js     # tokenizes a sample with vscode-textmate + asserts scopes
├── scripts/resolver_test.js     # unit tests for the binary resolver
└── scripts/activate_test.js     # LSP/DAP spawn-contract regression tests
```

---

## [0x08] LICENSE

MIT
