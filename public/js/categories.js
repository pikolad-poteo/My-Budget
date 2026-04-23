/**
 * Categories page client-side logic.
 * Handles tab switching, create panel toggle, color and icon pickers,
 * live preview updates, form reset, and edit icon selection.
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
  const swatches = document.querySelectorAll('.category-color-swatch');

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

  if (!toggleCreateButton || !createPanel) {
    return;
  }

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

  function openCreatePanel() {
    createPanel.hidden = false;
    toggleCreateButton.setAttribute('aria-expanded', 'true');

    if (toggleCreateButtonText) {
      toggleCreateButtonText.textContent = 'Hide category form';
    }
  }

  function closeCreatePanel() {
    createPanel.hidden = true;
    toggleCreateButton.setAttribute('aria-expanded', 'false');

    if (toggleCreateButtonText) {
      toggleCreateButtonText.textContent = 'Add category';
    }
  }

  function syncToggleGroup(target, value) {
    document.querySelectorAll('[data-toggle-target="' + target + '"]').forEach(function (button) {
      button.classList.toggle('is-active', button.dataset.toggleValue === value);
    });
  }

  function updateModeBadge() {
    if (modeBadge && typeInput) {
      modeBadge.textContent = typeInput.value === 'income' ? 'Income' : 'Expense';
    }
  }

  function updateScopeBadge() {
    if (scopeBadge && scopeInput) {
      scopeBadge.textContent = scopeInput.value === 'family' ? 'Family' : 'Personal';
    }
  }

  function updateNamePreview() {
    if (!namePreview || !nameInput) return;
    const trimmed = nameInput.value.trim();
    namePreview.textContent = trimmed || 'New category';
  }

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

  toggleCreateButton.addEventListener('click', function () {
    if (createPanel.hidden) {
      openCreatePanel();
    } else {
      closeCreatePanel();
    }
  });

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
    });
  });

  addCardButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      const type = button.dataset.addCardType;
      openCreatePanel();

      if (typeInput) {
        typeInput.value = type;
      }

      syncToggleGroup('type', type);
      updateModeBadge();

      if (nameInput) {
        nameInput.focus();
      }
    });
  });

  editIconGrids.forEach(function (grid) {
    const hiddenInput = grid.parentElement.querySelector('[data-edit-icon-input]');
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
})();