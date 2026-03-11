import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardActionArea, CardContent,
  IconButton, Fab, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Button, Chip, Menu, MenuItem,
} from '@mui/material';
import { Trash2, Dumbbell, Pencil, MoreVertical, Plus, ChevronRight } from 'lucide-react';
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
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontSize: '1.8rem', lineHeight: 1.1 }}>
          MEUS TREINOS
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {sessoes.length} {sessoes.length === 1 ? 'treino' : 'treinos'} cadastrados
        </Typography>
      </Box>

      {sessoes.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            mt: 8,
            p: 4,
            borderRadius: 3,
            border: '1px dashed rgba(255,255,255,0.1)',
          }}
        >
          <Dumbbell size={56} style={{ opacity: 0.15, marginBottom: 16 }} />
          <Typography color="text.secondary" sx={{ mb: 0.5 }} fontWeight={500}>
            Nenhum treino criado
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7 }}>
            Toque no + para criar seu primeiro treino
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {sessoes.map((sessao, index) => (
            <Card key={sessao.id}>
              <CardActionArea onClick={() => navigate(`/treino/${sessao.id}`)}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', py: 2, px: 2 }}>
                  {/* Index badge */}
                  <Box
                    sx={{
                      width: 44, height: 44, borderRadius: '12px',
                      background: 'linear-gradient(135deg, #FF6B2C 0%, #E55A1B 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      mr: 2, flexShrink: 0,
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: '"Oswald", sans-serif',
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        color: '#000',
                      }}
                    >
                      {String.fromCharCode(65 + index)}
                    </Typography>
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={600} noWrap>
                      {sessao.nome}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                      <Typography variant="caption" color="text.secondary">
                        {sessao.exercicios.length} exercício{sessao.exercicios.length !== 1 ? 's' : ''}
                      </Typography>
                      {sessao.diaSemana && (
                        <>
                          <Typography variant="caption" color="text.secondary">·</Typography>
                          <Typography variant="caption" color="primary.main" fontWeight={600}>
                            {sessao.diaSemana}
                          </Typography>
                        </>
                      )}
                    </Box>
                  </Box>

                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, sessao.id)}
                    sx={{ mr: -0.5 }}
                  >
                    <MoreVertical size={18} />
                  </IconButton>
                  <ChevronRight size={18} style={{ opacity: 0.3, marginLeft: 4 }} />
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}

      {/* Context menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={handleEditar}>
          <Pencil size={18} style={{ marginRight: 10 }} />
          Renomear
        </MenuItem>
        <MenuItem onClick={handleDeletar} sx={{ color: 'error.main' }}>
          <Trash2 size={18} style={{ marginRight: 10 }} />
          Excluir
        </MenuItem>
      </Menu>

      {/* FAB */}
      <Fab
        color="primary"
        onClick={() => { setNome(''); setDiaSelecionado(undefined); setDialogOpen(true); }}
        sx={{
          position: 'fixed',
          bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
          right: { xs: 20, sm: 'calc(50% - 230px)' },
          zIndex: 999,
        }}
      >
        <Plus />
      </Fab>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Novo Treino</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus label="Nome do treino"
            placeholder="Ex: Treino A — Peito e Tríceps"
            fullWidth value={nome} onChange={(e) => setNome(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Dia da semana (opcional)
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {diasSemana.map((dia) => (
              <Chip
                key={dia} label={dia} size="small"
                onClick={() => setDiaSelecionado(diaSelecionado === dia ? undefined : dia)}
                color={diaSelecionado === dia ? 'primary' : 'default'}
                variant={diaSelecionado === dia ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleCriar} variant="contained" disabled={!nome.trim()}>Criar</Button>
        </DialogActions>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Renomear Treino</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus label="Nome do treino" fullWidth
            value={nome} onChange={(e) => setNome(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleRenomear} variant="contained" disabled={!nome.trim()}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
