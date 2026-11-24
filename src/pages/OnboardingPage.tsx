import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Feather,
  Landmark,
  Languages,
  Layers,
  Scale,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { BrandLogo } from '../components/brand/BrandLogo';
import { useToast } from '../components/ui/ToastProvider';
import { DEFAULT_LIBRARY_CATEGORIES } from '../content/library/categories';
import { useApp } from '../lib/AppContext';
import { Link, useRouter, useSearchParams } from '../lib/router';

const CATEGORY_ICON_MAP = {
  languages: Languages,
  feather: Feather,
  landmark: Landmark,
  scale: Scale,
  compass: Compass,
  layers: Layers,
} as const;

const INTEREST_OPTIONS = DEFAULT_LIBRARY_CATEGORIES.map((cat) => ({
  id: cat.name,
  label: cat.name,
  icon: CATEGORY_ICON_MAP[cat.iconKey],
}));

const GOAL_OPTIONS = [
  'Rèn cấu trúc lập luận mạch lạc và đặt câu hỏi sắc nét',
  'Mở rộng vốn tri thức nền về triết học, ngôn ngữ và văn học',
  'Chuẩn bị tư liệu và luận điểm cho bài luận học thuật',
  'Rèn thói quen đọc chậm và phản biện điềm tĩnh mỗi tuần',
];

const DEPTH_OPTIONS = [
  'Đọc ngắn gọn súc tích (5–6 phút mỗi bài) rồi hỏi đáp ngay',
  'Đọc sâu có trích dẫn học thuật và ghi chú bên lề',
  'Chuyên khảo đa chiều kèm nhiều góc nhìn phản đề',
];

const CONFIDENCE_OPTIONS = [
  'Mới làm quen — cần gợi ý từng bước để xác định luận điểm',
  'Đang rèn luyện phân tích và tìm phản đề có căn cứ',
  'Tự tin tranh biện — muốn thử thách trực tiếp bằng đối thoại Socrates',
];

const EXPLORE_TOPIC_OPTIONS = [
  'Triết học hiện sinh & tự do lựa chọn',
  'Ngôn ngữ và tư duy: Mối liên hệ biện chứng',
  'Nguyên tắc Bác ái & nhận diện ngụy biện trong tranh luận',
  'Vẻ đẹp hàm súc của thơ ca cổ điển Việt Nam',
];

