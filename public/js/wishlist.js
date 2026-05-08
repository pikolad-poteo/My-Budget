document.addEventListener('DOMContentLoaded', function () {
  const folderStateKey = 'wishlistFoldersOpen';
  let liveSearchTimer = null;
  let getRequestController = null;
  let lastSubmitter = null;
  let isReplacingWishlist = false;

  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  function getWishlistShell() {
    return document.querySelector('.wishlist-shell');
  }

  function isWishlistUrl(url) {
    return url && url.origin === window.location.origin && url.pathname.startsWith('/wishlist');
  }

  function normalizeUrl(value) {
    return new URL(value || window.location.href, window.location.origin);
  }

  function setLoading(isLoading) {
    const shell = getWishlistShell();
    if (shell) shell.classList.toggle('wishlist-is-loading', isLoading);
  }

  function getCreatePanel() {
    return document.getElementById('wishlistCreatePanel');
  }

  function closeWishlistModals() {
    document.querySelectorAll('.wishlist-modal').forEach(function (modal) {
      modal.setAttribute('hidden', '');
    });
    document.body.classList.remove('wishlist-modal-open');
  }

  function openWishlistModal(modal) {
    if (!modal) return;

    closeCreatePanel();
    modal.removeAttribute('hidden');
    document.body.classList.add('wishlist-modal-open');

    const focusTarget = modal.querySelector('input:not([type="hidden"]), textarea, select, button');
    if (focusTarget) focusTarget.focus({ preventScroll: true });
  }

  function openCreatePanel() {
    const panel = getCreatePanel();
    const button = document.getElementById('toggleWishlistCreateButton');
    const buttonText = document.getElementById('toggleWishlistCreateButtonText');

    if (!panel) return;

    closeWishlistModals();
    panel.removeAttribute('hidden');

    if (button) button.setAttribute('aria-expanded', 'true');
    if (buttonText) buttonText.textContent = 'Hide form';

    const firstInput = panel.querySelector('input[name="title"]');
    if (firstInput) firstInput.focus({ preventScroll: true });
  }

  function closeCreatePanel() {
    const panel = getCreatePanel();
    const button = document.getElementById('toggleWishlistCreateButton');
    const buttonText = document.getElementById('toggleWishlistCreateButtonText');

    if (panel) panel.setAttribute('hidden', '');
    if (button) button.setAttribute('aria-expanded', 'false');
    if (buttonText) buttonText.textContent = 'Add item';
  }

  function scrollToCreatePanel() {
    const panel = getCreatePanel();
    const target = panel ? panel.closest('.wishlist-overview-panel') || panel : document.querySelector('.wishlist-shell');

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  }

  function openCreatePanelAtTop(folderName) {
    openCreatePanel();

    const folderSelect = document.getElementById('wishlistFolder');
    if (folderSelect && typeof folderName === 'string') {
      folderSelect.value = folderName;
    }

    scrollToCreatePanel();
  }

  function setFoldersPanelState(isOpen) {
    const foldersPanel = document.getElementById('wishlistFoldersPanel');
    const foldersButton = document.getElementById('toggleWishlistFoldersButton');
    const foldersText = document.getElementById('toggleWishlistFoldersText');

    if (!foldersPanel) return;

    foldersPanel.toggleAttribute('hidden', !isOpen);
    if (foldersButton) foldersButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (foldersText) foldersText.textContent = isOpen ? 'Hide folders' : 'Show folders';

    sessionStorage.setItem(folderStateKey, isOpen ? '1' : '0');
  }

  function setPreviewContent(preview, src, label) {
    if (!preview) return;

    if (src) {
      preview.innerHTML = '<img src="' + src.replace(/"/g, '&quot;') + '" alt="Photo preview" />';
    } else {
      preview.innerHTML = '<i class="bi bi-image"></i><span>' + (label || preview.dataset.emptyLabel || 'Preview') + '</span>';
    }
  }

  function initImagePreviews() {
    document.querySelectorAll('[data-current-src]').forEach(function (preview) {
      if (!preview.querySelector('img')) {
        setPreviewContent(preview, preview.dataset.currentSrc || '', preview.dataset.emptyLabel || 'No image');
      }
    });
  }

  function initFoldersState() {
    const foldersPanel = document.getElementById('wishlistFoldersPanel');
    const savedState = sessionStorage.getItem(folderStateKey);

    if (foldersPanel && savedState !== null) {
      setFoldersPanelState(savedState === '1');
    }
  }

  function initLiveSearchState() {
    const searchInput = document.getElementById('wishlistLiveSearchInput');
    const clearButton = document.getElementById('wishlistLiveSearchClear');
    const group = searchInput ? searchInput.closest('.wishlist-bootstrap-search') : null;
    const hasQuery = Boolean(searchInput && searchInput.value.trim());

    if (group) group.classList.toggle('has-live-query', hasQuery);
    if (clearButton) clearButton.toggleAttribute('hidden', !hasQuery);
  }

  function initDynamicWishlistUi() {
    initFoldersState();
    initImagePreviews();
    initLiveSearchState();
  }

  function buildFormRequest(form, submitter) {
    const method = (form.method || 'GET').toUpperCase();
    const url = normalizeUrl(form.action || window.location.href);
    const formData = new FormData(form);

    if (submitter && submitter.name) {
      formData.set(submitter.name, submitter.value || '');
    }

    if (method === 'GET') {
      url.search = new URLSearchParams(formData).toString();
      return {
        url,
        options: { method: 'GET' },
        shouldUpdateHistory: true,
        shouldCloseModals: false
      };
    }

    return {
      url,
      options: {
        method,
        body: formData,
        credentials: 'same-origin',
        headers: { 'X-Requested-With': 'fetch' }
      },
      shouldUpdateHistory: true,
      shouldCloseModals: true
    };
  }

  function hardReloadWithScroll(url) {
    sessionStorage.setItem('wishlistScrollTop', String(window.scrollY || 0));
    window.location.href = url.toString();
  }

  function restoreScrollAfterHardReload() {
    const savedScroll = sessionStorage.getItem('wishlistScrollTop');
    if (savedScroll === null) return;

    sessionStorage.removeItem('wishlistScrollTop');
    const top = Number(savedScroll) || 0;
    requestAnimationFrame(function () {
      window.scrollTo({ top, left: 0, behavior: 'auto' });
    });
  }

  async function replaceWishlistShell(url, options, behavior) {
    const targetUrl = normalizeUrl(url);
    const shell = getWishlistShell();
    const currentScrollY = window.scrollY || 0;
    const requestOptions = options || {};
    const requestBehavior = behavior || {};
    const method = (requestOptions.method || 'GET').toUpperCase();
    const shouldRestoreSearchFocus = Boolean(requestBehavior.restoreSearchFocus);
    const searchSelectionStart = requestBehavior.searchSelectionStart;
    const searchSelectionEnd = requestBehavior.searchSelectionEnd;

    if (!shell || !isWishlistUrl(targetUrl)) {
      hardReloadWithScroll(targetUrl);
      return false;
    }

    if (method === 'GET') {
      if (getRequestController) getRequestController.abort();
      getRequestController = new AbortController();
      requestOptions.signal = getRequestController.signal;
    }

    isReplacingWishlist = true;
    setLoading(true);

    try {
      const response = await fetch(targetUrl.toString(), Object.assign({ credentials: 'same-origin' }, requestOptions, {
        headers: Object.assign(
          { 'X-Requested-With': 'fetch' },
          requestOptions.headers || {}
        )
      }));

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const nextShell = doc.querySelector('.wishlist-shell');

      if (!response.ok || !nextShell) {
        hardReloadWithScroll(new URL(response.url || targetUrl.toString(), window.location.origin));
        return false;
      }

      if (shouldRestoreSearchFocus) {
        const currentSearchInput = document.getElementById('wishlistLiveSearchInput');
        const requestQuery = targetUrl.searchParams.get('q') || '';
        if (currentSearchInput && currentSearchInput.value !== requestQuery) {
          return false;
        }
      }

      shell.replaceWith(nextShell);
      closeWishlistModals();
      initDynamicWishlistUi();

      if (shouldRestoreSearchFocus) {
        const nextSearchInput = document.getElementById('wishlistLiveSearchInput');
        if (nextSearchInput) {
          nextSearchInput.focus({ preventScroll: true });
          const end = Number.isInteger(searchSelectionEnd) ? searchSelectionEnd : nextSearchInput.value.length;
          const start = Number.isInteger(searchSelectionStart) ? searchSelectionStart : end;
          try {
            nextSearchInput.setSelectionRange(start, end);
          } catch (error) {
            // Some input types do not support selection ranges.
          }
        }
      }

      const finalUrl = new URL(response.url || targetUrl.toString(), window.location.origin);
      if (isWishlistUrl(finalUrl) && window.location.href !== finalUrl.toString()) {
        window.history.pushState({}, '', finalUrl.toString());
      }

      window.scrollTo({ top: currentScrollY, left: 0, behavior: 'auto' });
      return true;
    } catch (error) {
      if (error.name === 'AbortError') return false;
      console.error('Wishlist request failed:', error);
      hardReloadWithScroll(targetUrl);
      return false;
    } finally {
      setLoading(false);
      isReplacingWishlist = false;
      if (method === 'GET') getRequestController = null;
    }
  }

  function submitWishlistForm(form, submitter, behavior) {
    if (!form || isReplacingWishlist) return;

    const request = buildFormRequest(form, submitter || lastSubmitter);
    replaceWishlistShell(request.url, request.options, behavior);
  }

  function submitFiltersWithDelay(form, searchInput) {
    clearTimeout(liveSearchTimer);
    liveSearchTimer = setTimeout(function () {
      submitWishlistForm(form, null, {
        restoreSearchFocus: true,
        searchSelectionStart: searchInput ? searchInput.selectionStart : null,
        searchSelectionEnd: searchInput ? searchInput.selectionEnd : null
      });
    }, 450);
  }

  document.addEventListener('click', function (event) {
    const clickedSubmitter = event.target.closest('button[type="submit"], input[type="submit"]');
    if (clickedSubmitter) lastSubmitter = clickedSubmitter;

    const addChoiceOpen = event.target.closest('[data-wishlist-open-add-choice]');
    if (addChoiceOpen) {
      event.preventDefault();
      openCreatePanelAtTop('');
      return;
    }

    const addExistingToFolderButton = event.target.closest('[data-wishlist-add-existing-folder]');
    if (addExistingToFolderButton) {
      event.preventDefault();

      if (!addExistingToFolderButton.disabled) {
        const targetFolderSelect = document.getElementById('wishlistExistingTargetFolder');
        const targetFolder = addExistingToFolderButton.dataset.wishlistAddExistingFolder || '';

        if (targetFolderSelect) {
          targetFolderSelect.value = targetFolder;
          targetFolderSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }

        openWishlistModal(document.getElementById('wishlistExistingItemsModal'));
      }

      return;
    }

    if (event.target.closest('[data-wishlist-add-new]')) {
      event.preventDefault();
      openCreatePanelAtTop('');
      return;
    }

    const addExisting = event.target.closest('[data-wishlist-add-existing]');
    if (addExisting) {
      event.preventDefault();
      if (!addExisting.disabled) openWishlistModal(document.getElementById('wishlistExistingItemsModal'));
      return;
    }

    const editOpen = event.target.closest('[data-wishlist-edit-open]');
    if (editOpen) {
      event.preventDefault();
      openWishlistModal(document.getElementById('wishlistEdit' + editOpen.dataset.wishlistEditOpen));
      return;
    }

    const deleteOpen = event.target.closest('[data-wishlist-delete-open]');
    if (deleteOpen) {
      event.preventDefault();
      const form = document.getElementById('wishlistItemDeleteForm');
      const title = document.getElementById('wishlistItemDeleteTitle');
      if (form) form.action = deleteOpen.dataset.wishlistDeleteAction || '/wishlist';
      if (title) title.textContent = 'Delete “' + (deleteOpen.dataset.wishlistDeleteTitle || 'item') + '”?';
      openWishlistModal(document.getElementById('wishlistItemDeleteModal'));
      return;
    }

    const imageOpen = event.target.closest('[data-wishlist-image-open]');
    if (imageOpen) {
      event.preventDefault();
      const modal = document.getElementById('wishlistImageModal');
      const image = document.getElementById('wishlistImageModalImg');
      const title = document.getElementById('wishlistImageModalTitle');
      const editButton = document.getElementById('wishlistImageModalEditButton');

      if (image) {
        image.src = imageOpen.dataset.wishlistImageOpen || '';
        image.alt = (imageOpen.dataset.wishlistImageTitle || 'Wishlist item') + ' image';
      }
      if (title) title.textContent = imageOpen.dataset.wishlistImageTitle || 'Item image';
      if (editButton) editButton.dataset.openEditAfterImage = imageOpen.dataset.wishlistImageEdit || '';

      openWishlistModal(modal);
      return;
    }

    const imageEditButton = event.target.closest('#wishlistImageModalEditButton');
    if (imageEditButton) {
      event.preventDefault();
      const itemId = imageEditButton.dataset.openEditAfterImage;
      closeWishlistModals();
      if (itemId) openWishlistModal(document.getElementById('wishlistEdit' + itemId));
      return;
    }

    const renameButton = event.target.closest('[data-folder-rename-open]');
    if (renameButton) {
      event.preventDefault();
      const folderName = renameButton.dataset.folderRenameOpen || '';
      const oldName = document.getElementById('wishlistRenameOldName');
      const newName = document.getElementById('wishlistRenameNewName');
      if (oldName) oldName.value = folderName;
      if (newName) newName.value = folderName;
      openWishlistModal(document.getElementById('wishlistFolderRenameModal'));
      return;
    }

    const deleteFolderButton = event.target.closest('[data-folder-delete-open]');
    if (deleteFolderButton) {
      event.preventDefault();
      const folderName = deleteFolderButton.dataset.folderDeleteOpen || '';
      const itemCount = Number(deleteFolderButton.dataset.folderCount || 0);
      const folderInput = document.getElementById('wishlistDeleteFolderName');
      const modalTitle = document.getElementById('wishlistDeleteModalTitle');
      const modalText = document.getElementById('wishlistDeleteModalText');

      if (folderInput) folderInput.value = folderName;
      if (modalTitle) modalTitle.textContent = 'Delete “' + folderName + '”?';
      if (modalText) {
        modalText.textContent = itemCount > 0
          ? 'This folder contains ' + itemCount + ' item' + (itemCount === 1 ? '' : 's') + '. Choose what to do with them.'
          : 'This folder does not contain items yet. You can safely delete it.';
      }
      openWishlistModal(document.getElementById('wishlistFolderDeleteModal'));
      return;
    }

    if (event.target.closest('[data-folder-modal-close], [data-wishlist-item-modal-close], [data-wishlist-add-modal-close], [data-wishlist-image-close]')) {
      event.preventDefault();
      closeWishlistModals();
      return;
    }

    const createToggleButton = event.target.closest('#toggleWishlistCreateButton');
    if (createToggleButton) {
      event.preventDefault();
      const panel = getCreatePanel();
      if (panel && panel.hasAttribute('hidden')) openCreatePanel();
      else closeCreatePanel();
      return;
    }

    const foldersButton = event.target.closest('#toggleWishlistFoldersButton');
    if (foldersButton) {
      event.preventDefault();
      const foldersPanel = document.getElementById('wishlistFoldersPanel');
      if (foldersPanel) setFoldersPanelState(foldersPanel.hasAttribute('hidden'));
      return;
    }

    const clearSearchButton = event.target.closest('#wishlistLiveSearchClear');
    if (clearSearchButton) {
      event.preventDefault();
      const form = document.getElementById('wishlistAdvancedFilters');
      const searchInput = document.getElementById('wishlistLiveSearchInput');
      if (searchInput) searchInput.value = '';
      submitWishlistForm(form);
      return;
    }

    const statusFilterButton = event.target.closest('[data-wishlist-status-filter]');
    if (statusFilterButton) {
      event.preventDefault();
      const form = document.getElementById('wishlistAdvancedFilters');
      const statusInput = form ? form.querySelector('input[name="status"]') : null;
      if (statusInput) statusInput.value = statusFilterButton.dataset.wishlistStatusFilter || 'all';
      submitWishlistForm(form);
      return;
    }

    const wishlistLink = event.target.closest('a[href]');
    if (wishlistLink && !wishlistLink.target) {
      const linkUrl = normalizeUrl(wishlistLink.href);
      if (isWishlistUrl(linkUrl)) {
        event.preventDefault();
        replaceWishlistShell(linkUrl, { method: 'GET' });
      }
    }
  });

  document.addEventListener('input', function (event) {
    const imageUrlInput = event.target.closest('[data-wishlist-image-url-preview]');
    if (imageUrlInput) {
      const preview = document.getElementById(imageUrlInput.dataset.wishlistImageUrlPreview);
      setPreviewContent(preview, imageUrlInput.value.trim(), preview ? preview.dataset.emptyLabel : 'Preview');
      return;
    }

    const searchInput = event.target.closest('#wishlistLiveSearchInput');
    if (searchInput) {
      const form = document.getElementById('wishlistAdvancedFilters');
      const clearButton = document.getElementById('wishlistLiveSearchClear');
      const group = searchInput.closest('.wishlist-bootstrap-search');
      const hasQuery = Boolean(searchInput.value.trim());

      if (group) group.classList.toggle('has-live-query', hasQuery);
      if (clearButton) clearButton.toggleAttribute('hidden', !hasQuery);
      if (form) submitFiltersWithDelay(form, searchInput);
    }
  });

  document.addEventListener('change', function (event) {
    const imageFileInput = event.target.closest('[data-wishlist-image-file-preview]');
    if (imageFileInput) {
      const preview = document.getElementById(imageFileInput.dataset.wishlistImageFilePreview);
      const file = imageFileInput.files && imageFileInput.files[0];

      if (!file) {
        const form = imageFileInput.closest('form');
        const relatedUrlInput = form ? form.querySelector('[data-wishlist-image-url-preview="' + imageFileInput.dataset.wishlistImageFilePreview + '"]') : null;
        setPreviewContent(preview, relatedUrlInput ? relatedUrlInput.value.trim() : (preview ? preview.dataset.currentSrc : ''), preview ? preview.dataset.emptyLabel : 'Preview');
        return;
      }

      const reader = new FileReader();
      reader.onload = function (readerEvent) {
        setPreviewContent(preview, readerEvent.target.result, 'Preview');
      };
      reader.readAsDataURL(file);
      return;
    }

    const autoFilter = event.target.closest('[data-wishlist-auto-filter]');
    if (autoFilter) {
      const form = document.getElementById('wishlistAdvancedFilters');
      submitWishlistForm(form);
    }
  });

  document.addEventListener('submit', function (event) {
    const form = event.target.closest('form');
    if (!form) return;

    const actionUrl = normalizeUrl(form.action || window.location.href);
    if (!isWishlistUrl(actionUrl)) return;

    const method = (form.method || 'GET').toUpperCase();

    if (method !== 'GET') {
      // POST requests create, update and delete data. Let the browser submit them
      // normally so multipart forms and redirects work reliably.
      sessionStorage.setItem('wishlistScrollTop', String(window.scrollY || 0));
      lastSubmitter = null;
      return;
    }

    event.preventDefault();
    submitWishlistForm(form, event.submitter || lastSubmitter);
    lastSubmitter = null;
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeWishlistModals();
  });

  window.addEventListener('popstate', function () {
    replaceWishlistShell(window.location.href, { method: 'GET' });
  });

  restoreScrollAfterHardReload();
  initDynamicWishlistUi();
});