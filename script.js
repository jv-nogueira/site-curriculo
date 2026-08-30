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
const DEFAULT_CURRICULUM_NAME = 'JoaoVitor.pdf';
const DEFAULT_CURRICULUM_PATH = './JoaoVitor.pdf';

const form = document.getElementById('mail-form');
const statusBox = document.getElementById('status');
const submitButton = document.getElementById('submit-button');
const resetButton = document.getElementById('reset-defaults');
const previewCurriculumButton = document.getElementById('preview-curriculum');
const selectedFileNameEl = document.getElementById('selected-file-name');
const fileBadgeEl = document.getElementById('file-badge');

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

function formatFriendlyDateForStorage(date = new Date()) {
  const d = new Date(date);
  const pad = (value) => String(value).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
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

function updateCurriculumDisplay() {
  if (fields.curriculumFile && fields.curriculumFile.files && fields.curriculumFile.files.length > 0) {
    const file = fields.curriculumFile.files[0];
    if (selectedFileNameEl) selectedFileNameEl.textContent = file.name;
    if (fileBadgeEl) {
      fileBadgeEl.textContent = 'Personalizado';
      fileBadgeEl.className = 'file-badge custom';
    }
  } else {
    if (selectedFileNameEl) selectedFileNameEl.textContent = DEFAULT_CURRICULUM_NAME;
    if (fileBadgeEl) {
      fileBadgeEl.textContent = 'Padrão';
      fileBadgeEl.className = 'file-badge';
    }
  }
}

function loadSavedValues() {
  const stored = localStorage.getItem('curriculoForm');

  if (stored) {
    const parsed = JSON.parse(stored);
    Object.entries(fields).forEach(([key, element]) => {
      if (element && key !== 'curriculumFile') {
        element.value = parsed[key] ?? '';
      }
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

async function restoreDefaults() {
  fields.subject.value = DEFAULT_SUBJECT;
  fields.message.value = DEFAULT_MESSAGE;
  fields.recruiterName.value = '';
  fields.recipientEmail.value = '';
  fields.bcc.value = '';
  if (fields.curriculumFile) fields.curriculumFile.value = '';
  localStorage.removeItem('curriculoForm');
  await loadDefaultCurriculum(true);
  updateCurriculumDisplay();
  setStatus('Mensagem e currículo padrão restaurados.', 'success');
}

async function loadDefaultCurriculum(force = false) {
  if (!fields.curriculumFile) return;

  if (!force && fields.curriculumFile.files && fields.curriculumFile.files.length > 0) {
    updateCurriculumDisplay();
    return;
  }

  try {
    const response = await fetch(DEFAULT_CURRICULUM_PATH, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const file = new File([blob], DEFAULT_CURRICULUM_NAME, { type: 'application/pdf' });
    const dataTransfer = new DataTransfer();

    dataTransfer.items.add(file);
    fields.curriculumFile.files = dataTransfer.files;
  } catch (error) {
    console.warn('Executando localmente ou sem suporte a DataTransfer; usando currículo padrão:', error);
  } finally {
    updateCurriculumDisplay();
  }
}

function buildPayload() {
  const finalMessage = replaceTemplateTags(fields.message.value.trim());
  const curriculumName = (fields.curriculumFile.files && fields.curriculumFile.files.length > 0)
    ? fields.curriculumFile.files[0].name
    : DEFAULT_CURRICULUM_NAME;

  return {
    'Data': formatFriendlyDateForStorage(new Date()),
    'Nome do Recrutador': fields.recruiterName.value.trim(),
    'E-mail do Destinatário': fields.recipientEmail.value.trim(),
    'Cco cópia oculta': fields.bcc.value.trim(),
    'Corpo do e-mail': finalMessage,
    'Título do e-mail': fields.subject.value.trim(),
    'Currículo': curriculumName,
  };
}

async function submitForm(event) {
  event.preventDefault();

  const payload = buildPayload();

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

    if (fields.curriculumFile.files && fields.curriculumFile.files.length > 0) {
      formData.append('curriculumFile', fields.curriculumFile.files[0], fields.curriculumFile.files[0].name);
    } else {
      try {
        const fileResp = await fetch(DEFAULT_CURRICULUM_PATH);
        if (fileResp.ok) {
          const blob = await fileResp.blob();
          formData.append('curriculumFile', blob, DEFAULT_CURRICULUM_NAME);
        }
      } catch (e) {
        console.warn('Não foi possível anexar blob do PDF:', e);
      }
    }

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

function previewCurriculum() {
  if (fields.curriculumFile.files && fields.curriculumFile.files.length > 0) {
    const file = fields.curriculumFile.files[0];
    const fileURL = URL.createObjectURL(file);
    window.open(fileURL, '_blank');
  } else {
    window.open(DEFAULT_CURRICULUM_PATH, '_blank');
  }
}

form.addEventListener('input', saveValues);
form.addEventListener('submit', submitForm);
resetButton.addEventListener('click', restoreDefaults);
if (fields.curriculumFile) {
  fields.curriculumFile.addEventListener('change', updateCurriculumDisplay);
}
if (previewCurriculumButton) {
  previewCurriculumButton.addEventListener('click', previewCurriculum);
}

loadSavedValues();
loadDefaultCurriculum();
