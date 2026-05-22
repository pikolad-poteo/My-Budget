/**
 * Wishlist page client-side behavior.
 * Coordinates folder filters, modals, image previews, live search, and partial page
 * replacement so wishlist actions feel immediate without losing scroll position.
 */
document.addEventListener('DOMContentLoaded', function () {
  const i18n = window.MyBudgetWishlistI18n || {};
  const t = function (key, fallback) { return i18n[key] || fallback; };

  // Persist folder panel state locally so it stays stable across AJAX and reloads.
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

  // Restricts partial replacement to wishlist pages only.
  function isWishlistUrl(url) {
    return url && url.origin === window.location.origin && url.pathname.startsWith('/wishlist');
  }

  // Detail pages are handled by normal navigation to avoid replacing the list shell.
  function isWishlistDetailUrl(url) {
    return url
      && url.origin === window.location.origin
      && /^\/wishlist\/\d+\/?$/.test(url.pathname);
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

  // Resets all wishlist modal overlays before opening another panel or replacing content.
  function closeWishlistModals() {
    document.querySelectorAll('.wishlist-modal').forEach(function (modal) {
      modal.setAttribute('hidden', '');
    });
    document.body.classList.remove('wishlist-modal-open');
  }

  // Opens a modal and moves focus into it without scrolling the viewport.
  function openWishlistModal(modal) {
    if (!modal) return;

    closeCreatePanel();
    modal.removeAttribute('hidden');
    document.body.classList.add('wishlist-modal-open');

    const focusTarget = modal.querySelector('input:not([type="hidden"]), textarea, select, button');
    if (focusTarget) focusTarget.focus({ preventScroll: true });
  }

  // Opens the inline create panel and closes modal overlays to avoid competing edit states.
  function openCreatePanel() {
    const panel = getCreatePanel();
    const button = document.getElementById('toggleWishlistCreateButton');
    const buttonText = document.getElementById('toggleWishlistCreateButtonText');

    if (!panel) return;

    closeWishlistModals();
    panel.removeAttribute('hidden');

    if (button) button.setAttribute('aria-expanded', 'true');
    if (buttonText) buttonText.textContent = t('hideForm', 'Hide form');

    const firstInput = panel.querySelector('input[name="title"]');
    if (firstInput) firstInput.focus({ preventScroll: true });
  }

  function closeCreatePanel() {
    const panel = getCreatePanel();
    const button = document.getElementById('toggleWishlistCreateButton');
    const buttonText = document.getElementById('toggleWishlistCreateButtonText');

    if (panel) panel.setAttribute('hidden', '');
    if (button) button.setAttribute('aria-expanded', 'false');
    if (buttonText) buttonText.textContent = t('addItem', 'Add item');
  }

  // Scrolls to the create panel only for explicit add-new actions.
  function scrollToCreatePanel() {
    const panel = getCreatePanel();
    const target = panel ? panel.closest('.overview-panel') || panel : document.querySelector('.wishlist-shell');

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  }

  function scrollToWishlistItems() {
    const target = document.getElementById('wishlistItemsGrid');

    if (!target) return;

    const top = target.getBoundingClientRect().top + window.scrollY - 18;
    window.scrollTo({ top: Math.max(top, 0), left: 0, behavior: 'smooth' });
  }

  function openCreatePanelAtTop(folderName) {
    openCreatePanel();

    const folderSelect = document.getElementById('wishlistFolder');
    if (folderSelect && typeof folderName === 'string') {
      folderSelect.value = folderName;
    }

    scrollToCreatePanel();
  }

  // Stores and applies the collapsed/expanded folder panel state.
  function setFoldersPanelState(isOpen) {
    const foldersPanel = document.getElementById('wishlistFoldersPanel');
    const foldersButton = document.getElementById('toggleWishlistFoldersButton');
    const foldersText = document.getElementById('toggleWishlistFoldersText');

    if (!foldersPanel) return;

    foldersPanel.toggleAttribute('hidden', !isOpen);
    if (foldersButton) foldersButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (foldersText) foldersText.textContent = isOpen ? t('hideFolders', 'Hide folders') : t('showFolders', 'Show folders');

    sessionStorage.setItem(folderStateKey, isOpen ? '1' : '0');
  }

  // Updates image preview cards for uploaded files, remote URLs, or empty states.
  function setPreviewContent(preview, src, label) {
    if (!preview) return;

    if (src) {
      preview.innerHTML = '<img src="' + src.replace(/"/g, '&quot;') + '" alt="Photo preview" />';
    } else {
      preview.innerHTML = '<i class="bi bi-image"></i><span>' + (label || preview.dataset.emptyLabel || t('preview', 'Preview')) + '</span>';
    }
  }

  // Binds file/url inputs to preview elements after initial load and AJAX replacement.
  function initImagePreviews() {
    document.querySelectorAll('[data-current-src]').forEach(function (preview) {
      if (!preview.querySelector('img')) {
        setPreviewContent(preview, preview.dataset.currentSrc || '', preview.dataset.emptyLabel || t('noImage', 'No image'));
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


  // Enables existing-item selection only when a target folder and at least one item are selected.
  function updateExistingItemsModalState() {
    const targetSelect = document.getElementById('wishlistExistingTargetFolder');
    const folderInput = document.getElementById('wishlistExistingTargetFolderName');
    const ownerInput = document.getElementById('wishlistExistingTargetOwnerId');
    if (!targetSelect) return;

    const selectedOption = targetSelect.options[targetSelect.selectedIndex];
    const targetFolder = selectedOption ? (selectedOption.dataset.folderName || '') : '';
    const targetOwnerId = selectedOption ? (selectedOption.dataset.ownerId || '') : '';

    if (folderInput) folderInput.value = targetFolder;
    if (ownerInput) ownerInput.value = targetOwnerId;

    document.querySelectorAll('[data-existing-folder-item]').forEach(function (card) {
      const checkbox = card.querySelector('[data-existing-folder-checkbox]');
      const itemFolder = card.dataset.itemFolder || '';
      const itemOwnerId = card.dataset.itemOwnerId || '';
      const belongsToOwner = !targetOwnerId || String(itemOwnerId) === String(targetOwnerId);
      const isInTargetFolder = belongsToOwner && itemFolder === targetFolder;

      card.toggleAttribute('hidden', !belongsToOwner);
      card.classList.toggle('is-already-added', isInTargetFolder);

      if (checkbox) {
        checkbox.disabled = !belongsToOwner;
        checkbox.checked = isInTargetFolder;
      }
    });
  }

  // Preselects the correct owner-aware folder in the add-existing-items modal.
  function chooseExistingItemsTarget(folderName, ownerId) {
    const targetSelect = document.getElementById('wishlistExistingTargetFolder');
    if (!targetSelect) return;

    const matchingOption = Array.from(targetSelect.options).find(function (option) {
      return (option.dataset.folderName || '') === folderName && String(option.dataset.ownerId || '') === String(ownerId || '');
    }) || Array.from(targetSelect.options).find(function (option) {
      return (option.dataset.folderName || '') === folderName;
    });

    if (matchingOption) targetSelect.value = matchingOption.value;
    updateExistingItemsModalState();
  }

  // Re-initializes all controls that can disappear when the wishlist shell is replaced.
  function initDynamicWishlistUi() {
    initFoldersState();
    initImagePreviews();
    initLiveSearchState();
    updateExistingItemsModalState();
  }

  // Converts regular forms into fetch requests while preserving clicked submit button values.
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

  // Falls back to full navigation while preserving scroll when partial replacement is unsafe.
  function hardReloadWithScroll(url) {
    sessionStorage.setItem('wishlistScrollTop', String(window.scrollY || 0));
    window.location.href = url.toString();
  }

  // Restores scroll after a deliberate fallback reload.
  function restoreScrollAfterHardReload() {
    const savedScroll = sessionStorage.getItem('wishlistScrollTop');
    if (savedScroll === null) return;

    sessionStorage.removeItem('wishlistScrollTop');
    const top = Number(savedScroll) || 0;
    requestAnimationFrame(function () {
      window.scrollTo({ top, left: 0, behavior: 'auto' });
    });
  }

  // Replaces the wishlist shell after filters, folder actions, and CRUD forms.
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

      if (finalUrl.pathname === '/wishlist' && requestBehavior.scrollToItems) {
        requestAnimationFrame(scrollToWishlistItems);
      } else {
        window.scrollTo({ top: currentScrollY, left: 0, behavior: 'auto' });
      }
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

  // Central submission helper used by filters and wishlist mutation forms.
  function submitWishlistForm(form, submitter, behavior) {
    if (!form || isReplacingWishlist) return;

    const request = buildFormRequest(form, submitter || lastSubmitter);
    replaceWishlistShell(request.url, request.options, behavior);
  }

  // Debounces live search so typing does not send a request for every keystroke.
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

  // Event delegation keeps controls working after the wishlist shell is replaced.
  document.addEventListener('click', function (event) {
    const clickedSubmitter = event.target.closest('button[type="submit"], input[type="submit"]');
    if (clickedSubmitter) lastSubmitter = clickedSubmitter;

    const uploadTrigger = event.target.closest('[data-wishlist-upload-trigger]');
    if (uploadTrigger) {
      event.preventDefault();
      const fileInput = document.getElementById(uploadTrigger.dataset.wishlistUploadTrigger || '');
      if (fileInput) fileInput.click();
      return;
    }

    const resetPreviewButton = event.target.closest('[data-wishlist-reset-preview]');
    if (resetPreviewButton) {
      event.preventDefault();
      const preview = document.getElementById(resetPreviewButton.dataset.wishlistResetPreview || '');
      const fileInput = document.getElementById(resetPreviewButton.dataset.wishlistResetFile || '');
      const urlInput = document.getElementById(resetPreviewButton.dataset.wishlistResetUrl || '');
      const resetLocalInput = document.getElementById(resetPreviewButton.dataset.wishlistResetLocal || '');

      if (fileInput) fileInput.value = '';
      if (urlInput) urlInput.value = '';
      if (resetLocalInput) resetLocalInput.value = '1';
      setPreviewContent(preview, '', preview ? preview.dataset.emptyLabel : t('preview', 'Preview'));
      return;
    }

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
        const targetFolder = addExistingToFolderButton.dataset.wishlistAddExistingFolder || '';
        const targetOwnerId = addExistingToFolderButton.dataset.wishlistAddExistingOwnerId || '';

        chooseExistingItemsTarget(targetFolder, targetOwnerId);
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
      if (!addExisting.disabled) {
        updateExistingItemsModalState();
        openWishlistModal(document.getElementById('wishlistExistingItemsModal'));
      }
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
      if (title) title.textContent = t('deleteItemQuestion', 'Delete “{name}”?').replace('{name}', deleteOpen.dataset.wishlistDeleteTitle || t('item', 'item'));
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
        image.alt = (imageOpen.dataset.wishlistImageTitle || t('wishlistItem', 'Wishlist item')) + ' ' + t('image', 'image');
      }
      if (title) title.textContent = imageOpen.dataset.wishlistImageTitle || t('itemImage', 'Item image');
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

    const createFolderButton = event.target.closest('[data-folder-create-open]');
    if (createFolderButton) {
      event.preventDefault();
      const ownerSelect = document.getElementById('wishlistCreateFolderOwner');
      const activeMemberButton = document.querySelector('[data-wishlist-buyer-filter].is-active');
      const activeMemberId = activeMemberButton ? activeMemberButton.dataset.wishlistBuyerFilter : '';
      if (ownerSelect && activeMemberId && activeMemberId !== 'all') ownerSelect.value = activeMemberId;
      openWishlistModal(document.getElementById('wishlistFolderCreateModal'));
      return;
    }

    const renameButton = event.target.closest('[data-folder-rename-open]');
    if (renameButton) {
      event.preventDefault();
      const folderName = renameButton.dataset.folderRenameOpen || '';
      const folderOwnerId = renameButton.dataset.folderOwnerId || '';
      const oldName = document.getElementById('wishlistRenameOldName');
      const oldUserId = document.getElementById('wishlistRenameOldUserId');
      const newName = document.getElementById('wishlistRenameNewName');
      const ownerSelect = document.getElementById('wishlistRenameOwner');
      if (oldName) oldName.value = folderName;
      if (oldUserId) oldUserId.value = folderOwnerId;
      if (newName) newName.value = folderName;
      if (ownerSelect && folderOwnerId) ownerSelect.value = folderOwnerId;
      openWishlistModal(document.getElementById('wishlistFolderRenameModal'));
      return;
    }

    const deleteFolderButton = event.target.closest('[data-folder-delete-open]');
    if (deleteFolderButton) {
      event.preventDefault();
      const folderName = deleteFolderButton.dataset.folderDeleteOpen || '';
      const folderOwnerId = deleteFolderButton.dataset.folderOwnerId || '';
      const itemCount = Number(deleteFolderButton.dataset.folderCount || 0);
      const folderInput = document.getElementById('wishlistDeleteFolderName');
      const folderOwnerInput = document.getElementById('wishlistDeleteFolderOwnerId');
      const modalTitle = document.getElementById('wishlistDeleteModalTitle');
      const modalText = document.getElementById('wishlistDeleteModalText');

      if (folderInput) folderInput.value = folderName;
      if (folderOwnerInput) folderOwnerInput.value = folderOwnerId;
      if (modalTitle) modalTitle.textContent = t('deleteFolderQuestion', 'Delete “{name}”?').replace('{name}', folderName);
      if (modalText) {
        modalText.textContent = itemCount > 0
          ? t('folderContainsItems', 'This folder contains {count} {itemWord}. {text}')
              .replace('{count}', itemCount)
              .replace('{itemWord}', itemCount === 1 ? t('itemSingular', 'item') : t('itemPlural', 'items'))
              .replace('{text}', t('chooseWhatToDoWithThem', 'Choose what to do with them.'))
          : t('folderEmptySafeDelete', 'This folder does not contain items yet. You can safely delete it.');
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

    const buyerFilterButton = event.target.closest('[data-wishlist-buyer-filter]');
    if (buyerFilterButton) {
      event.preventDefault();
      const form = document.getElementById('wishlistAdvancedFilters');
      const buyerInput = form ? form.querySelector('input[name="buyer"]') : null;
      if (buyerInput) buyerInput.value = buyerFilterButton.dataset.wishlistBuyerFilter || 'all';
      submitWishlistForm(form);
      return;
    }

    const folderLink = event.target.closest('[data-wishlist-folder-link]');
    if (folderLink && !folderLink.target) {
      const linkUrl = normalizeUrl(folderLink.href);
      if (isWishlistUrl(linkUrl)) {
        event.preventDefault();
        replaceWishlistShell(linkUrl, { method: 'GET' }, { scrollToItems: true });
      }
      return;
    }

    const wishlistLink = event.target.closest('a[href]');
    if (wishlistLink && !wishlistLink.target) {
      const linkUrl = normalizeUrl(wishlistLink.href);
      if (isWishlistUrl(linkUrl)) {
        if (isWishlistDetailUrl(linkUrl)) return;

        event.preventDefault();
        replaceWishlistShell(linkUrl, { method: 'GET' });
      }
    }
  });

  document.addEventListener('input', function (event) {
    const imageUrlInput = event.target.closest('[data-wishlist-image-url-preview]');
    if (imageUrlInput) {
      const preview = document.getElementById(imageUrlInput.dataset.wishlistImageUrlPreview);
      const form = imageUrlInput.closest('form');
      const relatedFileInput = form ? form.querySelector('[data-wishlist-image-file-preview="' + imageUrlInput.dataset.wishlistImageUrlPreview + '"]') : null;
      const resetLocalInput = document.getElementById(imageUrlInput.dataset.wishlistResetLocal || '');
      const externalImageUrl = imageUrlInput.value.trim();

      if (relatedFileInput) relatedFileInput.value = '';
      if (resetLocalInput && externalImageUrl) resetLocalInput.value = '1';
      setPreviewContent(preview, externalImageUrl, preview ? preview.dataset.emptyLabel : t('preview', 'Preview'));
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
        setPreviewContent(preview, relatedUrlInput ? relatedUrlInput.value.trim() : (preview ? preview.dataset.currentSrc : ''), preview ? preview.dataset.emptyLabel : t('preview', 'Preview'));
        return;
      }

      const form = imageFileInput.closest('form');
      const relatedUrlInput = form ? form.querySelector('[data-wishlist-image-url-preview="' + imageFileInput.dataset.wishlistImageFilePreview + '"]') : null;
      const resetLocalInput = relatedUrlInput ? document.getElementById(relatedUrlInput.dataset.wishlistResetLocal || '') : null;

      if (relatedUrlInput) relatedUrlInput.value = '';
      if (resetLocalInput) resetLocalInput.value = '0';

      const reader = new FileReader();
      reader.onload = function (readerEvent) {
        setPreviewContent(preview, readerEvent.target.result, 'Preview');
      };
      reader.readAsDataURL(file);
      return;
    }

    const existingTargetSelect = event.target.closest('#wishlistExistingTargetFolder');
    if (existingTargetSelect) {
      updateExistingItemsModalState();
      return;
    }

    const existingItemCheckbox = event.target.closest('[data-existing-folder-checkbox]');
    if (existingItemCheckbox) {
      const existingItemCard = existingItemCheckbox.closest('[data-existing-folder-item]');
      if (existingItemCard) existingItemCard.classList.toggle('is-already-added', existingItemCheckbox.checked);
      return;
    }

    const autoFilter = event.target.closest('[data-wishlist-auto-filter]');
    if (autoFilter) {
      const form = document.getElementById('wishlistAdvancedFilters');
      submitWishlistForm(form);
    }
  });

  document.addEventListener('reset', function (event) {
    const form = event.target.closest('form');
    if (!form || !form.classList.contains('wishlist-create-form')) return;

    requestAnimationFrame(function () {
      form.querySelectorAll('[data-wishlist-image-url-preview]').forEach(function (input) {
        const preview = document.getElementById(input.dataset.wishlistImageUrlPreview);
        setPreviewContent(preview, '', preview ? preview.dataset.emptyLabel : t('preview', 'Preview'));
      });

      form.querySelectorAll('[data-wishlist-image-file-preview]').forEach(function (input) {
        input.value = '';
      });
    });
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