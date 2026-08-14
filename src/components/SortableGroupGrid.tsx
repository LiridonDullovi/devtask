import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Context, GroupWithCount } from "../types";
import { GroupCard } from "./GroupCard";

interface SortableGroupGridProps {
  groups: GroupWithCount[];
  context: Context;
  onSelectGroup: (groupId: string) => void;
  onReorder: (groupIds: string[]) => void;
}

function SortableGroupCard({
  group,
  context,
  onClick,
}: {
  group: GroupWithCount;
  context: Context;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <GroupCard group={group} context={context} onClick={onClick} />
    </div>
  );
}

export function SortableGroupGrid({
  groups,
  context,
  onSelectGroup,
  onReorder,
}: SortableGroupGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = groups.findIndex((g) => g.id === active.id);
    const newIndex = groups.findIndex((g) => g.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(groups, oldIndex, newIndex);
    onReorder(reordered.map((g) => g.id));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={groups.map((g) => g.id)}
        strategy={rectSortingStrategy}
      >
        <div className="flex flex-wrap gap-3">
          {groups.map((group) => (
            <SortableGroupCard
              key={group.id}
              group={group}
              context={context}
              onClick={() => onSelectGroup(group.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
