# Multi-App Architecture Plan

Để vượt qua giới hạn 10 user/app của Strava, chúng ta sẽ chuyển đổi hệ thống từ đơn app (Single App) sang đa app (Multi-App). Bằng cách tạo 5 app trên Strava, chúng ta sẽ có tổng cộng sức chứa 50 VĐV. 

Hệ thống sẽ tự động phân phối người dùng vào các app chưa đầy.

## User Review Required

> [!IMPORTANT]
> - Bạn sẽ cần tạo 5 ứng dụng (App) riêng biệt trên Strava.
> - Mỗi ứng dụng sẽ có `Client ID`, `Client Secret`, và `Verify Token` riêng.
> - Bạn sẽ cần đăng ký Webhook cho TỪNG ỨNG DỤNG thông qua lệnh `curl` (làm 5 lần với 5 thông tin của 5 app, nhưng chung 1 đường dẫn callback webhook URL của Vercel).
> - Bạn có đồng ý với hướng tiếp cận này không?

## Open Questions

Không có. Phương pháp này hoàn toàn khả thi về mặt kỹ thuật.

## Proposed Changes

### Configuration
#### [MODIFY] `nuxt.config.ts`
- Cập nhật `runtimeConfig` để đọc một mảng cấu hình của tối đa 5 app thay vì 1 app duy nhất.
- Chúng ta sẽ dùng cấu trúc biến môi trường dạng: `STRAVA_APP_1_ID`, `STRAVA_APP_1_SECRET`, `STRAVA_APP_2_ID`, v.v...

### Frontend & Auth Flow
#### [NEW] `server/api/auth/available-app.get.ts`
- Tạo API endpoint mới để đếm số lượng user đang sử dụng từng `client_id` trong database.
- API này sẽ trả về `client_id` của một App đang có **dưới 10 users**.

#### [MODIFY] `app/pages/login.vue`
- Khi user bấm "Kết nối với Strava", gọi API `/api/auth/available-app` để lấy `client_id` khả dụng.
- Thay vì truyền `state=team_a`, sẽ truyền `state=team_a:client_id` để callback biết user đang dùng app nào.

### Backend APIs & Utils
#### [MODIFY] `server/api/auth/callback.get.ts`
- Tách tham số `state` ra để lấy `team_id` và `client_id`.
- Tìm `client_secret` tương ứng với `client_id` từ config.
- Sau khi lấy token thành công, lưu thêm trường `strava_app_id` vào document của user trong bảng `users` ở Firestore.

#### [MODIFY] `server/utils/strava.ts`
- Cập nhật hàm `exchangeAuthCode(code, clientId, clientSecret)`.
- Cập nhật hàm `refreshAccessToken(refreshToken, clientId, clientSecret)`.
- Hàm `getValidAccessToken(stravaId)` sẽ đọc `strava_app_id` từ database của user đó, sau đó lấy đúng `client_id` và `client_secret` từ config để refresh token nếu cần.

#### [MODIFY] `server/api/webhook.get.ts`
- Khi Strava gửi verify request, lấy `hub.verify_token` so sánh với danh sách `webhookToken` của TẤT CẢ 5 apps. Nếu trùng khớp bất kỳ app nào thì trả về thành công.

#### [MODIFY] `server/api/webhook.post.ts`
- (Không cần thay đổi nhiều) Webhook event có chứa `owner_id` (là Strava ID của user). Hệ thống sẽ dùng `owner_id` gọi `getValidAccessToken()`. Hàm getValidAccessToken đã tự động biết user này thuộc App nào để lấy token.

## Verification Plan
### Manual Verification
1. Bạn sẽ cập nhật file `.env` với thông tin của nhiều apps.
2. Login bằng account thử nghiệm, kiểm tra xem `strava_app_id` có được lưu đúng vào Firestore không.
3. Chạy test chức năng Sync để xem hệ thống có dùng đúng App credential để fetch API không.
