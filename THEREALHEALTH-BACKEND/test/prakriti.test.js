const { test, after } = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = 'prakriti-test-only';
const jwt = require('jsonwebtoken');
const express = require('express');
const { calculate, questionIds, doshas } = require('../services/prakritiScoringService');
const { report } = require('../services/prakritiReportService');
const Assessment = require('../models/PrakritiAssessment');
const User = require('../models/User');
const answers = choices => questionIds.map((questionId, i) => ({ questionId, selectedDosha: choices[i] }));

test('all 59049 answer combinations match Flutter equal-maxima rule', () => {
  for (let n = 0; n < 3 ** 10; n++) {
    let remaining = n;
    const choices = questionIds.map(() => { const d = doshas[remaining % 3]; remaining = Math.floor(remaining / 3); return d; });
    const counts = doshas.map(d => choices.filter(c => c === d).length);
    const expected = doshas.filter((_, i) => counts[i] === Math.max(...counts)).join('_');
    assert.equal(calculate(answers(choices)).resultType, expected);
  }
});
test('reject malformed, missing, duplicated, unknown answers', () => {
  const valid = answers(Array(10).fill('vata'));
  for (const input of [null, {}, [], valid.slice(1), [...valid, valid[0]], valid.map(() => valid[0]), [null, ...valid.slice(1)], [{ questionId: 'unknown', selectedDosha: 'vata' }, ...valid.slice(1)], [{ questionId: 'build', selectedDosha: 'other' }, ...valid.slice(1)]]) assert.throws(() => calculate(input), { status: 400 });
});
test('schema uses string user references; report never exposes scores or answers', async () => {
  const doc = new Assessment({ userId: 'test-user', ...calculate(answers(Array(10).fill('pitta'))) });
  await doc.validate();
  const output = report(doc);
  assert.equal(output.displayName, 'Pitta Prakriti');
  assert.equal(output.internalScores, undefined);
  assert.equal(output.answers, undefined);
  assert.equal(report({ ...doc.toObject(), resultType: 'vata_pitta' }).contentAvailable, false);
});

// HTTP integration with isolated in-memory persistence; does not touch patient data.
const records = [];
User.findById = async id => ({ _id: id });
User.findOne = async query => ({ _id: query.googleId });
Assessment.create = async data => { const doc = new Assessment(data); await doc.validate(); records.push(doc); return doc; };
Assessment.findOne = query => ({ sort: async () => records.filter(r => r.userId === query.userId).at(-1) || null });
Assessment.findById = async id => records.find(r => String(r._id) === id) || null;
const app = express();
app.use(express.json());
app.use('/api/prakriti', require('../routes/prakritiRoutes'));
const server = app.listen(0, '127.0.0.1');
after(() => server.close());
async function request(path, { user = 'alice', body, token } = {}) {
  if (!server.listening) await new Promise(resolve => server.once('listening', resolve));
  return fetch(`http://127.0.0.1:${server.address().port}/api/prakriti/assessments${path}`, {
    method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token || jwt.sign({ phone: user }, process.env.JWT_SECRET)}` } : {}) }, body: body ? JSON.stringify(body) : undefined,
  });
}
test('authenticated submit, latest, history preservation, ownership and validation', async () => {
  assert.equal((await request('/latest', { user: null })).status, 401);
  assert.equal((await request('/latest')).status, 404);
  assert.equal((await request('', { body: { answers: [] } })).status, 400);
  assert.equal((await request('/latest', { token: jwt.sign({ googleId: 'pending', registrationOnly: true }, process.env.JWT_SECRET) })).status, 401);
  const response = await request('', { body: { userId: 'mallory', internalScores: { kapha: 100 }, answers: answers(Array(10).fill('vata')) } });
  assert.equal(response.status, 201);
  const saved = (await response.json()).assessment;
  assert.equal(saved.prakritiType, 'vata');
  assert.equal(saved.internalScores, undefined);
  assert.equal(records[0].userId, 'alice');
  assert.equal((await request(`/${saved.id}`, { user: 'bob' })).status, 403);
  assert.equal((await request(`/${saved.id}`)).status, 200);
  assert.equal((await request('/invalid')).status, 400);
  assert.equal((await request('/000000000000000000000000')).status, 404);
  await request('', { body: { answers: answers(Array(10).fill('kapha')) } });
  assert.equal(records.length, 2);
  assert.equal((await (await request('/latest')).json()).assessment.prakritiType, 'kapha');
  const google = await request('', { token: jwt.sign({ googleId: 'google-user' }, process.env.JWT_SECRET), body: { answers: answers(Array(10).fill('pitta')) } });
  assert.equal(google.status, 201);
  assert.equal(records.at(-1).userId, 'google-user');
});
