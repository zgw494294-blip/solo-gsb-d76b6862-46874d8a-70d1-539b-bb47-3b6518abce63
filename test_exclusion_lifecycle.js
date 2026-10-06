/* 最小 DOM/事件 stub：加载真实 static/app.js，端到端验证可疑感应记录隔离的生命周期。 */
"use strict";
const fs = require("fs");
const path = require("path");

/* ---------------- mini DOM（与导入生命周期测试同款桩：解析 innerHTML、contains、disabled） ---------------- */

class TokenList {
  constructor() { this._s = new Set(); }
  add(...names) { names.forEach((n) => n && this._s.add(n)); }
  remove(n) { this._s.delete(n); }
  contains(n) { return this._s.has(n); }
  [Symbol.iterator]() { return this._s[Symbol.iterator](); }
}

class El {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parent = null;
    this.attrs = {};
    this.classList = new TokenList();
    this.dataset = {};
    this.id = "";
    this.value = "";
    this.files = [];
    this.checked = false;
    this.hidden = false;
    this.disabled = false;
    this._text = "";
    this._html = "";
    this._listeners = new Map();
    this.name = "";
    this.type = "";
  }
  set textContent(v) { this._text = String(v); }
  get textContent() { return this._text; }
  set innerHTML(html) {
    this._html = html;
    this.children = [];
    if (html) parseHtml(html).forEach((n) => this.appendChild(n));
  }
  get innerHTML() { return this._html; }
  appendChild(c) {
    if (c.parent) c.parent._remove(c);
    c.parent = this;
    this.children.push(c);
    return c;
  }
  _remove(c) {
    const i = this.children.indexOf(c);
    if (i >= 0) this.children.splice(i, 1);
  }
  remove() { if (this.parent) { this.parent._remove(this); this.parent = null; } }
  insertAdjacentHTML(_pos, html) { parseHtml(html).forEach((n) => this.appendChild(n)); }
  contains(node) { return node === this || this._descendants().includes(node); }
  addEventListener(type, fn) {
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type).push(fn);
  }
  dispatchEvent(evt) {
    let node = this;
    if (!evt.target) evt.target = this;
    if (!evt.preventDefault) evt.preventDefault = () => {};
    while (node) {
      const fns = node._listeners.get(evt.type) || [];
      for (const fn of fns) fn.call(node, evt);
      node = node.parent;
    }
  }
  _descendants(out = []) {
    for (const c of this.children) { out.push(c); c._descendants(out); }
    return out;
  }
  matches(sel) {
    let s = sel.trim();
    const checked = s.endsWith(":checked");
    if (checked) s = s.slice(0, -":checked".length);
    let m = s.match(/^([\w-]+)?(?:\[([\w-]+)(?:=["']?([^"'\]]*)["']?)?\])?$/);
    if (s.startsWith(".") || s.startsWith("#")) m = null;
    if (s.startsWith(".")) {
      if (checked && !this.checked) return false;
      return this.classList.contains(s.slice(1));
    }
    if (s.startsWith("#")) return this.id === s.slice(1);
    if (!m) return false;
    const [, tag, attr, val] = m;
    if (tag && this.tagName !== tag.toUpperCase()) return false;
    if (attr) {
      const actual = attr === "class" ? [...this.classList].join(" ") : this.attrs[attr] ?? this[attr];
      if (val !== undefined && String(actual) !== val) return false;
      if (val === undefined && actual === undefined) return false;
    }
    if (checked && !this.checked) return false;
    return true;
  }
  querySelector(sel) { return this._descendants().find((n) => n.matches(sel)); }
  querySelectorAll(sel) { return this._descendants().filter((n) => n.matches(sel)); }
  closest(sel) {
    let n = this;
    while (n) { if (n.matches(sel)) return n; n = n.parent; }
    return null;
  }
}

const VOID_TAGS = new Set(["input", "br", "img", "hr", "meta", "link"]);

