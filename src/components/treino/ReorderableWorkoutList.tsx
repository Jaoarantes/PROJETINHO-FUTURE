import { memo, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  IconButton,
  Typography,
} from '@mui/material';
import { CircleEllipsis, Dumbbell, Footprints, GripVertical, MoreVertical, Play, Waves } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import type { SessaoTreino, TipoSessao } from '../../types/treino';
import { TIPO_SESSAO_LABELS } from '../../types/treino';
import { TIPO_CORES, getSessaoSubtitle } from '../../pages/treino/treinoTabUtils';

const TIPO_ICONS: Record<TipoSessao, typeof Dumbbell> = {
  musculacao: Dumbbell,
  corrida: Footprints,
  natacao: Waves,
  outro: CircleEllipsis,
};

interface ReorderableWorkoutListProps {
  sessoes: SessaoTreino[];
  sessoesAgrupadas: Record<TipoSessao, SessaoTreino[]>;
  treinoAtivoId?: string;
  onNavigate: (id: string) => void;
  onMenuOpen: (e: React.MouseEvent<HTMLElement>, id: string) => void;
  onIniciar: (id: string) => void;
  onReorder: (sessoes: SessaoTreino[]) => void;
}

interface SortableTreinoCardProps {
  sessao: SessaoTreino;
  index: number;
  tipo: TipoSessao;
  isAtivo: boolean;
  onNavigate: (id: string) => void;
  onMenuOpen: (e: React.MouseEvent<HTMLElement>, id: string) => void;
  onIniciar: (id: string) => void;
  isOverlay?: boolean;
  isDragging?: boolean;
}

const overlayStyle = {
  opacity: 1,
  cursor: 'grabbing',
  zIndex: 2000,
  transform: 'scale(1.02)',
  boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
};

const SortableTreinoCard = memo(function SortableTreinoCard({
  sessao,
  index,
  tipo,
  isAtivo,
  onNavigate,
  onMenuOpen,
  onIniciar,
  isOverlay,
  isDragging: propIsDragging,
}: SortableTreinoCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: dndIsDragging,
  } = useSortable({ id: sessao.id, disabled: isOverlay });

  const isDragging = propIsDragging || dndIsDragging;

  const style = isOverlay ? overlayStyle : {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 0 : 1,
    position: 'relative' as const,
  };

  const Icon = TIPO_ICONS[tipo];

  return (
    <Card
      ref={setNodeRef}
      style={style}
      sx={{
        ...(isAtivo && { borderColor: 'primary.main', borderWidth: 2, borderStyle: 'solid' }),
        ...(isDragging && !isOverlay && { visibility: 'hidden' }),
        ...(isOverlay && { boxShadow: '0 8px 30px rgba(0,0,0,0.2)', transform: 'scale(1.02)' }),
        transition: 'all 0.2s ease',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box
          {...attributes}
          {...listeners}
          sx={{
            p: 1.5,
            pl: 1,
            display: 'flex',
            alignItems: 'center',
            cursor: 'grab',
            touchAction: 'none',
            '&:active': { cursor: 'grabbing' },
            opacity: 0.3,
            '&:hover': { opacity: 0.7 },
          }}
        >
          <GripVertical size={20} />
        </Box>

        <CardActionArea onClick={() => onNavigate(sessao.id)} sx={{ flex: 1 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', py: 1.5, px: 1, pl: 0 }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: '10px',
              background: TIPO_CORES[tipo],
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              mr: 1.5, flexShrink: 0,
            }}>
              {tipo === 'musculacao' ? (
                <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>
                  {String.fromCharCode(65 + index)}
                </Typography>
              ) : (
                <Icon size={20} color="#fff" />
              )}
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ wordBreak: 'break-word' }}>{sessao.nome}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  {getSessaoSubtitle(sessao)}
                </Typography>
                {sessao.diaSemana && (
                  <>
                    <Typography variant="caption" color="text.secondary">·</Typography>
                    <Typography variant="caption" color="primary.main" fontWeight={600} sx={{ fontSize: '0.7rem' }}>
                      {sessao.diaSemana}
                    </Typography>
                  </>
                )}
              </Box>
            </Box>
          </CardContent>
        </CardActionArea>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onMenuOpen(e, sessao.id); }} sx={{ ml: 0.5, flexShrink: 0, alignSelf: 'center', mr: 0.5 }}>
          <MoreVertical size={16} />
        </IconButton>
      </Box>

      {!isAtivo && (
        <Button
          fullWidth
          size="small"
          startIcon={<Play size={16} />}
          onClick={(e) => { e.stopPropagation(); onIniciar(sessao.id); }}
          sx={{
            borderTop: 1,
            borderColor: 'divider',
            borderRadius: 0,
            py: 0.8,
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'primary.main',
            textTransform: 'none',
          }}
        >
          Começar treino
        </Button>
      )}
    </Card>
  );
});

export default function ReorderableWorkoutList({
  sessoes,
  sessoesAgrupadas,
  treinoAtivoId,
  onNavigate,
  onMenuOpen,
  onIniciar,
  onReorder,
}: ReorderableWorkoutListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const activeSessao = sessoes.find(s => s.id === active.id);
      if (!activeSessao) return;

      const tipo = activeSessao.tipo || 'musculacao';
      const currentList = sessoesAgrupadas[tipo];

      const oldIndex = currentList.findIndex((s) => s.id === active.id);
      const newIndex = currentList.findIndex((s) => s.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const newList = arrayMove(currentList, oldIndex, newIndex);
      const updatedSessoes = sessoes.map((s) => {
        const isTargetType = (s.tipo === tipo || (!s.tipo && tipo === 'musculacao'));
        if (isTargetType) {
          const idx = newList.findIndex((item) => item.id === s.id);
          return { ...s, posicao: idx };
        }
        return s;
      });

      onReorder(updatedSessoes);
    }
  };

  const activeSessao = useMemo(() => sessoes.find(s => s.id === activeId), [sessoes, activeId]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {(Object.entries(sessoesAgrupadas) as [TipoSessao, SessaoTreino[]][])
          .filter(([, list]) => list.length > 0)
          .map(([tipo, list]) => {
            const Icon = TIPO_ICONS[tipo];
            return (
              <Box key={tipo}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Icon size={18} />
                  <Typography variant="subtitle1" fontWeight={700} sx={{ textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                    {tipo === 'outro' ? 'Outros' : TIPO_SESSAO_LABELS[tipo]}
                  </Typography>
                  <Chip label={list.length} size="small" sx={{ height: 20, fontSize: '0.7rem', minWidth: 24 }} />
                </Box>

                <SortableContext
                  items={list.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {list.map((sessao, index) => (
                      <SortableTreinoCard
                        key={sessao.id}
                        sessao={sessao}
                        index={index}
                        tipo={tipo}
                        isAtivo={treinoAtivoId === sessao.id}
                        onNavigate={onNavigate}
                        onMenuOpen={onMenuOpen}
                        onIniciar={onIniciar}
                      />
                    ))}
                  </Box>
                </SortableContext>
              </Box>
            );
          })}
      </Box>
      <DragOverlay>
        {activeSessao ? (
          <SortableTreinoCard
            sessao={activeSessao}
            index={0}
            tipo={activeSessao.tipo || 'musculacao'}
            isAtivo={treinoAtivoId === activeSessao.id}
            onNavigate={() => { }}
            onMenuOpen={() => { }}
            onIniciar={() => { }}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
