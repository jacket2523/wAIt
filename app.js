// Keep user's API and behavior, wrapped in v4-styled UI
const chatEl = document.getElementById("chat");
const msgInput = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const bigEmoji = document.getElementById("bigEmoji");

function addMessage(text, sender) {
  const row = document.createElement('div');
  row.className = 'row';
  const bubble = document.createElement('div');
  bubble.className = 'bubble ' + (sender==='user'?'me':'');
  bubble.textContent = text;
  row.appendChild(bubble);
  chatEl.appendChild(row);
  chatEl.scrollTop = chatEl.scrollHeight;
}

// === thinking indicator ===
function showThinking(){
  removeThinking();
  const row = document.createElement('div');
  row.className = 'row';
  const bubble = document.createElement('div');
  bubble.className = 'bubble thinking-bubble';
  bubble.id = 'waitThinking';
  bubble.innerHTML = `wAIt is thinking<span class="dots"><span>.</span><span>.</span><span>.</span></span>`;
  row.appendChild(bubble);
  chatEl.appendChild(row);
  chatEl.scrollTop = chatEl.scrollHeight;
}
function removeThinking(){
  const el = document.getElementById('waitThinking');
  if(el) el.parentNode.remove();
}

function setBigEmoji(emo){
  if (!bigEmoji) return;
  bigEmoji.textContent = emo;
}
document.querySelectorAll('.feel').forEach(b=> b.onclick = ()=> setBigEmoji(b.dataset.emo));

// Tabs
document.querySelectorAll('.tab').forEach(tab=>{
  tab.onclick=()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.getElementById(`view-${tab.dataset.tab}`).classList.add('active');
  }
});

// Chat send
async function sendMessage(){
  const text = (msgInput && msgInput.value || '').trim();
  if(!text) return;
  addMessage(text, 'user');
  if (msgInput) msgInput.value='';
  showThinking();  // <<< 顯示 thinking
  try{
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    const data = await response.json();
    console.log('Raw Lambda response:', data);

    let reply = null;
    try{
      if (data && typeof data === 'object' && data.body) {
        const parsedBody = JSON.parse(data.body);
        reply = parsedBody.reply || parsedBody.error;
      } else {
        reply = (data && (data.reply || data.error)) || null;
      }
    }catch(e){
      console.error('Failed to parse body', e);
    }
    removeThinking();
    addMessage(reply || "⚠️ No reply received", "assistant");
  }catch(err){
    console.error(err);
    removeThinking();
    addMessage("⚠️ Error connecting to server.", "assistant");
  }
}
if (sendBtn) sendBtn.addEventListener('click', sendMessage);
if (msgInput) msgInput.addEventListener('keypress', (e)=>{ if(e.key==='Enter') sendMessage(); });

