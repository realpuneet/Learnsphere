import request from 'supertest';
import { app, boot, shutdown, reset, signup, makeAdmin, bearer, publishedCourse } from './helpers.js';

const api = '/api/v1';
let a;
beforeAll(async () => {
  await boot();
  a = app();
});
afterAll(shutdown);
beforeEach(reset);

const verifyDry = async (student, payment) =>
  request(a).post(`${api}/payments/verify`).set(bearer(student.token)).send({ providerOrderId: payment.providerOrderId });

describe('enrolment, learning, quizzes and certificates', () => {
  it('free course: gated until enrolled, then full lesson access', async () => {
    const admin = await makeAdmin(a);
    const pc = await publishedCourse(a, admin, { price: 0 });
    const s = await signup(a, { email: 's@test.local' });

    const locked = await request(a).get(`${api}/learn/${pc.courseId}`).set(bearer(s.token));
    expect(locked.status).toBe(403);
    expect(locked.body.code).toBe('NOT_ENROLLED');

    const enrol = await request(a).post(`${api}/courses/${pc.courseId}/checkout`).set(bearer(s.token)).send({});
    expect(enrol.body.data.enrolled).toBe(true);
    const again = await request(a).post(`${api}/courses/${pc.courseId}/checkout`).set(bearer(s.token)).send({});
    expect(again.status).toBe(409);

    const learn = await request(a).get(`${api}/learn/${pc.courseId}`).set(bearer(s.token));
    expect(learn.status).toBe(200);
    expect(JSON.stringify(learn.body)).not.toMatch(/cdn\.example\.com/); // curriculum has no media urls
    const lesson = await request(a).get(`${api}/learn/${pc.courseId}/lessons/${pc.lessons.video._id}`).set(bearer(s.token));
    expect(lesson.body.data.videoUrl).toContain('core.mp4');
    expect(lesson.body.data.videoProvider).toBe('file');
    expect(lesson.body.data.nextId).toBe(pc.lessons.article._id);
  });

  it('paid course (dry-run payment) enrols only after verification; coupons apply', async () => {
    const admin = await makeAdmin(a);
    const pc = await publishedCourse(a, admin, { price: 1180 });
    const s = await signup(a, { email: 's@test.local' });
    await request(a).post(`${api}/admin/coupons`).set(bearer(admin.token)).send({ code: 'half', type: 'percent', value: 50 });

    const q = await request(a).post(`${api}/courses/${pc.courseId}/quote`).send({ coupon: 'HALF' });
    expect(q.body.data.total).toBe(590);
    const bad = await request(a).post(`${api}/courses/${pc.courseId}/quote`).send({ coupon: 'NOPE' });
    expect(bad.status).toBe(400);

    const co = await request(a).post(`${api}/courses/${pc.courseId}/checkout`).set(bearer(s.token)).send({ coupon: 'half' });
    expect(co.body.data.enrolled).toBe(false);
    expect(co.body.data.payment.amount).toBe(590);
    expect(co.body.data.payment.dryRun).toBe(true);
    expect((await request(a).get(`${api}/learn/${pc.courseId}`).set(bearer(s.token))).status).toBe(403);

    expect((await verifyDry(s, co.body.data.payment)).status).toBe(200);
    expect((await verifyDry(s, co.body.data.payment)).status).toBe(200); // idempotent
    expect((await request(a).get(`${api}/learn/${pc.courseId}`).set(bearer(s.token))).status).toBe(200);

    const page = await request(a).get(`${api}/courses/${pc.slug}`);
    expect(page.body.data.stats.enrolled).toBe(1); // counted once despite the double verify
    const coupons = await request(a).get(`${api}/admin/coupons`).set(bearer(admin.token));
    expect(coupons.body.data[0].used).toBe(1);
  });

  it("another student's payment cannot be verified by someone else", async () => {
    const admin = await makeAdmin(a);
    const pc = await publishedCourse(a, admin, { price: 500 });
    const s1 = await signup(a, { email: 's1@test.local' });
    const s2 = await signup(a, { email: 's2@test.local' });
    const co = await request(a).post(`${api}/courses/${pc.courseId}/checkout`).set(bearer(s1.token)).send({});
    const steal = await verifyDry(s2, co.body.data.payment);
    expect(steal.status).toBe(404);
  });

  it('progress, quiz grading, certificate issue and public verification', async () => {
    const admin = await makeAdmin(a);
    const pc = await publishedCourse(a, admin, { price: 0 });
    const s = await signup(a, { name: 'Asha Rao', email: 's@test.local' });
    await request(a).post(`${api}/courses/${pc.courseId}/checkout`).set(bearer(s.token)).send({});
    const L = pc.lessons;
    const done = (id) => request(a).post(`${api}/learn/${pc.courseId}/lessons/${id}/complete`).set(bearer(s.token)).send({ done: true });

    for (const l of [L.preview, L.video, L.article]) await done(l._id);
    expect((await done(L.quizLesson._id)).status).toBe(400); // quiz lessons are completed by passing

    const quiz = await request(a).get(`${api}/learn/${pc.courseId}/lessons/${L.quizLesson._id}/quiz`).set(bearer(s.token));
    expect(JSON.stringify(quiz.body)).not.toMatch(/"correct"|explanation/);
    const qs = quiz.body.data.questions;
    const q1 = qs.find((q) => q.text.startsWith('Which'));
    const q2 = qs.find((q) => q.text.startsWith('Pick'));
    const opt = (q, text) => q.options.find((o) => o.text === text).id;

    // wrong attempt: fails and reveals no answer key
    const wrong = await request(a).post(`${api}/learn/${pc.courseId}/lessons/${L.quizLesson._id}/quiz/attempts`).set(bearer(s.token)).send({ answers: [{ question: q1.id, selected: [opt(q1, 'Marble')] }, { question: q2.id, selected: [opt(q2, 'print')] }] });
    expect(wrong.body.data.passed).toBe(false);
    expect(JSON.stringify(wrong.body)).not.toMatch(/correctOptions|Mocks stand in/);

    // answers from another quiz/option are rejected
    const forged = await request(a).post(`${api}/learn/${pc.courseId}/lessons/${L.quizLesson._id}/quiz/attempts`).set(bearer(s.token)).send({ answers: [{ question: q1.id, selected: ['a'.repeat(24)] }] });
    expect(forged.status).toBe(400);

    const right = await request(a).post(`${api}/learn/${pc.courseId}/lessons/${L.quizLesson._id}/quiz/attempts`).set(bearer(s.token)).send({ answers: [{ question: q1.id, selected: [opt(q1, 'Mock')] }, { question: q2.id, selected: [opt(q2, 'expect'), opt(q2, 'assert')] }] });
    expect(right.body.data.passed).toBe(true);
    expect(right.body.data.scorePct).toBe(100);
    expect(right.body.data.progress.percent).toBe(100);
    expect(right.body.data.progress.certificateId).toBeTruthy();
    expect(right.body.data.review[0].explanation).toBeTruthy();

    const certs = await request(a).get(`${api}/me/certificates`).set(bearer(s.token));
    expect(certs.body.data).toHaveLength(1);
    const code = certs.body.data[0].code;
    const verify = await request(a).get(`${api}/certificates/verify/${code}`);
    expect(verify.body.data.valid).toBe(true);
    expect(verify.body.data.studentName).toBe('Asha Rao');
    expect((await request(a).get(`${api}/certificates/verify/LS-NOPE`)).status).toBe(404);

    // finishing again never issues a second certificate
    await done(L.article._id);
    expect((await request(a).get(`${api}/me/certificates`).set(bearer(s.token))).body.data).toHaveLength(1);
  });

  it('reviews need progress; ratings roll up on the course', async () => {
    const admin = await makeAdmin(a);
    const pc = await publishedCourse(a, admin);
    const s = await signup(a, { email: 's@test.local' });
    expect((await request(a).put(`${api}/courses/${pc.courseId}/review`).set(bearer(s.token)).send({ rating: 5 })).status).toBe(403);
    await request(a).post(`${api}/courses/${pc.courseId}/checkout`).set(bearer(s.token)).send({});
    expect((await request(a).put(`${api}/courses/${pc.courseId}/review`).set(bearer(s.token)).send({ rating: 5 })).status).toBe(400);
    await request(a).post(`${api}/learn/${pc.courseId}/lessons/${pc.lessons.video._id}/complete`).set(bearer(s.token)).send({ done: true });
    expect((await request(a).put(`${api}/courses/${pc.courseId}/review`).set(bearer(s.token)).send({ rating: 4, comment: 'Good' })).status).toBe(200);
    const page = await request(a).get(`${api}/courses/${pc.slug}`);
    expect(page.body.data.stats.ratingAvg).toBe(4);
    expect(page.body.data.stats.ratingCount).toBe(1);
  });

  it('refunds: allowed early on paid courses, blocked after progress', async () => {
    const admin = await makeAdmin(a);
    const pc = await publishedCourse(a, admin, { price: 1000 });
    const early = await signup(a, { email: 'early@test.local' });
    const late = await signup(a, { email: 'late@test.local' });
    for (const s of [early, late]) {
      const co = await request(a).post(`${api}/courses/${pc.courseId}/checkout`).set(bearer(s.token)).send({});
      await verifyDry(s, co.body.data.payment);
    }
    for (const l of [pc.lessons.preview, pc.lessons.video, pc.lessons.article]) {
      await request(a).post(`${api}/learn/${pc.courseId}/lessons/${l._id}/complete`).set(bearer(late.token)).send({ done: true });
    }
    expect((await request(a).post(`${api}/learn/${pc.courseId}/refund`).set(bearer(late.token))).status).toBe(400);
    const ok = await request(a).post(`${api}/learn/${pc.courseId}/refund`).set(bearer(early.token));
    expect(ok.status).toBe(200);
    expect((await request(a).get(`${api}/learn/${pc.courseId}`).set(bearer(early.token))).status).toBe(403);
    expect((await request(a).get(`${api}/courses/${pc.slug}`)).body.data.stats.enrolled).toBe(1);
  });

  it('Q&A: students ask, the instructor answers, strangers are locked out', async () => {
    const admin = await makeAdmin(a);
    const pc = await publishedCourse(a, admin);
    const s = await signup(a, { email: 's@test.local' });
    const stranger = await signup(a, { email: 'x@test.local' });
    await request(a).post(`${api}/courses/${pc.courseId}/checkout`).set(bearer(s.token)).send({});

    expect((await request(a).get(`${api}/learn/${pc.courseId}/threads`).set(bearer(stranger.token))).status).toBe(403);
    const t = await request(a).post(`${api}/learn/${pc.courseId}/threads`).set(bearer(s.token)).send({ title: 'What is a test double?', lesson: pc.lessons.video._id });
    expect(t.status).toBe(201);
    const inbox = await request(a).get(`${api}/inbox/threads?unanswered=true`).set(bearer(pc.teacher.token));
    expect(inbox.body.data).toHaveLength(1);
    const ans = await request(a).post(`${api}/threads/${t.body.data._id}/answers`).set(bearer(pc.teacher.token)).send({ body: 'A stand-in for a real collaborator.' });
    expect(ans.body.data.resolved).toBe(true);
    expect(ans.body.data.answers[0].isInstructor).toBe(true);
    const list = await request(a).get(`${api}/learn/${pc.courseId}/threads`).set(bearer(s.token));
    expect(list.body.data[0].answers).toHaveLength(1);
  });

  it('instructor dashboard and admin dashboard report enrolments and revenue', async () => {
    const admin = await makeAdmin(a);
    const pc = await publishedCourse(a, admin, { price: 1180 });
    const s = await signup(a, { email: 's@test.local' });
    const co = await request(a).post(`${api}/courses/${pc.courseId}/checkout`).set(bearer(s.token)).send({});
    await verifyDry(s, co.body.data.payment);
    const ins = await request(a).get(`${api}/instructor/dashboard`).set(bearer(pc.teacher.token));
    expect(ins.body.data.totals.students).toBe(1);
    expect(ins.body.data.earningsAll.instructor).toBe(800);
    const adm = await request(a).get(`${api}/admin/dashboard`).set(bearer(admin.token));
    expect(adm.body.data.revenueAll.gross).toBe(1180);
    expect(adm.body.data.revenueAll.platform).toBe(200);
  });
});
