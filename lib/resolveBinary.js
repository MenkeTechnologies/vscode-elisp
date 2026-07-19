// Pure (vscode-free) resolver for the elisp binary, factored out of
// extension.js so it can be unit-tested in CI without the `vscode` module.
//
// When launched from the macOS Dock / Finder (or a desktop launcher on Linux),
// the editor's process does NOT inherit the shell PATH, so a bare `elisp`
// fails to spawn. A failed spawn makes vscode-languageclient retry the
// connection 4 times and fire-and-forget `void this.stop()` from its internal
// initialize-failure path while the client is still Starting — surfacing as
// uncaught "Client is not running and can't be stopped" / "Pending response
// rejected since connection got disposed" errors that the extension can't
// guard. The fix is to never let the spawn fail: hand the client an absolute
// path, or refuse to start when the binary genuinely can't be found.

const fs = require('fs');
const path = require('path');
const os = require('os');

// The install locations a non-login GUI process commonly misses (they're not
// on the minimal PATH the editor inherits when launched from the Dock/Finder).
function defaultFallbackDirs() {
  return [
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    path.join(os.homedir(), '.cargo', 'bin'),
    path.join(os.homedir(), '.local', 'bin')
  ];
}

// Resolve `configured` (the `elisp.path` setting, default "elisp") to an
// absolute, executable path. Returns undefined if it can't be found.
// `fallbackDirs` is injectable so the GUI-PATH behavior is unit-testable.
function resolveElispBinary(configured, fallbackDirs = defaultFallbackDirs()) {
  // An explicit path (contains a separator) — verify it's executable, use as-is.
  if (configured.includes(path.sep) || configured.includes('/')) {
    try {
      fs.accessSync(configured, fs.constants.X_OK);
      return configured;
    } catch (_e) {
      return undefined;
    }
  }

  // Bare command name — search PATH plus the GUI-missed fallback locations.
  const dirs = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  dirs.push(...fallbackDirs);

  const seen = new Set();
  for (const dir of dirs) {
    const candidate = path.join(dir, configured);
    if (seen.has(candidate)) {
      continue;
    }
    seen.add(candidate);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch (_e) {
      // keep looking
    }
  }
  return undefined;
}

module.exports = { resolveElispBinary, defaultFallbackDirs };
