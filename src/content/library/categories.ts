import type { DocumentCategory, LibraryCategoryMeta } from '../../lib/types';

export const DEFAULT_LIBRARY_CATEGORIES: LibraryCategoryMeta[] = [
  {
    id: 'ngon-ngu-hoc',
    name: 'Ngôn ngữ học',
    shortName: 'Ngôn ngữ học',
    description:
      'Khám phá cấu trúc ngôn ngữ, ngữ nghĩa, ngữ dụng học, ẩn dụ ý niệm và mối quan hệ biện chứng giữa ngôn từ với tư duy.',
    iconKey: 'languages',
    order: 1,
  },
  {
    id: 'van-hoc-ly-luan',
    name: 'Văn học và lý luận văn học',
    shortName: 'Văn học',
    description:
      'Tiếp cận thi pháp học, tự sự học, lý thuyết tiếp nhận và tinh thần đối thoại liên văn bản trong văn chương Việt Nam và thế giới.',
    iconKey: 'feather',
    order: 2,
  },
  {
    id: 'triet-hoc-tu-tuong',
    name: 'Triết học và tư tưởng',
    shortName: 'Triết học',
    description:
      'Đối thoại cùng các trào lưu tư tưởng lớn về tự do, đạo đức đức hạnh, tri thức luận và phương pháp truy vấn Socrates.',
    iconKey: 'landmark',
    order: 3,
  },
  {
    id: 'logic-lap-luan',
    name: 'Logic và lập luận',
    shortName: 'Logic & Lập luận',
    description:
      'Rèn luyện cấu trúc suy diễn hợp lệ, mô hình lập luận Toulmin, suy luận quy nạp và kỹ năng nhận diện ngụy biện.',
    iconKey: 'scale',
    order: 4,
  },
  {
    id: 'tu-duy-phan-bien',
    name: 'Tư duy phản biện',
    shortName: 'Phản biện',
    description:
      'Thực hành Nguyên tắc Bác ái, bóc tách giả định ngầm, nhận diện thiên kiến nhận thức và kiểm chứng nguồn thông tin.',
    iconKey: 'compass',
    order: 5,
  },
  {
    id: 'kien-thuc-lien-nganh',
    name: 'Kiến thức liên ngành',
    shortName: 'Liên ngành',
    description:
      'Kết nối đạo đức AI, sinh thái học văn hóa, kinh tế học hành vi và không gian công cộng trong kỷ nguyên số.',
    iconKey: 'layers',
    order: 6,
  },
];

export const LEGACY_CATEGORY_MAP: Record<string, DocumentCategory> = {
  'ngôn ngữ học': 'Ngôn ngữ học',
  'ngôn ngữ': 'Ngôn ngữ học',
  'kỹ năng viết': 'Ngôn ngữ học',
  'văn học và lý luận văn học': 'Văn học và lý luận văn học',
  'ngữ văn': 'Văn học và lý luận văn học',
  'văn học': 'Văn học và lý luận văn học',
  'triết học và tư tưởng': 'Triết học và tư tưởng',
  'triết học - tư tưởng': 'Triết học và tư tưởng',
  'triết học': 'Triết học và tư tưởng',
  'logic và lập luận': 'Logic và lập luận',
  'tư duy - lập luận': 'Logic và lập luận',
  'tư duy và lập luận': 'Logic và lập luận',
  'tư duy phản biện': 'Tư duy phản biện',
  'kiến thức liên ngành': 'Kiến thức liên ngành',
  'văn hóa - xã hội': 'Kiến thức liên ngành',
  'lịch sử - văn hóa': 'Kiến thức liên ngành',
  'khác': 'Kiến thức liên ngành',
};

export interface EditorialRoadmapTopic {
  title: string;
  category: DocumentCategory;
  publishedDocId?: string;
}

/**
 * 60-topic editorial curriculum across 6 canonical disciplines
 * (24 published & verified documents + 36 scheduled upcoming topics).
 */
