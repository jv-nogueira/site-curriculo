# Site de Envio de Currículo e Disparo Automatizado de Candidaturas

Este projeto disponibiliza uma interface web para preencher, personalizar e disparar e-mails de candidatura com currículo anexado diretamente através da sua conta do Gmail via **Google Apps Script**, além de registrar o histórico de envio na planilha conectada.

## 🚀 Funcionalidades

- **Disparo Direto pelo Gmail:** O Google Apps Script (`GmailApp.sendEmail`) envia o e-mail real com o PDF anexado e suporte a Cco.
- **Log no Google Sheets:** Registra na aba `Log` nas colunas `Nome`, `E-mail`, `Data` e `Ator`, inserindo cada novo envio na linha 2.
- **Prevenção de duplicados:** Consulta a coluna `B` da aba `Log` enquanto o e-mail é digitado e bloqueia o envio se ele já estiver registrado.
- **Identificação do remetente:** Exige login com uma conta Google antes do envio e registra o e-mail verificado na coluna `D` (`Ator`) da aba `Log`.
- **Currículo Padrão e Personalizado:** Carrega automaticamente o arquivo padrão `JoaoVitor.pdf` com pré-visualização na página e permite anexar outros PDFs.
- **Tags Dinâmicas:** Substitui automaticamente `[saudacao]` (bom dia/boa tarde/boa noite), `[primeiroNome]` e `[nomeCompleto]`.
- **Armazenamento de Rascunho:** Salva alterações no `localStorage` do navegador para evitar perda de dados.

## 📁 Estrutura

- `index.html`: interface do formulário de candidatura
- `privacidade.html`: Política de Privacidade pública usada na configuração OAuth
- `styles.css`: estilos visuais responsivos
- `script.js`: lógica do formulário, conversão do PDF para Base64 e integração com o backend
- `apps-script.gs`: código do backend para o Google Apps Script (GmailApp + Sheets)
- `JoaoVitor.pdf`: currículo padrão utilizado

## ⚙️ Como Configurar o Backend no Google Apps Script

1. No Google Cloud Console, crie um ID do cliente OAuth do tipo **Aplicativo da Web**.
2. Configure a tela de consentimento para **Externo** e publique o app para que qualquer conta Google possa entrar. Em modo de teste, somente os usuários de teste poderão autenticar.
3. Em **Origens JavaScript autorizadas**, adicione a origem do GitHub Pages, por exemplo `https://jv-nogueira.github.io` (sem o caminho `/site-curriculo/`).
4. Publique o site no GitHub Pages e informe como página inicial `https://jv-nogueira.github.io/site-curriculo/` e como Política de Privacidade `https://jv-nogueira.github.io/site-curriculo/privacidade.html`.
5. Copie o Client ID e substitua `COLE_SEU_CLIENT_ID_AQUI` pelo mesmo valor em [`script.js`](script.js) e no código Apps Script.
6. Abra a sua planilha do Google Sheets e vá em **Extensões > Apps Script**.
7. Copie o conteúdo do arquivo [`apps-script.gs`](apps-script.gs) e cole no editor do Apps Script (substituindo o conteúdo existente).
8. Salve o projeto (`Ctrl + S`) e execute `autorizarGmail` no editor para conceder as permissões solicitadas.
9. Clique em **Implantar > Gerenciar implantações** (ou **Nova implantação**):
   - Tipo: **App da Web** (Web App)
   - Executar como: **Eu (seu e-mail)**
   - Quem tem acesso: **Qualquer pessoa** (Anyone)
10. Clique em **Implantar** e copie a **URL do App da Web** (`https://script.google.com/macros/s/.../exec`).
11. Cole a URL na constante `GOOGLE_SCRIPT_URL` dentro do arquivo [`script.js`](script.js).
12. Após atualizar o código do Apps Script, edite a implantação do App da Web, selecione **Nova versão** e implante novamente para publicar as alterações.

## 🌐 Publicação no GitHub Pages

1. Suba as alterações para o repositório no GitHub (`git push`).
2. No GitHub, vá em **Settings > Pages**.
3. Selecione a branch principal (`main` ou `master`) e a pasta raiz (`/root`).
4. Salve e acesse a URL gerada pelo GitHub Pages.
