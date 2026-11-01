# Noida Eye and Medical Centre

A responsive landing page and appointment request flow for Noida Eye and Medical Centre.

## Run locally

Requires Node.js 20 or newer. Copy `.env.example` to `.env`, set the owner username and a unique random password of at least 16 characters, and set `ADMIN_PASSWORD_SALT` to 32 random hexadecimal characters. Then run `node server.js` and open `http://localhost:3000`. No package installation is needed.

The local `.env` is excluded from Git. Do not commit credentials. For production, use a host that supports Node.js, configure the same environment variables in the host's secret settings, and serve through HTTPS. GitHub Pages is static hosting and cannot run this authentication server.

## What's included

- Responsive clinic landing page with care services, clinic details, and patient stories.
- Two-step appointment request form with basic client-side validation.
- Mobile navigation and testimonial controls.
- Owner sign-in page and protected administration landing page.
- Server-side password verification using scrypt, HTTP-only same-site sessions, and temporary lockout after repeated failed sign-ins.

## Booking flow

The booking form is a front-end demonstration. Submitting it displays a confirmation in the browser; it does not send or store an appointment. Connect it to a scheduling API or backend before using it for real bookings. The owner dashboard confirms authentication only; appointment management is not implemented.

## Deployment

The public pages can be hosted as static files, but the owner sign-in requires the Node.js server and cannot run on GitHub Pages alone. The hero photograph is loaded from Unsplash and the fonts from Google Fonts, so those assets need an internet connection.
