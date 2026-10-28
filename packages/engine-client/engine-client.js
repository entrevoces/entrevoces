// Static learning client: bundled knowledge, deterministic core, device-local evidence.
function defaultStorage() {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch { /* sandboxed */ }
  const m = new Map();
  return {
    ephemeral: true,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}
export class MemoryStorage {
  constructor() { this.m = new Map(); this.ephemeral = true; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}

function guardedStorage(primary, onFailure) {
  const backup=new Map(),volatile=new Set();
  return {
    ephemeral:!!primary.ephemeral,
    getItem(k){if(volatile.has(k))return backup.get(k)??null;try{const value=primary.getItem(k);backup.set(k,value);return value;}catch(e){onFailure(e);return backup.get(k)??null;}},
    setItem(k,v){backup.set(k,String(v));try{primary.setItem(k,String(v));volatile.delete(k);}catch(e){volatile.add(k);onFailure(e);}},
    removeItem(k){backup.set(k,null);try{primary.removeItem(k);volatile.delete(k);}catch(e){volatile.add(k);onFailure(e);}},
  };
}

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function resolveLearnerId({ query = "", stored = "", create = true } = {}) {
  const fromQuery = new URLSearchParams(query).get("learner");
  if (fromQuery) return fromQuery;
  if (stored) return stored;
  return create ? uuid() : null;
}

export class EngineClient {
  constructor({learnerId='',domainId='',storage,fallbackDomain=null,fallbackConcepts=[],core=null}={}){
    this.storageWarning=null;
    this.storage=guardedStorage(storage||defaultStorage(),()=>{this.storageWarning='Device storage unavailable or full. Export progress before closing.';});
    this.core=core;this.fallbackDomain=fallbackDomain;this.fallbackConcepts=fallbackConcepts;
    this.learnerId=learnerId||resolveLearnerId({stored:this.storage.getItem('ev:learnerId')||''});
    this.domainId=domainId||fallbackDomain?.domainId||'';
    if(!this.domainId)throw new Error('A bundled domain is required.');
  }
  async init(){this.storage.setItem('ev:learnerId',this.learnerId);return this.status();}
  status(){return{learnerId:this.learnerId,domainId:this.domainId,mode:'local-only',persistence:this.storageWarning||this.storage.ephemeral?'memory-only':'device',storageWarning:this.storageWarning};}
  // ---- local evidence log (append-only) ----
  _logKey(domainId) { return `ev:log:${this.learnerId}:${domainId}`; }
  _readJSON(key, fallback) { try { const v = this.storage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } }
  _writeJSON(key, value) { this.storage.setItem(key, JSON.stringify(value)); }

  localEvidence(domainId = this.domainId) {
    const value = this._readJSON(this._logKey(domainId), []);
    return Array.isArray(value) ? value.filter(e => e && e.learnerId === this.learnerId && e.domainId === domainId && this.fallbackConcepts.some(c=>c.domainId===domainId&&c.conceptId===e.conceptId) && (!this.core?.validateEvidence || this.core.validateEvidence(e).ok)) : [];
  }

  /** Record evidence in the local append-only log after deterministic validation. */
  recordEvidence(partial) {
    const ev = {
      eventId: partial.eventId || uuid(),
      learnerId: this.learnerId,
      domainId: partial.domainId || this.domainId,
      conceptId: partial.conceptId,
      areaId: partial.areaId || null,
      gameId: partial.gameId || "unknown",
      activityType: partial.activityType || "terminology",
      stage: partial.stage ?? 1,
      languageDirection: partial.languageDirection || "en->es",
      ...(partial.responseModality ? {responseModality:partial.responseModality} : {}),
      ...(partial.assessmentMethod ? {assessmentMethod:partial.assessmentMethod} : {}),
      correct: partial.correct ?? (partial.score != null ? partial.score >= 0.6 : false),
      score: partial.score == null ? (partial.correct ? 1 : 0) : partial.score,
      assistance: partial.assistance || [],
      confidence: partial.confidence == null ? 0.85 : partial.confidence,
      ...(partial.fidelity ? { fidelity: partial.fidelity } : {}),
      ...(partial.misconceptionTag ? { misconceptionTag: partial.misconceptionTag } : {}),
      ...(partial.responseSummary ? { responseSummary: String(partial.responseSummary).slice(0, 280) } : {}),
      clientTs: partial.clientTs || Date.now(),
    };
    if (ev.domainId !== this.domainId) throw new Error("Evidence belongs to a different domain.");
    if(!this.core?.validateEvidence)throw new Error("Evidence requires the shared learning core.");
    const gate = this.core.validateEvidence(ev);
    if (gate && !gate.ok) throw new Error(`Invalid evidence: ${gate.errors.map(e => `${e.field}: ${e.message}`).join("; ")}`);
    if (!this.fallbackConcepts.some(c => c.domainId === ev.domainId && c.conceptId === ev.conceptId)) throw new Error("Evidence references a concept outside this game's knowledge snapshot.");
    const concept=this.fallbackConcepts.find(c=>c.conceptId===ev.conceptId&&c.domainId===ev.domainId);
    if(ev.areaId&&!concept.areaIds.includes(ev.areaId))throw new Error("Evidence references an area outside the concept scope.");
    const log = this.localEvidence(ev.domainId);
    const old=log.find((e)=>e.eventId===ev.eventId);
    if(old&&JSON.stringify(old)!==JSON.stringify(ev)){
      // Retries are idempotent. A conflict must not silently overwrite a
      // genuine decision or make a forged answer appear to have been logged.
      const comparable=({clientTs,...rest})=>rest;
      if(JSON.stringify(comparable(old))!==JSON.stringify(comparable(ev)))throw new Error('Conflicting evidence event ID.');
    }
    if(!old) { log.push(ev); this._writeJSON(this._logKey(ev.domainId), log); }
    return ev;
  }


  async listDomains(){return this.fallbackDomain?[this.fallbackDomain]:[];}
  async getDomain(id=this.domainId){return this.fallbackDomain?.domainId===id?this.fallbackDomain:null;}
  async listConcepts(id=this.domainId,areaId=''){return this.fallbackConcepts.filter(c=>c.domainId===id&&(!areaId||c.areaIds.includes(areaId)));}
  async getState(id=this.domainId,concepts=null){
    if(!this.core)throw new Error('Inject engine-core to compute progress.');
    return this.core.computeLearnerState({learnerId:this.learnerId,domainId:id,events:this.localEvidence(id),concepts:concepts||await this.listConcepts(id)});
  }
  async getNext(id=this.domainId,{excludeGameId=null,modeId=null}={}){
    if(!this.core)throw new Error('Inject engine-core to recommend practice.');
    const domain=await this.getDomain(id);if(!domain)throw new Error('Unknown bundled domain.');
    return this.core.recommendNext({domain,concepts:await this.listConcepts(id),learnerState:await this.getState(id),excludeGameId,mode:modeId?this.core.modeById(modeId):null});
  }
  exportLocal(id=this.domainId){return{version:1,learnerId:this.learnerId,domainId:id,evidence:this.localEvidence(id),exportedAt:new Date().toISOString()};}
  importLocal(bundle){
    if(!this.core||bundle?.version!==1||bundle.domainId!==this.domainId||bundle.learnerId!==this.learnerId||!Array.isArray(bundle.evidence)||bundle.evidence.length>100000)throw new Error('Invalid progress bundle or different learner/domain.');
    for(const e of bundle.evidence)if(e.learnerId!==this.learnerId||e.domainId!==this.domainId||!this.fallbackConcepts.some(c=>c.conceptId===e.conceptId&&c.domainId===e.domainId)||!this.core.validateEvidence(e).ok)throw new Error('Invalid evidence in progress bundle; nothing imported.');
    const merged=new Map(this.localEvidence().map(e=>[e.eventId,e]));
    for(const e of bundle.evidence){const old=merged.get(e.eventId);if(old&&JSON.stringify(old)!==JSON.stringify(e))throw new Error('Conflicting duplicate evidence; nothing imported.');merged.set(e.eventId,e);}
    this._writeJSON(this._logKey(this.domainId),[...merged.values()]);return{imported:merged.size};
  }
  resetDomain(id=this.domainId){this.storage.removeItem(this._logKey(id));}
  resetLocal(){this.resetDomain();}
}
