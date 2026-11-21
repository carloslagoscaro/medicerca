const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

export function safeUrl(value) {
  try {
    const url = new URL(String(value ?? ''), window.location.href);
    if (url.protocol !== 'https:') return null;
    return url.href;
  } catch {
    return null;
  }
}

export function icon(name, extraClass = '') {
  return `<svg class="icon ${extraClass}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
}

const clpFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0
});

const unitFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 1
});

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  day: 'numeric',
  month: 'short'
});

const dateTimeFormatter = new Intl.DateTimeFormat('es-CL', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit'
});

const timeFormatter = new Intl.DateTimeFormat('es-CL', {
  hour: '2-digit',
  minute: '2-digit'
});

export function formatClp(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return clpFormatter.format(number);
}

export function formatUnitPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return unitFormatter.format(number);
}

export function formatDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  return dateFormatter.format(date).replace(/\.$/, '');
}

export function formatDateTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  return dateTimeFormatter.format(date).replace(/\.$/, '');
}

export function formatTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  return timeFormatter.format(date);
}

export function unitNoun(unit) {
  if (!unit) return 'unidad';
  if (unit === 'dosis' || unit === 'ml' || unit === 'g') return unit === 'g' ? 'gramo' : unit;
  return unit.replace(/s$/, '');
}

export function packText(count, unit) {
  if (!count) return 'Caja';
  return `${count} ${unit || 'unidades'}`;
}

const CATEGORY_STYLES = {
  'Dolor y fiebre': ['#ffe6dd', '#98412c'],
  Antiinflamatorio: ['#ffebd0', '#855013'],
  Antibióticos: ['#e3ecff', '#2b4f9e'],
  Digestivo: ['#e7f4df', '#3b6b29'],
  Cardiovascular: ['#ffe4e7', '#973a48'],
  Colesterol: ['#ede6ff', '#5a3a9e'],
  Diabetes: ['#dff3ef', '#226b63'],
  Tiroides: ['#f2e9db', '#765329'],
  'Salud mental': ['#e9e9fc', '#4b4a92'],
  Alergias: ['#eaf3d8', '#526b18'],
  Respiratorio: ['#e0f0f7', '#24627a'],
  Vitaminas: ['#fff2cf', '#82600a'],
  Cuidado: ['#f0e9e1', '#6b5745']
};

export function categoryStyle(category) {
  const [tint, ink] = CATEGORY_STYLES[category] || ['#eef4dc', '#4f641d'];
  return `--tint:${tint};--icon-ink:${ink}`;
}

export function chainDot(chain) {
  const color = chain?.color || '#7a8492';
  return `<span class="chain-dot" style="--chain-color:${escapeHtml(color)}" aria-hidden="true"></span>`;
}

export function directionUrl(lat, lon) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lon}`)}`;
}

let toastCount = 0;

export function toast(message, options = {}) {
  const root = document.getElementById('toast-root');
  if (!root) return () => {};
  while (root.children.length >= 2) root.firstElementChild?.remove();

  const type = options.type || 'info';
  const element = document.createElement('div');
  element.className = `toast${type === 'error' ? ' is-error' : ''}`;
  element.setAttribute('role', type === 'error' ? 'alert' : 'status');

  const iconName = type === 'error' ? 'alert' : type === 'success' ? 'check' : 'info';
  element.innerHTML = `${icon(iconName)}<span class="toast-text"></span>`;
  element.querySelector('.toast-text').textContent = message;

  let timeout;
  const dismiss = () => {
    clearTimeout(timeout);
    element.remove();
  };

  if (options.actionLabel && typeof options.onAction === 'function') {
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'toast-action';
    action.textContent = options.actionLabel;
    action.addEventListener('click', () => {
      dismiss();
      options.onAction();
    });
    element.appendChild(action);
  }

  root.appendChild(element);
  toastCount += 1;
  const duration = options.duration ?? (options.actionLabel ? 7000 : 4200);
  timeout = window.setTimeout(dismiss, duration);
  return dismiss;
}

let sheetSequence = 0;
let lastFocused = null;

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function openSheet({
  kicker = '',
  title,
  sub = '',
  body = '',
  footer = '',
  onMount,
  onClose,
  closeOnBackdrop = true
}) {
  sheetSequence += 1;
  const titleId = `sheet-title-${sheetSequence}`;
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  backdrop.innerHTML = `
    <section class="sheet" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
      <header class="sheet-head">
        <div class="sheet-head-text">
          ${kicker ? `<span class="sheet-kicker">${escapeHtml(kicker)}</span>` : ''}
          <h2 class="sheet-title" id="${titleId}">${escapeHtml(title || '')}</h2>
          ${sub ? `<p class="sheet-sub">${escapeHtml(sub)}</p>` : ''}
        </div>
        <button class="sheet-close" type="button" aria-label="Cerrar">${icon('close')}</button>
      </header>
      <div class="sheet-body"></div>
      ${footer ? '<footer class="sheet-foot"></footer>' : ''}
    </section>
  `;

  const sheetBody = backdrop.querySelector('.sheet-body');
  sheetBody.innerHTML = body;
  const footerElement = backdrop.querySelector('.sheet-foot');
  if (footerElement) footerElement.innerHTML = footer;

  lastFocused = document.activeElement;
  document.body.classList.add('has-overlay');
  document.getElementById('overlay-root')?.appendChild(backdrop);

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKeyDown);
    backdrop.remove();
    if (!document.querySelector('.sheet-backdrop')) document.body.classList.remove('has-overlay');
    if (lastFocused instanceof HTMLElement) lastFocused.focus({ preventScroll: true });
    onClose?.();
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusables = [...backdrop.querySelectorAll(FOCUSABLE)].filter(
      (element) => element.offsetParent !== null || element === document.activeElement
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  backdrop.querySelector('.sheet-close')?.addEventListener('click', close);
  if (closeOnBackdrop) {
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) close();
    });
  }
  document.addEventListener('keydown', onKeyDown);

  requestAnimationFrame(() => {
    const isVisible = (element) =>
      element.offsetParent !== null || element === document.activeElement;
    const preferred = [...backdrop.querySelectorAll('[data-autofocus]')].find(isVisible);
    const firstField = [...backdrop.querySelectorAll('.sheet-body input, .sheet-body select, .sheet-body button')].find(
      isVisible
    );
    const target = preferred || firstField || backdrop.querySelector('.sheet-close');
    target?.focus({ preventScroll: true });
  });

  onMount?.(backdrop.querySelector('.sheet'), close);

  return { el: backdrop, sheet: backdrop.querySelector('.sheet'), body: sheetBody, footer: footerElement, close };
}

export function setButtonLoading(button, loading, label = 'Actualizando…') {
  if (!button) return;
  if (loading) {
    if (!button.dataset.idleHtml) button.dataset.idleHtml = button.innerHTML;
    button.disabled = true;
    button.classList.add('is-loading');
    button.innerHTML = `${icon('refresh', 'spin')}${
      button.classList.contains('icon-btn') ? '' : `<span>${escapeHtml(label)}</span>`
    }`;
  } else {
    button.disabled = false;
    button.classList.remove('is-loading');
    if (button.dataset.idleHtml) {
      button.innerHTML = button.dataset.idleHtml;
      delete button.dataset.idleHtml;
    }
  }
}

export function debounce(fn, delay = 160) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

export function skeletonLines(widths = ['82%', '58%', '70%']) {
  return `<span class="skeleton-stack">${widths
    .map((width) => `<span class="skeleton" style="width:${width}"></span>`)
    .join('')}</span>`;
}
