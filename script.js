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

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbypzuyp6Z1Wj34vtTWso5Y14sHjB4UyE-h1jRXBFskEoSO56eOcdNPHhv8-WZo20sFA/exec';
const GOOGLE_CLIENT_ID = '973715238698-dr99ku9cfh5r1lt7tq9jvi2fem1ea5r7.apps.googleusercontent.com';
const DEFAULT_CURRICULUM_DOC_ID = '1CqGEGpI1n90RLde0IZXpX2cJ4GzAKh7IAPw2ZJyc4aI';
const DRIVE_CURRICULUM_EDIT_URL = `https://docs.google.com/document/d/${DEFAULT_CURRICULUM_DOC_ID}/edit?embedded=true`;
const DEFAULT_CURRICULUM_NAME = 'JoaoVitorNogueira.pdf';
const DEFAULT_CURRICULUM_DISPLAY_NAME = 'JoaoVitorNogueira (Google Docs)';

const form = document.getElementById('mail-form');
const statusBox = document.getElementById('status');
const submitButton = document.getElementById('submit-button');
const authStatus = document.getElementById('auth-status');
const authPanel = document.querySelector('.auth-panel');
const googleSignInButton = document.getElementById('google-signin-button');
const googleSignOutButton = document.getElementById('google-signout-button');
const loginRequiredOverlay = document.getElementById('login-required-overlay');
const authToast = document.getElementById('auth-toast');
const emailCheckStatus = document.getElementById('email-check-status');
const resetButton = document.getElementById('reset-defaults');
const previewCurriculumButton = document.getElementById('preview-curriculum');
const previewEmailBtn = document.getElementById('preview-email-btn');
const selectedFileNameEl = document.getElementById('selected-file-name');
const fileBadgeEl = document.getElementById('file-badge');

const emailModal = document.getElementById('email-modal');
const curriculumModal = document.getElementById('curriculum-modal');
const curriculumModalCloseBtn = document.getElementById('curriculum-modal-close');
const curriculumModalDoneBtn = document.getElementById('curriculum-modal-done');
const curriculumModalTitleEl = document.getElementById('curriculum-modal-title');
const curriculumModalStatusEl = document.getElementById('curriculum-modal-status');
const curriculumPreviewFrame = document.getElementById('curriculum-preview-frame');
const curriculumMobileEditor = document.getElementById('curriculum-mobile-editor');
const curriculumMobileEditorContent = document.getElementById('curriculum-mobile-editor-content');
const curriculumMobileToolbar = document.querySelector('.curriculum-mobile-toolbar');
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
let curriculumPreviewObjectUrl = null;
let curriculumMobileEditorActive = false;
let curriculumMobileEditorLoaded = false;
let curriculumMobileEditorDirty = false;
let curriculumMobileEditorOriginalText = '';
let curriculumMobileEditorSaveTimer = null;
let curriculumMobileEditorSavePromise = null;
let curriculumMobileEditorLoadSequence = 0;
let googleIdToken = '';
let googleUserEmail = '';
let isSubmitting = false;
let authPromptTimer = null;

function setStatus(message, type) {
  statusBox.textContent = message;
  statusBox.className = `status ${type}`;
}

function setEmailCheckStatus(message, type = '') {
  emailCheckStatus.textContent = message;
  emailCheckStatus.className = `email-check-status ${type}`.trim();
}

async function lookupRecipientEmail(email) {
  const response = await fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({
      action: 'checkEmail',
      email,
      idToken: googleIdToken,
    }),
  });
  const result = await response.json();

  if (result.authRequired) {
    signOutGoogleUser();
  }
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

  if (!email || !fields.recipientEmail.checkValidity() || !googleIdToken) {
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
        setEmailCheckStatus(
          error.message || 'Não foi possível verificar este e-mail. Tente novamente.',
          'error'
        );
        console.error(error);
      }
    }
  }, 350);
}

function updateAuthenticationState() {
  const authenticated = Boolean(googleIdToken);
  const formLocked = !authenticated || isSubmitting;
  form.classList.toggle('auth-locked', !authenticated);
  Array.from(form.elements).forEach((element) => {
    if (element !== loginRequiredOverlay) {
      element.disabled = formLocked;
    }
  });
  loginRequiredOverlay.hidden = authenticated || isSubmitting;
  modalSendBtn.disabled = isSubmitting;
  modalSendBtn.classList.toggle('auth-required', !authenticated);
  googleSignInButton.hidden = authenticated;
  googleSignOutButton.hidden = !authenticated;
  googleSignOutButton.disabled = isSubmitting;
  authStatus.textContent = isSubmitting
    ? `Conectado como ${googleUserEmail}. Aguarde o envio terminar.`
    : authenticated
      ? `Conectado como ${googleUserEmail}.`
      : 'Faça login com uma conta Google para habilitar o formulário.';
}

