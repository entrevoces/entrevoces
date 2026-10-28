// Seeded RNG (mulberry32): deterministic shuffles/rolls for replays and
// tests. No Math.random inside game logic that must be reproducible.

/** FNV-1a string hash -> uint32 seed. */
export function hashSeed(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export class SeededRng {
  /** @param {number|string} seed numeric seed or string (hashed). */
  constructor(seed = 1) {
    this.setSeed(seed);
  }

  setSeed(seed) {
    this.seedSource = seed;
    this.state = (typeof seed === "string" ? hashSeed(seed) : seed >>> 0) || 0x9e3779b9;
    return this;
  }

  /** Float in [0, 1). */
  next() {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive. */
  int(min, max) {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new RangeError("int(min, max) needs integer min <= max");
    }
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Float in [min, max). */
  float(min = 0, max = 1) {
    if (!(max > min)) throw new RangeError("float needs max > min");
    return min + this.next() * (max - min);
  }

  /** True with probability p. */
  chance(p) {
    if (!(p >= 0 && p <= 1)) throw new RangeError("chance(p) needs 0 <= p <= 1");
    return this.next() < p;
  }

  pick(arr) {
    if (!Array.isArray(arr) || arr.length === 0) throw new TypeError("pick needs a non-empty array");
    return arr[Math.floor(this.next() * arr.length)];
  }

  /** Fisher-Yates; returns a NEW array, input untouched. */
  shuffle(arr) {
    if (!Array.isArray(arr)) throw new TypeError("shuffle needs an array");
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  /** Fork an independent stream from this one. */
  fork(salt = "fork") {
    return new SeededRng((this.next() * 0xffffffff) >>> 0 ^ hashSeed(String(salt)));
  }
}
