/**
 * Account page client-side behavior.
 * Keeps avatar upload convenient while validating the selected image before submit.
 */
document.addEventListener('DOMContentLoaded', () => {
  const avatarTrigger = document.getElementById('accountAvatarTrigger');
  const avatarInput = document.getElementById('accountAvatarInput');
  const avatarForm = document.getElementById('accountAvatarForm');

  // The visible avatar card acts as a styled proxy for the hidden file input.
  const openFilePicker = () => {
    if (avatarInput) avatarInput.click();
  };

  if (avatarTrigger) {
    avatarTrigger.addEventListener('click', openFilePicker);
  }

  if (avatarInput && avatarForm) {
    avatarInput.addEventListener('change', () => {
      if (!avatarInput.files || avatarInput.files.length === 0) return;

      const file = avatarInput.files[0];

      // Mirror the server-side avatar restrictions to give immediate feedback in the UI.
      const allowedMimeTypes = ['image/jpeg', 'image/png'];
      const allowedExtensions = ['jpg', 'jpeg', 'png'];
      const extension = file.name.split('.').pop().toLowerCase();
      const isAllowed = allowedMimeTypes.includes(file.type) || allowedExtensions.includes(extension);
      const maxSize = 15 * 1024 * 1024;

      if (!isAllowed) {
        alert(avatarInput.dataset.invalidType || 'Please upload a JPG or PNG image.');
        avatarInput.value = '';
        return;
      }

      if (file.size > maxSize) {
        alert(avatarInput.dataset.tooLarge || 'Avatar image must be 15 MB or smaller.');
        avatarInput.value = '';
        return;
      }

      avatarForm.submit();
    });
  }
});
