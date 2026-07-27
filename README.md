# FLC Engineering Q-SPARK Static Website

A ZIP-ready static website for the Fort Lewis College Engineering Department Q-SPARK / Elevate Quantum outreach project.

## What changed in this version

- The home page now shows only one featured preview video.
- A dedicated `videos.html` page lists the full video library.
- YouTube short links such as `https://youtu.be/SgOfBYQRF2M` are automatically converted to embedded YouTube players.
- Videos are loaded from `data/videos.json`.
- The first video is marked with `"featured": true`, so it appears on the home page.

## Files

```text
flc-engineering-qspark-site/
  index.html
  videos.html
  admin.html
  styles.css
  script.js
  README.md
  data/
    videos.json
    events.json
    photos.json
    site.json
  assets/
    logo/
      qspark-logo-placeholder.svg
    photos/
    videos/
```

## Editing videos

Edit `data/videos.json`. Example:

```json
[
  {
    "title": "Quantum coding solving mazes",
    "presenter": "Dr. Ben Afflerbach",
    "description": "Fort Lewis College Q-SPARK program and Animas High School collaboration to provide a quantum learning workshop.",
    "url": "https://youtu.be/SgOfBYQRF2M",
    "type": "workshop",
    "audience": "Animas High School",
    "featured": true,
    "tags": ["workshop", "Animas High School"]
  }
]
```

Only one video should use `"featured": true`. If no video is marked featured, the home page uses the first video in the JSON file.

Supported video URL formats:

- YouTube: `https://youtu.be/VIDEO_ID`
- YouTube: `https://www.youtube.com/watch?v=VIDEO_ID`
- YouTube Shorts: `https://www.youtube.com/shorts/VIDEO_ID`
- Vimeo: `https://vimeo.com/VIDEO_ID`
- Local MP4: `assets/videos/example.mp4`

## Workshop signup link

Edit `data/site.json`:

```json
{
  "signupUrl": "https://your-form-link-here"
}
```

For the first pass, this can be a Google Form, Microsoft Form, Airtable Form, or a `mailto:` link.

## Important troubleshooting note

Do not double-click `index.html` and open it directly as a local file. Browsers often block JavaScript `fetch()` calls from reading local JSON files when opened with `file://`.

For local testing, run a simple local server from the project directory:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080/
```

For deployment, upload the folder contents to a web server directory, or zip the folder and unzip it on the remote server. The site does not require a build step.

## Admin Lite

`admin.html` does not save directly to the server. It generates video JSON entries that can be copied into `data/videos.json`.

True authorized browser-based editing requires one of these next-step pivots:

- Small Node/Express backend with login
- Python/FastAPI backend with login
- Supabase/Firebase
- Airtable or Google Sheet as a lightweight CMS
- Sanity/Decap-style CMS

Static HTML/JS alone cannot securely protect an admin password because frontend code is visible to users.
