# Strava Team Race Tracker — Thiết Kế Kiến Trúc Tổng Thể (Master Blueprint)

> **Mục tiêu:** Website thống kê km chạy bộ từ Strava cho 2 đội thi đấu nội bộ, chống gian lận, realtime, miễn phí 100%.
>
> **Thời gian cuộc đua:** 01/09 00:00:00 → 24/09 23:59:59 (theo múi giờ Việt Nam UTC+7)
>
> **Số lượng:** ~40–50 người, chia 2 đội, mỗi đội ~20–25 người.

---

## 1. Kiến trúc Công nghệ (Tech Stack)

| Thành phần     | Công nghệ                | Vai trò                                             |
| -------------- | ------------------------ | --------------------------------------------------- |
| **Framework**  | Nuxt 4 (Full-stack)      | Vue 3 frontend + Nitro backend trong 1 source code  |
| **Styling**    | Vanilla CSS              | Dark mode, glassmorphism, micro-animations           |
| **Database**   | Firebase Firestore       | Realtime listener, free tier đủ dùng                 |
| **Auth**       | Strava OAuth 2.0         | Đăng nhập bằng tài khoản Strava, lấy access token   |
| **Realtime**   | Strava Webhooks          | Nhận thông báo khi có activity mới                   |
| **Deployment** | Vercel (Serverless)      | Free, auto-scale, zero-config cho Nuxt 4             |

---

## 2. ⚠️ Điều Kiện Tiên Quyết Quan Trọng (Prerequisites)

### 2.1 Strava API — Giới hạn Athlete Capacity

> **CRITICAL:** Strava API mặc định chỉ cho phép **10 athletes** kết nối với 1 app.
> Với ~40-50 người tham gia, bạn **BẮT BUỘC** phải đăng ký **Extended Access**.

**Các bước đăng ký Extended Access:**

