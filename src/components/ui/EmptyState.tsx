import { Inbox } from 'lucide-react'

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No bookmarks yet',
  description = 'Add your first bookmark to get started.',
}: {
  icon?: React.ElementType
  title?: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <Icon size={48} className="text-surface-400 dark:text-surface-600 mb-4" />
      <h3 className="text-lg font-medium text-surface-700 dark:text-surface-300 mb-1">{title}</h3>
      <p className="text-sm text-surface-500 dark:text-surface-400">{description}</p>
    </div>
  )
}
