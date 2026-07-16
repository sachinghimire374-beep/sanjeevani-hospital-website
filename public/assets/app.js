function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function initials(name){ return (name||'').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase(); }
function fmtDate(iso){
  if(!iso) return '';
  const ms=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const d=new Date(iso.slice(0,10)+'T00:00:00');
  return `${d.getDate()} ${ms[d.getMonth()]} ${d.getFullYear()}`;
}

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

function buildGalleryNav(cats){
  const menu = document.getElementById('galleryNavMenu');
  const mobileSub = document.getElementById('galleryMobileSub');
  if(menu && cats.length){
    const SUB_ARROW = `<svg style="margin-left:auto;flex-shrink:0" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
    let html = `<a href="/gallery.html">All Photos</a><div class="drop-divider"></div>`;
    cats.forEach(cat => {
      const slug = encodeURIComponent(cat.name);
      if(cat.children && cat.children.length){
        html += `<div class="nav-drop-item-parent"><a href="/gallery.html?cat=${slug}">${esc(cat.name)} ${SUB_ARROW}</a><div class="nav-drop-sub">`;
        cat.children.forEach(child => {
          html += `<a href="/gallery.html?cat=${encodeURIComponent(cat.name+' > '+child.name)}">${esc(child.name)}</a>`;
        });
        html += `</div></div>`;
      } else {
        html += `<a href="/gallery.html?cat=${slug}">${esc(cat.name)}</a>`;
      }
    });
    menu.innerHTML = html;
  }
  if(mobileSub){
    let mHtml = '';
    cats.forEach(cat => {
      mHtml += `<a href="/gallery.html?cat=${encodeURIComponent(cat.name)}" onclick="closeMobileMenu()">${esc(cat.name)}</a>`;
      (cat.children||[]).forEach(child => {
        mHtml += `<a href="/gallery.html?cat=${encodeURIComponent(cat.name+' > '+child.name)}" onclick="closeMobileMenu()" class="mm-sub-child">↳ ${esc(child.name)}</a>`;
      });
    });
    mobileSub.innerHTML = mHtml || '<a href="/gallery.html" onclick="closeMobileMenu()">All Photos</a>';
  }
}
function initScrollSpy(){
  const sectionIds = ['departments','doctors','about','news','appointment','contact'];
  const navLinks = document.querySelectorAll('nav.links a, .mobile-menu a');
  function setActive(id){
    navLinks.forEach(a=>{
      const href = a.getAttribute('href');
      a.classList.toggle('active', href === '#'+id);
    });
  }
  const observer = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting) setActive(entry.target.id);
    });
  }, { rootMargin: '-20% 0px -60% 0px', threshold: 0 });
  sectionIds.forEach(id=>{
    const el = document.getElementById(id);
    if(el) observer.observe(el);
  });
}

function toggleMobileMenu(){
  const menu = document.getElementById('mobileMenu');
  const btn = document.getElementById('hamburger');
  menu.classList.toggle('open');
  btn.classList.toggle('open');
}
function closeMobileMenu(){
  document.getElementById('mobileMenu').classList.remove('open');
  document.getElementById('hamburger').classList.remove('open');
}
function toggleMM(btn){
  const group = btn.closest('.mm-group');
  if(!group) return;
  const isOpen = group.classList.toggle('open');
  document.querySelectorAll('.mm-group.open').forEach(g => { if(g !== group) g.classList.remove('open'); });
  group.classList.toggle('open', isOpen);
}

// Dropdown tap support
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('.nav-item-dropdown').forEach(function(drop){
    const trigger = drop.querySelector('.nav-drop-trigger');
    if(!trigger) return;
    trigger.addEventListener('click', function(e){
      const isOpen = drop.classList.contains('open');
      document.querySelectorAll('.nav-item-dropdown.open').forEach(d=>d.classList.remove('open'));
      if(!isOpen){ e.preventDefault(); drop.classList.add('open'); }
    });
  });
  document.addEventListener('click', function(e){
    if(!e.target.closest('.nav-item-dropdown')){
      document.querySelectorAll('.nav-item-dropdown.open').forEach(d=>d.classList.remove('open'));
    }
  });
});

function parseAvail(raw){ if(!raw) return null; try{ return JSON.parse(raw); }catch(e){ return raw ? {days:[],hours:raw} : null; } }

function parseHoursToMinMax(str){
  if(!str) return null;
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

let _doctors = [];
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2500);
}

async function loadSite(){
  let data;
  try{
    const res = await fetch('/api/site');
    data = await res.json();
  }catch(e){
    showToast('Could not load site content — please refresh.');
    return;
  }

  document.getElementById('heroKicker').textContent = data.hero.kicker;
  document.getElementById('heroTitle').innerHTML = data.hero.title;
  document.getElementById('heroLead').textContent = data.hero.lead;
  if(data.hero.bg){
    const heroEl = document.querySelector('.hero');
    if(heroEl) heroEl.style.backgroundImage = `linear-gradient(to right,rgba(10,71,96,0.92) 0%,rgba(10,71,96,0.75) 55%,rgba(10,71,96,0.45) 100%),url('${data.hero.bg}')`;
  }
  document.getElementById('metaDesc').setAttribute('content', (data.seo && data.seo.metaDescription) || '');
  if(data.seo && data.seo.metaTitle) document.title = data.seo.metaTitle;

  document.getElementById('heroStats').innerHTML = data.stats.map((s,i)=>`
    ${i>0 ? '' : ''}
    <div class="hero-cred-item">
      <div class="hero-cred-num">${esc(s.value)}</div>
      <div class="hero-cred-label">${esc(s.label)}</div>
    </div>
  `).join('');

  document.getElementById('statsBand').innerHTML = data.statsBand.map(s=>`
    <div class="stat-block">
      <div class="stat-big">${esc(s.value)}</div>
      <div class="stat-desc">${esc(s.label)}</div>
    </div>
  `).join('');

  document.getElementById('deptGrid').innerHTML = data.departments.slice(0,8).map(d=>`
    <div class="dept-card">
      ${d.image_url ? `<div class="dept-cover"><img src="${esc(d.image_url)}" alt="${esc(d.name)}" loading="lazy"></div>` : `<div class="dept-icon">${d.icon && d.icon.startsWith('/') ? `<img src="${esc(d.icon)}" alt="${esc(d.name)}" width="28" height="28">` : esc(d.icon||'🏥')}</div>`}
      <h3>${esc(d.name)}</h3><p>${esc(d.description||'')}</p>
    </div>
  `).join('');

  document.getElementById('whyGrid').innerHTML = (data.whyChoose||[]).map((w,i)=>`
    <div class="why-item">
      <div class="why-dec-num">0${i+1}</div>
      <div class="why-item-mark"><span class="why-item-num">0${i+1}</span></div>
      <h3>${esc(w.title)}</h3>
      <p>${esc(w.body)}</p>
    </div>
  `).join('');

  _doctors = data.doctors;
  document.getElementById('docGrid').innerHTML = data.doctors.slice(0,4).map(d=>{
    const av = parseAvail(d.availability);
    const dayChips = (av && av.days && av.days.length)
      ? `<div class="doc-days">${av.days.map(day=>`<span class="day-chip">${day.slice(0,3)}</span>`).join('')}</div>` : '';
    const hoursLine = (av && av.hours) ? `<div class="doc-hours">${esc(av.hours)}</div>` : '';
    return `
    <div class="doc-card">
      <div class="doc-photo">${d.photo_url ? `<img src="${esc(d.photo_url)}" alt="${esc(d.name)}">` : `<div class="ring">${esc(initials(d.name))}</div>`}</div>
      <div class="doc-info">
        <h3>${esc(d.name)}</h3>
        ${d.department ? `<div class="doc-dept">${esc(d.department)}</div>` : ''}
        ${d.specialty ? `<div class="spec">${esc(d.specialty)}</div>` : ''}
        ${dayChips || hoursLine ? `<div class="doc-avail">${dayChips}${hoursLine}</div>` : ''}
        ${d.nmc_number ? `<div class="doc-nmc"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> ${esc(d.nmc_number)}</div>` : ''}
        <button class="btn-book" onclick="bookWithDoctor('${esc(d.name).replace(/'/g,"\\'")}','${esc(d.department||'').replace(/'/g,"\\'")}')">Book Appointment</button>
      </div>
    </div>`; }).join('');

  const _testis = data.testimonials || [];
  if(_testis.length >= 2){
    const _tf = _testis[0];
    const _ts = _testis.slice(1, 3);
    document.getElementById('testiGrid').innerHTML = `
      <div class="testi-layout">
        <div class="testi-feature">
          <div class="testi-qmark">&ldquo;</div>
          <p class="testi-feature-quote">${esc(_tf.quote)}</p>
          <div class="testi-feature-who">${esc(_tf.patient_name)}<span>${esc(_tf.role_label||'')}</span></div>
        </div>
        <div class="testi-secondary">
          ${_ts.map(t=>`
            <div class="testi-card-sm">
              <p class="quote">&ldquo;${esc(t.quote)}&rdquo;</p>
              <div class="who">${esc(t.patient_name)} <span>${esc(t.role_label||'')}</span></div>
            </div>
          `).join('')}
        </div>
      </div>`;
  } else {
    document.getElementById('testiGrid').innerHTML = `<div class="testi-grid">${_testis.map(t=>`
      <div class="testi-card"><div class="quote">&ldquo;${esc(t.quote)}&rdquo;</div><div class="who">${esc(t.patient_name)} <span>${esc(t.role_label||'')}</span></div></div>
    `).join('')}</div>`;
  }

  const a = data.about || {};
  document.getElementById('aboutTitle').textContent = a.title || '';
  document.getElementById('aboutBody1').textContent = a.body1 || '';
  document.getElementById('aboutBody2').textContent = a.body2 || '';
  document.getElementById('missionText').textContent = a.mission || '';
  document.getElementById('visionText').textContent = a.vision || '';

  const leaders = [
    { title:'Chairman', name: a.chairman_name||'', message: a.chairman_message||'', photo: a.chairman_photo||'' },
    { title:'Chief Executive Officer (CEO)', name: a.ceo_name||'', message: a.ceo_message||'', photo: a.ceo_photo||'' },
    { title:'Hospital Director', name: a.director_name||'', message: a.director_message||'', photo: a.director_photo||'' },
    { title:'Managing Director', name: a.md_name||'', message: a.md_message||'', photo: a.md_photo||'' }
  ].filter(l => l.name || l.message);
  document.getElementById('leadershipGrid').innerHTML = leaders.map(l=>`
    <div class="leader-card">
      <div class="leader-photo">${l.photo
        ? `<img src="${esc(l.photo)}" alt="${esc(l.name)}">`
        : `<div class="initials">${esc(l.name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()||'?')}</div>`}
      </div>
      <div class="leader-body">
        <span class="leader-title">${esc(l.title)}</span>
        <div class="leader-name">${esc(l.name)}</div>
        <p class="leader-msg">"${esc(l.message)}"</p>
      </div>
    </div>
  `).join('');

  const newsSection = document.getElementById('news');
  if(data.news && data.news.length){
    document.getElementById('newsGrid').innerHTML = data.news.map(n=>`
      <div class="news-card" onclick="window.location.href='/news.html?id=${n.id}'" style="cursor:pointer;">
        <div class="cover">${n.cover_image ? `<img src="${esc(n.cover_image)}" alt="${esc(n.title)}">` : ''}</div>
        <div class="body">
          <div class="date">${esc(fmtDate(n.created_at))}</div>
          <h3>${esc(n.title)}</h3>
          ${n.attachment_url ? `<a class="news-attach" href="${esc(n.attachment_url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            ${esc(n.attachment_url).endsWith('.pdf') ? 'Download PDF' : 'View attachment'}
          </a>` : ''}
          <span class="nd-read-more" style="margin-top:auto;padding-top:10px;display:block;">${n.post_type==='notice' ? 'View full notice →' : 'Read full article →'}</span>
        </div>
      </div>
    `).join('');
  } else { newsSection.style.display = 'none'; }

  const gallerySection = document.getElementById('gallery-section');
  if(data.gallery && data.gallery.length){
    const gallery = data.gallery;
    const cats = ['All', ...new Set(gallery.map(g=>g.category).filter(Boolean))];
    const filterEl = document.getElementById('galleryFilter');
    if(cats.length > 1 && filterEl){
      filterEl.style.display = 'flex';
      filterEl.innerHTML = cats.map((c,i)=>`<button class="tab-pill${i===0?' active':''}" onclick="filterGallery(this,'${c.replace(/'/g,"\\'")}')">${esc(c)}</button>`).join('');
    }
    window._galleryData = gallery;
    window.filterGallery = function(btn, cat){
      document.querySelectorAll('#galleryFilter .tab-pill').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      const filtered = cat==='All' ? gallery : gallery.filter(g=>g.category===cat);
      document.getElementById('galleryGrid').innerHTML = filtered.map(g=>`<img src="${esc(g.image_url)}" alt="${esc(g.caption||'')}" loading="lazy">`).join('');
    };
    document.getElementById('galleryGrid').innerHTML = gallery.map(g=>`<img src="${esc(g.image_url)}" alt="${esc(g.caption||'')}" loading="lazy">`).join('');
  } else { gallerySection.style.display = 'none'; }

  const c = data.contact || {};
  document.getElementById('footAddress').textContent = c.address || '';
  document.getElementById('footContactList').innerHTML = `
    <li>${esc(c.emergencyPhone||'')} (Emergency)</li>
    <li>${esc(c.receptionPhone||'')} (Reception)</li>
    <li>${esc(c.email||'')}</li>
    <li>${esc(c.address||'')}</li>
  `;
  document.getElementById('emergencyPhoneDisplay').textContent = c.emergencyPhone || '';
  const telHref = 'tel:' + String(c.emergencyPhone||'').replace(/[^0-9+]/g,'');
  document.getElementById('navEmergency').href = telHref;
  document.getElementById('emgFloat').href = telHref;
  buildGalleryNav(data.gallery_nav || []);

  // ── Find Us / Map section ──────────────────────────────────────
  const mapEmbed = c.mapEmbedUrl || '';
  const mapShare = c.mapShareUrl || mapEmbed || '';
  const findUs = document.getElementById('findUs');
  if (findUs && mapEmbed) {
    findUs.style.display = '';
    const addrEl = document.getElementById('mapAddress');
    if (addrEl) addrEl.textContent = c.address || '';
    const embedWrap = document.getElementById('mapEmbed');
    if (embedWrap) {
      const iframe = document.createElement('iframe');
      iframe.src = mapEmbed;
      iframe.width = '100%'; iframe.height = '400'; iframe.frameBorder = '0';
      iframe.style.cssText = 'border:0;border-radius:16px;display:block;';
      iframe.allowFullscreen = true; iframe.loading = 'lazy';
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      embedWrap.appendChild(iframe);
    }
    if (mapShare) {
      const encoded = encodeURIComponent(mapShare);
      const label = encodeURIComponent('Find us at Sanjeevani Hospital Pokhara: ' + mapShare);
      const wa = document.getElementById('shareWhatsapp');
      if (wa) wa.href = 'https://api.whatsapp.com/send?text=' + label;
      const ms = document.getElementById('shareMessenger');
      if (ms) ms.href = 'fb-messenger://share?link=' + encoded;
      const em = document.getElementById('shareEmail');
      if (em) em.href = 'mailto:?subject=' + encodeURIComponent('Sanjeevani Hospital Pokhara — Location') + '&body=' + label;
    }
  }
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

  window._doctors = data.doctors;
  window._departments = data.departments;
  document.getElementById('apptDept').innerHTML =
    '<option value="" disabled selected>— Select a department —</option>' +
    data.departments.map(d=>`<option value="${esc(d.name)}">${esc(d.name)}</option>`).join('');
  initCustomSelect(document.getElementById('apptDept'));
  function rebuildDoctorSelect(deptVal){
    const filtered = deptVal
      ? data.doctors.filter(d=>(d.department||d.specialty||'')===deptVal && d.status==='Active')
      : data.doctors.filter(d=>d.status==='Active');
    document.getElementById('apptDoctor').innerHTML = '<option value="">No preference</option>'+filtered.map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join('');
  }
  rebuildDoctorSelect('');
  initCustomSelect(document.getElementById('apptDoctor'));
  initCustomSelect(document.getElementById('appt_time'));
  document.getElementById('apptDept').addEventListener('change', function(){
    rebuildDoctorSelect(this.value);
    document.getElementById('appt_time').innerHTML='<option value="">— Select a doctor and date —</option>';
    document.getElementById('docAvailHint').style.display='none';
    if(window._appDateHandler){ document.getElementById('appt_date').removeEventListener('change',window._appDateHandler); window._appDateHandler=null; }
  });

  if(data.news && data.news.length) showNoticePopup(data.news[0]);
  window._siteData = data;
}

