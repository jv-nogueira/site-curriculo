# Site de Envio de Currículo e Disparo Automatizado de Candidaturas

Este projeto disponibiliza uma interface web para preencher, personalizar e disparar e-mails de candidatura com currículo anexado diretamente através da sua conta do Gmail via **Google Apps Script**, além de registrar o histórico de envio na planilha conectada.

## 🚀 Funcionalidades

- **Disparo Direto pelo Gmail:** O Google Apps Script (`GmailApp.sendEmail`) envia o e-mail real com o PDF anexado e suporte a Cco.
- **Log Simplificado no Google Sheets:** Registra na aba `ListaAuto` apenas as colunas essenciais: `Data` (DD/MM/AAAA), `Nome` e `E-mail`.
- **Currículo Padrão e Personalizado:** Carrega automaticamente o arquivo padrão `JoaoVitor.pdf` com visualizador em nova aba e permite anexar outros PDFs.
- **Tags Dinâmicas:** Substitui automaticamente `[saudacao]` (bom dia/boa tarde/boa noite), `[primeiroNome]` e `[nomeCompleto]`.
- **Armazenamento de Rascunho:** Salva alterações no `localStorage` do navegador para evitar perda de dados.

## 📁 Estrutura

- `index.html`: interface do formulário de candidatura
- `styles.css`: estilos visuais responsivos
- `script.js`: lógica do formulário, conversão do PDF para Base64 e integração com o backend
- `apps-script.gs`: código do backend para o Google Apps Script (GmailApp + Sheets)
- `JoaoVitor.pdf`: currículo padrão utilizado

## ⚙️ Como Configurar o Backend no Google Apps Script

1. Abra a sua planilha do Google Sheets.
2. Vá no menu superior em **Extensões > Apps Script**.
3. Copie o conteúdo do arquivo [`apps-script.gs`](apps-script.gs) e cole no editor do Apps Script (substituindo o conteúdo existente).
4. Salve o projeto (`Ctrl + S`).
5. Clique em **Implantar > Gerenciar implantações** (ou **Nova implantação**):
   - Tipo: **App da Web** (Web App)
   - Executar como: **Eu (seu e-mail)**
   - Quem tem acesso: **Qualquer pessoa** (Anyone)
6. Clique em **Implantar**, autorize as permissões da sua conta do Google e copie a **URL do App da Web** (`https://script.google.com/macros/s/.../exec`).
7. Cole a URL na constante `GOOGLE_SCRIPT_URL` dentro do arquivo [`script.js`](script.js).

## 🌐 Publicação no GitHub Pages

1. Suba as alterações para o repositório no GitHub (`git push`).
2. No GitHub, vá em **Settings > Pages**.
3. Selecione a branch principal (`main` ou `master`) e a pasta raiz (`/root`).
4. Salve e acesse a URL gerada pelo GitHub Pages.
