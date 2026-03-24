import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, IconButton, CircularProgress, Avatar, Button, Card, CardContent, Chip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ArrowLeft, Dumbbell, Copy, X } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { carregarTreinoCompartilhado, atualizarStatusShare } from '../../services/shareWorkoutService';
import type { SharedWorkout } from '../../services/shareWorkoutService';
import { useTreinoStore } from '../../store/treinoStore';
import { salvarSessao } from '../../services/treinoService';
import { TIPO_SESSAO_LABELS, TIPO_SERIE_CORES } from '../../types/treino';
import type { SessaoTreino, ExercicioTreino } from '../../types/treino';

export default function TreinoCompartilhado() {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [share, setShare] = useState<SharedWorkout | null>(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);

  const uid = user?.id;

  useEffect(() => {
    if (shareId) {
      carregarTreinoCompartilhado(shareId)
        .then(setShare)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [shareId]);

  if (!uid || !shareId) return null;

  const handleDescartar = () => {
    navigate('/feed/notificacoes');
  };

  const handleCopiar = async () => {
    if (!share || copying) return;
    setCopying(true);
    try {
      const sessao = share.sessaoData;
      const novoNome = `${sessao.nome} (${share.fromUserName || 'compartilhado'})`;

      // Gerar novos IDs para não conflitar
      const novoId = crypto.randomUUID();
      const novaSessao: SessaoTreino = {
        ...sessao,
        id: novoId,
        nome: novoNome,
        criadoEm: new Date().toISOString(),
        exercicios: sessao.exercicios.map((ex: ExercicioTreino) => ({
          ...ex,
          id: crypto.randomUUID(),
          series: ex.series.map((s) => ({
            ...s,
            id: crypto.randomUUID(),
            concluida: false,
          })),
        })),
        corrida: sessao.corrida ? {
          ...sessao.corrida,
          id: crypto.randomUUID(),
          etapas: sessao.corrida.etapas.map((e) => ({ ...e, id: crypto.randomUUID() })),
        } : undefined,
        natacao: sessao.natacao ? {
          ...sessao.natacao,
          id: crypto.randomUUID(),
          etapas: sessao.natacao.etapas.map((e) => ({ ...e, id: crypto.randomUUID() })),
        } : undefined,
      };

      // Adicionar ao store local e salvar no Supabase
      useTreinoStore.setState((state) => ({
        sessoes: [...state.sessoes, novaSessao],
      }));
      await salvarSessao(uid, novaSessao);
      await atualizarStatusShare(share.id, 'accepted');

      navigate('/treino');
    } catch (err) {
      console.error('Erro ao copiar treino:', err);
    } finally {
      setCopying(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 12 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!share) {
    return (
      <Box sx={{ pt: 1, pb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
            <ArrowLeft size={22} />
          </IconButton>
          <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.1rem' }}>
            Treino compartilhado
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>
          Treino não encontrado ou já foi processado.
        </Typography>
      </Box>
    );
  }

  const sessao = share.sessaoData;

  return (
    <Box sx={{ pt: 1, pb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
          <ArrowLeft size={22} />
        </IconButton>
        <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.1rem' }}>
          Treino compartilhado
        </Typography>
      </Box>

      {/* Remetente */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.5, mb: 3,
        p: 1.5, borderRadius: '14px',
        bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
      }}>
        <Avatar src={share.fromUserPhoto || undefined} sx={{ width: 44, height: 44 }}>
          {share.fromUserName?.charAt(0).toUpperCase() || 'U'}
        </Avatar>
        <Box>
          <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.95rem' }}>
            {share.fromUserName || 'Usuário'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            compartilhou um treino com você
          </Typography>
        </Box>
      </Box>

      {/* Info do treino */}
      <Box sx={{
        p: 2, borderRadius: '16px', mb: 2,
        bgcolor: (theme) => alpha(theme.palette.text.primary, 0.03),
        border: '1px solid',
        borderColor: 'divider',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Dumbbell size={20} color="#FF6B2C" />
          <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.1rem' }}>
            {sessao.nome}
          </Typography>
        </Box>
        <Chip
          label={TIPO_SESSAO_LABELS[sessao.tipo] || sessao.tipoCustom || sessao.tipo}
          size="small"
          sx={{
            mb: 2, fontWeight: 600, fontSize: '0.75rem',
            bgcolor: alpha('#FF6B2C', 0.1), color: '#FF6B2C',
          }}
        />

        {/* Lista de exercícios */}
        {sessao.exercicios.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {sessao.exercicios.map((ex, i) => (
              <Card key={ex.id} variant="outlined" sx={{ borderRadius: '12px' }}>
                <CardContent sx={{ py: 1.2, px: 2, '&:last-child': { pb: 1.2 } }}>
                  <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.9rem' }}>
                    {i + 1}. {ex.exercicio.nome}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    {ex.series.length} séries
                    {ex.series[0]?.repeticoes ? ` • ${ex.series[0].repeticoes} reps` : ''}
                    {ex.series[0]?.peso ? ` • ${ex.series[0].peso}kg` : ''}
                    {ex.series[0]?.tipo && ex.series[0].tipo !== 'normal' && (
                      <Box
                        component="span"
                        sx={{
                          ml: 0.5, px: 0.5, borderRadius: '4px', fontSize: '0.65rem',
                          bgcolor: alpha(TIPO_SERIE_CORES[ex.series[0].tipo] || '#9E9E9E', 0.15),
                          color: TIPO_SERIE_CORES[ex.series[0].tipo] || '#9E9E9E',
                        }}
                      >
                        {ex.series[0].tipo}
                      </Box>
                    )}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {/* Corrida */}
        {sessao.corrida && sessao.corrida.etapas.length > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {sessao.corrida.etapas.length} etapas de corrida
          </Typography>
        )}

        {/* Natação */}
        {sessao.natacao && sessao.natacao.etapas.length > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {sessao.natacao.etapas.length} etapas de natação
          </Typography>
        )}
      </Box>

      {/* Botões */}
      <Box sx={{ display: 'flex', gap: 1.5, mt: 3 }}>
        <Button
          variant="outlined"
          fullWidth
          startIcon={<X size={18} />}
          onClick={handleDescartar}
          sx={{
            textTransform: 'none', fontWeight: 700, borderRadius: '12px',
            py: 1.2, fontSize: '0.95rem', borderColor: 'divider',
            color: 'text.secondary',
          }}
        >
          Descartar
        </Button>
        <Button
          variant="contained"
          fullWidth
          startIcon={copying ? <CircularProgress size={18} color="inherit" /> : <Copy size={18} />}
          onClick={handleCopiar}
          disabled={copying || share.status !== 'pending'}
          sx={{
            textTransform: 'none', fontWeight: 700, borderRadius: '12px',
            py: 1.2, fontSize: '0.95rem',
            bgcolor: '#FF6B2C', '&:hover': { bgcolor: '#e55a1b' },
          }}
        >
          {share.status === 'accepted' ? 'Já copiado' : 'Copiar'}
        </Button>
      </Box>
    </Box>
  );
}
