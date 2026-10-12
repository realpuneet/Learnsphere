/* Idempotent seed: `npm run seed`. Safe to run repeatedly (upserts by email / slug). */
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { User, Category, Course, Lesson, Quiz, Enrollment, Review, Coupon } from '../models/index.js';
import { slugify } from './helpers.js';
import { recalcStats } from '../services/course.service.js';
import { refreshRating } from '../services/review.service.js';
import { logger } from './logger.js';

const hash = (p) => bcrypt.hash(p, 10);
const say = (m) => logger.info(`[seed] ${m}`);

const CATEGORIES = [
  ['Web Development', 'code', 'HTML, CSS, JavaScript, React, Node and more.'],
  ['Data Science', 'chart', 'Python, statistics, analytics and machine learning.'],
  ['Design', 'palette', 'UI/UX, graphic design and product design.'],
  ['Marketing', 'megaphone', 'SEO, content, social and performance marketing.'],
  ['Business', 'briefcase', 'Management, finance and entrepreneurship.'],
  ['Personal Development', 'sparkles', 'Productivity, communication and careers.'],
];

/* Demo media: public sample videos (placeholders – replace with your own lessons). */
const V = (n) => `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/${n}.mp4`;
const VIDEOS = [
  [V('BigBuckBunny'), 596], [V('ElephantsDream'), 653], [V('Sintel'), 888], [V('TearsOfSteel'), 734], [V('ForBiggerBlazes'), 15], [V('ForBiggerEscapes'), 15],
];
let vi = 0;
const vid = (title, preview = false) => {
  const [videoUrl, durationSec] = VIDEOS[vi++ % VIDEOS.length];
  return { title, type: 'video', videoUrl, durationSec, isPreview: preview };
};
const article = (title, content, durationSec = 300) => ({ title, type: 'article', content, durationSec });
const quiz = (title, questions, passPercent = 60) => ({ title, type: 'quiz', durationSec: 300, quiz: { passPercent, maxAttempts: 0, shuffle: true, questions } });
const Q = (text, options, correct, explanation, type = 'single') => ({ text, type, explanation, options: options.map((t, i) => ({ text: t, correct: [].concat(correct).includes(i) })) });

