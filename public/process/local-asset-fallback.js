// Portable clones retain asset indexes while original bytes remain outside Git.
document.addEventListener('error', (event) => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement) || image.src.includes('/canonical-placeholder.svg')) return;
  image.src = '/process/assets/canonical-placeholder.svg';
}, true);