1. Đảm bảo app đã có đầy đủ thông tin tại [Strava API Settings](https://www.strava.com/settings/api):
   - App Name, Website URL, Description
   - Authorization Callback Domain (domain Vercel sau khi deploy)
   - Privacy Policy URL
2. Gửi email đến `developers@strava.com` kèm:
   - Client ID của app
   - Mục đích sử dụng (cuộc đua nội bộ công ty)
   - Số lượng athletes dự kiến (~50)
   - Screenshots minh chứng tuân thủ branding guideline ("Connect with Strava" button)

### 2.2 Rate Limits

| Giới hạn          | Giá trị                      |
| ------------------ | ----------------------------- |
| 15 phút            | 200 requests                  |
| Hàng ngày          | 2,000 requests                |

→ Với 50 người, initial sync ~50 requests (1 per user) + detail fetch. Webhook-based flow giúp tối ưu, không cần polling.

### 2.3 Firebase Firestore Free Tier

| Tài nguyên      | Giới hạn miễn phí   | Dự kiến sử dụng         |
| ---------------- | -------------------- | ------------------------ |
| Reads            | 50,000/ngày          | ~5,000/ngày (dư thừa)   |
| Writes           | 20,000/ngày          | ~500/ngày (dư thừa)     |
| Bandwidth        | 10 GiB/tháng         | < 1 GiB (dư thừa)       |

### 2.4 Accounts & Credentials cần chuẩn bị

- [x] **Strava API App** — Client ID + Client Secret ✅
- [x] **Firebase Project** — Service Account JSON key ✅
- [ ] **Vercel Account** — Liên kết GitHub repo
- [ ] **Strava Extended Access** — Email xin nâng cap athlete capacity

---

## 3. Cấu trúc thư mục chuẩn Nuxt 4

```text
/strava-tracker
├── /app                          ← FRONTEND (Client-side)
│   ├── /assets
│   │   └── /css
│   │       └── main.css          # Design system: dark mode, glassmorphism
│   ├── /components
│   │   ├── TeamCard.vue          # Card hiển thị tổng km mỗi đội
│   │   ├── LeaderBoard.vue       # Bảng xếp hạng cá nhân
│   │   ├── TeamSelector.vue      # Chọn đội khi đăng nhập lần đầu
│   │   ├── ActivityFeed.vue      # Feed hoạt động gần đây
│   │   └── StravaButton.vue      # Nút "Connect with Strava" đúng branding
│   ├── /composables
│   │   ├── useFirestore.ts       # Composable kết nối Firestore realtime
│   │   └── useAuth.ts            # Composable quản lý trạng thái đăng nhập
│   ├── /pages
│   │   ├── index.vue             # Dashboard chính: 2 đội + BXH cá nhân
│   │   └── login.vue             # Trang đăng nhập + chọn đội
│   └── app.vue                   # Root component
│
├── /server                       ← BACKEND (Server-side, bí mật)
│   ├── /api
│   │   ├── auth
│   │   │   └── callback.get.ts   # Xử lý OAuth callback, đổi code → token
│   │   ├── webhook.post.ts       # Nhận webhook event từ Strava
│   │   ├── webhook.get.ts        # Verify webhook subscription (challenge)
│   │   ├── sync.post.ts          # Đồng bộ activities quá khứ (01/09 → now)
│   │   └── leaderboard.get.ts    # API lấy dữ liệu BXH (fallback khi ko dùng realtime)
│   ├── /utils
│   │   ├── antiCheat.ts          # Engine chống gian lận
│   │   ├── firebase.ts           # Firebase Admin SDK init (singleton)
│   │   ├── strava.ts             # Helper: refresh token, fetch activities
│   │   └── constants.ts          # Hằng số: ngày bắt đầu/kết thúc, pace limits
│   └── /middleware
│       └── auth.ts               # Verify user session cho protected routes
│
├── nuxt.config.ts                # Cấu hình Nuxt 4 + Nitro
├── .env                          # Secrets (KHÔNG commit lên Git)
├── .env.example                  # Template biến môi trường
└── package.json
```

---

## 4. Biến môi trường (.env)

```env
# Strava OAuth
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
STRAVA_WEBHOOK_VERIFY_TOKEN=a_random_secret_string

# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}

# App
APP_URL=https://your-app.vercel.app
RACE_START_DATE=2026-09-01T00:00:00+07:00
RACE_END_DATE=2026-09-24T23:59:59+07:00
```

---

## 5. Bộ luật Chống Gian Lận (Anti-Cheat Engine)

File: `server/utils/antiCheat.ts`

Mọi activity phải vượt qua **TẤT CẢ** các rule sau mới được tính điểm:

### Rule 1 — Khung thời gian (01/09 00:00 → 24/09 23:59 UTC+7)

```typescript
// Sử dụng start_date_local (thời gian local timezone)
const activityDate = new Date(activity.start_date_local)
const RACE_START = new Date('2026-09-01T00:00:00+07:00')
const RACE_END = new Date('2026-09-24T23:59:59+07:00')
// Phải nằm trong khoảng [RACE_START, RACE_END]
```

### Rule 2 — Giới hạn Pace (4–15 phút/km)

```typescript
// Pace = moving_time (giây) / distance (km)
const paceInSeconds = activity.moving_time / (activity.distance / 1000)
// 240 ≤ pace ≤ 900 (giây/km)
// Tương đương 4:00/km ≤ pace ≤ 15:00/km
```

> **Lưu ý:** Dùng `moving_time` thay vì `elapsed_time` để tránh penalize người dừng nghỉ.

### Rule 3 — Không nhập tay

```typescript
// activity.manual === false
// Activity nhập tay (manual entry) dễ bị fake
```

### Rule 4 — Đúng loại hình: Chạy bộ

```typescript
// activity.type === 'Run' || activity.type === 'VirtualRun'
// Loại bỏ: Ride, Walk, Swim, v.v.
```

### Rule 5 — Không trùng lặp (Idempotency)

```typescript
// Kiểm tra activity_id đã tồn tại trong DB chưa
// Tránh cộng điểm 2 lần nếu webhook gửi trùng
```

---

## 6. Thiết kế Database (Firebase Firestore)

### Collection: `teams`

```
teams/
├── team_a
│   ├── name: "Đội 1"
│   ├── total_km: 150.5          // Tổng km đội, cập nhật bằng transaction
│   ├── member_count: 22         // Số thành viên
│   └── color: "#FF6B35"         // Màu đội (hiển thị UI)
└── team_b
    ├── name: "Đội 2"
    ├── total_km: 120.3
    ├── member_count: 20
    └── color: "#4ECDC4"
```

### Collection: `users`

```
users/{strava_id}
├── strava_id: 12345678
├── name: "Nguyễn Văn A"
├── avatar: "https://..."         // Ảnh đại diện từ Strava
├── team_id: "team_a"
├── total_km: 45.2
├── activity_count: 12
├── access_token: "xxx"           // ⚠️ Chỉ server đọc, ko expose ra client
├── refresh_token: "yyy"
├── token_expires_at: 1693500000  // Unix timestamp
├── joined_at: Timestamp
└── last_sync_at: Timestamp
```

### Collection: `activities`

```
activities/{activity_id}
├── activity_id: 98765432
├── strava_id: 12345678           // FK → users
├── team_id: "team_a"
├── distance_km: 5.23             // Đã convert sang km
├── moving_time: 1800             // Giây
├── pace: 344                     // Giây/km
├── start_date_local: Timestamp
├── name: "Morning Run"
└── processed_at: Timestamp       // Thời điểm hệ thống ghi nhận
```

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Teams & Activities: Chỉ đọc, KHÔNG cho client ghi
    match /teams/{teamId} {
      allow read: if true;    // Public read cho dashboard
      allow write: if false;  // Chỉ Admin SDK (server) mới ghi được
    }
    match /users/{userId} {
      allow read: if true;    // Hiển thị BXH
      allow write: if false;  // Server-only
    }
    match /activities/{actId} {
      allow read: if true;    // Lịch sử đối soát
      allow write: if false;  // Server-only
    }
  }
}
```

> **Tại sao `allow write: if false`?** Toàn bộ write operations chỉ thực hiện qua Firebase Admin SDK (server-side), bypass security rules hoàn toàn → Client không thể tự ý sửa điểm.

---

## 7. Luồng Hoạt Động Chi Tiết (Workflow)

### 7.1 — Đăng ký & Chọn đội

```
[Người dùng] → Vào web → Chọn "Đội 1" hoặc "Đội 2"
            → Bấm "Connect with Strava"
            → Redirect sang Strava OAuth
            → Strava hỏi: "Cho phép app đọc activities?"
            → Đồng ý → Redirect về /api/auth/callback?code=xxx&scope=...
