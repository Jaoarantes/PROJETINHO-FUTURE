import os, re

files = [
    'src/pages/Perfil.tsx', 
    'src/pages/treino/SessaoTreino.tsx', 
    'src/pages/treino/TreinoTab.tsx', 
    'src/pages/Home.tsx', 
    'src/pages/auth/RedefinirSenha.tsx', 
    'src/pages/auth/Registro.tsx', 
    'src/pages/auth/Login.tsx', 
    'src/pages/auth/EsqueceuSenha.tsx', 
    'src/components/treino/ExercicioPicker.tsx', 
    'src/components/treino/CadastrarExercicio.tsx', 
    'src/components/treino/ExercicioDetalhe.tsx', 
    'src/components/layout/BottomNav.tsx'
]

icon_map = {
    'AddRounded': 'Plus', 
    'FitnessCenterRounded': 'Dumbbell', 
    'RestaurantRounded': 'Utensils', 
    'HistoryRounded': 'History', 
    'PersonRounded': 'User', 
    'MoreVertRounded': 'MoreVertical', 
    'DeleteRounded': 'Trash2', 
    'EditRounded': 'Pencil', 
    'CloseRounded': 'X', 
    'SearchRounded': 'Search', 
    'InfoOutlined': 'Info', 
    'LogoutRounded': 'LogOut', 
    'LightModeRounded': 'Sun', 
    'DarkModeRounded': 'Moon', 
    'SettingsBrightnessRounded': 'Settings2', 
    'LockResetRounded': 'KeyRound', 
    'ArrowBackRounded': 'ArrowLeft', 
    'PlayArrowRounded': 'Play', 
    'CheckRounded': 'Check', 
    'CheckCircleRounded': 'CheckCircle2', 
    'Visibility': 'Eye', 
    'VisibilityOff': 'EyeOff', 
    'EmailRounded': 'Mail', 
    'LockRounded': 'Lock', 
    'TimerRounded': 'Timer'
}

for file in files:
    if not os.path.exists(file):
        continue
    try:
        content = open(file, 'r', encoding='utf-8').read()
        match = re.search(r'import\s+\{([^}]+)\}\s+from\s+[\'"]@mui/icons-material[\'"];', content)
        if match:
            # Replace import
            icons_str = match.group(1).replace('\n', ' ')
            icons = [i.strip() for i in icons_str.split(',') if i.strip()]
            lucide_icons = []
            for i in icons:
                lucide_icons.append(icon_map.get(i, i))
            
            new_import = f"import {{ {', '.join(set(lucide_icons))} }} from 'lucide-react';"
            content = content.replace(match.group(0), new_import)
            
            # Replace all JSX tags
            for old, new in icon_map.items():
                content = re.sub(rf'<{old}\b', f'<{new}', content)
            
            # Add size to icon components if we need to? Or leave default.
            
            open(file, 'w', encoding='utf-8').write(content)
            print(f'Updated {file}')
    except Exception as e:
        print(f'Error {file}: {e}')
