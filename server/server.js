const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const DATA_FILE = path.join(__dirname, 'tickets.json');
function readData(){ try{ const raw = fs.readFileSync(DATA_FILE,'utf8'); return JSON.parse(raw); }catch(e){ return []; } }
function writeData(data){ fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }

app.get('/api/ping', (req,res)=> res.json({ok:true}));
app.get('/api/tickets', (req,res)=>{
  const data = readData(); res.json(data);
});
app.post('/api/tickets', (req,res)=>{
  const { issue, priority } = req.body;
  if(!issue) return res.status(400).json({error:'issue required'});
  const data = readData();
  const ticket = { id: Date.now(), issue, priority: priority||'Low', status:'Open', time: new Date().toLocaleString() };
  data.push(ticket); writeData(data); res.status(201).json(ticket);
});
app.put('/api/tickets/:id', (req,res)=>{
  const id = Number(req.params.id);
  const updates = req.body;
  const data = readData();
  const idx = data.findIndex(t=>t.id===id);
  if(idx===-1) return res.status(404).json({error:'not found'});
  data[idx] = Object.assign({}, data[idx], updates);
  writeData(data); res.json(data[idx]);
});
app.delete('/api/tickets/:id', (req,res)=>{
  const id = Number(req.params.id);
  let data = readData();
  const lenBefore = data.length;
  data = data.filter(t=>t.id!==id);
  if(data.length===lenBefore) return res.status(404).json({error:'not found'});
  writeData(data); res.json({ok:true});
});

// serve static for frontend in root if present
app.use(express.static(path.join(__dirname, '..')));

const PORT = process.env.PORT||3000;
if(require.main === module){ app.listen(PORT, ()=>console.log('Server running on', PORT)); }
module.exports = app;
