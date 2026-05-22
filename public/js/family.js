/**
 * Family page client-side behavior.
 * Preserves scroll after member actions and manages the interactive activity feed.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Family actions post back to the server, so the current scroll position is restored after reload.
  const scrollStorageKey = 'myBudgetFamilyScrollY';
  const storedScrollY = sessionStorage.getItem(scrollStorageKey);

  if (storedScrollY && !window.location.hash) {
    sessionStorage.removeItem(scrollStorageKey);
    requestAnimationFrame(() => {
      window.scrollTo({ top: Number(storedScrollY) || 0, behavior: 'auto' });
    });
  }

  document.querySelectorAll('form.family-preserve-scroll-form').forEach((form) => {
    form.addEventListener('submit', () => {
      sessionStorage.setItem(scrollStorageKey, String(window.scrollY || window.pageYOffset || 0));
    });
  });

  // The family avatar card opens the hidden file input and submits once a file is selected.
  const avatarTrigger = document.getElementById('familyAvatarTrigger');
  const avatarInput = document.getElementById('familyAvatarInput');
  const avatarForm = document.getElementById('familyAvatarForm');

  if (avatarTrigger && avatarInput && avatarForm) {
    avatarTrigger.addEventListener('click', () => avatarInput.click());
    avatarInput.addEventListener('change', () => {
      if (avatarInput.files && avatarInput.files.length > 0) {
        sessionStorage.setItem(scrollStorageKey, String(window.scrollY || window.pageYOffset || 0));
        avatarForm.submit();
      }
    });
  }

  const activityPanel = document.getElementById('memberActivityPanel');
  const activityTitle = document.getElementById('familyActivityTitle');
  const toggleButton = document.getElementById('toggleFamilyActivityButton');
  const tools = document.getElementById('familyActivityTools');
  const sortActions = document.getElementById('familySortActions');
  const list = document.getElementById('familyActivityList');
  const userFilter = document.getElementById('activityUserFilter');
  const sortButtons = document.querySelectorAll('[data-activity-sort-button]');
  const memberActivityButtons = document.querySelectorAll('[data-member-activity-button]');

  if (!list) return;

  const familyI18n = window.familyI18n || {};
  const defaultTitle = activityTitle ? activityTitle.textContent : (familyI18n.latestUpdates || 'Latest household updates');
  const getItems = () => Array.from(list.querySelectorAll('.family-activity-item'));

  // Applies filtering, sorting, and collapsed/expanded visibility to the activity feed.
  function applyActivityView() {
    const viewMode = list.dataset.viewMode || 'default';
    const expanded = viewMode === 'expanded';
    const hidden = viewMode === 'hidden';

    if (activityPanel) {
      activityPanel.classList.toggle('is-activity-hidden', hidden);
    }
    const selectedUser = userFilter ? userFilter.value : 'all';
    const selectedSort = list.dataset.sort || 'desc';
    const items = getItems();

    let visibleIndex = 0;

    items
      .sort((a, b) => {
        const dateA = Number(a.dataset.date || 0);
        const dateB = Number(b.dataset.date || 0);
        return selectedSort === 'asc' ? dateA - dateB : dateB - dateA;
      })
      .forEach((item) => {
        list.appendChild(item);
        const matchesUser = selectedUser === 'all' || item.dataset.actorId === selectedUser;
        const shouldShow = !hidden && matchesUser && (expanded || visibleIndex < 3);

        item.classList.toggle('d-none', !shouldShow);
        if (matchesUser) visibleIndex += 1;
      });
  }

  // Controls whether activity is hidden, collapsed to the latest items, or fully expanded.
  function setActivityMode(nextMode) {
    const mode = nextMode || 'default';
    const expanded = mode === 'expanded';

    list.dataset.viewMode = mode;
    list.dataset.expanded = expanded ? 'true' : 'false';
    list.dataset.collapsed = mode === 'hidden' ? 'true' : 'false';

    if (toggleButton) {
      toggleButton.classList.toggle('is-active', expanded);
      toggleButton.classList.toggle('btn-primary', expanded);
      toggleButton.classList.toggle('btn-secondary', !expanded);
      toggleButton.textContent = expanded ? (familyI18n.hideAll || 'Hide all') : (familyI18n.showAll || 'Show all');
      toggleButton.setAttribute('aria-expanded', String(expanded));
    }

    if (tools) tools.classList.toggle('d-none', !expanded);
    if (sortActions) sortActions.classList.toggle('d-none', !expanded);
    if (activityPanel) activityPanel.classList.toggle('is-activity-hidden', mode === 'hidden');

    applyActivityView();
  }

  // Keeps the legacy expand button behavior mapped to the newer activity view modes.
  function setExpandedState(nextExpanded) {
    setActivityMode(nextExpanded ? 'expanded' : 'hidden');
  }

  sortButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const nextSort = button.dataset.activitySortButton || 'desc';
      list.dataset.sort = nextSort;

      sortButtons.forEach((sortButton) => {
        const isActive = sortButton.dataset.activitySortButton === nextSort;
        sortButton.classList.toggle('is-active', isActive);
        sortButton.classList.toggle('btn-primary', isActive);
        sortButton.classList.toggle('btn-secondary', !isActive);
      });

      applyActivityView();
    });
  });

  if (toggleButton) {
    toggleButton.addEventListener('click', () => {
      const isExpanded = (list.dataset.viewMode || 'default') === 'expanded';
      setActivityMode(isExpanded ? 'hidden' : 'expanded');
    });
  }

  if (userFilter) {
    userFilter.addEventListener('change', () => {
      if (activityTitle) activityTitle.textContent = defaultTitle || familyI18n.latestUpdates || 'Latest household updates';
      applyActivityView();
    });
  }

  memberActivityButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      button.blur();
      const memberId = button.dataset.memberId || 'all';
      const memberName = button.dataset.memberName || familyI18n.member || 'Member';

      if (userFilter) userFilter.value = memberId;
      if (activityTitle) activityTitle.textContent = defaultTitle || familyI18n.latestUpdates || 'Latest household updates';

      setExpandedState(true);

      if (activityPanel) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            activityPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        });
      }
    });
  });

  if (window.location.hash === '#memberActivityPanel' && activityPanel) {
    requestAnimationFrame(() => {
      activityPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  if (!list.dataset.viewMode) {
    list.dataset.viewMode = list.dataset.expanded === 'true' ? 'expanded' : 'default';
  }

  applyActivityView();
});
