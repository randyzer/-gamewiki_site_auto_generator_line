import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { inventory } from './workflow.mjs';
import { validateIntakeCard } from '../../src/intake-card.mjs';
import { STAGE, stageName } from '../../src/stages.mjs';
import { failureDiagnostic, diagnosticSummary } from '../../src/diagnostics.mjs';

const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code !== 'ESRCH'; } };
const INPUT_KEYS = new Set(['gameIdentity', 'gameMetadata', 'objective', 'projectPath', 'paths', 'rawKeywordsFile', 'canonicalRequired', 'canonicalOrigin', 'uiMode', 'uiApproval', 'siteRevision', 'domain', 'repo', 'branch', 'dns', 'deploymentPlanAuthorized', 'adsEnabled', 'adCode', 'adApproval', 'liveUrl']);
function inputObject(value) {
  if (value?.schemaVersion === 1) return validateIntakeCard(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Inputs must be a JSON object');
  if (Object.keys(value).some(k => !INPUT_KEYS.has(k))) throw Error('Unknown input field');
  const scan = object => {
    if (!object || typeof object !== 'object') return;
    for (const [key, child] of Object.entries(object)) {
      if (/password|secret|token|cookie|private.?key|api.?key/i.test(key)) throw Error('Do not send credentials');
      scan(child);
    }
  };
  scan(value); return value;
}

export class Store {
  constructor(file) {
    mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file); this.queues = new Set();
    this.db.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL');
    this.db.exec("CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,message_id TEXT UNIQUE NOT NULL,owner TEXT NOT NULL,chat_id TEXT NOT NULL,request TEXT NOT NULL,status TEXT NOT NULL,result TEXT NOT NULL,created_at TEXT NOT NULL)");
    const cols = new Set(this.db.prepare('PRAGMA table_info(jobs)').all().map(x => x.name));
    for (const [name, definition] of Object.entries({ waiting_since: 'TEXT', reminded: 'INTEGER NOT NULL DEFAULT 0', inputs: "TEXT NOT NULL DEFAULT '{}'", retry: 'INTEGER NOT NULL DEFAULT 0', pause_requested: 'INTEGER NOT NULL DEFAULT 0', version: 'INTEGER NOT NULL DEFAULT 0' })) {
      if (!cols.has(name)) this.db.exec(`ALTER TABLE jobs ADD COLUMN ${name} ${definition}`);
    }
    this.db.exec(`CREATE TABLE IF NOT EXISTS queue_lease(id INTEGER PRIMARY KEY CHECK(id=1),pid INTEGER NOT NULL,owner TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,owner TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY,task_id TEXT NOT NULL,text TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,sent INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS replies(message_id TEXT PRIMARY KEY,owner TEXT NOT NULL,text TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL DEFAULT 0,delivery_state TEXT NOT NULL DEFAULT 'PENDING');
      CREATE TABLE IF NOT EXISTS approvals(id TEXT PRIMARY KEY,task_id TEXT NOT NULL,owner TEXT NOT NULL,stage INTEGER NOT NULL,digest TEXT NOT NULL,scope TEXT NOT NULL,expires_at INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0);`);
    const lease = this.db.prepare('SELECT * FROM queue_lease WHERE id=1').get();
    if (!lease || !alive(lease.pid)) this.db.exec("UPDATE jobs SET status='failed',retry=0,result='Interrupted; manual review before retry' WHERE status='running'");
  }
  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  acquireLease(owner) {
    this.transaction(() => {
      const lease = this.db.prepare('SELECT * FROM queue_lease WHERE id=1').get();
      if (lease && alive(lease.pid)) throw Error('Another queue is already running');
      this.db.prepare('INSERT OR REPLACE INTO queue_lease VALUES(1,?,?)').run(process.pid, owner);
    });
  }
  create({ messageId, owner, chatId, text, inputs = {} }) {
    inputObject(inputs);
    this.db.prepare("INSERT OR IGNORE INTO jobs(id,message_id,owner,chat_id,request,status,result,created_at,inputs) VALUES(?,?,?,?,?,'queued','',?,?)")
      .run(randomUUID(), messageId, owner, chatId, text, new Date().toISOString(), JSON.stringify(inputs));
    return this.db.prepare('SELECT * FROM jobs WHERE message_id=? AND owner=?').get(messageId, owner);
  }
  get(id, owner) { return this.db.prepare('SELECT * FROM jobs WHERE id=? AND owner=?').get(id, owner); }
  list(owner) { return this.db.prepare('SELECT id,status,substr(request,1,80) AS request FROM jobs WHERE owner=? ORDER BY created_at DESC LIMIT 8').all(owner); }
  queued() { return this.db.prepare("SELECT * FROM jobs WHERE status='queued' ORDER BY created_at,id").all(); }
  update(id, status, result = '') {
    this.db.prepare('UPDATE jobs SET status=?,result=?,waiting_since=?,reminded=0,version=version+1 WHERE id=?')
      .run(status, result, status === 'waiting_input' ? new Date().toISOString() : null, id);
  }
  resume(id, owner, extra) {
    const task = this.get(id, owner);
    if (!task || !['waiting_input', 'paused', 'failed', 'blocked', 'partial'].includes(task.status)) return null;
    let inputs = JSON.parse(task.inputs);
    if (extra && typeof extra === 'object') inputs = inputs.schemaVersion === 1
      ? validateIntakeCard({ ...inputs, ...extra }) : { ...inputs, ...inputObject(extra) };
    if (extra && typeof extra === 'object' && Object.keys(extra).length) delete inputs.deploymentPlanApproval;
    this.db.prepare("UPDATE jobs SET request=request||?,inputs=?,status='queued',retry=?,pause_requested=0,waiting_since=NULL,reminded=0 WHERE id=? AND owner=?")
      .run(typeof extra === 'string' ? '\n用户补充：' + extra : '', JSON.stringify(inputs), ['failed', 'blocked', 'partial'].includes(task.status) ? 1 : 0, id, owner);
    return this.get(id, owner);
  }
  dueReminders(cutoff) { return this.db.prepare("SELECT * FROM jobs WHERE status='waiting_input' AND reminded=0 AND waiting_since<=?").all(cutoff); }
  markReminded(id) { this.db.prepare("UPDATE jobs SET reminded=1 WHERE id=? AND status='waiting_input'").run(id); }
  enqueue(id, taskId, text) { this.db.prepare('INSERT OR IGNORE INTO outbox(id,task_id,text) VALUES(?,?,?)').run(id, taskId, text); }
  recordReply(messageId, owner, text) { this.db.prepare('INSERT OR IGNORE INTO replies(message_id,owner,text) VALUES(?,?,?)').run(messageId, owner, text); }
  close() { for (const queue of this.queues) queue.close(); this.db.close(); }
}

