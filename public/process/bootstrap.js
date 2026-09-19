// Fetch application assets in parallel, then execute in their established order
// only after the shared-state snapshot is ready. No synchronous network request.
void (async () => {
  const scripts = [...document.querySelectorAll('script[data-process-src]')];
  for (const item of scripts) {
    const preload = document.createElement('link');
    preload.rel = 'preload';
    preload.as = 'script';
    preload.href = item.dataset.processSrc;
    document.head.append(preload);
  }
  try {
    await window.ProcessSync.ready;
    for (const item of scripts) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = item.dataset.processSrc;
        script.onload = resolve;
        script.onerror = reject;
        item.replaceWith(script);
      });
    }
    performance.mark('process-ready');
    document.querySelector('#process-boot')?.remove();
    document.documentElement.removeAttribute('data-process-boot');
  } catch {
    const boot = document.querySelector('#process-boot');
    boot.setAttribute('role', 'alert');
    boot.textContent =
      '載入失敗，請重新整理。 / Không thể tải. Vui lòng tải lại.';
    const retry = document.createElement('button');
    retry.textContent = '重新整理 / Tải lại';
    retry.onclick = () => location.reload();
    boot.append(retry);
  }
})();
