function normalizeHeader(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function ensureSheetHeaders(sheet) {
  const expectedHeaders = [
    'Data',
    'Nome do Recrutador',
    'E-mail do Destinatário',
    'Cco cópia oculta',
    'Corpo do e-mail',
    'Título do e-mail'
  ];

  const currentValues = sheet.getDataRange().getValues();
  const firstRow = currentValues[0] || [];

  if (!firstRow.length || firstRow.every(cell => String(cell || '').trim() === '')) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    return expectedHeaders;
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
    'título do e-mail': payload['Título do e-mail'] || payload.subject || ''
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
    const payload = JSON.parse(e.postData.contents || '{}');
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
