# Guia: Como subir para o TestFlight (iOS) 🍎

Para levar seu app para o iPhone de outros usuários via TestFlight, você precisará seguir alguns pré-requisitos fundamentais, já que o app é construído com **Capacitor**.

> [!IMPORTANT]
> **Requisito Obrigatório:** Você precisará de um **Mac** (com Xcode instalado) e uma conta paga no **Apple Developer Program** ($99/ano) para publicar no TestFlight ou App Store.

---

## 1. Preparar o Código no seu Windows/PC
Antes de passar para o Mac, garanta que o app está pronto:

1. Gere o build de produção:
   ```bash
   npm run build
   ```
2. Adicione a plataforma iOS (se ainda não fez):
   ```bash
   npx cap add ios
   ```
3. Sincronize os arquivos:
   ```bash
   npx cap sync ios
   ```

---

## 2. No Computador Mac (Xcode)
Leve a pasta do projeto para um Mac e siga estes passos:

1. **Abrir o projeto:**
   ```bash
   npx cap open ios
   ```
   Isso vai abrir o Xcode automaticamente.

2. **Configurar Assinatura (Signing):**
   - No Xcode, clique no projeto (ícone azul no topo da barra esquerda).
   - Vá em **Signing & Capabilities**.
   - Selecione seu **Team** (sua conta de desenvolvedor Apple).
   - Defina um **Bundle Identifier** único (ex: `com.seuusuario.projetinhofuture`).

3. **Gerar o Arquivo (Archive):**
   - Mude o dispositivo alvo (no topo do Xcode) para **Any iOS Device (arm64)**.
   - Vá no menu superior: **Product > Archive**.
   - Quando terminar, uma janela (Organizer) abrirá. Clique em **Distribute App**.
   - Siga as instruções selecionando "App Store Connect" e "Upload".

---

## 3. No App Store Connect (Navegador)
1. Acesse o [App Store Connect](https://appstoreconnect.apple.com/).
2. Vá em **Meus Apps** e crie um novo app com o mesmo *Bundle ID* que definiu no Xcode.
3. Depois que o upload do Xcode terminar, a versão aparecerá em **TestFlight**.
4. **Grupos de Teste:**
   - Crie um grupo de "Testadores Externos".
   - Adicione os e-mails das pessoas que vão testar.
   - A Apple fará uma revisão rápida (geralmente algumas horas) e enviará o convite por e-mail para eles.

---

## Dica para usuários iOS (PWA - Sem TestFlight)
Se você não quiser pagar a taxa da Apple agora, pode usar como **PWA**:
1. Faça o deploy do seu site (Vercel/Netlify/Firebase Hosting).
2. No iPhone, abra o link no **Safari**.
3. Toque no botão de **Compartilhar** (quadrado com seta pra cima).
4. Selecione **"Adicionar à Tela de Início"**.
5. O app ficará com ícone na tela e abrirá sem a barra do navegador, parecendo um app nativo.
