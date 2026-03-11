import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
  Button,
  MenuItem,
  Box,
  CircularProgress,
  Alert,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { X } from 'lucide-react';
import { useExercicioCustomStore } from '../../store/exercicioCustomStore';
import { useAuthContext } from '../../contexts/AuthContext';
import { GRUPOS_MUSCULARES } from '../../constants/exercicios-padrao';

interface Props {
  open: boolean;
  onClose: () => void;
}

const EQUIPAMENTOS = [
  'Sem equipamento',
  'Barra',
  'Halteres',
  'Máquina',
  'Cabo',
  'Elástico',
  'Barra fixa',
  'Paralelas',
  'Smith',
  'Kettlebell',
  'Banco',
];

export default function CadastrarExercicio({ open, onClose }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const adicionarExercicio = useExercicioCustomStore((s) => s.adicionarExercicio);
  const { user } = useAuthContext();

  const [nome, setNome] = useState('');
  const [grupo, setGrupo] = useState('');
  const [equipamento, setEquipamento] = useState('');
  const [descricao, setDescricao] = useState('');
  const [gifUrl, setGifUrl] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroNome, setErroNome] = useState(false);
  const [erroGrupo, setErroGrupo] = useState(false);
  const [erroSalvar, setErroSalvar] = useState('');

  const handleSalvar = async () => {
    if (!nome.trim()) { setErroNome(true); return; }
    if (!grupo) { setErroGrupo(true); return; }
    if (!user) return;

    setSalvando(true);
    setErroSalvar('');
    try {
      await adicionarExercicio(user.uid, {
        nome: nome.trim(),
        grupoMuscular: grupo,
        equipamento: equipamento || undefined,
        descricao: descricao.trim() || undefined,
        gifUrl: gifUrl.trim() || undefined,
      });
      handleReset();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido';
      setErroSalvar(msg);
    } finally {
      setSalvando(false);
    }
  };

  const handleReset = () => {
    setNome('');
    setGrupo('');
    setEquipamento('');
    setDescricao('');
    setGifUrl('');
    setErroNome(false);
    setErroGrupo(false);
    setErroSalvar('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleReset}
      fullScreen={isMobile}
      maxWidth="xs"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          maxWidth: '500px',
          margin: isMobile ? 0 : 'auto'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', pb: 1, pt: isMobile ? 'calc(16px + env(safe-area-inset-top, 0px))' : undefined }}>
        <IconButton onClick={handleReset} sx={{ mr: 1 }}>
          <X />
        </IconButton>
        Cadastrar Exercício
      </DialogTitle>

      <DialogContent sx={{ px: 3, pt: 1 }}>
        {erroSalvar && (
          <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
            {erroSalvar.includes('permission') || erroSalvar.includes('PERMISSION')
              ? 'Sem permissão no banco de dados. Configure as regras do Firestore.'
              : erroSalvar}
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Nome do exercício"
            value={nome}
            onChange={(e) => { setNome(e.target.value); setErroNome(false); }}
            error={erroNome}
            helperText={erroNome ? 'Informe o nome' : ''}
            fullWidth
            autoFocus
          />

          <TextField
            select
            label="Grupo muscular"
            value={grupo}
            onChange={(e) => { setGrupo(e.target.value); setErroGrupo(false); }}
            error={erroGrupo}
            helperText={erroGrupo ? 'Selecione um grupo' : ''}
            fullWidth
          >
            {GRUPOS_MUSCULARES.map((g) => (
              <MenuItem key={g} value={g}>{g}</MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Equipamento (opcional)"
            value={equipamento}
            onChange={(e) => setEquipamento(e.target.value)}
            fullWidth
          >
            <MenuItem value=""><em>Nenhum</em></MenuItem>
            {EQUIPAMENTOS.map((eq) => (
              <MenuItem key={eq} value={eq}>{eq}</MenuItem>
            ))}
          </TextField>

          <TextField
            label="URL do GIF de execução (opcional)"
            value={gifUrl}
            onChange={(e) => setGifUrl(e.target.value)}
            fullWidth
            placeholder="https://..."
            helperText="Cole o link de um GIF mostrando o movimento"
          />

          <TextField
            label="Execução passo a passo (opcional)"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            multiline
            rows={5}
            fullWidth
            placeholder={'1. Posição inicial\n2. Movimento\n3. Retorno'}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 4, gap: 1 }}>
        <Button onClick={handleReset} variant="outlined" fullWidth disabled={salvando}>
          Cancelar
        </Button>
        <Button onClick={handleSalvar} variant="contained" fullWidth disabled={salvando}>
          {salvando ? <CircularProgress size={20} color="inherit" /> : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
