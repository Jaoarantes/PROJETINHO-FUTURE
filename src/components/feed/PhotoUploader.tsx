import { useRef } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Camera, X, Plus } from 'lucide-react';

interface Props {
  photos: File[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
  max?: number;
}

export default function PhotoUploader({ photos, onAdd, onRemove, max = 3 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const remaining = max - photos.length;
      onAdd(files.slice(0, remaining));
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  if (photos.length === 0) {
    return (
      <Box
        onClick={() => inputRef.current?.click()}
        sx={{
          border: '2px dashed',
          borderColor: alpha('#FF6B2C', 0.25),
          borderRadius: '16px',
          py: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:active': { bgcolor: alpha('#FF6B2C', 0.05), borderColor: alpha('#FF6B2C', 0.4) },
        }}
      >
        <Box sx={{
          width: 48, height: 48, borderRadius: '14px',
          background: `linear-gradient(135deg, ${alpha('#FF6B2C', 0.15)} 0%, ${alpha('#FF6B2C', 0.05)} 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Camera size={24} color="#FF6B2C" />
        </Box>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          Adicionar fotos (até {max})
        </Typography>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleChange}
          style={{ display: 'none' }}
        />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
        {photos.map((file, i) => (
          <Box key={i} sx={{ position: 'relative', flexShrink: 0 }}>
            <Box
              component="img"
              src={URL.createObjectURL(file)}
              alt=""
              sx={{
                width: 100, height: 100,
                objectFit: 'cover',
                borderRadius: '12px',
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
            <IconButton
              size="small"
              onClick={() => onRemove(i)}
              sx={{
                position: 'absolute', top: -6, right: -6,
                bgcolor: '#EF4444', color: '#fff',
                width: 22, height: 22,
                '&:hover': { bgcolor: '#DC2626' },
              }}
            >
              <X size={12} />
            </IconButton>
          </Box>
        ))}

        {photos.length < max && (
          <Box
            onClick={() => inputRef.current?.click()}
            sx={{
              width: 100, height: 100,
              borderRadius: '12px',
              border: '2px dashed',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.2s',
              '&:active': { borderColor: alpha('#FF6B2C', 0.4) },
            }}
          >
            <Plus size={24} color="#94A3B8" />
          </Box>
        )}
      </Box>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleChange}
        style={{ display: 'none' }}
      />
    </Box>
  );
}
