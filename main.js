
const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');
const navLinks = document.querySelectorAll('.site-nav a');
const filterButtons = document.querySelectorAll('[data-filter]');
const courseCards = document.querySelectorAll('.course-card');
const testimonialCards = document.querySelectorAll('[data-testimonial]');
const testimonialDots = document.querySelectorAll('.dot');
const ctaForm = document.querySelector('#cta-form');
const formMessage = document.querySelector('#form-message');

if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('is-open');
    document.body.classList.toggle('menu-open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      siteNav.classList.remove('is-open');
      document.body.classList.remove('menu-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const selected = button.dataset.filter;

    filterButtons.forEach((item) => item.classList.remove('is-active'));
    button.classList.add('is-active');

    courseCards.forEach((card) => {
      const shouldShow = selected === 'all' || card.dataset.track === selected;
      card.classList.toggle('is-hidden', !shouldShow);
      card.setAttribute('aria-hidden', String(!shouldShow));
    });
  });
});

let activeSlide = 0;
let sliderTimer;

const showSlide = (index) => {
  activeSlide = index;

  testimonialCards.forEach((card, cardIndex) => {
    card.classList.toggle('is-visible', cardIndex === activeSlide);
  });

  testimonialDots.forEach((dot, dotIndex) => {
    dot.classList.toggle('is-active', dotIndex === activeSlide);
  });
};

const startSlider = () => {
  if (testimonialCards.length < 2) {
    return;
  }

  clearInterval(sliderTimer);
  sliderTimer = window.setInterval(() => {
    const nextIndex = (activeSlide + 1) % testimonialCards.length;
    showSlide(nextIndex);
  }, 5000);
};

testimonialDots.forEach((dot, index) => {
  dot.addEventListener('click', () => {
    showSlide(index);
    startSlider();
  });
});

showSlide(0);
startSlider();

if (ctaForm && formMessage) {
  ctaForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(ctaForm);
    const email = String(data.get('email') || '').trim();

    if (!email) {
      formMessage.textContent = 'Please enter a valid email address.';
      return;
    }

    formMessage.textContent = `Thanks! We'll send MentorLoop updates to ${email}.`;
    ctaForm.reset();
  });
}

