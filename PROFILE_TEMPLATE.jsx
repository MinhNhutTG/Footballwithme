// ============================================================
// TEMPLATE TĨNH — copy từng phần vào Profile.jsx khi cần
// ============================================================


// ── 1. AVATAR PLACEHOLDER ───────────────────────────────────
<div className="flex flex-col items-center gap-3">
  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-fwm-accent font-head text-2xl font-black text-fwm-ink">
    NV
  </div>
  <p className="text-xs text-fwm-muted">Nhấn để thay ảnh</p>
</div>


// ── 2. INPUT TÊN ────────────────────────────────────────────
<div>
  <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">
    Họ tên
  </label>
  <input
    type="text"
    className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none"
  />
</div>


// ── 3. TEXTAREA BIO ─────────────────────────────────────────
<div>
  <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">
    Giới thiệu bản thân
  </label>
  <textarea
    rows={3}
    placeholder="Viết vài dòng về bạn..."
    className="w-full resize-none rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text placeholder:text-fwm-muted focus:border-fwm-accent focus:outline-none"
  />
</div>


// ── 4. NÚT LƯU ──────────────────────────────────────────────
<button
  type="submit"
  className="w-full rounded-fwm-pill bg-fwm-accent px-5 py-3 font-head text-sm font-bold text-fwm-ink shadow-fwm transition hover:brightness-95 active:scale-95"
>
  Lưu thay đổi
</button>


// ── 5. THÔNG BÁO LỖI ────────────────────────────────────────
<p className="text-sm font-medium text-red-500">Thông báo lỗi ở đây</p>


// ── 6. THÔNG BÁO THÀNH CÔNG ─────────────────────────────────
<p className="text-sm font-medium text-green-500">Đã lưu thành công!</p>


// ── 7. THÔNG TIN READ-ONLY ──────────────────────────────────
<div className="mt-8 rounded-fwm-lg border border-fwm-line bg-fwm-card p-4 text-sm text-fwm-muted">
  <p><span className="font-bold text-fwm-text">Email:</span> user@example.com</p>
  <p className="mt-1"><span className="font-bold text-fwm-text">Thành viên từ:</span> 01/01/2025</p>
</div>


// ── 8. INPUT FILE ẨN (dùng ở Bước 5) ───────────────────────
<input
  type="file"
  accept="image/*"
  className="hidden"
/>


// ── 9. AVATAR KHI CÓ ẢNH PREVIEW (dùng ở Bước 5) ──────────
<div className="flex h-24 w-24 overflow-hidden rounded-full bg-fwm-accent">
  <img src={preview} alt="avatar" className="h-full w-full object-cover" />
</div>
