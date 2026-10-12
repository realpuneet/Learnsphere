import request from 'supertest';
import { app, boot, shutdown, reset } from './helpers.js';

const api = '/api/v1';
let a;
beforeAll(async () => {
  await boot();
  a = app();
});
afterAll(shutdown);
beforeEach(reset);

describe('auth', () => {
  it('register -> me -> login -> refresh rotation with reuse detection', async () => {
    const agent = request.agent(a);
    const reg = await agent.post(`${api}/auth/register`).send({ name: 'Asha', email: 'Asha@Test.local', password: 'Passw0rd1' });
    expect(reg.status).toBe(201);
    expect(reg.body.data.user.role).toBe('student');
    expect(reg.body.data.user.passwordHash).toBeUndefined();
    const me = await agent.get(`${api}/auth/me`).set('Authorization', `Bearer ${reg.body.data.accessToken}`);
    expect(me.body.data.email).toBe('asha@test.local');

    const cookie = reg.headers['set-cookie'].find((c) => c.startsWith('ls_rt='));
    const r1 = await request(a).post(`${api}/auth/refresh`).set('Cookie', cookie);
    expect(r1.status).toBe(200);
    // replaying the old refresh token = theft -> whole family revoked
    const replay = await request(a).post(`${api}/auth/refresh`).set('Cookie', cookie);
    expect(replay.status).toBe(401);
    const newCookie = r1.headers['set-cookie'].find((c) => c.startsWith('ls_rt='));
    expect((await request(a).post(`${api}/auth/refresh`).set('Cookie', newCookie)).status).toBe(401);
  });

  it('duplicate email, weak password and bad credentials', async () => {
    await request(a).post(`${api}/auth/register`).send({ name: 'A', email: 'a@test.local', password: 'Passw0rd1' }).expect(422); // name too short
    await request(a).post(`${api}/auth/register`).send({ name: 'Asha', email: 'a@test.local', password: 'Passw0rd1' }).expect(201);
    await request(a).post(`${api}/auth/register`).send({ name: 'Asha', email: 'a@test.local', password: 'Passw0rd1' }).expect(409);
    await request(a).post(`${api}/auth/register`).send({ name: 'Asha', email: 'b@test.local', password: 'weak' }).expect(422);
    await request(a).post(`${api}/auth/login`).send({ email: 'a@test.local', password: 'wrong-pass1' }).expect(401);
  });

  it('public sign-up can never create an admin', async () => {
    const r = await request(a).post(`${api}/auth/register`).send({ name: 'Mallory', email: 'm@test.local', password: 'Passw0rd1', role: 'admin' });
    expect(r.body.data.user.role).toBe('student');
  });
});
