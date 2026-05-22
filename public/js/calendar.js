/**
 * Calendar page client-side behavior.
 * Handles the inline create form, calendar form widgets, and AJAX month navigation
 * so users can move between months without losing scroll position.
 */
(function () {
  // Toggles the compact create-event panel without forcing a full page reload.
  function setupCalendarCreatePanel() {
    const panel = document.getElementById('calendarCreatePanel');
    const button = document.getElementById('toggleCalendarCreateButton');
    const buttonText = document.getElementById('toggleCalendarCreateButtonText');

    if (!panel || !button || button.dataset.calendarToggleReady === 'true') return;

    button.dataset.calendarToggleReady = 'true';

    button.addEventListener('click', function () {
      const isOpening = panel.hasAttribute('hidden');

      if (isOpening) {
        panel.removeAttribute('hidden');
      } else {
        panel.setAttribute('hidden', '');
      }

      button.setAttribute('aria-expanded', isOpening ? 'true' : 'false');

      if (buttonText) {
        buttonText.textContent = isOpening ? (window.calendarI18n && window.calendarI18n.hideForm ? window.calendarI18n.hideForm : 'Hide form') : (window.calendarI18n && window.calendarI18n.addEvent ? window.calendarI18n.addEvent : 'Add event');
      }
    });
  }

  // Initializes reusable form controls for both the main form and content loaded via AJAX.
  function setupCalendarFormControls(root) {
    const scope = root || document;

    scope.querySelectorAll('input[type="color"][name="color"]').forEach(function (input) {
      if (input.dataset.calendarColorReady === 'true') return;
      input.dataset.calendarColorReady = 'true';

      const wrapper = input.closest('.calendar-color-control');
      const preview = wrapper ? wrapper.querySelector('[data-calendar-color-preview]') : null;
      const value = wrapper ? wrapper.querySelector('[data-calendar-color-value]') : null;

      // Keeps the custom color preview synchronized with the native color input.
      function updateColorView() {
        const color = String(input.value || '#0d6efd').toLowerCase();
        if (wrapper) wrapper.style.setProperty('--selected-color', color);
        if (preview) preview.style.backgroundColor = color;
        if (value) value.textContent = color;
      }

      input.addEventListener('input', updateColorView);
      input.addEventListener('change', updateColorView);
      updateColorView();
    });

    scope.querySelectorAll('[data-calendar-recurring]').forEach(function (checkbox) {
      if (checkbox.dataset.calendarRecurringReady === 'true') return;
      checkbox.dataset.calendarRecurringReady = 'true';

      const form = checkbox.closest('form');
      const repeatSelect = form ? form.querySelector('select[name="recurring_type"]') : null;

      // Disables repeat options unless the event is explicitly marked as recurring.
      function updateRecurringState() {
        if (!repeatSelect) return;
        repeatSelect.disabled = !checkbox.checked;
        if (!checkbox.checked) repeatSelect.value = 'none';
      }

      checkbox.addEventListener('change', updateRecurringState);
      updateRecurringState();
    });

    scope.querySelectorAll('[data-calendar-all-day]').forEach(function (checkbox) {
      if (checkbox.dataset.calendarAllDayReady === 'true') return;
      checkbox.dataset.calendarAllDayReady = 'true';

      const form = checkbox.closest('form');
      const startTime = form ? form.querySelector('input[name="event_time"]') : null;
      const endTime = form ? form.querySelector('input[name="end_time"]') : null;

      // All-day events do not need start/end time values.
      function updateTimeState() {
        [startTime, endTime].forEach(function (input) {
          if (!input) return;
          input.disabled = checkbox.checked;
          if (checkbox.checked) input.value = '';
        });
      }

      checkbox.addEventListener('change', updateTimeState);
      updateTimeState();
    });
  }

  // Re-runs all calendar initializers after the calendar shell is replaced.
  function setupCalendarPage() {
    setupCalendarCreatePanel();
    setupCalendarFormControls(document);
  }

  // Replaces only the calendar shell for month navigation and preserves the current scroll.
  async function replaceCalendarContent(url, shouldPushState) {
    const currentShell = document.querySelector('.calendar-shell');
    if (!currentShell) {
      window.location.href = url;
      return;
    }

    const currentScrollY = window.scrollY;
    currentShell.classList.add('is-calendar-loading');

    try {
      const response = await fetch(url, {
        headers: {
          'X-Requested-With': 'fetch'
        }
      });

      if (!response.ok) {
        window.location.href = url;
        return;
      }

      const html = await response.text();
      const parser = new DOMParser();
      const nextDocument = parser.parseFromString(html, 'text/html');
      const nextShell = nextDocument.querySelector('.calendar-shell');

      if (!nextShell) {
        window.location.href = url;
        return;
      }

      currentShell.innerHTML = nextShell.innerHTML;

      if (shouldPushState) {
        window.history.pushState({ calendarAjax: true }, '', url);
      }

      window.scrollTo(0, currentScrollY);
      setupCalendarPage();
    } catch (error) {
      window.location.href = url;
    } finally {
      const updatedShell = document.querySelector('.calendar-shell');
      if (updatedShell) {
        updatedShell.classList.remove('is-calendar-loading');
      }
    }
  }

  // Intercepts internal calendar navigation links while leaving browser shortcuts untouched.
  document.addEventListener('click', function (event) {
    const link = event.target.closest('a[data-calendar-ajax]');
    if (!link) return;

    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank') return;

    event.preventDefault();
    replaceCalendarContent(link.href, true);
  });

  // Supports browser Back/Forward after AJAX calendar navigation.
  window.addEventListener('popstate', function () {
    replaceCalendarContent(window.location.href, false);
  });

  document.addEventListener('DOMContentLoaded', setupCalendarPage);
})();
