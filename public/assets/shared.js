/* shared.js — loaded by all sub-pages (not index.html which uses app.js) */

function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function initials(name){ return (name||'').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase(); }
function parseAvail(raw){ if(!raw) return null; try{ return JSON.parse(raw); }catch(e){ return raw?{days:[],hours:raw}:null; } }
function schedDays(av){ return av?.schedule ? Object.keys(av.schedule) : (av?.days||[]); }

function parseHoursToMinMax(str){
  if(!str) return null;
  // split on – — or plain hyphen surrounded by spaces
  const parts = str.split(/\s*[–—]\s*|\s+-\s+/);
  if(parts.length < 2) return null;
  const toHHMM = s => {
    s = s.trim();
    const ap = /([AP]M)$/i.exec(s);
    const m = /(\d{1,2}):(\d{2})/.exec(s);
    if(!m) return null;
    let h = parseInt(m[1]); const min = m[2];
    if(ap){
      if(/PM/i.test(ap[1]) && h!==12) h+=12;
      if(/AM/i.test(ap[1]) && h===12) h=0;
    }
    return String(h).padStart(2,'0')+':'+min;
  };
  const mn = toHHMM(parts[0]), mx = toHHMM(parts[1]);
  return (mn && mx) ? {min:mn, max:mx} : null;
}

const _DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const _ALL_DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
let _dateChangeHandler = null;

function generateTimeSlots(hours) {
  const range = parseHoursToMinMax(hours);
  if (!range) return [];
  const slots = [];
  let [h, m] = range.min.split(':').map(Number);
  const [endH, endM] = range.max.split(':').map(Number);
  while (h * 60 + m < endH * 60 + endM) {
    const ampm = h < 12 ? 'AM' : 'PM';
    const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
    slots.push(`${dh}:${String(m).padStart(2,'0')} ${ampm}`);
    m += 30; if (m >= 60) { h++; m -= 60; }
  }
  return slots;
}

function populateTimeSelect(slots) {
  const sel = document.getElementById('appt_time');
  if (!sel) return;
  if (!slots || !slots.length) {
    sel.innerHTML = '<option value="">— No preference / call to confirm —</option>';
    sel.disabled = false;
    return;
  }
  sel.innerHTML = '<option value="">— Choose a time slot —</option>' +
    slots.map(s => `<option value="${s}">${s}</option>`).join('');
  sel.disabled = false;
}

let _departments = [];

function onDeptChange(){
  const deptVal = document.getElementById('apptDept')?.value || '';
  const docSel  = document.getElementById('apptDoctor');
  if(!docSel) return;
  const filtered = deptVal
    ? _doctors.filter(d => (d.department||d.specialty||'') === deptVal && d.status === 'Active')
    : _doctors.filter(d => d.status === 'Active');
  docSel.innerHTML = '<option value="">No preference</option>' +
    filtered.map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join('');
  const hint = document.getElementById('docAvailHint');
  if(hint) hint.style.display = 'none';
  const timeIn = document.getElementById('appt_time');
  if(timeIn) timeIn.innerHTML = '<option value="">— Select a doctor and date —</option>';
  if(_dateChangeHandler){ const dateIn=document.getElementById('appt_date'); if(dateIn) dateIn.removeEventListener('change',_dateChangeHandler); _dateChangeHandler=null; }
}

