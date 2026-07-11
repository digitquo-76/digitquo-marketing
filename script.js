/* =========================================================
   DigitQuo — Landing Page Scripts
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initActiveNavSection();
  initMobileMenu();
  initScrollReveal();
  initCountUp();
});


/* ---------------------------------------------------------
   NAVBAR — scroll-based styling
   --------------------------------------------------------- */
function initNavbar() {
  const navbar = document.getElementById('navbar');

  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    if (currentScroll > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });
}

function initActiveNavSection() {
  const navbar = document.getElementById('navbar');
  const navLinks = [...document.querySelectorAll('.nav-links a[href^="#"]')];

  if (!navLinks.length) return;

  const sectionMap = navLinks
    .map(link => {
      const section = document.querySelector(link.getAttribute('href'));
      return section ? { link, section } : null;
    })
    .filter(Boolean);

  if (!sectionMap.length) return;

  function setActiveLink(activeId) {
    sectionMap.forEach(({ link, section }) => {
      const isActive = section.id === activeId;
      link.classList.toggle('active', isActive);

      if (isActive) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function updateActiveSection() {
    const navbarHeight = navbar ? navbar.offsetHeight : 0;
    const marker = window.scrollY + navbarHeight + window.innerHeight * 0.28;
    let activeId = '';

    sectionMap.forEach(({ section }) => {
      if (marker >= section.offsetTop) {
        activeId = section.id;
      }
    });

    setActiveLink(activeId);
  }

  updateActiveSection();
  window.addEventListener('scroll', updateActiveSection, { passive: true });
  window.addEventListener('resize', updateActiveSection);
}


/* ---------------------------------------------------------
   MOBILE MENU — hamburger toggle
   --------------------------------------------------------- */
function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');
  const navActions = document.querySelector('.nav-actions');

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('mobile-open');
    navActions.classList.toggle('mobile-open');
    document.body.style.overflow = navLinks.classList.contains('mobile-open') ? 'hidden' : '';
  });

  // Close mobile menu when a link is clicked
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navLinks.classList.remove('mobile-open');
      navActions.classList.remove('mobile-open');
      document.body.style.overflow = '';
    });
  });
}


/* ---------------------------------------------------------
   SCROLL REVEAL — IntersectionObserver-based
   --------------------------------------------------------- */
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(el => observer.observe(el));
}


/* ---------------------------------------------------------
   COUNT-UP ANIMATION — stat numbers
   --------------------------------------------------------- */
function initCountUp() {
  const statNumbers = document.querySelectorAll('.stat-number[data-target], .hero-stat-number[data-target]');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCountUp(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.5
  });

  statNumbers.forEach(el => observer.observe(el));
}

function animateCountUp(element) {
  const target = parseInt(element.getAttribute('data-target'), 10);
  const duration = 1800;
  const startTime = performance.now();

  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeOutQuart(progress);
    const currentValue = Math.floor(easedProgress * target);

    element.textContent = formatNumber(currentValue);

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = formatNumber(target);
    }
  }

  requestAnimationFrame(update);
}

function formatNumber(num) {
  if (num >= 1000) {
    return num.toLocaleString();
  }
  return num.toString();
}