function showLoginRequiredMessage() {
  clearTimeout(authPromptTimer);
  authToast.hidden = false;
  authPanel.classList.add('auth-attention');
  requestAnimationFrame(() => authToast.classList.add('visible'));
  authPromptTimer = setTimeout(clearLoginRequiredMessage, 3500);
}

function clearLoginRequiredMessage() {
  clearTimeout(authPromptTimer);
  authToast.classList.remove('visible');
  authPanel.classList.remove('auth-attention');
  setTimeout(() => {
    if (!authToast.classList.contains('visible')) {
      authToast.hidden = true;
    }
  }, 200);
}

function handleGoogleCredential(response) {
  if (!response || !response.credential) {
    authStatus.textContent = 'Não foi possível concluir o login. Tente novamente.';
    return;
  }

  clearLoginRequiredMessage();
  googleIdToken = response.credential;
  try {
    const encodedPayload = googleIdToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const identity = JSON.parse(atob(encodedPayload));
    googleUserEmail = identity.email || '';
  } catch (error) {
    console.error('Não foi possível ler a identidade do login do Google:', error);
    googleIdToken = '';
    googleUserEmail = '';
    authStatus.textContent = 'Não foi possível validar a conta Google. Tente novamente.';
    updateAuthenticationState();
    return;
  }

  updateAuthenticationState();
  scheduleRecipientEmailCheck();
}

function signOutGoogleUser() {
  googleIdToken = '';
  googleUserEmail = '';
  updateAuthenticationState();
}

function initializeGoogleSignIn() {
  if (GOOGLE_CLIENT_ID === 'COLE_SEU_CLIENT_ID_AQUI') {
    authStatus.textContent = 'Configure o Client ID do Google para habilitar o login.';
    return;
  }
  if (!window.google || !window.google.accounts || !window.google.accounts.id) {
    authStatus.textContent = 'O login do Google não carregou. Atualize a página e tente novamente.';
    return;
  }

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleCredential,
  });
  window.google.accounts.id.renderButton(googleSignInButton, {
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    shape: 'rectangular',
  });
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
    if (selectedFileNameEl) selectedFileNameEl.textContent = DEFAULT_CURRICULUM_DISPLAY_NAME;
    if (fileBadgeEl) {
      fileBadgeEl.textContent = 'Padrão';
      fileBadgeEl.className = 'file-badge';
    }
  }

  if (previewCurriculumButton) {
    const hasCustomFile = fields.curriculumFile.files && fields.curriculumFile.files.length > 0;
    previewCurriculumButton.textContent = hasCustomFile ? '👁️ Visualizar PDF' : '✏️ Editar currículo';
    previewCurriculumButton.title = hasCustomFile ? 'Visualizar PDF personalizado' : 'Editar currículo no Google Docs';
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

  if (!googleIdToken) {
    showLoginRequiredMessage();
    return;
  }

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

  isSubmitting = true;
  updateAuthenticationState();
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
    }

    const requestData = {
      recipientEmail: payload['E-mail do Destinatário'],
      recruiterName: payload['Nome do Recrutador'],
      idToken: googleIdToken,
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
      if (result.authRequired) {
        signOutGoogleUser();
      }
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
    isSubmitting = false;
    updateAuthenticationState();
    submitButton.textContent = 'Enviar Candidatura';
    submitButton.removeAttribute('aria-busy');
  }
}

function isMobileEditorViewport() {
  return window.matchMedia('(max-width: 720px)').matches ||
    window.matchMedia('(pointer: coarse)').matches ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

async function requestCurriculumEditor(action, payload = {}) {
  const response = await fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      action,
      idToken: googleIdToken,
    }),
  });

  let result;
  try {
    result = await response.json();
  } catch (error) {
    throw new Error('O servidor retornou uma resposta inválida ao editar o currículo.');
  }

  if (result.authRequired) {
    signOutGoogleUser();
  }
  if (!response.ok || !result.ok) {
    const requestError = new Error(result.error || 'Não foi possível atualizar o currículo.');
    requestError.conflict = result.conflict === true;
    throw requestError;
  }

  return result;
}

