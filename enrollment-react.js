(function () {
  const rootEl = document.getElementById('enrollment-react-root');
  if (!rootEl || !window.React || !window.ReactDOM || !window.htm) {
    return;
  }

  const { useMemo, useState } = window.React;
  const html = window.htm.bind(window.React.createElement);

  const planOptions = [
    { value: 'starter', label: 'Starter - Free (INR 0 / USD 0)' },
    { value: 'plus', label: 'Plus - INR 1,499/month | USD 19/month' },
    { value: 'mentor-pro', label: 'Mentor Pro - INR 3,199/month | USD 39/month' },
  ];

  const courseOptions = [
    'Web Development',
    'Data Analytics',
    'STEM Excellence',
    'Exam Sprint',
    'Graphic Design',
    'UI Fundamentals',
  ];

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

  const saveFallback = (lead) => {
    const backup = {
      ...lead,
      id: `ML-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const existing = JSON.parse(localStorage.getItem('mentorloopLeads') || '[]');
    existing.push(backup);
    localStorage.setItem('mentorloopLeads', JSON.stringify(existing));
    return backup.id;
  };

  function EnrollmentApp() {
    const params = useMemo(() => new URLSearchParams(window.location.search), []);
    const requestedPlan = String(params.get('plan') || '').toLowerCase();
    const requestedCourse = String(params.get('course') || '').trim();
    const apiBase = useMemo(resolveApiBaseUrl, []);

    const [form, setForm] = useState({
      fullName: '',
      email: '',
      phone: '',
      plan: ['starter', 'plus', 'mentor-pro'].includes(requestedPlan) ? requestedPlan : 'starter',
      currency: 'INR',
      course: courseOptions.includes(requestedCourse) ? requestedCourse : courseOptions[0],
      city: '',
      goal: '',
    });
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const onFieldChange = (event) => {
      const { name, value } = event.target;
      setForm((prev) => ({ ...prev, [name]: value }));
    };

    const onSubmit = async (event) => {
      event.preventDefault();
      setMessage('');

      const required = ['fullName', 'email', 'phone', 'plan', 'currency', 'course', 'city'];
      for (const key of required) {
        if (!String(form[key] || '').trim()) {
          setMessage('Please complete all required fields.');
          return;
        }
      }

      const payload = {
        ...form,
        source: 'enrollment-page-react',
      };

      setIsSubmitting(true);
      try {
        const response = await fetch(`${apiBase}/api/enroll`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const contentType = String(response.headers.get('content-type') || '').toLowerCase();
        let body = {};

        if (contentType.includes('application/json')) {
          body = await response.json();
        } else {
          if (!response.ok) {
            throw new Error(`Enrollment API returned non-JSON response (status ${response.status}).`);
          }
          throw new Error(
            'Enrollment API is not configured correctly (received non-JSON response). Set mentorloop-api-base in enrollment.html to your backend API URL.',
          );
        }

        if (!response.ok) {
          throw new Error(body.error || `Failed to submit enrollment (status ${response.status})`);
        }

        setMessage(`Thanks ${form.fullName}! Enrollment saved. Reference: ${body.reference}.`);
        setForm((prev) => ({
          ...prev,
          fullName: '',
          email: '',
          phone: '',
          currency: 'INR',
          city: '',
          goal: '',
        }));
        return;
      } catch (error) {
        const fallbackRef = saveFallback(payload);
        setMessage(`Could not save to database right now (${error.message}). Saved in browser as backup. Reference: ${fallbackRef}.`);
      } finally {
        setIsSubmitting(false);
      }
    };

    return html`
      <form className="enrollment-form" onSubmit=${onSubmit} noValidate>
        <div className="form-grid">
          <div>
            <label htmlFor="full-name">Full name</label>
            <input id="full-name" name="fullName" type="text" required value=${form.fullName} onChange=${onFieldChange} />
          </div>
          <div>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required value=${form.email} onChange=${onFieldChange} />
          </div>
          <div>
            <label htmlFor="phone">Phone</label>
            <input id="phone" name="phone" type="tel" required value=${form.phone} onChange=${onFieldChange} />
          </div>
          <div>
            <label htmlFor="plan">Plan</label>
            <select id="plan" name="plan" required value=${form.plan} onChange=${onFieldChange}>
              ${planOptions.map((item) => html`<option key=${item.value} value=${item.value}>${item.label}</option>`)}
            </select>
          </div>
          <div>
            <label htmlFor="currency">Preferred billing currency</label>
            <select id="currency" name="currency" required value=${form.currency} onChange=${onFieldChange}>
              <option value="INR">INR</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div>
            <label htmlFor="course">Selected course</label>
            <select id="course" name="course" required value=${form.course} onChange=${onFieldChange}>
              ${courseOptions.map((course) => html`<option key=${course} value=${course}>${course}</option>`)}
            </select>
          </div>
          <div>
            <label htmlFor="city">City</label>
            <input id="city" name="city" type="text" required value=${form.city} onChange=${onFieldChange} />
          </div>
          <div className="full-row">
            <label htmlFor="goal">Learning goal</label>
            <textarea id="goal" name="goal" rows="4" placeholder="Tell us what you want to achieve" value=${form.goal} onChange=${onFieldChange}></textarea>
          </div>
        </div>

        <div className="section-actions">
          <button className="btn btn-primary" type="submit" disabled=${isSubmitting}>
            ${isSubmitting ? 'Submitting...' : 'Submit enrollment'}
          </button>
          <a className="btn btn-secondary" href="./pricing.html">Back to pricing</a>
        </div>
        <p className="form-message" role="status" aria-live="polite">${message}</p>
      </form>
    `;
  }

  window.ReactDOM.createRoot(rootEl).render(window.React.createElement(EnrollmentApp));
})();

