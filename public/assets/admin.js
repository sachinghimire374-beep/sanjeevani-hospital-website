const API = '';
let TOKEN = localStorage.getItem('sanjeevani_token') || '';
let _editDoctorId = null;
let _editNewsId = null;

function toggleAdminDrawer(){
  document.getElementById('adminSide').classList.toggle('open');
  document.getElementById('adminDrawerOverlay').classList.toggle('open');
  document.body.style.overflow = document.getElementById('adminSide').classList.contains('open') ? 'hidden' : '';
}
function closeAdminDrawer(){
  document.getElementById('adminSide').classList.remove('open');
  document.getElementById('adminDrawerOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

async function uploadFile(fileInputId, urlInputId, previewId) {
  const input = document.getElementById(fileInputId);
  const file = input.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('file', file);
  const headers = TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {};
  try {
    showToast('Uploading…');
    const res = await fetch('/api/upload', { method: 'POST', headers, body: fd });
    const out = await res.json();
    if (!res.ok) throw new Error(out.error || 'Upload failed.');
    const urlEl = document.getElementById(urlInputId);
    if (urlEl) urlEl.value = out.url;
    if (previewId) {
      const prev = document.getElementById(previewId);
      if (prev) { prev.src = out.url; prev.style.display = file.type.startsWith('image/') ? 'block' : 'none'; }
    }
    showToast('Uploaded: ' + file.name);
  } catch(err) { showToast(err.message); }
}

function uploadTrigger(fileInputId, accept) {
  const el = document.getElementById(fileInputId);
  if (el) el.click();
}

function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2500);
}

async function api(path, opts={}){
  const headers = Object.assign({'Content-Type':'application/json'}, opts.headers||{});
  if(TOKEN) headers['Authorization'] = 'Bearer ' + TOKEN;
  const res = await fetch(API + path, Object.assign({}, opts, {headers}));
  if(res.status === 401){
    logout();
    throw new Error('Session expired. Please log in again.');
  }
  const out = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(out.error || 'Request failed.');
  return out;
}

/* ---------------- AUTH ---------------- */
async function tryLogin(){
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const errBox = document.getElementById('loginErr');
  errBox.style.display = 'none';
  try{
    const res = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username, password}) });
    const out = await res.json().catch(()=>({}));
    if (!res.ok) throw new Error(out.error || 'Login failed.');
    TOKEN = out.token;
    localStorage.setItem('sanjeevani_token', TOKEN);
    showShell();
  }catch(err){
    errBox.textContent = err.message;
    errBox.style.display = 'block';
  }
}
function logout(){
  TOKEN = '';
  localStorage.removeItem('sanjeevani_token');
  document.getElementById('shellView').style.display = 'none';
  document.getElementById('loginView').style.display = 'flex';
}
function showShell(){
  document.getElementById('loginView').style.display = 'none';
  document.getElementById('shellView').style.display = 'grid';
  const tab = (location.hash || '#dashboard').slice(1);
  showTab(tab);
}

/* ---------------- TABS ---------------- */
document.querySelectorAll('.a-nav a').forEach(a=>{
  a.addEventListener('click', (e)=>{ e.preventDefault(); showTab(a.dataset.tab); });
});
let currentTab = 'dashboard';
function showTab(tab){
  currentTab = tab;
  location.hash = '#' + tab;
  document.querySelectorAll('.a-nav a').forEach(a=>a.classList.toggle('active', a.dataset.tab===tab));
  renderTab(tab);
}
function head(title, sub){
  return `<div class="a-head"><div><h2>${title}</h2><p>${sub}</p></div></div>`;
}
async function renderTab(tab){
  const main = document.getElementById('adminMain');
  main.innerHTML = '<p style="color:#8AA1A8;">Loading…</p>';
  try{
    if(tab==='dashboard') return main.innerHTML = await tplDashboard();
    if(tab==='hero') return main.innerHTML = await tplHero();
    if(tab==='stats') return main.innerHTML = await tplStats();
    if(tab==='departments') return main.innerHTML = await tplDepartments();
    if(tab==='doctors') return main.innerHTML = await tplDoctors();
    if(tab==='testimonials') return main.innerHTML = await tplTestimonials();
    if(tab==='news') return main.innerHTML = await tplNews();
    if(tab==='gallery'){ main.innerHTML = await tplGallery(); renderGalleryCats(); return; }
    if(tab==='about') return main.innerHTML = await tplAbout();
    if(tab==='appointments') return main.innerHTML = await tplAppointments();
    if(tab==='seo') return main.innerHTML = await tplSeo();
    if(tab==='contact') return main.innerHTML = await tplContact();
    if(tab==='account') return main.innerHTML = tplAccount();
  }catch(err){
    main.innerHTML = `<p style="color:#C0392B;">${esc(err.message)}</p>`;
  }
}

/* ---------------- DASHBOARD ---------------- */
async function tplDashboard(){
  const d = await api('/api/dashboard');
  return head('Dashboard','Overview of hospital activity') + `
    <div class="dash-stats">
      <div class="ds"><div class="n">${d.totalAppointments}</div><div class="l">Total Appointments</div></div>
      <div class="ds"><div class="n">${d.totalDoctors}</div><div class="l">Doctors</div></div>
      <div class="ds"><div class="n">${d.totalDepartments}</div><div class="l">Departments</div></div>
      <div class="ds"><div class="n">${d.pendingAppointments}</div><div class="l">Pending Requests</div></div>
    </div>
    <div class="a-panel">
      <h3>Recent appointment requests</h3>
      ${d.recent.map(a=>`
        <div class="a-row"><div class="ri"><b>${esc(a.patient_name)}</b><span>${esc(a.department||'')} · ${esc(a.appt_date||'')} ${esc(a.appt_time||'')}</span></div>
        <span class="badge ${a.status==='Approved'?'green':a.status==='Pending'?'amber':'grey'}">${esc(a.status)}</span></div>
      `).join('') || '<p style="color:#8AA1A8;font-size:14px;">No appointment requests yet.</p>'}
    </div>
  `;
}

/* ---------------- HERO ---------------- */
async function tplHero(){
  const h = await api('/api/content/hero');
  const bg = h.bg || '/uploads/hospital-building.jpg';
  return head('Homepage Hero','Edit the headline, lead text, kicker and background image shown at the top of the homepage.') + `
    <div class="a-panel">
      <h3>Kicker (small label above headline)</h3>
      <div class="field"><input id="f_kicker" value="${esc(h.kicker)}"></div>
      <h3 style="margin-top:20px;">Headline (HTML allowed for emphasis, e.g. &lt;em&gt;)</h3>
      <div class="field"><textarea id="f_title" rows="2">${esc(h.title)}</textarea></div>
      <h3 style="margin-top:20px;">Lead paragraph</h3>
      <div class="field"><textarea id="f_lead" rows="3">${esc(h.lead)}</textarea></div>
      <h3 style="margin-top:20px;">Hero Background Image</h3>
      <input type="hidden" id="f_bg" value="${esc(bg)}">
      <input type="file" id="f_bg_file" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="uploadFile('f_bg_file','f_bg','f_bg_prev')">
      <button type="button" class="upload-btn" onclick="uploadTrigger('f_bg_file')">Upload new background photo</button>
      <img id="f_bg_prev" class="upload-preview" src="${esc(bg)}" style="display:block;margin-top:10px;width:100%;max-height:220px;object-fit:cover;border-radius:10px;">
      <div class="save-bar"><button class="btn btn-primary btn-small" onclick="saveHero()">Save changes</button></div>
    </div>
  `;
}
async function saveHero(){
  const body = {
    kicker: document.getElementById('f_kicker').value,
    title: document.getElementById('f_title').value,
    lead: document.getElementById('f_lead').value,
    bg: document.getElementById('f_bg').value
  };
  await api('/api/content/hero', { method:'PUT', body: JSON.stringify(body) });
  showToast('Hero section updated.');
}

/* ---------------- STATS ---------------- */
async function tplStats(){
  const stats = await api('/api/content/stats');
  const statsBand = await api('/api/content/statsBand');
  const rowsHTML = (arr, key) => arr.map((s,i)=>`
    <div class="a-row a-grid2" style="display:grid;">
      <input class="se" data-k="${key}" data-i="${i}" data-f="value" value="${esc(s.value)}" style="border:1px solid var(--line);border-radius:8px;padding:8px;">
      <input class="se" data-k="${key}" data-i="${i}" data-f="label" value="${esc(s.label)}" style="border:1px solid var(--line);border-radius:8px;padding:8px;">
    </div>`).join('');
  window.__statsCache = { stats, statsBand };
  return head('Statistics','Edit the counters shown in the hero and the dark statistics band.') + `
    <div class="a-panel"><h3>Hero strip counters</h3>${rowsHTML(stats,'stats')}
      <div class="save-bar"><button class="btn btn-primary btn-small" onclick="saveStats()">Save changes</button></div></div>
    <div class="a-panel"><h3>Statistics band counters</h3>${rowsHTML(statsBand,'statsBand')}
      <div class="save-bar"><button class="btn btn-primary btn-small" onclick="saveStats()">Save changes</button></div></div>
  `;
}
async function saveStats(){
  const { stats, statsBand } = window.__statsCache;
  document.querySelectorAll('.se').forEach(inp=>{
    const k=inp.dataset.k, i=+inp.dataset.i, f=inp.dataset.f;
    (k==='stats'?stats:statsBand)[i][f] = inp.value;
  });
  await api('/api/content/stats', { method:'PUT', body: JSON.stringify(stats) });
  await api('/api/content/statsBand', { method:'PUT', body: JSON.stringify(statsBand) });
  showToast('Statistics updated.');
}