export function parseEvent(event, allowed) {
  const m = event?.message, owner = event?.sender?.sender_id?.open_id;
  if (!owner || !allowed.has(owner) || m?.chat_type !== 'p2p' || m?.message_type !== 'text' || !m?.message_id || !m?.chat_id) return null;
  try {
    const text = JSON.parse(m.content).text;
    return typeof text === 'string' && text.trim() && text.length <= 20000 ? { messageId: m.message_id, owner, chatId: m.chat_id, text: text.trim() } : null;
  } catch { return null; }
}

export class Queue {
  constructor(store, executor, notify, { autoStart = true, reply } = {}) {
    this.store = store; this.executor = executor; this.notify = notify;
    this.items = []; this.running = false; this.closed = false; this.reminderBusy = false; this.outboxBusy = false;
    this.reply = reply; this.replyBusy = false;
    this.lease = randomUUID(); store.acquireLease(this.lease); store.queues.add(this);
    this.reminderTimer = setInterval(() => { void this.remind(); void this.flushOutbox(); void this.flushReplies(); }, 15000);
    this.reminderTimer.unref?.();
    if (autoStart) queueMicrotask(() => { if (!this.closed) for (const task of store.queued()) this.add(task); });
    void this.remind();
    void this.flushReplies();
  }
  close() {
    this.closed = true; clearInterval(this.reminderTimer);
    this.store.db.prepare('DELETE FROM queue_lease WHERE owner=?').run(this.lease);
    this.store.queues.delete(this);
  }
  add(task) { if (!task || this.closed) return; if (!this.items.some(t => t.id === task.id)) this.items.push(task); void this.drain(); }
  cancel(id, owner) {
    const task = this.store.get(id, owner);
    if (!task) return 'Task not found';
    if (task.status === 'running') return 'Pause running task first; cancellation is allowed at a stage boundary';
    if (task.status === 'succeeded') return 'Completed task cannot be cancelled';
    this.store.update(id, 'cancelled'); this.items = this.items.filter(t => t.id !== id); return 'Cancelled ' + id;
  }
  pause(id, owner) {
    const task = this.store.get(id, owner); if (!task) return 'Task not found';
    if (['succeeded', 'cancelled'].includes(task.status)) return 'Task is terminal';
    this.store.db.prepare('UPDATE jobs SET pause_requested=1 WHERE id=?').run(id);
    if (task.status !== 'running') this.store.update(id, 'paused', task.result);
    return 'Pause requested; current stage completes before stopping ' + id;
  }
  async flushOutbox() {
    if (this.closed || this.outboxBusy) return; this.outboxBusy = true;
    try {
      for (const item of this.store.db.prepare('SELECT * FROM outbox WHERE sent=0 AND attempts<3 AND next_at<=? ORDER BY rowid').all(Date.now())) {
        if (this.closed) break;
        const task = this.store.db.prepare('SELECT * FROM jobs WHERE id=?').get(item.task_id);
        this.store.db.prepare('UPDATE outbox SET attempts=attempts+1,next_at=? WHERE id=?').run(Date.now() + 30000, item.id);
        try {
          await this.notify(task, item.text);
          if (!this.closed) this.store.db.prepare('UPDATE outbox SET sent=1 WHERE id=?').run(item.id);
        } catch { /* Durable bounded retry; execution is never repeated for delivery failures. */ }
      }
    } finally { this.outboxBusy = false; }
  }
  async flushReplies() {
    if (this.closed || this.replyBusy || !this.reply) return;
    this.replyBusy = true;
    try {
      for (const item of this.store.db.prepare("SELECT * FROM replies WHERE delivery_state='PENDING' AND attempts<3 AND next_at<=? ORDER BY rowid").all(Date.now())) {
        if (this.closed) break;
        this.store.db.prepare('UPDATE replies SET attempts=attempts+1,next_at=? WHERE message_id=?').run(Date.now() + 30000, item.message_id);
        try {
          await this.reply(item.message_id, item.text);
          if (!this.closed) this.store.db.prepare("UPDATE replies SET delivery_state='SENT' WHERE message_id=?").run(item.message_id);
        } catch {
          if (!this.closed) this.store.db.prepare("UPDATE replies SET delivery_state=CASE WHEN attempts>=3 THEN 'FAILED' ELSE 'PENDING' END WHERE message_id=?").run(item.message_id);
        }
      }
    } finally { this.replyBusy = false; }
  }
  async remind() {
    if (this.closed || this.reminderBusy) return; this.reminderBusy = true;
    try {
      for (const task of this.store.dueReminders(new Date(Date.now() - 600000).toISOString())) {
        let data = {}; try { data = JSON.parse(task.result); } catch {}
        this.store.transaction(() => {
          this.store.enqueue(`reminder:${task.id}:${task.waiting_since}`, task.id, '⏰ 任务 ' + task.id + ' 仍在等待输入：\n' + (data.missing_inputs || []).join('\n'));
          this.store.markReminded(task.id);
        });
      }
      await this.flushOutbox();
    } finally { this.reminderBusy = false; }
  }
  async drain() {
    if (this.running || this.closed) return; this.running = true;
    try {
      while (this.items.length && !this.closed) {
        const queued = this.items.shift(); const task = this.store.get(queued.id, queued.owner);
        if (task?.status !== 'queued') continue;
        const claimed = this.store.db.prepare("UPDATE jobs SET status='running' WHERE id=? AND status='queued'").run(task.id);
        if (claimed.changes !== 1) continue;
        let output, status;
        try {
          output = await this.executor(task, { shouldPause: () => this.closed || Boolean(this.store.get(task.id, task.owner)?.pause_requested) });
          const mapping = { PASSED: 'succeeded', WAITING_FOR_USER: 'waiting_input', BLOCKED: 'blocked', PARTIAL: 'partial', FAILED: 'failed', PAUSED: 'paused' };
          status = typeof output === 'string' ? 'succeeded' : mapping[output?.status];
          if (!status) throw Error('Invalid executor result');
        } catch (error) {
          const diagnostic = failureDiagnostic(error);
          status = 'failed'; output = { status: 'FAILED', summary: diagnosticSummary(diagnostic), diagnostic, missing_inputs: [], artifact_paths: [] };
        }
        if (this.closed) break;
        if (this.store.get(task.id, task.owner).pause_requested) status = 'paused';
        const serialized = typeof output === 'string' ? output : JSON.stringify(output);
        this.store.transaction(() => {
          this.store.update(task.id, status, serialized);
          this.store.db.prepare('UPDATE jobs SET retry=0 WHERE id=?').run(task.id);
          const updated = this.store.get(task.id, task.owner);
          if (output?.plan_digest && status === 'waiting_input') {
            this.store.db.prepare('UPDATE approvals SET used=1 WHERE task_id=?').run(task.id);
            this.store.db.prepare('INSERT INTO approvals VALUES(?,?,?,?,?,?,?,0)')
              .run(randomUUID(), task.id, task.owner, STAGE.DEPLOYMENT_PLAN, output.plan_digest, 'acknowledge-plan-only', Date.now() + 86400000);
          }
          this.store.enqueue(`result:${task.id}:${updated.version}`, task.id, `${status === 'succeeded' ? '✅' : '⏸'} ${task.id} ${status}\n${serialized.slice(0,2800)}`);
        });
        void this.flushOutbox();
      }
    } finally { this.running = false; }
  }
}

