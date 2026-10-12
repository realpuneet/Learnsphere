import { env } from '../config/env.js';
import { NOTIFY_TYPE as T } from '../utils/constants.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function layout(title, bodyHtml, cta) {
  return `<!doctype html><html><body style="margin:0;background:#f4f3ff;font-family:Segoe UI,Arial,sans-serif;color:#1e1b3a">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e6e3fb">
<tr><td style="background:#5b3df5;color:#fff;padding:20px 28px;font-size:20px;font-weight:700">${esc(env.APP_NAME)}</td></tr>
<tr><td style="padding:28px"><h2 style="margin:0 0 12px;font-size:20px">${esc(title)}</h2>${bodyHtml}
${cta ? `<p style="margin:24px 0 0"><a href="${esc(cta.url)}" style="background:#5b3df5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;display:inline-block;font-weight:600">${esc(cta.label)}</a></p>` : ''}
</td></tr>
<tr><td style="padding:16px 28px;background:#faf9ff;font-size:12px;color:#7a7799">You can turn these emails off in Profile → Notifications.</td></tr>
</table></td></tr></table></body></html>`;
}

const rows = (pairs) =>
  `<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:12px 0">${pairs
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:8px 0;color:#7a7799;width:38%;border-bottom:1px solid #eeecfb">${esc(k)}</td><td style="padding:8px 0;font-weight:600;border-bottom:1px solid #eeecfb">${esc(v)}</td></tr>`)
    .join('')}</table>`;

/** Returns { subject, html, text } for a notification type. vars: name, title, body, courseTitle, link, code, reason... */
export function renderTemplate(type, v = {}) {
  const link = v.link ? `${env.CLIENT_URL}${v.link}` : env.CLIENT_URL;
  const hi = `<p>Hi ${esc(v.name || 'there')},</p>`;
  switch (type) {
    case T.ENROLLED:
      return { subject: `You're enrolled: ${v.courseTitle}`, html: layout("You're in! 🎉", `${hi}<p>You now have full access to <b>${esc(v.courseTitle)}</b>.</p>${rows([['Instructor', v.instructorName], ['Lessons', v.lessons], ['Paid', v.paid]])}`, { label: 'Start learning', url: link }), text: `You're enrolled in ${v.courseTitle}. Start: ${link}` };
    case T.CERTIFICATE:
      return { subject: `Your certificate for ${v.courseTitle}`, html: layout('Congratulations! 🎓', `${hi}<p>You completed <b>${esc(v.courseTitle)}</b> and earned a certificate.</p>${rows([['Certificate ID', v.code]])}`, { label: 'View certificate', url: link }), text: `Congratulations! Your certificate (${v.code}) for ${v.courseTitle}: ${link}` };
    case T.COURSE_APPROVED:
      return { subject: `Your course is live: ${v.courseTitle}`, html: layout('Course published ✅', `${hi}<p><b>${esc(v.courseTitle)}</b> passed review and is now live.</p>`, { label: 'View course', url: link }), text: `${v.courseTitle} is live: ${link}` };
    case T.COURSE_REJECTED:
      return { subject: `Changes needed: ${v.courseTitle}`, html: layout('Your course needs changes', `${hi}<p><b>${esc(v.courseTitle)}</b> was not approved yet.</p>${rows([['Reviewer note', v.reason]])}`, { label: 'Edit course', url: link }), text: `${v.courseTitle} needs changes: ${v.reason || ''}` };
    case T.NEW_STUDENT:
      return { subject: `New student in ${v.courseTitle}`, html: layout('New enrolment', `${hi}<p>${esc(v.studentName)} just enrolled in <b>${esc(v.courseTitle)}</b>.</p>`, { label: 'Open dashboard', url: link }), text: `${v.studentName} enrolled in ${v.courseTitle}` };
    case T.NEW_QUESTION:
      return { subject: `New question in ${v.courseTitle}`, html: layout('A student asked a question', `${hi}<p><b>${esc(v.title)}</b></p><p>${esc(v.body)}</p>`, { label: 'Answer it', url: link }), text: `New question in ${v.courseTitle}: ${v.title}` };
    case T.NEW_ANSWER:
      return { subject: `Your question was answered`, html: layout('You got an answer', `${hi}<p>Re: <b>${esc(v.title)}</b></p><p>${esc(v.body)}</p>`, { label: 'View answer', url: link }), text: `Answer to "${v.title}": ${v.body}` };
    case T.REFUNDED:
      return { subject: `Refund processed – ${v.courseTitle}`, html: layout('Refund processed', `${hi}<p>Your refund for <b>${esc(v.courseTitle)}</b> has been initiated.</p>${rows([['Amount', v.amount ? `₹${v.amount}` : null]])}<p>It reaches your bank in 5-7 working days.</p>`), text: `Refund of ₹${v.amount} for ${v.courseTitle} initiated.` };
    case T.NUDGE:
      return { subject: `Keep going with ${v.courseTitle}`, html: layout('Pick up where you left off', `${hi}<p>You're ${esc(v.percent)}% through <b>${esc(v.courseTitle)}</b>. A few minutes today keeps the momentum.</p>`, { label: 'Continue learning', url: link }), text: `You're ${v.percent}% through ${v.courseTitle}. Continue: ${link}` };
    case T.INSTRUCTOR_APPROVED:
      return { subject: 'Your instructor account is approved', html: layout('Welcome, instructor! 👩‍🏫', `${hi}<p>You can now submit courses for review.</p>`, { label: 'Create a course', url: link }), text: `Your instructor account is approved. ${link}` };
    default:
      return { subject: v.title || env.APP_NAME, html: layout(v.title || env.APP_NAME, `<p>${esc(v.body || '')}</p>`), text: v.body || v.title || '' };
  }
}

/** Password-reset mail (not a notification type – sent directly, never opt-out-able). */
export function renderPasswordReset({ name, url, minutes }) {
  return {
    subject: `Reset your ${env.APP_NAME} password`,
    html: layout(
      'Reset your password',
      `<p>Hi ${esc(name || 'there')},</p><p>We received a request to reset your password. This link works for ${esc(minutes)} minutes and can be used once.</p><p>If you didn't ask for this, you can ignore this email – your password stays unchanged.</p>`,
      { label: 'Choose a new password', url },
    ),
    text: `Reset your password (valid ${minutes} min): ${url}`,
  };
}
