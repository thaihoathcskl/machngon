import React from 'react';
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Check,
  Compass,
  Gem,
  ShieldCheck,
  Sprout,
} from 'lucide-react';
import { motion } from 'motion/react';
import { BrandLogo } from '../components/brand/BrandLogo';
import { PublicHeader } from '../components/layout/AppShell';
import { DocumentCard } from '../components/library/DocumentCard';
import { DailyQuoteCard } from '../components/quote/DailyQuoteCard';
import { useTheme } from '../components/theme/ThemeProvider';
import { SectionHeading } from '../components/ui/EditorialPrimitives';
import { ChapterDividerSvg } from '../components/visuals/EditorialSvgIllustrations';
import { ThemeSyncedHero } from '../components/visuals/ThemeSyncedHero';
import { LIBRARY_CONCEPTS } from '../content/library/concepts';
import { useApp } from '../lib/AppContext';
import { PRESET_LIST } from '../lib/palettes';
import { Link } from '../lib/router';

const SIX_DISCIPLINE_CARDS = [
  {
    code: 'vh',
    title: 'Văn học & Lý luận',
    category: 'Văn học và lý luận văn học',
    desc: 'Thơ, truyện ngắn, kịch, kí và thi pháp tiếp nhận',
    cover: '/assets/images/cover_vh.jpg',
  },
  {
    code: 'nn',
    title: 'Ngôn ngữ học',
    category: 'Ngôn ngữ học',
    desc: 'Sapir–Whorf, ẩn dụ ý niệm, hàm ngôn và kí hiệu',
    cover: '/assets/images/cover_nn.jpg',
  },
  {
    code: 'lt',
    title: 'Logic & Lập luận',
    category: 'Logic và lập luận',
    desc: 'Mô hình Toulmin, nhân quả, ngụy biện và nghị luận',
    cover: '/assets/images/cover_lt.jpg',
  },
  {
    code: 'th',
    title: 'Triết học & Tư tưởng',
    category: 'Triết học và tư tưởng',
    desc: 'Socrates, Aristotle, Khắc kỷ, Hiện sinh, Đông phương',
    cover: '/assets/images/cover_th.jpg',
  },
  {
    code: 'pb',
    title: 'Tư duy phản biện',
    category: 'Tư duy phản biện',
    desc: 'Nguyên tắc Bác ái, tách sự kiện – diễn giải, thiên kiến',
    cover: '/assets/images/cover_pb.jpg',
  },
  {
    code: 'tt',
    title: 'Liên ngành & Công dân số',
    category: 'Kiến thức liên ngành',
    desc: 'Đạo đức AI, nhận diện tin giả, sinh thái học và truyền thông',
    cover: '/assets/images/cover_tt.jpg',
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    num: 1,
    icon: BookOpen,
    title: 'Khám phá học liệu trong AI Library',
    detail: 'Đọc sâu chuyên luận trích dẫn chuẩn xác theo 3 cấp độ Cơ bản, Trung cấp và Nâng cao.',
  },
  {
    num: 2,
    icon: BrainCircuit,
    title: 'Tương tác đối thoại trong AI Labs',
    detail: 'Phân tích khái niệm hoặc tranh biện Socrates cân bằng hai chiều kèm kiểm chứng nguồn.',
  },
  {
    num: 3,
    icon: Compass,
    title: 'Phát triển tư duy và xuất Báo cáo',
    detail: 'Lưu giữ Sổ tay mạch lập luận và tổng hợp báo cáo điểm mạnh, điểm yếu sau mỗi phiên.',
  },
];

const CORE_VALUES = [
  {
    icon: BookOpen,
    title: 'Kho học liệu (AI Library)',
    description: 'Tài liệu chọn lọc, phân cấp độ rõ ràng và đối chiếu nguồn học thuật.',
  },
  {
    icon: BrainCircuit,
    title: 'Phòng thí nghiệm tư duy (AI Labs)',
    description: 'Phản biện Socrates đa cấp độ, đính kèm tệp, rảnh tay giọng nói và xuất báo cáo.',
  },
  {
    icon: Gem,
    title: 'Giao diện tinh tế',
    description: 'Trải nghiệm đọc mượt mà, tôn trọng khoảng trắng và truyền cảm hứng.',
  },
  {
    icon: ShieldCheck,
    title: 'An toàn & minh bạch',
    description: 'Bảo mật dữ liệu, kiểm chứng nguồn dẫn và trách nhiệm với người học.',
  },
  {
    icon: Sprout,
    title: 'Đồng hành lâu dài',
    description: 'Cùng bạn bền bỉ trên hành trình đọc chậm và mở rộng tư duy.',
  },
];