let _noticeId = '';
function showNoticePopup(item){
  _noticeId = String(item.id || item.title || '1');
  if(sessionStorage.getItem('noticeSeen') === _noticeId) return;
  const strip = s => (s||'').replace(/<[^>]+>/g,'').trim();
  const excerpt = strip(item.body||'');
  const coverEl = document.getElementById('noticeCover');
  if(item.cover_image){ document.getElementById('noticeCoverImg').src = item.cover_image; coverEl.style.display='block'; }
  else { coverEl.style.display='none'; }
  document.getElementById('noticeTitle').textContent = item.title || '';
  document.getElementById('noticeDate').textContent = fmtDate(item.created_at);
  document.getElementById('noticeExcerpt').textContent = excerpt.length > 160 ? excerpt.slice(0,157)+'…' : excerpt;
  document.getElementById('noticeReadMore').href = `/news.html?id=${item.id}`;
  document.getElementById('noticeOverlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeNotice(){
  sessionStorage.setItem('noticeSeen', _noticeId);
  document.getElementById('noticeOverlay').style.display = 'none';
  document.body.style.overflow = '';
}

document.getElementById('apptForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const form = e.target;
  const payload = Object.fromEntries(new FormData(form).entries());
  try{
    const res = await fetch('/api/appointments', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const out = await res.json();
    if(!res.ok) throw new Error(out.error || 'Could not submit request.');
    showToast(out.message || 'Appointment request sent.');
    form.reset();
  }catch(err){
    showToast(err.message || 'Something went wrong. Please try again.');
  }
});

function bookWithDoctor(doctorName, deptName){
  const deptSel=document.getElementById('apptDept');
  if(deptSel && deptName){
    for(let i=0;i<deptSel.options.length;i++){
      if(deptSel.options[i].text===deptName){ deptSel.selectedIndex=i; break; }
    }
    deptSel.dispatchEvent(new Event('change'));
  }
  const docSel=document.getElementById('apptDoctor');
  if(docSel){
    for(let i=0;i<docSel.options.length;i++){
      if(docSel.options[i].text===doctorName){ docSel.selectedIndex=i; break; }
    }
    updateDocAvailHint(docSel.value);
  }
  document.getElementById('appointment').scrollIntoView({behavior:'smooth'});
}

function schedDays(av){ return av?.schedule ? Object.keys(av.schedule) : (av?.days||[]); }

async function updateDocAvailHint(doctorId){
  const hint   = document.getElementById('docAvailHint');
  const dateIn = document.getElementById('appt_date');
  const timeIn = document.getElementById('appt_time');

  if(window._appDateHandler && dateIn){ dateIn.removeEventListener('change',window._appDateHandler); window._appDateHandler=null; }

  if(!doctorId){
    if(hint) hint.style.display='none';
    if(timeIn) timeIn.innerHTML='<option value="">— Select a doctor and date —</option>';
    return;
  }

  const doc = (window._doctors||[]).find(d=>String(d.id)===String(doctorId));
  const av  = doc ? parseAvail(doc.availability) : null;
  const days = schedDays(av);

  if(!days.length){
    if(hint) hint.style.display='none';
    if(timeIn) timeIn.innerHTML='<option value="">— No schedule set, call to confirm —</option>';
    return;
  }

  if(hint){
    const pills = _ALL_DAYS.map(dy=>{
      const on=days.includes(dy);
      const range=av?.schedule?.[dy];
      const sub=on&&range?`<small style="display:block;font-size:10px;opacity:.75">${range.start}–${range.end}</small>`:'';
      return `<span class="day-pill${on?' on':''}">${dy.slice(0,3)}${sub}</span>`;
    }).join('');
    hint.innerHTML=`
      <div class="avail-hint-title">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        Doctor's available schedule
      </div>
      <div class="avail-hint-days">${pills}</div>
      <div id="avDateWarn" class="avail-hint-warn" style="display:none;"></div>`;
    hint.style.display='block';
  }
  if(timeIn) timeIn.innerHTML='<option value="">— Pick a date to see slots —</option>';

  if(dateIn){
    const today=new Date(); today.setHours(0,0,0,0);
    dateIn.min=today.toISOString().split('T')[0];
    window._appDateHandler=async function(){
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
        timeIn.innerHTML=(!slots||!slots.length)
          ?'<option value="">No slots available for this date</option>'
          :'<option value="">— Choose a time slot —</option>'+slots.map(s=>`<option value="${s}">${s}</option>`).join('');
      }catch(e){ timeIn.innerHTML='<option value="">Error loading slots</option>'; }
    };
    dateIn.addEventListener('change',window._appDateHandler);
    if(dateIn.value) dateIn.dispatchEvent(new Event('change'));
  }
}

