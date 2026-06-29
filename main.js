const manifest = {
  name: "AI Help Desk Assistant",
  short_name: "HelpDesk AI",
  start_url: ".",
  display: "standalone",
  background_color: "#111",
  theme_color: "#0a84ff",
  icons: [
    { src: "https://cdn-icons-png.flaticon.com/512/4712/4712109.png", sizes: "192x192", type: "image/png" }
  ]
};

// attach in-memory manifest
const blob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
const manifestURL = URL.createObjectURL(blob);
const manifestLink = document.querySelector('link[rel="manifest"]');
if (manifestLink) manifestLink.href = manifestURL;

const knowledgeBase = {
  wifi: {
    keywords: ["wifi", "internet", "network", "no connection", "can't connect"],
    reply: `\n📡 Wi-Fi Troubleshooting\n\n1. Restart your router.\n2. Toggle Wi‑Fi off and back on.\n3. Forget and reconnect to the network.\n4. Check Airplane Mode.\n5. Update the network driver.\n6. Run the Windows Network Troubleshooter.\n`
  },

  slow: {
    keywords: ["slow", "lag", "freezing", "hang"],
    reply: `\n🐢 Slow Computer\n\n1. Restart the PC.\n2. Close unnecessary programs.\n3. Check storage space.\n4. Disable startup apps.\n5. Scan for malware.\n`
  },

  bluescreen: {
    keywords: ["blue screen", "bsod", "blue-screen"],
    reply: `\n💻 Blue Screen\n\n1. Note the error code.\n2. Remove new hardware.\n3. Update drivers.\n4. Test RAM.\n5. Check disk health.\n`
  }
};

// storage keys
const CHAT_KEY = "chatHistory";
const TICKETS_KEY = "tickets";

let chatHistory = JSON.parse(localStorage.getItem(CHAT_KEY)) || [];
let tickets = JSON.parse(localStorage.getItem(TICKETS_KEY)) || [];

// backend detection
async function pingBackend() {
  try {
    const res = await fetch('/api/ping', {cache: 'no-store'});
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function useBackend() {
  const mode = document.getElementById('backendMode').value;
  if (mode === 'backend') return true;
  if (mode === 'local') return false;
  // auto
  return await pingBackend();
}

function saveChat() { localStorage.setItem(CHAT_KEY, JSON.stringify(chatHistory)); }
function saveTicketsLocal() { localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets)); }

function getPriority(text) {
  text = (text || "").toLowerCase();
  if (text.includes("not working") || text.includes("down") || text.includes("won't start") || text.includes("crash")) return "High";
  if (text.includes("slow") || text.includes("lag") || text.includes("freeze")) return "Medium";
  return "Low";
}

// Backend API wrappers with graceful fallback
async function apiGetTickets() {
  if (await useBackend()) {
    try {
      const r = await fetch('/api/tickets');
      if (!r.ok) throw new Error('api error');
      return await r.json();
    } catch (e) {
      // fallback
    }
  }
  return JSON.parse(localStorage.getItem(TICKETS_KEY)) || [];
}

async function apiCreateTicket(issue) {
  const payload = { issue, priority: getPriority(issue) };
  if (await useBackend()) {
    try {
      const r = await fetch('/api/tickets', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)});
      if (r.ok) return await r.json();
    } catch (e) {}
  }
  // local
  const ticket = { id: Date.now(), issue, status: 'Open', priority: payload.priority, time: new Date().toLocaleString() };
  tickets.push(ticket);
  saveTicketsLocal();
  return ticket;
}