export function OnboardingPage() {
  const { user, updateUser } = useApp();
  const { showToast } = useToast();
  const { navigate } = useRouter();
  const params = useSearchParams();

  const [step, setStep] = useState(1);
  const [interests, setInterests] = useState<string[]>(user.interests);
  const [goal, setGoal] = useState(user.goal);
  const [readingDepth, setReadingDepth] = useState(user.readingDepth);
  const [confidenceLevel, setConfidenceLevel] = useState(
    user.confidenceLevel || CONFIDENCE_OPTIONS[1]
  );
  const [exploreTopic, setExploreTopic] = useState(
    user.exploreTopic || EXPLORE_TOPIC_OPTIONS[0]
  );

  // ?autostart=1 skips straight to main workspace for fast automated journeys
  useEffect(() => {
    if (params.get('autostart') === '1') {
      navigate('/dashboard', { replace: true });
    }
  }, [params, navigate]);

  const toggleInterest = (label: string) => {
    setInterests((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const finishOnboarding = () => {
    const derivedDebateStyle = confidenceLevel.includes('Socrates')
      ? 'Chất vấn sắc bén theo phong cách đối thoại Socrates'
      : confidenceLevel.includes('Mới làm quen')
        ? 'Cân bằng giữa giải thích kiến thức nền và đặt câu hỏi mở'
        : 'Phản biện điềm tĩnh, ưu tiên làm rõ giả định ngầm';

    updateUser({
      interests: interests.length > 0 ? interests : ['Triết học và tư tưởng'],
      goal,
      readingDepth,
      debateStyle: derivedDebateStyle,
      confidenceLevel,
      exploreTopic,
      onboardingCompleted: true,
    });
    showToast('Đã cá nhân hóa không gian học tập theo khảo sát của bạn.', { variant: 'success' });
    navigate('/dashboard');
  };

  const renderSingleChoiceList = (
    options: string[],
    selectedValue: string,
    onSelect: (val: string) => void
  ) => (
    <div className="mt-7 space-y-3">
      {options.map((opt) => {
        const active = selectedValue === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            aria-pressed={active}
            className={`w-full flex items-center justify-between gap-4 text-left rounded-xl px-5 py-4 border text-sm font-medium transition-all duration-200 ${
              active
                ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_7%,var(--color-surface)_93%)] text-[var(--color-text)]'
                : 'border-[var(--color-border)] bg-[var(--color-bg)]/50 text-[var(--color-text)] hover:border-[var(--color-primary)]/45 hover:bg-[var(--color-surface)]'
            }`}
          >
            <span className="leading-snug">{opt}</span>
            <span
              aria-hidden="true"
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                active
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)]'
              }`}
            >
              {active && <Check className="h-3 w-3" />}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col">
      <header className="mx-auto w-full max-w-[920px] px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center">
          <BrandLogo size="xs" />
        </Link>
        <span className="text-xs font-mono-num text-[var(--color-text-muted)]">
          Bước {step} / 5
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 pb-12 pt-2">
        <div className="w-full max-w-[780px] rounded-2xl p-6 sm:p-10 surface-card">
          {/* Top 5-Step Circular Numbered Progress Bar (1 -> 5) */}
          <div
            className="flex items-center justify-center gap-1.5 sm:gap-3"
            aria-label={`Bước ${step} trên 5`}
          >
            {[1, 2, 3, 4, 5].map((num, idx) => (
              <React.Fragment key={num}>
                <button
                  type="button"
                  onClick={() => setStep(num)}
                  aria-current={step === num ? 'step' : undefined}
                  aria-label={`Chuyển đến bước ${num}`}
                  className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full text-xs sm:text-sm font-mono-num font-semibold border transition-colors ${
                    step === num
                      ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)]'
                      : num < step
                        ? 'bg-[var(--color-surface-muted)] text-[var(--color-primary)] border-[var(--color-primary)]/45'
                        : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-primary)]/45'
                  }`}
                >
                  {num < step ? <Check className="h-4 w-4" /> : num}
                </button>
                {idx < 4 && (
                  <span
                    className={`h-px w-6 sm:w-12 transition-colors ${
                      num < step ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
                    }`}
                    aria-hidden="true"
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8"
            >
              {step === 1 && (
                <div>
                  <h1 className="text-center font-display text-2xl sm:text-3xl font-semibold text-[var(--color-text)]">
                    Lĩnh vực bạn quan tâm là gì?
                  </h1>
                  <p className="mt-2 text-center text-sm text-[var(--color-text-muted)]">
                    Chọn 1 hoặc nhiều lĩnh vực để cá nhân hóa gợi ý học liệu.
                  </p>

                  {/* 6 Canonical Discipline Cards */}
                  <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {INTEREST_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const selected = interests.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleInterest(opt.id)}
                          aria-pressed={selected}
                          className={`relative min-h-[144px] flex flex-col items-center justify-center gap-3.5 rounded-2xl p-5 border text-center transition-all duration-200 ${
                            selected
                              ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-surface)_92%)]'
                              : 'border-[var(--color-border)] bg-[var(--color-bg)]/55 hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface)]'
                          }`}
                        >
                          {selected && (
                            <span
                              className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full"
                              style={{
                                backgroundColor: 'var(--color-primary)',
                                color: 'var(--color-on-primary)',
                              }}
                              aria-hidden="true"
                            >
                              <Check className="h-3 w-3" />
                            </span>
                          )}
                          <div
                            className="flex h-14 w-14 items-center justify-center rounded-2xl transition-colors"
                            style={{
                              backgroundColor: selected
                                ? 'color-mix(in srgb, var(--color-primary) 16%, var(--color-surface) 84%)'
                                : 'color-mix(in srgb, var(--color-primary) 10%, var(--color-bg) 90%)',
                              color: 'var(--color-primary)',
                            }}
                          >
                            <Icon className="h-7 w-7" />
                          </div>
                          <span className="text-sm font-semibold leading-snug text-[var(--color-text)]">
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h1 className="text-center font-display text-2xl sm:text-3xl font-semibold text-[var(--color-text)]">
                    Mục tiêu học tập trọng tâm của bạn là gì?
                  </h1>
                  <p className="mt-2 text-center text-sm text-[var(--color-text-muted)]">
                    Mạch Ngôn không áp lực điểm số — chỉ tập trung vào chiều sâu hiểu biết.
                  </p>
                  {renderSingleChoiceList(GOAL_OPTIONS, goal, setGoal)}
                </div>
              )}

              {step === 3 && (
                <div>
                  <h1 className="text-center font-display text-2xl sm:text-3xl font-semibold text-[var(--color-text)]">
                    Phong cách tiếp nhận kiến thức bạn yêu thích?
                  </h1>
                  <p className="mt-2 text-center text-sm text-[var(--color-text-muted)]">
                    Bạn luôn có thể điều chỉnh lại trong mục Hồ sơ & Cài đặt.
                  </p>
                  {renderSingleChoiceList(DEPTH_OPTIONS, readingDepth, setReadingDepth)}
                </div>
              )}

              {step === 4 && (
                <div>
                  <h1 className="text-center font-display text-2xl sm:text-3xl font-semibold text-[var(--color-text)]">
                    Mức độ tự tin của bạn khi phân tích và lập luận?
                  </h1>
                  <p className="mt-2 text-center text-sm text-[var(--color-text-muted)]">
                    Thinking Lab sẽ điều chỉnh nhịp gợi mở phù hợp mà vẫn giữ nguyên 3 tầng nhận thức.
                  </p>
                  {renderSingleChoiceList(CONFIDENCE_OPTIONS, confidenceLevel, setConfidenceLevel)}
                </div>
              )}

              {step === 5 && (
                <div>
                  <h1 className="text-center font-display text-2xl sm:text-3xl font-semibold text-[var(--color-text)]">
                    Chủ đề nào bạn muốn khám phá đầu tiên?
                  </h1>
                  <p className="mt-2 text-center text-sm text-[var(--color-text-muted)]">
                    Bước cuối cùng trước khi mở thư phòng cá nhân và danh mục gợi ý riêng cho bạn.
                  </p>
                  {renderSingleChoiceList(EXPLORE_TOPIC_OPTIONS, exploreTopic, setExploreTopic)}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer Controls: "Bỏ qua" on left, "Tiếp tục ->" on right */}
          <div className="mt-9 pt-5 border-t border-[var(--color-border)] flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn-secondary !min-h-10 !px-4 !text-sm"
              >
                Bỏ qua
              </button>
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="btn-ghost !min-h-10"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Quay lại
                </button>
              )}
            </div>

            {step < 5 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="btn-primary !min-h-10 !px-6"
              >
                Tiếp tục
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={finishOnboarding}
                className="btn-primary !min-h-10 !px-6"
              >
                Hoàn tất
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
