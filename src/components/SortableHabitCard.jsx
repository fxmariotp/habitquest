import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export function SortableHabitCard({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? 'transform 250ms ease',
        position: 'relative',
        zIndex: isDragging ? 100 : 'auto',
      }}
      {...attributes}
    >
      {children({ listeners, isDragging })}
    </div>
  )
}
