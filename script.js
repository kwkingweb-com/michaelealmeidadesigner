/* Sem bibliotecas externas: menu, fotos, calendário e solicitação. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const config = window.MICHAELE_CONFIG || {};
  const digits = String(config.whatsapp || '').replace(/\D/g, '');
  const whatsapp = /^55\d{10,11}$/.test(digits) ? digits : '';
  const defaultInstagram = 'https://www.instagram.com/_michaelealmeidadesigner_/';
  let instagram = defaultInstagram;
  try {
    const url = new URL(config.instagram || defaultInstagram);
    if (url.protocol === 'https:' && ['instagram.com', 'www.instagram.com'].includes(url.hostname)) instagram = url.href;
  } catch (_) { /* Mantém o contato original se a configuração estiver incompleta. */ }
  document.querySelectorAll('[data-instagram]').forEach((link) => { link.href = instagram; });
  $('currentYear').textContent = new Date().getFullYear();
  $('quickContact').href = instagram;

  if (whatsapp) {
    $('quickContact').href = `https://wa.me/${whatsapp}?text=${encodeURIComponent('Olá Michaele! Gostaria de saber mais sobre os atendimentos.')}`;
    $('quickContactIcon').setAttribute('href', '#i-message');
    $('quickContactText').textContent = 'WhatsApp';
    $('submitText').textContent = 'Continuar no WhatsApp';
    $('bookingNote').textContent = 'Você revisa a mensagem no WhatsApp antes de enviar. O horário depende de confirmação.';
  }

  const menu = $('mobileMenu');
  const gallery = $('galleryDialog');
  const syncModalState = () => document.body.classList.toggle('modal-open', menu.open || gallery.open);
  const closeMenu = () => { menu.close(); };
  $('openMenu').addEventListener('click', () => {
    if (!menu.open) menu.showModal();
    $('openMenu').setAttribute('aria-expanded', 'true');
    syncModalState();
    $('closeMenu').focus();
  });
  $('closeMenu').addEventListener('click', closeMenu);
  menu.addEventListener('close', () => {
    $('openMenu').setAttribute('aria-expanded', 'false');
    syncModalState();
  });
  menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  [menu, gallery].forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  });
  window.addEventListener('resize', () => { if (window.innerWidth >= 900 && menu.open) closeMenu(); });

  const galleryButtons = [...document.querySelectorAll('[data-gallery-index]')];
  const photos = galleryButtons.map((button) => {
    const img = button.querySelector('img');
    return { src: button.dataset.full || img.getAttribute('src'), alt: img.alt };
  });
  const toggleGallery = $('toggleGallery');
  if (toggleGallery) toggleGallery.addEventListener('click', () => {
    const expand = toggleGallery.getAttribute('aria-expanded') !== 'true';
    galleryButtons.slice(4).forEach((button) => { button.hidden = !expand; });
    toggleGallery.setAttribute('aria-expanded', String(expand));
    toggleGallery.textContent = expand ? 'Mostrar menos' : `Ver mais ${Math.max(0, photos.length - 4)} fotos`;
    if (!expand) $('resultados').scrollIntoView({ block: 'start' });
  });
  let photoIndex = 0;
  const showPhoto = (index) => {
    photoIndex = (index + photos.length) % photos.length;
    $('galleryImage').src = photos[photoIndex].src;
    $('galleryImage').alt = photos[photoIndex].alt;
    $('galleryCaption').textContent = `${photoIndex + 1} de ${photos.length} · ${photos[photoIndex].alt}`;
  };
  galleryButtons.forEach((button, index) => button.addEventListener('click', () => {
    showPhoto(index);
    gallery.showModal();
    syncModalState();
    $('closeGallery').focus();
  }));
  $('closeGallery').addEventListener('click', () => gallery.close());
  gallery.addEventListener('close', syncModalState);
  $('prevImage').addEventListener('click', () => showPhoto(photoIndex - 1));
  $('nextImage').addEventListener('click', () => showPhoto(photoIndex + 1));
  gallery.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); showPhoto(photoIndex + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); showPhoto(photoIndex - 1); }
  });
  let touchStart = null;
  $('galleryImage').addEventListener('touchstart', (event) => {
    touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  $('galleryImage').addEventListener('touchend', (event) => {
    if (!touchStart || event.changedTouches.length !== 1) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) showPhoto(photoIndex + (dx < 0 ? 1 : -1));
    touchStart = null;
  }, { passive: true });
  $('galleryImage').addEventListener('touchcancel', () => { touchStart = null; }, { passive: true });

  const months = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const startOfToday = () => { const date = new Date(); date.setHours(0,0,0,0); return date; };
  const initialDate = startOfToday();
  let visibleYear = initialDate.getFullYear();
  let visibleMonth = initialDate.getMonth();
  let selectedDate = null;
  const toLocalISO = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const friendlyDate = (date) => `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
  const hideError = () => { $('formError').hidden = true; $('formError').textContent = ''; };
  const showError = (message) => { $('formError').textContent = message; $('formError').hidden = false; };

  function renderCalendar() {
    const today = startOfToday();
    const days = $('calendarDays');
    days.replaceChildren();
    $('monthYear').textContent = `${months[visibleMonth]} ${visibleYear}`;
    const offset = new Date(visibleYear, visibleMonth, 1).getDay();
    const totalDays = new Date(visibleYear, visibleMonth + 1, 0).getDate();
    for (let i = 0; i < offset; i++) {
      const spacer = document.createElement('span');
      spacer.setAttribute('aria-hidden', 'true');
      days.appendChild(spacer);
    }
    for (let number = 1; number <= totalDays; number++) {
      const date = new Date(visibleYear, visibleMonth, number);
      const iso = toLocalISO(date);
      const selected = !!selectedDate && iso === toLocalISO(selectedDate);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'calendar-day';
      button.textContent = number;
      button.dataset.date = iso;
      button.disabled = date < today;
      button.setAttribute('aria-label', friendlyDate(date));
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('is-selected', selected);
      button.classList.toggle('is-today', date.getTime() === today.getTime());
      if (date.getTime() === today.getTime()) button.setAttribute('aria-current', 'date');
      button.addEventListener('click', () => {
        selectedDate = date;
        $('requestPreview').hidden = true;
        $('dataSelecionada').value = iso;
        $('textoData').textContent = `Data desejada: ${friendlyDate(date)}`;
        hideError();
        renderCalendar();
        days.querySelector(`[data-date="${iso}"]`).focus({ preventScroll: true });
      });
      days.appendChild(button);
    }
    $('prevMonth').disabled = new Date(visibleYear, visibleMonth, 1) <= new Date(today.getFullYear(), today.getMonth(), 1);
  }
  $('prevMonth').addEventListener('click', () => {
    if ($('prevMonth').disabled) return;
    const previous = new Date(visibleYear, visibleMonth - 1, 1);
    visibleYear = previous.getFullYear(); visibleMonth = previous.getMonth(); renderCalendar();
  });
  $('nextMonth').addEventListener('click', () => {
    const next = new Date(visibleYear, visibleMonth + 1, 1);
    visibleYear = next.getFullYear(); visibleMonth = next.getMonth(); renderCalendar();
  });
  renderCalendar();

  document.querySelectorAll('[data-service]').forEach((link) => link.addEventListener('click', () => {
    $('requestPreview').hidden = true;
    $('servico').value = link.dataset.service;
    $('serviceStatus').textContent = `Selecionado: ${link.dataset.service}`;
    $('serviceStatus').hidden = false;
  }));
  $('servico').addEventListener('change', () => { $('serviceStatus').hidden = true; $('requestPreview').hidden = true; });

  const form = $('bookingForm');
  form.addEventListener('input', () => {
    hideError();
    $('nome').setCustomValidity('');
    $('telefone').setCustomValidity('');
    $('requestPreview').hidden = true;
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    hideError();
    const name = $('nome').value.trim();
    const phone = $('telefone').value.trim();
    if (name.length < 2) {
      $('nome').setCustomValidity('Informe seu nome para continuar.');
      $('nome').reportValidity(); return;
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phone && !/^(?:55)?\d{10,11}$/.test(phoneDigits)) {
      $('telefone').setCustomValidity('Informe o DDD e o número, ou deixe este campo vazio.');
      $('telefone').reportValidity(); return;
    }
    if (!selectedDate || selectedDate < startOfToday()) {
      showError('Escolha uma data a partir de hoje para continuar.');
      selectedDate = null;
      $('dataSelecionada').value = '';
      $('textoData').textContent = 'Toque em um dia para selecionar.';
      const today = startOfToday(); visibleYear = today.getFullYear(); visibleMonth = today.getMonth();
      renderCalendar();
      $('calendarDays').querySelector('button:not(:disabled)')?.focus();
      return;
    }
    const period = document.querySelector('input[name="periodo"]:checked')?.value;
    if (!['Manhã', 'Tarde'].includes(period)) {
      showError('Escolha se prefere o atendimento de manhã ou à tarde.');
      $('periodoManha').focus();
      return;
    }
    const message = [
      'Olá Michaele, tudo bem? ✨', '',
      'Gostaria de solicitar um agendamento.', '',
      `Nome: ${name}`,
      ...(phone ? [`Meu WhatsApp: ${phone}`] : []),
      `Serviço: ${$('servico').value}`,
      `Data desejada: ${friendlyDate(selectedDate)}`,
      `Período de preferência: ${period}`, '',
      'Quais horários você tem disponíveis nesse dia e período?'
    ].join('\n');
    if (whatsapp) {
      window.location.assign(`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`);
      return;
    }
    $('requestMessage').value = message;
    $('copyStatus').textContent = '';
    $('copyMessage').querySelector('span').textContent = 'Copiar mensagem';
    $('requestPreview').hidden = false;
    $('requestPreview').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    $('requestTitle').focus({ preventScroll: true });
  });

  $('copyMessage').addEventListener('click', async () => {
    let copied = false;
    try {
      await navigator.clipboard.writeText($('requestMessage').value);
      copied = true;
    } catch (_) {
      $('requestMessage').focus({ preventScroll: true });
      $('requestMessage').select();
      $('requestMessage').setSelectionRange(0, $('requestMessage').value.length);
      try { copied = document.execCommand('copy'); } catch (_) { /* Cópia manual disponível. */ }
    }
    $('copyMessage').querySelector('span').textContent = copied ? 'Mensagem copiada' : 'Tentar copiar novamente';
    $('copyStatus').textContent = copied ? 'Agora abra o Instagram e cole a mensagem no Direct.' : 'Selecione o texto acima e use a opção Copiar do seu celular.';
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      document.body.classList.toggle('booking-visible', entry.isIntersecting);
    }, { threshold: 0, rootMargin: '0px 0px -80px 0px' });
    observer.observe($('agendamento'));
  }
  document.addEventListener('focusin', (event) => {
    if (event.target.matches('input:not([type="hidden"]), select, textarea')) document.body.classList.add('form-editing');
  });
  document.addEventListener('focusout', () => {
    window.setTimeout(() => {
      if (!document.activeElement.matches('input:not([type="hidden"]), select, textarea')) document.body.classList.remove('form-editing');
    }, 0);
  });
})();
