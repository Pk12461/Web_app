# MentorLoop

A responsive student learning platform landing page built with vanilla HTML, CSS, and JavaScript.

## Live now

- Temporary public URL: `https://0cb32a96f77cbc.lhr.life`
- This link stays online only while the local tunnel and local server are running on this machine.
- If you restart the tunnel later, the URL may change. The newest address is always saved in `public-url.txt`.

## Features

- Modern hero section with dashboard-style visual
- Student-focused sections for features, course categories, roadmap, testimonials, and pricing
- Responsive layout for desktop, tablet, and mobile
- Interactive mobile navigation
- Course category filters
- Rotating testimonials
- Simple email CTA form feedback

## Run locally

1. Open `index.html` directly in your browser.
2. Or, if you prefer a local server, serve the folder with any static file server available on your machine.

## Make it online from this PC

This project now includes Windows PowerShell helpers that start a local server and open a temporary public tunnel using `localhost.run`.

Start it:

```powershell
.\go-online.ps1
```

Stop it:

```powershell
.\stop-online.ps1
```

What these scripts do:

- start a local Python server for the project
- open a public HTTPS tunnel
- save the current public URL in `public-url.txt`
- save running process info in `.study-online-online.json`

## Project structure

- `index.html` — page structure and content
- `styles.css` — responsive styling
- `main.js` — interactivity
- `package.json` — optional project metadata
- `go-online.ps1` — starts a temporary public URL for the site
- `stop-online.ps1` — stops the local server and tunnel

## Validation checklist

- Header navigation works on desktop and mobile
- Course filter buttons update the visible cards
- Testimonial dots switch between student reviews
- CTA form shows a confirmation message after submission
- `index.html` opens correctly in a browser without a build step
- `.\go-online.ps1` prints a public HTTPS URL when Python and SSH are available

