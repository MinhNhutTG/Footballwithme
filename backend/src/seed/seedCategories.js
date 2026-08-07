require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Category = require('../models/Category');

const CATEGORIES = [
  {
    slug: 'skill',
    label: { vi: 'Kỹ năng', en: 'Skill' },
    desc: { vi: 'Kỹ thuật cá nhân, combo điều khiển', en: 'Personal technique, controller combos' },
    gradient: 'from-amber-400 via-orange-500 to-pink-500',
    hasSteps: true,
  },
  {
    slug: 'tactic',
    label: { vi: 'Chiến thuật', en: 'Tactics' },
    desc: { vi: 'Sơ đồ, chỉ thị, vận hành đội hình', en: 'Formations, instructions, team play' },
    gradient: 'from-indigo-500 via-blue-500 to-cyan-400',
    hasSteps: false,
  },
  {
    slug: 'exp',
    label: { vi: 'Kinh nghiệm', en: 'Experience' },
    desc: { vi: 'Bài học thực chiến từ cộng đồng', en: 'Real match lessons from the community' },
    gradient: 'from-emerald-400 via-teal-500 to-cyan-500',
    hasSteps: false,
  },
  {
    slug: 'player',
    label: { vi: 'Người chơi', en: 'Players' },
    desc: { vi: 'Phân tích cầu thủ, build đội hình', en: 'Player analysis, squad building' },
    gradient: 'from-fuchsia-500 via-pink-500 to-rose-400',
    hasSteps: false,
  },
];

async function run() {
  await connectDB();

  for (const cat of CATEGORIES) {
    await Category.updateOne({ slug: cat.slug }, { $setOnInsert: cat }, { upsert: true });
  }

  console.log(`Seed categories xong (${CATEGORIES.length} danh mục).`);
  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