/* ---------------- DEPARTMENTS ---------------- */
let _editDeptId = null;
async function tplDepartments(){
  const depts = await api('/api/departments');
  const editDept = _editDeptId ? depts.find(d=>d.id===_editDeptId) : null;
  return head('Departments','Add, edit or remove hospital departments.') + `
    <div class="a-panel">
      <h3>Add new department</h3>
      <div class="a-grid2">
        <div class="field"><label class="flabel">Name</label><input id="nd_name" placeholder="Department name"></div>
        <div class="field"><label class="flabel">Icon emoji (optional)</label><input id="nd_icon" placeholder="e.g. 🫀"></div>
      </div>
      <div class="field" style="margin-top:12px;"><label class="flabel">Description</label><textarea id="nd_desc" rows="2" placeholder="Short description"></textarea></div>
      <div class="field" style="margin-top:12px;"><label class="flabel">Department image</label>
        <div class="upload-group">
          <input id="nd_image" placeholder="Image URL (auto-filled on upload)">
          <input type="file" id="nd_image_file" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="uploadFile('nd_image_file','nd_image','nd_image_prev')">
          <button type="button" class="upload-btn" onclick="uploadTrigger('nd_image_file')">Upload PNG / JPG</button>
        </div>
        <img id="nd_image_prev" class="upload-preview" src="" style="display:none;margin-top:8px;">
      </div>
      <div class="save-bar"><button class="btn btn-primary btn-small" onclick="addDept()">Add department</button></div>
    </div>
    <div class="a-panel"><h3>Existing departments (${depts.length})</h3>
      ${depts.map(d=>`
        <div class="a-row" style="${_editDeptId===d.id?'flex-direction:column;align-items:stretch;border:2px solid var(--green);border-radius:12px;padding:16px;':''}">${_editDeptId===d.id?`
          <div class="a-grid2">
            <div class="field"><label class="flabel">Name</label><input id="ed_dname" value="${esc(d.name)}"></div>
            <div class="field"><label class="flabel">Icon emoji</label><input id="ed_dicon" value="${esc(d.icon||'')}"></div>
          </div>
          <div class="field" style="margin-top:10px;"><label class="flabel">Description</label><textarea id="ed_ddesc" rows="2">${esc(d.description||'')}</textarea></div>
          <div class="field" style="margin-top:10px;"><label class="flabel">Department image</label>
            <div class="upload-group">
              <input id="ed_dimage" value="${esc(d.image_url||'')}" placeholder="Image URL">
              <input type="file" id="ed_dimage_file" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="uploadFile('ed_dimage_file','ed_dimage','ed_dimage_prev')">
              <button type="button" class="upload-btn" onclick="uploadTrigger('ed_dimage_file')">Upload PNG / JPG</button>
            </div>
            ${d.image_url?`<img id="ed_dimage_prev" class="upload-preview" src="${esc(d.image_url)}" style="display:block;margin-top:8px;">`:`<img id="ed_dimage_prev" class="upload-preview" src="" style="display:none;margin-top:8px;">`}
          </div>
          <div class="save-bar"><button class="btn btn-ghost btn-small" onclick="cancelEditDept()">Cancel</button><button class="btn btn-primary btn-small" onclick="saveDeptEdit(${d.id})">Save</button></div>
        `:`
          <div class="ri"><b>${esc(d.name)}</b><span>${esc(d.description||'')}</span></div>
          <div class="a-actions"><button class="btn btn-ghost btn-small" onclick="startEditDept(${d.id})">Edit</button><button class="btn btn-danger btn-small" onclick="deleteDept(${d.id})">Delete</button></div>
        `}</div>
      `).join('') || '<p style="color:#8AA1A8;font-size:14px;">No departments yet.</p>'}
    </div>
  `;
}
async function addDept(){
  const name = document.getElementById('nd_name').value.trim();
  if(!name) return showToast('Department name is required.');
  const icon = document.getElementById('nd_icon').value.trim() || '🏥';
  const description = document.getElementById('nd_desc').value.trim();
  const image_url = document.getElementById('nd_image').value.trim();
  await api('/api/departments', { method:'POST', body: JSON.stringify({name, icon, description, image_url}) });
  showTab('departments'); showToast('Department added.');
}
function startEditDept(id){ _editDeptId = id; showTab('departments'); }
function cancelEditDept(){ _editDeptId = null; showTab('departments'); }
async function saveDeptEdit(id){
  const name = document.getElementById('ed_dname').value.trim();
  if(!name) return showToast('Name required.');
  const icon = document.getElementById('ed_dicon').value.trim();
  const description = document.getElementById('ed_ddesc').value.trim();
  const image_url = document.getElementById('ed_dimage').value.trim();
  await api('/api/departments/'+id, { method:'PUT', body: JSON.stringify({name, icon, description, image_url}) });
  _editDeptId = null; showTab('departments'); showToast('Department updated.');
}
async function deleteDept(id){
  if(!confirm('Delete this department?')) return;
  await api('/api/departments/'+id, { method:'DELETE' });
  showTab('departments'); showToast('Department deleted.');
}

/* ---------------- DOCTORS ---------------- */
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function toggleDayRow(day, prefix) {
  const chk = document.getElementById(`${prefix}_chk_${day}`);
  const row = document.getElementById(`${prefix}_time_${day}`);
  if (row) row.style.display = chk && chk.checked ? '' : 'none';
}

function buildScheduleFromUI(prefix) {
  const schedule = {};
  DAYS.forEach(day => {
    const chk = document.getElementById(`${prefix}_chk_${day}`);
    if (chk && chk.checked) {
      const fromEl = document.getElementById(`${prefix}_from_${day}`);
      const toEl   = document.getElementById(`${prefix}_to_${day}`);
      schedule[day] = { start: fromEl?.value || '09:00', end: toEl?.value || '17:00' };
    }
  });
  return schedule;
}

function schedulePickerHTML(prefix, existingSchedule, existingDays, existingHoursFrom, existingHoursTo) {
  // existingSchedule: {Monday:{start,end},...} (new format)
  // existingDays: ['Monday',...], existingHoursFrom/To: old format fallback
  function oldToHHMM(str) {
    if (!str) return null;
    const ap = /([AP]M)$/i.exec(str.trim());
    const mt = /(\d{1,2}):(\d{2})/.exec(str.trim());
    if (!mt) return null;
    let h = parseInt(mt[1]); const mn = mt[2];
    if (ap) {
      if (/PM/i.test(ap[1]) && h !== 12) h += 12;
      if (/AM/i.test(ap[1]) && h === 12) h = 0;
    }
    return String(h).padStart(2,'0') + ':' + mn;
  }
  const fromHHMM = oldToHHMM(existingHoursFrom) || '09:00';
  const toHHMM   = oldToHHMM(existingHoursTo)   || '17:00';

  return `<h3 style="margin-top:22px;">Availability Schedule</h3>
  <div class="avail-schedule-grid">${DAYS.map(day => {
    let dayRange = existingSchedule?.[day] || null;
    if (!dayRange && existingDays?.includes(day) && (existingHoursFrom || existingHoursTo)) {
      dayRange = { start: fromHHMM, end: toHHMM };
    }
    const checked = dayRange ? ' checked' : '';
    return `<div class="avail-sched-row">
      <label class="avail-sched-chk">
        <input type="checkbox" id="${prefix}_chk_${day}"${checked} onchange="toggleDayRow('${day}','${prefix}')">
        <span>${day.slice(0,3)}</span>
      </label>
      <div class="avail-sched-times" id="${prefix}_time_${day}" style="${dayRange ? '' : 'display:none'}">
        <input type="time" id="${prefix}_from_${day}" value="${dayRange?.start || '09:00'}">
        <span style="color:#8AA1A8;font-size:12px;">to</span>
        <input type="time" id="${prefix}_to_${day}" value="${dayRange?.end || '17:00'}">
      </div>
    </div>`;
  }).join('')}</div>`;
}

