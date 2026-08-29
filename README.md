# Site de envio de currículo

Este projeto cria uma página simples para preencher os dados do e-mail e enviar para a aba `ListaAuto` da planilha conectada ao Google Apps Script.

## Estrutura

- `index.html`: tela do formulário
- `styles.css`: visual da interface
- `script.js`: carregamento dos valores padrão e envio do formulário
- `apps-script.gs`: exemplo do backend para o Apps Script

## Como usar

1. Abra o arquivo `index.html` no navegador para testar localmente.
2. Ajuste a URL do Apps Script no arquivo `script.js` com a URL do seu deployment.
3. Faça o deploy do projeto em GitHub Pages.
4. Garanta que o Apps Script tenha a função `doPost` para receber os dados e gravar na aba `ListaAuto`.

## Exemplo de backend no Google Apps Script

Copie o conteúdo do arquivo `apps-script.gs` para o editor do Apps Script da planilha.

Depois, faça o deploy como `Web App` com acesso `Qualquer pessoa` ou `Qualquer usuário da conta` conforme necessário.

## Publicação no GitHub Pages

1. Crie um repositório no GitHub.
2. Faça upload dos arquivos `index.html`, `styles.css`, `script.js`.
3. No GitHub, vá em `Settings > Pages`.
4. Selecione a branch principal e a pasta raiz.
5. Salve e aguarde a publicação.

## Observação importante

Esse site é frontend estático. Ele envia os dados para o Apps Script, que grava na planilha. A autenticação por e-mail liberado pode ser adicionada depois, conforme planejado.
