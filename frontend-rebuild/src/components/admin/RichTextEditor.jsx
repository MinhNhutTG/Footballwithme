import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

const TOOLBAR_BUTTONS = [
    { label: 'B', title: 'Đậm', action: (e) => e.chain().focus().toggleBold().run(), isActive: (e) => e.isActive('bold'), className: 'font-bold' },
    { label: 'I', title: 'Nghiêng', action: (e) => e.chain().focus().toggleItalic().run(), isActive: (e) => e.isActive('italic'), className: 'italic' },
    { label: 'S', title: 'Gạch ngang', action: (e) => e.chain().focus().toggleStrike().run(), isActive: (e) => e.isActive('strike'), className: 'line-through' },
    { label: 'H2', title: 'Tiêu đề lớn', action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(), isActive: (e) => e.isActive('heading', { level: 2 }) },
    { label: 'H3', title: 'Tiêu đề nhỏ', action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(), isActive: (e) => e.isActive('heading', { level: 3 }) },
    { label: '•', title: 'Danh sách', action: (e) => e.chain().focus().toggleBulletList().run(), isActive: (e) => e.isActive('bulletList') },
    { label: '1.', title: 'Danh sách số', action: (e) => e.chain().focus().toggleOrderedList().run(), isActive: (e) => e.isActive('orderedList') },
    { label: '"', title: 'Trích dẫn', action: (e) => e.chain().focus().toggleBlockquote().run(), isActive: (e) => e.isActive('blockquote') },
];


function RichTextEditor({ value, onChange }) {
    const editor = useEditor({
        extensions: [StarterKit],
        content: value || '',
        onUpdate: ({ editor: e }) => onChange(e.getHTML()),
        editorProps: {
            attributes: {
                class: 'prose-content min-h-[160px] rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-3 text-fwm-text focus:outline-none',
            }
        }
    })

    if (!editor) return null;
    return (
        <>
            <div className="mb-2 flex flex-wrap gap-1 rounded-fwm border border-fwm-line bg-fwm-card-2 p-1.5">
                {TOOLBAR_BUTTONS.map((btn) => (
                    <button
                        type="button"
                        key={btn.label}
                        title={btn.title}
                        onClick={() => btn.action(editor)}
                        className={`h-8 min-w-8 rounded-fwm-sm px-2 text-sm font-bold transition ${btn.className || ''} ${btn.isActive(editor) ? 'bg-fwm-accent text-fwm-ink' : 'text-fwm-text hover:bg-fwm-pill'
                            }`}
                    >
                        {btn.label}
                    </button>
                ))}
            </div>
            <EditorContent editor={editor}></EditorContent>
        </>
    )
}

export default RichTextEditor;