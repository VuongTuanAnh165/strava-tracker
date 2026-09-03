# Hướng dẫn chi tiết Phase 7: Deploy & Vận hành

Ở Phase này, bạn sẽ đưa website lên môi trường thực tế (Vercel) và cấu hình Strava Webhook để điểm số tự động cập nhật ngay khi VĐV hoàn thành bài chạy, không cần bấm nút Sync.

Dưới đây là từng bước chi tiết bạn cần làm:

---

## Bước 1: Deploy code lên Vercel

1. Đẩy (push) thư mục code này lên một repository trên **GitHub**, **GitLab**, hoặc **Bitbucket**. (Lưu ý: Không đẩy các file `.env` hay file JSON cấu hình của Firebase).
2. Đăng nhập vào [Vercel](https://vercel.com/) và tạo project mới bằng cách chọn repository vừa push.
3. Trong màn hình cài đặt Project (trước khi bấm Deploy), vào mục **Environment Variables** và nhập TẤT CẢ các biến có trong file `.env` của bạn:
   - `STRAVA_CLIENT_ID`
   - `STRAVA_CLIENT_SECRET`
   - `STRAVA_WEBHOOK_VERIFY_TOKEN` (Bạn có thể tự đặt một chuỗi bí mật ngẫu nhiên, ví dụ: `strava_tracker_webhook_secret_2026`)
   - `APP_URL` (Sẽ là URL Vercel cấp cho bạn, ví dụ: `https://ten-app-cua-ban.vercel.app`)
   - `ADMIN_SECRET` (Mật khẩu để vào trang Admin, ví dụ: `acp_admin_secret_2026`)
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_PRIVATE_KEY` (Lưu ý: copy y nguyên toàn bộ nội dung trong file `.env`, bao gồm cả `\n`)
   - `FIREBASE_CLIENT_EMAIL`
4. Bấm **Deploy**. Sau khi hoàn tất, Vercel sẽ cung cấp cho bạn một domain (ví dụ: `https://acp-race-tracker.vercel.app`). Hãy copy domain này.

---

## Bước 2: Cập nhật cấu hình trên Strava Developer

Strava cần biết domain thực tế của bạn để cho phép user đăng nhập.

1. Truy cập [Strava API Settings](https://www.strava.com/settings/api).
2. Sửa trường **Website** thành URL đầy đủ của Vercel (ví dụ: `https://acp-race-tracker.vercel.app`). Việc này giúp hiện đúng link khi VĐV cấp quyền.
3. Ở phần **Authorization Callback Domain**, đổi từ `localhost` thành domain Vercel của bạn (ví dụ: `acp-race-tracker.vercel.app`). *(Bắt buộc phải có, lưu ý: Không nhập `https://` ở ô này)*.
4. Cập nhật lại biến môi trường `APP_URL` trên Vercel thành `https://acp-race-tracker.vercel.app` (như đã hướng dẫn ở Bước 1).

---

## Bước 3: Xin quyền Extended Access từ Strava

Theo mặc định, ứng dụng Strava của bạn chỉ được phép kết nối tối đa **10 người dùng**. Vì cuộc đua của 2 đội sẽ có nhiều người hơn, bạn BẮT BUỘC phải xin nới lỏng giới hạn.

1. Gửi một email tới: `developers@strava.com`
2. Tiêu đề: `Request for Extended API Access - App ID [ID_CỦA_BẠN]`
3. Nội dung (Tiếng Anh): Giải thích rằng đây là một ứng dụng nội bộ cho cuộc đua chạy bộ của công ty trong 24 ngày, với khoảng [Số lượng] người tham gia. Bạn cam kết không lạm dụng API và chỉ đọc dữ liệu `activity:read_all`.

---

## Bước 4: Đăng ký Strava Webhook (Cực kỳ quan trọng)

Webhook giúp Strava chủ động "báo" cho website của bạn mỗi khi có ai đó vừa chạy xong, giúp điểm số cập nhật tức thời (Realtime). 

Bạn KHÔNG THỂ đăng ký Webhook qua giao diện Strava mà phải dùng Command Line (Terminal/Command Prompt) để gửi một lệnh gọi API.

Mở Terminal trên máy tính của bạn và chạy lệnh sau (Nhớ thay thế các giá trị trong ngoặc vuông bằng thông tin thực tế của bạn):

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=[STRAVA_CLIENT_ID_CUA_BAN] \
  -F client_secret=[STRAVA_CLIENT_SECRET_CUA_BAN] \
  -F callback_url=https://[DOMAIN_VERCEL_CUA_BAN]/api/webhook \
  -F verify_token=[CHUỖI_BÍ_MẬT_BẠN_ĐẶT_TRONG_ENV_VERCEL]
```

**Cách kiểm tra thành công:**
Lệnh trên sẽ trả về một JSON có chứa `"id": 123456`. Đó là ID của Webhook. Từ giờ website của bạn đã liên kết thành công với hệ thống realtime của Strava.

---

## Bước 5: Test End-to-End

1. Truy cập website bản Vercel.
2. Bấm đăng nhập, chọn đội, kết nối với Strava.
3. Mở app Strava trên điện thoại, tự tạo một hoạt động chạy bộ thử nghiệm (Manual Entry).
   *(Lưu ý: Hệ thống Anti-Cheat của chúng ta sẽ **loại bỏ (reject)** các bài Manual Entry. Bạn có thể vào trang Admin trên web bằng cách thêm `/admin` vào URL, nhập `ADMIN_SECRET` để kiểm tra log Sync xem bài chạy thử có bị Reject đúng theo luật không).*
4. Để test bài được Accept, bạn có thể chạy thực tế một đoạn ngắn (bật GPS) và lưu lại. Dashboard sẽ tự cộng điểm ngay lập tức.

---

**Cần hỗ trợ?** 
Nếu bạn gặp khó khăn ở bước 1 (cấu hình Firebase JSON lên Vercel) hoặc bước đăng ký Webhook, hãy báo để tôi giúp bạn xử lý chi tiết hơn!
