import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Heading1, Heading2, List, ListOrdered, Code, Link2 } from 'lucide-react';

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function TipTapEditor({ content, onChange, placeholder }: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: placeholder ?? 'Start writing…' }),
    ],
    content,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  // Sync external content changes (e.g. when note changes)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
    // Only re-run when content identity changes from outside
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) return null;

  function setLink() {
    const url = prompt('Enter URL:');
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    } else {
      editor?.chain().focus().unsetLink().run();
    }
  }

  const toolbarButtons: {
    label: string;
    icon: React.ElementType;
    action: () => void;
    isActive: () => boolean;
  }[] = [
    {
      label: 'Bold',
      icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive('bold'),
    },
    {
      label: 'Italic',
      icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive('italic'),
    },
    {
      label: 'Heading 1',
      icon: Heading1,
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: () => editor.isActive('heading', { level: 1 }),
    },
    {
      label: 'Heading 2',
      icon: Heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor.isActive('heading', { level: 2 }),
    },
    {
      label: 'Bullet List',
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive('bulletList'),
    },
    {
      label: 'Ordered List',
      icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive('orderedList'),
    },
    {
      label: 'Code Block',
      icon: Code,
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: () => editor.isActive('codeBlock'),
    },
    {
      label: 'Link',
      icon: Link2,
      action: setLink,
      isActive: () => editor.isActive('link'),
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar */}
      <div
        role="toolbar"
        aria-label="Formatting"
        className="flex flex-wrap gap-1 p-1 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700"
      >
        {toolbarButtons.map(({ label, icon: Icon, action, isActive }) => (
          <button
            key={label}
            type="button"
            onClick={action}
            aria-label={label}
            aria-pressed={isActive()}
            className={`p-1.5 rounded-md transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center
              ${
                isActive()
                  ? 'bg-primary-600 text-white'
                  : 'text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
              }`}
          >
            <Icon size={15} />
          </button>
        ))}
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        aria-label="Note content"
        aria-multiline="true"
        className="min-h-[200px] prose prose-sm dark:prose-invert max-w-none focus-within:outline-none [&_.tiptap]:outline-none [&_.tiptap]:min-h-[200px] [&_.tiptap]:p-3 [&_.tiptap]:rounded-lg [&_.tiptap]:border [&_.tiptap]:border-surface-200 dark:[&_.tiptap]:border-surface-700 [&_.tiptap]:bg-white dark:[&_.tiptap]:bg-surface-900 [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:text-surface-400 [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:h-0"
      />
    </div>
  );
}
