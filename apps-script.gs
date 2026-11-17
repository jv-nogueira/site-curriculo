/**
 * Google Apps Script - Disparo de E-mails de Candidatura e Log Simplificado
 * 
 * Configuração:
 * 1. Cole este código no editor do Apps Script da planilha (Extensões > Apps Script).
 * 2. Clique em "Implantar" > "Gerenciar implantações" > Editar (ícone lápis) > Nova versão > Implantar.
 * 3. Garanta que o acesso esteja como: "Qualquer pessoa" (Anyone).
 */

const DEFAULT_CURRICULUM_DOC_ID = '1CqGEGpI1n90RLde0IZXpX2cJ4GzAKh7IAPw2ZJyc4aI';
const DEFAULT_CURRICULUM_PDF_NAME = 'JoaoVitorNogueira.pdf';
const GOOGLE_CLIENT_ID = '973715238698-dr99ku9cfh5r1lt7tq9jvi2fem1ea5r7.apps.googleusercontent.com';

function autorizarGmail() {
  GmailApp.getDrafts();
  SpreadsheetApp.getActiveSpreadsheet();
  UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=authorization-check',
    { muteHttpExceptions: true }
  );
  DriveApp.getFileById(DEFAULT_CURRICULUM_DOC_ID).getName();
  DocumentApp.openById(DEFAULT_CURRICULUM_DOC_ID).getBody().getText();
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
  const expectedHeaders = ['Nome', 'E-mail', 'Data', 'Ator'];
  const currentValues = sheet.getDataRange().getValues();
  const firstRow = currentValues[0] || [];

  if (!firstRow.length || firstRow.every(cell => String(cell || '').trim() === '')) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    return expectedHeaders;
  }

  if (!String(sheet.getRange(1, 4).getValue() || '').trim()) {
    sheet.getRange(1, 4).setValue('Ator');
  }

  return firstRow;
}

function verifyGoogleIdToken(idToken) {
  const authError = (message) => {
    const error = new Error(message);
    error.authRequired = true;
    throw error;
  };

  if (!idToken || GOOGLE_CLIENT_ID === 'COLE_SEU_CLIENT_ID_AQUI') {
    authError('Faça login com uma conta Google para continuar.');
  }

  const response = UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
    { muteHttpExceptions: true }
  );
  const status = response.getResponseCode();
  if (status !== 200) {
    authError('O login expirou ou é inválido. Entre novamente com o Google.');
  }

  const identity = JSON.parse(response.getContentText());
  const expiresAt = Number(identity.exp);
  const issuerIsGoogle = !identity.iss ||
    identity.iss === 'accounts.google.com' ||
    identity.iss === 'https://accounts.google.com';
  const emailIsVerified = identity.email_verified === true ||
    String(identity.email_verified).toLowerCase() === 'true';

  if (
    identity.aud !== GOOGLE_CLIENT_ID ||
    !issuerIsGoogle ||
    !emailIsVerified ||
    !identity.email ||
    !expiresAt ||
    expiresAt * 1000 <= Date.now()
  ) {
    authError('O login do Google não pôde ser validado. Entre novamente.');
  }

  return String(identity.email).trim().toLowerCase();
}

function emailExistsInLog(email) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName('Log');
  if (!sheet || sheet.getLastRow() < 2) {
    return false;
  }

  const targetEmails = cleanEmailList(email)
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
  if (!targetEmails.length) {
    return false;
  }

  const loggedEmails = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getDisplayValues();
  return loggedEmails.some(row => {
    const addresses = cleanEmailList(row[0])
      .split(',')
      .map(value => value.trim().toLowerCase());
    return addresses.some(address => targetEmails.includes(address));
  });
}

function cleanEmailList(emailString) {
  if (!emailString) return '';
  return String(emailString)
    .split(/[,;]/)
    .map(e => e.trim())
    .filter(e => e.length > 0)
    .join(',');
}

