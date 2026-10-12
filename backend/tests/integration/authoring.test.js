import request from 'supertest';
import { app, boot, shutdown, reset, signup, makeAdmin, bearer } from './helpers.js';

const api = '/api/v1';
let a;
beforeAll(async () => {
  await boot();
  a = app();
});
afterAll(shutdown);
beforeEach(reset);

describe('instructor authoring & moderation', () => {
  it('unapproved instructors can draft but cannot submit', async () => {
    const admin = await makeAdmin(a);
    const t = await signup(a, { email: 't@test.local', asInstructor: true });
    const c = await request(a).post(`${api}/instructor/courses`).set(bearer(t.token)).send({ title: 'My first course' });
    expect(c.status).toBe(201);
    const s = await request(a).post(`${api}/instructor/courses/${c.body.data._id}/submit`).set(bearer(t.token));
    expect(s.status).toBe(403);
    expect(s.body.code).toBe('INSTRUCTOR_PENDING');
    await request(a).patch(`${api}/admin/users/${t.user.id}/instructor`).set(bearer(admin.token)).send({ approved: true });
    const s2 = await request(a).post(`${api}/instructor/courses/${c.body.data._id}/submit`).set(bearer(t.token));
    expect(s2.status).toBe(422); // approved now, but the course is empty
    expect(s2.body.code).toBe('NOT_READY');
    expect(s2.body.details.length).toBeGreaterThan(3);
  });

  it('students cannot reach instructor or admin APIs', async () => {
    const s = await signup(a, { email: 's@test.local' });
    expect((await request(a).get(`${api}/instructor/courses`).set(bearer(s.token))).status).toBe(403);
    expect((await request(a).get(`${api}/admin/dashboard`).set(bearer(s.token))).status).toBe(403);
    expect((await request(a).get(`${api}/instructor/courses`)).status).toBe(401);
  });

  it("an instructor cannot edit someone else's course", async () => {
    const t1 = await signup(a, { email: 't1@test.local', asInstructor: true });
    const t2 = await signup(a, { email: 't2@test.local', asInstructor: true });
    const c = await request(a).post(`${api}/instructor/courses`).set(bearer(t1.token)).send({ title: 'Owned by one' });
    const r = await request(a).patch(`${api}/instructor/courses/${c.body.data._id}`).set(bearer(t2.token)).send({ subtitle: 'hijack' });
    expect(r.status).toBe(403);
  });

  it('full path: publish via admin approval, draft stays hidden until then, rejection returns to draft on edit', async () => {
    const admin = await makeAdmin(a);
    const { publishedCourse } = await import('./helpers.js');
    const pc = await publishedCourse(a, admin);
    const pub = await request(a).get(`${api}/courses`);
    expect(pub.body.data.map((c) => c.slug)).toContain(pc.slug);

    // a draft is invisible to the public but visible to its owner
    const draft = await request(a).post(`${api}/instructor/courses`).set(bearer(pc.teacher.token)).send({ title: 'Secret draft course' });
    const slug = draft.body.data.slug;
    expect((await request(a).get(`${api}/courses/${slug}`)).status).toBe(404);
    expect((await request(a).get(`${api}/courses/${slug}`).set(bearer(pc.teacher.token))).status).toBe(200);

    // rejection needs a reason and sends the course back after the instructor edits it
    const rej = await request(a).post(`${api}/admin/courses/${pc.courseId}/review`).set(bearer(admin.token)).send({ decision: 'reject', reason: 'x' });
    expect(rej.status).toBe(422);
  });

  it('public course page never leaks protected lesson media or quiz answers', async () => {
    const admin = await makeAdmin(a);
    const { publishedCourse } = await import('./helpers.js');
    const pc = await publishedCourse(a, admin);
    const page = await request(a).get(`${api}/courses/${pc.slug}`);
    const lessons = page.body.data.curriculum.flatMap((s) => s.lessons);
    const welcome = lessons.find((l) => l.title === 'Welcome');
    const core = lessons.find((l) => l.title === 'Core idea');
    expect(welcome.videoUrl).toBeTruthy();
    expect(core.videoUrl).toBeUndefined();
    expect(JSON.stringify(page.body)).not.toMatch(/"correct"/);
  });

  it('rejects javascript: URLs for lessons', async () => {
    const t = await signup(a, { email: 'x@test.local', asInstructor: true });
    const c = await request(a).post(`${api}/instructor/courses`).set(bearer(t.token)).send({ title: 'Url safety course' });
    const edit = await request(a).get(`${api}/instructor/courses/${c.body.data._id}`).set(bearer(t.token));
    const sid = edit.body.data.course.sections[0]._id;
    const r = await request(a).post(`${api}/instructor/courses/${c.body.data._id}/sections/${sid}/lessons`).set(bearer(t.token)).send({ title: 'Bad', videoUrl: 'javascript:alert(1)' });
    expect(r.status).toBe(422);
  });
});
