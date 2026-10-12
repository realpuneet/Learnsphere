import mongoose from 'mongoose';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import RedisMock from 'ioredis-mock';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { setRedis } from '../../src/config/redis.js';
import { connectDB, disconnectDB } from '../../src/config/db.js';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/index.js';

let mongod;
export const app = () => createApp();

export async function boot() {
  mongod = await MongoMemoryServer.create();
  setRedis(new RedisMock());
  await connectDB(mongod.getUri());
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
}
export async function shutdown() {
  await disconnectDB();
  await mongod?.stop();
}
export async function reset() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
  setRedis(new RedisMock());
}

export const bearer = (t) => ({ Authorization: `Bearer ${t}` });

/** Register through the public API and return { token, user }. */
export async function signup(a, { name = 'Test User', email, password = 'Passw0rd1', asInstructor = false } = {}) {
  const res = await request(a).post('/api/v1/auth/register').send({ name, email, password, asInstructor });
  if (res.status !== 201) throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.data.accessToken, user: res.body.data.user };
}

/** Admins can't self-register, so create one in the DB and log in. */
export async function makeAdmin(a, email = 'admin@test.local') {
  await User.create({ name: 'Admin', email, role: 'admin', passwordHash: await bcrypt.hash('Passw0rd1', 4) });
  const res = await request(a).post('/api/v1/auth/login').send({ email, password: 'Passw0rd1' });
  return { token: res.body.data.accessToken, user: res.body.data.user };
}

/**
 * Build a published course through the real API: approved instructor -> draft -> lessons + quiz -> submit -> admin approves.
 * Returns ids and tokens so tests can focus on the behaviour they care about.
 */
export async function publishedCourse(a, admin, { price = 0, email = 'teacher@test.local' } = {}) {
  const cat = await request(a).post('/api/v1/admin/categories').set(bearer(admin.token)).send({ name: `Cat ${Math.random().toString(36).slice(2, 6)}` });
  const teacher = await signup(a, { name: 'Teacher', email, asInstructor: true });
  await request(a).patch(`/api/v1/admin/users/${teacher.user.id}/instructor`).set(bearer(admin.token)).send({ approved: true });

  const created = await request(a).post('/api/v1/instructor/courses').set(bearer(teacher.token)).send({ title: 'Testing With Confidence' });
  const courseId = created.body.data._id;
  await request(a).patch(`/api/v1/instructor/courses/${courseId}`).set(bearer(teacher.token)).send({
    description: 'A practical course about writing tests that give you real confidence when shipping software.',
    category: cat.body.data._id, thumbnail: 'https://example.com/t.png', outcomes: ['Write good tests'], price,
  });
  const edit = await request(a).get(`/api/v1/instructor/courses/${courseId}`).set(bearer(teacher.token));
  const sectionId = edit.body.data.course.sections[0]._id;
  const add = (body) => request(a).post(`/api/v1/instructor/courses/${courseId}/sections/${sectionId}/lessons`).set(bearer(teacher.token)).send(body);

  const preview = (await add({ title: 'Welcome', type: 'video', videoUrl: 'https://cdn.example.com/welcome.mp4', durationSec: 120, isPreview: true })).body.data;
  const video = (await add({ title: 'Core idea', type: 'video', videoUrl: 'https://cdn.example.com/core.mp4', durationSec: 600 })).body.data;
  const article = (await add({ title: 'Notes', type: 'article', content: '# Notes\nWrite tests.', durationSec: 200 })).body.data;
  const quizLesson = (await add({ title: 'Quiz', type: 'quiz', durationSec: 300 })).body.data;
  const quizSave = await request(a).put(`/api/v1/instructor/lessons/${quizLesson._id}/quiz`).set(bearer(teacher.token)).send({
    passPercent: 60,
    questions: [
      { text: 'Which is a test double?', type: 'single', options: [{ text: 'Mock', correct: true }, { text: 'Marble' }], explanation: 'Mocks stand in for collaborators.' },
      { text: 'Pick all assertions', type: 'multiple', options: [{ text: 'expect', correct: true }, { text: 'assert', correct: true }, { text: 'print' }] },
    ],
  });
  if (quizSave.status !== 200) throw new Error(`quiz save failed ${JSON.stringify(quizSave.body)}`);

  const submit = await request(a).post(`/api/v1/instructor/courses/${courseId}/submit`).set(bearer(teacher.token));
  if (submit.status !== 200) throw new Error(`submit failed ${JSON.stringify(submit.body)}`);
  const approve = await request(a).post(`/api/v1/admin/courses/${courseId}/review`).set(bearer(admin.token)).send({ decision: 'approve' });
  if (approve.status !== 200) throw new Error(`approve failed ${JSON.stringify(approve.body)}`);
  return { courseId, slug: approve.body.data.slug, teacher, lessons: { preview, video, article, quizLesson }, sectionId };
}
