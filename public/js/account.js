document.addEventListener('DOMContentLoaded', () => {
  const avatarTrigger = document.getElementById('accountAvatarTrigger');
  const avatarInput = document.getElementById('accountAvatarInput');
  const avatarForm = document.getElementById('accountAvatarForm');

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
      const allowedMimeTypes = ['image/jpeg', 'image/png'];
      const allowedExtensions = ['jpg', 'jpeg', 'png'];
      const extension = file.name.split('.').pop().toLowerCase();
      const isAllowed = allowedMimeTypes.includes(file.type) || allowedExtensions.includes(extension);
      const maxSize = 15 * 1024 * 1024;

      if (!isAllowed) {
        alert('Please upload a JPG or PNG image.');
        avatarInput.value = '';
        return;
      }

      if (file.size > maxSize) {
        alert('Avatar image must be 15 MB or smaller.');
        avatarInput.value = '';
        return;
      }

      avatarForm.submit();
    });
  }
});
