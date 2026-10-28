// Versioned, scope-isolated game-state persistence over an injected storage
// adapter (localStorage-like { getItem, setItem, removeItem }). Corrupt
// entries are quarantined (backup key) and reported, never thrown into the
// game; quota/IO failures surface as { ok:false, code } return values.

export class StorageError extends Error {
  constructor(code, key, detail = "") {
    super(`Storage ${code}: ${key}${detail ? ` — ${detail}` : ""}`);
    this.name = "StorageError";
    this.code = code;
    this.key = key;
  }
}

function isQuotaError(err) {
  if (!err) return false;
  const name = err.name ?? err.code ?? "";
  if (typeof name === "string" && /quotaexceeded/i.test(name)) return true;
  if (err.code === 22 || err.code === "22") return true;
  return /quota/i.test(String(err.message ?? err));
}

/**
 * @param {object} opts
 * @param {string} opts.scope   namespace prefix, e.g. "ev.save.melon-reef"
 * @param {number} [opts.version=1] envelope version; mismatches report migrated:false
 * @param {object} [opts.storage] adapter (default: globalThis.localStorage or memory)
 * @param {"reset"|"throw"} [opts.onCorrupt="reset"] corrupt-entry policy
 * @param {(data:unknown,version:number)=>unknown} [opts.migrate] version migration hook
 */
export class VersionedStore {
  constructor(opts = {}) {
    if (typeof opts.scope !== "string" || !opts.scope) throw new TypeError("VersionedStore needs a scope");
    this.scope = opts.scope;
    this.version = opts.version ?? 1;
    this.storage = opts.storage ?? defaultStorage();
    this.onCorrupt = opts.onCorrupt ?? "reset";
    this.migrate = typeof opts.migrate === "function" ? opts.migrate : null;
  }

  key(name) {
    return `${this.scope}/${name}`;
  }

  corruptBackupKey(name) {
    return `${this.scope}/${name}.corrupt`;
  }

  save(name, data) {
    const envelope = JSON.stringify({ v: this.version, data });
    try {
      this.storage.setItem(this.key(name), envelope);
      return { ok: true, code: "" };
    } catch (err) {
      if (isQuotaError(err)) return { ok: false, code: "quota", error: err };
      return { ok: false, code: "io", error: err };
    }
  }

  load(name, fallback = null) {
    let raw;
    try {
      raw = this.storage.getItem(this.key(name));
    } catch (err) {
      return { ok: false, code: "io", data: fallback, fallbackUsed: true, corrupted: false, error: err };
    }
    if (raw === null || raw === undefined) {
      return { ok: true, code: "", data: fallback, fallbackUsed: true, corrupted: false };
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      return this._handleCorrupt(name, raw, fallback, err);
    }
    if (!parsed || typeof parsed !== "object" || !("v" in parsed) || !("data" in parsed)) {
      return this._handleCorrupt(name, raw, fallback, new Error("bad envelope"));
    }
    if (parsed.v !== this.version) {
      if (this.migrate) {
        try {
          return { ok: true, code: "", data: this.migrate(parsed.data, parsed.v), fallbackUsed: false, corrupted: false, migrated: true };
        } catch (err) {
          return { ok: false, code: "migrate", data: fallback, fallbackUsed: true, corrupted: false, error: err };
        }
      }
      return { ok: true, code: "", data: fallback, fallbackUsed: true, corrupted: false, migrated: false, storedVersion: parsed.v };
    }
    return { ok: true, code: "", data: parsed.data, fallbackUsed: false, corrupted: false };
  }

  remove(name) {
    try {
      this.storage.removeItem(this.key(name));
      return { ok: true, code: "" };
    } catch (err) {
      return { ok: false, code: "io", error: err };
    }
  }

  _handleCorrupt(name, raw, fallback, err) {
    // Quarantine the bad bytes for diagnosis before resetting.
    try {
      this.storage.setItem(this.corruptBackupKey(name), String(raw));
    } catch {
      /* quarantine is best-effort */
    }
    if (this.onCorrupt === "throw") throw new StorageError("corrupt", this.key(name), err?.message ?? String(err));
    try {
      this.storage.removeItem(this.key(name));
    } catch {
      /* best-effort */
    }
    return { ok: true, code: "", data: fallback, fallbackUsed: true, corrupted: true, error: err };
  }
}

function defaultStorage() {
  try {
    if (typeof globalThis.localStorage !== "undefined") return globalThis.localStorage;
  } catch {
    /* sandboxed */
  }
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}