document.getElementById('apptDoctor').addEventListener('change', function(){ updateDocAvailHint(this.value); });

/* ---------------- SEARCH ---------------- */
window._srDocs = [];

function _txt(...parts){ return parts.map(p=>p||'').join(' ').toLowerCase(); }

function doSearch(q){
  const res   = document.getElementById('searchResults');
  const clear = document.getElementById('searchClear');
  if(!res) return;
  q = (q||'').trim();
  if(clear) clear.style.display = q ? 'block' : 'none';
  if(!q){ res.style.display='none'; return; }
  if(!window._siteData){
    res.innerHTML='<div class="sr-empty">Loading content…</div>';
    res.style.display='block'; return;
  }
  const d = window._siteData;
  const lq = q.toLowerCase();

  const depts  = (d.departments||[]).filter(x=>_txt(x.name,x.description).includes(lq)).slice(0,4);
  const docs   = (d.doctors||[]).filter(x=>_txt(x.name,x.specialty,x.department,x.qualification,x.experience).includes(lq)).slice(0,5);
  const news   = (d.news||[]).filter(x=>_txt(x.title).includes(lq)).slice(0,4);
  const testis = (d.testimonials||[]).filter(x=>_txt(x.patient_name,x.quote).includes(lq)).slice(0,3);
  const why    = (d.whyChoose||[]).filter(x=>_txt(x.title,x.body).includes(lq)).slice(0,3);
  const a      = d.about||{};
  const aboutHit = _txt(a.title,a.body1,a.body2,a.mission,a.vision).includes(lq);

  if(!depts.length && !docs.length && !news.length && !testis.length && !why.length && !aboutHit){
    res.innerHTML=`<div class="sr-empty">No results for "<b>${esc(q)}</b>"</div>`;
    res.style.display='block'; return;
  }

  /* Store docs so onclick can reference them safely by index (avoids HTML-encoding bugs) */
  window._srDocs = docs;

  let html='';

  if(depts.length){
    html+=`<div class="sr-section"><div class="sr-label">Departments</div>`;
    html+=depts.map(x=>`<div class="sr-item" onclick="clearSearch();document.getElementById('departments').scrollIntoView({behavior:'smooth'})">
      <div class="sr-thumb">${x.image_url?`<img src="${esc(x.image_url)}" alt="">`:esc(x.icon||'🏥')}</div>
      <div><div class="sr-title">${esc(x.name)}</div><div class="sr-sub">${esc((x.description||'').slice(0,58))}</div></div>
    </div>`).join('');
    html+=`</div>`;
  }

  if(docs.length){
    html+=`<div class="sr-section"><div class="sr-label">Doctors</div>`;
    html+=docs.map((x,i)=>`<div class="sr-item" onclick="clearSearch();_srPickDoc(${i})">
      <div class="sr-thumb teal">${x.photo_url?`<img src="${esc(x.photo_url)}" alt="">`:esc(initials(x.name))}</div>
      <div>
        <div class="sr-title">${esc(x.name)}</div>
        <div class="sr-sub">${esc(x.specialty||'')}${x.department?' · '+esc(x.department):''}</div>
      </div>
    </div>`).join('');
    html+=`</div>`;
  }

  if(news.length){
    html+=`<div class="sr-section"><div class="sr-label">News &amp; Notices</div>`;
    html+=news.map(x=>`<div class="sr-item" onclick="clearSearch();window.location.href='/news.html?id=${x.id}'">
      <div class="sr-thumb">${x.cover_image?`<img src="${esc(x.cover_image)}" alt="">`:'📰'}</div>
      <div><div class="sr-title">${esc(x.title)}</div><div class="sr-sub">${esc((x.created_at||'').slice(0,10))}</div></div>
    </div>`).join('');
    html+=`</div>`;
  }

  if(why.length){
    html+=`<div class="sr-section"><div class="sr-label">Why Choose Us</div>`;
    html+=why.map(x=>`<div class="sr-item" onclick="clearSearch();document.querySelector('.why').scrollIntoView({behavior:'smooth'})">
      <div class="sr-thumb">⭐</div>
      <div><div class="sr-title">${esc(x.title)}</div><div class="sr-sub">${esc((x.body||'').slice(0,58))}</div></div>
    </div>`).join('');
    html+=`</div>`;
  }

  if(testis.length){
    html+=`<div class="sr-section"><div class="sr-label">Patient Stories</div>`;
    html+=testis.map(x=>`<div class="sr-item" onclick="clearSearch()">
      <div class="sr-thumb">💬</div>
      <div><div class="sr-title">${esc(x.patient_name)}</div><div class="sr-sub">"${esc((x.quote||'').slice(0,58))}"</div></div>
    </div>`).join('');
    html+=`</div>`;
  }

  if(aboutHit){
    html+=`<div class="sr-section"><div class="sr-label">About</div>`;
    html+=`<div class="sr-item" onclick="clearSearch();document.getElementById('about').scrollIntoView({behavior:'smooth'})">
      <div class="sr-thumb">🏥</div>
      <div><div class="sr-title">About Sanjeevani Hospital</div><div class="sr-sub">${esc((a.body1||a.mission||'').slice(0,58))}</div></div>
    </div>`;
    html+=`</div>`;
  }

  res.innerHTML=html;
  res.style.display='block';
}

function _srPickDoc(i){
  const doc = window._srDocs[i];
  if(doc) bookWithDoctor(doc.name, doc.department||'');
}

function clearSearch(){
  const input=document.getElementById('siteSearch');
  const res=document.getElementById('searchResults');
  const clear=document.getElementById('searchClear');
  if(input) input.value='';
  if(res) res.style.display='none';
  if(clear) clear.style.display='none';
}
document.addEventListener('click', e=>{
  const wrap=document.getElementById('heroSearch');
  if(wrap && !wrap.contains(e.target)){
    const res=document.getElementById('searchResults');
    if(res) res.style.display='none';
  }
});
document.addEventListener('keydown', e=>{ if(e.key==='Escape') clearSearch(); });

loadSite();
initScrollSpy();