function isMobileEditorStyleActive(styleRanges, index) {
  return (styleRanges || []).some((range) => index >= range[0] && index < range[1]);
}

function appendFormattedText(parent, text, start, styles) {
  let cursor = 0;
  while (cursor < text.length) {
    const offset = start + cursor;
    const activeStyles = {
      bold: isMobileEditorStyleActive(styles.bold, offset),
      italic: isMobileEditorStyleActive(styles.italic, offset),
      underline: isMobileEditorStyleActive(styles.underline, offset),
    };

    let end = cursor + 1;
    while (end < text.length) {
      const nextOffset = start + end;
      if (activeStyles.bold !== isMobileEditorStyleActive(styles.bold, nextOffset) ||
          activeStyles.italic !== isMobileEditorStyleActive(styles.italic, nextOffset) ||
          activeStyles.underline !== isMobileEditorStyleActive(styles.underline, nextOffset)) {
        break;
      }
      end++;
    }

    let node = document.createTextNode(text.slice(cursor, end));
    if (activeStyles.underline) {
      const underline = document.createElement('u');
      underline.appendChild(node);
      node = underline;
    }
    if (activeStyles.italic) {
      const italic = document.createElement('em');
      italic.appendChild(node);
      node = italic;
    }
    if (activeStyles.bold) {
      const bold = document.createElement('strong');
      bold.appendChild(node);
      node = bold;
    }
    parent.appendChild(node);
    cursor = end;
  }
}

function renderMobileEditorContent(content) {
  const styles = content.styles || { bold: [], italic: [], underline: [] };
  const lines = content.text.split('\n');
  let offset = 0;
  curriculumMobileEditorContent.innerHTML = '';

  lines.forEach((line) => {
    const block = document.createElement('div');
    if (line) {
      appendFormattedText(block, line, offset, styles);
    } else {
      block.appendChild(document.createElement('br'));
    }
    curriculumMobileEditorContent.appendChild(block);
    offset += line.length + 1;
  });
}

function serializeMobileEditorContent() {
  let text = '';
  const styles = { bold: [], italic: [], underline: [] };

  function appendStyleRange(style, start, end) {
    if (start === end) return;
    const ranges = styles[style];
    const lastRange = ranges[ranges.length - 1];
    if (lastRange && lastRange[1] === start) {
      lastRange[1] = end;
    } else {
      ranges.push([start, end]);
    }
  }

  function visit(node, inheritedStyles, isRoot = false) {
    if (node.nodeType === 3) {
      const value = node.nodeValue.replace(/\r\n?/g, '\n');
      const start = text.length;
      text += value;
      Object.keys(inheritedStyles).forEach((style) => {
        if (inheritedStyles[style]) {
          appendStyleRange(style, start, text.length);
        }
      });
      return;
    }
    if (node.nodeType !== 1) return;

    const tag = node.tagName.toLowerCase();
    if (tag === 'br') {
      text += '\n';
      return;
    }

    const styles = { ...inheritedStyles };
    const inlineStyle = node.getAttribute('style') || '';
    if (tag === 'b' || tag === 'strong' || /font-weight:\s*(bold|[6-9]00)/i.test(inlineStyle)) {
      styles.bold = true;
    }
    if (tag === 'i' || tag === 'em' || /font-style:\s*italic/i.test(inlineStyle)) {
      styles.italic = true;
    }
    if (tag === 'u' || /text-decoration(?:-line)?:[^;]*underline/i.test(inlineStyle)) {
      styles.underline = true;
    }

    const isBlock = tag === 'div' || tag === 'p' || tag === 'li';
    const isEmptyBlock = isBlock && node.childNodes.length === 1 &&
      node.firstChild.nodeType === 1 && node.firstChild.tagName.toLowerCase() === 'br';
    if (isBlock && !isRoot && text.length > 0 && !text.endsWith('\n')) {
      text += '\n';
    }
    if (!isEmptyBlock) {
      Array.from(node.childNodes).forEach((child) => visit(child, styles));
    }
    if (isBlock && !isRoot && text.length > 0 && !text.endsWith('\n')) {
      text += '\n';
    }
  }

  const topLevelNodes = Array.from(curriculumMobileEditorContent.childNodes);
  topLevelNodes.forEach((node, index) => {
    if (index > 0 && text.length > 0 && !text.endsWith('\n')) {
      text += '\n';
    }
    visit(node, { bold: false, italic: false, underline: false }, true);
  });

  return { text, styles };
}