// Journal
const journalText=document.getElementById('journalText'); const journalList=document.getElementById('journalList');
const exportBtn=document.getElementById('exportJournal'); const saveJournal=document.getElementById('saveJournal');
function renderJournal(){
  if(!journalList) return;
  journalList.innerHTML='';
  const arr=JSON.parse(localStorage.getItem('journals')||'[]');
  for(const it of arr){
    const li=document.createElement('li');
    li.textContent = new Date(it.ts).toLocaleString() + " — " + it.text;
    journalList.appendChild(li);
  }
}
if (saveJournal) saveJournal.onclick = ()=>{
  if(!journalText || !journalText.value.trim()) return;
  const arr=JSON.parse(localStorage.getItem('journals')||'[]');
  arr.unshift({text: journalText.value, ts: Date.now()});
  localStorage.setItem('journals', JSON.stringify(arr));
  journalText.value='';
  renderJournal();
};
if (exportBtn) exportBtn.onclick = ()=>{
  const data = localStorage.getItem('journals') || '[]';
  const blob = new Blob([data], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'journal-export.json'; a.click();
};


renderJournal();

// Reminders
const remText=document.getElementById('remText'); const remTime=document.getElementById('remTime'); const remList=document.getElementById('remList');
const addRem=document.getElementById('addRem');
function renderRem(){
  if(!remList) return;
  remList.innerHTML='';
  const arr=JSON.parse(localStorage.getItem('rems')||'[]');
  for(const it of arr){
    const li=document.createElement('li');
    li.textContent = it.time + " — " + it.text;
    remList.appendChild(li);
  }
}
if (addRem) addRem.onclick = ()=>{
  if(!remText || !remTime || !remText.value || !remTime.value) return;
  const arr=JSON.parse(localStorage.getItem('rems')||'[]');
  arr.push({ id: Date.now(), text: remText.value, time: remTime.value });
  localStorage.setItem('rems', JSON.stringify(arr));
  remText.value='';
  renderRem();
};
renderRem();

// ===== Mood logging when emoji tapped =====
(function(){
  const moodsKey='moods';
  function logMood(emo){
    try{
      const arr=JSON.parse(localStorage.getItem(moodsKey)||'[]');
      arr.push({ts:Date.now(), emo});
      localStorage.setItem(moodsKey, JSON.stringify(arr));
      drawMoodChart();
    }catch(e){}
  }
  document.querySelectorAll('.feel').forEach(b=>{
    const old = b.onclick;
    b.onclick = (e)=>{
      if (old) old(e);
      logMood(b.dataset.emo);
    };
  });
})();

// ===== Trends chart (last 7 days) =====
function drawMoodChart(){
  const svg=document.getElementById('moodChart'); if(!svg) return;
  const w=320, h=140; svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
  const data=JSON.parse(localStorage.getItem('moods')||'[]');
  const now=new Date(); const days=[];
  for(let i=6;i>=0;i--){ const d=new Date(now); d.setDate(now.getDate()-i); d.setHours(0,0,0,0); days.push(+d); }
  const counts=new Array(7).fill(0);
  data.forEach(m=>{
    const t=new Date(m.ts); t.setHours(0,0,0,0);
    const idx=days.indexOf(+t); if(idx>-1) counts[idx]++;
  });
  const max=Math.max(1, ...counts);
  let bars=''; const bw=(w-20)/7;
  for(let i=0;i<7;i++){ const val=counts[i]; const bh=(val/max)*(h-30); const x=10+i*bw; const y=h-10-bh;
    bars+=`<rect x="${x}" y="${y}" width="${bw-6}" height="${bh}" rx="6" fill="#7DA6FF"></rect>`;
  }
  svg.innerHTML = `<rect x="0" y="0" width="${w}" height="${h}" fill="transparent"></rect>` + bars;
}
drawMoodChart();

// ===== Breathing coach =====
(function(){
  const bubble = document.getElementById('breathBubble');
  const stage = document.getElementById('breathStage');
  const startBtn = document.getElementById('breathStart');
  const stopBtn = document.getElementById('breathStop');
  const modeSel = document.getElementById('breathMode');
  if(!bubble||!stage||!startBtn||!stopBtn||!modeSel) return;
  let timer=null, step=0;

  function setStage(text, scale, dur){
    stage.textContent = text;
    bubble.style.transitionDuration = (dur||1000)+'ms';
    bubble.style.transform = `scale(${scale})`;
  }
  const modes = {
    box: [{t:'Inhale',s:1.25,d:4000},{t:'Hold',s:1.25,d:4000},{t:'Exhale',s:0.8,d:4000},{t:'Hold',s:0.8,d:4000}],
    '478': [{t:'Inhale',s:1.25,d:4000},{t:'Hold',s:1.25,d:7000},{t:'Exhale',s:0.8,d:8000}],
    coherent: [{t:'Inhale',s:1.3,d:5000},{t:'Exhale',s:0.8,d:5000}]
  };

  function cycle(){
    const mode = modes[modeSel.value];
    const curr = mode[step % mode.length];
    setStage(curr.t, curr.s, curr.d);
    timer = setTimeout(()=>{ step++; cycle(); }, curr.d);
  }
  startBtn.onclick = ()=>{ if(timer) clearTimeout(timer); step=0; cycle(); };
  stopBtn.onclick = ()=>{ if(timer) clearTimeout(timer); setStage('Ready',1,300); };
})();

// ===== TTS (voice replies) =====
(function(){
  const ttsToggle = document.getElementById('ttsToggle');
  if(!ttsToggle) return;
  let enabled = false;
  ttsToggle.onchange = ()=> enabled = ttsToggle.checked;

  const _addMessage = addMessage;
  window.addMessage = function(text, sender){
    _addMessage(text, sender);
    if (sender!=='user' && enabled && 'speechSynthesis' in window){
      try{
        const utter = new SpeechSynthesisUtterance(String(text));
        speechSynthesis.cancel(); speechSynthesis.speak(utter);
        const last = document.querySelector('.chat .row:last-child .bubble');
        if(last){ last.classList.add('speaking'); setTimeout(()=>last.classList.remove('speaking'), 1200); }
      }catch(e){}
    }
  }
})();

// ===== Speech-to-Text (mic) =====
(function(){
  const srToggle = document.getElementById('srToggle');
  const micBtn = document.getElementById('mic');
  if(!srToggle || !micBtn) return;
  let rec=null, listening=false, enabled=false;

  srToggle.onchange = ()=> enabled = srToggle.checked;

  function getRec(){
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR) return null;
    const r = new SR(); r.lang='en-US'; r.interimResults=false; r.maxAlternatives=1;
    r.onresult = (e)=>{ const t = e.results[0][0].transcript; const inp=document.getElementById('msg'); if(inp){ inp.value=t; } };
    r.onend = ()=>{ listening=false; micBtn.classList.remove('active'); };
    r.onerror = ()=>{ listening=false; micBtn.classList.remove('active'); };
    return r;
  }

  micBtn.onclick = ()=>{
    if(!enabled){ alert('Enable mic in Settings > Mic input'); return; }
    if(listening){ try{rec&&rec.stop();}catch(e){} return; }
    rec = getRec();
    if(!rec){ alert('Speech recognition not supported in this browser.'); return; }
    listening=true; micBtn.classList.add('active');
    try{ rec.start(); }catch(e){ listening=false; micBtn.classList.remove('active'); }
  };
})();

