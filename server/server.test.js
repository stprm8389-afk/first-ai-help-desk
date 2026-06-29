const request = require('supertest');
const app = require('./server');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'tickets.json');

beforeEach(()=>{ fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2)); });
afterAll(()=>{ try{ fs.unlinkSync(DATA_FILE); }catch(e){} });

test('ping', async ()=>{
  const res = await request(app).get('/api/ping');
  expect(res.statusCode).toBe(200);
  expect(res.body.ok).toBe(true);
});

test('create and list ticket', async ()=>{
  const post = await request(app).post('/api/tickets').send({issue:'My PC is slow', priority:'Medium'});
  expect(post.statusCode).toBe(201);
  expect(post.body.issue).toBe('My PC is slow');

  const list = await request(app).get('/api/tickets');
  expect(list.statusCode).toBe(200);
  expect(Array.isArray(list.body)).toBe(true);
  expect(list.body.length).toBe(1);
});

test('update ticket', async ()=>{
  const post = await request(app).post('/api/tickets').send({issue:'Error', priority:'High'});
  const id = post.body.id;
  const put = await request(app).put(`/api/tickets/${id}`).send({status:'Closed'});
  expect(put.statusCode).toBe(200);
  expect(put.body.status).toBe('Closed');
});

test('delete ticket', async ()=>{
  const post = await request(app).post('/api/tickets').send({issue:'Delete me'});
  const id = post.body.id;
  const del = await request(app).delete(`/api/tickets/${id}`);
  expect(del.statusCode).toBe(200);
  const list = await request(app).get('/api/tickets');
  expect(list.body.length).toBe(0);
});