```

**Chi tiết OAuth URL:**

```
https://www.strava.com/oauth/authorize
  ?client_id={STRAVA_CLIENT_ID}
  &redirect_uri={APP_URL}/api/auth/callback
  &response_type=code
  &approval_prompt=auto
  &scope=activity:read_all
  &state={team_id}              ← Encode team_id vào state parameter
```

> **Trick:** Dùng `state` parameter để truyền `team_id` qua OAuth flow mà không cần lưu tạm.

### 7.2 — Backend xử lý OAuth Callback

File: `server/api/auth/callback.get.ts`

```
[Strava] → GET /api/auth/callback?code=xxx&state=team_a
         → Backend đổi code lấy access_token + refresh_token
         → Gọi Strava API lấy thông tin athlete (tên, avatar)
         → Lưu/cập nhật user vào Firestore (kèm team_id)
         → Set cookie session (httpOnly, secure)
         → Redirect về trang Dashboard (/)
```

**Exchange Token API:**

```
POST https://www.strava.com/oauth/token
Body: {
  client_id, client_secret,
  code: "xxx",
  grant_type: "authorization_code"
}
Response: { access_token, refresh_token, expires_at, athlete: {...} }
```

### 7.3 — Đồng bộ dữ liệu quá khứ (Initial Sync)

File: `server/api/sync.post.ts`

```
→ Ngay sau OAuth callback thành công
→ Gọi Strava API: GET /api/v3/athlete/activities
    ?after={unix_timestamp_01/09}
    &before={unix_timestamp_now}
    &per_page=200
→ Lặp qua từng activity:
    → Validate bằng Anti-Cheat Engine
    → Nếu hợp lệ + chưa tồn tại trong DB:
        → Firestore Transaction:
            1. Ghi vào `activities` collection
            2. Cộng km vào `users/{strava_id}.total_km`
            3. Cộng km vào `teams/{team_id}.total_km`
```

> **Pagination:** Strava trả tối đa 200 activities/page. Với khoảng 24 ngày, mỗi người chạy ~1-2 lần/ngày → tối đa ~48 activities, 1 page là đủ.

### 7.4 — Token Refresh

File: `server/utils/strava.ts`

```typescript
// Access token hết hạn sau 6 giờ
// Trước mỗi API call, kiểm tra:
if (user.token_expires_at < Date.now() / 1000) {
  // Gọi POST https://www.strava.com/oauth/token
  // Body: { client_id, client_secret, refresh_token, grant_type: 'refresh_token' }
  // Cập nhật access_token, refresh_token, expires_at mới vào DB
}
```

### 7.5 — Webhook: Lắng nghe bài chạy mới

#### 7.5.1 — Webhook Verification (1 lần khi setup)

File: `server/api/webhook.get.ts`

```
[Strava] → GET /api/webhook?hub.mode=subscribe&hub.challenge=xxx&hub.verify_token=yyy
         → Kiểm tra hub.verify_token === STRAVA_WEBHOOK_VERIFY_TOKEN
         → Trả về: { "hub.challenge": "xxx" }
