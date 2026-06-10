// Reveal animations are gated on this class so content stays visible without JS
document.documentElement.classList.add('js');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const gsapActive = !prefersReducedMotion && typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

/* ════════════════════════════════════════════════════════
   Reveal system
   GSAP path: ScrollTrigger-batched staggers.
   Fallback:  IntersectionObserver + .visible class.
   Either way, revealEl() registers late-added cards too.
   ════════════════════════════════════════════════════════ */
let revealEl;
let fallbackObserver = null;

if (!gsapActive) {
    fallbackObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => entry.target.classList.add('visible'), i * 50);
                fallbackObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach(el => fallbackObserver.observe(el));
    revealEl = (el) => fallbackObserver.observe(el);
}

/* ════════════════════════════════════════════════════════
   GSAP — cinematic scroll experience
   ════════════════════════════════════════════════════════ */
if (gsapActive) {
    gsap.registerPlugin(ScrollTrigger);
    document.documentElement.classList.add('gsap');

    /* ---- text splitting (keeps accessible names via aria-label) ---- */
    function splitChars(el) {
        const label = el.textContent.replace(/\s+/g, ' ').trim();
        el.setAttribute('aria-label', label);
        const wrap = (node) => {
            [...node.childNodes].forEach(child => {
                if (child.nodeType === Node.TEXT_NODE) {
                    const frag = document.createDocumentFragment();
                    for (const ch of child.textContent) {
                        if (ch.trim() === '') {
                            frag.appendChild(document.createTextNode(ch));
                        } else {
                            const s = document.createElement('span');
                            s.className = 'ch';
                            s.textContent = ch;
                            frag.appendChild(s);
                        }
                    }
                    child.replaceWith(frag);
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    wrap(child);
                }
            });
        };
        wrap(el);
        [...el.children].forEach(c => c.setAttribute('aria-hidden', 'true'));
        return el.querySelectorAll('.ch');
    }

    function splitWords(el) {
        const label = el.textContent.replace(/\s+/g, ' ').trim();
        el.setAttribute('aria-label', label);
        el.textContent = '';
        label.split(' ').forEach((w, i, arr) => {
            const s = document.createElement('span');
            s.className = 'w';
            s.textContent = w;
            s.setAttribute('aria-hidden', 'true');
            el.appendChild(s);
            if (i < arr.length - 1) el.appendChild(document.createTextNode(' '));
        });
        return el.querySelectorAll('.w');
    }

    /* ---- hero intro (plays on load) ---- */
    const heroName = document.querySelector('.hero-name[data-split]');
    const chars = heroName ? splitChars(heroName) : [];

    const intro = gsap.timeline({ defaults: { ease: 'power4.out' } });
    intro
        .from('.terminal-line', { y: 18, opacity: 0, duration: 0.6 }, 0.1)
        .from(chars, { yPercent: 110, opacity: 0, rotate: 5, duration: 1.1, stagger: 0.04 }, 0.25)
        .from('.hero-tagline', { y: 28, opacity: 0, duration: 0.9 }, '-=0.65')
        .from('.hero-title', { y: 18, opacity: 0, duration: 0.7 }, '-=0.65')
        .from('.hero-desc', { y: 18, opacity: 0, duration: 0.7 }, '-=0.55')
        .from('.hero-actions > *', { y: 22, opacity: 0, duration: 0.7, stagger: 0.08 }, '-=0.5')
        .from('.status-bar .status-item', { y: 14, opacity: 0, duration: 0.5, stagger: 0.07 }, '-=0.45')
        .from('.scroll-cue', { opacity: 0, duration: 0.8 }, '-=0.2');

    /* ---- pinned cinematic hero: layers part at different depths ---- */
    const mm = gsap.matchMedia();
    mm.add('(min-width: 881px)', () => {
        const heroScrub = gsap.timeline({
            scrollTrigger: {
                trigger: '.hero',
                start: 'top top',
                end: '+=60%',
                scrub: 0.6,
                pin: true,
                anticipatePin: 1
            },
            defaults: { ease: 'none' }
        });
        heroScrub
            .to('.hero-inner', { yPercent: -12, scale: 0.95, opacity: 0 }, 0)
            .to('.scroll-cue', { opacity: 0 }, 0)
            .to('.hb-rings', { scale: 1.3, opacity: 0.25 }, 0);
        gsap.utils.toArray('.hero [data-hero-depth]').forEach(layer => {
            const depth = parseFloat(layer.dataset.heroDepth) || 0.5;
            heroScrub.to(layer, { yPercent: -(1 - depth) * 90, scale: 1 + (1 - depth) * 0.3 }, 0);
        });
        return () => {}; // matchMedia cleans up its own triggers
    });

    mm.add('(max-width: 880px)', () => {
        // lighter, unpinned parallax on small screens
        gsap.to('.hero-inner', {
            yPercent: -8, opacity: 0.15, ease: 'none',
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 }
        });
    });

    /* ---- global layered backdrop drift (parallax by data-depth) ---- */
    gsap.utils.toArray('.cine-bg [data-depth]').forEach(layer => {
        const depth = parseFloat(layer.dataset.depth) || 0;
        gsap.to(layer, {
            y: () => -depth * 400,
            ease: 'none',
            scrollTrigger: { start: 0, end: 'max', scrub: 1.2, invalidateOnRefresh: true }
        });
    });

    /* ---- section titles: word-by-word rise ---- */
    gsap.utils.toArray('[data-split-words]').forEach(title => {
        const words = splitWords(title);
        gsap.set(title, { opacity: 1, y: 0 }); // override .reveal initial state
        gsap.from(words, {
            yPercent: 115, opacity: 0, rotate: 3,
            duration: 0.85, ease: 'power4.out', stagger: 0.07,
            scrollTrigger: { trigger: title, start: 'top 86%', once: true }
        });
    });

    /* ---- batched card / block reveals ---- */
    ScrollTrigger.batch('.reveal:not([data-split-words])', {
        start: 'top 88%',
        once: true,
        onEnter: batch => gsap.to(batch, {
            opacity: 1, y: 0,
            duration: 0.9, ease: 'power3.out',
            stagger: 0.09, overwrite: true
        })
    });

    revealEl = (el) => {
        gsap.to(el, {
            opacity: 1, y: 0,
            duration: 0.9, ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 92%', once: true }
        });
    };

    /* ---- stat counters ---- */
    gsap.utils.toArray('.stat-num[data-count]').forEach(el => {
        const target = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        if (isNaN(target)) return;
        const state = { v: 0 };
        el.textContent = '0' + suffix;
        ScrollTrigger.create({
            trigger: el, start: 'top 88%', once: true,
            onEnter: () => gsap.to(state, {
                v: target, duration: 1.8, ease: 'power2.out',
                onUpdate: () => { el.textContent = Math.round(state.v) + suffix; }
            })
        });
    });

    /* ---- marquee: constant roll, accelerates with scroll velocity ---- */
    const track = document.querySelector('[data-marquee]');
    if (track) {
        track.style.animation = 'none'; // GSAP replaces the CSS fallback loop
        const roll = gsap.to(track, { xPercent: -50, ease: 'none', duration: 30, repeat: -1 });
        ScrollTrigger.create({
            onUpdate: (self) => {
                const boost = gsap.utils.clamp(1, 6, Math.abs(self.getVelocity()) / 300);
                roll.timeScale(boost);
                gsap.to(roll, { timeScale: 1, duration: 1.2, ease: 'power2.out', overwrite: true });
            }
        });
    }

    /* ---- scroll progress bar ---- */
    gsap.to('.scroll-progress', {
        scaleX: 1, ease: 'none',
        scrollTrigger: { start: 0, end: 'max', scrub: 0.3 }
    });
}

