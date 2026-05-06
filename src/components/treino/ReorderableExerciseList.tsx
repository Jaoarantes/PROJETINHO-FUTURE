import { useMemo, useState, type ReactNode } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { GripVertical } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import type { SessaoTreino } from '../../types/treino';

type ExerciseItem = SessaoTreino['exercicios'][number];

type ReorderableExerciseListProps = {
  exercicios: ExerciseItem[];
  onReorder: (exercicios: ExerciseItem[]) => void;
};

function SortableExerciseCard({
  exTreino,
  children,
}: {
  exTreino: { id: string };
  children: (dragHandleProps: Record<string, unknown>) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exTreino.id });

  return (
    <Card
      ref={setNodeRef}
      style={{
        opacity: isDragging ? 0 : 1,
        position: 'relative',
        transform: CSS.Translate.toString(transform),
        transition,
      }}
    >
      {children({ ref: setActivatorNodeRef, ...attributes, ...listeners })}
    </Card>
  );
}

export default function ReorderableExerciseList({ exercicios, onReorder }: ReorderableExerciseListProps) {
  const [activeExId, setActiveExId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  const exercicioIds = useMemo(() => exercicios.map((ex) => ex.id), [exercicios]);
  const activeExTreino = useMemo(() => exercicios.find((ex) => ex.id === activeExId), [exercicios, activeExId]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveExId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveExId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = exercicios.findIndex((ex) => ex.id === active.id);
    const newIndex = exercicios.findIndex((ex) => ex.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(arrayMove(exercicios, oldIndex, newIndex));
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={exercicioIds} strategy={verticalListSortingStrategy}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
          {exercicios.map((exTreino, idx) => (
            <SortableExerciseCard key={exTreino.id} exTreino={exTreino}>
              {(dragHandleProps) => {
                const { ref: handleRef, ...handleListeners } = dragHandleProps as {
                  ref?: React.Ref<HTMLElement>;
                  [key: string]: unknown;
                };

                return (
                  <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        ref={handleRef}
                        {...handleListeners}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'grab',
                          touchAction: 'none',
                          '&:active': { cursor: 'grabbing' },
                          opacity: 0.4,
                        }}
                      >
                        <GripVertical size={20} />
                      </Box>
                      <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
                        {idx + 1}. {exTreino.exercicio.nome}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {exTreino.series.length} séries
                      </Typography>
                    </Box>
                  </CardContent>
                );
              }}
            </SortableExerciseCard>
          ))}
        </Box>
      </SortableContext>

      <DragOverlay dropAnimation={null}>
        {activeExTreino ? (
          <Card sx={{ boxShadow: '0 8px 30px rgba(0,0,0,0.25)', transform: 'scale(1.03)' }}>
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GripVertical size={20} style={{ opacity: 0.5 }} />
                <Typography variant="body2" fontWeight={600}>
                  {activeExTreino.exercicio.nome}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