async function apiUpdateTicket(id, updates) {
  if (await useBackend()) {
    try {
      const r = await fetch(`/api/tickets/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(updates)});
      if (r.ok) return await r.json();
    } catch (e) {}
  }
  tickets = tickets.map(t => t.id === id ? Object.assign({}, t, updates) : t);
  saveTicketsLocal();
  return tickets.find(t => t.id === id);
}

async function apiDeleteTicket(id) {
  if (await useBackend()) {
    try {
      const r = await fetch(`/api/tickets/${id}`, { method: 'DELETE' });
      if (r.ok) return true;
    } catch (e) {}
  }
  tickets = tickets.filter(t => t.id !== id);
  saveTicketsLocal();
  return true;
}

// UI helpers
function escapeHtml(unsafe) { return (unsafe||"").replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

async function renderChat() {
  const chat = document.getElementById('chat');
  chat.innerHTML = '';
  chatHistory.forEach(m => { const p = document.createElement('p'); p.innerHTML = m; chat.appendChild(p); });
  chat.scrollTop = chat.scrollHeight;
}

async function renderTickets(list) {
  const ticketList = document.getElementById('ticketList');
  if (!list || list.length === 0) { ticketList.innerHTML = '<p>No tickets.</p>'; return; }
  ticketList.innerHTML = '';
  list.slice().reverse().forEach(t => {
    const div = document.createElement('div'); div.className = 'ticket';
    const meta = document.createElement('div'); meta.className='meta';
    meta.innerHTML = `<b>Ticket #${t.id}</b><br>Issue: ${escapeHtml(t.issue)}<br><span class='small'>Priority: <b>${t.priority}</b> • Status: ${t.status} • Time: ${t.time}</span>`;
    const controls = document.createElement('div'); controls.className='controls';

    const closeBtn = document.createElement('button'); closeBtn.textContent='Close'; closeBtn.disabled = t.status==='Closed';
    closeBtn.addEventListener('click', async ()=>{ await apiUpdateTicket(t.id, {status:'Closed'}); await refreshAll(); });

    const editBtn = document.createElement('button'); editBtn.textContent='Edit'; editBtn.addEventListener('click', ()=>{ openEditDialog(t); });

    const delBtn = document.createElement('button'); delBtn.textContent='Delete'; delBtn.addEventListener('click', async ()=>{ if(confirm('Delete ticket?')){ await apiDeleteTicket(t.id); await refreshAll(); } });

    controls.appendChild(closeBtn); controls.appendChild(editBtn); controls.appendChild(delBtn);
    div.appendChild(meta); div.appendChild(controls);
    ticketList.appendChild(div);
  });
}

function openEditDialog(ticket) {
  const newIssue = prompt('Edit issue description:', ticket.issue);
  if (newIssue === null) return;
  const newPriority = prompt('Edit priority (Low/Medium/High):', ticket.priority) || ticket.priority;
  apiUpdateTicket(ticket.id, { issue: newIssue, priority: newPriority }).then(refreshAll);
}

async function refreshAll() {
  tickets = await apiGetTickets();
  await renderTickets(tickets);
  showStats();
  renderChat();
}

async function diagnose() {
  const input = document.getElementById('question'); const chat = document.getElementById('chat');
  const raw = (input.value||'').trim(); if(!raw) return;
  const q = raw.toLowerCase();
  let answer = "❓ Issue not recognized. Creating support ticket...";
  for (const topic in knowledgeBase) if (knowledgeBase[topic].keywords.some(k=>q.includes(k))) { answer = knowledgeBase[topic].reply; break; }

  const ticket = await apiCreateTicket(raw);
  const userMsg = `<b>You:</b> ${escapeHtml(raw)}`;
  const aiMsg = `<b>AI:</b> ${escapeHtml(answer).replace(/\n/g,'<br>')}<br><i>🎫 Ticket #${ticket.id}</i>`;
  chatHistory.push(userMsg); chatHistory.push(aiMsg); saveChat(); renderChat();
  input.value=''; await refreshAll();
}

async function showTickets() { tickets = await apiGetTickets(); await renderTickets(tickets); }

function clearChat() { if(confirm('Clear chat history?')){ chatHistory=[]; saveChat(); renderChat(); } }

function showStats() {
  const stats = document.getElementById('stats');
  const open = (tickets||[]).filter(t=>t.status==='Open').length;
  const closed = (tickets||[]).filter(t=>t.status==='Closed').length;
  stats.innerHTML = `<div style="border:1px solid #444; padding:10px;"><p>🎫 Total Tickets: ${tickets.length}</p><p>🟢 Open: ${open}</p><p>🔵 Closed: ${closed}</p></div>`;
}

// Install prompt handling
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); deferredPrompt=e; const wrap=document.getElementById('installWrap'); wrap.innerHTML=''; const btn=document.createElement('button'); btn.innerText='📱 Install App'; btn.style.width='100%'; btn.style.padding='10px'; btn.style.marginTop='10px'; wrap.appendChild(btn); btn.addEventListener('click', async ()=>{ deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; wrap.innerHTML=''; }); });

// service worker
if ('serviceWorker' in navigator) { window.addEventListener('load', ()=>{ navigator.serviceWorker.register('sw.js').catch(console.warn); }); }

// events
window.addEventListener('load', async ()=>{
  chatHistory = JSON.parse(localStorage.getItem(CHAT_KEY)) || chatHistory;
  tickets = JSON.parse(localStorage.getItem(TICKETS_KEY)) || tickets;
  document.getElementById('diagnoseBtn').addEventListener('click', diagnose);
  document.getElementById('viewTicketsBtn').addEventListener('click', showTickets);
  document.getElementById('refreshStatsBtn').addEventListener('click', refreshAll);
  document.getElementById('clearChatBtn').addEventListener('click', clearChat);
  document.getElementById('newTicketBtn').addEventListener('click', async ()=>{ const t = prompt('Describe new ticket:'); if(!t) return; await apiCreateTicket(t); await refreshAll(); });
  document.getElementById('searchBox').addEventListener('input', async (e)=>{ const q=(e.target.value||'').toLowerCase(); const all = await apiGetTickets(); const filtered = all.filter(t=> (t.issue||'').toLowerCase().includes(q)); await renderTickets(filtered); });
  document.getElementById('backendMode').addEventListener('change', refreshAll);
  document.getElementById('question').addEventListener('keydown', (ev)=>{ if(ev.key==='Enter') diagnose(); });
  await refreshAll();
});