function parseHtml(html) {
  const root = new El("#root");
  const stack = [root];
  const tokenRe = /<\/?[a-zA-Z][\w-]*(?:[^<>]*?)\/?>|[^<]+/g;
  let tok;
  while ((tok = tokenRe.exec(html))) {
    const t = tok[0];
    if (t[0] !== "<") continue;
    const closing = t[1] === "/";
    const selfClose = t.endsWith("/>");
    const nameM = t.match(/^<\/?([\w-]+)/);
    const tag = nameM[1].toLowerCase();
    if (closing) { stack.pop(); continue; }
    const el = new El(tag);
    const attrRe = /([\w:-]+)(?:\s*=\s*"([^"]*)")?/g;
    const raw = t.replace(/^<\/?[\w-]+/, "").replace(/\/?>$/, "");
    let am;
    while ((am = attrRe.exec(raw))) {
      const [, k, v] = am;
      if (!k || k === "/") continue;
      if (v === undefined) { el.attrs[k] = true; continue; }
      el.attrs[k] = v;
      if (k === "class") v.split(/\s+/).forEach((c) => c && el.classList.add(c));
      else if (k === "id") el.id = v;
      else if (k.startsWith("data")) {
        const dk = k.slice(5);
        el.dataset[dk] = v;
        el.dataset[dk.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
      }
      else if (k === "value") el.value = v;
      else if (k === "checked") el.checked = true;
      else if (k === "hidden") el.hidden = true;
      else if (k === "disabled") el.disabled = true;
      else if (k === "name") el.name = v;
      else if (k === "type") el.type = v;
    }
    stack[stack.length - 1].appendChild(el);
    if (!selfClose && !VOID_TAGS.has(tag)) stack.push(el);
  }
  return root.children.slice();
}

/* ---------------- document stub ---------------- */

const byId = new Map();
function mk(id, tag = "div") { const e = new El(tag); e.id = id; byId.set(id, e); return e; }

const form = mk("judge-form", "form");
const runnerRows = mk("runner-rows");
const recordRows = mk("record-rows");
const addRunner = mk("add-runner", "button");
const addRecord = mk("add-record", "button");
mk("record-count", "span");
mk("error-box"); mk("pending-hint");
const results = mk("results");
mk("diagnosis-box").hidden = true;
mk("missing-box").hidden = true;
for (const id of ["smMin", "smMax", "mfMin", "mfMax"]) mk(id, "input");
mk("sample-btn", "button");
mk("clear-btn", "button");

// 导入控件（用于验证隔离切换会立即使导入预览失效）
const fileInput = mk("import-file", "input");
fileInput.type = "file";
Object.defineProperty(fileInput, "value", {
  get() { return this._value || ""; },
  set(v) { this._value = String(v); if (v === "") this.files = []; },
});
const previewBtn = mk("import-preview-btn", "button");
previewBtn.disabled = true;
mk("import-file-name", "span").textContent = "未选择文件";
const importBox = mk("import-box");
importBox.hidden = true;

for (const id of ["smMin", "smMax", "mfMin", "mfMax"]) form.appendChild(byId.get(id));
form.appendChild(runnerRows);
form.appendChild(recordRows);
form.appendChild(fileInput);

global.document = { getElementById: (id) => byId.get(id) };

/* ---------------- FormData stub ---------------- */

global.FormData = class FormData {
  constructor() { this._fields = new Map(); }
  set(k, v) { this._fields.set(k, v); }
  get(k) { return this._fields.get(k); }
};

/* ---------------- fetch stub：按请求体的 excludedIds 模拟三端点 ---------------- */

const calls = { adjudicate: [], diagnose: [], missing: [], import: [] };
const server = { mode: "valid", hold: null, rawAdj: null };

function normId(v) { return String(v).trim(); }