async function tplDoctors(){
  const [docs, depts] = await Promise.all([api('/api/doctors'), api('/api/departments')]);
  const deptOptions = (selected='') => depts.map(d=>`<option value="${esc(d.name)}"${d.name===selected?' selected':''}>${esc(d.name)}</option>`).join('');
  const editDoc = _editDoctorId ? docs.find(d=>d.id===_editDoctorId) : null;
  let editPanel = '';
  if(editDoc){
    const av = (()=>{ try{ return JSON.parse(editDoc.availability||'{}'); }catch(e){ return {}; } })();
    const activeDays = av.days || [];
    const hours = av.hours || '';
    const [hFrom, hTo] = hours.includes('–') ? hours.split('–').map(s=>s.trim()) : [hours,''];
    editPanel = `
    <div class="a-panel" style="border:2px solid var(--green);">
      <h3>Edit: ${esc(editDoc.name)}</h3>
      <div class="a-grid2">
        <div class="field"><label class="flabel">Name</label><input id="ed_name" value="${esc(editDoc.name)}"></div>
        <div class="field"><label class="flabel">Specialty / Title</label><input id="ed_spec" value="${esc(editDoc.specialty||'')}" placeholder="e.g. Cardiologist"></div>
        <div class="field"><label class="flabel">Qualification</label><input id="ed_qual" value="${esc(editDoc.qualification||'')}"></div>
        <div class="field"><label class="flabel">Experience</label><input id="ed_exp" value="${esc(editDoc.experience||'')}"></div>
      </div>
      <div class="a-grid2" style="margin-top:12px;">
        <div class="field"><label class="flabel">Department</label><select id="ed_dept"><option value="">— Select department —</option>${deptOptions(editDoc.department||editDoc.specialty||'')}</select></div>
        <div class="field"><label class="flabel">NMC Number</label><input id="ed_nmc" value="${esc(editDoc.nmc_number||'')}"></div>
      </div>
      <div class="a-grid2" style="margin-top:12px;">
        <div class="field">
          <label class="flabel">Photo</label>
          <div class="upload-group">
            <input id="ed_photo" value="${esc(editDoc.photo_url||'')}" placeholder="Photo URL (or upload →)">
            <input type="file" id="ed_photo_file" accept="image/*" style="display:none" onchange="uploadFile('ed_photo_file','ed_photo','ed_photo_prev')">
            <button type="button" class="btn btn-ghost btn-small upload-btn" onclick="document.getElementById('ed_photo_file').click()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload JPG
            </button>
          </div>
          ${editDoc.photo_url ? `<img id="ed_photo_prev" class="upload-preview" src="${esc(editDoc.photo_url)}">` : `<img id="ed_photo_prev" class="upload-preview" style="display:none">`}
        </div>
        <div class="field"><label class="flabel">Status</label><select id="ed_status">
          ${['Active','On Leave','Retired'].map(s=>`<option${s===editDoc.status?' selected':''}>${s}</option>`).join('')}
        </select></div>
      </div>
      ${schedulePickerHTML('ed', av.schedule, activeDays, hFrom, hTo)}
      <div class="save-bar">
        <button class="btn btn-primary btn-small" onclick="saveDoctor(${editDoc.id})">Save changes</button>
        <button class="btn btn-ghost btn-small" onclick="cancelEditDoctor()">Cancel</button>
      </div>
    </div>`;
  }
  return head('Doctors','Manage doctor profiles shown on the homepage and doctors page.') + editPanel + `
    <div class="a-panel">
      <h3>Add new doctor</h3>
      <div class="a-grid2">
        <div class="field"><label class="flabel">Full name</label><input id="nx_name" placeholder="Dr. Full Name"></div>
        <div class="field"><label class="flabel">Specialty / Title</label><input id="nx_spec" placeholder="e.g. Cardiologist"></div>
        <div class="field"><label class="flabel">Qualification</label><input id="nx_qual" placeholder="e.g. MD, FACC"></div>
        <div class="field"><label class="flabel">Experience</label><input id="nx_exp" placeholder="e.g. 10 yrs"></div>
      </div>
      <div class="a-grid2" style="margin-top:12px;">
        <div class="field"><label class="flabel">Department</label><select id="nx_dept"><option value="">— Select department —</option>${deptOptions()}</select></div>
        <div class="field"><label class="flabel">NMC Number</label><input id="nx_nmc" placeholder="NMC registration number"></div>
      </div>
      <div class="a-grid2" style="margin-top:12px;">
        <div class="field">
          <label class="flabel">Photo</label>
          <div class="upload-group">
            <input id="nx_photo" placeholder="Photo URL (or upload →)">
            <input type="file" id="nx_photo_file" accept="image/*" style="display:none" onchange="uploadFile('nx_photo_file','nx_photo','nx_photo_prev')">
            <button type="button" class="btn btn-ghost btn-small upload-btn" onclick="document.getElementById('nx_photo_file').click()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload JPG
            </button>
          </div>
          <img id="nx_photo_prev" class="upload-preview" style="display:none">
        </div>
        <div class="field"><label class="flabel">Status</label><select id="nx_status"><option>Active</option><option>On Leave</option><option>Retired</option></select></div>
      </div>
      ${schedulePickerHTML('nx', null, [], '', '')}
      <div class="save-bar"><button class="btn btn-primary btn-small" onclick="addDoctor()">Add doctor</button></div>
    </div>
    <div class="a-panel"><h3>Existing doctors (${docs.length})</h3>
      ${docs.map(d=>{
        const av=(()=>{try{return JSON.parse(d.availability||'{}');}catch(e){return{};}})();
        const scheduleDays = av.schedule ? Object.keys(av.schedule) : (av.days||[]);
        const daysLabel=scheduleDays.length?scheduleDays.map(x=>x.slice(0,3)).join(', '):'No availability set';
        return `<div class="a-row">
          <div class="ri"><b>${esc(d.name)}</b><span>${esc(d.department||d.specialty||'')} · ${daysLabel}</span></div>
          <span class="badge ${d.status==='Active'?'green':d.status==='On Leave'?'amber':'grey'}">${esc(d.status)}</span>
          <div class="a-actions">
            <button class="btn btn-ghost btn-small" onclick="editDoctor(${d.id})">Edit</button>
            <button class="btn btn-danger btn-small" onclick="deleteDoctor(${d.id})">Delete</button>
          </div></div>`;
      }).join('') || '<p style="color:#8AA1A8;font-size:14px;">No doctors yet.</p>'}
    </div>
  `;
}
function editDoctor(id){ _editDoctorId=id; showTab('doctors'); }
function cancelEditDoctor(){ _editDoctorId=null; showTab('doctors'); }
async function saveDoctor(id){
  const schedule = buildScheduleFromUI('ed');
  const dept = document.getElementById('ed_dept').value;
  const body={
    name: document.getElementById('ed_name').value.trim(),
    specialty: document.getElementById('ed_spec').value.trim() || dept,
    qualification: document.getElementById('ed_qual').value.trim(),
    experience: document.getElementById('ed_exp').value.trim(),
    department: dept,
    nmc_number: document.getElementById('ed_nmc').value.trim(),
    photo_url: document.getElementById('ed_photo').value.trim(),
    status: document.getElementById('ed_status').value,
    availability: JSON.stringify({ schedule })
  };
  await api('/api/doctors/'+id,{method:'PUT',body:JSON.stringify(body)});
  _editDoctorId=null; showTab('doctors'); showToast('Doctor updated.');
}
async function addDoctor(){
  const name = document.getElementById('nx_name').value.trim();
  if(!name) return showToast('Doctor name is required.');
  const dept = document.getElementById('nx_dept').value;
  if(!dept) return showToast('Please select a department.');
  const schedule = buildScheduleFromUI('nx');
  const body = {
    name,
    specialty: document.getElementById('nx_spec').value.trim() || dept,
    qualification: document.getElementById('nx_qual').value.trim(),
    experience: document.getElementById('nx_exp').value.trim(),
    department: dept,
    nmc_number: document.getElementById('nx_nmc').value.trim(),
    photo_url: document.getElementById('nx_photo').value.trim(),
    status: document.getElementById('nx_status').value,
    availability: JSON.stringify({ schedule })
  };
  await api('/api/doctors', { method:'POST', body: JSON.stringify(body) });
  showTab('doctors'); showToast('Doctor added.');
}
async function cycleDoctorStatus(id, current){
  const order = ['Active','On Leave','Retired'];
  const next = order[(order.indexOf(current)+1) % order.length];
  const docs = await api('/api/doctors');
  const d = docs.find(x=>x.id===id);
  await api('/api/doctors/'+id, { method:'PUT', body: JSON.stringify(Object.assign({}, d, {status: next})) });
  showTab('doctors'); showToast('Doctor status set to ' + next + '.');
}
async function deleteDoctor(id){
  if(!confirm('Remove this doctor?')) return;
  await api('/api/doctors/'+id, { method:'DELETE' });
  showTab('doctors'); showToast('Doctor removed.');
}

/* ---------------- TESTIMONIALS ---------------- */
async function tplTestimonials(){
  const list = await api('/api/testimonials');
  return head('Testimonials','Add or remove patient reviews.') + `
    <div class="a-panel">
      <h3>Add new testimonial</h3>
      <div class="field"><textarea id="nt_quote" rows="2" placeholder="Quote"></textarea></div>
      <div class="a-grid2" style="margin-top:12px;">
        <div class="field"><input id="nt_name" placeholder="Patient name"></div>
        <div class="field"><input id="nt_role" placeholder="Role, e.g. Patient, Cardiology"></div>
      </div>
      <div class="save-bar"><button class="btn btn-primary btn-small" onclick="addTesti()">Add testimonial</button></div>
    </div>
    <div class="a-panel"><h3>Existing testimonials (${list.length})</h3>
      ${list.map(t=>`
        <div class="a-row"><div class="ri"><b>${esc(t.patient_name)}</b><span>"${esc(t.quote)}"</span></div>
        <div class="a-actions"><button class="btn btn-danger btn-small" onclick="deleteTesti(${t.id})">Delete</button></div></div>
      `).join('') || '<p style="color:#8AA1A8;font-size:14px;">No testimonials yet.</p>'}
    </div>
  `;
}
async function addTesti(){
  const quote = document.getElementById('nt_quote').value.trim();
  const patient_name = document.getElementById('nt_name').value.trim();
  const role_label = document.getElementById('nt_role').value.trim();
  if(!quote || !patient_name) return showToast('Quote and name are required.');
  await api('/api/testimonials', { method:'POST', body: JSON.stringify({quote, patient_name, role_label}) });
  showTab('testimonials'); showToast('Testimonial added.');
}
async function deleteTesti(id){
  if(!confirm('Delete this testimonial?')) return;
  await api('/api/testimonials/'+id, { method:'DELETE' });
  showTab('testimonials'); showToast('Testimonial deleted.');
}

