/**
 * Google Apps Script - Disparo de E-mails de Candidatura e Log Simplificado
 * 
 * Configuração:
 * 1. Cole este código no editor do Apps Script da planilha (Extensões > Apps Script).
 * 2. Clique em "Implantar" > "Gerenciar implantações" > Editar (ícone lápis) > Nova versão > Implantar.
 * 3. Garanta que o acesso esteja como: "Qualquer pessoa" (Anyone).
 */

const DRIVE_FOLDER_ID = '1OihWDBRijrK0tl9N9rTlKiTqUJq2eZg1';
const TARGET_FILE_NAME = 'JoaoVitorNogueira.pdf';

function autorizarGmail() {
  GmailApp.getDrafts();
  SpreadsheetApp.getActiveSpreadsheet();
  try {
    DriveApp.getFolderById(DRIVE_FOLDER_ID);
  } catch (e) {
    Logger.log('DriveApp autorizado: ' + e);
  }
  Logger.log('Permissões concedidas com sucesso!');
}

function formatDateOnly(date) {
  const d = date instanceof Date ? date : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

function ensureSheetHeaders(sheet) {
  const expectedHeaders = ['Data', 'Nome', 'E-mail'];
  const currentValues = sheet.getDataRange().getValues();
  const firstRow = currentValues[0] || [];

  if (!firstRow.length || firstRow.every(cell => String(cell || '').trim() === '')) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    return expectedHeaders;
  }

  return firstRow;
}

function cleanEmailList(emailString) {
  if (!emailString) return '';
  return String(emailString)
    .split(/[,;]/)
    .map(e => e.trim())
    .filter(e => e.length > 0)
    .join(',');
}

/**
 * Busca o arquivo de currículo na pasta do Google Drive:
 * 1º Tenta pelo nome exato (TARGET_FILE_NAME).
 * 2º Se não achar, pega o PDF mais recente da pasta.
 */
function getCurriculumFromFolder() {
  try {
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    
    // 1. Tenta buscar pelo nome específico
    const namedFiles = folder.getFilesByName(TARGET_FILE_NAME);
    if (namedFiles.hasNext()) {
      return namedFiles.next();
    }

    // 2. Se não encontrar pelo nome exato, pega o PDF mais recente da pasta
    const pdfFiles = folder.getFilesByType(MimeType.PDF);
    let latestFile = null;
    let latestTime = 0;
    
    while (pdfFiles.hasNext()) {
      const file = pdfFiles.next();
      if (file.getLastUpdated().getTime() > latestTime) {
        latestTime = file.getLastUpdated().getTime();
        latestFile = file;
      }
    }

    if (latestFile) {
      return latestFile;
    }

    // 3. Se não houver PDF, tenta qualquer arquivo da pasta
    const allFiles = folder.getFiles();
    if (allFiles.hasNext()) {
      return allFiles.next();
    }

    throw new Error('Nenhum arquivo de currículo encontrado na pasta do Google Drive.');
  } catch (error) {
    throw new Error('Erro ao acessar pasta do Google Drive: ' + error.toString());
  }
}

function testarEnvioComAnexo() {
  const file = getCurriculumFromFolder();
  Logger.log('1. Arquivo encontrado: ' + file.getName());
  Logger.log('2. ID do arquivo: ' + file.getId());
  
  const blob = file.getAs(MimeType.PDF);
  blob.setName(file.getName());
  
  const meuEmail = Session.getActiveUser().getEmail();
  Logger.log('3. Enviando e-mail de teste para: ' + meuEmail);
  
  GmailApp.sendEmail(meuEmail, 'Teste de Anexo - ' + file.getName(), 'Olá! Este é um teste com o anexo puxado da pasta do Drive.', {
    name: 'João Vitor Nogueira',
    attachments: [blob]
  });
  
  Logger.log('4. E-mail de teste disparado com sucesso! Verifique sua caixa de entrada.');
}

function sendApplicationEmail(payload) {
  const rawRecipient = payload.recipientEmail || payload['E-mail do Destinatário'] || '';
  const recipient = cleanEmailList(rawRecipient);
  const subject = String(payload.subject || payload['Título do e-mail'] || '').trim();
  const body = String(payload.message || payload['Corpo do e-mail'] || '').trim();
  const rawBcc = payload.bcc || payload['Cco cópia oculta'] || '';
  const bcc = cleanEmailList(rawBcc);

  if (!recipient) {
    throw new Error('E-mail do destinatário inválido ou não informado.');
  }

  if (!subject) {
    throw new Error('Título do e-mail não informado.');
  }

  if (!body) {
    throw new Error('Corpo do e-mail não informado.');
  }

  const options = {
    name: 'João Vitor Nogueira'
  };
  
  if (bcc) {
    options.bcc = bcc;
  }

  // 1. Se veio arquivo PDF personalizado do formulário, anexa ele
  if (payload.fileData) {
    try {
      const decoded = Utilities.base64Decode(payload.fileData);
      const fileName = payload.fileName || 'JoaoVitor.pdf';
      const mimeType = payload.fileMimeType || 'application/pdf';
      const attachment = Utilities.newBlob(decoded, mimeType, fileName);
      options.attachments = [attachment];
    } catch (err) {
      Logger.log('Erro ao anexar arquivo personalizado: ' + err);
    }
  } else {
    // 2. Caso contrário, puxa o currículo dinamicamente da pasta do Google Drive
    try {
      const driveFile = getCurriculumFromFolder();
      
      // Apagamos o getBlob() anterior e deixamos apenas a conversão direta para PDF
      const blob = driveFile.getAs(MimeType.PDF); 
      blob.setName(driveFile.getName());
      
      options.attachments = [blob];
    } catch (err) {
      Logger.log('Erro ao obter currículo do Google Drive: ' + err);
      throw new Error('Erro ao buscar currículo na pasta do Google Drive: ' + err.toString());
    }
  }
  // Envia o e-mail pela sua conta do Gmail
  GmailApp.sendEmail(recipient, subject, body, options);
}

function doGet(e) {
  const event = e || {};
  const params = event.parameter || {};

  // Redireciona para o arquivo de currículo da pasta para visualização
  if (params.action === 'preview') {
    try {
      const file = getCurriculumFromFolder();
      const viewUrl = file.getUrl();
      return HtmlService.createHtmlOutput(
        `<script>window.location.href = "${viewUrl}";</script>` +
        `<p>Redirecionando para o currículo: <a href="${viewUrl}">Clique aqui se não abrir</a>...</p>`
      );
    } catch (err) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ 
      ok: true, 
      message: 'API do Sistema de Candidatura ativa e pronta para envio.' 
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const event = e || {};
    let payload = {};

    if (event.postData && event.postData.contents) {
      try {
        payload = JSON.parse(event.postData.contents);
      } catch (parseError) {
        payload = event.parameter || {};
      }
    } else if (event.parameter) {
      payload = event.parameter;
    }

    // 1. Disparar o e-mail através do Gmail
    sendApplicationEmail(payload);

    // 2. Registrar log simplificado na aba ListaAuto (Data, Nome, E-mail)
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName('ListaAuto') || spreadsheet.insertSheet('ListaAuto');

    ensureSheetHeaders(sheet);

    const dataFormatada = formatDateOnly(new Date());
    const nome = payload.recruiterName || payload['Nome do Recrutador'] || '';
    const email = cleanEmailList(payload.recipientEmail || payload['E-mail do Destinatário'] || '');

    sheet.appendRow([dataFormatada, nome, email]);

    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true, 
        message: 'E-mail enviado e registrado com sucesso!' 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: false, 
        error: error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