// ===== Notifications (permission + test) =====
(function(){
  const btnPerm = document.getElementById('notifPerm');
  const btnTest = document.getElementById('notifTest');
  if (btnPerm) btnPerm.onclick = async ()=>{
    if(!('Notification' in window)) return alert('Notifications not supported here.');
    const p = await Notification.requestPermission();
    alert('Permission: '+p);
  };
  if (btnTest) btnTest.onclick = ()=>{
    if(!('Notification' in window) || Notification.permission!=='granted') return alert('Allow notifications first.');
    new Notification('wAIt Reminder', { body:'Time to take a deep breath 🌿' });
  };
})();

// ===== Export/Import all data =====
(function(){
  const exportBtn = document.getElementById('exportAll');
  const importEl = document.getElementById('importAll');
  if (exportBtn) exportBtn.onclick = ()=>{
    const data = {
      journals: JSON.parse(localStorage.getItem('journals')||'[]'),
      rems: JSON.parse(localStorage.getItem('rems')||'[]'),
      moods: JSON.parse(localStorage.getItem('moods')||'[]'),
    };
    const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='wait-export.json'; a.click();
  };
  if (importEl) importEl.onchange = async (e)=>{
    const file = e.target.files && e.target.files[0]; if(!file) return;
    const text = await file.text();
    try{
      const data = JSON.parse(text);
      if (data.journals) localStorage.setItem('journals', JSON.stringify(data.journals));
      if (data.rems) localStorage.setItem('rems', JSON.stringify(data.rems));
      if (data.moods) localStorage.setItem('moods', JSON.stringify(data.moods));
      alert('Imported ✔'); drawMoodChart(); renderRem && renderRem(); renderJournal && renderJournal();
    }catch(e){ alert('Invalid file'); }
  };
})();

// ===== Chat: Clear button (robust) =====
(function(){
  function clearChatLog(){
    const candidates = [
      document.getElementById('chat'),
      document.querySelector('#view-chat .chat'),
      document.querySelector('.chat')  // fallback
    ];
    let cleared = false;
    for (const box of candidates){
      if (box){
        box.innerHTML = '';
        cleared = true;
      }
    }
    const scroller = document.querySelector('#view-chat .scroll') || candidates[0];
    if (scroller) scroller.scrollTop = 0;
    return cleared;
  }

  function bindClear(){
    const btn = document.getElementById('clearChat');
    if (!btn) return;
    btn.addEventListener('click', function(e){
      e.preventDefault();
      if (!confirm('Clear this chat view?')) return;
      const ok = clearChatLog();
      if (!ok) alert('Could not find the chat container.');
    }, { once: false });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bindClear);
  } else {
    bindClear();
  }
})();

// ===== Urgent Call (simple, no modal) =====
(function(){
  const btn = document.getElementById('urgentBtn');
  if (!btn) return;
  btn.addEventListener('click', ()=>{
    const num = localStorage.getItem('sosNumber') || '999'; // Malaysia default
    const go = confirm(`Call emergency now at ${num}?`);
    if (!go) return;
    window.location.href = `tel:${num}`;
  });
})();

