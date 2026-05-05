import { useState } from 'react';
import { Box, Card, CardContent, Typography, alpha } from '@mui/material';
import { Info } from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { InlineTooltip, LazyChart } from './DashboardChartHelpers';
import { CORES, tooltipProps, tooltipStyle } from './dashboardUtils';

export default function ExerciseCard({
  ex,
  idx,
  isDark,
  inline,
}: {
  ex: any;
  idx: number;
  isDark: boolean;
  inline?: boolean;
}) {
  const [metrica, setMetrica] = useState<'peso' | 'volume' | '1rm'>('peso');

  const dados = ex.dados;
  const total = dados.length;
  const ultimo = dados[total - 1];
  const penultimo = total >= 2 ? dados[total - 2] : null;

  const bestPeso = Math.max(...dados.map((d: any) => d.pesoMax));
  const bestVolume = Math.max(...dados.map((d: any) => d.volume));
  const best1RM = Math.max(...dados.map((d: any) => d.umRM));
  const bestPesoDate = dados.find((d: any) => d.pesoMax === bestPeso)?.label || '';
  const best1RMDate = dados.find((d: any) => d.umRM === best1RM)?.label || '';

  const chartKey = metrica === 'peso' ? 'pesoMax' : metrica === 'volume' ? 'volume' : 'umRM';
  const chartUnit = 'kg';
  const chartColor = metrica === 'peso' ? CORES.musculacao : metrica === 'volume' ? CORES.corrida : CORES.recorde;

  const dadosComTreino = dados.map((d: any, i: number) => ({
    ...d,
    treino: `T${i + 1}`,
    treinoFull: `Treino ${i + 1}`,
  }));

  const last3 = dados.slice(-3);
  const prev3 = dados.slice(-6, -3);
  const avgPesoLast = last3.reduce((s: number, d: any) => s + d.pesoMax, 0) / last3.length;
  const avgVolLast = last3.reduce((s: number, d: any) => s + d.volume, 0) / last3.length;
  let dica = '';
  if (prev3.length >= 3) {
    const avgPesoPrev = prev3.reduce((s: number, d: any) => s + d.pesoMax, 0) / prev3.length;
    const avgVolPrev = prev3.reduce((s: number, d: any) => s + d.volume, 0) / prev3.length;
    const pesoDiff = ((avgPesoLast - avgPesoPrev) / avgPesoPrev) * 100;
    const volDiff = ((avgVolLast - avgVolPrev) / avgVolPrev) * 100;

    if (pesoDiff < -5 && volDiff < -5) {
      dica = 'Carga e volume em queda. Considere um deload ou rever a periodização.';
    } else if (pesoDiff < 2 && pesoDiff > -2) {
      dica = 'Carga estagnada. Tente aumentar 2.5kg ou adicionar 1 série extra.';
    } else if (volDiff < 0 && pesoDiff > 0) {
      dica = 'Carga subindo mas volume caiu. Ótimo para força, mas mantenha as séries.';
    } else if (pesoDiff > 5) {
      dica = 'Excelente progresso de carga! Continue assim.';
    }
  } else if (total >= 2 && ultimo.pesoMax === penultimo?.pesoMax) {
    dica = 'Mesma carga nos últimos 2 treinos. Tente subir 2.5kg na próxima sessão.';
  }

  const metricaButtons = [
    { key: 'peso' as const, label: 'Peso', cor: CORES.musculacao },
    { key: 'volume' as const, label: 'Volume', cor: CORES.corrida },
    { key: '1rm' as const, label: '1RM', cor: CORES.recorde },
  ];

  const content = (
    <>
      <Box sx={{ display: 'flex', gap: 0.8, mb: 1.5 }}>
        {[
          { label: 'Peso Máx', value: `${bestPeso}kg`, sub: bestPesoDate, cor: CORES.musculacao },
          { label: '1RM Est.', value: `${best1RM}kg`, sub: best1RMDate, cor: CORES.recorde },
          { label: 'Vol. Máx', value: `${bestVolume.toLocaleString('pt-BR')}kg`, sub: `${total} treinos`, cor: CORES.corrida },
        ].map((r) => (
          <Box key={r.label} sx={{
            flex: 1,
            textAlign: 'center',
            py: 0.8,
            px: 0.5,
            borderRadius: '6px',
            bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
          }}>
            <Typography sx={{ fontSize: '0.55rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.2 }}>
              {r.label}
            </Typography>
            <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: r.cor, lineHeight: 1.1 }}>
              {r.value}
            </Typography>
            <Typography sx={{ fontSize: '0.5rem', color: 'text.secondary', mt: 0.2 }}>
              {r.sub}
            </Typography>
          </Box>
        ))}
      </Box>

      {ultimo && (
        <Box sx={{
          mb: 1.5,
          px: 1,
          py: 0.8,
          borderRadius: '6px',
          bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
        }}>
          <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', mb: 0.3 }}>Último treino ({ultimo.label})</Typography>
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, mb: penultimo ? 0.5 : 0 }}>
            {ultimo.pesoMax}kg x {ultimo.repsMax} reps · {ultimo.series} séries · vol {ultimo.volume}kg
          </Typography>
          {penultimo && (() => {
            const diffs = [
              { label: 'Peso', atual: ultimo.pesoMax, anterior: penultimo.pesoMax, unit: 'kg' },
              { label: 'Reps', atual: ultimo.repsMax, anterior: penultimo.repsMax, unit: '' },
              { label: 'Séries', atual: ultimo.series, anterior: penultimo.series, unit: '' },
              { label: 'Volume', atual: ultimo.volume, anterior: penultimo.volume, unit: 'kg' },
            ];
            return (
              <Box sx={{ pt: 0.5, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
                <Typography sx={{ fontSize: '0.58rem', color: 'text.secondary', mb: 0.4 }}>
                  vs treino anterior ({penultimo.label})
                </Typography>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, mb: 0.4 }}>
                  {penultimo.pesoMax}kg x {penultimo.repsMax} reps · {penultimo.series} séries · vol {penultimo.volume}kg
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.6 }}>
                  {diffs.map((d) => {
                    const diff = d.atual - d.anterior;
                    const cor = diff > 0 ? '#16A34A' : diff < 0 ? '#EF4444' : 'text.secondary';
                    return (
                      <Box key={d.label} sx={{
                        flex: 1,
                        textAlign: 'center',
                        py: 0.4,
                        borderRadius: '4px',
                        bgcolor: diff !== 0 ? alpha(cor as string, 0.06) : 'transparent',
                      }}>
                        <Typography sx={{ fontSize: '0.5rem', color: 'text.secondary', textTransform: 'uppercase' }}>
                          {d.label}
                        </Typography>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: cor }}>
                          {diff === 0 ? '=' : `${diff > 0 ? '+' : ''}${diff}${d.unit}`}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            );
          })()}
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 0.5, mb: 1.2 }}>
        {metricaButtons.map((m) => (
          <Box
            key={m.key}
            onClick={() => setMetrica(m.key)}
            sx={{
              flex: 1,
              textAlign: 'center',
              py: 0.5,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.7rem',
              fontWeight: 600,
              transition: 'all 0.12s',
              bgcolor: metrica === m.key ? alpha(m.cor, 0.12) : 'transparent',
              color: metrica === m.key ? m.cor : 'text.secondary',
              border: `1px solid ${metrica === m.key ? alpha(m.cor, 0.3) : 'transparent'}`,
            }}
          >
            {m.label}
          </Box>
        ))}
      </Box>

      {total >= 2 ? (
        <LazyChart height={140}><ResponsiveContainer width="100%" height={140}>
          <ComposedChart data={dadosComTreino}>
            <defs>
              <linearGradient id={`gradEx_${idx}_${metrica}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColor} stopOpacity={0.25} />
                <stop offset="100%" stopColor={chartColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'} vertical={false} />
            <XAxis dataKey="treino" tick={{ fontSize: 8, fill: isDark ? '#555' : '#bbb' }} axisLine={false} tickLine={false} />
            <YAxis
              yAxisId="main"
              tick={{ fontSize: 8, fill: isDark ? '#444' : '#ccc' }}
              width={36}
              unit={chartUnit}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              {...tooltipProps}
              content={<InlineTooltip renderContent={(payload: any) => {
                if (!payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <Box sx={{ ...tooltipStyle, p: 1.5, minWidth: 150 }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.68rem', fontWeight: 600, mb: 0.5 }}>
                      {d.treinoFull} - {d.label}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                      <Typography sx={{ color: CORES.musculacao, fontSize: '0.78rem', fontWeight: 600 }}>
                        Peso: {d.pesoMax}kg x {d.repsMax} reps
                      </Typography>
                      <Typography sx={{ color: CORES.corrida, fontSize: '0.78rem', fontWeight: 600 }}>
                        Volume: {d.volume.toLocaleString('pt-BR')}kg
                      </Typography>
                      <Typography sx={{ color: CORES.recorde, fontSize: '0.78rem', fontWeight: 600 }}>
                        1RM est.: {d.umRM}kg
                      </Typography>
                    </Box>
                  </Box>
                );
              }} />}
            />
            <Area
              yAxisId="main"
              type="monotone"
              dataKey={chartKey}
              fill={`url(#gradEx_${idx}_${metrica})`}
              stroke={chartColor}
              strokeWidth={2.5}
              dot={{ r: 4, fill: chartColor, strokeWidth: 2, stroke: isDark ? '#111' : '#fff' }}
              activeDot={{ r: 6, fill: chartColor, stroke: '#fff', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer></LazyChart>
      ) : (
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', py: 1 }}>
          {dados.map((d: any, i: number) => (
            <Box key={i} sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{d.label}</Typography>
              <Typography variant="body2" fontWeight={600}>{d.pesoMax}kg x {d.repsMax} reps</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}>
                Vol: {d.volume}kg · 1RM: {d.umRM}kg
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {dica && (
        <Box sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 0.8,
          mt: 1.2,
          px: 1,
          py: 0.8,
          borderRadius: '6px',
          bgcolor: alpha('#FF6B2C', 0.06),
          border: `1px solid ${alpha('#FF6B2C', 0.12)}`,
        }}>
          <Info size={13} color="#FF6B2C" style={{ flexShrink: 0, marginTop: 1 }} />
          <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', lineHeight: 1.4 }}>
            {dica}
          </Typography>
        </Box>
      )}
    </>
  );

  if (inline) return content;

  return (
    <Card sx={{ mb: 2, overflow: 'hidden', borderRadius: '8px' }}>
      <CardContent sx={{ py: 1.5, px: 1.2 }}>
        {content}
      </CardContent>
    </Card>
  );
}
