function normalizeHeader(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function readMultipartValues(e) {
  const source = {};

  Object.keys(e.parameter || {}).forEach((key) => {
    const values = e.parameter[key];
    source[key] = Array.isArray(values) ? values[0] : values;
  });

  return source;
}

function ensureSheetHeaders(sheet) {
  const expectedHeaders = [
    'Data',
    'Nome do Recrutador',
    'E-mail do Destinatário',
    'Cco cópia oculta',
    'Corpo do e-mail',
    'Título do e-mail',
    'Currículo'
  ];

  const currentValues = sheet.getDataRange().getValues();
  const firstRow = currentValues[0] || [];

  if (!firstRow.length || firstRow.every(cell => String(cell || '').trim() === '')) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    return expectedHeaders;
  }

  if (firstRow.length < expectedHeaders.length) {
    const updatedHeaders = firstRow.slice();
    expectedHeaders.forEach((header, index) => {
      if (index >= updatedHeaders.length) {
        updatedHeaders.push(header);
      }
    });
    sheet.getRange(1, 1, 1, updatedHeaders.length).setValues([updatedHeaders]);
    return updatedHeaders;
  }

  return firstRow;
}

function toRowByHeader(sheet, payload) {
  const headers = ensureSheetHeaders(sheet);
  const normalizedIndex = {};

  headers.forEach((header, index) => {
    normalizedIndex[normalizeHeader(header)] = index;
  });

  const row = Array(headers.length).fill('');
  const fieldMap = {
    'data': payload['Data'] || payload.data || new Date(),
    'nome do recrutador': payload['Nome do Recrutador'] || payload.recruiterName || '',
    'e-mail do destinatário': payload['E-mail do Destinatário'] || payload.recipientEmail || '',
    'cco cópia oculta': payload['Cco cópia oculta'] || payload.bcc || '',
    'corpo do e-mail': payload['Corpo do e-mail'] || payload.message || '',
    'título do e-mail': payload['Título do e-mail'] || payload.subject || '',
    'currículo': payload['Currículo'] || payload.curriculum || ''
  };

  Object.entries(fieldMap).forEach(([key, value]) => {
    const index = normalizedIndex[key];
    if (index !== undefined) {
      row[index] = value;
    }
  });

  return row;
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, message: 'API pronta para receber dados.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const event = e || {};
    let payload = {};

    if (event.parameter && Object.keys(event.parameter).length) {
      payload = readMultipartValues(event);
    } else if (event.postData && event.postData.contents) {
      payload = JSON.parse(event.postData.contents || '{}');
    }

    if (event.files && event.files.length) {
      payload['Currículo'] = event.files[0].getName();
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName('ListaAuto') || spreadsheet.insertSheet('ListaAuto');

    const row = toRowByHeader(sheet, payload);
    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, message: 'Dados salvos com sucesso na aba ListaAuto.' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