function lapJson(s, m, f, st, mt, ft) {
  return {
    start: { id: s, time: st }, middle: { id: m, time: mt }, finish: { id: f, time: ft },
    smTime: mt - st, mfTime: ft - mt, totalTime: ft - st,
  };
}

// 与真实裁决同形的简化模拟：只实现测试数据布置（a1/b1/c1 第一趟；
// 第二趟 a2/x2 同秒，ID 决胜选 a2；隔离后只用未隔离记录）。
function computeAdj(body) {
  const excluded = new Set((body.excludedIds || []).map(normId));
  const rows = body.records
    .filter((r) => normId(r.id) !== "")
    .map((r) => ({ id: normId(r.id), gate: r.gate, time: Number(r.time) }));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const activeId = (id) => byId.has(id) && !excluded.has(id);
  const laps = [];
  const used = new Set();
  if (["a1", "b1", "c1"].every(activeId)) {
    laps.push(lapJson("a1", "b1", "c1", 0, 12, 25));
    ["a1", "b1", "c1"].forEach((x) => used.add(x));
  }
  const start2 = activeId("a2") ? "a2" : activeId("x2") ? "x2" : null;
  if (start2 && activeId("b2") && activeId("c2")) {
    laps.push(lapJson(start2, "b2", "c2", 30, 45, 57));
    [start2, "b2", "c2"].forEach((x) => used.add(x));
  }
  const unused = rows
    .filter((r) => !excluded.has(r.id) && !used.has(r.id))
    .map((r) => ({ id: r.id, gate: r.gate, time: r.time }));
  const excludedOut = rows
    .filter((r) => excluded.has(r.id))
    .map((r) => ({ id: r.id, gate: r.gate, time: r.time }));
  return {
    runners: [{
      runner: 101,
      lapCount: laps.length,
      totalTime: laps.reduce((n, l) => n + l.totalTime, 0),
      laps,
      unused,
      excluded: excludedOut,
    }],
  };
}

function computeDiag(body) {
  const res = computeAdj(body).runners[0];
  return {
    runners: [{
      runner: 101,
      lapCount: res.lapCount,
      totalTime: res.totalTime,
      diagnoses: res.unused.map((u) => ({
        id: u.id, gate: u.gate, time: u.time, classification: "unusable",
      })),
    }],
  };
}

function computeMissing(body) {
  const res = computeAdj(body).runners[0];
  return { runners: [{ runner: 101, lapCount: res.lapCount, windows: [] }] };
}

global.fetch = async (url, opts) => {
  const respond = (data, ok = true, status = 200) => ({
    ok,
    status,
    json: async () => (typeof data === "string" ? JSON.parse(data) : data),
    text: async () => (typeof data === "string" ? data : JSON.stringify(data)),
  });
  if (url === "/api/adjudicate") {
    const body = JSON.parse(opts.body);
    calls.adjudicate.push(body);
    if (server.mode === "invalid") return respond({ ok: false, error: "模拟非法输入" }, false, 422);
    if (server.mode === "hold") return respond(await server.hold, true, 200);
    if (server.rawAdj !== null) return respond(server.rawAdj, true, 200);
    return respond({ ok: true, result: computeAdj(body) }, true, 200);
  }
  if (url === "/api/diagnose") {
    const body = JSON.parse(opts.body);
    calls.diagnose.push(body);
    return respond({ ok: true, result: computeDiag(body) }, true, 200);
  }
  if (url === "/api/missing") {
    const body = JSON.parse(opts.body);
    calls.missing.push(body);
    return respond({ ok: true, result: computeMissing(body) }, true, 200);
  }
  if (url.startsWith("/api/import/")) {
    calls.import.push(url);
    return respond({
      ok: true,
      result: { added: [], duplicates: [], existingCount: 0, mergedCount: 0 },
    }, true, 200);
  }
  throw new Error(`unexpected url ${url}`);
};

/* ---------------- 加载真实 app.js ---------------- */

new Function(fs.readFileSync(path.join(__dirname, "static", "app.js"), "utf8"))();

