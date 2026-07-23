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
        class:
          'prose-content min-h-[160px] rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-3 text-fwm-text focus:outline-none [&_p]:mb-3 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-bold [&_ul]:ml-5 [&_ul]:list-disc [&_ol]:ml-5 [&_ol]:list-decimal [&_blockquote]:border-l-2 [&_blockquote]:border-fwm-accent [&_blockquote]:pl-3 [&_blockquote]:italic',
      },
    },
  });

  if (!editor) return null;

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1 rounded-fwm border border-fwm-line bg-fwm-card-2 p-1.5">
        {TOOLBAR_BUTTONS.map((btn) => (
          <button
            key={btn.label}
            type="button"
            title={btn.title}
            onClick={() => btn.action(editor)}
            className={`h-8 min-w-8 rounded-fwm-sm px-2 text-sm font-bold transition ${btn.className || ''} ${
              btn.isActive(editor)
                ? 'bg-fwm-accent text-fwm-ink'
                : 'text-fwm-text hover:bg-fwm-pill'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

export default RichTextEditor;
