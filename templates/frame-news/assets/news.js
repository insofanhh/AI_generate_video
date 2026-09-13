(function () {
  const root = document.getElementById('root');
  const defaults = JSON.parse(root.dataset.compositionVariables);
  const injected = window.__hyperframes?.getVariables?.();
  // Query options make the shipped gallery usable without the render runtime.
  const params = new URLSearchParams(location.search);
  const v = { ...defaults, ...(injected || {}) };
  const english = v.locale === 'en';
  document.documentElement.lang = english ? 'en' : 'vi';
  document.title = v.headline || (english ? 'News bulletin' : 'Bản tin thời sự');
  if (!injected && params.has('theme')) v.theme = params.get('theme');
  root.dataset.theme = ['slide', 'light', 'dark', 'modern'].includes(v.theme) ? v.theme : 'slide';
  root.innerHTML = `
    <div class="rail"></div>
    <header class="masthead"><div class="identity"><span class="brand-mark">N</span><div><div class="channel"></div><div class="edition">Thông tin & cuộc sống</div></div></div><div class="category"></div></header>
    <figure class="media"><div class="placeholder"><svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><rect x="10" y="15" width="80" height="70" rx="3"/><circle cx="66" cy="36" r="9"/><path d="m10 72 25-26 25 24 13-13 17 19"/></svg><span>Chưa có ảnh nguồn</span></div><div class="image-label" hidden></div><figcaption class="media-bottom"><span class="credit"></span><span class="image-count"></span></figcaption></figure>
    <article class="story"><div class="dateline"></div><h1 class="headline"></h1><p class="summary"></p></article>
    <p class="caption" hidden></p><footer class="footer"><span class="section"></span><span class="footer-category"></span></footer><div class="progress"></div>`;
  const set = (selector, value) => { root.querySelector(selector).textContent = value || ''; };
  set('.edition', english ? 'News & perspectives' : 'Thông tin & cuộc sống');
  set('.placeholder span', english ? 'No source image' : 'Chưa có ảnh nguồn');
  set('.channel', v.channel); set('.category', v.category); set('.footer-category', v.category);
  set('.headline', v.headline); set('.summary', v.summary); set('.section', v.section);
  set('.dateline', v.date ? `${english ? 'Published' : 'Ngày đăng'}: ${v.date}` : (english ? 'News briefing' : 'Thông tin tổng hợp'));
  set('.caption', v.caption); root.querySelector('.caption').hidden = !v.caption;
  let images = Array.isArray(v.images) ? v.images.slice(0, 6) : [];
  if (!injected && params.get('demo') === '1') {
    images = [{ src: new URL('city-demo.svg', document.currentScript.src).href, credit: english ? 'Illustration · Not an event photograph' : 'Đồ họa minh họa · Không phải ảnh sự kiện' }];
    set('.image-label', english ? 'TEMPLATE PREVIEW' : 'MẪU GIAO DIỆN'); root.querySelector('.image-label').hidden = false;
  }
  const media = root.querySelector('.media');
  const photos = images.map((item) => {
    const img = document.createElement('img'); img.className = 'photo';
    img.dataset.fit = item.fit === 'contain' ? 'contain' : 'cover';
    img.alt = item.alt || ''; img.src = item.src;
    img.addEventListener('error', () => { img.dataset.failed = 'true'; updateImage(currentTime); });
    img.addEventListener('load', () => updateImage(currentTime));
    media.insertBefore(img, media.querySelector('.image-label')); return img;
  });
  let currentTime = 0;
  function updateImage(time) {
    const index = Math.min(images.length - 1, Math.floor(Math.min(time, 7.999) / 8 * images.length));
    photos.forEach((photo, i) => photo.classList.toggle('active', i === index && photo.dataset.failed !== 'true'));
    const failed = index >= 0 && photos[index]?.dataset.failed === 'true';
    set('.credit', failed
      ? (english ? 'Source image unavailable' : 'Không tải được ảnh nguồn')
      : (images[index]?.credit || (v.source
        ? `${english ? 'Source' : 'Nguồn'}: ${v.source}`
        : (english ? 'Image source not provided' : 'Chưa cung cấp nguồn ảnh'))));
    set('.image-count', images.length ? `${String(index + 1).padStart(2, '0')} / ${String(images.length).padStart(2, '0')}` : '');
  }
  updateImage(0);
  // Shrink long Vietnamese copy to its available box instead of clipping it.
  const fitText = () => {
    for (const selector of ['.headline', '.summary']) {
      const el = root.querySelector(selector);
      let size = parseFloat(getComputedStyle(el).fontSize);
      const maxHeight = parseFloat(getComputedStyle(el).maxHeight);
      // Vietnamese accents can extend beyond a line box; compare with the
      // allocated maximum, not the glyph's natural clientHeight.
      while ((el.scrollHeight > maxHeight + 1 || el.scrollWidth > el.clientWidth + 1) && size > 18) {
        el.style.fontSize = `${--size}px`;
      }
    }
    const story = root.querySelector('.story');
    const boundary = root.querySelector(v.caption ? '.caption' : '.footer').offsetTop - 32;
    const headline = root.querySelector('.headline');
    const summary = root.querySelector('.summary');
    let attempts = 0;
    while (story.offsetTop + story.scrollHeight > boundary && attempts++ < 60) {
      for (const el of [headline, summary]) {
        const size = parseFloat(getComputedStyle(el).fontSize);
        if (size > 18) el.style.fontSize = `${size - 1}px`;
      }
    }
  };
  fitText(); document.fonts.ready.then(fitText);
  const animations = root.getAnimations({ subtree: true });
  let timer;
  let paused = false;
  function seek(time) {
    currentTime = Math.max(0, Math.min(8, time));
    animations.forEach(animation => { animation.pause(); animation.currentTime = currentTime * 1000; });
    updateImage(currentTime);
  }
  window.newsTimeline = {
    pause() { paused = true; clearInterval(timer); animations.forEach(a => a.pause()); },
    seek,
    paused() { return paused; },
  };
  // Standalone preview; render runtime drives pause/seek deterministically.
  const started = performance.now();
  timer = setInterval(() => { if (!paused) { currentTime = Math.min(8, (performance.now() - started) / 1000); updateImage(currentTime); } }, 100);
})();