/* ---------------- 测试辅助 ---------------- */

let failures = 0;
function assert(cond, msg) {
  if (cond) { console.log("  ✓", msg); }
  else { failures++; console.error("  ✗", msg); }
}
const tick = () => new Promise((r) => setTimeout(r, 0));
const $ = (id) => byId.get(id);
function setVal(id, v) { $(id).value = v; }
function fire(el, type) { el.dispatchEvent({ type, preventDefault() {}, target: el }); }
async function flush(n = 6) { for (let i = 0; i < n; i++) await tick(); }
async function adjudicate() { fire(form, "submit"); await flush(); }
const rendered = () => results.innerHTML;

const SEVEN = [
  ["a1", "101", "S", "0"], ["b1", "101", "M", "12"], ["c1", "101", "F", "25"],
  ["a2", "101", "S", "30"], ["x2", "101", "S", "30"],
  ["b2", "101", "M", "45"], ["c2", "101", "F", "57"],
];

function fillRow(row, [id, runner, gate, time]) {
  row.querySelector(".rec-id").value = id;
  row.querySelector(".rec-runner").value = runner;
  row.querySelector(".rec-gate").value = gate;
  row.querySelector(".rec-time").value = time;
}

function findRow(id) {
  return recordRows.querySelectorAll(".record-row").find(
    (r) => r.querySelector(".rec-id").value.trim() === id
  );
}
function rowCount() { return recordRows.querySelectorAll(".record-row").length; }
function toggleOf(id) { return findRow(id).querySelector(".exclude-toggle"); }
function clickToggle(id) { fire(toggleOf(id), "click"); }
async function setupSeven() {
  setVal("smMin", "10"); setVal("smMax", "60"); setVal("mfMin", "10"); setVal("mfMax", "60");
  runnerRows.querySelector(".runner-number").value = "101";
  while (rowCount() < 7) fire(addRecord, "click");
  const rows = recordRows.querySelectorAll(".record-row");
  SEVEN.forEach((spec, i) => fillRow(rows[i], spec));
  fire(recordRows, "input"); // 与真实录入一致：输入事件驱动隔离开关刷新
  await adjudicate();
}

function saveReviewUi(keyIndex, status, note) {
  const box = results.querySelectorAll(".review-box")
    .find((b) => b.dataset.keyIndex === String(keyIndex));
  for (const r of box.querySelectorAll('input[type="radio"]')) r.checked = r.value === status;
  box.querySelector(".review-note").value = note;
  fire(box.querySelector(".review-save"), "click");
}

