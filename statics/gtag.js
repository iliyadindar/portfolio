window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-93853W5SBL');

(function loadAnalyticsWhenIdle() {
    const inject = () => {
        if (document.querySelector('script[data-analytics="gtag"]')) return;
        const script = document.createElement('script');
        script.src = 'https://www.googletagmanager.com/gtag/js?id=G-93853W5SBL';
        script.async = true;
        script.dataset.analytics = 'gtag';
        document.head.appendChild(script);
    };
    const schedule = () => {
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(inject, { timeout: 3500 });
        } else {
            window.setTimeout(inject, 2500);
        }
    };
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });
}());
