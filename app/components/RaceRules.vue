<template>
  <div class="glass-card race-rules">
    <div class="race-rules__header">
      <h2 class="section-title">📋 Thể lệ & Quy định</h2>
    </div>
    <ul class="race-rules__list">
      <li><strong>Thời gian:</strong> 01/09 → 24/09/2026</li>
      <li><strong>Pace hợp lệ:</strong> 4:00 – 15:00 phút/km</li>
      <li><strong>Cự ly tối thiểu:</strong> 1 km / bài chạy</li>
      <li><strong>Loại hình:</strong> Chỉ tính Chạy bộ (Run, VirtualRun, TrailRun)</li>
      <li><strong>Thiết bị:</strong> Bắt buộc chạy ngoài trời có GPS. Không chấp nhận máy chạy bộ (Treadmill).</li>
      <li><strong>Gian lận:</strong> Không chấp nhận nhập tay (Manual). Từ chối các bài bị Strava gắn cờ (Flagged).</li>
    </ul>
  </div>
</template>

<style scoped>
.race-rules {
  padding: var(--space-xl);
}

.race-rules__header {
  margin-bottom: var(--space-lg);
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.race-rules__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: 0;
  margin: 0;
}

.race-rules__list li {
  padding: var(--space-md);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.race-rules__list li strong {
  color: var(--color-text-primary);
  display: block;
  margin-bottom: 2px;
}

.race-rules__list li::before {
  content: '✓';
  color: var(--color-success);
  font-weight: 900;
  float: left;
  margin-right: var(--space-sm);
  margin-top: 2px;
}
</style>
