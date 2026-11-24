import React from 'react';
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Layers,
  MessageSquareQuote,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { PublicHeader, WorkspaceShell } from '../components/layout/AppShell';
import { PageHeader } from '../components/ui/EditorialPrimitives';
import { ChapterDividerSvg } from '../components/visuals/EditorialSvgIllustrations';
import { useApp } from '../lib/AppContext';
import { Link } from '../lib/router';

const FIVE_DEBATE_STEPS = [
  [
    '01',
    'Lập trường & khái niệm',
    'Làm rõ luận điểm trung tâm, định nghĩa khái niệm then chốt và giới hạn phạm vi khẳng định.',
  ],
  [
    '02',
    'Giả định & bằng chứng',
    'Áp dụng Nguyên tắc Bác ái (Principle of Charity) để bóc tách các tiền đề ngầm và đối chiếu dẫn chứng cụ thể.',
  ],
  [
    '03',
    'Phản ví dụ',
    'Kiểm thử độ bền của lập luận bằng trường hợp biên, ngoại lệ lịch sử hoặc góc nhìn đối trọng.',
  ],
  [
    '04',
    'Điều chỉnh',
    'Rà soát nhất quán với các mốc U#n / A#n trước đó để thu hẹp, bổ sung điều kiện hoặc sửa đổi lập trường.',
  ],
  [
    '05',
    'Tổng kết tiến bộ',
    'Hệ thống hóa điều đã được làm sáng tỏ, các điểm mạnh – điểm hở và câu hỏi mở cho lần đọc tiếp theo.',
  ],
] as const;

