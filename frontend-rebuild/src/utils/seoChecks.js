export function checkLength(text, min, max) {
    const len = (text || '').trim().length;
    if (len === 0) return { status: 'fail', message: 'Chưa nhập' };
    if (len < min) return { status: 'warn', message: `${len} ký tự — nên dài hơn (tối thiểu ~${min})` };
    if (len > max) return { status: 'warn', message: `${len} ký tự — nên ngắn hơn (tối đa ~${max})` };
    return { status: 'pass', message: `${len} ký tự — độ dài tốt` };
}

export function checkWordCount(html, min) {
    const text = (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = text ? text.split(' ').length : 0;
    if (words === 0) return { status: 'fail', message: 'Chưa có nội dung' };
    if (words < min) return { status: 'warn', message: `${words} từ — nên viết dài hơn (tối thiểu ~${min} từ)` };
    return { status: 'pass', message: `${words} từ — độ dài nội dung tốt` };
}

export function checkPresence(value, presentMessage, missingMessage) {
    return value ? { status: 'pass', message: presentMessage } : { status: 'warn', message: missingMessage };
}
