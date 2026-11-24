# MẠCH NGÔN V2 – Hướng dẫn triển khai

## Nội dung gói
- `index.html`, `app.css`, `app.js`: giao diện và chức năng
- `library.json`: 91 bài đọc (thư viện), `gloss.json`: bảng thuật ngữ
- `img/`: logo, 4 hình nền không gian đọc, 8 ảnh bìa
- `vercel.json`: cấu hình cho Vercel

## Đưa lên Vercel (trang tĩnh, không cần build)
1. Tạo repo GitHub mới, tải toàn bộ thư mục này lên (giữ nguyên cấu trúc).
2. Vào vercel.com → Add New → Project → chọn repo → Framework Preset: **Other** → Deploy.
3. Hoặc dùng Vercel CLI: mở thư mục này trong terminal, chạy `npx vercel --prod`.

## Lưu ý về AI Labs
- Trên claude.ai (bản artifact), AI Labs dùng Claude.
- Khi chạy ở nơi khác (Vercel, máy tính), trang tự chuyển sang **chế độ cục bộ** (phân tích theo quy tắc) và ghi rõ nhãn.
- Muốn có AI thật trên Vercel cần thêm một hàm máy chủ (API route) gọi mô hình AI với khóa API đặt trong Environment Variables – không bao giờ đặt khóa API trong mã giao diện.

## Sửa nội dung
- Thêm/sửa bài đọc: chỉnh `library.json` (mỗi bài một đối tượng: `i` mã bài, `t` tiêu đề, `f` lĩnh vực, `g` thể loại, `l` cấp độ 1–3, `s` tóm lược, `k` ý chính, `b` phần phân tích chi tiết, `n` ngữ liệu, `q` câu hỏi, `w` thuật ngữ, `x` bài tập, `r` nguồn).
- Khi giáo viên đã duyệt một bài, thêm trường `"rv": "Tên người duyệt, ngày"` để hiện nhãn "Đã thẩm định".

## Trước khi công bố
- Toàn bộ nội dung do nhóm biên soạn với hỗ trợ AI, cần giáo viên thẩm định.
- Thơ văn trung đại đã đối chiếu với SGK; dị bản ghi ở dòng nguồn – nên dò lại với bộ sách trường đang dùng.