async function main() {
  console.log("场景0：初始空行——隔离按钮存在但禁用");
  const initialRow = recordRows.querySelectorAll(".record-row")[0];
  const initialBtn = initialRow.querySelector(".exclude-toggle");
  assert(initialBtn, "每行渲染隔离开关");
  assert(initialBtn.disabled && initialBtn._text === "隔离", "空行开关禁用、文案为“隔离”");

  console.log("场景1：填入 7 条记录并裁决后，每行开关可用");
  await setupSeven();
  assert(rendered().includes("a2"), "前置：两趟裁决已渲染");
  for (const id of ["a1", "a2", "x2"]) {
    const btn = toggleOf(id);
    assert(!btn.disabled && btn._text === "隔离", `${id} 行开关可用、文案“隔离”`);
    assert(!findRow(id).classList.contains("row-excluded"), `${id} 行初始未隔离`);
  }

  console.log("场景2：点击隔离——立即重裁，请求只在 excludedIds 携带该 ID，完整原表照发");
  calls.adjudicate.length = 0;
  clickToggle("a2");
  await flush();
  assert(calls.adjudicate.length === 1, "切换后立即裁决一次（无防抖等待）");
  const body2 = calls.adjudicate[0];
  assert(body2.records.length === 7, "完整原表 7 条仍全部发送");
  assert(JSON.stringify(body2.excludedIds) === JSON.stringify(["a2"]), "excludedIds 为 [a2]");
  assert(toggleOf("a2")._text === "重新纳入", "按钮文案变为“重新纳入”");
  assert(toggleOf("x2")._text === "隔离", "其他行开关不变");
  assert(findRow("a2").classList.contains("row-excluded"), "隔离行有 row-excluded 标记");
  // 模拟服务按未隔离记录裁决：第二趟起点改用 x2；a2 单列隔离区。
  assert(/第 2 趟[\s\S]*x2/.test(rendered()), "第二趟改用 x2");
  assert(rendered().includes("隔离记录"), "结果区分列“隔离记录”区");
  const pIso = rendered().indexOf("隔离记录");
  const pUnused = rendered().indexOf("未采纳记录");
  assert(rendered().slice(pIso).includes("· a2 ·"), "隔离区列出 a2");
  assert(!rendered().slice(pUnused, pIso).includes("· a2 ·"),
    "a2 不出现在普通未采纳记录列");

  console.log("场景3：切换立即清除旧诊断与漏读窗口，且后续请求携带同一 excludedIds");
  globalThis.__runDiagnosisForTest();
  await flush();
  assert(calls.diagnose.length === 1, "发起诊断");
  let dbody = calls.diagnose[0];
  assert(JSON.stringify(dbody.excludedIds) === JSON.stringify(["a2"]), "诊断请求携带 [a2]");
  const diagIds = dbody && [];
  void diagIds;
  // 服务模拟：诊断对象不包含隔离记录 a2。
  assert(!$("diagnosis-box").innerHTML.includes(">a2<"), "诊断卡不展示隔离记录 a2");
  globalThis.__runMissingForTest();
  await flush();
  assert(calls.missing.length === 1 &&
    JSON.stringify(calls.missing[0].excludedIds) === JSON.stringify(["a2"]),
    "漏读请求同样携带 [a2]");
  // 再次切换（重新纳入）会立即清除诊断与漏读。
  clickToggle("a2");
  await flush();
  assert(globalThis.__getDiagnosisStateForTest().status === "idle"
    && !$("diagnosis-box").innerHTML.includes("无法成趟"),
    "重新纳入瞬间旧诊断被清除");
  assert(globalThis.__getMissingStateForTest().status === "idle", "旧漏读窗口被清除");
  assert(JSON.stringify(calls.adjudicate[calls.adjudicate.length - 1].excludedIds) === "[]",
    "重新纳入后的裁决 excludedIds 为空");
  assert(/第 2 趟[\s\S]*a2/.test(rendered()), "第二趟恢复使用 a2");
  assert(!rendered().includes("隔离记录"), "无隔离记录时不显示隔离区");

  console.log("场景4：任一绑定值改变即解除隔离，改回不恢复；前导零等值不算改变");
  clickToggle("a2");
  await flush();
  assert(globalThis.__excludedForTest.size === 1, "前置：a2 已隔离");
  // 编号与秒数改成前导零等值写法：按整数等值比较，隔离保留。
  const a2row = findRow("a2");
  a2row.querySelector(".rec-runner").value = "0101";
  fire(a2row.querySelector(".rec-runner"), "input");
  a2row.querySelector(".rec-time").value = "030";
  fire(a2row.querySelector(".rec-time"), "change");
  await flush();
  assert(globalThis.__excludedForTest.size === 1 && toggleOf("a2")._text === "重新纳入",
    "编号 0101、秒数 030 为等值写法：隔离保留");
  assert(JSON.stringify(calls.adjudicate[calls.adjudicate.length - 1].excludedIds) === JSON.stringify(["a2"]),
    "等值写法下自动重裁仍携带 a2");
  // 秒数真实改变：立即解除。
  a2row.querySelector(".rec-time").value = "31";
  fire(a2row.querySelector(".rec-time"), "input");
  assert(globalThis.__excludedForTest.size === 0, "绑定秒数 30→31：隔离此刻解除");
  assert(toggleOf("a2")._text === "隔离" && !a2row.classList.contains("row-excluded"),
    "开关与行样式恢复未隔离");
  // 改回原值：不恢复。
  a2row.querySelector(".rec-time").value = "30";
  fire(a2row.querySelector(".rec-time"), "input");
  await flush();
  assert(globalThis.__excludedForTest.size === 0, "秒数改回 30：隔离不恢复");
  assert(toggleOf("a2")._text === "隔离", "开关仍为“隔离”");
  // 改门同样解除。
  clickToggle("a2");
  await flush();
  a2row.querySelector(".rec-gate").value = "M";
  fire(a2row.querySelector(".rec-gate"), "change");
  assert(globalThis.__excludedForTest.size === 0, "绑定门 S→M：隔离立即解除");
  a2row.querySelector(".rec-gate").value = "S";
  fire(a2row.querySelector(".rec-gate"), "change");
  await flush();
  assert(globalThis.__excludedForTest.size === 0, "门改回 S：隔离不恢复");
  // 改 ID 也解除（旧 ID 行消失，新身份未隔离）。
  clickToggle("a2");
  await flush();
  a2row.querySelector(".rec-id").value = "a2x";
  fire(a2row.querySelector(".rec-id"), "input");
  assert(globalThis.__excludedForTest.size === 0, "ID 改变：隔离立即解除");
  a2row.querySelector(".rec-id").value = "a2";
  fire(a2row.querySelector(".rec-id"), "input");
  await flush();
  assert(globalThis.__excludedForTest.size === 0, "ID 改回：隔离不恢复");

  console.log("场景5：重排与无关编辑保留隔离");
  clickToggle("a2");
  await flush();
  const rowA2 = findRow("a2");
  recordRows.appendChild(rowA2); // 重排到末尾
  fire(rowA2.querySelector(".rec-id"), "input");
  assert(globalThis.__excludedForTest.size === 1, "重排行保留隔离");
  fire(addRecord, "click");
  const empty = recordRows.querySelectorAll(".record-row").find(
    (r) => r.querySelector(".rec-id").value.trim() === ""
  );
  fillRow(empty, ["q9", "101", "F", "900"]);
  fire(empty.querySelector(".rec-id"), "input");
  await flush();
  assert(globalThis.__excludedForTest.size === 1, "新增无关记录保留隔离");
  findRow("x2").querySelector(".rec-time").value = "30"; // 无关记录“编辑”（同值）
  fire(findRow("x2").querySelector(".rec-time"), "input");
  assert(globalThis.__excludedForTest.size === 1, "编辑无关记录保留隔离");
  // 删除无关行也不影响。
  fire(findRow("q9").querySelector(".remove-record"), "click");
  await flush();
  assert(globalThis.__excludedForTest.size === 1 && rowCount() === 7, "删除无关行保留隔离");

  console.log("场景6：删除绑定记录即解除；补回同内容不恢复");
  fire(findRow("a2").querySelector(".remove-record"), "click");
  assert(globalThis.__excludedForTest.size === 0, "删除 a2 行：隔离立即解除");
  await adjudicate();
  assert(JSON.stringify(calls.adjudicate[calls.adjudicate.length - 1].excludedIds) === "[]",
    "删除后裁决不带 a2");
  fire(addRecord, "click");
  const nr = recordRows.querySelectorAll(".record-row").find(
    (r) => r.querySelector(".rec-id").value.trim() === ""
  );
  fillRow(nr, ["a2", "101", "S", "30"]);
  fire(nr.querySelector(".rec-id"), "input");
  await flush();
  assert(globalThis.__excludedForTest.size === 0, "补回同内容 a2：隔离不恢复");
  assert(toggleOf("a2")._text === "隔离", "补回行的开关为未隔离态");

  console.log("场景7：隔离不影响无关趟的复核；隔离趟的复核按原规则失效");
  await setupSeven();
  saveReviewUi(0, "pass", "第一趟备注");
  await adjudicate();
  assert(rendered().includes("第一趟备注"), "前置：第一趟复核已保存");
  clickToggle("a2"); // 只影响第二趟
  await flush();
  assert(rendered().includes("第一趟备注"), "隔离第二趟记录：第一趟复核保留");
  clickToggle("a2");
  await flush();
  clickToggle("a1"); // 第一趟起点退出计算
  await flush();
  assert(!rendered().includes("第一趟备注"), "隔离第一趟起点导致该趟不再采纳：复核按原规则失效");
  clickToggle("a1");
  await flush();
  assert(!rendered().includes("第一趟备注"), "重新纳入后趟恢复采纳，但旧复核不恢复");

  console.log("场景8：清空与填入示例清除全部隔离");
  clickToggle("x2");
  await flush();
  assert(globalThis.__excludedForTest.size >= 1, "前置：存在隔离");
  fire($("clear-btn"), "click");
  await flush();
  assert(globalThis.__excludedForTest.size === 0, "清空：隔离全部解除");
  await setupSeven();
  clickToggle("a2");
  await flush();
  assert(globalThis.__excludedForTest.size === 1, "前置：示例数据上可隔离");
  fire($("sample-btn"), "click");
  await new Promise((r) => setTimeout(r, 450));
  await flush();
  assert(globalThis.__excludedForTest.size === 0, "填入示例：隔离全部清除");
  const sampleA2 = recordRows.querySelectorAll(".record-row").find(
    (r) => r.querySelector(".rec-id").value === "a2"
  );
  assert(sampleA2 && !sampleA2.classList.contains("row-excluded"),
    "示例行没有隔离样式");

  console.log("场景9：在途响应期间操作，迟到的成功不回写隔离后的界面");
  server.mode = "hold";
  let resolveHold;
  server.hold = new Promise((res) => { resolveHold = res; });
  await setupSeven();
  const staleBody = {
    ok: true,
    result: {
      runners: [{
        runner: 101, lapCount: 1, totalTime: 25,
        laps: [lapJson("a1", "b1", "c1", 0, 12, 25)],
        unused: [
          { id: "x2", gate: "S", time: 30 },
          { id: "b2", gate: "M", time: 45 },
          { id: "c2", gate: "F", time: 57 },
        ],
        excluded: [{ id: "a2", gate: "S", time: 30 }],
      }],
    },
  };
  clickToggle("a2"); // 发出在途裁决（excludedIds=[a2]），结果挂起
  assert(globalThis.__excludedForTest.size === 1, "在途期间隔离状态已在页面生效");
  // 在途期间改动绑定秒数再改回：隔离立即解除且不恢复，版本号同时递增。
  const a2live = findRow("a2");
  a2live.querySelector(".rec-time").value = "31";
  fire(a2live.querySelector(".rec-time"), "input");
  a2live.querySelector(".rec-time").value = "30";
  fire(a2live.querySelector(".rec-time"), "input");
  assert(globalThis.__excludedForTest.size === 0, "在途期间改绑定：隔离立即解除");
  resolveHold(staleBody); // 迟到的“已隔离”成功响应
  await flush();
  assert(!rendered().includes("隔离记录"),
    "过期的在途响应被丢弃，不渲染其隔离结果");
  server.mode = "valid";
  await new Promise((r) => setTimeout(r, 450)); // 防抖后的最新裁决返回
  await flush();
  const lastBody = calls.adjudicate[calls.adjudicate.length - 1];
  assert(JSON.stringify(lastBody.excludedIds) === "[]",
    "最新裁决按已解除隔离的当前输入发送空 excludedIds");
  assert(/第 2 趟[\s\S]*a2/.test(rendered()), "最新合法结果恢复 a2 采纳");
  assert(!rendered().includes("隔离记录"), "界面不显示隔离区");

  console.log("场景10：超过 2^53 的秒数——隔离绑定按精确整数等值比较");
  fire($("clear-btn"), "click");
  await flush();
  setVal("smMin", "10"); setVal("smMax", "60"); setVal("mfMin", "10"); setVal("mfMax", "60");
  runnerRows.querySelector(".runner-number").value = "101";
  const T = "9007199254741003";
  while (rowCount() < 1) fire(addRecord, "click");
  const bigRow = recordRows.querySelectorAll(".record-row")[0];
  fillRow(bigRow, ["big1", "101", "M", T]);
  fire(bigRow.querySelector(".rec-id"), "input");
  clickToggle("big1");
  await flush(); // 模拟服务对大整数无具体结果，改用 raw 原文
  server.rawAdj = `{"ok":true,"result":{"runners":[{"runner":101,"lapCount":0,"totalTime":0,` +
    `"laps":[],"unused":[],"excluded":[{"id":"big1","gate":"M","time":${T}}]}]}}`;
  clickToggle("big1"); // 重新纳入
  await flush();
  clickToggle("big1"); // 再隔离：raw 生效
  await flush();
  assert(globalThis.__excludedForTest.size === 1, "大秒数记录可隔离");
  const b = calls.adjudicate[calls.adjudicate.length - 1];
  assert(b.records[0].time === T && JSON.stringify(b.excludedIds) === JSON.stringify(["big1"]),
    "请求中秒数为精确十进制字符串，excludedIds 携带 big1");
  assert(rendered().includes(T), "隔离区大秒数原样精确展示");
  assert(!rendered().includes("9007199254741004"), "大秒数未被 Number 截断");
  // 改成前导零等值写法（超过 2^53）仍保留隔离。
  const bigInput = findRow("big1").querySelector(".rec-time");
  bigInput.value = "0" + T;
  fire(bigInput, "input");
  assert(globalThis.__excludedForTest.size === 1, "大秒数前导零等值写法：隔离保留");
  bigInput.value = String(BigInt(T) + 1n);
  fire(bigInput, "input");
  assert(globalThis.__excludedForTest.size === 0, "大秒数相差 1：隔离立即解除");
  server.rawAdj = null;

  console.log("场景11：部分填写行不可隔离，填全后开关可用");
  fire($("clear-btn"), "click");
  await flush();
  const partial = recordRows.querySelectorAll(".record-row")[0];
  partial.querySelector(".rec-id").value = "p1";
  fire(partial.querySelector(".rec-id"), "input");
  assert(partial.querySelector(".exclude-toggle").disabled, "部分填写行开关禁用");
  partial.querySelector(".rec-runner").value = "101";
  partial.querySelector(".rec-gate").value = "S";
  partial.querySelector(".rec-time").value = "0";
  fire(partial.querySelector(".rec-time"), "input");
  assert(!partial.querySelector(".exclude-toggle").disabled, "填全后开关立即可用");

  console.log("场景12：隔离切换立即使导入预览失效");
  // 直接构造预览态：state 由全局测试钩子不可达时，用真实流程走一遍。
  fileInput.files = [{ name: "d.csv", content: "id,runner,gate,time\nz,101,S,1\n", size: 40, lastModified: 1 }];
  fire(fileInput, "change");
  await globalThis.__importPreviewForTest();
  await flush();
  assert(globalThis.__getImportStateForTest()
    && globalThis.__getImportStateForTest().status === "preview", "前置：导入预览已展示");
  // p1 当前为完整行；隔离它。
  fire(partial.querySelector(".exclude-toggle"), "click");
  await flush();
  assert(globalThis.__getImportStateForTest() === null, "隔离切换：导入预览立即失效");

  console.log(failures === 0 ? "\nALL EXCLUSION SCENARIOS PASSED" : `\n${failures} ASSERTION(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
