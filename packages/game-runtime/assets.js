// Asset manager for BUNDLED game assets (images/audio/text/JSON).
// Rules: explicit missing/decode errors, bounded concurrency, abort +
// timeouts, in-flight deduplication, opt-in declared fallbacks only.
// Missing assets are NEVER synthesized and NEVER reported as successful.

export class AssetError extends Error {
  /**
   * @param {string} code 'missing'|'decode'|'timeout'|'aborted'|'network'|'unknown-kind'
   */
  constructor(code, key, url, detail = "") {
    super(`Asset ${code}: ${key}${url ? ` (${url})` : ""}${detail ? ` — ${detail}` : ""}`);
    this.name = "AssetError";
    this.code = code;
    this.key = key;
    this.url = url;
  }
}

const KINDS = new Set(["image", "audio", "text", "json"]);

function defaultFetch() {
  if (typeof globalThis.fetch === "function") return globalThis.fetch.bind(globalThis);
  throw new Error("AssetManager needs opts.fetchImpl (no global fetch available)");
}

/**
 * @param {object} [opts]
 * @param {number} [opts.concurrency=4] max simultaneous loads
 * @param {number} [opts.timeoutMs=15000] per-asset timeout (0 = none)
 * @param {function} [opts.fetchImpl] fetch(url, {signal}) — injectable
 * @param {(url,signal)=>Promise<unknown>} [opts.decodeImage] image decoder — injectable
 * @param {(url,signal)=>Promise<unknown>} [opts.decodeAudio] audio decoder — injectable
 * @param {(ms,signal)=>Promise<void>} [opts.delay] sleep impl — injectable for tests
 */
export class AssetManager {
  constructor(opts = {}) {
    this.concurrency = opts.concurrency ?? 4;
    if (!(this.concurrency >= 1)) throw new RangeError("concurrency must be >= 1");
    this.timeoutMs = opts.timeoutMs ?? 15000;
    this.fetchImpl = opts.fetchImpl ?? null; // resolved lazily (keeps import side-effect free)
    this.decodeImage = opts.decodeImage ?? null;
    this.decodeAudio = opts.decodeAudio ?? null;
    this.delay = opts.delay ?? ((ms, signal) => sleep(ms, signal));
    this.defs = new Map(); // key -> { url, kind, fallback }
    this.cache = new Map(); // key -> { value, fallbackUsed }
    this.inflight = new Map(); // key -> Promise
  }

  /** Declare a bundled asset. `fallback` is opt-in: only then may a failed load resolve. */
  define(key, spec) {
    if (typeof key !== "string" || !key) throw new TypeError("asset key must be a non-empty string");
    if (!spec || typeof spec.url !== "string" || !spec.url) throw new TypeError(`asset ${key} needs a url`);
    if (!KINDS.has(spec.kind)) throw new AssetError("unknown-kind", key, spec.url, `kind must be one of ${[...KINDS].join(", ")}`);
    if (this.defs.has(key)) throw new Error(`Asset already defined: ${key}`);
    this.defs.set(key, { url: spec.url, kind: spec.kind, fallback: spec.fallback });
    return this;
  }

  has(key) {
    return this.defs.has(key);
  }

  cached(key) {
    return this.cache.get(key) ?? null;
  }

  forget(key) {
    this.cache.delete(key);
    return this;
  }

  clear() {
    this.cache.clear();
    return this;
  }

  /** Load one asset (deduplicated while in flight, cached after success/fallback). */
  load(key, opts = {}) {
    const def = this.defs.get(key);
    if (!def) return Promise.reject(new AssetError("missing", key, "", "asset not defined"));
    const hit = this.cache.get(key);
    if (hit && !opts.reload) return Promise.resolve(hit);
    const running = this.inflight.get(key);
    if (running && !opts.reload) return running;
    const p = this._loadOne(key, def, opts.signal).then(
      (entry) => {
        this.inflight.delete(key);
        this.cache.set(key, entry);
        return entry;
      },
      (err) => {
        this.inflight.delete(key);
        throw err;
      },
    );
    this.inflight.set(key, p);
    return p;
  }

