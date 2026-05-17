document.addEventListener('DOMContentLoaded', function () {
    const transactionI18n = window.transactionI18n || {};


    function initTransactionCreateToggle() {
      const panel = document.getElementById('transactionCreatePanel');
      const button = document.getElementById('toggleTransactionCreateButton');
      const buttonText = document.getElementById('toggleTransactionCreateButtonText');

      if (!panel || !button) return;

      function setCreatePanelOpen(isOpen, shouldScroll) {
        if (isOpen) {
          panel.removeAttribute('hidden');
        } else {
          panel.setAttribute('hidden', '');
        }

        button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

        if (buttonText) {
          buttonText.textContent = isOpen
            ? (transactionI18n.hideForm || 'Hide form')
            : (transactionI18n.addTransaction || 'Add transaction');
        }

        if (isOpen && shouldScroll) {
          panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

          const amountInput = panel.querySelector('[data-transaction-amount-input]');
          if (amountInput) {
            setTimeout(function () {
              amountInput.focus({ preventScroll: true });
            }, 250);
          }
        }
      }

      button.addEventListener('click', function () {
        setCreatePanelOpen(panel.hasAttribute('hidden'), false);
      });

      const params = new URLSearchParams(window.location.search);
      if (params.get('create') === '1') {
        setCreatePanelOpen(true, false);

        window.history.replaceState({}, '', window.location.pathname + window.location.search);

        const amountInput = panel.querySelector('[data-transaction-amount-input]');
        window.setTimeout(function () {
          panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

          if (amountInput) {
            window.setTimeout(function () {
              amountInput.focus({ preventScroll: true });
            }, 420);
          }
        }, 120);
      }
    }

    function initTransactionForm() {
      const form = document.querySelector('.transaction-form');
      if (!form) return;

      const typeInput = form.querySelector('[data-transaction-type-input]');
      const typeButtons = Array.from(form.querySelectorAll('[data-transaction-type-option]'));
      const categorySelect = form.querySelector('[data-transaction-category-select]');
      const categoryButtons = Array.from(form.querySelectorAll('[data-category-option]'));

      if (!typeInput || !categorySelect || !categoryButtons.length) return;

      function applyActiveCategory() {
        const selectedValue = categorySelect.value;

        categoryButtons.forEach((button) => {
          const isActive = button.dataset.id === selectedValue;
          button.classList.toggle('is-active', isActive);
        });
      }

      function filterCategoriesByType(type) {
        categoryButtons.forEach((button) => {
          const matches = button.dataset.type === type;
          const wrap = button.closest('[data-category-option-wrap]');

          button.hidden = !matches;
          if (wrap) wrap.hidden = !matches;
        });

        const currentOption = categorySelect.options[categorySelect.selectedIndex];

        if (!currentOption || currentOption.dataset.type !== type) {
          const nextOption = Array.from(categorySelect.options).find((option) => option.dataset.type === type);

          if (nextOption) {
            categorySelect.value = nextOption.value;
          }
        }

        applyActiveCategory();
      }

      typeButtons.forEach((button) => {
        button.addEventListener('click', function () {
          const value = this.dataset.value;
          typeInput.value = value;

          typeButtons.forEach((item) => item.classList.toggle('is-active', item === this));
          filterCategoriesByType(value);
        });
      });

      categoryButtons.forEach((button) => {
        button.addEventListener('click', function () {
          categorySelect.value = this.dataset.id;

          const selectedOption = categorySelect.options[categorySelect.selectedIndex];

          if (selectedOption && selectedOption.dataset.type !== typeInput.value) {
            typeInput.value = selectedOption.dataset.type;

            typeButtons.forEach((item) => {
              item.classList.toggle('is-active', item.dataset.value === selectedOption.dataset.type);
            });
          }

          filterCategoriesByType(typeInput.value);
        });
      });

      categorySelect.addEventListener('change', function () {
        const selectedOption = categorySelect.options[categorySelect.selectedIndex];

        if (selectedOption && selectedOption.dataset.type !== typeInput.value) {
          typeInput.value = selectedOption.dataset.type;

          typeButtons.forEach((item) => {
            item.classList.toggle('is-active', item.dataset.value === selectedOption.dataset.type);
          });
        }

        filterCategoriesByType(typeInput.value);
      });

      filterCategoriesByType(typeInput.value);
    }

    function initAdvancedFilters() {
      const advancedToggle = document.querySelector('[data-advanced-filters-toggle]');
      const advancedPanel = document.querySelector('[data-advanced-filters-panel]');

      if (!advancedToggle || !advancedPanel) return;

      advancedToggle.addEventListener('click', function () {
        advancedPanel.classList.toggle('is-open');
        advancedToggle.classList.toggle('is-open');

        const expanded = advancedPanel.classList.contains('is-open');
        advancedToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      });
    }


    function clearTransactionModalState() {
      const openModal = document.querySelector('.transaction-edit-modal.show');

      if (openModal && window.bootstrap && window.bootstrap.Modal) {
        const modalInstance = window.bootstrap.Modal.getInstance(openModal);
        if (modalInstance) {
          modalInstance.hide();
        }
      }

      document.querySelectorAll('.modal-backdrop').forEach((backdrop) => backdrop.remove());
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('padding-right');
    }

    async function replaceHistoryZone(url) {
      const historyZone = document.querySelector('[data-transactions-history-zone]');

      if (!historyZone) {
        window.location.href = url;
        return;
      }

      historyZone.classList.add('is-loading');

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
        const nextHistoryZone = nextDocument.querySelector('[data-transactions-history-zone]');

        if (!nextHistoryZone) {
          window.location.href = url;
          return;
        }

        clearTransactionModalState();
        historyZone.innerHTML = nextHistoryZone.innerHTML;
        window.history.pushState({}, '', url);

        initAdvancedFilters();
        initLiveHistoryControls();
      } catch (error) {
        window.location.href = url;
      } finally {
        historyZone.classList.remove('is-loading');
      }
    }

    function buildFilterUrl(form) {
      const formData = new FormData(form);
      const params = new URLSearchParams();

      formData.forEach((value, key) => {
        const cleanValue = String(value || '').trim();

        if (!cleanValue) return;
        if (cleanValue === 'all') return;

        params.set(key, cleanValue);
      });

      if (!params.has('view')) {
        params.set('view', 'date');
      }

      const queryString = params.toString();

      return queryString ? `/transactions?${queryString}` : '/transactions?view=date';
    }

    async function submitHistoryMutationForm(form) {
      const historyZone = document.querySelector('[data-transactions-history-zone]');
      if (!historyZone) return;

      const action = form.getAttribute('action');
      const method = form.getAttribute('method') || 'POST';
      const formData = new FormData(form);
      const body = new URLSearchParams();

      formData.forEach((value, key) => {
        body.append(key, value);
      });

      historyZone.classList.add('is-loading');

      try {
        const response = await fetch(action, {
          method,
          body,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'X-Requested-With': 'fetch'
          },
          redirect: 'follow'
        });

        if (!response.ok) {
          form.submit();
          return;
        }

        const html = await response.text();
        const finalUrl = response.url || window.location.href;

        const parser = new DOMParser();
        const nextDocument = parser.parseFromString(html, 'text/html');
        const nextHistoryZone = nextDocument.querySelector('[data-transactions-history-zone]');

        if (!nextHistoryZone) {
          form.submit();
          return;
        }

        clearTransactionModalState();
        historyZone.innerHTML = nextHistoryZone.innerHTML;
        window.history.pushState({}, '', finalUrl);

        initAdvancedFilters();
        initLiveHistoryControls();
      } catch (error) {
        form.submit();
      } finally {
        historyZone.classList.remove('is-loading');
      }
    }

    function initLiveHistoryControls() {
      const historyZone = document.querySelector('[data-transactions-history-zone]');
      if (!historyZone) return;

      const links = Array.from(historyZone.querySelectorAll('[data-history-link]'));

      links.forEach((link) => {
        link.addEventListener('click', function (event) {
          event.preventDefault();

          const url = this.getAttribute('href');
          if (!url) return;

          replaceHistoryZone(url);
        });
      });

      const filterForm = historyZone.querySelector('[data-history-form]');

      if (filterForm) {
        filterForm.addEventListener('submit', function (event) {
          event.preventDefault();

          const url = buildFilterUrl(filterForm);
          replaceHistoryZone(url);
        });
      }

      const mutationForms = Array.from(historyZone.querySelectorAll('[data-history-mutation-form]'));

      mutationForms.forEach((form) => {
        form.addEventListener('submit', function (event) {
          if (event.defaultPrevented) return;

          event.preventDefault();
          submitHistoryMutationForm(form);
        });
      });
    }

    window.addEventListener('popstate', function () {
      window.location.reload();
    });

    initTransactionCreateToggle();
    initTransactionForm();
    initAdvancedFilters();
    initLiveHistoryControls();
  });