export function handler({ store, queue, reply, allowed }) {
  queue.reply = reply;
  return async event => {
    const m = parseEvent(event, allowed); if (!m) return;
    const { text, owner, messageId } = m;
    let response = '';
    const send = async () => { store.recordReply(messageId, owner, response); await queue.flushReplies(); };
    if (text === '/ping') { response = 'pong'; return send(); }
    if (text === '/help') { response = '/start JSON /tasks /status ID /inputs ID /input ID JSON /pause ID /resume ID [JSON] /approve ID DIGEST /reject ID /cancel ID /skills /ping'; return send(); }
    if (text === '/tasks') { response = JSON.stringify(store.list(owner)); return send(); }
    if (text === '/skills') { try { response = inventory().map(x => x.name + (x.available ? ' [available]' : ' [missing]')).join('\n'); } catch { response = 'Skill inventory unavailable'; } return send(); }
    const match = text.match(/^\/(\S+)\s+(\S+)(?:\s+([\s\S]+))?$/);
    if (match && ['status', 'inputs'].includes(match[1])) {
      const task = store.get(match[2], owner);
      let result = {}; try { result = JSON.parse(task?.result || '{}'); } catch {}
      response = !task ? 'Not found' : JSON.stringify(match[1] === 'inputs' ? { inputs: JSON.parse(task.inputs), missing: result.missing_inputs, checklist: result.inputs } : { id: task.id, status: task.status, result }).slice(0,3500);
      return send();
    }
    let dispatch;
    try {
      store.transaction(() => {
        try {
        if (store.db.prepare('SELECT 1 FROM events WHERE id=?').get(messageId)) { response = 'Duplicate message ignored'; return; }
        store.db.prepare('INSERT INTO events VALUES(?,?)').run(messageId, owner);
        if (text.startsWith('/start ') || !text.startsWith('/')) {
          const raw = text.startsWith('/start ') ? text.slice(7).trim() : text;
          let inputs = {};
          if (text.startsWith('/start ') || raw.startsWith('{')) inputs = inputObject(JSON.parse(raw));
          dispatch = store.create({ ...m, inputs }); response = 'Task ' + dispatch.id + ' status=' + dispatch.status; return;
        }
        if (!match) { response = 'Unknown command; use /help'; return; }
        const [, command, id, extra] = match; const task = store.get(id, owner);
        if (!task) { response = 'Not found'; return; }
        if (command === 'pause') response = queue.pause(id, owner);
        else if (command === 'cancel') response = queue.cancel(id, owner);
        else if (command === 'reject') {
          const result = JSON.parse(task.result || '{}');
          if (!['waiting_input', 'paused'].includes(task.status) || stageName(result.stage) !== STAGE.DEPLOYMENT_PLAN || !result.plan_digest) { response = 'Task is not awaiting plan acknowledgement'; return; }
          store.db.prepare('UPDATE approvals SET used=1 WHERE task_id=?').run(id);
          store.update(id, 'paused', task.result); response = 'Plan rejected; no external actions executed';
        } else if (command === 'approve') {
          if (task.status !== 'waiting_input') throw Error('Task is not awaiting plan acknowledgement');
          const data = JSON.parse(task.result);
          const approval = store.db.prepare('SELECT * FROM approvals WHERE task_id=? AND owner=? AND digest=? AND used=0 AND expires_at>?').get(id, owner, extra || '', Date.now());
          if (!approval || data.plan_digest !== extra || stageName(data.stage) !== STAGE.DEPLOYMENT_PLAN) throw Error('Invalid, expired or consumed plan digest');
          const inputs = { ...JSON.parse(task.inputs), deploymentPlanApproval: { approved: true, digest: extra } };
          store.db.prepare("UPDATE jobs SET inputs=?,status='queued',retry=0,pause_requested=0 WHERE id=?").run(JSON.stringify(inputs), id);
          store.db.prepare('UPDATE approvals SET used=1 WHERE id=?').run(approval.id);
          dispatch = store.get(id, owner); response = 'Acknowledged exact plan only; production actions remain disabled';
        } else if (['input', 'resume'].includes(command)) {
          if (command === 'input' && !extra) throw Error('Use /input ID JSON');
          const patch = extra ? inputObject(JSON.parse(extra)) : {};
          dispatch = store.resume(id, owner, patch);
          response = dispatch ? 'Resumed ' + id : 'Task is not paused or waiting';
          if (dispatch && Object.keys(patch).length) store.db.prepare('UPDATE approvals SET used=1 WHERE task_id=?').run(id);
        } else response = 'Unknown command; use /help';
        } finally {
          // The reply and state change commit together. Delivery never replays this command.
          store.recordReply(messageId, owner, response);
        }
      });
    } catch (error) {
      response = error instanceof SyntaxError ? 'Use a valid JSON object for structured inputs' : 'Command rejected: ' + (['Use /input ID JSON', 'Inputs must be a JSON object', 'Unknown input field', 'Do not send credentials', 'Invalid, expired or consumed plan digest', 'Task is not awaiting plan acknowledgement'].includes(error.message) ? error.message : 'invalid task state or input');
    }
    if (dispatch?.status === 'queued') queue.add(dispatch);
    return send();
  };
}
