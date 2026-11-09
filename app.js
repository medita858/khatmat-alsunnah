const STORAGE_KEY = "khatmat-alsunnah-v1";
let state = loadState();
let hadiths = [];

const $ = (id) => document.getElementById(id);
const setupPanel = $("setupPanel");
const dashboard = $("dashboard");
const reader = $("reader");

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; }
  catch { return null; }
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function ceilDiv(a, b) { return Math.ceil(a / b); }

function currentRange() {
  if (!state || state.completed >= state.total) return null;
  const start = state.completed + 1;
  const end = Math.min(state.total, state.completed + state.daily);
  return { start, end, count: end - start + 1 };
}
function render() {
  const hasPlan = !!state;
  dashboard.hidden = !hasPlan;
  $("continueBtn").hidden = !hasPlan;
  if (!hasPlan) return;
  const done = Math.min(state.completed, state.total);
  const percent = Math.round(done / state.total * 100);
  const remaining = Math.max(0, state.total - done);
  $("progressPercent").textContent = percent + "%";
  $("daysLeft").textContent = ceilDiv(remaining, state.daily);
  $("readCount").textContent = done.toLocaleString("ar-EG");
  $("progressBar").style.width = percent + "%";
  const range = currentRange();
  $("rangeText").textContent = range
    ? `وردك القادم: الأحاديث من ${range.start} إلى ${range.end}`
    : "ما شاء الله! أتممت هذه الختمة.";
}
function openSetup() {
  setupPanel.hidden = false;
  $("totalHadiths").value = state?.total || "";
  $("dailyHadiths").value = state?.daily || 20;
  updatePreview();
  setupPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}
function updatePreview() {
  const total = Number($("totalHadiths").value);
  const daily = Number($("dailyHadiths").value);
  if (total > 0 && daily > 0) {
    $("planPreview").textContent = `ستحتاج إلى ${ceilDiv(total, daily)} يومًا تقريبًا لإتمام الختمة.`;
  } else {
    $("planPreview").textContent = "أدخل عدد الأحاديث وإجمالي الكتاب لعرض مدة الختمة المتوقعة.";
  }
}
function savePlan() {
  const total = Math.floor(Number($("totalHadiths").value));
  const daily = Math.floor(Number($("dailyHadiths").value));
  if (!Number.isSafeInteger(total) || total < 1 || !Number.isSafeInteger(daily) || daily < 1) {
    alert("من فضلك أدخل أعدادًا صحيحة أكبر من صفر.");
    return;
  }
  const completed = state ? Math.min(state.completed, total) : 0;
  state = { book: "sahih_al_bukhari", total, daily, completed, createdAt: state?.createdAt || new Date().toISOString() };
  saveState();
  setupPanel.hidden = true;
  reader.hidden = true;
  render();
}
function openReader() {
  if (!state) return;
  const range = currentRange();
  if (!range) { alert("لقد أتممت الختمة بالفعل. بارك الله فيك."); return; }
  $("readerRange").textContent = `الأحاديث من ${range.start} إلى ${range.end} · عددها ${range.count}`;
  renderHadiths(range);
  reader.hidden = false;
  reader.scrollIntoView({ behavior: "smooth", block: "start" });
}
function renderHadiths(range) {
  const selected = hadiths.filter(h => Number(h.number) >= range.start && Number(h.number) <= range.end);
  const box = $("hadithList");
  if (!selected.length) {
    box.innerHTML = `<div class="empty-state"><div class="empty-icon">📖</div><h3>نصوص الأحاديث غير متاحة بعد</h3><p>تم حساب وردك بدقة، لكن لم نعثر على نصوص مستوردة لهذا النطاق. أضف ملف بيانات موثوقًا بعد مراجعة مصدره.</p></div>`;
    return;
  }
  box.replaceChildren();
  selected.forEach(h => {
    const item = document.createElement("article");
    item.className = "hadith-item";
    const number = document.createElement("strong");
    number.textContent = `الحديث رقم ${h.number}`;
    const body = document.createElement("p");
    body.textContent = h.text;
    item.append(number, body);
    if (h.book) {
      const meta = document.createElement("div");
      meta.className = "small-note";
      meta.textContent = h.book;
      item.append(meta);
    }
    box.append(item);
  });
}
function completeDay() {
  const range = currentRange();
  if (!range) return;
  const ok = confirm(`هل أتممت قراءة الأحاديث من ${range.start} إلى ${range.end}؟`);
  if (!ok) return;
  state.completed = range.end;
  saveState();
  reader.hidden = true;
  render();
  alert(state.completed >= state.total ? "مبارك! أتممت ختمة صحيح البخاري." : "تقبل الله منك. تم حفظ تقدمك.");
}
async function importHadithFile(file) {
  const status = $("importStatus");
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!Array.isArray(parsed)) throw new Error("يجب أن يكون الملف قائمة من الأحاديث.");
    const valid = parsed.every(h => Number.isInteger(Number(h.number)) && typeof h.text === "string" && h.text.trim());
    if (!valid) throw new Error("صيغة البيانات غير صحيحة. راجع ملف README.");
    hadiths = parsed.map(h => ({ number: Number(h.number), text: h.text, book: h.book || "" }))
      .sort((a,b) => a.number - b.number);
    status.textContent = `تم تحميل ${hadiths.length.toLocaleString("ar-EG")} حديثًا في هذه الجلسة. لم يتم التحقق العلمي من المصدر تلقائيًا.`;
    if (!reader.hidden) openReader();
  } catch (e) {
    status.textContent = "تعذر استيراد الملف: " + e.message;
  }
}

$("setupBtn").addEventListener("click", openSetup);
$("continueBtn").addEventListener("click", openReader);
$("editPlanBtn").addEventListener("click", openSetup);
$("cancelSetupBtn").addEventListener("click", () => setupPanel.hidden = true);
$("savePlanBtn").addEventListener("click", savePlan);
$("totalHadiths").addEventListener("input", updatePreview);
$("dailyHadiths").addEventListener("input", updatePreview);
$("readBtn").addEventListener("click", openReader);
$("backBtn").addEventListener("click", () => reader.hidden = true);
$("completeBtn").addEventListener("click", completeDay);
$("hadithFile").addEventListener("change", e => importHadithFile(e.target.files[0]));
$("libraryNav").addEventListener("click", e => { e.preventDefault(); alert("سنضيف بقية كتب السنة في إصدار لاحق."); });
$("progressNav").addEventListener("click", e => { e.preventDefault(); dashboard.scrollIntoView({behavior:"smooth"}); });

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
render();
