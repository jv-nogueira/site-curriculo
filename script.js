const DEFAULT_SUBJECT = 'Candidatura - João Vitor Nogueira';
const DEFAULT_MESSAGE = `Olá [primeiroNome], [saudacao]

Tudo bem?

Meu nome é João Vitor Nogueira e trabalho focado em automação de TI.

Tenho experiência em criar crawlers, scrapers e automações (RPA) que reduzem o trabalho manual.

Você pode consultar mais detalhes sobre meus projetos e experiências nos links abaixo:
LinkedIn: https://www.linkedin.com/in/nogueira-jv/
GitHub: https://github.com/jv-nogueira

Fico à disposição para esclarecimentos adicionais ou para uma eventual entrevista.

Agradeço desde já pela atenção e pelo tempo dedicado!

Atenciosamente,
João Vitor Nogueira
(11) 9 7776-8397`;

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby4cL2g8uEAHLgwsF02k88AdsRAmgbBO91uUq-cfmhJzIZrwtRhk4VtLSxmmW2Sg0uOoQ/exec';

const form = document.getElementById('mail-form');
const statusBox = document.getElementById('status');
const submitButton = document.getElementById('submit-button');
const resetButton = document.getElementById('reset-defaults');

const fields = {
  recruiterName: document.getElementById('recruiterName'),
  recipientEmail: document.getElementById('recipientEmail'),
  bcc: document.getElementById('bcc'),
  subject: document.getElementById('subject'),
  message: document.getElementById('message'),
  curriculumFile: document.getElementById('curriculumFile'),
};

function setStatus(message, type) {
  statusBox.textContent = message;
  statusBox.className = `status ${type}`;
}

function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'bom dia';
  if (hour < 18) return 'boa tarde';
  return 'boa noite';
}

function getFirstName(value) {
  const name = normalizeText(value);
  if (!name) return 'recrutador';
  return name.split(' ')[0];
}

function replaceTemplateTags(text) {
  const fullName = normalizeText(fields.recruiterName.value);
  const firstName = getFirstName(fields.recruiterName.value);
  const greeting = getGreeting();

  return String(text || '')
    .replace(/\[saudacao\]/gi, greeting)
    .replace(/\[primeiroNome\]/gi, firstName)
    .replace(/\[nomeCompleto\]/gi, fullName || 'recrutador');
}

function loadSavedValues() {
  const stored = localStorage.getItem('curriculoForm');

  if (stored) {
    const parsed = JSON.parse(stored);
    Object.entries(fields).forEach(([key, element]) => {
      element.value = parsed[key] ?? '';
    });
    return;
  }

  fields.subject.value = DEFAULT_SUBJECT;
  fields.message.value = DEFAULT_MESSAGE;
}

function saveValues() {
  const payload = {
    recruiterName: fields.recruiterName.value.trim(),
    recipientEmail: fields.recipientEmail.value.trim(),
    bcc: fields.bcc.value.trim(),
    subject: fields.subject.value.trim(),
    message: fields.message.value.trim(),
  };

  localStorage.setItem('curriculoForm', JSON.stringify(payload));
}

function restoreDefaults() {
  fields.subject.value = DEFAULT_SUBJECT;
  fields.message.value = DEFAULT_MESSAGE;
  fields.recruiterName.value = '';
  fields.recipientEmail.value = '';
  fields.bcc.value = '';
  localStorage.removeItem('curriculoForm');
  setStatus('Mensagem padrão restaurada.', 'success');
}

function buildPayload() {
  const finalMessage = replaceTemplateTags(fields.message.value.trim());

  return {
    'Data': new Date().toISOString(),
    'Nome do Recrutador': fields.recruiterName.value.trim(),
    'E-mail do Destinatário': fields.recipientEmail.value.trim(),
    'Cco cópia oculta': fields.bcc.value.trim(),
    'Corpo do e-mail': finalMessage,
    'Título do e-mail': fields.subject.value.trim(),
    'Currículo': fields.curriculumFile.files && fields.curriculumFile.files.length ? fields.curriculumFile.files[0].name : '',
  };
}

async function submitForm(event) {
  event.preventDefault();

  const payload = buildPayload();

  if (!payload['E-mail do Destinatário']) {
    setStatus('Informe o e-mail do destinatário.', 'error');
    fields.recipientEmail.focus();
    return;
  }

  if (!payload['Título do e-mail']) {
    setStatus('Informe o título do e-mail.', 'error');
    fields.subject.focus();
    return;
  }

  if (!payload['Corpo do e-mail']) {
    setStatus('Informe o corpo do e-mail.', 'error');
    fields.message.focus();
    return;
  }

  if (!fields.curriculumFile.files || fields.curriculumFile.files.length === 0) {
    setStatus('Selecione um currículo antes de enviar.', 'error');
    fields.curriculumFile.focus();
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Enviando...';
  setStatus('Enviando dados para a aba ListaAuto...', 'success');

  try {
    const formData = new FormData();
    formData.append('Data', payload['Data']);
    formData.append('Nome do Recrutador', payload['Nome do Recrutador']);
    formData.append('E-mail do Destinatário', payload['E-mail do Destinatário']);
    formData.append('Cco cópia oculta', payload['Cco cópia oculta']);
    formData.append('Corpo do e-mail', payload['Corpo do e-mail']);
    formData.append('Título do e-mail', payload['Título do e-mail']);
    formData.append('Currículo', payload['Currículo']);
    formData.append('curriculumFile', fields.curriculumFile.files[0], fields.curriculumFile.files[0].name);

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: formData,
    });

    const rawText = await response.text();
    let result = { ok: false, message: 'Resposta inesperada do servidor.' };

    if (rawText) {
      try {
        result = JSON.parse(rawText);
      } catch (error) {
        result = {
          ok: false,
          message: `Resposta inesperada do servidor (status ${response.status}). Detalhes: ${rawText.slice(0, 220)}`,
        };
      }
    }

    if (!response.ok || result.ok === false) {
      throw new Error(result.error || result.message || 'Não foi possível registrar os dados.');
    }

    saveValues();
    setStatus('Dados enviados com sucesso para a aba ListaAuto.', 'success');
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Erro ao registrar os dados.', 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Enviar para ListaAuto';
  }
}

form.addEventListener('input', saveValues);
form.addEventListener('submit', submitForm);
resetButton.addEventListener('click', restoreDefaults);

loadSavedValues();