```

#### 7.5.2 — Webhook Event Handler

File: `server/api/webhook.post.ts`

```
[Strava] → POST /api/webhook
         → Body: { object_type: "activity", aspect_type: "create", object_id: 123, owner_id: 456 }
         → Trả về HTTP 200 NGAY LẬP TỨC (Strava timeout = 2 giây)
         → Xử lý async:
             1. Tìm user bằng owner_id (strava_id)
             2. Refresh token nếu cần
             3. Gọi GET /api/v3/activities/{object_id} lấy chi tiết
             4. Validate qua Anti-Cheat
             5. Nếu hợp lệ → Firestore Transaction cộng điểm
```

> **Quan trọng:** Phải trả 200 trước khi xử lý logic nặng, nếu không Strava sẽ đánh dấu endpoint là "unresponsive".
>
> **Xử lý UPDATE/DELETE:** Nếu `aspect_type === "update"` hoặc `"delete"`, cần xử lý trừ km nếu activity đã được tính trước đó.

### 7.6 — Dashboard Realtime

File: Frontend composable `useFirestore.ts`

```
→ Sử dụng Firebase Client SDK (onSnapshot)
→ Listen 2 documents trong collection `teams`
→ Listen toàn bộ `users` collection (sorted by total_km DESC)
→ Khi server cập nhật (Bước 7.5) → UI tự động cập nhật
→ Không cần F5, không cần polling
```

---

## 8. Sơ đồ Luồng Tổng Thể

```
┌─────────────┐     OAuth      ┌─────────────────┐
│  Người dùng │ ──────────────→│   Strava OAuth   │
│  (Browser)  │←──── code ─────│                  │
└──────┬──────┘                └─────────────────┘
       │                              │
       │ /api/auth/callback           │ Webhook POST
       ▼                              ▼
┌─────────────────────────────────────────────┐
│            Nuxt 4 / Nitro Server            │
│  ┌────────────────┐  ┌──────────────────┐   │
│  │  auth/callback  │  │  webhook.post    │   │
│  │  (exchange      │  │  (receive event, │   │
│  │   token, save   │  │   fetch detail,  │   │
│  │   user + sync)  │  │   validate,      │   │
│  └───────┬────────┘  │   update scores) │   │
│          │           └────────┬─────────┘   │
│          ▼                    ▼              │
│  ┌──────────────────────────────────────┐   │
│  │       Anti-Cheat Engine              │   │
│  │  (Pace 4-15, no manual, Run only,   │   │
│  │   date range, dedup)                 │   │
│  └───────────────┬──────────────────────┘   │
└──────────────────┼──────────────────────────┘
                   │ Firestore Transaction
                   ▼
          ┌─────────────────┐
          │ Firebase         │
          │ Firestore        │──── onSnapshot ──→ Dashboard UI
          │ (teams, users,   │                    (Realtime update)
          │  activities)     │
          └─────────────────┘