function setMobileEditorStatus(message) {
  if (curriculumModalStatusEl) curriculumModalStatusEl.textContent = message;
}

async function loadMobileCurriculumEditor() {
  const loadSequence = ++curriculumMobileEditorLoadSequence;
  curriculumMobileEditorLoaded = false;
  curriculumMobileEditorDirty = false;
  curriculumMobileEditorContent.contentEditable = 'false';
  curriculumMobileEditorContent.innerHTML = '';
  setMobileEditorStatus('Carregando o currículo do Google Docs...');

  try {
    const result = await requestCurriculumEditor('getCurriculumEditorContent');
    if (!curriculumMobileEditorActive || loadSequence !== curriculumMobileEditorLoadSequence) return;

    curriculumMobileEditorOriginalText = result.text;
    renderMobileEditorContent(result);
    curriculumMobileEditorLoaded = true;
    curriculumMobileEditorContent.contentEditable = 'true';
    setMobileEditorStatus('Edite o texto. Negrito, itálico e sublinhado são salvos no mesmo documento do Drive.');
  } catch (error) {
    if (!curriculumMobileEditorActive || loadSequence !== curriculumMobileEditorLoadSequence) return;
    setMobileEditorStatus(error.message || 'Não foi possível carregar o currículo para edição móvel.');
  }
}

function scheduleMobileCurriculumSave() {
  if (!curriculumMobileEditorLoaded) return;
  curriculumMobileEditorDirty = true;
  setMobileEditorStatus('Salvamento automático em andamento...');
  clearTimeout(curriculumMobileEditorSaveTimer);
  curriculumMobileEditorSaveTimer = setTimeout(saveMobileCurriculum, 1200);
}

async function saveMobileCurriculum() {
  clearTimeout(curriculumMobileEditorSaveTimer);
  curriculumMobileEditorSaveTimer = null;

  if (curriculumMobileEditorSavePromise) {
    return curriculumMobileEditorSavePromise;
  }
  if (!curriculumMobileEditorActive || !curriculumMobileEditorLoaded || !curriculumMobileEditorDirty) {
    return true;
  }

  const content = serializeMobileEditorContent();
  if (!content.text.trim()) {
    setMobileEditorStatus('O currículo não pode ficar vazio.');
    return false;
  }

  curriculumMobileEditorContent.contentEditable = 'false';
  setMobileEditorStatus('Salvando alterações no Google Docs...');

  curriculumMobileEditorSavePromise = (async () => {
    try {
      const result = await requestCurriculumEditor('saveCurriculumEditorContent', {
        originalText: curriculumMobileEditorOriginalText,
        text: content.text,
        styles: content.styles,
      });
      curriculumMobileEditorOriginalText = result.text;
      curriculumMobileEditorDirty = false;
      setMobileEditorStatus('Alterações salvas no Google Docs.');
      return true;
    } catch (error) {
      setMobileEditorStatus(error.conflict
        ? 'O documento mudou em outra sessão. Feche e abra a edição móvel novamente antes de salvar.'
        : error.message || 'Não foi possível salvar as alterações.');
      return false;
    } finally {
      curriculumMobileEditorContent.contentEditable = 'true';
    }
  })();

  const saved = await curriculumMobileEditorSavePromise;
  curriculumMobileEditorSavePromise = null;
  return saved;
}

