import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Award, BadgeCheck, MessageSquare, PlayCircle, Smartphone, Sparkles, Wallet } from 'lucide-react';
import { get } from '../../lib/api.js';
import { useAuth } from '../../lib/authStore.js';
import { Button } from '../../components/ui/Button.jsx';
import { Card, SectionTitle } from '../../components/ui/Card.jsx';
import { CardSkeletons } from '../../components/ui/Feedback.jsx';
import { Counter, Magnetic, Marquee, Reveal, SplitText, StaggerList } from '../../components/motion/index.jsx';
import { CourseGrid } from '../../components/common/CourseCard.jsx';
import { useMotion } from '../../hooks/useMotion.js';
import { gsap } from '../../lib/gsap.js';

const FEATURES = [
  { icon: PlayCircle, title: 'Learn your way', text: 'Video, articles and quizzes. Pick up exactly where you left off on any device.' },
  { icon: Award, title: 'Verifiable certificates', text: 'Finish a course and get a signed certificate anyone can verify online.' },
  { icon: MessageSquare, title: 'Ask the instructor', text: 'Stuck? Post a question on any lesson and get answers from the teacher and peers.' },
  { icon: Smartphone, title: 'Mobile first', text: 'Designed for phones. Install it to your home screen like an app.' },
  { icon: Wallet, title: 'Fair refunds', text: 'Not for you? Get a refund within the window if you have barely started.' },
  { icon: BadgeCheck, title: 'Reviewed courses', text: 'Every course is checked by our team before it goes live.' },
];

function Rail({ title, subtitle, query, to }) {
  return (
    <section className="container py-8 sm:py-10">
      <SectionTitle title={title} subtitle={subtitle} action={to ? <Button to={to} variant="ghost" size="sm">See all <ArrowRight className="h-4 w-4" /></Button> : null} />
      <div className="mt-5">
        {query.isLoading ? <CardSkeletons count={4} className="h-64" /> : query.data?.length ? <CourseGrid courses={query.data} /> : <p className="text-sm text-ink-500">Nothing here yet.</p>}
      </div>
    </section>
  );
}

export default function Home() {
  const user = useAuth((s) => s.user);
  const feed = useQuery({ queryKey: ['home'], queryFn: () => get('/home'), staleTime: 60_000 });
  const d = feed.data?.data;

  const hero = useMotion(() => {
    gsap.from('[data-hero-fade]', { opacity: 0, y: 24, duration: 0.9, stagger: 0.12, delay: 0.5, ease: 'power3.out' });
    gsap.to('[data-blob]', { y: -18, x: 10, duration: 5, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 1.2 });
  });

  return (
    <>
      <section ref={hero} className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-ink-50">
        <div data-blob className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-200/50 blur-3xl" />
        <div data-blob className="pointer-events-none absolute -left-24 top-40 h-72 w-72 rounded-full bg-coral-100/70 blur-3xl" />
        <div className="container relative grid items-center gap-10 py-12 sm:py-20 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p data-hero-fade className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-card"><Sparkles className="h-4 w-4" /> Skills that move your career</p>
            <SplitText text="Learn anything. Prove it." className="font-display text-4xl font-extrabold leading-[1.08] text-ink-900 sm:text-6xl" />
            <p data-hero-fade className="mt-5 max-w-xl text-lg text-ink-600">Expert-led courses with video, reading and quizzes. Learn at your pace, ask questions and earn certificates you can share.</p>
            <div data-hero-fade className="mt-8 flex flex-wrap gap-3">
              <Magnetic><Button to="/courses" size="lg">Browse courses <ArrowRight className="h-4 w-4" /></Button></Magnetic>
              {!user && <Magnetic><Button to="/register?teach=1" size="lg" variant="secondary">Teach on LearnSphere</Button></Magnetic>}
            </div>
          </div>
          <div data-hero-fade className="grid grid-cols-2 gap-3">
            {[{ n: 120000, s: '+', t: 'Learners' }, { n: 600, s: '+', t: 'Courses' }, { n: 150, s: '+', t: 'Expert instructors' }, { n: 95, s: '%', t: 'Would recommend' }].map((x) => (
              <Card key={x.t} className="p-5">
                <div className="font-display text-3xl font-extrabold text-brand-700"><Counter value={x.n} suffix={x.s} /></div>
                <p className="text-sm text-ink-500">{x.t}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {d?.categories?.length > 0 && (
        <section className="container py-6">
          <div className="flex gap-2 overflow-x-auto pb-1" role="list" aria-label="Categories">
            {d.categories.map((c) => (
              <Link key={c._id} role="listitem" to={`/courses?category=${c.slug}`} className="shrink-0 rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700">
                {c.name} <span className="text-ink-400">· {c.courseCount}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {d?.featured?.length > 0 && <Reveal><Rail title="Featured" subtitle="Hand-picked by our team" query={{ data: d.featured }} to="/courses?featured=true" /></Reveal>}
      <Reveal><Rail title="Most popular" subtitle="What learners are taking right now" query={{ isLoading: feed.isLoading, data: d?.popular }} to="/courses?sort=popular" /></Reveal>
      <Reveal><Rail title="Just added" subtitle="Fresh from our instructors" query={{ isLoading: feed.isLoading, data: d?.newest }} to="/courses?sort=newest" /></Reveal>

      <Marquee className="py-6" items={(d?.categories || []).map((c) => c.name).concat(['Certificates', 'Quizzes', 'Q&A', 'Lifetime access'])} />

      <section className="container py-10 sm:py-14">
        <SectionTitle title="Everything you need to finish what you start" />
        <StaggerList className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="p-5">
              <span className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600"><f.icon className="h-5 w-5" /></span>
              <h3 className="font-display font-bold text-ink-900">{f.title}</h3>
              <p className="mt-1 text-sm text-ink-600">{f.text}</p>
            </Card>
          ))}
        </StaggerList>
      </section>
    </>
  );
}
