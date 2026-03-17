import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, IconButton, Avatar, InputBase, CircularProgress, List, ListItem, ListItemAvatar, ListItemText,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ArrowLeft, Search, Lock, X } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { searchUsers } from '../../services/userService';
import type { SearchUserResult } from '../../services/userService';

export default function BuscaUsuarios() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const uid = user?.id;
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim() || !uid) {
      setResults([]);
      setSearched(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setSearched(true);
      try {
        const data = await searchUsers(query, uid);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, uid]);

  if (!uid) return null;

  return (
    <Box sx={{ pt: 1, pb: 4 }}>
      {/* Header com campo de busca */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton onClick={() => navigate('/feed')} sx={{ ml: -1 }}>
          <ArrowLeft size={22} />
        </IconButton>
        <Box sx={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 1,
          px: 1.5, py: 0.8, borderRadius: '12px',
          bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha('#fff', 0.06) : alpha('#000', 0.04),
        }}>
          <Search size={18} style={{ opacity: 0.4, flexShrink: 0 }} />
          <InputBase
            inputRef={inputRef}
            placeholder="Buscar por nome ou @usuário..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{
              flex: 1, fontSize: '0.92rem', fontWeight: 500,
              '& input::placeholder': { opacity: 0.5 },
            }}
          />
          {query && (
            <IconButton size="small" onClick={() => setQuery('')} sx={{ p: 0.3 }}>
              <X size={16} />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {/* Resultados */}
      {!loading && results.length > 0 && (
        <List disablePadding>
          {results.map((u) => (
            <ListItem
              key={u.id}
              onClick={() => navigate(`/feed/perfil/${u.id}`)}
              sx={{
                px: 1.5, py: 1, borderRadius: '12px', cursor: 'pointer',
                '&:active': { bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04) },
              }}
            >
              <ListItemAvatar sx={{ minWidth: 52 }}>
                <Avatar src={u.photoURL || undefined} sx={{ width: 44, height: 44 }}>
                  {u.displayName?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.95rem' }}>
                      {u.displayName || 'Usuário'}
                    </Typography>
                    {u.isPrivate && <Lock size={13} style={{ opacity: 0.4 }} />}
                  </Box>
                }
                secondary={u.username ? `@${u.username}` : null}
                secondaryTypographyProps={{ sx: { fontSize: '0.8rem', color: 'text.secondary' } }}
              />
            </ListItem>
          ))}
        </List>
      )}

      {/* Nenhum resultado */}
      {!loading && searched && results.length === 0 && (
        <Box sx={{
          textAlign: 'center', py: 8,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        }}>
          <Box sx={{
            width: 70, height: 70, borderRadius: '20px',
            background: `linear-gradient(135deg, ${alpha('#FF6B2C', 0.12)} 0%, ${alpha('#FF6B2C', 0.04)} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Search size={32} color="#FF6B2C" />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Nenhum usuário encontrado.
          </Typography>
        </Box>
      )}

      {/* Estado inicial */}
      {!loading && !searched && (
        <Box sx={{
          textAlign: 'center', py: 8,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        }}>
          <Box sx={{
            width: 70, height: 70, borderRadius: '20px',
            background: `linear-gradient(135deg, ${alpha('#FF6B2C', 0.12)} 0%, ${alpha('#FF6B2C', 0.04)} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Search size={32} color="#FF6B2C" />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Digite o nome de um usuário para buscar.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
