-- Permitir que qualquer usuário autenticado leia o histórico de treinos de outros usuários
-- Necessário para exibir o nível/XP correto no perfil público
create policy "Anyone can read historico" on public.historico for select using (true);