/* ---------------- NEWS ---------------- */
async function tplNews(){
  const list = await api('/api/news');
  const editNews = _editNewsId ? list.find(n=>n.id===_editNewsId) : null;
  let editPanel = '';
  if(editNews){
    editPanel = `
    <div class="a-panel" style="border:2px solid var(--green);">
      <h3>Edit: ${esc(editNews.title)}</h3>
      <div class="field"><input id="en_title" value="${esc(editNews.title)}" placeholder="Title"></div>
      <div class="field" style="margin-top:12px;"><textarea id="en_body" rows="6" placeholder="Content">${esc(editNews.body||'')}</textarea></div>
      <div class="a-grid2" style="margin-top:12px;">
        <div class="field">
          <label class="flabel">Cover image</label>
          <div class="upload-group">
            <input id="en_cover" value="${esc(editNews.cover_image||'')}" placeholder="Image URL (or upload →)">
            <input type="file" id="en_cover_file" accept="image/*" style="display:none" onchange="uploadFile('en_cover_file','en_cover','en_cover_prev')">
            <button type="button" class="btn btn-ghost btn-small upload-btn" onclick="document.getElementById('en_cover_file').click()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload image
            </button>
          </div>
          ${editNews.cover_image?`<img id="en_cover_prev" class="upload-preview" src="${esc(editNews.cover_image)}" style="display:block;margin-top:6px;">`:`<img id="en_cover_prev" class="upload-preview" src="" style="display:none;margin-top:6px;">`}
        </div>
        <div class="field"><label class="flabel">Type</label><select id="en_type">
          <option value="news"${editNews.post_type==='news'?' selected':''}>News / Article</option>
          <option value="notice"${editNews.post_type==='notice'?' selected':''}>Notice / Announcement</option>
        </select></div>
        <div class="field"><label class="flabel">Status</label><select id="en_status">
          <option value="draft"${editNews.status==='draft'?' selected':''}>Draft</option>
          <option value="published"${editNews.status==='published'?' selected':''}>Published</option>
        </select></div>
      </div>
      <div class="field" style="margin-top:12px;">
        <label class="flabel">PDF / file attachment (optional)</label>
        <div class="upload-group">
          <input id="en_attach" value="${esc(editNews.attachment_url||'')}" placeholder="PDF URL (or upload →)">
          <input type="file" id="en_attach_file" accept=".pdf,image/*" style="display:none" onchange="uploadFile('en_attach_file','en_attach',null)">
          <button type="button" class="btn btn-ghost btn-small upload-btn" onclick="document.getElementById('en_attach_file').click()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Upload PDF
          </button>
        </div>
        <p style="font-size:12px;color:#8AA1A8;margin-top:6px;">Accepts PDF, JPG, PNG. Shown as a download button on the news card.</p>
      </div>
      <div class="field" style="margin-top:12px;"><input id="en_meta_title" value="${esc(editNews.meta_title||'')}" placeholder="SEO meta title (optional)"></div>
      <div class="field" style="margin-top:12px;"><textarea id="en_meta_desc" rows="2" placeholder="SEO meta description (optional)">${esc(editNews.meta_description||'')}</textarea></div>
      <div class="save-bar">
        <button class="btn btn-ghost btn-small" onclick="cancelEditNews()">Cancel</button>
        <button class="btn btn-primary btn-small" onclick="saveNewsEdit(${editNews.id})">Save changes</button>
      </div>
    </div>`;
  }
  return head('News & Notices','Write news posts or notices, save as draft, then publish when ready.') + editPanel + `
    <div class="a-panel">
      <h3>New post</h3>
      <div class="field"><input id="nn_title" placeholder="Title"></div>
      <div class="field" style="margin-top:12px;"><textarea id="nn_body" rows="6" placeholder="Content"></textarea></div>
      <div class="a-grid2" style="margin-top:12px;">
        <div class="field">
          <label class="flabel">Cover image</label>
          <div class="upload-group">
            <input id="nn_cover" placeholder="Image URL (or upload →)">
            <input type="file" id="nn_cover_file" accept="image/*" style="display:none" onchange="uploadFile('nn_cover_file','nn_cover','nn_cover_prev')">
            <button type="button" class="btn btn-ghost btn-small upload-btn" onclick="document.getElementById('nn_cover_file').click()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload image
            </button>
          </div>
          <img id="nn_cover_prev" class="upload-preview" style="display:none">
        </div>
        <div class="field"><label class="flabel">Type</label><select id="nn_type"><option value="news">News / Article</option><option value="notice">Notice / Announcement</option></select></div>
        <div class="field"><label class="flabel">Status</label><select id="nn_status"><option value="draft">Save as draft</option><option value="published">Publish now</option></select></div>
      </div>
      <div class="field" style="margin-top:12px;">
        <label class="flabel">PDF / file attachment (optional)</label>
        <div class="upload-group">
          <input id="nn_attach" placeholder="PDF URL (or upload →)">
          <input type="file" id="nn_attach_file" accept=".pdf,image/*" style="display:none" onchange="uploadFile('nn_attach_file','nn_attach',null)">
          <button type="button" class="btn btn-ghost btn-small upload-btn" onclick="document.getElementById('nn_attach_file').click()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Upload PDF
          </button>
        </div>
        <p style="font-size:12px;color:#8AA1A8;margin-top:6px;">Accepts PDF, JPG, PNG. Shown as a download button on the news card.</p>
      </div>
      <div class="field" style="margin-top:12px;"><input id="nn_meta_title" placeholder="SEO meta title (optional)"></div>
      <div class="field" style="margin-top:12px;"><textarea id="nn_meta_desc" rows="2" placeholder="SEO meta description (optional)"></textarea></div>
      <div class="save-bar"><button class="btn btn-primary btn-small" onclick="addNews()">Save post</button></div>
    </div>
    <div class="a-panel"><h3>Posts (${list.length})</h3>
      ${list.map(n=>`
        <div class="a-row"><div class="ri"><b>${esc(n.title)}</b><span>${esc((n.created_at||'').slice(0,10))}</span></div>
        <span class="badge ${n.post_type==='notice'?'amber':'blue'}" style="margin-right:4px;">${n.post_type==='notice'?'Notice':'News'}</span>
        <span class="badge ${n.status==='published'?'green':'grey'}">${esc(n.status)}</span>
        <div class="a-actions">
          <button class="btn btn-ghost btn-small" onclick="startEditNews(${n.id})">Edit</button>
          <button class="btn btn-ghost btn-small" onclick="toggleNewsStatus(${n.id},'${n.status}')">${n.status==='published'?'Unpublish':'Publish'}</button>
          <button class="btn btn-danger btn-small" onclick="deleteNews(${n.id})">Delete</button>
        </div></div>
      `).join('') || '<p style="color:#8AA1A8;font-size:14px;">No posts yet.</p>'}
    </div>
  `;
}
function startEditNews(id){ _editNewsId = id; showTab('news'); }
function cancelEditNews(){ _editNewsId = null; showTab('news'); }
async function saveNewsEdit(id){
  const title = document.getElementById('en_title').value.trim();
  if(!title) return showToast('Title is required.');
  const body = {
    title,
    body: document.getElementById('en_body').value,
    cover_image: document.getElementById('en_cover').value.trim(),
    attachment_url: document.getElementById('en_attach').value.trim(),
    status: document.getElementById('en_status').value,
    post_type: document.getElementById('en_type').value,
    meta_title: document.getElementById('en_meta_title').value.trim(),
    meta_description: document.getElementById('en_meta_desc').value.trim()
  };
  await api('/api/news/'+id, { method:'PUT', body: JSON.stringify(body) });
  _editNewsId = null; showTab('news'); showToast('Post updated.');
}
async function addNews(){
  const title = document.getElementById('nn_title').value.trim();
  if(!title) return showToast('Title is required.');
  const body = {
    title,
    body: document.getElementById('nn_body').value,
    cover_image: document.getElementById('nn_cover').value.trim(),
    attachment_url: document.getElementById('nn_attach').value.trim(),
    status: document.getElementById('nn_status').value,
    post_type: document.getElementById('nn_type').value,
    meta_title: document.getElementById('nn_meta_title').value.trim(),
    meta_description: document.getElementById('nn_meta_desc').value.trim()
  };
  await api('/api/news', { method:'POST', body: JSON.stringify(body) });
  showTab('news'); showToast('Post saved.');
}
async function toggleNewsStatus(id, current){
  const list = await api('/api/news');
  const n = list.find(x=>x.id===id);
  const next = current === 'published' ? 'draft' : 'published';
  await api('/api/news/'+id, { method:'PUT', body: JSON.stringify(Object.assign({}, n, {status: next})) });
  showTab('news'); showToast('Article ' + (next==='published'?'published':'unpublished') + '.');
}
async function deleteNews(id){
  if(!confirm('Delete this post?')) return;
  await api('/api/news/'+id, { method:'DELETE' });
  showTab('news'); showToast('Article deleted.');
}