async function previewCurriculum() {
  const closed = await closeCurriculumPreview();
  if (!closed) return;

  const hasCustomFile = fields.curriculumFile.files && fields.curriculumFile.files.length > 0;
  curriculumPreviewFrame.hidden = false;
  curriculumMobileEditor.hidden = true;

  if (hasCustomFile) {
    curriculumMobileEditorActive = false;
    if (curriculumModalTitleEl) curriculumModalTitleEl.textContent = '📄 Pré-visualização do PDF personalizado';
    if (curriculumModalStatusEl) curriculumModalStatusEl.textContent = 'Este PDF personalizado está em modo de visualização.';
    curriculumPreviewObjectUrl = URL.createObjectURL(fields.curriculumFile.files[0]);
    curriculumPreviewFrame.src = curriculumPreviewObjectUrl;
  } else {
    if (curriculumModalTitleEl) curriculumModalTitleEl.textContent = '✏️ Editar currículo no Google Docs';
    if (isMobileEditorViewport()) {
      curriculumMobileEditorActive = true;
      curriculumPreviewFrame.hidden = true;
      curriculumMobileEditor.hidden = false;
      curriculumModal.classList.add('active');
      curriculumModal.setAttribute('aria-hidden', 'false');
      await loadMobileCurriculumEditor();
      return;
    }

    curriculumMobileEditorActive = false;
    if (curriculumModalStatusEl) {
      curriculumModalStatusEl.textContent = 'As alterações são salvas automaticamente no Drive. Aguarde “Alterações salvas no Drive” antes de fechar.';
    }
    curriculumPreviewFrame.src = DRIVE_CURRICULUM_EDIT_URL;
  }

  curriculumModal.classList.add('active');
  curriculumModal.setAttribute('aria-hidden', 'false');
}

async function closeCurriculumPreview() {
  if (!curriculumModal) return true;

  if (curriculumMobileEditorActive && curriculumMobileEditorDirty) {
    const saved = await saveMobileCurriculum();
    if (!saved && !window.confirm('Não foi possível salvar. Fechar e descartar as alterações móveis?')) {
      return false;
    }
  }

  clearTimeout(curriculumMobileEditorSaveTimer);
  curriculumMobileEditorSaveTimer = null;
  curriculumMobileEditorLoadSequence++;
  curriculumMobileEditorActive = false;
  curriculumMobileEditorLoaded = false;
  curriculumMobileEditorDirty = false;
  curriculumMobileEditorOriginalText = '';
  curriculumModal.classList.remove('active');
  curriculumModal.setAttribute('aria-hidden', 'true');
  curriculumPreviewFrame.src = 'about:blank';
  curriculumPreviewFrame.hidden = false;
  curriculumMobileEditor.hidden = true;
  curriculumMobileEditorContent.innerHTML = '';

  if (curriculumPreviewObjectUrl) {
    URL.revokeObjectURL(curriculumPreviewObjectUrl);
    curriculumPreviewObjectUrl = null;
  }
  return true;
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

if (curriculumModalCloseBtn) {
  curriculumModalCloseBtn.addEventListener('click', closeCurriculumPreview);
}

if (curriculumModalDoneBtn) {
  curriculumModalDoneBtn.addEventListener('click', closeCurriculumPreview);
}

if (curriculumMobileEditorContent) {
  curriculumMobileEditorContent.addEventListener('input', scheduleMobileCurriculumSave);
  curriculumMobileEditorContent.addEventListener('paste', (event) => {
    if (!event.clipboardData) return;
    event.preventDefault();
    document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
  });
}

if (curriculumMobileToolbar) {
  curriculumMobileToolbar.addEventListener('pointerdown', (event) => {
    const button = event.target.closest && event.target.closest('[data-editor-command]');
    if (button) event.preventDefault();
  });
  curriculumMobileToolbar.addEventListener('click', (event) => {
    const button = event.target.closest && event.target.closest('[data-editor-command]');
    if (!button || !curriculumMobileEditorLoaded) return;
    curriculumMobileEditorContent.focus({ preventScroll: true });
    document.execCommand(button.dataset.editorCommand, false, null);
    scheduleMobileCurriculumSave();
  });
}

if (curriculumModal) {
  curriculumModal.addEventListener('click', (e) => {
    if (e.target === curriculumModal) {
      closeCurriculumPreview();
    }
  });
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
    if (!googleIdToken) {
      closeEmailPreview();
      showLoginRequiredMessage();
      return;
    }
    closeEmailPreview();
    if (form.requestSubmit) {
      form.requestSubmit();
    } else {
      submitButton.click();
    }
  });
}

loginRequiredOverlay.addEventListener('click', showLoginRequiredMessage);

googleSignOutButton.addEventListener('click', signOutGoogleUser);

if (emailModal) {
  emailModal.addEventListener('click', (e) => {
    if (e.target === emailModal) {
      closeEmailPreview();
    }
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (emailModal && emailModal.classList.contains('active')) {
      closeEmailPreview();
    }
    if (curriculumModal && curriculumModal.classList.contains('active')) {
      closeCurriculumPreview();
    }
  }
});

loadSavedValues();
updateCurriculumDisplay();
updateAuthenticationState();
window.addEventListener('load', initializeGoogleSignIn, { once: true });
