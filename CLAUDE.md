# Hướng dẫn làm việc trong project FootballWithMe

Đọc file này trước khi bắt đầu bất kỳ việc gì trong repo. Mục đích: một phiên Claude mới (sau `/clear`, hoặc không có memory cá nhân) chỉ cần đọc file này + các file `*_MODULE.md` liên quan là hiểu lại được cách làm việc và tiến độ, không cần hỏi lại từ đầu.

Về thông tin sản phẩm (tech stack, cấu trúc thư mục, biến môi trường, API, cách deploy): xem `README.md` và `DEPLOY_GUIDE.md`. File này **không lặp lại** nội dung đó — chỉ nói về *cách làm việc*.

---

## Bối cảnh

Ban đầu project là bài tập học React (rebuild lại `frontend-rebuild/` từ đầu, xem `FRONTEND_REBUILD_ROADMAP.md` — đã xong 8/8 module). Từ 2026-07-27, hướng chính đã chuyển sang **xây fullstack theo tính năng** (backend + frontend cùng lúc), không còn học React thuần theo `REACT_ROADMAP.md` (dừng ở Module 3, không tiếp tục). Từ đây về sau, "module mới" nghĩa là 1 tính năng fullstack, không phải 1 bài học React.

## Quy trình làm 1 module mới

1. **Khảo sát code hiện tại trước khi viết spec** — không giả định "chắc đã có sẵn". Đọc cả model/controller/route liên quan ở `backend/` lẫn page/component/api liên quan ở `frontend-rebuild/`.
2. **Quyết định kiến trúc/bảo mật quan trọng thì hỏi qua `AskUserQuestion` trước khi viết spec**, không tự chọn thay người dùng. Ví dụ đã hỏi: Google account tự động liên kết email trùng hay không, chặn đăng nhập hay chỉ nhắc khi chưa xác thực email, cách xác nhận xoá tài khoản.
3. **Viết spec thành 1 file `<TEN_MODULE>_MODULE.md` ở thư mục gốc**, cấu trúc chuẩn (xem `CHANGE_PASSWORD_MODULE.md` hoặc `DELETE_ACCOUNT_MODULE.md` làm mẫu):
   - Banner trạng thái ở đầu (`> ✅ ...` khi xong, hoặc để trống nếu chưa code) — **luôn đọc banner này trước khi hỏi "module X tới đâu rồi"**, đỡ phải dò git diff.
   - "Quyết định đã chốt" — chốt qua `AskUserQuestion`, kèm lý do.
   - Sơ đồ kiến trúc ASCII ngắn (frontend → backend → DB).
   - Các bước (`Bước 1`, `Bước 2`, ...) — mỗi bước có code mẫu **đầy đủ, dán được thẳng** (không tóm tắt bằng comment kiểu "giữ nguyên phần trên" — dễ bị hiểu nhầm là nội dung cần dán, từng gây mất code thật ở `ArticleDetail.jsx`).
   - "Kiểm tra" — checklist test tay cụ thể ở cuối mỗi bước/cuối file.
4. **KHÔNG tự `Edit` code chính theo spec vừa viết** — người dùng tự gõ lại để học, kể cả phần backend/logic (không chỉ CSS/UI). Chỉ báo "check" khi họ gõ xong.
5. **Ngoại lệ được `Edit` thẳng:** khi người dùng đã tự test/tự chỉ ra 1 bug cụ thể và nói "tự sửa/tự động sửa đi" — áp dụng cho **bug-fix cụ thể đã xác định rõ**, không tự suy rộng ra để tự dựng mới cả 1 hệ thống (từng bị nhắc: đừng tự ý cài đặt cả hạ tầng test tự động chỉ vì có câu "tự động sửa nếu có" cho 1 việc khác).
6. Sau khi người dùng báo "check", đọc `git diff` thật để rà bug — đừng tin lời kể, tự gõ tay rất hay dính lỗi kiểu: quên `!` phủ định trong `if` phức tạp, `=` thay vì `==`/`===`, quên thêm hàm mới vào `module.exports`, quên field vào dependency array của `useCallback`, quên gắn `onSubmit`/`ref` vào JSX dù đã viết state/handler, sai chính tả trong URL path/tên biến.

## Trạng thái module — nguồn sự thật là file spec, không phải trí nhớ

Danh sách `*_MODULE.md` ở thư mục gốc, mỗi file có banner trạng thái ở đầu. Không chép lại nội dung ở đây (sẽ lệch theo thời gian) — luôn mở file tương ứng để biết chính xác đã xong/chưa, còn thiếu bước nào.

Việc gần nhất (tính tới 2026-08-04): `EMAIL_VERIFICATION_MODULE.md` đã code đủ 4 bước, đã commit/push, **nhưng chưa test luồng thật và chưa chạy migration `db.users.updateMany({}, {$set:{isVerified:true}})`** cho user cũ. `DELETE_ACCOUNT_MODULE.md` mới viết spec xong, chưa code.

## Git

- Nhánh chính là **`main`** (không phải `master` — `DEPLOY_GUIDE.md` từng ghi sai, đã sửa).
- Chỉ `commit`/`push` khi người dùng yêu cầu rõ ràng ở lượt đó — không tự ý làm kèm theo việc khác.

## Vài gotcha môi trường hay lặp lại (đỡ mất thời gian debug lại)

- **`dotenv.config()` phải là dòng đầu tiên** trong `backend/src/server.js`, trước mọi `require` khác. Bất kỳ module nào đọc `process.env` ngay lúc `require` (không phải trong hàm) — như `config/cloudinary.js`, `config/mailer.js` — sẽ nhận env rỗng nếu require chạy trước `dotenv.config()`.
- **Vite chỉ đọc `.env` lúc khởi động `npm run dev`** và inline biến `VITE_*` lúc build — sửa `.env` xong phải restart dev server / build lại, không tự áp dụng như hot-reload code thường.
- Thêm field mới vào `User` schema có giá trị mặc định gây khoá tính năng (như `isVerified: false` mặc định khoá login) → luôn cần 1 bước migration DB ân xá dữ liệu cũ, ghi rõ trong spec, làm **trước khi** bật phần chặn.
