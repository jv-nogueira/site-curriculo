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

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwiXgDosPeWe6nDbuKi9Qi_nbxHedYV_fDra33Oi7pBD9o1p1s_0wAaNobJQqi7kbtxPQ/exec';
const DEFAULT_CURRICULUM_NAME = 'JoaoVitor.pdf';
const DEFAULT_CURRICULUM_PATH = './JoaoVitor.pdf';

const form = document.getElementById('mail-form');
const statusBox = document.getElementById('status');
const submitButton = document.getElementById('submit-button');
const resetButton = document.getElementById('reset-defaults');
const previewCurriculumButton = document.getElementById('preview-curriculum');
const previewEmailBtn = document.getElementById('preview-email-btn');
const selectedFileNameEl = document.getElementById('selected-file-name');
const fileBadgeEl = document.getElementById('file-badge');

const emailModal = document.getElementById('email-modal');
const modalCloseBtn = document.getElementById('modal-close');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalSendBtn = document.getElementById('modal-send-btn');
const modalToEl = document.getElementById('modal-to');
const modalBccRow = document.getElementById('modal-bcc-row');
const modalBccEl = document.getElementById('modal-bcc');
const modalSubjectEl = document.getElementById('modal-subject');
const modalAttachmentEl = document.getElementById('modal-attachment');
const modalBodyEl = document.getElementById('modal-body');

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
  if (hour < 12) return 'bom dia!';
  if (hour < 18) return 'boa tarde!';
  return 'boa noite!';
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

function fileToBase64(fileOrBlob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(fileOrBlob);
  });
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

  submitButton.disabled = true;
  submitButton.textContent = 'Enviando e-mail...';
  setStatus('Preparando e disparando o e-mail pelo Gmail...', 'success');

  try {
    let base64Data = null;
    let fileName = payload['Currículo'] || DEFAULT_CURRICULUM_NAME;

    if (fields.curriculumFile.files && fields.curriculumFile.files.length > 0) {
      base64Data = await fileToBase64(fields.curriculumFile.files[0]);
      fileName = fields.curriculumFile.files[0].name;
    } else {
      try {
        const fileResp = await fetch(DEFAULT_CURRICULUM_PATH);
        if (fileResp.ok) {
          const blob = await fileResp.blob();
          base64Data = await fileToBase64(blob);
        }
      } catch (e) {
        console.warn('Não foi possível codificar o PDF local:', e);
      }
    }

    const requestData = {
      recipientEmail: payload['E-mail do Destinatário'],
      recruiterName: payload['Nome do Recrutador'],
      bcc: payload['Cco cópia oculta'],
      subject: payload['Título do e-mail'],
      message: payload['Corpo do e-mail'],
      fileName: fileName,
      fileData: base64Data,
      fileMimeType: 'application/pdf'
    };

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(requestData),
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
      throw new Error(result.error || result.message || 'Não foi possível enviar o e-mail.');
    }

    saveValues();
    setStatus('E-mail enviado com sucesso e registrado na aba ListaAuto!', 'success');
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Erro ao disparar o e-mail.', 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Enviar Candidatura';
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

function openEmailPreview() {
  const payload = buildPayload();
  
  if (modalToEl) {
    modalToEl.textContent = payload['E-mail do Destinatário'] || '(E-mail não informado ainda)';
  }
  
  if (modalBccRow && modalBccEl) {
    if (payload['Cco cópia oculta']) {
      modalBccEl.textContent = payload['Cco cópia oculta'];
      modalBccRow.style.display = 'flex';
    } else {
      modalBccRow.style.display = 'none';
    }
  }
  
  if (modalSubjectEl) {
    modalSubjectEl.textContent = payload['Título do e-mail'] || '(Sem assunto informado)';
  }
  
  if (modalAttachmentEl) {
    modalAttachmentEl.textContent = `📎 ${payload['Currículo'] || DEFAULT_CURRICULUM_NAME}`;
  }
  
  if (modalBodyEl) {
    modalBodyEl.textContent = payload['Corpo do e-mail'] || '(Mensagem vazia)';
  }
  
  if (emailModal) {
    emailModal.classList.add('active');
    emailModal.setAttribute('aria-hidden', 'false');
  }
}

function closeEmailPreview() {
  if (emailModal) {
    emailModal.classList.remove('active');
    emailModal.setAttribute('aria-hidden', 'true');
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

if (previewEmailBtn) {
  previewEmailBtn.addEventListener('click', openEmailPreview);
}

if (modalCloseBtn) {
  modalCloseBtn.addEventListener('click', closeEmailPreview);
}

if (modalCancelBtn) {
  modalCancelBtn.addEventListener('click', closeEmailPreview);
}

if (modalSendBtn) {
  modalSendBtn.addEventListener('click', () => {
    closeEmailPreview();
    if (form.requestSubmit) {
      form.requestSubmit();
    } else {
      submitButton.click();
    }
  });
}

if (emailModal) {
  emailModal.addEventListener('click', (e) => {
    if (e.target === emailModal) {
      closeEmailPreview();
    }
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && emailModal && emailModal.classList.contains('active')) {
    closeEmailPreview();
  }
});

loadSavedValues();
loadDefaultCurriculum();