function getDefaultCurriculumFile() {
  const file = DriveApp.getFileById(DEFAULT_CURRICULUM_DOC_ID);
  if (file.getMimeType() !== MimeType.GOOGLE_DOCS) {
    throw new Error('O arquivo de currículo configurado não é um documento Google Docs.');
  }
  return file;
}

function assertMobileEditorCompatible(body) {
  for (let i = 0; i < body.getNumChildren(); i++) {
    const block = body.getChild(i);
    const blockType = block.getType();
    if (blockType !== DocumentApp.ElementType.PARAGRAPH &&
        blockType !== DocumentApp.ElementType.LIST_ITEM) {
      throw new Error('O editor móvel suporta parágrafos e listas, mas não tabelas ou imagens.');
    }

    for (let j = 0; j < block.getNumChildren(); j++) {
      if (block.getChild(j).getType() !== DocumentApp.ElementType.TEXT) {
        throw new Error('O editor móvel suporta texto e formatação básica, mas não imagens ou objetos incorporados.');
      }
    }
  }
}

function getMobileEditorStyles(text) {
  const styles = { bold: [], italic: [], underline: [] };
  const textLength = text.getText().length;
  const indices = text.getTextAttributeIndices();
  const methods = {
    bold: 'isBold',
    italic: 'isItalic',
    underline: 'isUnderline'
  };

  for (let i = 0; i < indices.length; i++) {
    const start = indices[i];
    const end = i + 1 < indices.length ? indices[i + 1] : textLength;
    if (start >= end) continue;

    Object.keys(methods).forEach((style) => {
      if (text[methods[style]](start) === true) {
        styles[style].push([start, end]);
      }
    });
  }

  return styles;
}

function getMobileEditorContent() {
  const document = DocumentApp.openById(DEFAULT_CURRICULUM_DOC_ID);
  const body = document.getBody();
  assertMobileEditorCompatible(body);
  const text = body.editAsText();
  return {
    text: text.getText(),
    styles: getMobileEditorStyles(text)
  };
}

function applyMobileEditorStyles(text, styles) {
  const textLength = text.getText().length;
  const methods = {
    bold: 'setBold',
    italic: 'setItalic',
    underline: 'setUnderline'
  };

  Object.keys(methods).forEach((style) => {
    const ranges = styles[style] || [];
    if (!Array.isArray(ranges)) {
      throw new Error('Formato de texto inválido.');
    }

    if (textLength > 0) {
      text[methods[style]](0, textLength - 1, false);
    }

    ranges.forEach((range) => {
      if (!Array.isArray(range) || range.length !== 2 ||
          !Number.isInteger(range[0]) || !Number.isInteger(range[1]) ||
          range[0] < 0 || range[1] <= range[0] || range[1] > textLength) {
        throw new Error('Intervalo de formatação inválido.');
      }
      text[methods[style]](range[0], range[1] - 1, true);
    });
  });
}

