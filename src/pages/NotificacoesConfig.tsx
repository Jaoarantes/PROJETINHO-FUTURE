import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Switch, Chip, TextField, IconButton, alpha,
} from '@mui/material';
import { ArrowLeft, Dumbbell, UtensilsCrossed, Droplets, Flame, Heart, MessageCircle, UserPlus } from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthContext } from '../contexts/AuthContext';

const DIAS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

const INTERVALS = [1, 2, 3] as const;

export default function NotificacoesConfig() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { settings, loading, carregar, salvar } = useNotificationStore();

  useEffect(() => {
    if (user && !useNotificationStore.getState().uid) {
      carregar(user.id);
    }
  }, [user, carregar]);

  if (loading) return null;

  const toggleDay = (day: number) => {
    const days = settings.workoutDays.includes(day)
      ? settings.workoutDays.filter((d) => d !== day)
      : [...settings.workoutDays, day].sort();
    salvar({ workoutDays: days });
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate(-1)} size="small">
          <ArrowLeft size={20} />
        </IconButton>
        <Typography variant="h5" fontWeight={700}>Notificações</Typography>
      </Box>

      {/* Workout Reminders */}
      <SectionLabel icon={<Dumbbell size={14} />} text="Lembretes de Treino" />
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 2 }}>
          <SettingRow
            title="Lembrete de treino"
            subtitle="Receba um aviso nos seus dias de treino"
            checked={settings.workoutRemindersEnabled}
            onChange={(v) => salvar({ workoutRemindersEnabled: v })}
          />
          {settings.workoutRemindersEnabled && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Dias da semana
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
                {DIAS.map((d) => (
                  <Chip
                    key={d.value}
                    label={d.label}
                    size="small"
                    onClick={() => toggleDay(d.value)}
                    color={settings.workoutDays.includes(d.value) ? 'primary' : 'default'}
                    variant={settings.workoutDays.includes(d.value) ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
              <TextField
                label="Horário"
                type="time"
                size="small"
                value={settings.workoutTime}
                onChange={(e) => salvar({ workoutTime: e.target.value })}
                sx={{ width: 140 }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Streak Warning */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: 2 }}>
          <SettingRow
            title="Alerta de streak"
            subtitle="Avisa no sábado se você não treinou na semana"
            checked={settings.streakWarningEnabled}
            onChange={(v) => salvar({ streakWarningEnabled: v })}
          />
        </CardContent>
      </Card>

      {/* Meal Reminders */}
      <SectionLabel icon={<UtensilsCrossed size={14} />} text="Lembretes de Refeição" />
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: 2 }}>
          <SettingRow
            title="Lembrete de refeição"
            subtitle="Lembra de registrar suas refeições"
            checked={settings.mealRemindersEnabled}
            onChange={(v) => salvar({ mealRemindersEnabled: v })}
          />
          {settings.mealRemindersEnabled && (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {([
                { key: 'cafeManha' as const, label: 'Café da manhã' },
                { key: 'almoco' as const, label: 'Almoço' },
                { key: 'lanche' as const, label: 'Lanche' },
                { key: 'jantar' as const, label: 'Jantar' },
              ]).map((meal) => (
                <Box key={meal.key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2">{meal.label}</Typography>
                  <TextField
                    type="time"
                    size="small"
                    value={settings.mealTimes[meal.key]}
                    onChange={(e) => salvar({
                      mealTimes: { ...settings.mealTimes, [meal.key]: e.target.value },
                    })}
                    sx={{ width: 130 }}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Water Reminders */}
      <SectionLabel icon={<Droplets size={14} />} text="Lembretes de Água" />
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: 2 }}>
          <SettingRow
            title="Lembrete de hidratação"
            subtitle="Receba lembretes para beber água"
            checked={settings.waterRemindersEnabled}
            onChange={(v) => salvar({ waterRemindersEnabled: v })}
          />
          {settings.waterRemindersEnabled && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Intervalo entre lembretes
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                {INTERVALS.map((h) => (
                  <Chip
                    key={h}
                    label={`${h}h`}
                    size="small"
                    onClick={() => salvar({ waterInterval: h })}
                    color={settings.waterInterval === h ? 'primary' : 'default'}
                    variant={settings.waterInterval === h ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  label="Início"
                  type="number"
                  size="small"
                  value={settings.waterStartHour}
                  onChange={(e) => salvar({ waterStartHour: Number(e.target.value) })}
                  sx={{ width: 80 }}
                  slotProps={{ htmlInput: { min: 0, max: 23 } }}
                />
                <Typography variant="body2" color="text.secondary">até</Typography>
                <TextField
                  label="Fim"
                  type="number"
                  size="small"
                  value={settings.waterEndHour}
                  onChange={(e) => salvar({ waterEndHour: Number(e.target.value) })}
                  sx={{ width: 80 }}
                  slotProps={{ htmlInput: { min: 0, max: 23 } }}
                />
                <Typography variant="caption" color="text.secondary">h</Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Social Push */}
      <SectionLabel icon={<Flame size={14} />} text="Notificações Sociais" />
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <SettingRow
            title="Curtidas"
            subtitle="Quando alguém curtir seu post"
            checked={settings.pushLikes}
            onChange={(v) => salvar({ pushLikes: v })}
            icon={<Heart size={16} />}
          />
          <SettingRow
            title="Comentários"
            subtitle="Quando alguém comentar no seu post"
            checked={settings.pushComments}
            onChange={(v) => salvar({ pushComments: v })}
            icon={<MessageCircle size={16} />}
          />
          <SettingRow
            title="Seguidores"
            subtitle="Solicitações e novos seguidores"
            checked={settings.pushFollows}
            onChange={(v) => salvar({ pushFollows: v })}
            icon={<UserPlus size={16} />}
          />
        </CardContent>
      </Card>
    </Box>
  );
}

function SectionLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem' }}
    >
      {icon} {text}
    </Typography>
  );
}

function SettingRow({ title, subtitle, checked, onChange, icon }: {
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Box sx={{ flex: 1, mr: 2, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        {icon && (
          <Box sx={(theme) => ({ color: alpha(theme.palette.primary.main, 0.7), mt: 0.3 })}>
            {icon}
          </Box>
        )}
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>{title}</Typography>
          <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
        </Box>
      </Box>
      <Switch checked={checked} onChange={(e) => onChange(e.target.checked)} color="primary" />
    </Box>
  );
}
