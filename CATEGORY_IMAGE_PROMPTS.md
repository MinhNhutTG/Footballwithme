# Prompt tạo ảnh cho 4 chuyên mục FootballWithMe

File này chứa **prompt để đưa vào công cụ tạo ảnh AI** (Midjourney, DALL·E, Stable Diffusion...). Ảnh sau khi tạo dùng cho `CategoryTile.jsx` và banner `Category.jsx` — chữ trắng đè trực tiếp lên ảnh, có lớp phủ đen 50% (`bg-fwm-ink/50`) tự động phủ toàn ảnh trong code để tăng tương phản.

**Đổi phong cách lần 3 (theo yêu cầu mới nhất):** không còn "painterly illustration" nữa — chuyển hẳn sang **real-time game render / Unreal Engine 5 / PBR**, giống render trong game bóng đá hiện đại (eFootball/FIFA), KHÔNG phải minh hoạ vẽ tay hay cartoon.

## Ngữ cảnh web (căn cứ để viết prompt)

- **FootballWithMe**: web cộng đồng eFootball — nội dung xoay quanh kỹ năng điều khiển, chiến thuật đội hình, kinh nghiệm thi đấu, phân tích cầu thủ trong game.
- **Cách ảnh hiển thị:** phủ kín thẻ/banner, chữ trắng đè lên, có lớp phủ đen 50% tự động — ảnh gốc nên **tối/moody tổng thể** (dark stadium background), tránh nền sáng chói.
- **4 chuyên mục, mỗi cái 1 tông màu neon chủ đạo** (theo đúng gradient hiện có trong DB, gắn lên jersey/ánh sáng viền thay vì mô tả trừu tượng):
  - **Kỹ năng** (`skill`): hổ phách–cam–hồng (`#f59e0b → #f97316 → #ec4899`)
  - **Chiến thuật** (`tactic`): chàm–xanh dương–cyan (`#6366f1 → #3b82f6 → #22d3ee`)
  - **Kinh nghiệm** (`exp`): ngọc lục bảo–xanh cổ vịt–cyan (`#34d399 → #14b8a6 → #06b6d4`)
  - **Người chơi** (`player`): hồng tím–hồng–hồng đào (`#d946ef → #ec4899 → #fb7185`)
- **Tỷ lệ khung ảnh:** dọc 4:5, khớp cách `CategoryTile.jsx` crop ảnh làm nền thẻ.

**Khung kỹ thuật chung — dùng cho cả 4 prompt (dựa đúng theo mẫu vibe đã chốt):**
```
real-time game render style, Unreal Engine 5, eFootball aesthetic,
physically based rendering (PBR), realistic but slightly stylized character,
sharp facial focus, subtle per-object motion blur on hands/limbs only,
high-frequency skin detail with micro roughness variation, natural pores,
stadium lighting with strong rim light and soft bloom, accurate exposure,
no cinematic overprocessing,
dark stadium background, heavy depth of field, realistic bokeh,
volumetric lighting and subtle atmospheric particles with depth variation,
low emissive, lighting-driven visibility (not glowing),
cinematic low angle, immersive match moment,
no text, no logo, no watermark, no UI,
NOT painterly, NOT illustration, real-time rendering, in-game camera look,
vertical 4:5 aspect ratio
```

---

## 1. Kỹ năng (Skill) — kỹ thuật cá nhân, combo điều khiển

**Ý tưởng:** cận cảnh cầu thủ giữa pha xử lý kỹ thuật (đảo bóng/rainbow flick), motion blur nhẹ ở chân/bóng thể hiện tốc độ combo.

```
Close-up of a football player in a modern esports-style jersey,
mid-skill-move (step-over / rainbow flick) with the ball, intense
focused expression, subtle per-object motion blur on legs and ball
only, real-time game render style, Unreal Engine 5, eFootball
aesthetic, physically based rendering (PBR), realistic but slightly
stylized character, sharp facial focus, high-frequency skin detail
with micro roughness variation, natural pores, stadium lighting with
strong rim light and soft bloom, accurate exposure, no cinematic
overprocessing, dark stadium background, heavy depth of field,
realistic bokeh, volumetric lighting and subtle atmospheric particles
with depth variation, neon-accented jersey with amber and pink
patterns, low emissive, lighting-driven visibility (not glowing),
cinematic low angle, immersive match moment, no text, no logo, no
watermark, no UI, NOT painterly, NOT illustration, real-time
rendering, in-game camera look, vertical 4:5 aspect ratio
```

---

## 2. Chiến thuật (Tactic) — sơ đồ, chỉ thị, vận hành đội hình

**Ý tưởng:** cận cảnh đội trưởng/cầu thủ đang ra chỉ thị chiến thuật, tay chỉ/khoát mạnh, biểu cảm chỉ huy — giữ đúng khung "cận cảnh nhân vật" của vibe, khác "ăn mừng" ở chỗ cử chỉ mang tính điều phối.

