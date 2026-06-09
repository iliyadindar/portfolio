// Reveal animations are gated on this class so content stays visible without JS
document.documentElement.classList.add('js');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Scroll reveal
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add('visible'), i * 50);
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

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
    setTimeout(type, 400);
}

// Nav elevation on scroll
const nav = document.querySelector('.site-nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 24);
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

// Auto-crawl GitHub repos and add missing projects
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

    const langConfig = {
        'python':     { icon: '🐍', color: 'b' },
        'javascript': { icon: '⚡', color: 'a' },
        'typescript': { icon: '⚡', color: 'b' },
        'c++':        { icon: '⚙️', color: 'c' },
        'c':          { icon: '⚙️', color: 'c' },
        'go':         { icon: '🔷', color: 'b' },
        'rust':       { icon: '🦀', color: 'r' },
        'java':       { icon: '☕', color: 'r' },
        'php':        { icon: '🌐', color: 'g' },
        'shell':      { icon: '🖥️', color: 'g' },
        'html':       { icon: '🌐', color: 'a' },
        'css':        { icon: '🎨', color: 'c' },
    };
    const defaultConfig = { icon: '📂', color: 'g' };

    // Build card using DOM APIs only — zero innerHTML with external data
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
        iconDiv.textContent = cfg.icon;

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
            if (repo.stargazers_count > 0) tags.push(`★ ${repo.stargazers_count}`);

            const card = createProjectCard(repo, cfg, desc, tags);
            grid.appendChild(card);
            observer.observe(card);
        });
    } catch (e) {}
})();