const COURSES = [
  {
    title: 'Modern JavaScript: From Zero to Confident', cat: 'Web Development', level: 'beginner', price: 999, mrp: 1999, featured: true, tags: ['javascript', 'es6', 'beginner'],
    subtitle: 'Learn the language of the web with hands-on lessons and real exercises.',
    description: 'Start from variables and functions, then master arrays, objects, async code and the modern ES6+ features used in every professional codebase. Every section ends with practice questions so you know you actually understood it.',
    outcomes: ['Write clean, modern JavaScript', 'Understand scope, closures and `this`', 'Work with arrays, objects and JSON', 'Handle async code with promises and async/await'],
    requirements: ['A computer and curiosity — no prior coding needed'],
    sections: [
      ['Getting started', [vid('Welcome & how this course works', true), vid('Setting up your editor', true), article('Cheat sheet: variables and types', '## Variables\n\nUse `const` by default, `let` when you must reassign. Avoid `var`.\n\n## Types\n\n`string`, `number`, `boolean`, `null`, `undefined`, `symbol`, `bigint`, and `object`.')]],
      ['Functions & scope', [vid('Functions, arrow functions and parameters'), vid('Scope and closures'), quiz('Checkpoint: functions & scope', [
        Q('Which keyword declares a block-scoped variable that cannot be reassigned?', ['var', 'let', 'const', 'static'], 2, '`const` creates a block-scoped binding that cannot be reassigned.'),
        Q('A closure is…', ['A function bundled with its surrounding scope', 'A way to close the browser', 'A private class', 'A kind of loop'], 0, 'Closures let a function keep access to variables from where it was created.'),
        Q('Which of these are falsy values?', ['0', '"0"', 'null', '[]'], [0, 2], '`0` and `null` are falsy; non-empty strings and arrays are truthy.', 'multiple'),
      ])]],
      ['Asynchronous JavaScript', [vid('Callbacks to promises'), vid('async / await in practice'), article('Common async mistakes', '1. Forgetting to `await` a promise.\n2. Using `forEach` with `async` callbacks.\n3. Not handling rejections — always `try/catch` around `await`.')]],
    ],
  },
  {
    title: 'React 18: Build Production-Ready Apps', cat: 'Web Development', level: 'intermediate', price: 1499, mrp: 2999, featured: true, tags: ['react', 'frontend', 'hooks'],
    subtitle: 'Hooks, routing, data fetching and performance — the way teams really build React.',
    description: 'A practical tour of React 18: components and state, effects done right, routing, server state with React Query, forms, testing and performance. You will build and ship a complete application as you go.',
    outcomes: ['Model UI as state and components', 'Use hooks confidently', 'Fetch and cache server data', 'Optimise rendering performance'],
    requirements: ['Solid JavaScript fundamentals'],
    sections: [
      ['Thinking in React', [vid('Components and props', true), vid('State and events'), article('When to lift state up', 'Lift state to the **closest common parent** of the components that need it. If many distant components need it, consider context or a store.')]],
      ['Hooks in depth', [vid('useEffect without the footguns'), vid('Custom hooks'), quiz('Checkpoint: hooks', [
        Q('When does useEffect with an empty dependency array run?', ['After every render', 'Only after the first render', 'Before render', 'Never'], 1, 'An empty array means: run once after mount.'),
        Q('Which hook stores a mutable value that does not trigger re-renders?', ['useState', 'useRef', 'useMemo', 'useReducer'], 1, '`useRef` holds a mutable `.current` without re-rendering.'),
      ])]],
      ['Shipping it', [vid('Routing and code splitting'), vid('Server state with React Query'), article('Deployment checklist', '- Environment variables\n- Error boundaries\n- Analytics & error tracking\n- Lighthouse budget')]],
    ],
  },
  {
    title: 'Node.js & MongoDB: The Backend Masterclass', cat: 'Web Development', level: 'intermediate', price: 1799, mrp: 3499, tags: ['node', 'mongodb', 'api'],
    subtitle: 'Design, secure and scale REST APIs with Express and MongoDB.',
    description: 'Build a real REST API: schema design, authentication with JWT, validation, error handling, background jobs and caching. Finish by learning the habits that make a backend reliable at scale.',
    outcomes: ['Design MongoDB schemas and indexes', 'Build secure JWT auth', 'Validate input and handle errors centrally', 'Run background jobs and caching'],
    requirements: ['JavaScript basics', 'Familiarity with the command line'],
    sections: [
      ['API foundations', [vid('Express project structure', true), vid('Routing, controllers and services'), article('Layering rules', '**Routes** map URLs, **controllers** translate HTTP, **services** hold business logic, **models** talk to the database. Never import `req`/`res` into a service.')]],
      ['Data & security', [vid('Schema design and indexes'), vid('Authentication with refresh tokens'), quiz('Checkpoint: data & security', [
        Q('Why store refresh tokens hashed?', ['Faster lookup', 'A DB leak should not leak usable tokens', 'JWT requires it', 'Smaller storage'], 1, 'Hashing means a database leak does not expose usable tokens.'),
        Q('Which index speeds up queries filtering by status and sorting by date?', ['A compound index on {status, createdAt}', 'No index', 'A text index', 'A TTL index'], 0, 'Compound indexes support filter+sort when field order matches the query.'),
      ], 50)]],
    ],
  },
  {
    title: 'Python for Data Analysis', cat: 'Data Science', level: 'beginner', price: 0, mrp: 0, featured: true, tags: ['python', 'pandas', 'data'],
    subtitle: 'A free, friendly introduction to analysing data with Python and pandas.',
    description: 'Learn Python essentials and then use pandas to clean, explore and visualise real-world style datasets. No maths degree required — just curiosity about what your data is saying.',
    outcomes: ['Write basic Python programs', 'Load, clean and transform data with pandas', 'Summarise data with groupby and pivot tables', 'Tell a story with charts'],
    requirements: ['None'],
    sections: [
      ['Python in 60 minutes', [vid('Variables, lists and dictionaries', true), vid('Loops and functions', true), article('Style tip', 'Follow PEP 8: 4-space indents, `snake_case` names, and descriptive variable names.')]],
      ['Pandas essentials', [vid('DataFrames and Series'), vid('Cleaning messy data'), quiz('Checkpoint: pandas', [
        Q('Which method shows the first rows of a DataFrame?', ['df.top()', 'df.head()', 'df.first()', 'df.start()'], 1, '`df.head()` returns the first 5 rows by default.'),
        Q('How do you count missing values per column?', ['df.isna().sum()', 'df.missing()', 'df.nulls()', 'df.count_na'], 0, '`isna()` marks missing cells; `sum()` counts them per column.'),
      ])]],
    ],
  },
  {
    title: 'UI/UX Design Fundamentals', cat: 'Design', level: 'beginner', price: 799, mrp: 1499, tags: ['ux', 'ui', 'figma'],
    subtitle: 'Research, wireframe and design interfaces people enjoy using.',
    description: 'Understand users, structure information, and craft interfaces with sound visual hierarchy, colour, typography and spacing. Practice with guided exercises and portfolio-ready deliverables.',
    outcomes: ['Run lightweight user research', 'Create wireframes and flows', 'Apply hierarchy, colour and type', 'Test and iterate designs'],
    requirements: ['No design experience required'],
    sections: [
      ['Understanding users', [vid('What is UX, really?', true), article('Five interview questions that work', '1. Walk me through the last time you…\n2. What was frustrating?\n3. What did you try before?\n4. What would a perfect result look like?\n5. Who else is involved?')]],
      ['Visual design', [vid('Hierarchy and layout'), vid('Colour and typography'), quiz('Checkpoint: visual design', [
        Q('The recommended minimum text contrast ratio (WCAG AA) for body text is…', ['2:1', '3:1', '4.5:1', '10:1'], 2, 'WCAG AA requires 4.5:1 for normal-size text.'),
        Q('Which creates the strongest visual hierarchy?', ['Everything bold', 'Varying size, weight and colour with intent', 'Centering all text', 'More borders'], 1, 'Hierarchy comes from deliberate contrast in size, weight and colour.'),
      ])]],
    ],
  },
  {
    title: 'Digital Marketing Essentials', cat: 'Marketing', level: 'all', price: 0, mrp: 0, tags: ['seo', 'content', 'social'],
    subtitle: 'SEO, content and social basics to grow any small business — free.',
    description: 'A short, practical programme covering how search engines work, writing content that ranks, and running a simple social media plan. Includes templates you can use the same day.',
    outcomes: ['Do basic keyword research', 'Write SEO-friendly pages', 'Plan a month of social content', 'Measure what matters'],
    requirements: ['None'],
    sections: [
      ['Search basics', [vid('How search engines work', true), article('Keyword research in 15 minutes', 'Start with 10 seed terms, expand using autocomplete, and group by intent (learn, compare, buy).')]],
      ['Content & social', [vid('Writing for humans and search'), quiz('Checkpoint: marketing basics', [
        Q('Which metric best shows how many visitors took the action you wanted?', ['Impressions', 'Conversion rate', 'Bounce rate', 'Page weight'], 1, 'Conversion rate = actions ÷ visitors.'),
      ], 100)]],
    ],
  },
];