  /**
   * Load many assets with bounded concurrency. Reports progress as
   * onProgress({ done, total }). Rejects on the FIRST failure (other loads
   * keep their results in cache). Pass an AbortSignal to cancel the rest.
   */
  async loadAll(keys, opts = {}) {
    const list = [...keys];
    const total = list.length;
    let done = 0;
    const results = new Array(total);
    const report = () => {
      if (typeof opts.onProgress === "function") {
        try {
          opts.onProgress({ done, total });
        } catch {
          /* progress must not break loading */
        }
      }
    };
    report();
    let cursor = 0;
    let firstError = null;
    const worker = async () => {
      while (cursor < list.length) {
        if (opts.signal?.aborted) throw new AssetError("aborted", list[cursor] ?? "?", "", "loadAll aborted");
        if (firstError) return;
        const i = cursor++;
        const key = list[i];
        try {
          results[i] = await this.load(key, { signal: opts.signal });
        } catch (err) {
          firstError = err;
          return;
        }
        done += 1;
        report();
      }
    };
    const n = Math.min(this.concurrency, Math.max(1, total));
    await Promise.all(Array.from({ length: n }, worker));
    if (opts.signal?.aborted) throw new AssetError("aborted", "loadAll", "", "aborted");
    if (firstError) throw firstError;
    return results;
  }

  async _loadOne(key, def, signal) {
    const fetchImpl = this.fetchImpl ?? defaultFetch();
    const useFallback = (err) => {
      if (def.fallback !== undefined) return { value: def.fallback, fallbackUsed: true, key };
      throw err;
    };
    try {
      switch (def.kind) {
        case "text": {
          const res = await this._fetch(fetchImpl, def.url, signal);
          return { value: await res.text(), fallbackUsed: false, key };
        }
        case "json": {
          const res = await this._fetch(fetchImpl, def.url, signal);
          const text = await res.text();
          try {
            return { value: JSON.parse(text), fallbackUsed: false, key };
          } catch (err) {
            throw new AssetError("decode", key, def.url, `invalid JSON: ${err.message}`);
          }
        }
        case "image": {
          if (!this.decodeImage) throw new Error(`No decodeImage adapter for ${key}; pass opts.decodeImage`);
          return { value: await this.decodeImage(def.url, signal), fallbackUsed: false, key };
        }
        case "audio": {
          if (!this.decodeAudio) {
            // Bundled audio over fetch + raw bytes; decoding happens in AudioMixer.
            const res = await this._fetch(fetchImpl, def.url, signal);
            return { value: await res.arrayBuffer(), fallbackUsed: false, key };
          }
          return { value: await this.decodeAudio(def.url, signal), fallbackUsed: false, key };
        }
        default:
          throw new AssetError("unknown-kind", key, def.url);
      }
    } catch (err) {
      if (err instanceof AssetError && (err.code === "aborted" || err.code === "timeout")) {
        // Abort/timeout may still use a declared fallback.
        if (def.fallback !== undefined) return { value: def.fallback, fallbackUsed: true, key };
        throw err;
      }
      if (err instanceof AssetError) return useFallback(err);
      // Adapter threw a raw error (e.g. decode failure): wrap as decode.
      return useFallback(new AssetError("decode", key, def.url, err?.message ?? String(err)));
    }
  }

  async _fetch(fetchImpl, url, signal) {
    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    if (signal) {
      if (signal.aborted) throw new AssetError("aborted", url, url, "already aborted");
      signal.addEventListener("abort", onAbort, { once: true });
    }
    let timer = null;
    if (this.timeoutMs > 0) {
      timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    }
    let res;
    try {
      res = await fetchImpl(url, { signal: ctrl.signal });
    } catch (err) {
      if (ctrl.signal.aborted && !(signal?.aborted)) {
        throw new AssetError("timeout", url, url, `exceeded ${this.timeoutMs}ms`);
      }
      if (signal?.aborted || ctrl.signal.aborted) throw new AssetError("aborted", url, url, "aborted");
      throw new AssetError("network", url, url, err?.message ?? String(err));
    } finally {
      if (timer) clearTimeout(timer);
      signal?.removeEventListener?.("abort", onAbort);
    }
    if (!res || typeof res.ok !== "boolean") throw new AssetError("network", url, url, "bad response");
    if (!res.ok) {
      if (res.status === 404) throw new AssetError("missing", url, url, "HTTP 404");
      throw new AssetError("network", url, url, `HTTP ${res.status}`);
    }
    return res;
  }
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new AssetError("aborted", "sleep", "", "aborted"));
    const id = setTimeout(() => {
      signal?.removeEventListener?.("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(id);
      reject(new AssetError("aborted", "sleep", "", "aborted"));
    };
    signal?.addEventListener?.("abort", onAbort, { once: true });
  });
}