```
Close-up of a football captain in a modern esports-style jersey,
commanding gesture pointing across the pitch, sharp focused
expression organizing teammates, subtle per-object motion blur on
the pointing hand only, real-time game render style, Unreal Engine 5,
eFootball aesthetic, physically based rendering (PBR), realistic but
slightly stylized character, sharp facial focus, high-frequency skin
detail with micro roughness variation, natural pores, stadium
lighting with strong rim light and soft bloom, accurate exposure, no
cinematic overprocessing, dark stadium background, heavy depth of
field, realistic bokeh, volumetric lighting and subtle atmospheric
particles with depth variation, neon-accented jersey with indigo
and cyan patterns, low emissive, lighting-driven visibility (not
glowing), cinematic low angle, immersive match moment, no text, no
logo, no watermark, no UI, NOT painterly, NOT illustration,
real-time rendering, in-game camera look, vertical 4:5 aspect ratio
```

---

## 3. Kinh nghiệm (Experience) — bài học thực chiến từ cộng đồng

**Ý tưởng:** 2-3 cầu thủ ăn mừng cùng nhau sau pha bóng đẹp, cảm giác cộng đồng gắn kết — vẫn giữ render engine thật, chỉ đổi từ 1 nhân vật sang nhóm nhỏ.

```
Close-up of two football players in modern esports-style jerseys
celebrating together, expressive hand gestures, warm genuine
excitement, subtle per-object motion blur on hands only, real-time
game render style, Unreal Engine 5, eFootball aesthetic, physically
based rendering (PBR), realistic but slightly stylized characters,
sharp facial focus, high-frequency skin detail with micro roughness
variation, natural pores, stadium lighting with strong rim light and
soft bloom, accurate exposure, no cinematic overprocessing, dark
stadium background, heavy depth of field, realistic bokeh,
volumetric lighting and subtle atmospheric particles with depth
variation, neon-accented jerseys with emerald and cyan patterns, low
emissive, lighting-driven visibility (not glowing), cinematic low
angle, immersive match moment, no text, no logo, no watermark, no
UI, NOT painterly, NOT illustration, real-time rendering, in-game
camera look, vertical 4:5 aspect ratio
```

---

## 4. Người chơi (Player) — phân tích cầu thủ, build đội hình

**Ý tưởng:** đúng nguyên mẫu vibe gốc — cận cảnh cầu thủ ăn mừng với cử chỉ tay biểu cảm, ánh mắt tự tin, chỉ đổi tông màu jersey sang hồng tím của category này.

```
Close-up of a football player in a modern esports-style jersey,
celebrating with expressive hand gesture, confident intense
expression, real-time game render style, Unreal Engine 5, eFootball
aesthetic, physically based rendering (PBR), realistic but slightly
stylized character, sharp facial focus, subtle per-object motion
blur on hands only, high-frequency skin detail with micro roughness
variation, natural pores, stadium lighting with strong rim light and
soft bloom, accurate exposure, no cinematic overprocessing, dark
stadium background, heavy depth of field, realistic bokeh,
volumetric lighting and subtle atmospheric particles with depth
variation, neon-accented jersey with fuchsia and pink patterns, low
emissive, lighting-driven visibility (not glowing), cinematic low
angle, immersive match moment, no text, no logo, no watermark, no
UI, NOT painterly, NOT illustration, real-time rendering, in-game
camera look, vertical 4:5 aspect ratio
```

---

## Ghi chú khi dùng

- 4 prompt dùng chung đúng 1 khung kỹ thuật (real-time render/UE5/PBR/dark stadium) — chỉ đổi hành động nhân vật + màu neon jersey theo từng chuyên mục, để 4 ảnh nhìn "cùng 1 bộ" khi đặt cạnh nhau.
- `low emissive, lighting-driven visibility (not glowing)` + `dark stadium background` giữ ảnh đủ tối cho chữ trắng đè lên vẫn rõ (kể cả trước khi có lớp phủ đen 50% tự động trong code).
- Nếu công cụ hỗ trợ **negative prompt** riêng (Stable Diffusion, Midjourney `--no`), tách cụm `NOT painterly, NOT illustration` + `no text, no logo, no watermark, no UI` ra ô riêng thường cho kết quả sát ý hơn để chung trong 1 câu dài — ví dụ Midjourney: `--no painterly, illustration, cartoon, text, watermark, extra fingers`.
- Lịch sử đổi hướng (để nhớ nếu cần quay lại so sánh): bản 1 dùng "cel-shaded cartoon digital illustration" → bản 2 đổi "semi-realistic painterly illustration" (đỡ nhựa/AI-lộ hơn nhưng vẫn là minh hoạ) → bản 3 (hiện tại) đổi hẳn sang "real-time game render/UE5/PBR" theo đúng vibe mẫu được cung cấp — không còn là "vẽ" nữa mà là "render engine thật", khác biệt rõ nhất so với 2 bản trước.
