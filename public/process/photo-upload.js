/* Shared processing for newly selected/pasted photos; never rewrites stored media. */
(() => {
  'use strict';
  const profiles = Object.freeze({ standard: { edge: 1600, quality: .82 }, hd: { edge: 2400, quality: .90 }, fidelity: null });
  const selected = new WeakMap(), prepared = new WeakMap(), controls = new WeakMap(), sourceControls = new WeakMap();
  const t = (zh, vi) => document.documentElement.lang.startsWith('vi') ? vi : zh;
  function assertInput(file) {
    if (!file || file.size > 40_000_000) throw Error(t('原始照片限 40 MB，請先另存較小副本。', 'Ảnh gốc tối đa 40 MB; hãy tạo bản sao nhỏ hơn.'));
  }
  async function format(file) {
    const b = new Uint8Array(await file.arrayBuffer());
    const word = (n, length) => String.fromCharCode(...b.subarray(n, n + length));
    let type = '', metadata = false, animated = false;
    if (b[0] === 255 && b[1] === 216 && b[2] === 255) type = 'image/jpeg';
    else if (word(0, 8) === '\x89PNG\r\n\x1a\n') {
      type = 'image/png';
      const view = new DataView(b.buffer);
      for (let p = 8; p + 12 <= b.length;) {
        const size = view.getUint32(p), name = word(p + 4, 4);
        if (p + size + 12 > b.length) throw Error(t('PNG 檔案不完整。', 'Tệp PNG không đầy đủ.'));
        if (name === 'acTL') animated = true;
        p += size + 12;
      }
    } else if (word(0, 4) === 'RIFF' && word(8, 4) === 'WEBP') {
      type = 'image/webp';
      const view = new DataView(b.buffer);
      if (b.length < 20 || view.getUint32(4, true) + 8 !== b.length) throw Error(t('WebP 檔案不完整。', 'Tệp WebP không đầy đủ.'));
      for (let p = 12; p + 8 <= b.length;) {
        const size = view.getUint32(p + 4, true), name = word(p, 4);
        if (p + size + 8 > b.length) throw Error(t('WebP 檔案不完整。', 'Tệp WebP không đầy đủ.'));
        if (['EXIF', 'XMP ', 'ICCP'].includes(name)) metadata = true;
        if (['ANIM', 'ANMF'].includes(name)) animated = true;
        p += size + 8 + size % 2;
      }
    } else if (['GIF87a', 'GIF89a'].includes(word(0, 6))) { type = 'image/gif'; animated = true; }
    if (!type || file.type && file.type !== type) throw Error(t('請使用內容與格式相符的 JPG、PNG、WebP 或 GIF。', 'Hãy dùng JPG, PNG, WebP hoặc GIF có nội dung đúng định dạng.'));
    return { type, metadata, animated };
  }
  async function decode(file) {
    if (typeof createImageBitmap === 'function') {
      try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); }
      catch { throw Error(t('照片無法解碼，請另存 JPG／PNG／WebP。', 'Không đọc được ảnh; hãy lưu thành JPG/PNG/WebP.')); }
    }
    const url = URL.createObjectURL(file), image = new Image();
    try {
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url; });
      return image;
    } catch { URL.revokeObjectURL(url); throw Error(t('照片無法解碼，請另存 JPG／PNG／WebP。', 'Không đọc được ảnh; hãy lưu thành JPG/PNG/WebP.')); }
  }
  function release(image) {
    image?.close?.();
    if (image?.src?.startsWith('blob:')) URL.revokeObjectURL(image.src);
  }
  async function convert(file, profile) {
    assertInput(file);
    const info = await format(file);
    if (!file.type) file = new File([file], file.name || 'photo', { type: info.type, lastModified: file.lastModified || Date.now() });
    if (profile !== 'fidelity' && info.animated) throw Error(t('動圖請選「保真」，避免失去動畫。', 'Chọn “Giữ nguyên” cho ảnh động để giữ hoạt ảnh.'));
    let image, canvas;
    try {
      image = await decode(file);
      const w = image.naturalWidth || image.width, h = image.naturalHeight || image.height;
      if (!w || !h || w * h > 50_000_000) throw Error(t('照片像素超過 5000 萬或內容無效，請先另存較小副本。', 'Ảnh quá 50 triệu điểm ảnh hoặc không hợp lệ; hãy tạo bản sao nhỏ hơn.'));
      // Fidelity is an explicit byte-preserving exception, including original metadata.
      if (profile === 'fidelity') return file;
      const { edge, quality } = profiles[profile], scale = Math.min(1, edge / Math.max(w, h));
      if (info.type === 'image/webp' && !info.metadata && scale === 1) return file;
      canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(w * scale)); canvas.height = Math.max(1, Math.round(h * scale));
      const context = canvas.getContext('2d');
      if (!context) throw Error(t('瀏覽器無法處理照片。', 'Trình duyệt không xử lý được ảnh.'));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
      if (!blob || blob.type !== 'image/webp' || (await format(blob)).type !== 'image/webp') throw Error(t('瀏覽器不支援 WebP 輸出，請更新瀏覽器。', 'Trình duyệt không hỗ trợ xuất WebP; hãy cập nhật.'));
      return new File([blob], String(file.name || 'photo').replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp', lastModified: file.lastModified || Date.now() });
    } finally { release(image); if (canvas) canvas.width = canvas.height = 0; }
  }
  function prepare(file, options = {}) {
    const actor = window.ProcessSync?.identity, generation = window.ProcessSync?.identityGeneration?.();
    const profile = options.profile || selected.get(file) || 'standard';
    if (!Object.hasOwn(profiles, profile)) return Promise.reject(Error('UNKNOWN_PHOTO_PROFILE'));
    let cache = prepared.get(file);
    if (!cache) { cache = new Map(); prepared.set(file, cache); }
    if (!cache.has(profile)) {
      const promise = convert(file, profile).then(output => {
        selected.set(output, profile);
        if (output !== file) prepared.set(output, new Map([[profile, Promise.resolve(output)]]));
        const control = controls.get(options.input) || sourceControls.get(file);
        if (control?.status.isConnected) control.status.textContent = `${(file.size / 1024).toFixed(0)} → ${(output.size / 1024).toFixed(0)} KB`;
        return output;
      }).catch(error => { cache.delete(profile); throw error; });
      cache.set(profile, promise);
    }
    return cache.get(profile).then(output => {
      if (window.ProcessSync?.identity !== actor || window.ProcessSync?.identityGeneration?.() !== generation)
        throw Error(t('登入身分已變更，請重新選擇照片。', 'Tài khoản đã thay đổi; hãy chọn lại ảnh.'));
      return output;
    });
  }
  function profileFor(input) { return controls.get(input)?.select.value || 'standard'; }
  function labels(control) {
    control.caption.textContent = t('照片規格', 'Quy cách ảnh');
    const names = [t('一般 · 1600 / WebP 82%', 'Thường · 1600 / WebP 82%'), t('高清 · 2400 / WebP 90%', 'Nét cao · 2400 / WebP 90%'), t('保真 · 細字／尺寸圖保留原檔', 'Giữ nguyên · chữ nhỏ / bản vẽ kích thước')];
    [...control.select.options].forEach((option, i) => option.textContent = names[i]);
    control.select.setAttribute('aria-label', control.caption.textContent);
    control.note.textContent = t('選檔前選擇；小圖不放大。保真沿用原檔與原容量限制。', 'Chọn trước khi chọn ảnh; không phóng ảnh nhỏ. Giữ nguyên tệp và giới hạn dung lượng hiện có.');
  }
  function bind(input) {
    if (controls.has(input)) return controls.get(input);
    const box = document.createElement('div'), caption = document.createElement('span'), select = document.createElement('select'), note = document.createElement('small'), status = document.createElement('output');
    box.className = 'process-photo-options'; box.dataset.i18nSkip = 'true';
    for (const value of Object.keys(profiles)) select.add(new Option('', value));
    status.setAttribute('aria-live', 'polite');
    box.append(caption, select, note, status);
    // Keep interactive controls outside a file-picker label and its keyboard shortcut.
    const anchor = input.closest('label, .rf-upload') || input;
    anchor.before(box);
    const control = { box, caption, select, note, status }; controls.set(input, control); labels(control);
    return control;
  }
  function scan(node) {
    if (node.nodeType !== 1) return;
    if (node.matches('input[type="file"][accept*="image"]')) bind(node);
    node.querySelectorAll('input[type="file"][accept*="image"]').forEach(bind);
  }
  document.addEventListener('change', event => {
    const input = event.target;
    if (!input.matches?.('input[type="file"][accept*="image"]')) return;
    const control = bind(input);
    for (const file of input.files || []) { selected.set(file, control.select.value); sourceControls.set(file, control); }
  }, true);
  const observer = new MutationObserver(records => { for (const record of records) for (const node of record.addedNodes) scan(node); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  new MutationObserver(() => document.querySelectorAll('input[type="file"][accept*="image"]').forEach(input => { const c = controls.get(input); if (c) labels(c); })).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  scan(document.documentElement);
  window.ProcessPhotoUpload = Object.freeze({ profiles, prepare, profileFor, bind, assertInput });
})();
