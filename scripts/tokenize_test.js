// Tokenize an Emacs Lisp sample with the real VS Code grammar engine
// (vscode-textmate + vscode-oniguruma) and assert key scopes. Verifies the
// grammar actually loads under oniguruma and classifies tokens.
const fs = require('fs');
const path = require('path');
const vsctm = require('vscode-textmate');
const oniguruma = require('vscode-oniguruma');

const root = path.join(__dirname, '..');
const wasm = fs.readFileSync(path.join(root, 'node_modules/vscode-oniguruma/release/onig.wasm'));
const onigLib = oniguruma.loadWASM(wasm.buffer).then(() => ({
  createOnigScanner: (s) => new oniguruma.OnigScanner(s),
  createOnigString: (s) => new oniguruma.OnigString(s)
}));

const registry = new vsctm.Registry({
  onigLib,
  loadGrammar: () =>
    Promise.resolve(
      vsctm.parseRawGrammar(
        fs.readFileSync(path.join(root, 'syntaxes/elisp.tmLanguage.json'), 'utf8'),
        'elisp.tmLanguage.json'
      )
    )
});

const lines = [
  ';;; demo.el --- sample',
  '(defun greet (name)',
  '  (message "hi %s" name))',
  "(setq xs '(a b))",
  '(list :kw ?a 3 nil)',
  '(+ 1 2)'
];

// (lineIndex, columnIndex) -> required scope substring
const checks = [
  [0, 0, 'comment.line.semicolon', ';;; comment'],
  [1, 1, 'keyword.control', 'defun'],
  [1, 7, 'entity.name.function', 'greet'],
  [2, 3, 'support.function', 'message'],
  [2, 11, 'string.quoted.double', 'string'],
  [3, 1, 'keyword.control', 'setq'],
  [3, 9, 'keyword.operator.quote', 'quote'],
  [4, 1, 'support.function', 'list'],
  [4, 6, 'constant.other.keyword', ':kw'],
  [4, 10, 'constant.character', '?a'],
  [4, 13, 'constant.numeric', '3'],
  [4, 15, 'constant.language', 'nil'],
  [5, 1, 'support.function', '+']
];

registry.loadGrammar('source.elisp').then((grammar) => {
  let ruleStack = vsctm.INITIAL;
  const tokensPerLine = lines.map((line) => {
    const r = grammar.tokenizeLine(line, ruleStack);
    ruleStack = r.ruleStack;
    return r.tokens;
  });

  let failed = 0;
  for (const [li, col, wantScope, label] of checks) {
    const toks = tokensPerLine[li];
    const tok = toks.find((t) => col >= t.startIndex && col < t.endIndex);
    const scopes = tok ? tok.scopes.join(' ') : '(none)';
    const ok = scopes.includes(wantScope);
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  L${li}c${col} ${label.padEnd(10)} want=${wantScope.padEnd(30)} got=${scopes}`);
  }
  console.log(failed === 0 ? '\nALL TOKEN CHECKS PASSED' : `\n${failed} CHECK(S) FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}).catch((e) => { console.error(e); process.exit(2); });