async function onDoctorChange(doctorId){
  const hint   = document.getElementById('docAvailHint');
  const dateIn = document.getElementById('appt_date');
  const timeIn = document.getElementById('appt_time');

  if(_dateChangeHandler && dateIn){ dateIn.removeEventListener('change',_dateChangeHandler); _dateChangeHandler=null; }

  if(!doctorId){
    if(hint) hint.style.display='none';
    if(timeIn) timeIn.innerHTML='<option value="">— Select a doctor and date —</option>';
    return;
  }

  const doc  = _doctors.find(d => String(d.id) === String(doctorId));
  const av   = doc ? parseAvail(doc.availability) : null;
  const days = schedDays(av);

  if(!days.length){
    if(hint) hint.style.display='none';
    if(timeIn) timeIn.innerHTML='<option value="">— No schedule set, call to confirm —</option>';
    return;
  }

  if(hint){
    // Build time range label
    function to12h(t){ const [h,m]=t.split(':').map(Number); const ap=h<12?'AM':'PM'; const dh=h===0?12:h>12?h-12:h; return `${dh}:${String(m).padStart(2,'0')} ${ap}`; }
    let timeLabel = '';
    if(av?.schedule){
      const vals = Object.values(av.schedule).filter(Boolean);
      if(vals.length){ const first=vals[0]; timeLabel=`${to12h(first.start)} – ${to12h(first.end)}`; }
    } else if(av?.hours){ timeLabel = av.hours; }

    const pills = _ALL_DAYS.map(dy => {
      const on = days.includes(dy);
      return `<span class="day-pill${on?' on':''}">${dy.slice(0,3)}</span>`;
    }).join('');
    hint.innerHTML = `
      <div class="avail-hint-title">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        Doctor's available schedule
      </div>
      <div class="avail-hint-days">${pills}</div>
      ${timeLabel ? `<div class="avail-hint-time"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Consulting hours: <strong>${timeLabel}</strong></div>` : ''}
      <div id="avDateWarn" class="avail-hint-warn" style="display:none;"></div>`;
    hint.style.display='block';
  }

  if(timeIn) timeIn.innerHTML='<option value="">— Pick a date to see slots —</option>';

  if(dateIn){
    const today = new Date(); today.setHours(0,0,0,0);
    dateIn.min = today.toISOString().split('T')[0];

    _dateChangeHandler = async function(){
      if(!this.value) return;
      const [y,mo,d]=this.value.split('-').map(Number);
      const dayName=_DAY_NAMES[new Date(y,mo-1,d).getDay()];
      const warn=document.getElementById('avDateWarn');
      if(!days.includes(dayName)){
        if(warn){ warn.textContent=`${dayName} is not available. Choose: ${days.join(', ')}.`; warn.style.display='flex'; }
        this.value='';
        if(timeIn) timeIn.innerHTML='<option value="">— Pick an available day —</option>';
        return;
      }
      if(warn) warn.style.display='none';
      if(timeIn) timeIn.innerHTML='<option value="">Loading slots…</option>';
      try{
        const r=await fetch(`/api/slots?doctor_id=${doctorId}&date=${this.value}`);
        const {slots}=await r.json();
        if(!slots||!slots.length){
          timeIn.innerHTML='<option value="">No slots available for this date</option>';
        } else {
          timeIn.innerHTML='<option value="">— Choose a time slot —</option>'+
            slots.map(s=>`<option value="${s}">${s}</option>`).join('');
        }
      }catch(e){ timeIn.innerHTML='<option value="">Error loading slots</option>'; }
    };
    dateIn.addEventListener('change', _dateChangeHandler);
    if(dateIn.value) dateIn.dispatchEvent(new Event('change'));
  }
}

function updateDocAvailHint(doctorId){ onDoctorChange(doctorId); }

let _doctors = [];