function saveMobileEditorContent(payload) {
  const updatedText = payload.text;
  const originalText = payload.originalText;
  if (typeof updatedText !== 'string' || typeof originalText !== 'string') {
    throw new Error('O conteúdo do currículo está inválido.');
  }
  if (!updatedText.trim()) {
    throw new Error('O currículo não pode ficar vazio.');
  }
  if (updatedText.length > 50000) {
    throw new Error('O texto do currículo excede o limite permitido.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const document = DocumentApp.openById(DEFAULT_CURRICULUM_DOC_ID);
    const body = document.getBody();
    assertMobileEditorCompatible(body);
    let text = body.editAsText();
    const currentText = text.getText();
    if (currentText !== originalText) {
      const conflict = new Error('O documento foi alterado em outra sessão. Reabra a edição móvel antes de salvar.');
      conflict.conflict = true;
      throw conflict;
    }

    let prefix = 0;
    const prefixLimit = Math.min(currentText.length, updatedText.length);
    while (prefix < prefixLimit && currentText.charAt(prefix) === updatedText.charAt(prefix)) {
      prefix++;
    }

    let suffix = 0;
    while (suffix < currentText.length - prefix &&
           suffix < updatedText.length - prefix &&
           currentText.charAt(currentText.length - suffix - 1) ===
             updatedText.charAt(updatedText.length - suffix - 1)) {
      suffix++;
    }

    const oldEnd = currentText.length - suffix;
    const newEnd = updatedText.length - suffix;
    if (oldEnd > prefix) {
      text.deleteText(prefix, oldEnd - 1);
    }
    if (newEnd > prefix) {
      text.insertText(prefix, updatedText.substring(prefix, newEnd));
    }

    text = body.editAsText();
    applyMobileEditorStyles(text, payload.styles || {});
    const savedContent = {
      text: text.getText(),
      styles: getMobileEditorStyles(text)
    };
    document.saveAndClose();

    return savedContent;
  } finally {
    lock.releaseLock();
  }
}

function testarEnvioComAnexo() {
  const file = getDefaultCurriculumFile();
  Logger.log('1. Arquivo encontrado: ' + file.getName());
  Logger.log('2. ID do arquivo: ' + file.getId());
  
  const blob = file.getAs(MimeType.PDF);
  blob.setName(DEFAULT_CURRICULUM_PDF_NAME);
  
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
      const fileName = payload.fileName || DEFAULT_CURRICULUM_PDF_NAME;
      const mimeType = payload.fileMimeType || 'application/pdf';
      const attachment = Utilities.newBlob(decoded, mimeType, fileName);
      options.attachments = [attachment];
    } catch (err) {
      Logger.log('Erro ao anexar arquivo personalizado: ' + err);
    }
  } else {
    // 2. Caso contrário, exporta o documento Google Docs padrão como PDF
    try {
      const driveFile = getDefaultCurriculumFile();
      
      const blob = driveFile.getAs(MimeType.PDF);
      blob.setName(DEFAULT_CURRICULUM_PDF_NAME);
      
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

  // Redireciona para o documento padrão no Google Drive
  if (params.action === 'preview') {
    try {
      const file = getDefaultCurriculumFile();
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

    const actorEmail = verifyGoogleIdToken(payload.idToken);
    if (payload.action === 'getCurriculumEditorContent') {
      const content = getMobileEditorContent();
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, text: content.text, styles: content.styles }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (payload.action === 'saveCurriculumEditorContent') {
      const content = saveMobileEditorContent(payload);
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, text: content.text, styles: content.styles }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (payload.action === 'checkEmail') {
      const email = cleanEmailList(payload.email || '');
      if (!email) {
        throw new Error('Informe um e-mail para verificar.');
      }

      return ContentService
        .createTextOutput(JSON.stringify({
          ok: true,
          exists: emailExistsInLog(email)
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const email = cleanEmailList(payload.recipientEmail || payload['E-mail do Destinatário'] || '');
      if (emailExistsInLog(email)) {
        return ContentService
          .createTextOutput(JSON.stringify({
            ok: false,
            duplicate: true,
            error: 'Este e-mail já consta na aba Log. Informe outro destinatário.'
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // Dispara o e-mail somente se o destinatário ainda não estiver no Log.
      sendApplicationEmail(payload);

      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = spreadsheet.getSheetByName('Log') || spreadsheet.insertSheet('Log');
      ensureSheetHeaders(sheet);

      const dataFormatada = formatDateOnly(new Date());
      const nome = payload.recruiterName || payload['Nome do Recrutador'] || '';
      sheet.insertRowBefore(2);
      sheet.getRange(2, 1, 1, 4).setValues([[nome, email, dataFormatada, actorEmail]]);
    } finally {
      lock.releaseLock();
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true, 
        message: 'E-mail enviado e registrado na aba Log com sucesso!' 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: false, 
        authRequired: error.authRequired === true,
        conflict: error.conflict === true,
        error: error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
