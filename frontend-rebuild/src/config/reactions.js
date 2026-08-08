import likeImg from '../assets/reactions/emoji-like.png';
import dislikeImg from '../assets/reactions/emoji-dislike.png';
import hahaImg from '../assets/reactions/emoji-haha.png';
import angryImg from '../assets/reactions/emoji-angry.png';
export const REACTIONS = [
    { type: 'like', label: { vi: 'Thích', en: 'Like' }, icon: likeImg },
    { type: 'dislike', label: { vi: 'Không thích', en: 'Dislike' }, icon: dislikeImg },
    { type: 'haha', label: { vi: 'Haha', en: 'Haha' }, icon: hahaImg },
    { type: 'angry', label: { vi: 'Giận dữ', en: 'Angry' }, icon: angryImg },
];