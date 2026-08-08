# Prompt tạo logo cho FootballWithMe

Dùng với công cụ tạo ảnh AI (Midjourney/DALL·E/Stable Diffusion...). Bám theo màu thương hiệu hiện có trong `frontend-rebuild/src/index.css` (nền navy đậm `#0e1330`, accent vàng `#ffd93d`) và nội dung site (hướng dẫn skill/tactic eFootball Mobile).

## Prompt chính

```
Minimalist esports logo for "FootballWithMe", a football skill-tutorial website.
A stylized football (soccer ball) merged with a dynamic motion-trail/swoosh suggesting
a dribbling skill move, forming a monogram-friendly silhouette. Flat vector design,
bold clean geometric shapes, negative space technique. Color palette: deep navy blue
(#0e1330) background/base, vibrant golden-yellow (#ffd93d) accent for the ball or
motion trail. No gradients, no photorealism, no text/typography in the mark itself —
icon only. Style: modern gaming/esports brand mark, similar to FIFA/eFootball team
crest energy but simplified, works small as a favicon, high contrast, centered
composition, transparent background.
```

## Biến thể (đổi 1 câu trong prompt chính)

- **Kèm chữ**: thêm `Include bold condensed sans-serif wordmark "FootballWithMe" below the icon, same color palette.`
- **Kiểu huy hiệu (crest)**: đổi câu mở đầu thành `Modern esports crest/badge logo...` và thêm `enclosed in a subtle hexagonal or shield badge outline`.
- **Kiểu line-art tối giản**: thêm `single continuous line art style, no fill, 2px stroke weight`.

## Prompt riêng cho logo Header (icon vuông nhỏ)

`Logo.jsx` hiện render ảnh trong khung `h-11 w-11` (44px, hình vuông) bo góc nhẹ (`rounded-fwm`, không phải hình tròn), dùng `object-cover` (ảnh không đúng tỉ lệ 1:1 sẽ bị cắt) — ảnh cần là **hình vuông thật (1:1)**, chủ thể nằm giữa và không sát mép (chừa lề an toàn phòng khi bị crop nhẹ), đủ đậm/đơn giản để vẫn rõ ở kích thước 44px. Tên site đã hiện riêng bằng chữ ngay cạnh (`text-xl`), nên **tuyệt đối không chèn chữ vào ảnh**.

```
Minimalist esports icon logo for "FootballWithMe", square 1:1 aspect ratio
composition, subject centered with generous safe margin from all edges (will be
displayed cropped inside a small rounded-square badge, ~44x44px). A stylized
football (soccer ball) merged with a dynamic motion-trail/swoosh suggesting a
dribbling skill move. Flat vector design, bold thick geometric shapes only —
no fine details, no thin lines, must stay legible at very small size. Color
palette: deep navy blue (#0e1330) background fill, vibrant golden-yellow
(#ffd93d) for the icon shape itself, high contrast between the two. No
gradients, no photorealism, no text/typography, icon only. Style: modern
gaming/esports brand mark, simplified crest energy, single focal shape,
square canvas, transparent-safe or solid navy background.
```

Điểm khác so với prompt chính: **bố cục vuông 1:1** (prompt chính không ràng buộc tỉ lệ), **nền màu navy đặc thay vì trong suốt** (vì object-cover phủ kín khung, ảnh trong suốt sẽ lộ nền header phía sau không đều màu giữa các theme sáng/tối), **hình khối dày/đơn giản hơn nữa** (chỉ 44px, chi tiết mảnh sẽ vỡ nét khi thu nhỏ).
