import React from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Compass,
  GraduationCap,
  Mail,
  Scale,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { PublicHeader, WorkspaceShell } from '../components/layout/AppShell';
import { PageHeader } from '../components/ui/EditorialPrimitives';
import { LIBRARY_CONCEPTS } from '../content/library/concepts';
import { useApp } from '../lib/AppContext';
import { Link } from '../lib/router';

const EDITORIAL_PROCESS = [
  {
    step: '01',
    title: 'Tuyển chọn chủ đề cốt lõi',
    detail:
      'Tập trung vào 6 trụ cột tri thức: Ngôn ngữ học, Văn học – Lý luận văn học, Triết học, Logic – Lập luận, Tư duy phản biện và Liên ngành.',
  },
  {
    step: '02',
    title: 'Biên soạn cấu trúc đọc chậm',
    detail:
      'Mỗi bài đọc được chia thành khối khái niệm, dẫn chứng kinh điển, góc nhìn phản biện cân bằng và câu hỏi thực hành lập trường.',
  },
  {
    step: '03',
    title: 'Đối chiếu & gắn huy hiệu nguồn minh bạch',
    detail:
      'Chỉ những học liệu có tối thiểu 2 nguồn tham khảo học thuật đã đối chiếu mới gắn nhãn “Đã kiểm chứng nguồn”; các bài đang hoàn thiện ghi rõ trạng thái cập nhật.',
  },
];

const AUDIENCE_GROUPS = [
  {
    title: 'Học sinh THPT & người tự học',
    detail:
      'Rèn kỹ năng đọc sâu, phân tích đề nghị luận xã hội – văn học, bóc tách giả định ngầm và tránh lỗi ngụy biện thường gặp.',
  },
  {
    title: 'Sinh viên & nhóm câu lạc bộ tranh biện',
    detail:
      'Luyện đối thoại Socrates 5 bước, chuẩn bị luận điểm hai chiều có căn cứ và xuất báo cáo phản biện sau mỗi phiên.',
  },
  {
    title: 'Giáo viên Ngữ văn & Giáo dục công dân',
    detail:
      'Sử dụng chuyên luận mở và hệ thống câu hỏi gợi mở làm tư liệu thảo luận trên lớp theo tinh thần đối thoại cởi mở.',
  },
];

