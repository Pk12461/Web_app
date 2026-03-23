
const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');
const navLinks = document.querySelectorAll('.site-nav a');
const filterButtons = document.querySelectorAll('[data-filter]');
const courseCards = document.querySelectorAll('.course-card');
const testimonialCards = document.querySelectorAll('[data-testimonial]');
const testimonialDots = document.querySelectorAll('.dot');
const ctaForm = document.querySelector('#cta-form');
const formMessage = document.querySelector('#form-message');
const enrollmentForm = document.querySelector('#enrollment-form');
const enrollmentMessage = document.querySelector('#enrollment-message');
const enrollmentPlan = document.querySelector('#plan');
const enrollmentCourse = document.querySelector('#course');
const courseSearchForm = document.querySelector('#course-search-form');
const courseSearchInput = document.querySelector('#course-search-input');
const courseSearchStatus = document.querySelector('#course-search-status');
const courseDetailItems = document.querySelectorAll('.course-detail-item');

const resolveApiBaseUrl = () => {
  const globalValue = typeof window !== 'undefined' ? window.MENTORLOOP_API_BASE_URL : '';
  if (typeof globalValue === 'string' && globalValue.trim()) {
    return globalValue.trim().replace(/\/$/, '');
  }

  const metaTag = document.querySelector('meta[name="mentorloop-api-base"]');
  const metaValue = metaTag ? metaTag.getAttribute('content') : '';
  if (metaValue && metaValue.trim()) {
    return metaValue.trim().replace(/\/$/, '');
  }

  return '';
};

const API_BASE_URL = resolveApiBaseUrl();

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

if (courseSearchForm && courseSearchInput) {
  const runCourseSearch = () => {
    const term = courseSearchInput.value.trim().toLowerCase();
    let visibleCount = 0;

    courseCards.forEach((card) => {
      const text = card.textContent ? card.textContent.toLowerCase() : '';
      const matched = !term || text.includes(term);
      card.classList.toggle('is-hidden', !matched);
      card.setAttribute('aria-hidden', String(!matched));
      if (matched) {
        visibleCount += 1;
      }
    });

    courseDetailItems.forEach((item) => {
      const searchable = item.dataset.search || '';
      const text = item.textContent ? item.textContent.toLowerCase() : '';
      const matched = !term || searchable.includes(term) || text.includes(term);
      item.classList.toggle('is-hidden', !matched);
      item.setAttribute('aria-hidden', String(!matched));
    });

    if (courseSearchStatus) {
      courseSearchStatus.textContent = term
        ? `${visibleCount} course card(s) match "${term}".`
        : 'Showing all courses.';
    }
  };

  courseSearchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    runCourseSearch();
  });
}

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

if (enrollmentForm && enrollmentMessage) {
  const validPlans = new Set(['starter', 'plus', 'mentor-pro']);
  const validCourses = new Set([
    'Web Development',
    'Data Analytics',
    'STEM Excellence',
    'Exam Sprint',
    'Graphic Design',
    'UI Fundamentals',
  ]);
  const params = new URLSearchParams(window.location.search);
  const requestedPlan = String(params.get('plan') || '').toLowerCase();
  const requestedCourse = String(params.get('course') || '').trim();

  if (enrollmentPlan && validPlans.has(requestedPlan)) {
    enrollmentPlan.value = requestedPlan;
  }

  if (enrollmentCourse && validCourses.has(requestedCourse)) {
    enrollmentCourse.value = requestedCourse;
  }

  enrollmentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(enrollmentForm);

    const fullName = String(data.get('fullName') || '').trim();
    const email = String(data.get('email') || '').trim();
    const phone = String(data.get('phone') || '').trim();
    const plan = String(data.get('plan') || '').trim();
    const currency = String(data.get('currency') || '').trim();
    const course = String(data.get('course') || '').trim();
    const city = String(data.get('city') || '').trim();
    const goal = String(data.get('goal') || '').trim();

    if (!fullName || !email || !phone || !plan || !currency || !course || !city) {
      enrollmentMessage.textContent = 'Please complete all required fields.';
      return;
    }

    const lead = {
      fullName,
      email,
      phone,
      plan,
      currency,
      course,
      city,
      goal,
      source: 'enrollment-page',
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/enroll`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(lead),
      });

      const contentType = String(response.headers.get('content-type') || '').toLowerCase();
      let body = {};

      if (contentType.includes('application/json')) {
        body = await response.json();
      } else {
        const raw = await response.text();
        if (!response.ok) {
          throw new Error(`Enrollment API returned non-JSON response (status ${response.status}).`);
        }

        throw new Error(
          `Enrollment API is not configured correctly (received non-JSON response). ` +
            `Set mentorloop-api-base in enrollment.html to your backend API URL.`,
        );
      }

      if (!response.ok) {
        throw new Error(body.error || `Failed to submit enrollment (status ${response.status})`);
      }

      enrollmentMessage.textContent = `Thanks ${fullName}! Enrollment saved. Reference: ${body.reference}.`;
      enrollmentForm.reset();

      if (enrollmentPlan && validPlans.has(requestedPlan)) {
        enrollmentPlan.value = requestedPlan;
      }

      if (enrollmentCourse && validCourses.has(requestedCourse)) {
        enrollmentCourse.value = requestedCourse;
      }
      return;
    } catch (error) {
      enrollmentMessage.textContent = `Could not save to database right now (${error.message}). Saved in browser as backup.`;
    }

    const fallbackLead = {
      ...lead,
      id: `ML-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    const savedLeads = JSON.parse(localStorage.getItem('mentorloopLeads') || '[]');
    savedLeads.push(fallbackLead);
    localStorage.setItem('mentorloopLeads', JSON.stringify(savedLeads));
    enrollmentForm.reset();

    if (enrollmentPlan && validPlans.has(requestedPlan)) {
      enrollmentPlan.value = requestedPlan;
    }

    if (enrollmentCourse && validCourses.has(requestedCourse)) {
      enrollmentCourse.value = requestedCourse;
    }
  });
}

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