export const EDITORIAL_TOPIC_ROADMAP: EditorialRoadmapTopic[] = [
  // 1. Ngôn ngữ học
  {
    title: 'Ngôn ngữ và tư duy: giả thuyết Sapir–Whorf',
    category: 'Ngôn ngữ học',
    publishedDocId: 'ngon-ngu-va-tu-duy',
  },
  {
    title: 'Ẩn dụ ý niệm: chúng ta sống bằng ẩn dụ',
    category: 'Ngôn ngữ học',
    publishedDocId: 'an-du-y-niem',
  },
  {
    title: 'Ngữ dụng học và hàm ngôn trong giao tiếp',
    category: 'Ngôn ngữ học',
    publishedDocId: 'ngu-dung-hoc-va-ham-ngon',
  },
  {
    title: 'Kí hiệu học: cái biểu đạt và cái được biểu đạt',
    category: 'Ngôn ngữ học',
    publishedDocId: 'ki-hieu-hoc',
  },
  {
    title: 'Mạch lạc và liên kết: vì sao đoạn văn “đọc không trôi”?',
    category: 'Ngôn ngữ học',
    publishedDocId: 'mach-lac-lien-ket',
  },
  {
    title: 'Ngôn ngữ mạng và sự trong sáng của tiếng Việt',
    category: 'Ngôn ngữ học',
    publishedDocId: 'ngon-ngu-mang-chuan-muc',
  },
  { title: 'Hành vi ngôn từ (Speech Acts) và sức mạnh của lời nói', category: 'Ngôn ngữ học' },
  { title: 'Diễn ngôn quyền lực và phân tích diễn ngôn phê phán', category: 'Ngôn ngữ học' },
  { title: 'Lịch sử biến đổi ngữ nghĩa tiếng Việt qua các thời kỳ', category: 'Ngôn ngữ học' },
  { title: 'Song ngữ, chuyển mã và năng lực linh hoạt nhận thức', category: 'Ngôn ngữ học' },

  // 2. Văn học và lý luận văn học
  {
    title: 'Thi pháp thơ Đường luật: niêm, luật, đối và sức nén ngôn từ',
    category: 'Văn học và lý luận văn học',
    publishedDocId: 'tho-duong-luat-thi-phap',
  },
  {
    title: 'Điểm nhìn và người kể chuyện: ai kể, ai thấy?',
    category: 'Văn học và lý luận văn học',
    publishedDocId: 'diem-nhin-nguoi-ke-chuyen',
  },
  {
    title: 'Lí thuyết tiếp nhận: người đọc đồng sáng tạo tác phẩm',
    category: 'Văn học và lý luận văn học',
    publishedDocId: 'ly-thuyet-tiep-nhan',
  },
  {
    title: 'Liên văn bản: mọi văn bản đều đối thoại với văn bản khác',
    category: 'Văn học và lý luận văn học',
    publishedDocId: 'lien-van-ban',
  },
  {
    title: 'Hình tượng văn học và tính đa nghĩa',
    category: 'Văn học và lý luận văn học',
    publishedDocId: 'hinh-tuong-van-hoc',
  },
  {
    title: 'Đặc trưng tiểu thuyết: không gian rộng của số phận và thời đại',
    category: 'Văn học và lý luận văn học',
    publishedDocId: 'dac-trung-tieu-thuyet',
  },
  {
    title: 'Chủ nghĩa hiện thực và chủ nghĩa lãng mạn',
    category: 'Văn học và lý luận văn học',
    publishedDocId: 'chu-nghia-hien-thuc-lang-man',
  },
  {
    title: 'Cách đọc thơ tự do: nhịp, ngắt dòng và hình ảnh',
    category: 'Văn học và lý luận văn học',
    publishedDocId: 'doc-tho-tu-do',
  },
  { title: 'Biểu tượng, cổ mẫu và chiều sâu văn hóa trong truyện kể', category: 'Văn học và lý luận văn học' },
  { title: 'Thi pháp không gian và thời gian trong văn học Việt Nam đương đại', category: 'Văn học và lý luận văn học' },

  // 3. Triết học và tư tưởng
  {
    title: 'Triết học hiện sinh: con người và sự tự do',
    category: 'Triết học và tư tưởng',
    publishedDocId: 'triet-hoc-hien-sinh',
  },
  {
    title: 'Aristotle: đạo đức học đức hạnh và trung dung',
    category: 'Triết học và tư tưởng',
    publishedDocId: 'aristotle-duc-hanh',
  },
  {
    title: 'Chủ nghĩa Khắc kỷ và tự do nội tâm',
    category: 'Triết học và tư tưởng',
    publishedDocId: 'chu-nghia-khac-ky',
  },
  {
    title: 'Nho giáo: nhân, nghĩa và ảnh hưởng đến văn học trung đại',
    category: 'Triết học và tư tưởng',
    publishedDocId: 'nho-giao-nhan-nghia',
  },
  {
    title: 'Phật giáo và cảm thức vô thường trong thơ Thiền Lý – Trần',
    category: 'Triết học và tư tưởng',
    publishedDocId: 'phat-giao-vo-thuong',
  },
  {
    title: 'Lão – Trang: vô vi, tự nhiên và tinh thần ẩn dật',
    category: 'Triết học và tư tưởng',
    publishedDocId: 'lao-trang-vo-vi',
  },
  { title: 'Mệnh lệnh tuyệt đối của Immanuel Kant và đạo đức bổn phận', category: 'Triết học và tư tưởng' },
  { title: 'Chủ nghĩa vị lợi và bài toán đánh đổi lợi ích cộng đồng', category: 'Triết học và tư tưởng' },
  { title: 'Công lý như sự công bằng trong triết học John Rawls', category: 'Triết học và tư tưởng' },
  { title: 'Tri thức luận: Làm sao chúng ta biết mình thật sự biết?', category: 'Triết học và tư tưởng' },

  // 4. Logic và lập luận
  {
    title: '12 kiểu ngụy biện thường gặp và cách nhận diện',
    category: 'Logic và lập luận',
    publishedDocId: 'nguy-bien-thuong-gap',
  },
  {
    title: 'Mô hình lập luận Toulmin trong viết nghị luận',
    category: 'Logic và lập luận',
    publishedDocId: 'mo-hinh-lap-luan-toulmin',
  },
  {
    title: 'Lập luận nhân quả và loại suy: khi nào đáng tin?',
    category: 'Logic và lập luận',
    publishedDocId: 'lap-luan-nhan-qua-loai-suy',
  },
  {
    title: 'Cấu trúc bài nghị luận xã hội 600 chữ',
    category: 'Logic và lập luận',
    publishedDocId: 'cau-truc-nghi-luan-xa-hoi',
  },
  { title: 'Điều kiện cần, điều kiện đủ và lỗi đảo ngược mệnh đề', category: 'Logic và lập luận' },
  { title: 'Tam đoạn luận và ranh giới giữa hợp lệ với vững chắc', category: 'Logic và lập luận' },
  { title: 'Định nghĩa khái niệm và lỗi đánh tráo thuật ngữ', category: 'Logic và lập luận' },
  { title: 'Phản chứng (Reductio ad absurdum) trong tranh luận chuẩn mực', category: 'Logic và lập luận' },
  { title: 'Suy luận Bayes và cách cập nhật niềm tin trước bằng chứng mới', category: 'Logic và lập luận' },
  { title: 'Cấu trúc phản biện hai chiều và nghệ thuật nhượng bộ có kiểm soát', category: 'Logic và lập luận' },

  // 5. Tư duy phản biện
  {
    title: 'Nguyên tắc bác ái và “steelman” trong tranh biện',
    category: 'Tư duy phản biện',
    publishedDocId: 'nguyen-tac-bac-ai',
  },
  {
    title: 'Thiên kiến nhận thức và bẫy tư duy nhanh',
    category: 'Tư duy phản biện',
    publishedDocId: 'thien-kien-nhan-thuc',
  },
  {
    title: 'Phân biệt sự kiện, diễn giải và giả định ngầm',
    category: 'Tư duy phản biện',
    publishedDocId: 'su-kien-dien-giai-gia-dinh',
  },
  {
    title: 'Phương pháp đối thoại Socrates và nghệ thuật đặt câu hỏi',
    category: 'Tư duy phản biện',
    publishedDocId: 'phuong-phap-socrates',
  },
  { title: 'Hiệu ứng buồng vang và phân cực quan điểm trên mạng xã hội', category: 'Tư duy phản biện' },
  { title: 'Khiêm tốn tri thức (Intellectual Humility) trong học tập suốt đời', category: 'Tư duy phản biện' },
  { title: 'Đọc biểu đồ và nhận diện cách trình bày số liệu gây hiểu nhầm', category: 'Tư duy phản biện' },
  { title: 'Thí nghiệm tư tưởng như công cụ kiểm thử lập trường đạo đức', category: 'Tư duy phản biện' },
  { title: 'Tư duy hệ thống: Nhìn thấy vòng phản hồi sau sự kiện bề mặt', category: 'Tư duy phản biện' },
  { title: 'Quản trị cảm xúc trong bất đồng và tránh leo thang công kích', category: 'Tư duy phản biện' },

  // 6. Kiến thức liên ngành
  {
    title: 'Trí tuệ nhân tạo và đạo đức trách nhiệm trong học tập',
    category: 'Kiến thức liên ngành',
    publishedDocId: 'ai-va-dao-duc',
  },
  {
    title: 'Phê bình sinh thái: đọc văn học trong khủng hoảng môi trường',
    category: 'Kiến thức liên ngành',
    publishedDocId: 'van-hoc-va-moi-truong',
  },
  {
    title: 'Diễn ngôn trên mạng xã hội: tranh luận văn minh',
    category: 'Kiến thức liên ngành',
    publishedDocId: 'dien-ngon-mang-xa-hoi',
  },
  {
    title: 'Nhận diện tin giả: 5 câu hỏi trước khi chia sẻ',
    category: 'Kiến thức liên ngành',
    publishedDocId: 'nhan-dien-tin-gia',
  },
  {
    title: 'Ẩn dụ trong khoa học: khi nhà khoa học cũng là nhà văn',
    category: 'Kiến thức liên ngành',
    publishedDocId: 'an-du-trong-khoa-hoc',
  },
  {
    title: 'Sử liệu và diễn giải: đọc lịch sử như một văn bản',
    category: 'Kiến thức liên ngành',
    publishedDocId: 'su-lieu-va-dien-giai',
  },
  { title: 'Khoa học nhận thức về trí nhớ, chú ý và học sâu bền vững', category: 'Kiến thức liên ngành' },
  { title: 'Lịch sử in ấn, lưu trữ tri thức và sự hình thành đại học hiện đại', category: 'Kiến thức liên ngành' },
  { title: 'Đạo đức sinh học trong kỷ nguyên chỉnh sửa gen', category: 'Kiến thức liên ngành' },
  { title: 'Toàn cầu hóa, bản sắc địa phương và đối thoại liên văn hóa', category: 'Kiến thức liên ngành' },
];