export async function seed() {
  /* users */
  const upsertUser = async (email, data, password) =>
    User.findOneAndUpdate({ email }, { $setOnInsert: { email, passwordHash: await hash(password) }, $set: data }, { upsert: true, new: true });

  const admin = await upsertUser(env.SEED_ADMIN_EMAIL, { name: 'Platform Admin', role: 'admin', emailVerified: true }, env.SEED_ADMIN_PASSWORD);
  const instructors = [];
  for (const [email, name, headline] of [
    ['priya.menon@learnsphere.local', 'Priya Menon', 'Senior Full-Stack Engineer · 10+ years teaching code'],
    ['arun.das@learnsphere.local', 'Arun Das', 'Data Scientist & former analytics lead'],
    ['sara.khan@learnsphere.local', 'Sara Khan', 'Product Designer · ex-design lead at a fintech'],
  ]) {
    instructors.push(await upsertUser(email, { name, role: 'instructor', headline, bio: `${name} loves explaining hard things simply.`, instructor: { approved: true, approvedAt: new Date() }, emailVerified: true }, 'Teacher@12345'));
  }
  const students = [];
  for (const [email, name] of [['student@learnsphere.local', 'Demo Student'], ['riya.sen@learnsphere.local', 'Riya Sen']]) {
    students.push(await upsertUser(email, { name, role: 'student', emailVerified: true }, 'Student@12345'));
  }
  say('users: admin, 3 instructors, 2 students');

  /* categories */
  const catMap = {};
  for (const [i, [name, icon, description]] of CATEGORIES.entries()) {
    catMap[name] = await Category.findOneAndUpdate({ slug: slugify(name) }, { $setOnInsert: { name, slug: slugify(name), icon, description, sortOrder: i } }, { upsert: true, new: true });
  }
  say(`${CATEGORIES.length} categories`);

  /* courses (skip any that already exist) */
  const owner = { 'Web Development': 0, 'Data Science': 1, Design: 2, Marketing: 1 };
  const created = [];
  for (const c of COURSES) {
    const slug = slugify(c.title);
    if (await Course.exists({ slug })) continue;
    const instructor = instructors[owner[c.cat] ?? 0];
    const course = await Course.create({
      title: c.title, slug, subtitle: c.subtitle, description: c.description, instructor: instructor._id, category: catMap[c.cat]._id, level: c.level,
      tags: c.tags, outcomes: c.outcomes, requirements: c.requirements, price: c.price, mrp: c.mrp, featured: Boolean(c.featured),
      thumbnail: null, status: 'published', publishedAt: new Date(), sections: c.sections.map(([title], i) => ({ title, order: i })),
    });
    for (const [si, [, items]] of c.sections.entries()) {
      for (const [li, item] of items.entries()) {
        const { quiz: qz, ...lessonData } = item;
        const lesson = await Lesson.create({ ...lessonData, course: course._id, section: course.sections[si]._id, order: li });
        if (qz) await Quiz.create({ course: course._id, lesson: lesson._id, ...qz });
      }
    }
    await recalcStats(course._id);
    created.push(course);
  }
  say(`${created.length} new courses (existing ones were left untouched)`);

  /* demo enrolments, progress and a review for the demo student */
  const demo = students[0];
  for (const slug of [slugify(COURSES[3].title), slugify(COURSES[0].title)]) {
    const course = await Course.findOne({ slug });
    if (!course || (await Enrollment.exists({ user: demo._id, course: course._id }))) continue;
    const lessons = await Lesson.find({ course: course._id, type: { $ne: 'quiz' } }).sort({ order: 1 }).lean();
    const done = lessons.slice(0, Math.max(1, Math.floor(lessons.length / 2))).map((l) => l._id);
    const total = await Lesson.countDocuments({ course: course._id });
    await Enrollment.create({ user: demo._id, course: course._id, instructor: course.instructor, source: course.price ? 'admin' : 'free', completed: done, percent: Math.floor((done.length / total) * 100), lastLesson: done[done.length - 1] });
    await Course.updateOne({ _id: course._id }, { $inc: { 'stats.enrolled': 1 } });
    await Review.updateOne({ user: demo._id, course: course._id }, { $setOnInsert: { rating: 5, comment: 'Clear explanations and just the right pace.' } }, { upsert: true });
    await refreshRating(course._id);
  }

  await Coupon.updateOne({ code: 'WELCOME20' }, { $setOnInsert: { code: 'WELCOME20', type: 'percent', value: 20, maxDiscount: 500, owner: admin._id, isActive: true } }, { upsert: true });
  say('demo enrolments + coupon WELCOME20');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  connectDB()
    .then(() => seed())
    .then(() => {
      logger.info('Seed complete. Logins -> admin: %s / %s | instructors: priya.menon@learnsphere.local / Teacher@12345 | student@learnsphere.local / Student@12345 | coupon WELCOME20', env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD);
      return disconnectDB();
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
