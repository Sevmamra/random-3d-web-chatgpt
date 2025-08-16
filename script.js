// script.js
// NOTE: This file is intentionally long and feature-rich — it wires Three.js, Lenis, GSAP/ScrollTrigger,
// UI interactions, accessibility helpers, form handling, showcase carousel, parallax, magnetic hovers,
// counters, toast system, modal, scene statistics and lightweight resource tracking.
// The HTML already links Three.js, GSAP, ScrollTrigger and Lenis; this script uses them directly.

(function () {
  'use strict';

  /**
   * Global configuration and small utilities used throughout the file.
   * These helper functions are deliberately small and numerous to keep code modular.
   */

  const CFG = {
    selectors: {
      canvas: '#webgl',
      header: '#header',
      navToggle: '[data-ui="nav-toggle"]',
      navMenu: '#nav-menu',
      navLinks: '.nav__link',
      progressBar: '[data-ui="progress-bar"]',
      heroTitle: '.hero__title',
      animReveal: '[data-anim="reveal"]',
      animStagger: '[data-anim="stagger"] > *',
      animIn: '[data-anim="in"]',
      counters: '[data-anim="counter"]',
      heroScene: '.hero__scene',
      showcaseTrack: '[data-ui="show-track"]',
      showPrev: '[data-ui="show-prev"]',
      showNext: '[data-ui="show-next"]',
      showDots: '[data-ui="show-dots"] button',
      form: '[data-ui="form"]',
      formStatus: '[data-ui="form-status"]',
      overlay: '[data-ui="overlay"]',
      modalClose: '[data-ui="modal-close"]',
      modalOK: '[data-ui="modal-ok"]',
      tplToast: '#tpl-toast',
      fpsEl: '#fps',
      trisEl: '#tris',
      memEl: '#mem',
      yearEl: '#year',
      brandText: '.brand__text',
      magneticElements: '[data-hover="magnetic"]',
      hoverUnderline: '[data-hover="underline"]',
      data3dCard: '[data-3d="card"]',
      splitWords: '[data-split="words"]',
      splitChars: '[data-split="chars"]'
    },
    three: {
      clearColor: 0x07080b,
      pixelRatioLimit: 2,
      camera: { fov: 45, near: 0.1, far: 1000, x: 0, y: 0, z: 6 }
    },
    lenis: {
      duration: 1.2,
      easing: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    },
    gsap: {
      defaults: { duration: 0.8, ease: 'power3.out' }
    },
    ui: {
      toastTimeout: 4200,
      statsUpdateInterval: 800
    }
  };

  function q(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }

  function qAll(sel, ctx) {
    return Array.from((ctx || document).querySelectorAll(sel));
  }

  function on(el, ev, fn, opts) {
    (el && el.addEventListener) ? el.addEventListener(ev, fn, opts) : null;
  }

  function off(el, ev, fn, opts) {
    (el && el.removeEventListener) ? el.removeEventListener(ev, fn, opts) : null;
  }

  function attr(el, name, value) {
    if (!el) return;
    if (value === undefined) return el.getAttribute(name);
    el.setAttribute(name, value);
  }

  function has(el, cls) {
    return el && el.classList.contains(cls);
  }

  function add(el, cls) {
    el && el.classList.add(cls);
  }

  function rem(el, cls) {
    el && el.classList.remove(cls);
  }

  function now() {
    return performance && performance.now ? performance.now() : Date.now();
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // safe number parse with fallback
  function num(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  // ease helpers
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  // tiny debounce
  function debounce(fn, wait = 80) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // Simple tiny throttle
  function throttle(fn, limit = 60) {
    let waiting = false;
    return function (...args) {
      if (!waiting) {
        fn.apply(this, args);
        waiting = true;
        requestAnimationFrame(() => {
          waiting = false;
        });
      }
    };
  }

  // DOM ready
  function ready(fn) {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(fn, 0);
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }

  // Simple accessibility focus trap for modals (lightweight)
  function trapFocus(container) {
    const focusable = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';
    const nodes = Array.from(container.querySelectorAll(focusable));
    if (!nodes.length) return (() => {});
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    function keyHandler(e) {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      } else if (e.key === 'Escape') {
        container.dispatchEvent(new CustomEvent('escape', { bubbles: true }));
      }
    }
    on(document, 'keydown', keyHandler);
    first.focus();
    return () => off(document, 'keydown', keyHandler);
  }

  /* ------------------------------
   * Text splitter utilities
   * ------------------------------ */
  function splitWords(root = document) {
    qAll(CFG.selectors.splitWords, root).forEach((el) => {
      if (el.dataset._splitWords) return;
      const words = el.innerText.trim().split(/\s+/).map((w) => `<span aria-hidden="true">${w}</span>`).join(' ');
      el.innerHTML = words;
      el.dataset._splitWords = '1';
    });
  }

  function splitChars(root = document) {
    qAll(CFG.selectors.splitChars, root).forEach((el) => {
      if (el.dataset._splitChars) return;
      const text = el.innerText || '';
      const chars = Array.from(text).map((c) => `<span aria-hidden="true">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
      el.innerHTML = chars;
      el.dataset._splitChars = '1';
    });
  }

  /* ------------------------------
   * Toast / Notification system
   * ------------------------------ */
  const Toast = (function () {
    const tpl = q(CFG.selectors.tplToast);
    const container = document.body;
    let counter = 0;
    function create(text = '', opts = {}) {
      counter += 1;
      const id = `toast-${counter}`;
      const node = tpl.content.cloneNode(true).children[0];
      node.id = id;
      node.querySelector('.toast__text').textContent = text;
      container.appendChild(node);
      requestAnimationFrame(() => {
        node.style.opacity = '1';
        node.style.transform = 'translateY(0)';
        node.dataset.show = '1';
      });
      const t = setTimeout(() => {
        hide(node);
      }, opts.timeout || CFG.ui.toastTimeout);
      node.dataset._timeout = String(t);
      node.addEventListener('click', () => hide(node));
      return node;
    }
    function hide(node) {
      if (!node) return;
      clearTimeout(Number(node.dataset._timeout));
      node.style.opacity = '0';
      node.style.transform = 'translateY(8px)';
      setTimeout(() => node.remove(), 340);
    }
    return { create, hide };
  })();

  /* ------------------------------
   * Modal / overlay handling
   * ------------------------------ */
  function openModal(text = '') {
    const overlay = q(CFG.selectors.overlay);
    if (!overlay) return;
    overlay.querySelector('.modal__body p').textContent = text || 'Action completed';
    overlay.hidden = false;
    const cleanup = trapFocus(overlay.querySelector('.modal'));
    const closeBtn = q(CFG.selectors.modalClose, overlay);
    function closeHandler() {
      overlay.hidden = true;
      cleanup();
      closeBtn.removeEventListener('click', closeHandler);
    }
    on(closeBtn, 'click', closeHandler);
    on(overlay, 'escape', closeHandler);
    on(q(CFG.selectors.modalOK, overlay), 'click', closeHandler);
  }

  /* ------------------------------
   * Lightweight analytics / perf monitor
   * ------------------------------ */
  const Perf = (function () {
    const fpsEl = q(CFG.selectors.fpsEl);
    const trisEl = q(CFG.selectors.trisEl);
    const memEl = q(CFG.selectors.memEl);
    let last = now();
    let frames = 0;
    let fps = 0;
    function frameTick(renderer) {
      frames++;
      const t = now();
      const dt = t - last;
      if (dt >= 1000) {
        fps = Math.round((frames * 1000) / dt);
        frames = 0;
        last = t;
        if (fpsEl) fpsEl.textContent = String(fps);
        if (renderer && trisEl) {
          try {
            trisEl.textContent = String(renderer.info.render.triangles || 0);
          } catch (e) {
            trisEl.textContent = '—';
          }
        }
        if (memEl) {
          if (performance && performance.memory && performance.memory.usedJSHeapSize) {
            const used = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
            memEl.textContent = `${used}MB`;
          } else {
            memEl.textContent = '—';
          }
        }
      }
    }
    return { frameTick };
  })();

  /* ------------------------------
   * Smooth scrolling via Lenis + GSAP scrollerProxy wiring
   * ------------------------------ */
  const Scroll = (function () {
    let lenis;
    function setup() {
      lenis = new Lenis({
        duration: CFG.lenis.duration,
        easing: CFG.lenis.easing,
        smooth: true,
        direction: 'vertical'
      });
      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
      gsap.ticker.add((t) => lenis && lenis.raf(t * 1000 / 60));
      if (ScrollTrigger) {
        ScrollTrigger.scrollerProxy(document.documentElement, {
          scrollTop(value) {
            if (arguments.length) {
              lenis.scrollTo(value, { immediate: true });
            }
            return lenis.scroll.instance.scroll || 0;
          },
          getBoundingClientRect() {
            return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
          },
          pinType: document.documentElement.style.transform ? 'transform' : 'fixed'
        });
        ScrollTrigger.addEventListener('refresh', () => lenis && lenis.update());
        ScrollTrigger.refresh();
      }
      return lenis;
    }
    return { setup };
  })();

  /* ------------------------------
   * GSAP scroll animations & general UI entrance choreography
   * ------------------------------ */
  function setupGSAPAnimations() {
    gsap.defaults(CFG.gsap.defaults);
    const st = ScrollTrigger;
    // reveal simple
    qAll(CFG.selectors.animReveal).forEach((el) => {
      gsap.fromTo(el, { y: 24, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 86%', end: 'top 46%' }
      });
    });
    // stagger children
    qAll('[data-anim="stagger"]').forEach((container) => {
      const children = Array.from(container.children);
      gsap.fromTo(children, { y: 12, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.7, ease: 'power3.out',
        stagger: 0.08,
        scrollTrigger: { trigger: container, start: 'top 88%' }
      });
    });
    // in animations
    qAll(CFG.selectors.animIn).forEach((el) => {
      gsap.fromTo(el, { y: 18, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 92%' }
      });
    });
    // counters
    qAll(CFG.selectors.counters).forEach((el) => {
      const parent = el.closest('.metric');
      const target = num(parent && parent.dataset.count ? parent.dataset.count : el.dataset.count ? el.dataset.count : 0);
      gsap.fromTo(el, { innerText: 0 }, {
        innerText: target,
        duration: 1.6,
        ease: 'power3.out',
        snap: { innerText: 1 },
        onUpdate() {
          el.textContent = Math.floor(this.targets()[0].innerText);
        },
        scrollTrigger: { trigger: el, start: 'top 86%', once: true }
      });
    });
    // hero copy
    const heroCopy = q('.hero__copy');
    if (heroCopy) {
      gsap.fromTo(heroCopy, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, ease: 'power3.out', delay: 0.2 });
    }
  }

  /* ------------------------------
   * Navigation interactions (toggle mobile menu, active link, progress bar)
   * ------------------------------ */
  function setupNavigation() {
    const navToggle = q(CFG.selectors.navToggle);
    const navMenu = q(CFG.selectors.navMenu);
    const progressBar = q(CFG.selectors.progressBar);
    const header = q(CFG.selectors.header);
    let lastScroll = 0;
    let ticking = false;

    if (navToggle && navMenu) {
      on(navToggle, 'click', () => {
        const expanded = navToggle.getAttribute('aria-expanded') === 'true';
        navToggle.setAttribute('aria-expanded', String(!expanded));
        navMenu.setAttribute('aria-hidden', String(expanded));
      });
    }

    qAll(CFG.selectors.navLinks).forEach((link) => {
      on(link, 'click', (e) => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
          e.preventDefault();
          const target = document.querySelector(href);
          if (target) {
            const top = target.getBoundingClientRect().top + (window.scrollY || document.documentElement.scrollTop) - parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h') || '72', 10);
            window.scrollTo({ top, behavior: 'smooth' });
          }
        }
      });
    });

    function updateProgress() {
      const doc = document.documentElement;
      const scrollTop = (window.scrollY || doc.scrollTop);
      const height = doc.scrollHeight - doc.clientHeight;
      const pct = height > 0 ? (scrollTop / height) : 0;
      if (progressBar) {
        progressBar.style.width = `${Math.round(pct * 100)}%`;
      }
      // sticky header reveal/hide
      if (!header) return;
      if (scrollTop > lastScroll && scrollTop > 200) {
        header.classList.add('hide');
      } else {
        header.classList.remove('hide');
      }
      lastScroll = scrollTop <= 0 ? 0 : scrollTop;
    }

    window.addEventListener('scroll', throttle(updateProgress, 16), { passive: true });
    updateProgress();
  }

  /* ------------------------------
   * Showcase carousel wiring (horizontal scroll track)
   * ------------------------------ */
  function setupShowcase() {
    const track = q(CFG.selectors.showcaseTrack);
    const prev = q(CFG.selectors.showPrev);
    const next = q(CFG.selectors.showNext);
    const dots = qAll(CFG.selectors.showDots);
    if (!track) return;

    let index = 0;
    const items = Array.from(track.children);
    const len = items.length;

    function goto(i, opts = {}) {
      index = clamp(i, 0, len - 1);
      const width = track.clientWidth;
      const x = index * width;
      track.scrollTo({ left: x, behavior: opts.instant ? 'auto' : 'smooth' });
      dots.forEach((d, di) => d.setAttribute('aria-selected', String(di === index)));
    }

    on(prev, 'click', () => goto(index - 1));
    on(next, 'click', () => goto(index + 1));
    dots.forEach((d, i) => on(d, 'click', () => goto(i)));

    // snap on scrollend to nearest
    let isScrolling;
    on(track, 'scroll', () => {
      window.clearTimeout(isScrolling);
      isScrolling = window.setTimeout(() => {
        const width = track.clientWidth;
        const newIndex = Math.round(track.scrollLeft / width);
        goto(newIndex, { instant: false });
      }, 100);
    });

    // keyboard friendly
    on(track, 'keydown', (e) => {
      if (e.key === 'ArrowRight') goto(index + 1);
      if (e.key === 'ArrowLeft') goto(index - 1);
    });

    // init
    goto(0, { instant: true });
  }

  /* ------------------------------
   * Form validation / submission (local simulated)
   * ------------------------------ */
  function setupForm() {
    const form = q(CFG.selectors.form);
    const status = q(CFG.selectors.formStatus);
    if (!form) return;
    on(form, 'submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const name = String(fd.get('name') || '').trim();
      const email = String(fd.get('email') || '').trim();
      const message = String(fd.get('message') || '').trim();
      if (!name) {
        if (status) status.textContent = 'Please enter your name';
        Toast.create('Please enter your name');
        return;
      }
      if (!/\S+@\S+\.\S+/.test(email)) {
        if (status) status.textContent = 'Please enter a valid email';
        Toast.create('Please enter a valid email');
        return;
      }
      if (!message || message.length < 12) {
        if (status) status.textContent = 'Tell us a bit more about the project';
        Toast.create('Tell us a bit more about the project');
        return;
      }
      // simulate network and show modal
      if (status) status.textContent = 'Sending…';
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      setTimeout(() => {
        if (submitBtn) submitBtn.disabled = false;
        if (status) status.textContent = '';
        openModal('Thanks! Your request has been received. We will reply within 2 business days.');
        form.reset();
      }, 900 + Math.random() * 900);
    });
  }

  /* ------------------------------
   * Small utilities for interactive hover/magnetic effects
   * ------------------------------ */
  function setupMagnetic() {
    const magnets = qAll(CFG.selectors.magneticElements);
    if (!magnets.length) return;
    magnets.forEach((el) => {
      const sensitivity = 36;
      function onMove(e) {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const x = (e.clientX - cx) / sensitivity;
        const y = (e.clientY - cy) / sensitivity;
        el.style.transform = `translate3d(${x}px, ${y}px, 6px) rotateX(${clamp(-y, -8, 8)}deg) rotateY(${clamp(x, -8, 8)}deg)`;
      }
      function onLeave() {
        el.style.transform = '';
      }
      on(el, 'mousemove', onMove);
      on(el, 'mouseleave', onLeave);
      on(el, 'touchmove', (e) => {
        if (e.touches && e.touches[0]) onMove(e.touches[0]);
      }, { passive: true });
      on(el, 'touchend', onLeave);
    });
  }

  /* ------------------------------
   * Hover underline accessibility wiring (keyboard + mouse focus)
   * ------------------------------ */
  function setupUnderlineHover() {
    qAll(CFG.selectors.hoverUnderline).forEach((el) => {
      on(el, 'mouseenter', () => {
        el.classList.add('underline--visible');
      });
      on(el, 'mouseleave', () => {
        el.classList.remove('underline--visible');
      });
      on(el, 'focus', () => {
        el.classList.add('underline--visible');
      });
      on(el, 'blur', () => {
        el.classList.remove('underline--visible');
      });
    });
  }

  /* ------------------------------
   * 3D scene (Three.js) setup and lightweight procedural content
   * ------------------------------ */
  function setupThree() {
    const canvas = q(CFG.selectors.canvas);
    if (!canvas) return null;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setClearColor(CFG.three.clearColor, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CFG.three.pixelRatioLimit));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Scene and camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000011, 0.0022);
    const camera = new THREE.PerspectiveCamera(CFG.three.camera.fov, window.innerWidth / window.innerHeight, CFG.three.camera.near, CFG.three.camera.far);
    camera.position.set(CFG.three.camera.x, CFG.three.camera.y, CFG.three.camera.z);

    // Controls (orbit for demonstration, but disabled by default on mobile)
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = false;
    controls.enablePan = false;
    controls.minDistance = 2;
    controls.maxDistance = 20;

    // Responsive resize
    function resize() {
      const DPR = Math.min(window.devicePixelRatio || 1, CFG.three.pixelRatioLimit);
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setPixelRatio(DPR);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    on(window, 'resize', debounce(resize, 80));
    resize();

    // Lights
    const hemi = new THREE.HemisphereLight(0x88ccff, 0x0b0b17, 0.6);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(6, 8, 6);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 500;
    scene.add(dir);

    // subtle environment sphere to color ambient
    const envMat = new THREE.MeshBasicMaterial({ color: 0x001122, side: THREE.BackSide, transparent: true, opacity: 0.12 });
    const envSphere = new THREE.Mesh(new THREE.SphereGeometry(60, 24, 24), envMat);
    envSphere.receiveShadow = false;
    scene.add(envSphere);

    // Group for objects
    const root = new THREE.Group();
    scene.add(root);

    // Procedural torus cluster (decorative)
    const torusGroup = new THREE.Group();
    root.add(torusGroup);

    (function buildTori() {
      const count = 9;
      for (let i = 0; i < count; i++) {
        const geo = new THREE.TorusGeometry(0.8 + i * 0.08, 0.08 + (i % 2) * 0.03, 20, 80);
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL((0.55 + (i / count) * 0.25) % 1, 0.7, 0.48),
          metalness: 0.6,
          roughness: 0.18,
          emissive: new THREE.Color(0x001f2f).multiplyScalar(0.3)
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.position.set(Math.cos(i / count * Math.PI * 2) * (1.6 + i * 0.14), Math.sin(i / count * Math.PI * 2) * (0.6 + i * 0.06), -i * 0.06);
        mesh.rotation.x = Math.PI * 0.15 * (i % 2 ? -1 : 1);
        mesh.userData.index = i;
        torusGroup.add(mesh);
      }
    })();

    // Particle field (simple GPU-friendly points)
    const particleCount = 420;
    const particlesGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 18;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 6;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6;
      sizes[i] = Math.random() * 8 + 6;
    }
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    particlesGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const particlesMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, CFG.three.pixelRatioLimit) },
        uColor: { value: new THREE.Color(0x00f6ff) }
      },
      vertexShader: [
        'attribute float size;',
        'uniform float uTime;',
        'uniform float uPixelRatio;',
        'varying float vAlpha;',
        'void main(){',
        '  vec3 p = position;',
        '  float t = uTime * 0.0006;',
        '  p.x += sin(p.z * 0.1 + t * 2.0) * 0.6;',
        '  p.y += cos(p.x * 0.06 + t * 1.2) * 0.2;',
        '  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);',
        '  gl_PointSize = size * (uPixelRatio) * (150.0 / -mvPosition.z);',
        '  vAlpha = 0.7 - clamp(length(p) * 0.03, 0.0, 0.7);',
        '  gl_Position = projectionMatrix * mvPosition;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 uColor;',
        'varying float vAlpha;',
        'void main(){',
        '  vec2 uv = gl_PointCoord - 0.5;',
        '  float d = length(uv);',
        '  float a = smoothstep(0.6, 0.0, d);',
        '  gl_FragColor = vec4(uColor, a * vAlpha);',
        '}'
      ].join('\n')
    });
    const particleSystem = new THREE.Points(particlesGeo, particlesMat);
    particleSystem.position.set(0, 0, -8);
    root.add(particleSystem);

    // subtle ground plane (for contact)
    const planeGeo = new THREE.PlaneGeometry(160, 40, 2, 2);
    const planeMat = new THREE.MeshStandardMaterial({ color: 0x031219, roughness: 1, metalness: 0 });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2.6;
    plane.position.y = -6.6;
    plane.receiveShadow = true;
    scene.add(plane);

    // small orbiting point light for cinematic highlights
    const orbitLight = new THREE.PointLight(0x00f6ff, 0.9, 48, 2);
    orbitLight.position.set(4, 3.4, 2);
    scene.add(orbitLight);

    // Raycaster for pointer interactions
    const ray = new THREE.Raycaster();
    const pointer = new THREE.Vector2(-1, -1);

    // pointer effect target
    let pointer3D = new THREE.Vector3();

    function onPointerMove(e) {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      pointer.set(x, y);
      ray.setFromCamera(pointer, camera);
      const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      ray.ray.intersectPlane(planeZ, pointer3D);
    }

    on(window, 'pointermove', onPointerMove, { passive: true });

    // interactive hover effect: scale nearest torus based on pointer proximity
    function updateTori(dt) {
      torusGroup.children.forEach((m) => {
        const d = m.position.distanceTo(pointer3D);
        const t = clamp(1 - d * 0.26, 0, 1);
        const s = lerp(0.98, 1.14, easeOutCubic(t));
        m.scale.setScalar(s);
        m.rotation.z += 0.002 + 0.002 * (m.userData.index % 3);
        m.rotation.y += 0.001;
      });
    }

    // small wobble root
    let elapsed = 0;
    function animateThree(dt) {
      elapsed += dt;
      // rotate root slowly for parallax depth
      root.rotation.y = Math.sin(elapsed * 0.0005) * 0.12;
      root.position.y = Math.sin(elapsed * 0.0003) * 0.12;
      particleSystem.material.uniforms.uTime.value = elapsed;
      particleSystem.rotation.y += 0.0002;
      orbitLight.position.x = Math.cos(elapsed * 0.0007) * 3.6;
      orbitLight.position.z = Math.sin(elapsed * 0.0009) * 3.6;
      // update interactive pieces
      updateTori(dt);
      controls.update();
      renderer.render(scene, camera);
      Perf.frameTick(renderer);
    }

    // Animation loop (we will integrate with Lenis' RAF)
    let lastTime = now();
    function renderLoop() {
      const t = now();
      const dt = t - lastTime;
      lastTime = t;
      animateThree(dt);
      requestAnimationFrame(renderLoop);
    }

    requestAnimationFrame(renderLoop);

    // Expose a small API for external animations and debug
    return {
      renderer,
      scene,
      camera,
      root,
      resize,
      start: () => renderLoop(),
      dispose: function () {
        // minimal dispose logic
        renderer.dispose();
        particlesGeo.dispose();
        particleSystem.material.dispose();
        torusGroup.children.forEach((m) => {
          if (m.geometry) m.geometry.dispose();
          if (m.material) m.material.dispose();
        });
      }
    };
  }

  /* ------------------------------
   * Floating UI sparkles and particles for the DOM (tiny)
   * ------------------------------ */
  function injectParticles() {
    try {
      const hero = q('.hero__scene');
      if (!hero) return;
      // create several DOM particles using template
      const tpl = q('#tpl-particle');
      if (!tpl) return;
      for (let i = 0; i < 14; i++) {
        const node = tpl.content.cloneNode(true).children[0];
        node.style.left = `${10 + Math.random() * 80}%`;
        node.style.top = `${10 + Math.random() * 70}%`;
        node.style.width = `${4 + Math.random() * 10}px`;
        node.style.height = node.style.width;
        node.style.opacity = String(0.6 + Math.random() * 0.6);
        node.style.transform = `translate3d(0,0,${Math.random() * 8}px)`;
        hero.appendChild(node);
        gsap.to(node, { y: -4 - Math.random() * 12, x: -6 + Math.random() * 12, opacity: 0.1, ease: 'sine.inOut', repeat: -1, yoyo: true, duration: 3 + Math.random() * 3, delay: Math.random() * 1.4 });
      }
    } catch (e) {
      // swallow silently
    }
  }

  /* ------------------------------
   * Initialize page scripts
   * ------------------------------ */
  function init() {
    // populate year in footer
    const yearEl = q(CFG.selectors.yearEl);
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    // split text
    splitWords(document);
    splitChars(document);

    // attach UI interactions
    setupNavigation();
    setupShowcase();
    setupForm();
    setupMagnetic();
    setupUnderlineHover();
    injectParticles();

    // Smooth scroll + GSAP bindings
    Scroll.setup();
    setupGSAPAnimations();

    // Three.js scene
    const threeApi = setupThree();

    // small HUD and event wiring
    // showcase dots keyboard support
    qAll(CFG.selectors.showDots).forEach((btn, i) => {
      on(btn, 'keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          btn.click();
        }
      });
    });

    // Modal close triggers
    const overlay = q(CFG.selectors.overlay);
    if (overlay) {
      on(overlay, 'click', (e) => {
        if (e.target === overlay) overlay.hidden = true;
      });
      on(q(CFG.selectors.modalClose, overlay), 'click', () => overlay.hidden = true);
      on(q(CFG.selectors.modalOK, overlay), 'click', () => overlay.hidden = true);
    }

    // tiny keyboard shortcuts
    on(window, 'keydown', (e) => {
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const input = q('.newsletter input[type="email"]');
        if (input) input.focus();
      } else if (e.key === 'm' && e.altKey) {
        const modal = q(CFG.selectors.overlay);
        if (modal) {
          modal.hidden = !modal.hidden;
        }
      }
    });

    // performance stats update loop (separate interval)
    setInterval(() => {
      // update is handled by Perf.frameTick in render loop
    }, CFG.ui.statsUpdateInterval);

    // greeting toast
    setTimeout(() => {
      Toast.create('Welcome to Futurum — scroll to explore the 3D space');
    }, 600);

    // return APIs for potential dev use
    return {
      three: threeApi,
      toast: Toast
    };
  }

  /* ------------------------------
   * Utility: progressive enhancement fallback for older browsers
   * ------------------------------ */
  function featureDetect() {
    return {
      webgl: (function () {
        try {
          const canvas = document.createElement('canvas');
          return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
          return false;
        }
      })()
    };
  }

  /* ------------------------------
   * Entrypoint
   * ------------------------------ */
  ready(() => {
    const feats = featureDetect();
    if (!feats.webgl) {
      // if WebGL not supported, show friendly notification and do not initialize 3D
      Toast.create('WebGL not supported — 3D scene disabled, UI remains interactive.');
      // still do UI and GSAP animations without Three.js
      Scroll.setup();
      setupGSAPAnimations();
      setupNavigation();
      setupShowcase();
      setupForm();
      setupMagnetic();
      setupUnderlineHover();
      injectParticles();
      return;
    }
    try {
      init();
    } catch (err) {
      // show error gracefully and fallback
      console.error('Initialization error:', err);
      Toast.create('An error occurred initializing the 3D scene. UI fallback enabled.');
      // attempt partial UI hookup
      try {
        setupNavigation();
        setupShowcase();
        setupForm();
        setupMagnetic();
        setupUnderlineHover();
        setupGSAPAnimations();
        injectParticles();
        Scroll.setup();
      } catch (e) {
        // swallow
        console.error('Fallback init error:', e);
      }
    }
  });

  /* ------------------------------
   * Extra: enhance focus styles for keyboard users, detect reduced motion
   * ------------------------------ */
  (function enhanceAccessibility() {
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      gsap.globalTimeline.timeScale(0.6);
      document.documentElement.classList.add('reduced-motion');
    }
    document.addEventListener('keyup', (e) => {
      if (e.key === 'Tab') document.documentElement.classList.add('user-is-tabbing');
    });
  })();

  /* ------------------------------
   * Extra: small utility library of DOM creation helpers used in demo
   * ------------------------------ */
  const DOM = {
    el(tag, attrs = {}, children = []) {
      const n = document.createElement(tag);
      Object.keys(attrs).forEach((k) => {
        if (k === 'style') Object.assign(n.style, attrs[k]);
        else if (k === 'html') n.innerHTML = attrs[k];
        else if (k === 'text') n.textContent = attrs[k];
        else n.setAttribute(k, attrs[k]);
      });
      (Array.isArray(children) ? children : [children]).forEach((c) => {
        if (typeof c === 'string') n.appendChild(document.createTextNode(c));
        else if (c instanceof Node) n.appendChild(c);
      });
      return n;
    },
    bind(el, ev, fn) { on(el, ev, fn); }
  };

  /* ------------------------------
   * Extra small toolkit: compute and set CSS variable parallax values based on scroll
   * ------------------------------ */
  function setupParallaxCSS() {
    const nodes = qAll('[data-parallax]');
    if (!nodes.length) return;
    function update() {
      const scrollerTop = window.scrollY || document.documentElement.scrollTop;
      nodes.forEach((n) => {
        const speed = num(n.dataset.parallax, 0.2);
        const rect = n.getBoundingClientRect();
        const offsetTop = rect.top + scrollerTop;
        const center = offsetTop + rect.height / 2;
        const distance = scrollerTop + window.innerHeight / 2 - center;
        const p = clamp(distance / (window.innerHeight * 0.8) * speed, -1, 1);
        n.style.setProperty('--p', String(Math.abs(p)));
      });
    }
    on(window, 'scroll', throttle(update, 12), { passive: true });
    on(window, 'resize', debounce(update, 80));
    update();
  }

  /* ------------------------------
   * Run smaller enhancements after load
   * ------------------------------ */
  ready(() => {
    setupParallaxCSS();
  });

  /* ------------------------------
   * End of script
   * ------------------------------ */
})();
