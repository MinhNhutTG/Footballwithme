require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Post = require('../models/Post');

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@footballwithme.dev';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin123';

const paragraphsToHtml = (paragraphs) => paragraphs.map((p) => `<p>${p}</p>`).join('');

const toHtmlBody = (post) => ({
  ...post,
  body: { vi: paragraphsToHtml(post.body.vi), en: paragraphsToHtml(post.body.en) },
});

const POSTS = [
  {
    category: 'skill',
    gradient: 'from-amber-400 via-orange-500 to-pink-500',
    tags: ['combo', 'dribble'],
    title: { vi: 'Rê bóng combo nâng cao bằng R2', en: 'Advanced R2 dribble combos' },
    excerpt: {
      vi: 'Tổng hợp các combo rê bóng tốc độ giúp vượt qua hậu vệ trong không gian hẹp.',
      en: 'A set of fast dribble combos to beat defenders in tight spaces.',
    },
    intro: {
      vi: 'Rê bóng combo là kỹ năng bắt buộc nếu bạn muốn xé toạc các khối phòng ngự đông người. Bài viết này tổng hợp 3 combo R2 hiệu quả nhất cho mọi cấp độ.',
      en: 'Combo dribbling is essential if you want to break through crowded defensive blocks. This article covers the 3 most effective R2 combos for every skill level.',
    },
    body: {
      vi: [
        'Combo đầu tiên là giữ R2 và đẩy nhẹ cần phân tích để tạo bước chạm bóng giả, sau đó đổi hướng 45 độ ngay khi hậu vệ áp sát.',
        'Combo thứ hai phù hợp khi đối đầu 1v1 ở biên: giữ R2, gài bóng ra xa rồi bứt tốc bằng nút sprint ngay khoảnh khắc đối thủ mất trớn.',
        'Cuối cùng là combo giả lừa bằng cách đổi hướng liên tiếp hai lần — chỉ nên dùng khi có đủ khoảng trống vì dễ mất bóng nếu bấm sai nhịp.',
      ],
      en: [
        'The first combo is holding R2 and gently pushing the stick to fake a touch, then cutting 45 degrees the moment the defender closes in.',
        'The second combo works well in 1v1 wide situations: hold R2, push the ball wide, then sprint the instant the opponent loses momentum.',
        'The last combo is a double feint — only use it when you have space, since mistimed inputs easily lose possession.',
      ],
    },
    quote: {
      vi: 'Rê bóng không phải để qua người, mà để tạo ra một nhịp thời gian mà hậu vệ không theo kịp.',
      en: "Dribbling isn't about beating a player, it's about creating a beat in time the defender can't follow.",
    },
    mistake: {
      vi: 'Sai lầm phổ biến nhất là spam combo liên tục dù không có không gian — hãy chỉ thực hiện khi hậu vệ đã dồn trọng tâm sai hướng.',
      en: 'The most common mistake is spamming combos with no space — only execute once the defender has committed their weight the wrong way.',
    },
    steps: [
      {
        title: { vi: 'Bước 1 — Giữ bóng', en: 'Step 1 — Hold the ball' },
        desc: {
          vi: 'Giữ R2 để vào trạng thái rê bóng sát, đẩy cần phân tích nhẹ theo hướng di chuyển.',
          en: 'Hold R2 to enter close control, push the analog stick gently in your direction of travel.',
        },
        keys: [{ kind: 'tri', label: 'R2' }],
      },
      {
        title: { vi: 'Bước 2 — Đổi hướng', en: 'Step 2 — Change direction' },
        desc: {
          vi: 'Khi hậu vệ áp sát trong 1 mét, đẩy cần theo hướng 45 độ để tạo bước hụt cho đối thủ.',
          en: 'When the defender closes within 1 meter, push the stick at a 45-degree angle to wrong-foot them.',
        },
        keys: [{ kind: 'default', label: 'L-stick' }],
      },
      {
        title: { vi: 'Bước 3 — Bứt tốc', en: 'Step 3 — Sprint away' },
        desc: {
          vi: 'Thả R2 và bấm sprint ngay khi đã qua người để tận dụng khoảng trống vừa tạo ra.',
          en: 'Release R2 and tap sprint right after beating the defender to use the space you just created.',
        },
        keys: [{ kind: 'cross', label: '✕' }],
      },
    ],
  },
  {
    category: 'tactic',
    gradient: 'from-indigo-500 via-blue-500 to-cyan-400',
    tags: ['formation', 'pressing'],
    title: { vi: 'Sơ đồ 4-3-3 pressing tầm cao', en: '4-3-3 high-press formation' },
    excerpt: {
      vi: 'Cách thiết lập chỉ thị để pressing ngay từ phần sân đối phương.',
      en: 'Setting team instructions to press from the opponent half.',
    },
    intro: {
      vi: 'Pressing tầm cao buộc đối thủ chuyền bóng vội và mất quyền kiểm soát ngay từ phần sân của họ. Đây là cách build sơ đồ 4-3-3 cho chiến thuật này.',
      en: 'A high press forces the opponent into rushed passes and turnovers in their own half. Here is how to set up a 4-3-3 for it.',
    },
    body: {
      vi: [
        'Đặt chỉ thị "Pressing tầm cao" và "Bám sát đối thủ giữ bóng" cho cả 3 tiền vệ trung tâm để khép khoảng trống giữa sân.',
        'Hai tiền đạo cánh lùi về ngay khi mất bóng để chặn đường chuyền ra biên, ép đối thủ chuyền vào trung tâm nơi mật độ quân đông hơn.',
        'Hậu vệ cánh đẩy cao hơn bình thường khoảng 10-15m để duy trì một khối đội hình liền mạch, tránh khoảng trống sau lưng.',
      ],
      en: [
        'Set "High press" and "Get tight to ball carrier" for all 3 central midfielders to close central space quickly.',
        'Both wingers track back the moment possession is lost to cut off the wide passing lane, forcing play into the crowded middle.',
        'Push the fullbacks 10-15m higher than usual to keep the block compact, avoiding gaps behind the defense.',
      ],
    },
    quote: {
      vi: 'Pressing không phải là chạy nhiều hơn, mà là chạy đúng thời điểm để cắt đường chuyền trước khi bóng đến.',
      en: "Pressing isn't about running more, it's about running at the right moment to cut the pass before the ball arrives.",
    },
    mistake: {
      vi: 'Lỗi thường gặp là dâng cao toàn đội hình mà không có ai bọc lót — chỉ cần một đường chuyền vượt tuyến là vỡ trận.',
      en: 'A common mistake is pushing the whole team up with no cover — a single line-splitting pass and the press collapses.',
    },
  },
  {
    category: 'exp',
    gradient: 'from-emerald-400 via-teal-500 to-cyan-500',
    tags: ['ranked', 'mindset'],
    title: { vi: 'Bài học từ 100 trận ranked', en: 'Lessons from 100 ranked matches' },
    excerpt: {
      vi: 'Những sai lầm lặp lại nhiều nhất và cách khắc phục để leo hạng ổn định.',
      en: 'The most common mistakes and how to fix them for a stable climb.',
    },
    intro: {
      vi: 'Sau 100 trận ranked, đây là những bài học giúp giảm số trận thua ngược và leo hạng ổn định hơn thay vì lên xuống thất thường.',
      en: 'After 100 ranked matches, here are the lessons that helped cut down comeback losses and climb more steadily.',
    },
    body: {
      vi: [
        'Đừng đổi chiến thuật giữa trận chỉ vì đang thua một bàn — phần lớn các trận thua ngược bắt đầu từ việc tự phá vỡ kế hoạch ban đầu.',
        'Theo dõi thể lực cầu thủ chủ lực sau phút 70; thay người sớm 5-10 phút thường tốt hơn là chờ đến khi họ kiệt sức hoàn toàn.',
        'Ghi lại 3 bàn thua gần nhất sau mỗi buổi chơi — phần lớn người chơi lặp lại đúng 1-2 lỗi định hình suốt nhiều trận.',
      ],
      en: [
        "Don't change tactics mid-match just because you're down a goal — most comeback losses start with abandoning the original game plan.",
        "Watch your key players' stamina after minute 70; subbing 5-10 minutes early is usually better than waiting until they're fully drained.",
        'Write down your last 3 conceded goals after every session — most players repeat the same 1-2 set-piece or positional mistakes.',
      ],
    },
    quote: {
      vi: 'Leo hạng không phải là thắng nhiều hơn, mà là thua ít những trận đáng lẽ không nên thua.',
      en: "Climbing the ladder isn't about winning more, it's about losing fewer matches you shouldn't have lost.",
    },
    mistake: {
      vi: 'Chơi liên tục khi đang tâm lý xấu (tilt) là nguyên nhân hàng đầu gây mất điểm — nên nghỉ sau 2 trận thua liên tiếp.',
      en: 'Queuing up while tilted is the number one cause of rank losses — take a break after 2 straight losses.',
    },
  },
  {
    category: 'player',
    gradient: 'from-fuchsia-500 via-pink-500 to-rose-400',
    tags: ['build', 'meta'],
    title: { vi: 'Build tiền đạo cắm meta hiện tại', en: 'Current meta striker build' },
    excerpt: {
      vi: 'Phân tích chỉ số và kỹ năng cần ưu tiên cho vị trí CF.',
      en: 'Stat and skill priorities to look for in a CF.',
    },
    intro: {
      vi: 'Meta hiện tại ưu tiên tiền đạo có tốc độ bứt phá và dứt điểm 1 chạm tốt hơn là sức mạnh không chiến thuần túy.',
      en: 'The current meta favors strikers with explosive acceleration and one-touch finishing over pure aerial power.',
    },
    body: {
      vi: [
        'Ưu tiên các chỉ số: Tốc độ bứt phá, Kiểm soát bóng sát, Dứt điểm trong vòng cấm — đây là bộ ba quyết định hiệu suất ghi bàn.',
        'Kỹ năng "Một chạm" và "Dứt điểm hiểm" gần như bắt buộc; "Đánh đầu" chỉ cần ở mức trung bình trừ khi bạn chơi lối chuyền bổng nhiều.',
        'Về phong độ thi đấu, nên chọn cầu thủ có chemistry tốt với tiền vệ kiến tạo chính trong đội hình của bạn.',
      ],
      en: [
        'Prioritize: Acceleration, Close control, Finishing inside the box — this trio decides most of your scoring output.',
        'The "One touch" and "Long shot" playstyle traits are near-mandatory; "Heading" only needs to be average unless you rely heavily on crosses.',
        'For chemistry, pick a striker that links well with your main creative midfielder.',
      ],
    },
    quote: {
      vi: 'Một tiền đạo nhanh nhưng dứt điểm kém vẫn hơn một tiền đạo chậm có dứt điểm hoàn hảo — vì tốc độ tạo ra cơ hội, kỹ năng chỉ tận dụng nó.',
      en: 'A fast striker with average finishing beats a slow one with perfect finishing — speed creates the chance, skill just finishes it.',
    },
    mistake: {
      vi: 'Nhiều người chọn tiền đạo theo chỉ số tổng (OVR) mà bỏ qua playstyle — hai cầu thủ cùng OVR có thể chơi hoàn toàn khác nhau.',
      en: 'Many players pick strikers by overall rating alone and ignore playstyle — two players with the same OVR can perform very differently.',
    },
  },
  {
    category: 'skill',
    gradient: 'from-amber-400 via-orange-500 to-pink-500',
    tags: ['finishing'],
    title: { vi: 'Dứt điểm 1 chạm chuẩn xác', en: 'Precise one-touch finishing' },
    excerpt: {
      vi: 'Thời điểm bấm nút và góc sút tối ưu cho các tình huống dứt điểm nhanh.',
      en: 'Timing and shot angle for fast finishing situations.',
    },
    intro: {
      vi: 'Dứt điểm 1 chạm là kỹ năng phân biệt người chơi giỏi và người chơi xuất sắc — sai 0.1 giây timing là bóng đi vọt xà.',
      en: 'One-touch finishing separates good players from great ones — being off by 0.1 seconds sends the ball over the bar.',
    },
    body: {
      vi: [
        'Luôn định hướng cơ thể cầu thủ về phía khung thành trước khi bóng đến — xoay người chỉ tốn 1 chạm và làm giảm độ chính xác.',
        'Với các đường chuyền bổng, bấm nút sút ngay khi bóng cách chân khoảng nửa giây để tránh chạm hụt.',
        'Luôn nhắm vào góc xa nếu thủ môn đã đổ người, và góc gần nếu thủ môn vẫn đứng giữa khung thành.',
      ],
      en: [
        "Always orient the player's body toward goal before the ball arrives — turning costs an extra touch and reduces accuracy.",
        'For lofted passes, press the shoot button about half a second before the ball reaches the foot to avoid a mistimed touch.',
        "Aim far corner if the keeper has already committed, near corner if they're still central.",
      ],
    },
    quote: {
      vi: 'Dứt điểm 1 chạm không phải về lực sút, mà về việc chọn đúng góc trước khi bóng đến.',
      en: "One-touch finishing isn't about power, it's about picking the angle before the ball even arrives.",
    },
    mistake: {
      vi: 'Giữ nút sút quá lâu khi không cần lực mạnh là lỗi phổ biến nhất, khiến bóng đi chậm và dễ bị cản phá.',
      en: "Holding the shot button too long when you don't need power is the most common mistake, sending a slow, easily blocked shot.",
    },
    steps: [
      {
        title: { vi: 'Bước 1 — Định hướng', en: 'Step 1 — Body orientation' },
        desc: {
          vi: 'Xoay người về phía khung thành ngay khi đường chuyền được thực hiện, trước khi bóng đến chân.',
          en: 'Turn the body toward goal as soon as the pass is played, before the ball reaches the foot.',
        },
        keys: [{ kind: 'default', label: 'L-stick' }],
      },
      {
        title: { vi: 'Bước 2 — Canh thời điểm', en: 'Step 2 — Time the shot' },
        desc: {
          vi: 'Bấm nút sút khoảng nửa giây trước khi bóng tới chân để xử lý 1 chạm chính xác.',
          en: 'Press shoot roughly half a second before the ball reaches the foot for a clean one-touch.',
        },
        keys: [{ kind: 'sq', label: '□' }],
      },
      {
        title: { vi: 'Bước 3 — Chọn góc sút', en: 'Step 3 — Pick the corner' },
        desc: {
          vi: 'Đẩy nhẹ cần phân tích về góc xa nếu thủ môn đã đổ người, góc gần nếu thủ môn còn đứng giữa.',
          en: "Nudge the stick to the far corner if the keeper has committed, near corner if they're still central.",
        },
        keys: [{ kind: 'default', label: 'L-stick' }],
      },
    ],
  },
  {
    category: 'tactic',
    gradient: 'from-indigo-500 via-blue-500 to-cyan-400',
    tags: ['counter'],
    title: { vi: 'Phản công nhanh với 2 tiền đạo', en: 'Fast counter-attacks with 2 strikers' },
    excerpt: {
      vi: 'Cách khai thác khoảng trống sau lưng hàng thủ đối phương.',
      en: 'Exploiting the space behind the opposition back line.',
    },
    intro: {
      vi: 'Sơ đồ 2 tiền đạo cho phép phản công với tốc độ tối đa khi đoạt lại bóng ở phần sân nhà.',
      en: 'A two-striker setup lets you counter at maximum speed the moment you win the ball back in your own half.',
    },
    body: {
      vi: [
        'Một tiền đạo chạy chỗ chéo sân ngay khi đoạt bóng để kéo giãn hàng thủ, tiền đạo còn lại giữ vị trí trung tâm chờ đường chuyền xuyên tuyến.',
        'Chuyền bóng dài trực tiếp lên cho tiền đạo chạy chỗ thường hiệu quả hơn chuyền ngắn qua nhiều người trong tình huống phản công.',
        'Hai tiền vệ trung tâm nên dâng lên ngay sau pha đoạt bóng để hỗ trợ, tránh để 2 tiền đạo solo một mình trước cả hàng thủ đối phương.',
      ],
      en: [
        'One striker makes a diagonal run the moment you win the ball to stretch the back line, the other holds a central position for the through ball.',
        'A direct long pass to the running striker is usually more effective than several short passes during a counter.',
        'Both central midfielders should push up immediately after winning the ball to support, rather than leaving the two strikers isolated against the full back line.',
      ],
    },
    quote: {
      vi: 'Phản công thành công trong 3 giây đầu hoặc không thành công nữa — sự chậm trễ là kẻ thù lớn nhất.',
      en: "A counter-attack succeeds in the first 3 seconds or not at all — hesitation is the biggest enemy.",
    },
    mistake: {
      vi: 'Cố rê bóng qua nhiều người khi đang phản công làm mất nhịp độ — hãy chuyền ngay khi có đường chuyền xuyên tuyến.',
      en: 'Trying to dribble past multiple players during a counter kills the tempo — pass immediately once a through ball is on.',
    },
  },
  {
    category: 'exp',
    gradient: 'from-emerald-400 via-teal-500 to-cyan-500',
    tags: ['mental'],
    title: { vi: 'Giữ tâm lý ổn định khi bị dẫn bàn', en: 'Staying calm when trailing' },
    excerpt: {
      vi: 'Cách điều chỉnh chiến thuật và tâm lý khi bị dẫn trước.',
      en: 'Adjusting tactics and mindset after going behind.',
    },
    intro: {
      vi: 'Bị dẫn bàn không phải là thua trận — phần lớn các trận lội ngược dòng bắt đầu từ việc giữ được sự bình tĩnh trong 5 phút đầu sau khi thua bàn.',
      en: 'Going behind isn\'t losing the match — most comebacks start with staying calm in the 5 minutes after conceding.',
    },
    body: {
      vi: [
        'Tránh tâm lý "phải gỡ ngay" dẫn đến dâng cao toàn đội và mất kiểm soát giữa sân — hãy duy trì cấu trúc đội hình trong ít nhất 5 phút.',
        'Thay đổi nhỏ như đẩy biên cao hơn 5m thường hiệu quả hơn đổi nguyên sơ đồ chiến thuật giữa trận.',
        'Nếu thua 2 bàn trước phút 60, vẫn còn đủ thời gian để chơi kiên nhẫn — chỉ nên dồn toàn lực sau phút 75.',
      ],
      en: [
        'Avoid the "must equalize now" mindset that pushes the whole team up and loses midfield control — keep your structure for at least 5 minutes.',
        'A small tweak like pushing the wing 5m higher is usually more effective than changing the entire formation mid-match.',
        "If you're 2 goals down before minute 60, there's still time to play patiently — only go all-in after minute 75.",
      ],
    },
    quote: {
      vi: 'Bàn thua đầu tiên chỉ là một tình huống bóng; bàn thua thứ hai thường là hậu quả của sự hoảng loạn.',
      en: 'The first goal conceded is just a moment in the game; the second is usually the result of panic.',
    },
    mistake: {
      vi: 'Spam rush tổng lực ngay sau khi thua bàn thường dẫn đến thua thêm bàn thứ hai do hở sườn sau.',
      en: 'Spamming an all-out rush right after conceding usually leads to a second goal from the exposed space behind.',
    },
  },
  {
    category: 'player',
    gradient: 'from-fuchsia-500 via-pink-500 to-rose-400',
    tags: ['gk'],
    title: { vi: 'Chọn thủ môn: chỉ số nào quan trọng?', en: 'Choosing a keeper: which stats matter?' },
    excerpt: {
      vi: 'So sánh các chỉ số phản xạ, độ bao quát và xử lý chân.',
      en: 'Comparing reflexes, coverage and footwork stats.',
    },
    intro: {
      vi: 'Một thủ môn tốt có thể cứu 2-3 điểm mỗi trận; đây là các chỉ số cần ưu tiên khi chọn người gác đền.',
      en: 'A good keeper can save you 2-3 points per match; here are the stats to prioritize when choosing one.',
    },
    body: {
      vi: [
        'Phản xạ (Reflexes) là chỉ số quan trọng nhất cho các pha cận thành, nên ưu tiên trên 85 nếu chơi đối kháng nhiều.',
        'Độ bao quát (Reach) quyết định khả năng cứu các pha dứt điểm góc xa — quan trọng với thủ môn chơi phong cách lùi sâu trong khung thành.',
        'Xử lý chân (Kicking) ngày càng quan trọng khi nhiều đội build lối chơi từ thủ môn — đừng bỏ qua chỉ số này nếu bạn chơi pressing tầm cao.',
      ],
      en: [
        'Reflexes is the most important stat for close-range saves — prioritize above 85 if you play a lot of competitive matches.',
        'Reach determines save range on far-corner shots — important for keepers who stay deep in the box.',
        "Kicking matters more as more teams build play from the back — don't ignore it if you run a high press.",
      ],
    },
    quote: {
      vi: 'Một thủ môn xuất sắc không cứu bàn thắng, mà cứu cả trận đấu trước khi nó kịp xảy ra.',
      en: "A great keeper doesn't save a goal, they save the match before it happens.",
    },
    mistake: {
      vi: 'Nhiều người chọn thủ môn chỉ theo OVR tổng mà bỏ qua phong cách thi đấu (chơi cao/lùi sâu) không hợp với chiến thuật của mình.',
      en: "Many players pick a keeper by overall rating alone, ignoring a playstyle (high line vs deep) that doesn't fit their tactics.",
    },
  },
];

async function run() {
  await connectDB();

  let admin = await User.findOne({ email: ADMIN_EMAIL });
  if (!admin) {
    admin = await User.create({
      name: 'Admin',
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: 'admin',
    });
  } else {
    admin.password = ADMIN_PASSWORD;
    admin.role = 'admin';
    await admin.save();
  }

  await Post.deleteMany({});
  await Post.insertMany(POSTS.map(toHtmlBody));

  console.log('Seed complete.');
  console.log(`Admin login -> email: ${ADMIN_EMAIL} / password: ${ADMIN_PASSWORD}`);
  console.log(`Posts inserted: ${POSTS.length}`);

  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