/* ---------------- GALLERY ---------------- */
let _galleryNav = [];

function buildGalCatOptions(){
  let opts = '';
  _galleryNav.forEach(cat => {
    opts += `<option value="${esc(cat.name)}">${esc(cat.name)}</option>`;
    (cat.children||[]).forEach(ch => {
      opts += `<option value="${esc(cat.name+' > '+ch.name)}">${esc(cat.name)} › ${esc(ch.name)}</option>`;
    });
  });
  return opts || '<option value="">No categories — add one below</option>';
}

function renderGalleryCats(){
  const container = document.getElementById('galCatList');
  if(!container) return;
  if(!_galleryNav.length){
    container.innerHTML = '<p style="color:#8AA1A8;font-size:14px;">No categories yet. Add one below.</p>';
    return;
  }
  container.innerHTML = _galleryNav.map((cat,ci) => `
    <div style="background:#f8fafc;border:1px solid var(--line);border-radius:10px;padding:12px 16px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
        <b style="flex:1;font-size:14px;color:var(--teal-deep);">${esc(cat.name)}</b>
        <button class="btn btn-ghost btn-small" onclick="addGalSubCat(${ci})">+ Sub-category</button>
        <button class="btn btn-danger btn-small" onclick="removeGalCat(${ci})">Remove</button>
      </div>
      ${(cat.children||[]).length ? (cat.children||[]).map((ch,ki) => `
        <div style="display:flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--line);padding:6px 12px;border-radius:8px;margin-top:5px;">
          <span style="flex:1;font-size:13px;color:#5B7682;">↳ ${esc(ch.name)}</span>
          <button class="btn btn-danger btn-small" onclick="removeGalSubCat(${ci},${ki})">Remove</button>
        </div>`).join('') : '<p style="font-size:12px;color:#9FC1C9;margin:4px 0 0 12px;">No sub-categories</p>'}
    </div>
  `).join('');
}

function addGalCat(){
  const name = prompt('New category name (e.g. "Health Camp"):');
  if(!name||!name.trim()) return;
  _galleryNav.push({name:name.trim(),children:[]});
  saveGalleryNav();
}

function removeGalCat(ci){
  if(!confirm('Remove "'+_galleryNav[ci].name+'" and all its sub-categories?')) return;
  _galleryNav.splice(ci,1);
  saveGalleryNav();
}

function addGalSubCat(ci){
  const name = prompt('Sub-category name (e.g. "AGM"):');
  if(!name||!name.trim()) return;
  if(!_galleryNav[ci].children) _galleryNav[ci].children = [];
  _galleryNav[ci].children.push({name:name.trim()});
  saveGalleryNav();
}

function removeGalSubCat(ci,ki){
  _galleryNav[ci].children.splice(ki,1);
  saveGalleryNav();
}

async function saveGalleryNav(){
  await api('/api/content/gallery_nav',{method:'PUT',body:JSON.stringify(_galleryNav)});
  renderGalleryCats();
  const catSel = document.getElementById('ng_cat');
  if(catSel) catSel.innerHTML = buildGalCatOptions();
  showToast('Categories saved.');
}

async function tplGallery(){
  const [list, galleryNav] = await Promise.all([api('/api/gallery'), api('/api/content/gallery_nav')]);
  _galleryNav = Array.isArray(galleryNav) ? galleryNav : [];
  return head('Gallery','Upload photos to the public gallery, grouped by category.') + `
    <div class="a-panel">
      <h3>Upload image</h3>
      <div class="field"><label class="flabel">Image (PNG / JPG)</label>
        <div class="upload-group">
          <input id="ng_url" placeholder="URL (auto-filled on upload)">
          <input type="file" id="ng_file" accept="image/png,image/jpeg,image/webp,image/gif" style="display:none" onchange="uploadFile('ng_file','ng_url','ng_prev')">
          <button type="button" class="btn btn-ghost btn-small upload-btn" onclick="uploadTrigger('ng_file')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Upload PNG / JPG
          </button>
        </div>
        <img id="ng_prev" class="upload-preview" src="" style="display:none;margin-top:8px;max-height:160px;border-radius:8px;object-fit:cover;">
      </div>
      <div class="a-grid2" style="margin-top:12px;">
        <div class="field"><label class="flabel">Category</label><select id="ng_cat">${buildGalCatOptions()}</select></div>
        <div class="field"><label class="flabel">Caption (optional)</label><input id="ng_caption" placeholder="Short caption"></div>
      </div>
      <div class="save-bar"><button class="btn btn-primary btn-small" onclick="addGallery()">Add to gallery</button></div>
    </div>
    <div class="a-panel">
      <h3>Gallery Categories</h3>
      <p style="font-size:13px;color:#5B7682;margin-bottom:16px;">Manage the navigation categories shown in the Gallery dropdown menu.</p>
      <div id="galCatList"></div>
      <div class="save-bar" style="margin-top:12px;">
        <button class="btn btn-ghost btn-small" onclick="addGalCat()">+ Add category</button>
      </div>
    </div>
    <div class="a-panel"><h3>Images (${list.length})</h3>
      ${list.map(g=>`
        <div class="a-row">
          ${g.image_url?`<img src="${esc(g.image_url)}" style="width:52px;height:40px;object-fit:cover;border-radius:6px;flex-shrink:0;">`:''}
          <div class="ri"><b>${esc(g.category)}</b><span>${esc(g.caption||g.image_url)}</span></div>
          <div class="a-actions"><button class="btn btn-danger btn-small" onclick="deleteGallery(${g.id})">Delete</button></div>
        </div>
      `).join('') || '<p style="color:#8AA1A8;font-size:14px;">No images yet.</p>'}
    </div>
  `;
}
async function addGallery(){
  const image_url = document.getElementById('ng_url').value.trim();
  if(!image_url) return showToast('Please upload an image first.');
  const category = document.getElementById('ng_cat').value;
  const caption = document.getElementById('ng_caption').value.trim();
  await api('/api/gallery', { method:'POST', body: JSON.stringify({image_url, category, caption}) });
  showTab('gallery'); showToast('Image added.');
}
async function deleteGallery(id){
  if(!confirm('Delete this image?')) return;
  await api('/api/gallery/'+id, { method:'DELETE' });
  showTab('gallery'); showToast('Image deleted.');
}

/* ---------------- ABOUT ---------------- */
let _boardMembers = [];
let _committeeMembers = [];

function renderMemberList(members, containerId, removeKey) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!members.length) { el.innerHTML = '<p style="color:#8AA1A8;font-size:13px;margin-bottom:8px;">No members added yet.</p>'; return; }
  el.innerHTML = members.map((m, i) => `
    <div class="a-row" style="margin-bottom:6px;">
      ${m.photo ? `<img src="${esc(m.photo)}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0;">` : `<div style="width:38px;height:38px;border-radius:50%;background:var(--teal-deep);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;">${esc((m.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase())}</div>`}
      <div class="ri"><b>${esc(m.name)}</b><span>${esc(m.role||'')}</span></div>
      <button class="btn btn-danger btn-small" onclick="${removeKey}(${i})">Remove</button>
    </div>`).join('');
}

function removeBoardMember(i){ _boardMembers.splice(i,1); renderMemberList(_boardMembers,'boardList','removeBoardMember'); }
function removeCommitteeMember(i){ _committeeMembers.splice(i,1); renderMemberList(_committeeMembers,'committeeList','removeCommitteeMember'); }

