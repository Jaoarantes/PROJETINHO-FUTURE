import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  IconButton,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Chip,
  Menu,
  MenuItem,
} from '@mui/material';
import { Trash2, Dumbbell, Pencil, MoreVertical, Plus } from 'lucide-react';
import { useTreinoStore } from '../../store/treinoStore';

const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export default function TreinoTab() {
  const navigate = useNavigate();
  const { sessoes, criarSessao, removerSessao, renomearSessao } = useTreinoStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [nome, setNome] = useState('');
  const [diaSelecionado, setDiaSelecionado] = useState<string | undefined>();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuSessaoId, setMenuSessaoId] = useState('');

  const handleCriar = () => {
    if (!nome.trim()) return;
    criarSessao(nome.trim(), diaSelecionado);
    setNome('');
    setDiaSelecionado(undefined);
    setDialogOpen(false);
  };

  const handleRenomear = () => {
    if (!nome.trim()) return;
    renomearSessao(editId, nome.trim());
    setNome('');
    setEditDialogOpen(false);
  };

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>, id: string) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
    setMenuSessaoId(id);
  };

  const handleEditar = () => {
    const sessao = sessoes.find((s) => s.id === menuSessaoId);
    if (sessao) {
      setEditId(sessao.id);
      setNome(sessao.nome);
      setEditDialogOpen(true);
    }
    setMenuAnchor(null);
  };

  const handleDeletar = () => {
    removerSessao(menuSessaoId);
    setMenuAnchor(null);
  };

  return (
    <Box sx={{ pt: 2, pb: 10 }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>
        Meus Treinos
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Musculação
      </Typography>

      {sessoes.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <Dumbbell size={64} color="gray" style={{ opacity: 0.3, marginBottom: 16 }} />
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            Nenhum treino criado ainda
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Toque no + para criar seu primeiro treino
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {sessoes.map((sessao) => (
            <Card key={sessao.id} variant="outlined">
              <CardActionArea onClick={() => navigate(`/treino/${sessao.id}`)}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', py: 2 }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: '12px',
                      bgcolor: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                      flexShrink: 0,
                    }}
                  >
                    <Dumbbell color="#000" size={22} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={600} noWrap>
                      {sessao.nome}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {sessao.exercicios.length} exercício{sessao.exercicios.length !== 1 ? 's' : ''}
                      {sessao.diaSemana && ` · ${sessao.diaSemana}`}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, sessao.id)}
                  >
                    <MoreVertical />
                  </IconButton>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}

      {/* Menu de opções */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={handleEditar}>
          <Pencil size={20} style={{ marginRight: 8 }} />
          Renomear
        </MenuItem>
        <MenuItem onClick={handleDeletar} sx={{ color: 'error.main' }}>
          <Trash2 size={20} style={{ marginRight: 8 }} />
          Excluir
        </MenuItem>
      </Menu>

      {/* FAB para criar treino */}
      <Fab
        color="primary"
        onClick={() => { setNome(''); setDiaSelecionado(undefined); setDialogOpen(true); }}
        sx={{
          position: 'fixed',
          bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
          right: { xs: 16, sm: 'calc(50% - 234px)' },
          zIndex: 999,
        }}
      >
        <Plus />
      </Fab>

      {/* Dialog criar sessão */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Novo Treino</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Nome do treino"
            placeholder="Ex: Treino A - Peito e Tríceps"
            fullWidth
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Dia da semana (opcional)
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {diasSemana.map((dia) => (
              <Chip
                key={dia}
                label={dia}
                size="small"
                onClick={() => setDiaSelecionado(diaSelecionado === dia ? undefined : dia)}
                color={diaSelecionado === dia ? 'primary' : 'default'}
                variant={diaSelecionado === dia ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleCriar} variant="contained" disabled={!nome.trim()}>
            Criar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog renomear */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Renomear Treino</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Nome do treino"
            fullWidth
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleRenomear} variant="contained" disabled={!nome.trim()}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