export function AboutPage() {
  const { user, publishedDocuments, visibleCategories, publishedCollections } = useApp();

  const content = (
    <div className="mx-auto max-w-[1040px] px-5 sm:px-8 py-8 lg:py-12 space-y-10">
      <PageHeader
        kicker="Về dự án Mạch Ngôn"
        title="Không dạy bạn phải nghĩ gì — mà đồng hành để bạn biết cách suy nghĩ"
        description="Mạch Ngôn là không gian đọc chậm và rèn luyện tư duy ngôn ngữ, lập luận, phản biện dành cho học sinh và người tự học tiếng Việt."
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link to="/library" className="btn-primary !min-h-10 !px-4 !text-xs">
              <BookOpen className="h-3.5 w-3.5" />
              Khám phá AI Library
            </Link>
            <Link to="/guide" className="btn-secondary !min-h-10 !px-4 !text-xs">
              <Compass className="h-3.5 w-3.5" />
              Hướng dẫn sử dụng
            </Link>
          </div>
        }
      />

      {/* 1. Mục tiêu sư phạm */}
      <section className="rounded-2xl p-6 sm:p-8 surface-card space-y-4">
        <div className="flex items-center gap-2.5 text-[var(--color-primary)]">
          <GraduationCap className="h-5 w-5" />
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-[var(--color-text)]">
            1. Mục tiêu sư phạm
          </h2>
        </div>
        <div className="font-reading text-base leading-relaxed text-[var(--color-text)] space-y-3">
          <p>
            Giữa dòng chảy thông tin ngắn và tốc độ cao, việc dừng lại để đọc kỹ một lập luận, phân biệt dữ kiện với suy diễn và đặt câu hỏi ngược lại niềm tin của chính mình trở thành năng lực ngày càng quý giá.
          </p>
          <p>
            Mạch Ngôn được xây dựng xoay quanh hai trụ cột tách biệt nhưng bổ trợ chặt chẽ: <strong>AI Library</strong> (kho chuyên luận đọc chậm có chú giải thuật ngữ và dẫn nguồn rõ ràng) và <strong>AI Labs</strong> (phòng thí nghiệm đối thoại theo phương pháp Socrates, đặt câu hỏi gợi mở thay vì viết bài mẫu hay áp đặt đáp án).
          </p>
        </div>
      </section>

      {/* 2. Đối tượng hướng tới */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5 text-[var(--color-primary)]">
          <Users className="h-5 w-5" />
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-[var(--color-text)]">
            2. Đối tượng hướng tới
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {AUDIENCE_GROUPS.map((group) => (
            <div key={group.title} className="rounded-2xl p-5 surface-card flex flex-col">
              <h3 className="font-display text-base font-semibold text-[var(--color-text)]">
                {group.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
                {group.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Live Corpus Summary */}
      <section
        aria-label="Quy mô ngữ liệu hiện tại"
        className="grid grid-cols-2 sm:grid-cols-4 gap-3.5"
      >
        <div className="rounded-xl p-4 surface-card">
          <div className="font-display text-2xl font-bold font-mono-num text-[var(--color-primary)]">
            {publishedDocuments.length}
          </div>
          <div className="mt-1 text-xs text-[var(--color-text-muted)]">Chuyên luận &amp; đề mẫu</div>
        </div>
        <div className="rounded-xl p-4 surface-card">
          <div className="font-display text-2xl font-bold font-mono-num text-[var(--color-primary)]">
            {visibleCategories.length}
          </div>
          <div className="mt-1 text-xs text-[var(--color-text-muted)]">Lĩnh vực tri thức</div>
        </div>
        <div className="rounded-xl p-4 surface-card">
          <div className="font-display text-2xl font-bold font-mono-num text-[var(--color-primary)]">
            {publishedCollections.length}
          </div>
          <div className="mt-1 text-xs text-[var(--color-text-muted)]">Hành trình tự học</div>
        </div>
        <div className="rounded-xl p-4 surface-card">
          <div className="font-display text-2xl font-bold font-mono-num text-[var(--color-primary)]">
            {LIBRARY_CONCEPTS.length}
          </div>
          <div className="mt-1 text-xs text-[var(--color-text-muted)]">Thuật ngữ đối chiếu</div>
        </div>
      </section>

      {/* 3. Nhóm biên soạn */}
      <section className="rounded-2xl p-6 sm:p-8 surface-card space-y-3">
        <div className="flex items-center gap-2.5 text-[var(--color-primary)]">
          <BookOpen className="h-5 w-5" />
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-[var(--color-text)]">
            3. Nhóm biên soạn &amp; Tinh thần học thuật
          </h2>
        </div>
        <p className="text-sm sm:text-base leading-relaxed text-[var(--color-text-muted)]">
          Dự án nghiên cứu khoa học kỹ thuật học sinh trung học — <strong>Trường THPT Trần Phú, TP. Bà Rịa – Vũng Tàu</strong> (Giáo viên hướng dẫn: <strong>Lê Thị Điệp</strong> · Nhóm học sinh thực hiện: <strong>Trương Mai Lan, Xuân Lan</strong>). Các bài viết được tổng hợp và biên soạn từ sách giáo khoa Ngữ văn (Kết nối tri thức, Chân trời sáng tạo, Cánh diều), tư liệu triết học – ngôn ngữ học phổ thông, đề thi HSG Quốc gia và văn phong sáng rõ tôn trọng đa chiều quan điểm.
        </p>
      </section>

      {/* 4. Quy trình biên tập & kiểm duyệt nguồn */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5 text-[var(--color-primary)]">
          <Scale className="h-5 w-5" />
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-[var(--color-text)]">
            4. Quy trình biên tập & kiểm duyệt nguồn
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {EDITORIAL_PROCESS.map((item) => (
            <div key={item.step} className="rounded-2xl p-5 surface-card">
              <span className="font-mono-num text-xs font-semibold text-[var(--color-primary)]">
                Bước {item.step}
              </span>
              <h3 className="mt-1.5 font-display text-base font-semibold text-[var(--color-text)]">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Chính sách dữ liệu & trách nhiệm AI */}
      <section className="rounded-2xl p-6 sm:p-8 surface-card space-y-4">
        <div className="flex items-center gap-2.5 text-[var(--color-primary)]">
          <ShieldCheck className="h-5 w-5" />
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-[var(--color-text)]">
            5. Chính sách dữ liệu & Trách nhiệm AI
          </h2>
        </div>
        <ul className="space-y-2.5 text-sm leading-relaxed text-[var(--color-text)]">
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[var(--color-success)]" />
            <span>
              <strong>Quyền riêng tư cục bộ:</strong> Trong phiên bản V1, hồ sơ học tập, ghi chú đọc chậm và lịch sử phiên Lab được lưu trực tiếp trên trình duyệt của bạn. Bạn có thể xuất toàn bộ dữ liệu (JSON) hoặc xóa sạch bất cứ lúc nào trong trang <Link to="/profile" className="text-[var(--color-primary)] underline">Hồ sơ & Cài đặt</Link>.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[var(--color-success)]" />
            <span>
              <strong>Bảo mật khóa API phía máy chủ:</strong> Mọi yêu cầu tới mô hình AI đều đi qua cổng trung gian bảo mật trên máy chủ, không bao giờ lộ khóa truy cập ra trình duyệt.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[var(--color-success)]" />
            <span>
              <strong>Giới hạn của AI & Trách nhiệm kiểm chứng:</strong> AI là người bạn phản biện, không phải nguồn chân lý tuyệt đối. Phản hồi AI có thể mắc sai sót; người học luôn được khuyến khích đối chiếu lại tài liệu gốc và sử dụng nút báo lỗi khi phát hiện nội dung chưa chuẩn xác.
            </span>
          </li>
        </ul>
      </section>

      {/* 6. Thông tin liên hệ */}
      <section className="rounded-2xl p-6 sm:p-8 surface-card flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[var(--color-primary)]">
            <Mail className="h-4 w-4" />
            <h2 className="font-display text-lg font-semibold text-[var(--color-text)]">
              6. Thông tin liên hệ & Đóng góp học liệu
            </h2>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">
            Mọi góp ý về biên tập nguồn tham khảo, báo lỗi nội dung hoặc đề xuất hợp tác giáo dục xin gửi về hộp thư ban biên tập: <strong>bientap@machngon.edu.vn</strong>.
          </p>
        </div>
        <Link to="/library" className="btn-primary shrink-0 !min-h-11 !px-5">
          Bắt đầu đọc ngay
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );

  if (user.isAuthenticated) {
    return <WorkspaceShell>{content}</WorkspaceShell>;
  }

  return (
    <div className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col overflow-x-clip">
      <PublicHeader />
      <main className="flex-1">{content}</main>
    </div>
  );
}