/* ════════════════════════════════════════════════════════
   Core UI (independent of GSAP)
   ════════════════════════════════════════════════════════ */

// Hamburger menu
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('active', open);
    hamburger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
});
function closeMenu() {
    hamburger.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
}
mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('open')) closeMenu();
});

// Typing effect for terminal line
const cmdEl = document.querySelector('.terminal-line .cmd');
if (cmdEl && !prefersReducedMotion) {
    const text = cmdEl.textContent;
    cmdEl.textContent = '';
    let i = 0;
    const type = () => {
        if (i < text.length) { cmdEl.textContent += text[i]; i++; setTimeout(type, 80 + Math.random() * 60); }
    };
    setTimeout(type, 500);
}

// Nav elevation (+ scroll progress fallback when GSAP is unavailable)
const nav = document.querySelector('.site-nav');
const progressBar = document.querySelector('.scroll-progress');
const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 24);
    if (progressBar && !gsapActive) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progressBar.style.transform = `scaleX(${max > 0 ? Math.min(window.scrollY / max, 1) : 0})`;
    }
};
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// Scroll spy — highlight the nav link of the section in view
const navAnchors = [...document.querySelectorAll('.nav-links a[href^="#"]')];
const spyTargets = navAnchors
    .map(a => document.getElementById(a.hash.slice(1)))
    .filter(Boolean);
const spy = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navAnchors.forEach(a => a.classList.toggle('active', a.hash === `#${entry.target.id}`));
    });
}, { rootMargin: '-35% 0px -55% 0px' });
spyTargets.forEach(sec => spy.observe(sec));