function addBoardMember(){
  const name = document.getElementById('bd_name').value.trim();
  if(!name) return showToast('Name is required.');
  _boardMembers.push({ name, role: document.getElementById('bd_role').value.trim(), bio: document.getElementById('bd_bio').value.trim(), photo: document.getElementById('bd_photo').value.trim() });
  renderMemberList(_boardMembers,'boardList','removeBoardMember');
  ['bd_name','bd_role','bd_bio','bd_photo'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  const prev=document.getElementById('bd_photo_prev'); if(prev){prev.src='';prev.style.display='none';}
  showToast('Board member added. Save changes to keep it.');
}

function addCommitteeMember(){
  const name = document.getElementById('cm_name').value.trim();
  if(!name) return showToast('Name is required.');
  _committeeMembers.push({ name, role: document.getElementById('cm_role').value.trim(), bio: document.getElementById('cm_bio').value.trim(), photo: document.getElementById('cm_photo').value.trim() });
  renderMemberList(_committeeMembers,'committeeList','removeCommitteeMember');
  ['cm_name','cm_role','cm_bio','cm_photo'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  const prev=document.getElementById('cm_photo_prev'); if(prev){prev.src='';prev.style.display='none';}
  showToast('Committee member added. Save changes to keep it.');
}

async function tplAbout(){
  const a = await api('/api/content/about');
  _boardMembers = Array.isArray(a.board) ? [...a.board] : [];
  _committeeMembers = Array.isArray(a.committee) ? [...a.committee] : [];
  return head('About Page','Edit hospital story, mission, vision and leadership messages.') + `
    <div class="a-panel">
      <h3>Section title</h3><div class="field"><input id="ab_title" value="${esc(a.title)}"></div>
      <h3 style="margin-top:18px;">Story — paragraph 1</h3><div class="field"><textarea id="ab_b1" rows="3">${esc(a.body1)}</textarea></div>
      <h3 style="margin-top:18px;">Story — paragraph 2</h3><div class="field"><textarea id="ab_b2" rows="3">${esc(a.body2)}</textarea></div>
      <div class="a-grid2" style="margin-top:18px;">
        <div><h3>Mission</h3><div class="field"><textarea id="ab_mission" rows="3">${esc(a.mission)}</textarea></div></div>
        <div><h3>Vision</h3><div class="field"><textarea id="ab_vision" rows="3">${esc(a.vision)}</textarea></div></div>
      </div>
      <h3 style="margin-top:24px;border-top:1px solid var(--line);padding-top:20px;">Chairman</h3>
      <div class="a-grid2">
        <div class="field"><label class="flabel">Name</label><input id="ab_chair_name" value="${esc(a.chairman_name||'')}"></div>
        <div class="field"><label class="flabel">Photo</label>
          <div class="upload-group">
            <input id="ab_chair_photo" value="${esc(a.chairman_photo||'')}" placeholder="Auto-filled on upload">
            <input type="file" id="ab_chair_photo_file" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="uploadFile('ab_chair_photo_file','ab_chair_photo','ab_chair_photo_prev')">
            <button type="button" class="upload-btn" onclick="uploadTrigger('ab_chair_photo_file')">Upload PNG / JPG</button>
          </div>
          ${a.chairman_photo?`<img id="ab_chair_photo_prev" class="upload-preview" src="${esc(a.chairman_photo)}" style="display:block;margin-top:6px;">`:`<img id="ab_chair_photo_prev" class="upload-preview" src="" style="display:none;margin-top:6px;">`}
        </div>
      </div>
      <div class="field" style="margin-top:12px;"><label class="flabel">Message</label><textarea id="ab_chairman" rows="3">${esc(a.chairman_message||'')}</textarea></div>
      <h3 style="margin-top:20px;">Medical Director</h3>
      <div class="a-grid2">
        <div class="field"><label class="flabel">Name</label><input id="ab_dir_name" value="${esc(a.director_name||'')}"></div>
        <div class="field"><label class="flabel">Photo</label>
          <div class="upload-group">
            <input id="ab_dir_photo" value="${esc(a.director_photo||'')}" placeholder="Auto-filled on upload">
            <input type="file" id="ab_dir_photo_file" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="uploadFile('ab_dir_photo_file','ab_dir_photo','ab_dir_photo_prev')">
            <button type="button" class="upload-btn" onclick="uploadTrigger('ab_dir_photo_file')">Upload PNG / JPG</button>
          </div>
          ${a.director_photo?`<img id="ab_dir_photo_prev" class="upload-preview" src="${esc(a.director_photo)}" style="display:block;margin-top:6px;">`:`<img id="ab_dir_photo_prev" class="upload-preview" src="" style="display:none;margin-top:6px;">`}
        </div>
      </div>
      <div class="field" style="margin-top:12px;"><label class="flabel">Message</label><textarea id="ab_director" rows="3">${esc(a.director_message||'')}</textarea></div>
      <h3 style="margin-top:20px;">Chief Executive Officer (CEO)</h3>
      <div class="a-grid2">
        <div class="field"><label class="flabel">Name</label><input id="ab_ceo_name" value="${esc(a.ceo_name||'')}"></div>
        <div class="field"><label class="flabel">Photo</label>
          <div class="upload-group">
            <input id="ab_ceo_photo" value="${esc(a.ceo_photo||'')}" placeholder="Auto-filled on upload">
            <input type="file" id="ab_ceo_photo_file" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="uploadFile('ab_ceo_photo_file','ab_ceo_photo','ab_ceo_photo_prev')">
            <button type="button" class="upload-btn" onclick="uploadTrigger('ab_ceo_photo_file')">Upload PNG / JPG</button>
          </div>
          ${a.ceo_photo?`<img id="ab_ceo_photo_prev" class="upload-preview" src="${esc(a.ceo_photo)}" style="display:block;margin-top:6px;">`:`<img id="ab_ceo_photo_prev" class="upload-preview" src="" style="display:none;margin-top:6px;">`}
        </div>
      </div>
      <div class="field" style="margin-top:12px;"><label class="flabel">Message</label><textarea id="ab_ceo" rows="3">${esc(a.ceo_message||'')}</textarea></div>
      <h3 style="margin-top:20px;">Managing Director</h3>
      <div class="a-grid2">
        <div class="field"><label class="flabel">Name</label><input id="ab_md_name" value="${esc(a.md_name||'')}"></div>
        <div class="field"><label class="flabel">Photo</label>
          <div class="upload-group">
            <input id="ab_md_photo" value="${esc(a.md_photo||'')}" placeholder="Auto-filled on upload">
            <input type="file" id="ab_md_photo_file" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="uploadFile('ab_md_photo_file','ab_md_photo','ab_md_photo_prev')">
            <button type="button" class="upload-btn" onclick="uploadTrigger('ab_md_photo_file')">Upload PNG / JPG</button>
          </div>
          ${a.md_photo?`<img id="ab_md_photo_prev" class="upload-preview" src="${esc(a.md_photo)}" style="display:block;margin-top:6px;">`:`<img id="ab_md_photo_prev" class="upload-preview" src="" style="display:none;margin-top:6px;">`}
        </div>
      </div>
      <div class="field" style="margin-top:12px;"><label class="flabel">Message</label><textarea id="ab_md" rows="3">${esc(a.md_message||'')}</textarea></div>
      <h3 style="margin-top:20px;">Hospital history</h3><div class="field"><textarea id="ab_history" rows="3">${esc(a.history||'')}</textarea></div>
      <h3 style="margin-top:18px;">Values</h3><div class="field"><textarea id="ab_values" rows="2">${esc(a.values||'')}</textarea></div>
      <h3 style="margin-top:24px;border-top:1px solid var(--line);padding-top:20px;">Board of Directors</h3>
      <p style="font-size:13px;color:#8AA1A8;margin-bottom:14px;">Shown on the About page under "Board of Directors". Add one member at a time.</p>
      <div id="boardList"></div>
      <div class="a-panel" style="background:#f8fafc;margin-top:10px;">
        <h4 style="margin-bottom:12px;">Add member</h4>
        <div class="a-grid2">
          <div class="field"><label class="flabel">Name</label><input id="bd_name" placeholder="Full name"></div>
          <div class="field"><label class="flabel">Role / Designation</label><input id="bd_role" placeholder="e.g. Chairperson"></div>
        </div>
        <div class="field" style="margin-top:10px;"><label class="flabel">Bio (optional)</label><textarea id="bd_bio" rows="2" placeholder="Short biography"></textarea></div>
        <div class="field" style="margin-top:10px;"><label class="flabel">Photo</label>
          <div class="upload-group">
            <input id="bd_photo" placeholder="Photo URL (auto-filled on upload)">
            <input type="file" id="bd_photo_file" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="uploadFile('bd_photo_file','bd_photo','bd_photo_prev')">
            <button type="button" class="upload-btn" onclick="uploadTrigger('bd_photo_file')">Upload PNG / JPG</button>
          </div>
          <img id="bd_photo_prev" class="upload-preview" src="" style="display:none;margin-top:6px;">
        </div>
        <button class="btn btn-ghost btn-small" style="margin-top:10px;" onclick="addBoardMember()">+ Add to Board</button>
      </div>

      <h3 style="margin-top:28px;border-top:1px solid var(--line);padding-top:20px;">Management Committee</h3>
      <p style="font-size:13px;color:#8AA1A8;margin-bottom:14px;">Shown on the About page under "Management Committee".</p>
      <div id="committeeList"></div>
      <div class="a-panel" style="background:#f8fafc;margin-top:10px;">
        <h4 style="margin-bottom:12px;">Add member</h4>
        <div class="a-grid2">
          <div class="field"><label class="flabel">Name</label><input id="cm_name" placeholder="Full name"></div>
          <div class="field"><label class="flabel">Role / Designation</label><input id="cm_role" placeholder="e.g. Chief Medical Officer"></div>
        </div>
        <div class="field" style="margin-top:10px;"><label class="flabel">Bio (optional)</label><textarea id="cm_bio" rows="2" placeholder="Short biography"></textarea></div>
        <div class="field" style="margin-top:10px;"><label class="flabel">Photo</label>
          <div class="upload-group">
            <input id="cm_photo" placeholder="Photo URL (auto-filled on upload)">
            <input type="file" id="cm_photo_file" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="uploadFile('cm_photo_file','cm_photo','cm_photo_prev')">
            <button type="button" class="upload-btn" onclick="uploadTrigger('cm_photo_file')">Upload PNG / JPG</button>
          </div>
          <img id="cm_photo_prev" class="upload-preview" src="" style="display:none;margin-top:6px;">
        </div>
        <button class="btn btn-ghost btn-small" style="margin-top:10px;" onclick="addCommitteeMember()">+ Add to Committee</button>
      </div>

      <h3 style="margin-top:24px;border-top:1px solid var(--line);padding-top:20px;">Hospital Building Image</h3>
      <p style="font-size:13px;color:#8AA1A8;margin-bottom:12px;">Displayed on the About page. Upload a photo of the hospital building.</p>
      <div class="field">
        <div class="upload-group">
          <input id="ab_hosp_img" value="${esc(a.hospital_image||'')}" placeholder="Image URL (auto-filled on upload)">
          <input type="file" id="ab_hosp_img_file" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="uploadFile('ab_hosp_img_file','ab_hosp_img','ab_hosp_img_prev')">
          <button type="button" class="upload-btn" onclick="uploadTrigger('ab_hosp_img_file')">Upload image</button>
        </div>
        ${a.hospital_image?`<img id="ab_hosp_img_prev" class="upload-preview" src="${esc(a.hospital_image)}" style="display:block;margin-top:8px;width:100%;max-height:200px;object-fit:cover;border-radius:10px;">`:`<img id="ab_hosp_img_prev" class="upload-preview" src="" style="display:none;margin-top:8px;width:100%;max-height:200px;object-fit:cover;border-radius:10px;">`}
      </div>
      <div class="save-bar"><button class="btn btn-primary btn-small" onclick="saveAbout()">Save changes</button></div>
    </div>
  `;
  // populate member lists after innerHTML is set
  setTimeout(()=>{
    renderMemberList(_boardMembers,'boardList','removeBoardMember');
    renderMemberList(_committeeMembers,'committeeList','removeCommitteeMember');
  },0);
}
async function saveAbout(){
  const body = {
    title: document.getElementById('ab_title').value,
    body1: document.getElementById('ab_b1').value,
    body2: document.getElementById('ab_b2').value,
    mission: document.getElementById('ab_mission').value,
    vision: document.getElementById('ab_vision').value,
    chairman_name: document.getElementById('ab_chair_name').value,
    chairman_photo: document.getElementById('ab_chair_photo').value,
    chairman_message: document.getElementById('ab_chairman').value,
    director_name: document.getElementById('ab_dir_name').value,
    director_photo: document.getElementById('ab_dir_photo').value,
    director_message: document.getElementById('ab_director').value,
    ceo_name: document.getElementById('ab_ceo_name').value,
    ceo_photo: document.getElementById('ab_ceo_photo').value,
    ceo_message: document.getElementById('ab_ceo').value,
    md_name: document.getElementById('ab_md_name').value,
    md_photo: document.getElementById('ab_md_photo').value,
    md_message: document.getElementById('ab_md').value,
    history: document.getElementById('ab_history').value,
    values: document.getElementById('ab_values').value,
    hospital_image: document.getElementById('ab_hosp_img').value,
    board: _boardMembers,
    committee: _committeeMembers
  };
  await api('/api/content/about', { method:'PUT', body: JSON.stringify(body) });
  showToast('About page updated.');
}

/* ---------------- APPOINTMENTS ---------------- */
async function tplAppointments(){
  const [list, smtp] = await Promise.all([api('/api/appointments'), api('/api/smtp-status')]);
  const smtpBanner = smtp.configured
    ? `<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:#E9F6D6;border:1px solid #b4d97a;border-radius:10px;font-size:13px;font-weight:600;color:#3a6e10;margin-bottom:18px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        Email confirmations active — sent from <em>${esc(smtp.from||'')}</em>
      </div>`
    : `<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:#FFF3CD;border:1px solid #ffc107;border-radius:10px;font-size:13px;font-weight:600;color:#7a5c00;margin-bottom:18px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Email not configured — open <code>.env</code> and set SMTP_USER &amp; SMTP_PASS to enable confirmation emails.
      </div>`;
  return head('Appointments','Review and approve patient appointment requests. Approved requests trigger a confirmation email.') + `
    <div class="a-panel">
      ${smtpBanner}
      ${list.map(a=>`
        <div class="a-row">
          <div class="ri">
            <b>${esc(a.patient_name)}</b>
            <span>${esc(a.phone)}${a.email ? ` · <a href="mailto:${esc(a.email)}" style="color:var(--teal);">${esc(a.email)}</a>` : ''}</span>
            <span style="margin-top:2px;">${esc(a.department||'')}${a.doctor&&a.doctor!=='No preference'?' · Dr. '+esc(a.doctor):''} · ${esc(a.appt_date||'—')} ${esc(a.appt_time||'')}</span>
          </div>
          <span class="badge ${a.status==='Approved'?'green':a.status==='Rejected'?'grey':a.status==='Pending'?'amber':'blue'}">${esc(a.status)}</span>
          <div class="a-actions">
            ${a.status!=='Approved'?`<button class="btn btn-ghost btn-small" onclick="setApptStatus(${a.id},'Approved')">✓ Approve</button>`:''}
            ${a.status==='Pending'?`<button class="btn btn-ghost btn-small" onclick="setApptStatus(${a.id},'Rejected')">Reject</button>`:''}
            <button class="btn btn-danger btn-small" onclick="deleteAppt(${a.id})">Delete</button>
          </div>
        </div>
      `).join('') || '<p style="color:#8AA1A8;font-size:14px;">No appointment requests yet.</p>'}
      <div class="save-bar">
        <button class="btn btn-outline btn-small" onclick="exportCSV()">Export CSV</button>
        <button class="btn btn-primary btn-small" onclick="exportPDF()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          Download PDF
        </button>
      </div>
    </div>
  `;
}
async function setApptStatus(id, status){
  await api('/api/appointments/'+id, { method:'PUT', body: JSON.stringify({status}) });
  showTab('appointments'); showToast('Appointment ' + status.toLowerCase() + '.');
}
async function deleteAppt(id){
  if(!confirm('Delete this appointment request?')) return;
  await api('/api/appointments/'+id, { method:'DELETE' });
  showTab('appointments'); showToast('Appointment deleted.');
}
async function exportCSV(){
  const list = await api('/api/appointments');
  const rows = [['Name','Phone','Email','Department','Doctor','Date','Time','Status'], ...list.map(a=>[a.patient_name,a.phone,a.email||'',a.department,a.doctor,a.appt_date,a.appt_time,a.status])];
  const csv = rows.map(r=>r.map(c=>`"${(c||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='appointments.csv'; a.click();
  URL.revokeObjectURL(url);
}

async function exportPDF(){
  const list = await api('/api/appointments');
  const generated = new Date().toLocaleString('en-NP',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});
  const statusClass = s => s==='Approved'?'green':s==='Pending'?'amber':'grey';
  const rows = list.map((a,i)=>`
    <tr>
      <td>${i+1}</td>
      <td><strong>${esc(a.patient_name||'')}</strong></td>
      <td>${esc(a.phone||'')}</td>
      <td style="font-size:11px;">${esc(a.email||'—')}</td>
      <td>${esc(a.department||'—')}</td>
      <td>${esc(a.doctor||'No preference')}</td>
      <td>${esc(a.appt_date||'—')}</td>
      <td>${esc(a.appt_time||'—')}</td>
      <td><span class="badge ${statusClass(a.status)}">${esc(a.status||'')}</span></td>
      <td>${esc((a.created_at||'').slice(0,10))}</td>
    </tr>`).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Appointments — Sanjeevani Hospital</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Arial,Helvetica,sans-serif;padding:32px;color:#0F2733;font-size:13px;}
    .header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #0A4760;}
    .header h1{font-size:20px;color:#0A4760;margin-bottom:4px;}
    .header p{font-size:12px;color:#5B7682;}
    .meta{font-size:11px;color:#8AA1A8;text-align:right;}
    table{width:100%;border-collapse:collapse;margin-top:4px;}
    thead tr{background:#0A4760;}
    th{color:#fff;padding:9px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;}
    td{padding:8px 10px;border-bottom:1px solid #e2eaed;vertical-align:middle;}
    tr:nth-child(even) td{background:#f5f9fb;}
    td strong{font-weight:700;}
    .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10.5px;font-weight:700;}
    .green{background:#d4edda;color:#155724;}
    .amber{background:#fff3cd;color:#856404;}
    .grey{background:#e2e8ec;color:#4a6372;}
    .footer{margin-top:20px;display:flex;justify-content:space-between;font-size:11px;color:#8AA1A8;border-top:1px solid #e2eaed;padding-top:12px;}
    @media print{body{padding:18px;} @page{margin:15mm;}}
  </style></head>
  <body>
    <div class="header">
      <div>
        <h1>Sanjeevani Hospital Pokhara</h1>
        <p>Appointment Records — ${esc(generated)}</p>
      </div>
      <div class="meta">Total records: ${list.length}<br>Lakeside Road, Pokhara-6, Nepal</div>
    </div>
    <table>
      <thead><tr>
        <th>#</th><th>Patient Name</th><th>Phone</th><th>Email</th><th>Department</th>
        <th>Doctor</th><th>Appt. Date</th><th>Time</th><th>Status</th><th>Booked On</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="10" style="text-align:center;color:#8AA1A8;padding:20px;">No appointments yet.</td></tr>'}</tbody>
    </table>
    <div class="footer">
      <span>Sanjeevani Hospital CMS · Confidential</span>
      <span>Printed: ${esc(generated)}</span>
    </div>
    <script>window.onload=()=>{ window.print(); };<\/script>
  </body></html>`;
  const win = window.open('','_blank');
  if(!win){ showToast('Allow pop-ups to download PDF.'); return; }
  win.document.write(html);
  win.document.close();
}

/* ---------------- SEO ---------------- */
async function tplSeo(){
  const s = await api('/api/content/seo');
  return head('SEO','Edit metadata used across the site.') + `
    <div class="a-panel">
      <h3>Meta title</h3><div class="field"><input id="seo_title" value="${esc(s.metaTitle||'')}"></div>
      <h3 style="margin-top:18px;">Meta description</h3><div class="field"><textarea id="seo_desc" rows="3">${esc(s.metaDescription||'')}</textarea></div>
      <h3 style="margin-top:18px;">Keywords (comma separated)</h3><div class="field"><input id="seo_kw" value="${esc(s.keywords||'')}"></div>
      <h3 style="margin-top:18px;">Open Graph image URL</h3><div class="field"><input id="seo_og" value="${esc(s.ogImage||'')}"></div>
      <div class="save-bar"><button class="btn btn-primary btn-small" onclick="saveSeo()">Save changes</button></div>
    </div>
  `;
}
async function saveSeo(){
  const body = {
    metaTitle: document.getElementById('seo_title').value,
    metaDescription: document.getElementById('seo_desc').value,
    keywords: document.getElementById('seo_kw').value,
    ogImage: document.getElementById('seo_og').value
  };
  await api('/api/content/seo', { method:'PUT', body: JSON.stringify(body) });
  showToast('SEO settings updated.');
}

/* ---------------- CONTACT ---------------- */
async function tplContact(){
  const c = await api('/api/content/contact');
  return head('Contact & Footer','Edit phone numbers, email and address shown sitewide.') + `
    <div class="a-panel">
      <div class="a-grid2">
        <div class="field"><label class="flabel">Emergency phone</label><input id="ct_em" value="${esc(c.emergencyPhone||'')}"></div>
        <div class="field"><label class="flabel">Reception phone</label><input id="ct_rc" value="${esc(c.receptionPhone||'')}"></div>
      </div>
      <div class="field" style="margin-top:14px;"><label class="flabel">Email</label><input id="ct_em2" value="${esc(c.email||'')}"></div>
      <div class="field" style="margin-top:14px;"><label class="flabel">Address</label><textarea id="ct_addr" rows="2">${esc(c.address||'')}</textarea></div>
      <div class="field" style="margin-top:14px;"><label class="flabel">WhatsApp number</label><input id="ct_wa" value="${esc(c.whatsappNumber||'')}"></div>
      <div class="field" style="margin-top:14px;">
        <label class="flabel">Google Maps embed URL</label>
        <input id="ct_map" value="${esc(c.mapEmbedUrl||'')}" placeholder="Paste the src URL from Google Maps → Share → Embed a map">
        <p style="font-size:12px;color:#8AA1A8;margin:4px 0 0;">Go to Google Maps → search your location → Share → Embed a map → copy the src="..." URL only.</p>
      </div>
      <div class="field" style="margin-top:14px;">
        <label class="flabel">Google Maps share link</label>
        <input id="ct_map_share" value="${esc(c.mapShareUrl||'')}" placeholder="e.g. https://maps.google.com/?q=Sanjeevani+Hospital+Pokhara">
        <p style="font-size:12px;color:#8AA1A8;margin:4px 0 0;">This link is used for WhatsApp / Messenger / Email sharing buttons on the website.</p>
      </div>
      <div class="save-bar"><button class="btn btn-primary btn-small" onclick="saveContact()">Save changes</button></div>
    </div>
  `;
}
async function saveContact(){
  const body = {
    emergencyPhone: document.getElementById('ct_em').value,
    receptionPhone: document.getElementById('ct_rc').value,
    email: document.getElementById('ct_em2').value,
    address: document.getElementById('ct_addr').value,
    whatsappNumber: document.getElementById('ct_wa').value,
    mapEmbedUrl: document.getElementById('ct_map').value,
    mapShareUrl: document.getElementById('ct_map_share').value
  };
  await api('/api/content/contact', { method:'PUT', body: JSON.stringify(body) });
  showToast('Contact details updated.');
}

/* ---------------- ACCOUNT ---------------- */
function tplAccount(){
  return head('Account','Update your login email and password.') + `
    <div class="a-panel" style="margin-bottom:24px;">
      <h3 style="font-size:14px;font-weight:700;color:var(--teal-deep);margin:0 0 16px;">Login Email (used for password reset)</h3>
      <div class="field"><label class="flabel">New email address</label><input id="acc_email" type="email" placeholder="sanjeevanihospitalpokhara@gmail.com"></div>
      <div class="field" style="margin-top:12px;"><label class="flabel">Confirm current password</label><input id="acc_email_pass" type="password" placeholder="Enter current password"></div>
      <div class="save-bar"><button class="btn btn-ghost btn-small" onclick="updateEmail()">Save email</button></div>
    </div>
    <div class="a-panel">
      <h3 style="font-size:14px;font-weight:700;color:var(--teal-deep);margin:0 0 16px;">Change Password</h3>
      <div class="field"><label class="flabel">Current password</label><input id="acc_cur" type="password"></div>
      <div class="field" style="margin-top:12px;"><label class="flabel">New password</label><input id="acc_new" type="password"></div>
      <div class="save-bar"><button class="btn btn-primary btn-small" onclick="changePassword()">Update password</button></div>
    </div>
  `;
}
async function updateEmail(){
  const email = document.getElementById('acc_email').value.trim();
  const currentPassword = document.getElementById('acc_email_pass').value;
  if(!email || !currentPassword){ showToast('Email and current password are required.'); return; }
  try{
    await api('/api/auth/update-email', { method:'POST', body: JSON.stringify({email, currentPassword}) });
    showToast('Email updated successfully.');
    document.getElementById('acc_email').value='';
    document.getElementById('acc_email_pass').value='';
  }catch(err){ showToast(err.message); }
}
async function changePassword(){
  const currentPassword = document.getElementById('acc_cur').value;
  const newPassword = document.getElementById('acc_new').value;
  try{
    await api('/api/auth/change-password', { method:'POST', body: JSON.stringify({currentPassword, newPassword}) });
    showToast('Password updated.');
    document.getElementById('acc_cur').value=''; document.getElementById('acc_new').value='';
  }catch(err){ showToast(err.message); }
}

/* ---------------- FORGOT / RESET PASSWORD ---------------- */
function showForgot(e){ if(e) e.preventDefault(); document.getElementById('loginPanel').style.display='none'; document.getElementById('forgotPanel').style.display='block'; setTimeout(()=>document.getElementById('forgotEmail').focus(),50); }
function showLogin(e){ if(e) e.preventDefault(); document.getElementById('forgotPanel').style.display='none'; document.getElementById('resetPanel').style.display='none'; document.getElementById('loginPanel').style.display='block'; }
function showResetPanel(){ document.getElementById('loginPanel').style.display='none'; document.getElementById('resetPanel').style.display='block'; setTimeout(()=>document.getElementById('resetPass').focus(),50); }

async function sendReset(){
  const email = document.getElementById('forgotEmail').value.trim();
  const err = document.getElementById('forgotErr');
  const ok = document.getElementById('forgotOk');
  err.style.display='none'; ok.style.display='none';
  if(!email){ err.textContent='Please enter your email address.'; err.style.display='block'; return; }
  try{
    const res = await fetch('/api/auth/forgot-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
    const data = await res.json();
    if(!res.ok){ err.textContent=data.error||'Could not send reset email.'; err.style.display='block'; return; }
    ok.textContent = data.message || 'Reset link sent! Check your email inbox.';
    ok.style.display='block';
  }catch(e){ err.textContent='Network error. Please try again.'; err.style.display='block'; }
}

async function doReset(){
  const pass = document.getElementById('resetPass').value;
  const pass2 = document.getElementById('resetPass2').value;
  const err = document.getElementById('resetErr');
  err.style.display='none';
  if(pass.length < 6){ err.textContent='Password must be at least 6 characters.'; err.style.display='block'; return; }
  if(pass !== pass2){ err.textContent='Passwords do not match.'; err.style.display='block'; return; }
  const token = new URLSearchParams(location.search).get('token');
  try{
    const res = await fetch('/api/auth/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token, newPassword:pass})});
    const data = await res.json();
    if(!res.ok){ err.textContent=data.error||'Reset failed.'; err.style.display='block'; return; }
    showToast('Password updated! Please sign in with your new password.');
    history.replaceState(null,'','/admin/');
    showLogin();
  }catch(e){ err.textContent='Network error. Please try again.'; err.style.display='block'; }
}

/* ---------------- INIT ---------------- */
// Show reset panel if URL has a password reset token
if(new URLSearchParams(location.search).get('token')) showResetPanel();
if(TOKEN){ showShell(); }
document.getElementById('loginPass').addEventListener('keydown', e=>{ if(e.key==='Enter') tryLogin(); });
