# Báo Cáo Kiểm Toán Bảo Mật Anti-Cheat (Phân Tích Toàn Diện)

Mình đã đọc toàn bộ tài liệu chính thức của Strava API (SummaryActivity + DetailedActivity model), đối chiếu với mã nguồn hiện tại của hệ thống, và phân tích tất cả các kịch bản gian lận có thể xảy ra. Dưới đây là kết quả kiểm toán đầy đủ nhất.

---

## Tổng hợp tất cả lỗ hổng (8 lỗ hổng)

### ✅ Đã được chặn (3 luật hiện có)
| # | Luật | Trường API | Trạng thái |
|---|------|-----------|------------|
| 1 | Sai loại hình (Walk, Ride...) | `type` | ✅ Đã chặn |
| 2 | Nhập tay (Manual Entry) | `manual` | ✅ Đã chặn |
| 3 | Ngoài thời gian giải | `start_date_local` | ✅ Đã chặn |
| 4 | Quãng đường = 0 | `distance` | ✅ Đã chặn |
| 5 | Pace trung bình quá nhanh/chậm | `moving_time / distance` | ✅ Đã chặn |
| 6 | Vận tốc tối đa bất thường | `max_speed` | ✅ Đã chặn |
| 7 | Nghỉ ngắt quãng quá nhiều | `elapsed_time / moving_time` | ✅ Đã chặn |

### ❌ Chưa được chặn (5 lỗ hổng mới phát hiện)

#### Lỗ hổng #1: Chạy máy trong nhà (Treadmill Cheat)
- **Cách gian lận:** Buộc đồng hồ vào quạt trần hoặc máy rung, bật chế độ "Indoor Run". Thiết bị dùng cảm biến gia tốc để tạo ra số KM không có GPS.
- **Trường API:** `trainer: boolean` — `true` nếu ghi trên máy tập.
- **Mức độ:** 🔴 Cao

#### Lỗ hổng #2: Bài chạy bị Strava gắn cờ gian lận (Flagged)
- **Cách gian lận:** Chính Strava đã dùng AI phát hiện bài chạy bất thường và gắn cờ đỏ (flagged). Nhưng hệ thống của chúng ta **đang bỏ qua hoàn toàn** thông tin này.
- **Trường API:** `flagged: boolean` — `true` nếu Strava đã gắn cờ nghi ngờ.
- **Mức độ:** 🔴 Cao (Strava đã bắt hộ mà mình không dùng!)

#### Lỗ hổng #3: Spam bài chạy siêu ngắn (Micro Run Spam)
- **Cách gian lận:** Đi lại lắt nhắt trong phòng 200m, 300m rồi tắt, lặp lại 20 lần/ngày. Mỗi bài đều hợp lệ (Pace đúng, không nhập tay) nhưng tạo rác hệ thống.
- **Cách bắt:** Yêu cầu cự ly tối thiểu >= 1 km.
- **Mức độ:** 🟡 Trung bình

#### Lỗ hổng #4: Dùng `sport_type` thay vì `type` (Lỗi kỹ thuật)
- **Vấn đề:** Strava API đã **DEPRECATED (ngừng hỗ trợ)** trường `type` và khuyến nghị dùng `sport_type`. Hiện tại code của chúng ta chỉ check `type` mà không check `sport_type`. Nếu Strava ngừng trả `type` trong tương lai, toàn bộ bộ lọc sẽ mất tác dụng.
- **Thêm nữa:** Trường `sport_type` có giá trị `TrailRun` (Chạy trail) mà trường `type` cũ không phân biệt (đều là `Run`). Bạn có muốn tính điểm cho người chạy trail không?
- **Mức độ:** 🟡 Trung bình (nhưng sẽ thành 🔴 nếu Strava bỏ `type`)

#### Lỗ hổng #5: Giả mạo GPS (FakeMyRun / GPX Spoofing)
- **Cách gian lận:** Dùng website tạo file `.gpx` giả, vẽ tuyến đường ảo với pace hoàn hảo, upload lên Strava. API coi đây là bài chạy thật (`manual = false`, `trainer = false`).
- **Cách bắt duy nhất khả thi:** Kiểm tra `has_heartrate`. Các tool fake GPS không thể làm giả biểu đồ nhịp tim.
- **Mức độ:** 🔴 Cao nhưng có rủi ro phụ (xem bên dưới)

---

## User Review Required

> [!IMPORTANT]
> **Luật #1, #2, #3, #4:** Mình sẽ tự động áp dụng ngay vì không có tác dụng phụ nào.

> [!CAUTION]
> **Luật #5 (Bắt buộc nhịp tim `has_heartrate`):** Cần bạn quyết định!
> - **Nếu BẬT:** Chống gian lận GPS giả 100%. Nhưng những người chỉ cài Strava trên điện thoại (không đeo đồng hồ/đai tim) sẽ bị từ chối toàn bộ bài chạy.
> - **Nếu TẮT:** Chấp nhận rủi ro nhỏ là có người dùng tool fake GPS. Nhưng lưu ý rằng Strava flagged (Lỗ hổng #2) đã phần nào bắt được các trường hợp này rồi.
> - **Gợi ý của mình:** Với giải chạy nội bộ công ty, TẮT luật này là hợp lý. Vì khả năng nhân viên dùng FakeMyRun rất thấp, và nếu có thì Strava flagged sẽ bắt.

## Proposed Changes

### [MODIFY] `server/utils/constants.ts`
- Thêm `MIN_DISTANCE = 1000` (1km tối thiểu)
- Thêm `VALID_SPORT_TYPES` (song song với `VALID_ACTIVITY_TYPES`)

### [MODIFY] `server/utils/strava.ts`
- Thêm trường `flagged`, `has_heartrate` vào interface `StravaActivity`

### [MODIFY] `server/utils/antiCheat.ts`
- Thêm Rule: Chặn `trainer === true`
- Thêm Rule: Chặn `flagged === true`
- Thêm Rule: Chặn `distance < MIN_DISTANCE`
- Cập nhật Rule type: Check cả `type` lẫn `sport_type` để tương thích tương lai
- (Tùy chọn) Thêm Rule: Chặn `has_heartrate === false`

## Verification
- Review lại toàn bộ code sau khi sửa
- Bấm Sync trên Admin để test lại với dữ liệu thực
