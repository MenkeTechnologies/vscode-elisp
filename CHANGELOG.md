# Changelog

## 0.1.0

- Initial release.
- Filetype detection for `*.el`, the `.emacs` / `_emacs` init files, and `elisp` shebangs.
- TextMate grammar (`source.elisp`) — special forms (`defun` / `defmacro` /
  `defvar` / `defconst` / `let` / `let*` / `cond` / `lambda` / `setq` / `if` /
  `when` / `unless` / `while` / `progn` / `quote` / `and` / `or`), definition
  names, builtin functions / subrs (`car` `cdr` `cons` `list` `append` `reverse`
  `nth` `mapcar` `funcall` `apply` `format` `message` `string-match`
  `split-string` `+` `-` `*` `/` `1+` `1-` …), keyword symbols (`:keyword`),
  char literals (`?a` `?\n`), quoting sugar (`'` `` ` `` `,` `,@` `#'`), strings,
  numbers (integer, float, `#x` / `#o` / `#b` radix), and `;` comments.
- Editor configuration: line comment `;`, paren / bracket pairs, auto-closing /
  surrounding pairs, symbol word pattern, and paren-based indentation.
- Language server integration via `elisp --lsp` (vscode-languageclient). The
  transport is omitted so the client spawns bare `elisp --lsp` and never appends
  `--stdio` (the arg-rejection / "connection got disposed" failure mode learned
  from vscode-stryke).
- Running: `Emacs Lisp: Run File` command (Ctrl+F5, editor-title ▶, command palette)
  saves and evaluates the active `.el` file as `elisp <file>` in a terminal.
- Debugging via `elisp --dap`: gutter breakpoints, step over/into/out, call
  stack, scopes, variables, watch / hover-to-evaluate, and run-without-debugging.
  F5 on a `.el` file works with no `launch.json`; launch attributes
  `program` / `args` / `cwd` / `stopOnEntry` / `noDebug` / `interpreterArgs` /
  `elispPath` are supported. The adapter binary is resolved like the language
  server, so it works under the macOS GUI `$PATH`.
