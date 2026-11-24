import React from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Circle,
  Compass,
  MessageSquareText,
  NotebookPen,
  Route,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { WorkspaceShell } from '../components/layout/AppShell';
import { DailyQuoteCard } from '../components/quote/DailyQuoteCard';
import { useTheme } from '../components/theme/ThemeProvider';
import { EmptyStateCard, PageHeader } from '../components/ui/EditorialPrimitives';
import { HybridMediaCard } from '../components/visuals/ThemeSyncedHero';
import { getLabTypeDisplayLabel } from '../lib/ai/sessionReport';
import { computeSkillMapStats } from '../lib/ai/v2Pedagogy';
import { useApp } from '../lib/AppContext';
import { EDITORIAL_IMAGES } from '../lib/assets';
import { getPersonalizedRecommendations } from '../lib/library/recommendations';
import { estimateReadingMinutes } from '../lib/library/validation';
import { Link } from '../lib/router';
import { getAllReadingProgress } from '../lib/storage';

export function DashboardPage() {
  const {
    user,
    publishedDocuments,
    publishedCollections,
    savedDocIds,
    completedDocIds,
    activeJourneyId,
    rubricScores,
    sessions,
    notes,
  } = useApp();
  const { isDark } = useTheme();

  const savedDocs = publishedDocuments.filter((d) => savedDocIds.includes(d.id));
  const recentSessions = sessions.slice(0, 3);
  const readingProgressMap = getAllReadingProgress();
  const startedDocsCount = Object.values(readingProgressMap).filter(
    (p) => p.scrollPercent >= 5
  ).length;
  const totalLedgerTurns = sessions.reduce((acc, s) => acc + s.ledger.length, 0);

  const completedCount = completedDocIds.length;
  const skillMap = computeSkillMapStats(rubricScores);
  const activeJourney =
    publishedCollections.find((col) => col.id === activeJourneyId) ??
    publishedCollections[0] ??
    null;
  const journeyDoneCount = activeJourney
    ? activeJourney.documentIds.filter((id) => completedDocIds.includes(id)).length
    : 0;
  const journeyNextDocId = activeJourney
    ? activeJourney.documentIds.find((id) => !completedDocIds.includes(id)) ??
      activeJourney.documentIds[0]
    : null;
  const journeyNextDoc = journeyNextDocId
    ? publishedDocuments.find((d) => d.id === journeyNextDocId) ?? null
    : null;

  // Unified personalized recommendations (max 3 published documents)
  const displayRecommendedDocs = getPersonalizedRecommendations(
    user,
    publishedDocuments,
    readingProgressMap,
    savedDocIds,
    3
  );

  const recentActivities = [
    ...recentSessions.map((session) => ({
      id: `sess-${session.id}`,
      to: `/lab?session=${encodeURIComponent(session.id)}`,
      title: session.title,
      space: getLabTypeDisplayLabel(session.labType),
      meta: `${session.ledger.length} mốc lập luận`,
      coverImage: EDITORIAL_IMAGES.coverEthicsDebate,
      coverAlt: session.title,
      kind: 'lab' as const,
    })),
    ...(savedDocs.length > 0 ? savedDocs.slice(0, 2) : publishedDocuments.slice(0, 1)).map(
      (doc) => ({
        id: `doc-${doc.id}`,
        to: `/library/${doc.id}`,
        title: doc.title,
        space: 'Library',
        meta: `${doc.category} · ${estimateReadingMinutes(doc.blocks, doc.excerpt)} phút đọc`,
        coverImage: doc.coverImage,
        coverAlt: doc.coverAlt,
        kind: 'library' as const,
      })
    ),
  ].slice(0, 4);

  const checklist = [
    {
      title: 'Khảo sát sở thích học tập',
      label: 'Thiết lập sở thích đọc và phong cách đối thoại (5 bước ngắn)',
      done: user.onboardingCompleted || user.interests.length > 0,
      to: '/onboarding',
      icon: Compass,
    },
    {
      title: 'Lưu chuyên luận đầu tiên',
      label: 'Đọc sâu một tài liệu học thuật và lưu vào tủ sách cá nhân',
      done: savedDocs.length > 0,
      to: '/library',
      icon: BookOpen,
    },
    {
      title: 'Thực hành phân tích 3 tầng',
      label: 'Mở ít nhất một phiên phân tích trong Concept Lab hoặc Debate Lab',
      done: sessions.some((s) => s.messages.length >= 2),
      to: '/lab',
      icon: Sparkles,
    },
    {
      title: 'Ghi chú đọc chậm bên lề',
      label: 'Lưu lại một nhận xét, câu hỏi hoặc phản đề ngay trong bài đọc',
      done: notes.length > 0,
      to: `/library/${publishedDocuments[0]?.id ?? ''}`,
      icon: NotebookPen,
    },
  ];

  const shortcutScrim = isDark
    ? 'linear-gradient(96deg, color-mix(in srgb, var(--color-surface) 95%, transparent) 0%, color-mix(in srgb, var(--color-surface) 82%, transparent) 52%, color-mix(in srgb, var(--color-surface) 22%, transparent) 100%)'
    : 'linear-gradient(96deg, color-mix(in srgb, var(--color-surface) 96%, transparent) 0%, color-mix(in srgb, var(--color-surface) 82%, transparent) 52%, color-mix(in srgb, var(--color-surface) 18%, transparent) 100%)';

  return (
    <WorkspaceShell>
      <div className="mx-auto max-w-[1220px] px-5 sm:px-8 lg:px-10 py-8 space-y-8">
        {/* Unified Personalized Greeting Header */}
        <PageHeader
          kicker="Tổng quan thư phòng"
          title={`Xin chào, ${user.name}!`}
          description={`Cùng Mạch Ngôn khám phá tri thức hôm nay — Mục tiêu: ${user.goal}`}
          leading={
            <div
              className="hidden sm:flex h-12 w-12 items-center justify-center rounded-full font-display text-lg font-bold border border-[var(--color-border)]"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, var(--color-surface) 88%)',
                color: 'var(--color-primary)',
              }}
              aria-hidden="true"
            >
              {user.name.slice(0, 1).toUpperCase()}
            </div>
          }
          action={
            <Link to="/lab" className="btn-primary">
              Mở Thinking Lab
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />

        {/* Shared Daily Quote Widget (synchronized with HomePage via /api/quotes/today) */}
        <DailyQuoteCard variant="compact" />

        {/* Real Personal Progress & Favorite Topics Strip (zero fake telemetry) */}
        <section
          aria-label="Tiến độ học tập cá nhân và chủ đề yêu thích"
          className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch"
        >
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl p-4 surface-card">
              <div className="text-[11px] font-medium text-[var(--color-text-muted)]">
                Đã đọc xong
              </div>
              <div className="mt-1.5 font-display text-2xl font-bold font-mono-num text-[var(--color-primary)]">
                {completedCount}
                <span className="ml-1 text-xs font-normal text-[var(--color-text-muted)]">
                  /{publishedDocuments.length}
                </span>
              </div>
            </div>
            <div className="rounded-xl p-4 surface-card">
              <div className="text-[11px] font-medium text-[var(--color-text-muted)]">
                Tài liệu đã lưu
              </div>
              <div className="mt-1.5 font-display text-2xl font-bold font-mono-num text-[var(--color-primary)]">
                {savedDocs.length}
              </div>
            </div>
            <div className="rounded-xl p-4 surface-card">
              <div className="text-[11px] font-medium text-[var(--color-text-muted)]">
                Phiên Lab
              </div>
              <div className="mt-1.5 font-display text-2xl font-bold font-mono-num text-[var(--color-primary)]">
                {sessions.length}
              </div>
            </div>
            <div className="rounded-xl p-4 surface-card">
              <div className="text-[11px] font-medium text-[var(--color-text-muted)]">
                Mốc lập luận
              </div>
              <div className="mt-1.5 font-display text-2xl font-bold font-mono-num text-[var(--color-primary)]">
                {totalLedgerTurns}
              </div>
            </div>
            <div className="rounded-xl p-4 surface-card">
              <div className="text-[11px] font-medium text-[var(--color-text-muted)]">
                Ghi chú
              </div>
              <div className="mt-1.5 font-display text-2xl font-bold font-mono-num text-[var(--color-primary)]">
                {notes.length}
              </div>
            </div>
            <div className="rounded-xl p-4 surface-card">
              <div className="text-[11px] font-medium text-[var(--color-text-muted)]">
                Đang đọc dở
              </div>
              <div className="mt-1.5 font-display text-2xl font-bold font-mono-num text-[var(--color-primary)]">
                {startedDocsCount}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-xl p-4 surface-card flex flex-col justify-between gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[var(--color-text)]">
                Chủ đề yêu thích của bạn
              </span>
              <Link
                to="/onboarding"
                className="text-[11px] font-medium text-[var(--color-primary)] hover:underline whitespace-nowrap"
              >
                Cập nhật khảo sát
              </Link>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {user.interests.map((topic) => (
                <Link
                  key={topic}
                  to="/library"
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)] transition-colors"
                >
                  {topic}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Active Journey Continuation & 5-Criteria Skill Map */}
        <section
          aria-label="Hành trình học tập và bản đồ kỹ năng"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
        >
          {/* Active Journey Card */}
          <div className="lg:col-span-5 rounded-2xl p-6 surface-card flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)]">
                  <Route className="h-4 w-4" aria-hidden="true" />
                  <span>Hành trình đang theo</span>
                </span>
                <Link
                  to="/library"
                  className="text-xs font-medium text-[var(--color-primary)] hover:underline whitespace-nowrap"
                >
                  Đổi hành trình
                </Link>
              </div>
              {activeJourney ? (
                <>
                  <h2 className="font-display text-xl font-semibold text-[var(--color-text)]">
                    {activeJourney.title}
                  </h2>
                  <p className="text-xs leading-relaxed text-[var(--color-text-muted)] line-clamp-2">
                    {activeJourney.description}
                  </p>
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--color-text-muted)]">Tiến độ hoàn thành</span>
                      <span className="font-mono-num font-semibold text-[var(--color-primary)]">
                        {journeyDoneCount}/{activeJourney.documentIds.length} bài
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg)] border border-[var(--color-border)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-300"
                        style={{
                          width: `${
                            activeJourney.documentIds.length > 0
                              ? Math.round((journeyDoneCount / activeJourney.documentIds.length) * 100)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)]">
                  Chọn một hành trình trong AI Library để theo lộ trình đọc có hệ thống.
                </p>
              )}
            </div>

            {journeyNextDoc && (
              <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="block text-[11px] text-[var(--color-text-muted)]">
                    Bài tiếp theo
                  </span>
                  <span className="block text-xs font-semibold text-[var(--color-text)] truncate">
                    {journeyNextDoc.title}
                  </span>
                </div>
                <Link
                  to={`/library/${journeyNextDoc.id}`}
                  className="btn-primary !min-h-9 !px-3.5 !text-xs shrink-0 whitespace-nowrap"
                >
                  Đọc tiếp
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* 5-Criteria Skill Map */}
          <div className="lg:col-span-7 rounded-2xl p-6 surface-card flex flex-col justify-between gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--color-border)]">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)]">
                  <Award className="h-4 w-4" aria-hidden="true" />
                  <span>Bản đồ kỹ năng (5 tiêu chí · thang 1–3)</span>
                </div>
                <h2 className="mt-1 font-display text-xl font-semibold text-[var(--color-text)]">
                  Hồ sơ năng lực lập luận
                </h2>
              </div>
              <Link
                to="/lab?mode=grade"
                className="btn-secondary !min-h-9 !px-3.5 !text-xs whitespace-nowrap"
              >
                Chấm bài theo tiêu chí
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {skillMap.totalRuns === 0 ? (
              <div className="py-4 text-sm text-[var(--color-text-muted)] leading-relaxed">
                Chưa có lượt chấm theo 5 tiêu chí nào. Hãy viết lập trường ở cuối bài đọc hoặc mở chế độ{' '}
                <Link to="/lab?mode=grade" className="text-[var(--color-primary)] font-semibold hover:underline">
                  Chấm theo tiêu chí
                </Link>{' '}
                trong AI Labs để theo dõi điểm trung bình và xu hướng tiến bộ theo thời gian.
              </div>
            ) : (
              <div className="space-y-3">
                {skillMap.criteria.map((item) => {
                  const pct = Math.min(100, Math.max(0, Math.round((item.average / 3) * 100)));
                  return (
                    <div key={item.key} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium text-[var(--color-text)]">{item.label}</span>
                        <div className="flex items-center gap-2 font-mono-num shrink-0">
                          {item.delta !== null && (
                            <span
                              className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
                                item.delta > 0
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : item.delta < 0
                                    ? 'text-[var(--color-gold)]'
                                    : 'text-[var(--color-text-muted)]'
                              }`}
                            >
                              {item.delta > 0 ? (
                                <>
                                  <TrendingUp className="h-3 w-3" />+{item.delta.toFixed(1)}
                                </>
                              ) : item.delta < 0 ? (
                                <>
                                  <TrendingDown className="h-3 w-3" />
                                  {item.delta.toFixed(1)}
                                </>
                              ) : (
                                '='
                              )}
                            </span>
                          )}
                          <span className="font-semibold text-[var(--color-primary)]">
                            {item.average.toFixed(1)} / 3.0
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg)] border border-[var(--color-border)]">
                        <div
                          className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {skillMap.priorityCriterion && (
                  <p className="pt-2 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
                    Dựa trên <span className="font-mono-num font-semibold text-[var(--color-text)]">{skillMap.totalRuns}</span> lượt chấm gần đây, kỹ năng nên ưu tiên rèn thêm:{' '}
                    <strong className="text-[var(--color-primary)]">{skillMap.priorityCriterion.label}</strong>{' '}
                    ({skillMap.priorityCriterion.average.toFixed(1)}/3.0).
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Two Primary Learning Space Shortcut Cards */}
        <section aria-label="Hai không gian học tập" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to="/library"
            className="group relative overflow-hidden rounded-2xl surface-card surface-card-interactive min-h-[192px] flex flex-col justify-between p-6 sm:p-7 hover:-translate-y-0.5"
          >
            <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
              <img
                src={EDITORIAL_IMAGES.coverLanguageThought}
                alt=""
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className="h-full w-full object-cover object-right hybrid-media-img transition-transform duration-300 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0" style={{ background: shortcutScrim }} />
              <div className="absolute inset-0 hybrid-media-tint" />
            </div>

            <div className="relative z-10 max-w-[72%]">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)]">
                <BookOpen className="h-4 w-4" />
                <span>Thư viện tri thức</span>
              </div>
              <h2 className="mt-2 font-display text-2xl font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                Library
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-muted)]">
                Khám phá chuyên luận tuyển chọn, mở rộng tri thức và lưu ghi chú đọc chậm.
              </p>
            </div>

            <div className="relative z-10 mt-5 flex items-center gap-2.5">
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/95 text-[var(--color-primary)] transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              >
                <ArrowRight className="h-4 w-4" />
              </span>
              <span className="text-xs font-medium text-[var(--color-text-muted)] font-mono-num">
                {publishedDocuments.length} tài liệu học thuật
              </span>
            </div>
          </Link>

          <Link
            to="/lab"
            className="group relative overflow-hidden rounded-2xl surface-card surface-card-interactive min-h-[192px] flex flex-col justify-between p-6 sm:p-7 hover:-translate-y-0.5"
          >
            <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
              <img
                src={EDITORIAL_IMAGES.coverEthicsDebate}
                alt=""
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className="h-full w-full object-cover object-right hybrid-media-img transition-transform duration-300 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0" style={{ background: shortcutScrim }} />
              <div className="absolute inset-0 hybrid-media-tint" />
            </div>

            <div className="relative z-10 max-w-[72%]">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)]">
                <BrainCircuit className="h-4 w-4" />
                <span>Concept Lab · Debate Lab</span>
              </div>
              <h2 className="mt-2 font-display text-2xl font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                Thinking Lab
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-muted)]">
                Đặt câu hỏi khái niệm, phản biện có căn cứ và suy ngẫm theo quy trình 5 bước.
              </p>
            </div>

            <div className="relative z-10 mt-5 flex items-center gap-2.5">
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/95 text-[var(--color-primary)] transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              >
                <ArrowRight className="h-4 w-4" />
              </span>
              <span className="text-xs font-medium text-[var(--color-text-muted)] font-mono-num">
                {sessions.length} phiên tư duy đã lưu
              </span>
            </div>
          </Link>
        </section>

        {/* Continue Recent Activity */}
        <section aria-labelledby="recent-activity-heading" className="rounded-2xl p-6 surface-card">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
            <div>
              <h2 id="recent-activity-heading" className="font-display text-xl font-semibold">
                Tiếp tục với hoạt động gần đây
              </h2>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                Quay lại mạch đọc hoặc phiên đối thoại bạn đang theo dõi.
              </p>
            </div>
            <Link
              to="/history"
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:underline whitespace-nowrap"
            >
              Xem tất cả
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentActivities.length === 0 ? (
            <div className="pt-6">
              <EmptyStateCard
                compact
                title="Chưa có hoạt động gần đây"
                description="Bắt đầu bằng việc đọc một chuyên luận trong Library hoặc đặt câu hỏi đầu tiên trong Thinking Lab."
              />
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {recentActivities.map((item) => (
                <li key={item.id} className="py-4 first:pt-4 last:pb-0">
                  <Link
                    to={item.to}
                    className="group flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-16 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)]">
                        <HybridMediaCard src={item.coverImage} alt={item.coverAlt} aspect="4/3" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display text-base font-semibold truncate text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                          {item.title}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                          <span className="font-medium text-[var(--color-primary)]">
                            {item.space}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-num">{item.meta}</span>
                        </div>
                      </div>
                    </div>
                    {item.kind === 'lab' ? (
                      <MessageSquareText className="h-4 w-4 shrink-0 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors" />
                    ) : (
                      <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Secondary 2-Column Area: Saved Shelf (7 cols) + Calm Learning Rhythm (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Saved Shelf */}
          <section className="lg:col-span-7 rounded-2xl p-6 surface-card">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
              <div>
                <h2 className="font-display text-xl font-semibold">Tủ sách đã lưu</h2>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  Các tài liệu bạn đánh dấu để đọc lại hoặc trích dẫn.
                </p>
              </div>
              <Link to="/library" className="text-xs font-medium text-[var(--color-primary)] hover:underline whitespace-nowrap">
                Khám phá thêm
              </Link>
            </div>

            {savedDocs.length === 0 ? (
              <div className="pt-6">
                <EmptyStateCard
                  compact
                  title="Tủ sách cá nhân đang trống"
                  description="Bấm biểu tượng đánh dấu trên bất kỳ bài đọc nào trong Library để lưu vào đây."
                  action={
                    <Link to="/library" className="btn-secondary text-xs">
                      Duyệt Library
                    </Link>
                  }
                />
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {savedDocs.map((doc) => (
                  <li key={doc.id} className="py-4 first:pt-4 last:pb-0">
                    <Link
                      to={`/library/${doc.id}`}
                      className="group flex items-center gap-4"
                    >
                      <div className="w-16 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)]">
                        <HybridMediaCard src={doc.coverImage} alt={doc.coverAlt} aspect="4/3" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-[var(--color-text-muted)]">
                          <span className="font-medium text-[var(--color-primary)]">{doc.category}</span>
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono-num">
                            {estimateReadingMinutes(doc.blocks, doc.excerpt)} phút đọc
                          </span>
                        </div>
                        <h3 className="mt-0.5 font-display text-base font-semibold truncate text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                          {doc.title}
                        </h3>
                        <p className="text-xs text-[var(--color-text-muted)] truncate">
                          {doc.author}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Calm Learning Rhythm Cards */}
          <aside className="lg:col-span-5 rounded-2xl p-6 surface-card">
            <h2 className="font-display text-xl font-semibold">Nhịp học tập gợi ý</h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
              Gợi ý nhẹ nhàng giúp bạn làm quen với chu trình đọc sâu và phản biện — không giới hạn thời gian hay điểm số.
            </p>
            <ul className="mt-5 space-y-3">
              {checklist.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.title}>
                    <Link
                      to={item.to}
                      className="group flex items-start gap-3.5 rounded-xl p-3.5 border border-[var(--color-border)] bg-[var(--color-bg)]/45 hover:bg-[var(--color-surface-muted)]/55 transition-colors"
                    >
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] mt-0.5"
                        style={{ color: item.done ? 'var(--color-success)' : 'var(--color-primary)' }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-sm font-semibold leading-snug ${
                              item.done
                                ? 'text-[var(--color-text-muted)] line-through'
                                : 'text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors'
                            }`}
                          >
                            {item.title}
                          </span>
                          {item.done ? (
                            <CheckCircle2
                              className="h-4 w-4 shrink-0"
                              style={{ color: 'var(--color-success)' }}
                              aria-label="Đã hoàn thành"
                            />
                          ) : (
                            <Circle className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
                          {item.label}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
        {/* Personalized Recommended Reading based on Onboarding Interests */}
        <section aria-labelledby="personalized-docs-heading" className="rounded-2xl p-6 surface-card">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--color-border)]">
            <div>
              <h2 id="personalized-docs-heading" className="font-display text-xl font-semibold">
                Có thể bạn muốn khám phá
              </h2>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                Chọn lọc dựa trên lĩnh vực bạn quan tâm ({user.interests.join(', ')}) và phong cách đọc “{user.readingDepth}”.
              </p>
            </div>
            <Link
              to="/library"
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:underline whitespace-nowrap"
            >
              Mở toàn bộ Library
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            {displayRecommendedDocs.map((doc) => {
              const progress = readingProgressMap[doc.id]?.scrollPercent ?? 0;
              return (
                <Link
                  key={doc.id}
                  to={`/library/${doc.id}`}
                  className="group rounded-xl p-4 border border-[var(--color-border)] bg-[var(--color-bg)]/45 hover:border-[var(--color-primary)]/50 transition-colors flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--color-text-muted)]">
                      <span className="font-semibold text-[var(--color-primary)] truncate">
                        {doc.category}
                      </span>
                      <span className="font-mono-num shrink-0">
                        {estimateReadingMinutes(doc.blocks, doc.excerpt)} phút
                      </span>
                    </div>
                    <h3 className="mt-1.5 font-display text-base font-semibold leading-snug text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-2">
                      {doc.title}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)] line-clamp-2">
                      {doc.excerpt}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[var(--color-border)]/70 flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-[var(--color-text-muted)]">
                      {progress >= 5 ? `Đã đọc ${Math.round(progress)}%` : doc.author}
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-primary)]">
                      Đọc ngay
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