function initCustomSelect(sel, onChangeCb){
  const wrap = document.createElement('div');
  wrap.className = 'csel-wrap';
  sel.parentNode.insertBefore(wrap, sel);
  wrap.appendChild(sel);
  sel.style.display = 'none';
  const CHEV = `<svg class="csel-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'csel-trigger placeholder';
  const dropdown = document.createElement('div');
  dropdown.className = 'csel-dropdown';
  wrap.insertBefore(trigger, sel);
  wrap.insertBefore(dropdown, sel);
  function buildList(){
    const cur = sel.value;
    trigger.innerHTML = '';
    dropdown.innerHTML = '';
    const curOpt = Array.from(sel.options).find(o=>o.value===cur);
    const label = document.createTextNode(curOpt && curOpt.value ? curOpt.text : (sel.options[0]?.text||'— Select —'));
    trigger.appendChild(label);
    trigger.insertAdjacentHTML('beforeend', CHEV);
    trigger.classList.toggle('placeholder', !curOpt || !curOpt.value);
    Array.from(sel.options).forEach(opt => {
      if(opt.disabled) return;
      const div = document.createElement('div');
      div.className = 'csel-option' + (opt.value === cur ? ' active' : '');
      div.textContent = opt.text;
      div.addEventListener('click', () => {
        sel.value = opt.value;
        sel.dispatchEvent(new Event('change'));
        wrap.classList.remove('open');
        buildList();
        if(onChangeCb) onChangeCb(opt.value);
      });
      dropdown.appendChild(div);
    });
  }
  trigger.addEventListener('click', e => { e.stopPropagation(); wrap.classList.toggle('open'); buildList(); });
  document.addEventListener('click', e => { if(!wrap.contains(e.target)) wrap.classList.remove('open'); });
  new MutationObserver(buildList).observe(sel, {childList:true});
  buildList();
}

function showToast(msg){
  const t=document.getElementById('toast');
  if(!t) return;
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2500);
}

function toggleMobileMenu(){
  document.getElementById('mobileMenu')?.classList.toggle('open');
  document.getElementById('hamburger')?.classList.toggle('open');
}
function closeMobileMenu(){
  document.getElementById('mobileMenu')?.classList.remove('open');
  document.getElementById('hamburger')?.classList.remove('open');
}
function toggleMM(btn){
  const group = btn.closest('.mm-group');
  if(!group) return;
  const isOpen = group.classList.toggle('open');
  // Close other open groups
  document.querySelectorAll('.mm-group.open').forEach(g => { if(g !== group) g.classList.remove('open'); });
  group.classList.toggle('open', isOpen);
}

// Dropdown tap support: first tap opens menu, second tap follows link
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('.nav-item-dropdown').forEach(function(drop){
    const trigger = drop.querySelector('.nav-drop-trigger');
    if(!trigger) return;
    trigger.addEventListener('click', function(e){
      const isOpen = drop.classList.contains('open');
      // close all other dropdowns
      document.querySelectorAll('.nav-item-dropdown.open').forEach(d=>d.classList.remove('open'));
      if(!isOpen){
        e.preventDefault();
        drop.classList.add('open');
      }
      // if already open: let the click navigate normally
    });
  });
  // click outside closes dropdowns
  document.addEventListener('click', function(e){
    if(!e.target.closest('.nav-item-dropdown')){
      document.querySelectorAll('.nav-item-dropdown.open').forEach(d=>d.classList.remove('open'));
    }
  });
});

function setActivePage(){
  const path = window.location.pathname;
  document.querySelectorAll('nav.links a, .mobile-menu a').forEach(a=>{
    const href = a.getAttribute('href')||'';
    const match = href && href !== '/' && href !== '/#contact' && path.endsWith(href.replace(/^\//,''));
    a.classList.toggle('active', match);
  });
}

function getNextAvailable(days){
  if(!days||!days.length) return null;
  const names=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const today = new Date().getDay();
  for(let i=1;i<=7;i++){
    const name=names[(today+i)%7];
    if(days.includes(name)){
      if(i===1) return 'Tomorrow';
      return name;
    }
  }
  return null;
}

function bookWithDoctor(doctorName, deptName){
  const deptSel=document.getElementById('apptDept');
  if(deptSel && deptName){
    for(let i=0;i<deptSel.options.length;i++){
      if(deptSel.options[i].text===deptName){ deptSel.selectedIndex=i; break; }
    }
    onDeptChange();
  }
  const docSel=document.getElementById('apptDoctor');
  if(docSel){
    for(let i=0;i<docSel.options.length;i++){
      if(docSel.options[i].text===doctorName){ docSel.selectedIndex=i; break; }
    }
    onDoctorChange(docSel.value);
  }
  document.getElementById('appointment')?.scrollIntoView({behavior:'smooth'});
}

async function initShared(){
  setActivePage();
  try{
    const res=await fetch('/api/site');
    const data=await res.json();
    const c=data.contact||{};
    const telHref='tel:'+String(c.emergencyPhone||'').replace(/[^0-9+]/g,'');
    const nav=document.getElementById('navEmergency');
    const flt=document.getElementById('emgFloat');
    if(nav) nav.href=telHref;
    if(flt) flt.href=telHref;
    const tbPhone = c.receptionPhone || c.emergencyPhone || '';
    if(tbPhone){
      const el = document.getElementById('tbPhone');
      if(el){ el.href = 'tel:' + tbPhone.replace(/[^0-9+]/g,''); el.style.display='flex'; }
      const txt = document.getElementById('tbPhoneText');
      if(txt) txt.textContent = tbPhone;
    }
    const tbAddr = c.address || '';
    if(tbAddr){
      const el = document.getElementById('tbLocation');
      if(el) el.style.display = 'flex';
      const txt = document.getElementById('tbLocationText');
      if(txt) txt.textContent = tbAddr;
    }
    const footer=document.getElementById('footAddress');
    if(footer) footer.textContent=c.address||'';
    const fList=document.getElementById('footContactList');
    if(fList) fList.innerHTML=`
      <li>${esc(c.emergencyPhone||'')} (Emergency)</li>
      <li>${esc(c.receptionPhone||'')} (Reception)</li>
      <li>${esc(c.email||'')}</li>
      <li>${esc(c.address||'')}</li>`;
    buildGalleryNav(data.gallery_nav || []);
    return data;
  }catch(e){ return null; }
}

function buildGalleryNav(cats){
  const menu = document.getElementById('galleryNavMenu');
  const mobileSub = document.getElementById('galleryMobileSub');

  // Desktop dropdown
  if(menu && cats.length){
    const SUB_ARROW = `<svg style="margin-left:auto;flex-shrink:0" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
    let html = `<a href="/gallery.html">All Photos</a><div class="drop-divider"></div>`;
    cats.forEach(cat => {
      const slug = encodeURIComponent(cat.name);
      if(cat.children && cat.children.length){
        html += `<div class="nav-drop-item-parent">
          <a href="/gallery.html?cat=${slug}">${esc(cat.name)} ${SUB_ARROW}</a>
          <div class="nav-drop-sub">`;
        cat.children.forEach(child => {
          const childSlug = encodeURIComponent(cat.name + ' > ' + child.name);
          html += `<a href="/gallery.html?cat=${childSlug}">${esc(child.name)}</a>`;
          if(child.children && child.children.length){
            child.children.forEach(gc => {
              const gcSlug = encodeURIComponent(cat.name + ' > ' + child.name + ' > ' + gc.name);
              html += `<a href="/gallery.html?cat=${gcSlug}" style="padding-left:22px">↳ ${esc(gc.name)}</a>`;
            });
          }
        });
        html += `</div></div>`;
      } else {
        html += `<a href="/gallery.html?cat=${slug}">${esc(cat.name)}</a>`;
      }
    });
    menu.innerHTML = html;
  }

  // Mobile collapsible submenu — dynamically mirrors desktop categories
  if(mobileSub){
    let mHtml = '';
    cats.forEach(cat => {
      const slug = encodeURIComponent(cat.name);
      mHtml += `<a href="/gallery.html?cat=${slug}" onclick="closeMobileMenu()">${esc(cat.name)}</a>`;
      (cat.children||[]).forEach(child => {
        const childSlug = encodeURIComponent(cat.name + ' > ' + child.name);
        mHtml += `<a href="/gallery.html?cat=${childSlug}" onclick="closeMobileMenu()" class="mm-sub-child">↳ ${esc(child.name)}</a>`;
      });
    });
    mobileSub.innerHTML = mHtml || '<a href="/gallery.html" onclick="closeMobileMenu()">All Photos</a>';
  }
}

const PHONE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.28h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6 6l.96-.94a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.72 16z"/></svg>`;
