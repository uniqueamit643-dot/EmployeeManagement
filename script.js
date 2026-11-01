const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  nav.classList.toggle('open', open);
});
nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open navigation');
}));

const dateInput = document.querySelector('#visit-date');
const today = new Date();
const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
dateInput.min = localToday;
dateInput.addEventListener('input', () => {
  const field = dateInput.closest('.field');
  field.classList.remove('invalid');
  field.querySelector('.error-message').textContent = '';
});

document.querySelectorAll('input[name="service"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    document.querySelectorAll('.choice-card').forEach((card) => card.classList.toggle('selected', card.contains(radio) && radio.checked));
  });
});
document.querySelectorAll('[data-service]').forEach((link) => {
  link.addEventListener('click', () => {
    const match = [...document.querySelectorAll('input[name="service"]')].find((radio) => radio.value === link.dataset.service);
    if (match) {
      match.checked = true;
      match.dispatchEvent(new Event('change'));
    }
  });
});

const stepOne = document.querySelector('[data-step="1"]');
const stepTwo = document.querySelector('[data-step="2"]');
const steps = document.querySelectorAll('.progress-step');
function validateField(input) {
  const field = input.closest('.field');
  const message = field.querySelector('.error-message');
  let error = '';
  if (!input.value.trim()) error = 'Please complete this field.';
  else if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim())) error = 'Enter a valid email address.';
  field.classList.toggle('invalid', Boolean(error));
  message.textContent = error;
  return !error;
}
document.querySelector('#next-step').addEventListener('click', () => {
  const dateOk = validateField(dateInput);
  const timeOk = validateField(document.querySelector('#visit-time'));
  if (!dateOk || !timeOk) return;
  stepOne.classList.remove('active');
  stepTwo.classList.add('active');
  steps[0].classList.remove('active');
  steps[1].classList.add('active');
  stepTwo.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});
document.querySelector('#back-step').addEventListener('click', () => {
  stepTwo.classList.remove('active');
  stepOne.classList.add('active');
  steps[1].classList.remove('active');
  steps[0].classList.add('active');
});
document.querySelectorAll('.field input, .field select').forEach((input) => input.addEventListener('input', () => {
  if (input.closest('.field').classList.contains('invalid')) validateField(input);
}));
document.querySelector('#booking-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const required = [...stepTwo.querySelectorAll('input[required]')];
  if (!required.map(validateField).every(Boolean)) return;
  const name = stepTwo.querySelector('[name="firstName"]').value.trim();
  const service = document.querySelector('input[name="service"]:checked').value;
  const date = new Date(`${dateInput.value}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const time = document.querySelector('#visit-time').value;
  document.querySelector('#confirm-message').textContent = `${name}, your ${service.toLowerCase()} is requested for ${date} at ${time}.`;
  stepTwo.classList.remove('active');
  document.querySelector('.booking-progress').style.display = 'none';
  document.querySelector('#confirmation').classList.add('show');
});

const stories = [
  { quote: 'For the first time, I left an eye appointment feeling heard. They explained everything and made the whole visit feel easy.', name: 'Alex M.', detail: 'Patient since 2021 · Comprehensive eye exam', initials: 'AM' },
  { quote: 'The team made my daughter feel so comfortable. She actually asked when she could come back!', name: 'Priya R.', detail: 'Parent · Children’s eye care', initials: 'PR' },
  { quote: 'Booking was simple, the appointment was right on time, and I finally found contacts that feel great all day.', name: 'Jordan L.', detail: 'Patient since 2023 · Contact lens fitting', initials: 'JL' }
];
let storyIndex = 0;
function showStory(index) {
  storyIndex = (index + stories.length) % stories.length;
  const story = stories[storyIndex];
  document.querySelector('.testimonial-content blockquote').textContent = story.quote;
  document.querySelector('.testimonial-by strong').textContent = story.name;
  document.querySelector('.testimonial-by span').textContent = story.detail;
  document.querySelector('.avatar').textContent = story.initials;
  document.querySelector('.test-count').innerHTML = `${String(storyIndex + 1).padStart(2, '0')} <span>/ 03</span>`;
}
document.querySelector('#prev-quote').addEventListener('click', () => showStory(storyIndex - 1));
document.querySelector('#next-quote').addEventListener('click', () => showStory(storyIndex + 1));
