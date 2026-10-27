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

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyWATI1oVihlAXOsVzYb0UMgCjngK60DCz6iWoS3N3Ka0wcgtq9Sn8qfk-eHVPO38s/exec';
const DRIVE_CURRICULUM_VIEW_URL = 'https://drive.google.com/file/d/17sVYzFS58asczdof5QV_WAIEgYSLD8Rd/view';
const DEFAULT_CURRICULUM_NAME = 'JoaoVitorNogueira.pdf';
const DEFAULT_CURRICULUM_PATH = './JoaoVitor.pdf';

const form = document.getElementById('mail-form');
const statusBox = document.getElementById('status');
const submitButton = document.getElementById('submit-button');
const emailCheckStatus = document.getElementById('email-check-status');
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

let emailCheckTimer = null;
let emailCheckSequence = 0;

function setStatus(message, type) {
  statusBox.textContent = message;
  statusBox.className = `status ${type}`;
}

function setEmailCheckStatus(message, type = '') {
  emailCheckStatus.textContent = message;
  emailCheckStatus.className = `email-check-status ${type}`.trim();
}

async function lookupRecipientEmail(email) {
  const query = new URLSearchParams({ action: 'checkEmail', email });
  const response = await fetch(`${GOOGLE_SCRIPT_URL}?${query.toString()}`, {
    cache: 'no-store',
  });
  const result = await response.json();

  if (!response.ok || !result.ok || typeof result.exists !== 'boolean') {
    throw new Error(result.error || 'Não foi possível verificar o e-mail na aba Log.');
  }

  return result.exists;
}

function scrollToRecipientEmail() {
  fields.recipientEmail.scrollIntoView({ behavior: 'smooth', block: 'center' });
  fields.recipientEmail.focus({ preventScroll: true });
}

function scheduleRecipientEmailCheck() {
  clearTimeout(emailCheckTimer);
  const sequence = ++emailCheckSequence;
  const email = fields.recipientEmail.value.trim();
  setEmailCheckStatus('');

  if (!email || !fields.recipientEmail.checkValidity()) {
    return;
  }

  setEmailCheckStatus('Verificando e-mail na aba Log...', 'checking');
  emailCheckTimer = setTimeout(async () => {
    try {
      const exists = await lookupRecipientEmail(email);
      if (sequence !== emailCheckSequence || fields.recipientEmail.value.trim() !== email) {
        return;
      }
      if (exists) {
        setEmailCheckStatus('Este e-mail já existe na aba Log. Informe outro destinatário.', 'duplicate');
      } else {
        setEmailCheckStatus('E-mail disponível.', 'checking');
      }
    } catch (error) {
      if (sequence === emailCheckSequence) {
        setEmailCheckStatus('Não foi possível verificar este e-mail. Tente novamente.', 'error');
        console.error(error);
      }
    }
  }, 350);
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

function restoreDefaults() {
  fields.subject.value = DEFAULT_SUBJECT;
  fields.message.value = DEFAULT_MESSAGE;
  fields.recruiterName.value = '';
  fields.recipientEmail.value = '';
  fields.bcc.value = '';
  if (fields.curriculumFile) fields.curriculumFile.value = '';
  localStorage.removeItem('curriculoForm');
  updateCurriculumDisplay();
  setStatus('Mensagem e currículo padrão restaurados.', 'success');
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
  submitButton.setAttribute('aria-busy', 'true');

  try {
    clearTimeout(emailCheckTimer);
    const emailCheckSequenceAtSubmit = ++emailCheckSequence;
    setEmailCheckStatus('Verificando e-mail na aba Log...', 'checking');

    const exists = await lookupRecipientEmail(payload['E-mail do Destinatário']);
    if (emailCheckSequenceAtSubmit !== emailCheckSequence) {
      return;
    }
    if (exists) {
      const message = 'Este e-mail já existe na aba Log. Informe outro destinatário.';
      setEmailCheckStatus(message, 'duplicate');
      setStatus(message, 'error');
      scrollToRecipientEmail();
      return;
    }

    setEmailCheckStatus('E-mail disponível.', 'checking');
    setStatus('Preparando e disparando o e-mail pelo Gmail...', 'success');

    let base64Data = null;
    let fileName = DEFAULT_CURRICULUM_NAME;

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
      if (result.duplicate) {
        setEmailCheckStatus(result.error, 'duplicate');
        setStatus(result.error, 'error');
        scrollToRecipientEmail();
      }
      throw new Error(result.error || result.message || 'Não foi possível enviar o e-mail.');
    }

    saveValues();
    setStatus('E-mail enviado com sucesso e registrado na aba Log!', 'success');
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Erro ao disparar o e-mail.', 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Enviar Candidatura';
    submitButton.removeAttribute('aria-busy');
  }
}

function previewCurriculum() {
  if (fields.curriculumFile.files && fields.curriculumFile.files.length > 0) {
    const file = fields.curriculumFile.files[0];
    const fileURL = URL.createObjectURL(file);
    window.open(fileURL, '_blank');
  } else {
    window.open(DRIVE_CURRICULUM_VIEW_URL, '_blank');
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
fields.recipientEmail.addEventListener('input', scheduleRecipientEmailCheck);
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
updateCurriculumDisplay();
