/**
 * Categories page client-side logic.
 * Handles filters, view switching, create form preview, modals,
 * color/icon/type pickers, and live search without scroll jumps.
 */

(function () {
  const createPanel = document.getElementById('categoryCreatePanel');
  const toggleCreateButton = document.getElementById('toggleCategoryCreateButton');
  const toggleCreateButtonText = document.getElementById('toggleCategoryCreateButtonText');

  const typeInput = document.getElementById('categoryType');
  const scopeInput = document.getElementById('categoryScope');
  const nameInput = document.getElementById('categoryName');
  const modeBadge = document.getElementById('categoryModeBadge');
  const scopeBadge = document.getElementById('categoryScopeBadge');

  const colorInput = document.getElementById('customColor');
  const colorValue = document.getElementById('categoryColorValue');
  const swatches = document.querySelectorAll('.category-create-tool-card .category-color-swatch');

  const iconButtons = document.querySelectorAll('[data-create-icon-grid] [data-icon-value]');
  const iconInput = document.getElementById('selectedCategoryIconInput');

  const iconPreview = document.getElementById('selectedCategoryIconPreview');
  const namePreview = document.getElementById('selectedCategoryNamePreview');
  const resetButton = document.getElementById('categoryFormResetButton');

  const toggleButtons = document.querySelectorAll('.form-toggle-btn');
  const tabButtons = document.querySelectorAll('[data-category-tab]');
  const tabPanels = document.querySelectorAll('[data-category-panel]');
  const searchTabInput = document.getElementById('categoriesSearchTabInput');
  const createRedirectTabInput = document.getElementById('categoryRedirectTabInput');
  const addCardButtons = document.querySelectorAll('[data-add-card-type]');
  const editIconGrids = document.querySelectorAll('[data-edit-icon-grid]');
  const editTypeGroups = document.querySelectorAll('[data-edit-type-group]');
  const editColorRows = document.querySelectorAll('[data-edit-color-row]');

  const categoryI18n = window.categoryI18n || {};

  // Reads translated UI text from the server-provided dictionary with safe fallbacks.
  function tr(key, fallback) {
    return categoryI18n[key] || fallback;
  }

  const viewButtons = document.querySelectorAll('[data-category-view]');
  const viewPanels = document.querySelectorAll('[data-category-view-panel]');

  const liveSearchForm = document.getElementById('categoriesLiveSearchForm');
  const liveSearchInput = document.getElementById('categoriesLiveSearchInput');
  const liveSearchClearButton = document.getElementById('categoriesLiveSearchClear');
  const liveSearchGroup = liveSearchInput ? liveSearchInput.closest('.categories-bootstrap-search') : null;
  const categoryItems = document.querySelectorAll('[data-category-item]');
  const categoryAddCards = document.querySelectorAll('[data-category-add-card]');

  // Converts category hex colors into transparent preview backgrounds.
  function hexToRgba(hex, alpha) {
    if (!hex) return 'rgba(108, 117, 125, ' + alpha + ')';

    const normalized = hex.replace('#', '');
    const value = normalized.length === 3
      ? normalized.split('').map(function (char) { return char + char; }).join('')
      : normalized;

    const r = parseInt(value.substring(0, 2), 16);
    const g = parseInt(value.substring(2, 4), 16);
    const b = parseInt(value.substring(4, 6), 16);

    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
  }

  // Switches between category type tabs and stores the selected tab for server redirects.
  function setActiveTab(targetTab) {
    tabButtons.forEach(function (item) {
      item.classList.toggle('is-active', item.dataset.categoryTab === targetTab);
    });

    tabPanels.forEach(function (panel) {
      panel.classList.toggle('is-active', panel.dataset.categoryPanel === targetTab);
    });

    if (searchTabInput) {
      searchTabInput.value = targetTab;
    }

    if (createRedirectTabInput) {
      createRedirectTabInput.value = targetTab;
    }
  }

  // Changes the visible category group without reloading the page.
  function setCategoryView(view) {
    const safeView = view === 'list' ? 'list' : 'cards';

    viewButtons.forEach(function (button) {
      button.classList.toggle('is-active', button.dataset.categoryView === safeView);
    });

    viewPanels.forEach(function (panel) {
      panel.hidden = panel.dataset.categoryViewPanel !== safeView;
    });

    try {
      window.localStorage.setItem('myBudgetCategoryView', safeView);
    } catch (error) {
      // Local storage is optional.
    }

    applyLiveCategorySearch();
  }

  function normalizeSearchValue(value) {
    return String(value || '').trim().toLowerCase();
  }

  // Filters category cards in place and hides add-cards while search results are active.
  function applyLiveCategorySearch() {
    if (!liveSearchInput) return;

    const query = normalizeSearchValue(liveSearchInput.value);
    const visibleByType = {
      expense: 0,
      income: 0
    };

    categoryAddCards.forEach(function (card) {
      card.hidden = Boolean(query);
    });

    categoryItems.forEach(function (item) {
      const panel = item.closest('[data-category-panel]');
      const type = panel ? panel.dataset.categoryPanel : '';
      const categoryName = normalizeSearchValue(item.dataset.categoryName);
      const isVisible = !query || categoryName.startsWith(query);

      item.hidden = !isVisible;

      if (isVisible && Object.prototype.hasOwnProperty.call(visibleByType, type)) {
        visibleByType[type] += 1;
      }
    });

    document.querySelectorAll('[data-category-filter-empty]').forEach(function (emptyState) {
      const type = emptyState.dataset.categoryFilterEmpty;
      const hasAnyCards = document.querySelectorAll('[data-category-panel="' + type + '"] [data-category-item]').length > 0;
      emptyState.hidden = !query || !hasAnyCards || visibleByType[type] > 0;
    });

    if (liveSearchGroup) {
      liveSearchGroup.classList.toggle('has-live-query', Boolean(query));
    }

    if (liveSearchClearButton) {
      liveSearchClearButton.hidden = !query;
    }
  }

  function clearLiveCategorySearch() {
    if (!liveSearchInput) return;

    liveSearchInput.value = '';
    applyLiveCategorySearch();
    liveSearchInput.focus({ preventScroll: true });
  }

  // Opens the create panel while preserving the user's current page context.
  function openCreatePanel() {
    if (!createPanel || !toggleCreateButton) return;

    createPanel.hidden = false;
    toggleCreateButton.setAttribute('aria-expanded', 'true');

    if (toggleCreateButtonText) {
      toggleCreateButtonText.textContent = tr('hideCategoryForm', 'Hide category form');
    }
  }

  function scrollToCreatePanel() {
    if (!createPanel) return;

    window.requestAnimationFrame(function () {
      createPanel.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  }

  function closeCreatePanel() {
    if (!createPanel || !toggleCreateButton) return;

    createPanel.hidden = true;
    toggleCreateButton.setAttribute('aria-expanded', 'false');

    if (toggleCreateButtonText) {
      toggleCreateButtonText.textContent = tr('addCategory', 'Add category');
    }
  }

  // Keeps custom toggle buttons and hidden form fields synchronized.
  function syncToggleGroup(target, value) {
    document.querySelectorAll('[data-toggle-target="' + target + '"]').forEach(function (button) {
      button.classList.toggle('is-active', button.dataset.toggleValue === value);
    });
  }

  function updateModeBadge() {
    if (modeBadge && typeInput) {
      modeBadge.textContent = typeInput.value === 'income' ? tr('income', 'Income') : tr('expense', 'Expense');
    }
  }

  function updateScopeBadge() {
    if (scopeBadge && scopeInput) {
      scopeBadge.textContent = scopeInput.value === 'family' ? tr('family', 'Family') : tr('personal', 'Personal');
    }
  }

  function updateNamePreview() {
    if (!namePreview || !nameInput) return;
    const trimmed = nameInput.value.trim();
    namePreview.textContent = trimmed || tr('newCategory', 'New category');
  }

  // Updates all color-dependent preview elements when a swatch or custom color changes.
  function updateColorPreview(color) {
    if (colorValue) {
      colorValue.textContent = color.toUpperCase();
    }

    if (iconPreview) {
      iconPreview.style.color = color;
      iconPreview.style.backgroundColor = hexToRgba(color, 0.16);
    }

    swatches.forEach(function (swatch) {
      swatch.classList.toggle(
        'is-active',
        swatch.dataset.colorValue.toLowerCase() === color.toLowerCase()
      );
    });
  }

  function updateIconPreview(icon) {
    if (iconInput) {
      iconInput.value = icon;
    }

    if (iconPreview) {
      iconPreview.innerHTML = '<i class="bi bi-' + icon + '"></i>';
    }

    iconButtons.forEach(function (button) {
      button.classList.toggle('is-active', button.dataset.iconValue === icon);
    });
  }

  // Opens lightweight page modals used by category edit/delete flows.
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.hidden = false;
    document.body.classList.add('category-modal-open');

    const firstInput = modal.querySelector('input[name="name"]');
    if (firstInput) {
      window.setTimeout(function () {
        firstInput.focus({ preventScroll: true });
      }, 0);
    }
  }

  function closeModal(modal) {
    if (!modal) return;

    modal.hidden = true;

    const hasOpenModal = Boolean(document.querySelector('.category-modal:not([hidden])'));
    if (!hasOpenModal) {
      document.body.classList.remove('category-modal-open');
    }
  }

  if (toggleCreateButton && createPanel) {
    toggleCreateButton.addEventListener('click', function () {
      if (createPanel.hidden) {
        openCreatePanel();
      } else {
        closeCreatePanel();
      }
    });
  }

  toggleButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      const target = button.dataset.toggleTarget;
      const value = button.dataset.toggleValue;

      if (target === 'type' && typeInput) {
        typeInput.value = value;
        updateModeBadge();
      }

      if (target === 'scope' && scopeInput) {
        scopeInput.value = value;
        updateScopeBadge();
      }

      syncToggleGroup(target, value);
    });
  });

  if (nameInput) {
    nameInput.addEventListener('input', updateNamePreview);
  }

  if (colorInput) {
    colorInput.addEventListener('input', function () {
      updateColorPreview(colorInput.value);
    });
  }

  swatches.forEach(function (swatch) {
    swatch.addEventListener('click', function () {
      if (colorInput) {
        colorInput.value = swatch.dataset.colorValue;
      }
      updateColorPreview(swatch.dataset.colorValue);
    });
  });

  iconButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      updateIconPreview(button.dataset.iconValue);
    });
  });

  tabButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      setActiveTab(button.dataset.categoryTab);
      applyLiveCategorySearch();
    });
  });

  viewButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      setCategoryView(button.dataset.categoryView);
    });
  });

  if (liveSearchForm) {
    liveSearchForm.addEventListener('submit', function (event) {
      event.preventDefault();
      applyLiveCategorySearch();

      if (liveSearchInput) {
        liveSearchInput.focus({ preventScroll: true });
      }
    });
  }

  if (liveSearchInput) {
    liveSearchInput.addEventListener('input', applyLiveCategorySearch);
  }

  if (liveSearchClearButton) {
    liveSearchClearButton.addEventListener('click', clearLiveCategorySearch);
  }

  addCardButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      const type = button.dataset.addCardType;
      openCreatePanel();
      scrollToCreatePanel();

      if (typeInput) {
        typeInput.value = type;
      }

      syncToggleGroup('type', type);
      updateModeBadge();

      if (nameInput) {
        window.setTimeout(function () {
          nameInput.focus({ preventScroll: true });
        }, 350);
      }
    });
  });

  document.querySelectorAll('[data-open-category-modal]').forEach(function (button) {
    button.addEventListener('click', function () {
      openModal(button.dataset.openCategoryModal);
    });
  });

  document.querySelectorAll('[data-close-category-modal]').forEach(function (button) {
    button.addEventListener('click', function () {
      closeModal(button.closest('.category-modal'));
    });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    const openModalElement = document.querySelector('.category-modal:not([hidden])');
    closeModal(openModalElement);
  });

  editTypeGroups.forEach(function (group) {
    const form = group.closest('form');
    const hiddenInput = form ? form.querySelector('[data-edit-type-input]') : null;
    const buttons = group.querySelectorAll('[data-edit-type-value]');

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        if (hiddenInput) {
          hiddenInput.value = button.dataset.editTypeValue;
        }

        buttons.forEach(function (item) {
          item.classList.toggle('is-active', item === button);
        });
      });
    });
  });

  editIconGrids.forEach(function (grid) {
    const form = grid.closest('form');
    const hiddenInput = form ? form.querySelector('[data-edit-icon-input]') : null;
    const buttons = grid.querySelectorAll('[data-edit-icon-value]');

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        if (hiddenInput) {
          hiddenInput.value = button.dataset.editIconValue;
        }

        buttons.forEach(function (item) {
          item.classList.toggle('is-active', item === button);
        });
      });
    });
  });

  editColorRows.forEach(function (row) {
    const colorInput = row.querySelector('[data-edit-color-input]');
    const swatchButtons = row.querySelectorAll('[data-color-value]');

    // Keeps each edit form's color swatches aligned with its hidden color input.
    function setActiveColor(color) {
      swatchButtons.forEach(function (button) {
        button.classList.toggle(
          'is-active',
          button.dataset.colorValue.toLowerCase() === String(color).toLowerCase()
        );
      });
    }

    swatchButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        if (colorInput) {
          colorInput.value = button.dataset.colorValue;
        }
        setActiveColor(button.dataset.colorValue);
      });
    });

    if (colorInput) {
      colorInput.addEventListener('input', function () {
        setActiveColor(colorInput.value);
      });
    }
  });

  if (resetButton) {
    resetButton.addEventListener('click', function () {
      window.setTimeout(function () {
        if (typeInput) typeInput.value = 'expense';
        if (scopeInput) scopeInput.value = 'personal';
        if (colorInput) colorInput.value = '#ef4444';
        if (nameInput) nameInput.value = '';

        syncToggleGroup('type', 'expense');
        syncToggleGroup('scope', 'personal');
        updateModeBadge();
        updateScopeBadge();
        updateNamePreview();
        updateColorPreview('#ef4444');
        updateIconPreview('cart3');
      }, 0);
    });
  }

  if (typeInput) syncToggleGroup('type', typeInput.value);
  if (scopeInput) syncToggleGroup('scope', scopeInput.value);
  updateModeBadge();
  updateScopeBadge();
  updateNamePreview();

  if (colorInput) {
    updateColorPreview(colorInput.value);
  }

  if (iconInput) {
    updateIconPreview(iconInput.value);
  }

  (function initActiveTab() {
    const urlParams = new URLSearchParams(window.location.search);
    const requestedTab = urlParams.get('tab');
    const availableTabs = Array.from(tabButtons).map(function (button) {
      return button.dataset.categoryTab;
    });

    const fallbackTab = availableTabs.indexOf('expense') !== -1
      ? 'expense'
      : availableTabs[0];

    const safeTab = availableTabs.indexOf(requestedTab) !== -1
      ? requestedTab
      : fallbackTab;

    if (safeTab) {
      setActiveTab(safeTab);
    }
  })();

  (function initCategoryView() {
    let savedView = 'cards';

    try {
      savedView = window.localStorage.getItem('myBudgetCategoryView') || 'cards';
    } catch (error) {
      savedView = 'cards';
    }

    setCategoryView(savedView === 'list' ? 'list' : 'cards');
  })();

  applyLiveCategorySearch();
})();
