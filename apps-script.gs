/**
 * Google Apps Script - Disparo de E-mails de Candidatura e Log Simplificado
 * 
 * Configuração:
 * 1. Cole este código no editor do Apps Script da planilha (Extensões > Apps Script).
 * 2. Clique em "Implantar" > "Gerenciar implantações" > Editar (ícone lápis) > Nova versão > Implantar.
 * 3. Garanta que o acesso esteja como: "Qualquer pessoa" (Anyone).
 */

function autorizarGmail() {
  GmailApp.getDrafts();
  SpreadsheetApp.getActiveSpreadsheet();
  Logger.log('Permissão concedida com sucesso!');
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

  // Se veio arquivo PDF codificado em Base64, anexa ao e-mail
  if (payload.fileData) {
    try {
      const decoded = Utilities.base64Decode(payload.fileData);
      const fileName = payload.fileName || 'JoaoVitor.pdf';
      const mimeType = payload.fileMimeType || 'application/pdf';
      const attachment = Utilities.newBlob(decoded, mimeType, fileName);
      options.attachments = [attachment];
    } catch (err) {
      Logger.log('Erro ao anexar arquivo: ' + err);
    }
  }

  // Envia o e-mail pela sua conta do Gmail
  GmailApp.sendEmail(recipient, subject, body, options);
}

function doGet() {
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
    const email = payload.recipientEmail || payload['E-mail do Destinatário'] || '';

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