```

---

## 9. Bảo mật — Tổng kết

| Mối đe dọa                         | Biện pháp                                                  |
| ----------------------------------- | ---------------------------------------------------------- |
| Client tự sửa điểm                  | Firestore rules: `allow write: if false` + Admin SDK only  |
| Nhập tay activities giả             | Rule 3: `manual === false`                                 |
| Chạy xe đạp khai là chạy bộ        | Rule 4: `type === 'Run' \|\| 'VirtualRun'`                |
| Pace bất thường (ô tô/xe máy)      | Rule 2: `4:00 ≤ pace ≤ 15:00` phút/km                     |
| Activities ngoài thời gian cuộc đua | Rule 1: Chỉ chấp nhận 01/09–24/09                         |
| Webhook replay attack               | Rule 5: Kiểm tra `activity_id` trùng lặp                  |
| Token bị lộ                         | Token lưu server-side, không expose qua API/client         |
| XSS trên cookie session             | `httpOnly: true, secure: true, sameSite: 'lax'`           |

---

## 10. Deployment (Vercel — 0 đồng)

### Quy trình deploy:

1. Push code lên GitHub repo (`VuongTuanAnh165/strava-tracker`)
2. Import project trên [Vercel](https://vercel.com)
3. Cấu hình Environment Variables:
   - `STRAVA_CLIENT_ID`
   - `STRAVA_CLIENT_SECRET`
   - `STRAVA_WEBHOOK_VERIFY_TOKEN`
   - `FIREBASE_SERVICE_ACCOUNT`
   - `APP_URL` (domain Vercel sau khi deploy)
   - `RACE_START_DATE`
   - `RACE_END_DATE`
4. Deploy → Vercel tự detect Nuxt 4, zero-config
5. Đăng ký Strava Webhook (1 lần):
   ```bash
   curl -X POST https://www.strava.com/api/v3/push_subscriptions \
     -F client_id=YOUR_CLIENT_ID \
     -F client_secret=YOUR_CLIENT_SECRET \
     -F callback_url=https://your-app.vercel.app/api/webhook \
     -F verify_token=YOUR_VERIFY_TOKEN
   ```

### Vercel hoạt động như thế nào:

- `/app` (Frontend) → Static/Edge CDN → Load cực nhanh
- `/server/api/*` → Vercel Serverless Functions → Chỉ chạy khi có request
- Chi phí: **$0** với free tier (100GB bandwidth, 100 giờ serverless/tháng)

---

## 11. Implementation Plan — Kế Hoạch Triển Khai Chi Tiết

### Phase 1: Foundation & Setup (Ưu tiên cao nhất)

| # | Task                                          | File(s)                         |
|---|-----------------------------------------------|---------------------------------|
| 1 | Cài dependencies (firebase-admin, etc.)       | `package.json`                  |
| 2 | Cấu hình Nuxt 4 + runtime config             | `nuxt.config.ts`                |
| 3 | Tạo `.env.example` + constants                | `.env.example`, `constants.ts`  |
| 4 | Init Firebase Admin SDK (singleton)           | `server/utils/firebase.ts`      |
| 5 | Viết Strava helper (token refresh, API calls) | `server/utils/strava.ts`        |
| 6 | Viết Anti-Cheat Engine                        | `server/utils/antiCheat.ts`     |

### Phase 2: Authentication & Data Sync

| # | Task                                          | File(s)                          |
|---|-----------------------------------------------|----------------------------------|
| 7 | OAuth callback handler                        | `server/api/auth/callback.get.ts`|
| 8 | Session management (cookie-based)             | `server/middleware/auth.ts`      |
| 9 | Historical sync endpoint                      | `server/api/sync.post.ts`        |
| 10| Webhook verification (GET)                    | `server/api/webhook.get.ts`      |
| 11| Webhook event handler (POST)                  | `server/api/webhook.post.ts`     |

### Phase 3: Frontend — Dashboard UI

| # | Task                                          | File(s)                          |
|---|-----------------------------------------------|----------------------------------|
| 12| Design system (CSS variables, dark mode)      | `app/assets/css/main.css`        |
| 13| Login page + team selector                    | `app/pages/login.vue`            |
| 14| Strava Connect button (branding compliant)    | `app/components/StravaButton.vue`|
| 15| Dashboard layout                              | `app/pages/index.vue`            |
| 16| Team comparison cards                         | `app/components/TeamCard.vue`    |
| 17| Individual leaderboard                        | `app/components/LeaderBoard.vue` |
| 18| Realtime Firestore composable                 | `app/composables/useFirestore.ts`|
| 19| Activity feed component                       | `app/components/ActivityFeed.vue`|

### Phase 4: Polish & Deploy

| # | Task                                          | File(s)                          |
|---|-----------------------------------------------|----------------------------------|
| 20| Responsive design (mobile-first)              | CSS                              |
| 21| Animations (counter, transitions)             | CSS + Vue transitions            |
| 22| Error handling & edge cases                   | All API routes                   |
| 23| Deploy lên Vercel                             | Vercel dashboard                 |
| 24| Đăng ký Strava Webhook subscription           | cURL command                     |
| 25| Test end-to-end với tài khoản Strava thật     | Manual testing                   |

---

## 12. Rủi ro & Giải pháp

| Rủi ro                                        | Giải pháp                                                    |
| ---------------------------------------------- | ------------------------------------------------------------ |
| Strava không duyệt Extended Access kịp thời   | Backup: Admin thêm user thủ công, hoặc chia 5 Strava apps   |
| Webhook bị miss (Strava có thể retry 3 lần)   | Có nút "Sync" thủ công trên dashboard để user tự đồng bộ    |
| Token hết hạn giữa chừng                      | Auto refresh token trước mỗi API call                       |
| Vercel cold start chậm (>2s cho webhook)       | Trả 200 ngay, xử lý async với `waitUntil()` hoặc queue     |
| User đổi đội giữa chừng                        | Lock team_id sau lần đăng nhập đầu tiên                      |
| Strava API down                                | Retry logic + log lỗi để manual fix                          |