export function HomePage() {
  const { user, publishedDocuments, visibleCategories, publishedCollections } = useApp();
  const { config, activePreset, isDark, selectPreset } = useTheme();

  // Diverse 6 featured docs picked cleanly across corpus
  const featuredDocs = React.useMemo(() => {
    const curatedIds = [
      'to-hoai-vo-chong-a-phu',
      'mo-hinh-lap-luan-toulmin',
      'hsgqg-2025-nlvh-camus-nghe-si',
      'ngon-ngu-va-tu-duy',
      'triet-hoc-hien-sinh',
      'ai-va-dao-duc',
    ];
    const picked = curatedIds
      .map((id) => publishedDocuments.find((d) => d.id === id))
      .filter((d): d is NonNullable<typeof d> => Boolean(d));
    if (picked.length >= 6) return picked.slice(0, 6);
    const seen = new Set(picked.map((d) => d.id));
    for (const d of publishedDocuments) {
      if (!seen.has(d.id)) {
        picked.push(d);
        seen.add(d.id);
      }
      if (picked.length >= 6) break;
    }
    return picked;
  }, [publishedDocuments]);

  // Deterministic daily reading suggestion
  const todayDoc = React.useMemo(() => {
    if (publishedDocuments.length === 0) return null;
    const dayKey = new Date().toISOString().slice(0, 10);
    let hash = 0;
    for (let i = 0; i < dayKey.length; i += 1) {
      hash = (hash * 31 + dayKey.charCodeAt(i)) >>> 0;
    }
    return publishedDocuments[hash % publishedDocuments.length];
  }, [publishedDocuments]);

  return (
    <div className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col">
      <PublicHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-[1360px] px-5 sm:px-8 lg:px-10 pt-6 pb-12 sm:pt-8 sm:pb-16">
          {/* Section 1: 2-Zone Editorial Hero (Left: Brand & Thesis · Right: 2 Large Feature Cards) */}
          <ThemeSyncedHero>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
              {/* Left Zone (5 cols) */}
              <div className="lg:col-span-5 flex flex-col">
                <p className="text-xs font-medium tracking-wide text-[var(--color-primary)]">
                  Tri thức để hiểu · Tư duy để khám phá
                </p>
                <h1 className="mt-2.5 font-display text-4xl sm:text-5xl xl:text-[3.5rem] font-bold leading-[1.1] tracking-tight text-[var(--color-primary)]">
                  MẠCH NGÔN
                </h1>
                <p className="mt-2.5 font-reading text-lg sm:text-xl italic leading-snug text-[var(--color-text)]">
                  Nền tảng học tập và phát triển tư duy
                </p>

                {/* Daily Quote System ("DANH NGÔN HÔM NAY") replacing static slogan */}
                <DailyQuoteCard variant="hero" />

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    to={user.isAuthenticated ? '/dashboard' : '/library'}
                    className="btn-primary px-6"
                  >
                    {user.isAuthenticated ? 'Tiếp tục học tập' : 'Bắt đầu ngay'}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link to="/guide" className="btn-secondary">
                    Phương pháp đọc
                  </Link>
                </div>
              </div>

              {/* Right Zone (7 cols): Two Large Feature Cards side-by-side */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
                <Link
                  to="/library"
                  className="group flex flex-col justify-between rounded-2xl p-6 sm:p-7 border border-[var(--color-border)] bg-[var(--color-surface)]/95 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary)]/55"
                  style={{ boxShadow: 'var(--shadow-card)' }}
                >
                  <div>
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--color-border)]"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, var(--color-bg) 90%)',
                        color: 'var(--color-primary)',
                      }}
                    >
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <h2 className="mt-4 font-display text-2xl font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                      AI Library
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
                      Kho học liệu độc lập gồm chuyên luận chọn lọc về triết học, ngôn ngữ, văn học và lập luận theo 3 cấp độ.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-[var(--color-border)]/80 flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono-num text-[var(--color-text-muted)]">
                      {publishedDocuments.length} tài liệu tuyển chọn
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-primary)]">
                      Vào AI Library
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>

                <Link
                  to="/lab"
                  className="group flex flex-col justify-between rounded-2xl p-6 sm:p-7 border border-[var(--color-border)] bg-[var(--color-surface)]/95 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary)]/55"
                  style={{ boxShadow: 'var(--shadow-card)' }}
                >
                  <div>
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--color-border)]"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, var(--color-bg) 90%)',
                        color: 'var(--color-primary)',
                      }}
                    >
                      <BrainCircuit className="h-6 w-6" />
                    </div>
                    <h2 className="mt-4 font-display text-2xl font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                      AI Labs
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
                      Phòng thí nghiệm tư duy độc lập: phân tích khái niệm, tranh biện rảnh tay, đính kèm tệp và xuất báo cáo.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-[var(--color-border)]/80 flex items-center justify-between gap-2 text-xs">
                    <span className="text-[var(--color-text-muted)]">
                      Tranh biện · Khái niệm · Đọc văn học · Toulmin · Chấm 5 tiêu chí
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-primary)]">
                      Mở AI Labs
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              </div>
            </div>

            {/* Live Inventory + Daily Suggestion Strip */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl p-4 border border-[var(--color-border)] bg-[var(--color-surface)]/92">
                <div>
                  <div className="font-display text-2xl font-bold font-mono-num text-[var(--color-primary)]">
                    {publishedDocuments.length}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">Bài đọc chọn lọc</div>
                </div>
                <div>
                  <div className="font-display text-2xl font-bold font-mono-num text-[var(--color-primary)]">
                    {visibleCategories.length}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">Lĩnh vực trụ cột</div>
                </div>
                <div>
                  <div className="font-display text-2xl font-bold font-mono-num text-[var(--color-primary)]">
                    {publishedCollections.length}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">Hành trình tri thức</div>
                </div>
                <Link to="/glossary" className="group">
                  <div className="font-display text-2xl font-bold font-mono-num text-[var(--color-primary)] group-hover:underline">
                    {LIBRARY_CONCEPTS.length}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)] group-hover:text-[var(--color-text)]">
                    Thuật ngữ · Thẻ ghi nhớ
                  </div>
                </Link>
              </div>

              {todayDoc && (
                <Link
                  to={`/library/${todayDoc.id}`}
                  className="lg:col-span-5 rounded-xl p-4 border border-[var(--color-border)] bg-[var(--color-surface)]/92 hover:border-[var(--color-primary)]/50 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-gold)]">
                      Gợi ý đọc hôm nay · {todayDoc.genre || todayDoc.category}
                    </div>
                    <div className="mt-0.5 font-display text-sm sm:text-base font-semibold text-[var(--color-text)] truncate">
                      {todayDoc.title}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                </Link>
              )}
            </div>

            {/* Quiet Theme Atmosphere Switcher Strip inside Hero Footer */}
            <div className="mt-4 rounded-xl px-4 py-3 border border-[var(--color-border)] bg-[var(--color-surface)]/92 backdrop-blur-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-[var(--color-text-muted)] mr-1">
                  Không gian đọc:
                </span>
                {PRESET_LIST.map((preset) => {
                  const active = config.presetId === preset.id && config.colorMode === 'preset';
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => selectPreset(preset.id)}
                      aria-pressed={active}
                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                        active
                          ? 'border-[var(--color-primary)] bg-[var(--color-bg)] text-[var(--color-text)]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full border border-black/15 shrink-0"
                        style={{ backgroundColor: preset.tokens.primary }}
                        aria-hidden="true"
                      />
                      <span>{preset.name}</span>
                      {active && <Check className="h-3 w-3 text-[var(--color-primary)]" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-[var(--color-text-muted)] sm:text-right">
                {activePreset.atmosphere}
              </p>
            </div>
          </ThemeSyncedHero>

          {/* Section 2: Cách thức hoạt động (3 connected editorial stages) */}
          <motion.section
            id="cach-thuc-hoat-dong"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            aria-labelledby="how-it-works-heading"
            className="mt-10 rounded-2xl px-6 py-7 sm:px-9 sm:py-9 surface-card scroll-mt-20"
          >
            <div className="text-center max-w-xl mx-auto">
              <p className="editorial-kicker">Quy trình học tập cốt lõi</p>
              <h2
                id="how-it-works-heading"
                className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-[var(--color-text)]"
              >
                Cách thức hoạt động
              </h2>
            </div>

            <div className="mt-7 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 lg:gap-3">
              {HOW_IT_WORKS_STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <React.Fragment key={step.num}>
                    <div className="flex-1 flex items-start gap-4 rounded-xl p-4 sm:p-5 bg-[var(--color-bg)]/55 border border-[var(--color-border)]/85">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono-num text-sm font-semibold mt-0.5"
                        style={{
                          backgroundColor: 'var(--color-primary)',
                          color: 'var(--color-on-primary)',
                        }}
                      >
                        {step.num}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 shrink-0 text-[var(--color-gold)]" aria-hidden="true" />
                          <h3 className="font-display text-base font-semibold leading-snug text-[var(--color-text)]">
                            {step.title}
                          </h3>
                        </div>
                        <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-[var(--color-text-muted)]">
                          {step.detail}
                        </p>
                      </div>
                    </div>
                    {index < HOW_IT_WORKS_STEPS.length - 1 && (
                      <div
                        aria-hidden="true"
                        className="hidden lg:flex items-center justify-center shrink-0 text-[var(--color-gold)] px-1"
                      >
                        <ArrowRight className="h-5 w-5" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </motion.section>

          <ChapterDividerSvg className="w-full max-w-xs mx-auto my-10" />

          {/* Section 3: Featured Library Documents */}
          <section aria-labelledby="featured-library-heading">
            <SectionHeading
              id="featured-library-heading"
              title="Thư viện tài liệu nổi bật"
              description="Những chuyên luận nền tảng để khởi đầu hành trình đọc sâu, phân tích khái niệm và tranh biện."
              action={
                <Link
                  to="/library"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:underline whitespace-nowrap"
                >
                  Xem toàn bộ AI Library
                  <ArrowRight className="h-4 w-4" />
                </Link>
              }
            />

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {featuredDocs.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
              ))}
            </div>
          </section>

          {/* Section 3.5: Six Disciplines Artwork Grid + Live AI Labs Dialogue Sample */}
          <section aria-labelledby="six-disciplines-heading" className="mt-14 space-y-6">
            <SectionHeading
              id="six-disciplines-heading"
              title="Sáu lĩnh vực nền tảng"
              description="Mạch Ngôn kết nối văn chương, ngôn ngữ học, logic lập luận và triết học trong một hệ thống đọc – viết thống nhất."
              action={
                <Link
                  to="/glossary"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:underline whitespace-nowrap"
                >
                  Sổ từ vựng ({LIBRARY_CONCEPTS.length} thuật ngữ)
                  <ArrowRight className="h-4 w-4" />
                </Link>
              }
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {SIX_DISCIPLINE_CARDS.map((item) => (
                <Link
                  key={item.code}
                  to={`/library?category=${encodeURIComponent(item.category)}`}
                  className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center gap-4 p-4 transition-all hover:border-[var(--color-primary)]/50 hover:-translate-y-0.5"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[var(--color-border)]">
                    <img
                      src={item.cover}
                      alt={item.title}
                      loading="lazy"
                      className="h-full w-full object-cover hybrid-media-img transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)] line-clamp-2">
                      {item.desc}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Compact AI Labs 3-Step Socrates Dialogue Preview */}
          <section className="mt-12 rounded-2xl p-6 sm:p-8 surface-card grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-5 space-y-3">
              <p className="editorial-kicker">Cách AI Labs đối thoại cùng bạn</p>
              <h2 className="font-display text-2xl font-bold text-[var(--color-text)]">
                Không viết hộ — chỉ giúp bạn nhìn rõ mạch lập luận
              </h2>
              <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
                Ở mỗi lượt, trợ lý phản hồi theo cấu trúc 3 lớp: ghi nhận điểm hợp lý, chỉ ra đúng 1 điểm hở hoặc giả định ngầm và đặt 1 câu hỏi Socrates trọng tâm.
              </p>
              <div className="pt-1">
                <Link to="/lab" className="btn-primary !min-h-10 !px-5 !text-sm">
                  Thử ngay trong AI Labs
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/65 p-5 space-y-3">
              <div className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] px-3.5 py-2.5 text-xs font-reading text-[var(--color-text)]">
                <strong className="font-ui text-[var(--color-primary)]">Học sinh:</strong>{' '}
                “Mị chạy theo A Phủ chỉ vì bản năng sống chứ không phải ý thức phản kháng.”
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] p-3">
                  <div className="font-semibold text-[var(--color-success)]">1. Ghi nhận</div>
                  <p className="mt-1 text-[var(--color-text-muted)]">
                    Nhận ra vai trò bản năng sinh tồn là điểm tựa sát thực tế.
                  </p>
                </div>
                <div className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] p-3">
                  <div className="font-semibold text-[var(--color-gold)]">2. Điểm cần soi</div>
                  <p className="mt-1 text-[var(--color-text-muted)]">
                    Từ “chỉ vì” tạo song đề giả: liệu bản năng và lòng trắc ẩn có thể cùng tồn tại?
                  </p>
                </div>
                <div className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] p-3">
                  <div className="font-semibold text-[var(--color-primary)]">3. Câu hỏi Socrates</div>
                  <p className="mt-1 text-[var(--color-text-muted)]">
                    Nếu chỉ có bản năng trốn chạy, vì sao Mị lại khựng lại trước giọt nước mắt A Phủ?
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: 5-Column Core Values Ecosystem ("Về dự án") */}
          <motion.section
            id="ve-du-an"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            aria-labelledby="core-values-heading"
            className="mt-14 rounded-2xl overflow-hidden surface-card scroll-mt-20"
          >
            <div
              className="px-6 py-4 text-center border-b border-[var(--color-border)]"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-surface-muted) 65%, var(--color-surface) 35%)',
              }}
            >
              <h2
                id="core-values-heading"
                className="font-display text-lg sm:text-xl font-semibold tracking-tight text-[var(--color-text)]"
              >
                Mạch Ngôn — Hệ sinh thái học tập và tư duy ngôn ngữ
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 lg:divide-x divide-[var(--color-border)]">
              {CORE_VALUES.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="flex flex-col items-center text-center px-5 py-7"
                  >
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border)]"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--color-primary) 9%, var(--color-bg) 91%)',
                        color: 'var(--color-primary)',
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-display text-sm font-bold leading-snug text-[var(--color-text)]">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.section>
        </div>
      </main>

      {/* Refined Compact Editorial Footer */}
      <footer
        className="border-t border-[var(--color-border)] transition-colors duration-250"
        style={
          isDark
            ? { backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }
            : { backgroundColor: 'var(--color-text)', color: 'var(--color-bg)' }
        }
      >
        <div className="mx-auto max-w-[1360px] px-5 sm:px-8 lg:px-10 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" showWordmark={false} inverted={!isDark} />
            <div>
              <div className="font-display text-base font-bold tracking-tight">MẠCH NGÔN</div>
              <div className="text-xs opacity-75">
                Tri thức để hiểu · Tư duy để khám phá · Dự án học tập THPT Trần Phú, Bà Rịa – Vũng Tàu.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium">
            <Link to="/about" className="opacity-85 hover:opacity-100 hover:underline transition-opacity">
              Giới thiệu
            </Link>
            <Link to="/library" className="opacity-85 hover:opacity-100 hover:underline transition-opacity">
              AI Library
            </Link>
            <Link to="/glossary" className="opacity-85 hover:opacity-100 hover:underline transition-opacity">
              Thuật ngữ
            </Link>
            <Link to="/lab" className="opacity-85 hover:opacity-100 hover:underline transition-opacity">
              AI Labs
            </Link>
            <Link to="/guide" className="opacity-85 hover:opacity-100 hover:underline transition-opacity">
              Hướng dẫn
            </Link>
            <Link to="/profile" className="opacity-85 hover:opacity-100 hover:underline transition-opacity">
              Hồ sơ & Bảng màu
            </Link>
            <span className="opacity-30 hidden sm:inline" aria-hidden="true">|</span>
            <span className="font-normal opacity-75">© 2026 Mạch Ngôn</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