export function GuidePage() {
  const { user } = useApp();

  const content = (
    <div className="mx-auto max-w-[960px] px-5 sm:px-8 py-8 lg:py-10 space-y-8">
      <PageHeader
        kicker="Phương pháp luận học thuật"
        title="Hướng dẫn đọc sâu & tranh biện có căn cứ"
        description="Mạch Ngôn không đưa ra đáp án đóng gói sẵn. Thay vào đó, nền tảng cung cấp kỷ luật đọc và khung đối thoại giúp bạn tự kiểm chứng lập luận của chính mình."
      />

      {/* Pillar 1: Three Cognitive Layers */}
      <section className="rounded-2xl p-6 sm:p-8 surface-card space-y-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)]"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-primary) 9%, var(--color-surface) 91%)',
              color: 'var(--color-primary)',
            }}
          >
            <Layers className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-[var(--color-text)]">
            1. Kỷ luật tách bạch 3 tầng nhận thức
          </h2>
        </div>
        <p className="font-reading text-[0.98rem] leading-[1.78] text-[var(--color-text-muted)]">
          Phần lớn tranh cãi đi vào ngõ cụt vì người nói trộn lẫn dữ kiện khách quan với giả định ngầm và đánh giá cá nhân. Mọi phản hồi trong Thinking Lab đều tách rõ ba tầng:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {[
            {
              tag: '[1. SỰ THẬT / DỮ KIỆN]',
              color: 'var(--color-primary)',
              body: 'Thông tin có thể kiểm chứng hoặc định nghĩa nguyên bản từ tài liệu. Nếu thiếu dữ liệu, hệ thống nói rõ là thiếu chứ không bịa nguồn.',
            },
            {
              tag: '[2. GIẢ ĐỊNH NGẦM]',
              color: 'var(--color-gold)',
              body: 'Những tiền đề chưa được nói ra mà lập luận đang mặc nhiên dựa vào — thường là điểm mù quan trọng nhất của một cuộc tranh luận.',
            },
            {
              tag: '[3. Ý KIẾN / DIỄN GIẢI]',
              color: 'var(--color-text)',
              body: 'Nhận định giá trị, phản đề đối trọng và góp ý 2 chiều (Điểm mạnh & Điểm hở) để bạn tiếp tục đối thoại hoặc điều chỉnh lập trường.',
            },
          ].map((item) => (
            <div
              key={item.tag}
              className="rounded-xl p-4 sm:p-5 border border-[var(--color-border)] bg-[var(--color-bg)]/50"
            >
              <div
                className="text-[11px] font-semibold uppercase tracking-[0.06em]"
                style={{ color: item.color }}
              >
                {item.tag}
              </div>
              <p className="mt-2.5 font-reading text-xs sm:text-[0.875rem] leading-relaxed text-[var(--color-text-muted)]">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pillar 2: 5-Step Debate Engine */}
      <section className="rounded-2xl p-6 sm:p-8 surface-card space-y-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)]"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-primary) 9%, var(--color-surface) 91%)',
              color: 'var(--color-primary)',
            }}
          >
            <Scale className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-[var(--color-text)]">
            2. Quy trình tranh biện 5 bước (Debate Engine)
          </h2>
        </div>
        <ol className="divide-y divide-[var(--color-border)]">
          {FIVE_DEBATE_STEPS.map(([num, title, desc]) => (
            <li
              key={num}
              className="py-4 first:pt-1 last:pb-0 flex flex-col sm:flex-row sm:items-baseline gap-1.5 sm:gap-5"
            >
              <div className="flex items-baseline gap-2.5 sm:w-60 shrink-0">
                <span className="font-mono-num text-xs font-semibold text-[var(--color-primary)]">
                  {num}.
                </span>
                <span className="font-display text-base font-semibold text-[var(--color-text)]">
                  {title}
                </span>
              </div>
              <span className="font-reading text-sm leading-relaxed text-[var(--color-text-muted)]">
                {desc}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Pillar 3: U#n / A#n Ledger Notation & 2-Turn Sample Dialogue */}
      <section className="rounded-2xl p-6 sm:p-8 surface-card space-y-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)]"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-primary) 9%, var(--color-surface) 91%)',
              color: 'var(--color-primary)',
            }}
          >
            <MessageSquareQuote className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-[var(--color-text)]">
            3. Cách đọc ký hiệu U#n / A#n & Ví dụ đối thoại 2 lượt
          </h2>
        </div>

        <p className="font-reading text-[0.95rem] leading-[1.75] text-[var(--color-text-muted)]">
          Trong Sổ tay mạch lập luận, mỗi lượt phát biểu được đánh mã riêng để bạn dễ trích dẫn chéo mà không bị trôi mạch:
          {' '}
          <code className="font-mono-num text-xs px-1.5 py-0.5 rounded bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-primary)] font-semibold">
            U#1, U#2…
          </code>{' '}
          là lượt lập luận của <strong>người học (User)</strong>;{' '}
          <code className="font-mono-num text-xs px-1.5 py-0.5 rounded bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-gold)] font-semibold">
            A#1, A#2…
          </code>{' '}
          là phản hồi phân tích của <strong>AI (Assistant)</strong>.
        </p>

        <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/50 p-4 sm:p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
            Minh họa đối thoại 2 lượt (Chủ đề: Đạo đức trí tuệ nhân tạo)
          </div>

          <div className="space-y-2.5 text-sm">
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-primary)]">
                <span className="font-mono-num">U#1</span>
                <span>Người học nêu lập trường ban đầu</span>
              </div>
              <p className="mt-1 font-reading text-sm text-[var(--color-text)]">
                “Nếu AI giúp chẩn đoán bệnh chính xác hơn bác sĩ, chúng ta nên giao toàn quyền quyết định y khoa cho AI.”
              </p>
            </div>

            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-gold)]">
                <span className="font-mono-num">A#1</span>
                <span>Thinking Lab tách 3 tầng & đặt phản ví dụ</span>
              </div>
              <p className="mt-1 font-reading text-sm text-[var(--color-text-muted)]">
                <strong>Điểm mạnh:</strong> Đặt tiêu chí rõ ràng dựa trên độ chính xác lâm sàng.{' '}
                <strong>Giả định ngầm:</strong> Cho rằng “độ chính xác thống kê” đồng nghĩa với “năng lực chịu trách nhiệm đạo đức”.{' '}
                <strong>Câu hỏi mở:</strong> Khi AI chẩn đoán sai ở 1% ca hiếm, ai sẽ là chủ thể chịu trách nhiệm pháp lý và giải trình với gia đình bệnh nhân?
              </p>
            </div>

            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-primary)]">
                <span className="font-mono-num">U#2</span>
                <span>Người học điều chỉnh phạm vi dựa trên A#1</span>
              </div>
              <p className="mt-1 font-reading text-sm text-[var(--color-text)]">
                “Vậy tôi điều chỉnh lập trường từ U#1: AI nên giữ vai trò sàng lọc và khuyến nghị, còn bác sĩ vẫn giữ quyền phê duyệt cuối cùng và trách nhiệm giải trình.”
              </p>
            </div>

            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-gold)]">
                <span className="font-mono-num">A#2</span>
                <span>Ghi nhận tiến bộ & chuyển bước Tổng kết</span>
              </div>
              <p className="mt-1 font-reading text-sm text-[var(--color-text-muted)]">
                Lập trường mới đã thu hẹp phạm vi từ “toàn quyền” sang mô hình “con người trong vòng kiểm soát (Human-in-the-loop)”, giải quyết trực diện khoảng trống trách nhiệm đã nêu ở A#1.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pillar 4: Library -> Thinking Lab Bridge */}
      <section className="rounded-2xl p-6 sm:p-8 surface-card space-y-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)]"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-primary) 9%, var(--color-surface) 91%)',
              color: 'var(--color-primary)',
            }}
          >
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-[var(--color-text)]">
            4. Mẹo sử dụng Library và Thinking Lab liền mạch
          </h2>
        </div>
        <ul className="space-y-3.5 font-reading text-[0.95rem] leading-[1.75] text-[var(--color-text-muted)]">
          <li className="rounded-xl p-4 surface-subtle">
            <strong className="font-ui text-sm text-[var(--color-text)]">
              Chế độ Đọc tập trung (phím F):
            </strong>{' '}
            Trong trang chi tiết tài liệu, bấm phím{' '}
            <code className="font-mono-num text-xs px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)]">
              F
            </code>{' '}
            để ẩn các thanh công cụ hai bên và tập trung hoàn toàn vào văn bản.
          </li>
          <li className="rounded-xl p-4 surface-subtle">
            <strong className="font-ui text-sm text-[var(--color-text)]">
              Giải thích nghĩa nhanh ngay trong bài đọc:
            </strong>{' '}
            Bôi đen bất kỳ từ hoặc cụm từ nào (từ 2 ký tự trở lên) rồi chọn <em>“Giải thích nghĩa”</em> để xem định nghĩa 3 phần (Cốt lõi · Ngữ cảnh câu văn · Ví dụ) mà không rời khỏi bài đọc.
          </li>
          <li className="rounded-xl p-4 surface-subtle">
            <strong className="font-ui text-sm text-[var(--color-text)]">
              Chuyển đoạn trích không đứt mạch đọc:
            </strong>{' '}
            Bấm nút <em>“Khám phá với AI”</em> trên từng khối bài đọc (hoặc bôi đen đoạn văn trên máy tính) để điền sẵn trích dẫn vào khung soạn thảo. Khi quay lại bài đọc từ chip ngữ cảnh trong Lab, trang tự cuộn về đúng vị trí bạn đang đọc dở.
          </li>
          <li className="rounded-xl p-4 surface-subtle">
            <strong className="font-ui text-sm text-[var(--color-text)]">
              Kiểm tra nhất quán dài hạn:
            </strong>{' '}
            Sau nhiều lượt trao đổi, bấm nút <em>“Trích dẫn”</em> cạnh bất kỳ mốc{' '}
            <code className="font-mono-num text-xs px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)]">
              U#n
            </code>{' '}
            hoặc{' '}
            <code className="font-mono-num text-xs px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)]">
              A#n
            </code>{' '}
            nào trong Sổ tay mạch lập luận để chất vấn lại điểm mâu thuẫn.
          </li>
        </ul>
      </section>

      {/* Pillar 5: Toulmin, 5x3 Rubric, Literary Close Reading & Shortcuts */}
      <section className="rounded-2xl p-6 sm:p-8 surface-card space-y-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)]"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-primary) 9%, var(--color-surface) 91%)',
              color: 'var(--color-primary)',
            }}
          >
            <BookOpen className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-[var(--color-text)]">
            5. Soi lập luận Toulmin, Chấm tiêu chí &amp; Phím tắt
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-reading leading-relaxed text-[var(--color-text-muted)]">
          <div className="rounded-xl p-4 surface-subtle space-y-2">
            <h3 className="font-ui text-sm font-semibold text-[var(--color-text)]">
              Soi 5 thành phần lập luận (Mô hình Toulmin)
            </h3>
            <p>
              Trên trang bài đọc hoặc chế độ <strong>Soi lập luận</strong> trong AI Labs, bạn có thể gắn nhãn từng câu theo 5 vai trò: <strong>Luận điểm</strong>, <strong>Căn cứ</strong>, <strong>Lí lẽ – giả định</strong>, <strong>Từ giới hạn</strong> và <strong>Phản bác</strong>, rồi đối chiếu với gợi ý từ AI hoặc bộ phân tích ngôn ngữ.
            </p>
          </div>

          <div className="rounded-xl p-4 surface-subtle space-y-2">
            <h3 className="font-ui text-sm font-semibold text-[var(--color-text)]">
              Bảng chấm 5 tiêu chí (thang 1–3) &amp; Đọc văn học
            </h3>
            <p>
              Đoạn viết từ 3 câu trở lên được phản hồi theo 5 tiêu chí: <strong>Luận điểm</strong>, <strong>Bằng chứng</strong>, <strong>Giả định ngầm</strong>, <strong>Xét phản đề</strong> và <strong>Dùng từ chính xác</strong>. Với tác phẩm văn chương, chọn chế độ <strong>Đọc văn bản văn học</strong> để đi từ chi tiết nghệ thuật tới cảm nhận riêng.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/55 p-4 text-xs sm:text-sm text-[var(--color-text-muted)] flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="font-semibold text-[var(--color-text)]">Phím tắt nhanh:</span>
          <span>
            <code className="font-mono-num px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)]">/</code>{' '}
            Tìm bài đọc trong Library
          </span>
          <span>
            <code className="font-mono-num px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)]">?</code>{' '}
            Mở bảng phím tắt
          </span>
          <span>
            <code className="font-mono-num px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)]">F</code>{' '}
            Đọc tập trung trong bài viết
          </span>
          <span>
            <code className="font-mono-num px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)]">Esc</code>{' '}
            Đóng bảng phụ / thoát tập trung
          </span>
        </div>
      </section>

      <ChapterDividerSvg />

      <div className="flex flex-wrap items-center justify-center gap-3.5">
        <Link to="/library" className="btn-secondary">
          <BookOpen className="h-4 w-4 text-[var(--color-primary)]" />
          Đọc tài liệu trong Library
        </Link>
        <Link to="/glossary" className="btn-secondary">
          Mở 230 Thuật ngữ A–Z
        </Link>
        <Link to="/lab" className="btn-primary">
          <BrainCircuit className="h-4 w-4" />
          Thực hành ngay trong Thinking Lab
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );

  if (!user.isAuthenticated) {
    return (
      <div className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col">
        <PublicHeader />
        <main className="flex-1">{content}</main>
      </div>
    );
  }

  return <WorkspaceShell>{content}</WorkspaceShell>;
}