// Footer year
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Auto-crawl GitHub repos: star badges for every repo card + cards for missing repos
(async function loadGitHubProjects() {
    const GITHUB_USERNAME = 'iliyadindar';
    const grid = document.querySelector('.projects-grid');
    if (!grid) return;

    const existingCards = grid.querySelectorAll('.project-card');
    const existingUrls = new Set();
    const existingNames = new Set();
    existingCards.forEach(card => {
        const href = card.getAttribute('href');
        if (href) existingUrls.add(href.toLowerCase().replace(/\/$/, ''));
        const nameEl = card.querySelector('.project-info h3');
        if (nameEl) existingNames.add(nameEl.textContent.trim().toLowerCase());
    });

    // Static icon markup only — never interpolate external data into these strings
    const strokeIcon = (body) =>
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
    const ICONS = {
        terminal: strokeIcon('<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>'),
        code:     strokeIcon('<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>'),
        cpu:      strokeIcon('<rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>'),
        zap:      strokeIcon('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'),
        globe:    strokeIcon('<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'),
        folder:   strokeIcon('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'),
    };
    const STAR_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';

    const langConfig = {
        'python':     { icon: ICONS.terminal, color: 'b' },
        'javascript': { icon: ICONS.zap, color: 'a' },
        'typescript': { icon: ICONS.zap, color: 'b' },
        'c++':        { icon: ICONS.cpu, color: 'c' },
        'c':          { icon: ICONS.cpu, color: 'c' },
        'go':         { icon: ICONS.code, color: 'b' },
        'rust':       { icon: ICONS.cpu, color: 'r' },
        'java':       { icon: ICONS.code, color: 'r' },
        'php':        { icon: ICONS.globe, color: 'g' },
        'shell':      { icon: ICONS.terminal, color: 'g' },
        'html':       { icon: ICONS.globe, color: 'a' },
        'css':        { icon: ICONS.code, color: 'c' },
    };
    const defaultConfig = { icon: ICONS.folder, color: 'g' };

    // Star badge next to the project title; count is inserted as a text node
    function addStarBadge(card, count) {
        const h3 = card.querySelector('.project-info h3');
        if (!h3 || h3.querySelector('.repo-stars')) return;
        const badge = document.createElement('span');
        badge.className = 'repo-stars';
        badge.title = `${count} stars on GitHub`;
        badge.innerHTML = STAR_ICON;
        badge.appendChild(document.createTextNode(String(count)));
        h3.appendChild(badge);
    }

    // Build card using DOM APIs — external data only ever set via textContent
    function createProjectCard(repo, cfg, desc, tags) {
        const card = document.createElement('a');
        card.href = repo.html_url;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';           // prevent tab-napping
        card.className = 'project-card reveal';

        // Icon
        const iconDiv = document.createElement('div');
        iconDiv.className = `project-icon ${cfg.color}`;
        iconDiv.setAttribute('aria-hidden', 'true');
        iconDiv.innerHTML = cfg.icon;

        // Info wrapper
        const infoDiv = document.createElement('div');
        infoDiv.className = 'project-info';

        const h3 = document.createElement('h3');
        h3.textContent = repo.name;

        const p = document.createElement('p');
        p.className = 'desc';
        p.textContent = desc;

        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'project-tags';
        tags.forEach(t => {
            const span = document.createElement('span');
            span.className = 'ptag';
            span.textContent = t;
            tagsDiv.appendChild(span);
        });

        infoDiv.appendChild(h3);
        infoDiv.appendChild(p);
        infoDiv.appendChild(tagsDiv);

        // Arrow
        const arrow = document.createElement('span');
        arrow.className = 'project-arrow';
        arrow.setAttribute('aria-hidden', 'true');
        arrow.textContent = '↗';

        card.appendChild(iconDiv);
        card.appendChild(infoDiv);
        card.appendChild(arrow);

        return card;
    }

    try {
        const resp = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated&type=owner`);
        if (!resp.ok) return;
        const repos = await resp.json();

        // Live star counts for the hardcoded cards that link to a known repo
        const repoByUrl = new Map();
        repos.forEach(r => repoByUrl.set(r.html_url.toLowerCase().replace(/\/$/, ''), r));
        existingCards.forEach(card => {
            const href = (card.getAttribute('href') || '').toLowerCase().replace(/\/$/, '');
            const repo = repoByUrl.get(href);
            if (repo) addStarBadge(card, repo.stargazers_count || 0);
        });

        const newRepos = repos.filter(repo => {
            if (repo.fork) return false;
            if (repo.name.toLowerCase() === GITHUB_USERNAME.toLowerCase()) return false;
            const repoUrl = repo.html_url.toLowerCase().replace(/\/$/, '');
            const repoName = repo.name.toLowerCase();
            return !existingUrls.has(repoUrl) && !existingNames.has(repoName);
        });

        // Most-starred first, then most recently updated
        newRepos.sort((a, b) =>
            (b.stargazers_count || 0) - (a.stargazers_count || 0) ||
            new Date(b.updated_at) - new Date(a.updated_at)
        );

        newRepos.forEach(repo => {
            const lang = (repo.language || '').toLowerCase();
            const cfg = langConfig[lang] || defaultConfig;
            const desc = repo.description || `${repo.name} — a GitHub project.`;

            const tags = [];
            if (repo.language) tags.push(repo.language);
            if (repo.topics) {
                repo.topics.slice(0, 3).forEach(t => {
                    const tag = t.charAt(0).toUpperCase() + t.slice(1);
                    if (!tags.includes(tag)) tags.push(tag);
                });
            }
            if (tags.length === 0) tags.push('Code');

            const card = createProjectCard(repo, cfg, desc, tags);
            addStarBadge(card, repo.stargazers_count || 0);
            grid.appendChild(card);
            if (revealEl) revealEl(card);
        });

        if (gsapActive && newRepos.length) ScrollTrigger.refresh();
    } catch (e) {}
})();
