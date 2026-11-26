# FindIt — Campus Lost and Found
 
[![Live demo](https://img.shields.io/badge/live%20demo-finditweb.netlify.app-2457D6)](https://finditweb.netlify.app/)
![Hosted on Netlify](https://img.shields.io/badge/hosting-Netlify-00C7B7)
![Firebase Realtime Database](https://img.shields.io/badge/database-Firebase%20Realtime%20Database-FFCA28)
![No build step](https://img.shields.io/badge/build-none-lightgrey)
 
FindIt is a campus lost-and-found website. Someone can post a lost or found item, and everyone can browse the reports. A person who thinks an item belongs to them answers a private verification question set by the reporter. If the answer matches, the page reveals a pre-filled email link so they can arrange the return.
 
**Live demo:** https://finditweb.netlify.app/
 
<!-- Add a screenshot here once you have one:
![FindIt home page](docs/screenshot-home.png)
-->
 
> **Demo mode — please read.** Reports and contact emails are stored in a publicly readable Firebase database, and the answer check runs in the browser, so it is only a basic deterrent. **Use made-up test information only. Do not enter private or personal details.** See [Security and privacy](#security-and-privacy) for details.
 
---
 
## Table of contents
 
- [Features](#features)
- [How it works](#how-it-works)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Data model](#data-model)
- [Security and privacy](#security-and-privacy)
- [Testing](#testing)
- [Accessibility and responsiveness](#accessibility-and-responsiveness)
- [Roadmap](#roadmap)
- [Demo walkthrough](#demo-walkthrough)
- [License](#license)
- [Author](#author)
---
 
## Features
 
- **Report lost or found items** on a single page, with a toggle that changes the location prompt ("Where did you lose it?" or "Where did you find it?").
- **Live listings and counters.** Recent reports and the totals for all, lost and found reports update in real time, with no page refresh.
- **Claim verification.** The reporter sets a private question and answer. A correct answer (capital letters and extra spaces are ignored) reveals the email link; a wrong answer reveals nothing.
- **Optional photos** that are checked, resized to at most 600px and compressed to JPEG (under 250 KB) in the browser before upload.
- **Safe by design.** User text is always rendered as plain text, answers are stored only as salted SHA-256 hashes, and Firebase rules validate every record and make reports write-once.
- **Responsive and accessible.** Layouts from 320px to 1440px, semantic landmarks, visible keyboard focus, screen-reader status messages and a dark mode.
- **No server and no build step.** Three static files plus a managed database.
## How it works
 
1. **Post.** A reporter adds a lost or found item with a contact email and a private question that only the real owner could answer.
2. **Verify.** Someone who thinks the item is theirs opens the card and answers the question.
3. **Return.** If the answer is right, the page shows a pre-filled `mailto:` link, and the two people arrange the return.
```
Netlify (HTTPS)  --serves-->  Browser: index.html + style.css + script.js
Browser  <== reads / writes / live updates ==>  Firebase Realtime Database  (items)
```
 
## Tech stack
 
| Area | Technology |
| --- | --- |
| Markup | Semantic HTML5 |
| Styling | Responsive CSS3 (grid, flexible units, dark mode) |
| Logic | Vanilla JavaScript (ES Modules) |
| Database | Firebase Realtime Database (v13.0.0) |
| Cryptography | Web Crypto API (SHA-256, secure random salts) |
| Image handling | Canvas API (resize and JPEG compression) |
| Hosting | Netlify (static site, HTTPS) |
 
## Project structure
 
```
FindIt/
├── index.html              # Page content: header, hero, form, report list, verification dialog
├── style.css               # Colours, layout, responsiveness, dark mode, focus styles
├── script.js               # Application logic and Firebase access (ES Module)
├── item-placeholder.svg    # Image shown for reports without a photo
├── database.rules.json     # Firebase Realtime Database security rules
└── README.md
```
 
### How `script.js` is organized
 
| Part | What it does |
| --- | --- |
| Firebase configuration | Tells the page which Realtime Database to use. |
| `setReportType` | Remembers Lost or Found, updates `aria-pressed` and the location label. |
| Form submit handler | Validates the form, prepares the photo, creates the salt and hash, and writes the report. |
| `makeSalt()` / `hashAnswer()` | Generate a 128-bit random salt and compute the salted SHA-256 digest of the answer. |
| `addTextElement()` | Inserts user text as text nodes so it can never become HTML. |
| `onValue` listener | Subscribes to the 50 newest reports (`orderByChild("createdAt")`, `limitToLast(50)`). |
| `renderItems()` | Skips malformed records, builds the cards, updates the counters and replaces the list in one pass. |
| Claim check | Hashes the visitor's answer with the stored salt, compares it with the stored hash, and reveals or withholds the `mailto:` link. |
 
## Getting started
 
### Prerequisites
 
- A modern browser (Chrome, Edge, Firefox or Safari).
- [Git](https://git-scm.com/) and a code editor.
- A free [Firebase](https://firebase.google.com/) account.
- Optional: [Python 3](https://www.python.org/) for a local web server, [Node.js](https://nodejs.org/) for the Firebase CLI, and a [Netlify](https://www.netlify.com/) account to deploy.
### 1. Clone the repository
 
```bash
git clone https://github.com/himanshoojaiswal/FindIt.git
cd FindIt
```
 
### 2. Set up Firebase
 
1. In the [Firebase console](https://console.firebase.google.com/), create a project and add a **Web app**. Copy its configuration object.
2. Create a **Realtime Database** and choose a region.
3. Open the **Rules** tab, paste the contents of `database.rules.json` and publish. Or use the Firebase CLI:
```bash
npm install -g firebase-tools
firebase login
firebase init database
firebase deploy --only database
```
 
4. Paste your configuration object, including the `databaseURL`, into the Firebase configuration section of `script.js`. Firebase web configuration values identify your project and are not secret; the database rules are what protect your data.
### 3. Run locally
 
ES Modules do not load from `file://` URLs, so serve the folder over HTTP:
 
```bash
python3 -m http.server 8000
```
 
Then open <http://localhost:8000>. Do not open `index.html` by double-clicking it.
 
### 4. Deploy to Netlify
 
- **From GitHub:** in Netlify choose *Add new site → Import an existing project*, connect your GitHub repository, leave the build command empty and set the publish directory to the repository root.
- **Manually:** in Netlify choose *Add new site → Deploy manually* and drop the project folder.
Netlify serves the site over HTTPS, which the Web Crypto API requires in production.
 
## Data model
 
Reports are stored under the `items` node, one child per report.
 
| Field | Type | Constraint |
| --- | --- | --- |
| `type` | string | Required; `lost` or `found` (enforced by the database rules). |
| `title` | string | Required; at most 80 characters (rules). |
| `detail` | string | Required; at most 500 characters (rules). |
| `place` | string | Required; at most 100 characters (rules). |
| `contactEmail` | string | Required; format checked in the browser. |
| `verificationQuestion` | string | Required; shown on the card. |
| `verificationSalt` | string | Required; 16 random bytes, hex encoded. |
| `verificationHash` | string | Required; salted SHA-256 digest of the normalized answer. |
| `createdAt` | number | Required; indexed and used for ordering. |
| Photo data | string | Optional; compressed JPEG of at most 250 KB. |
 
### Database rules
 
```json
{
  "rules": {
    "items": {
      ".indexOn": ["createdAt", "type"],
      ".read": true,
      "$itemId": {
        ".write": "!data.exists() && newData.exists()",
        ".validate": "newData.hasChildren(['type', 'title', 'detail', 'place', 'contactEmail', 'verificationQuestion', 'verificationSalt', 'verificationHash', 'createdAt']) && (newData.child('type').val() === 'lost' || newData.child('type').val() === 'found') && newData.child('title').isString() && newData.child('title').val().length <= 80 && newData.child('detail').isString() && newData.child('detail').val().length <= 500 && newData.child('place').isString() && newData.child('place').val().length <= 100"
      }
    }
  }
}
```
 
- **Indexes** on `createdAt` and `type` let Firebase sort on the server.
- **Write-once:** a report can be created but never overwritten or deleted by clients.
- **Validation:** all nine fields are required, `type` must be `lost` or `found`, and the title, details and place have length limits.
## Security and privacy
 
**What is implemented**
 
- **XSS prevention.** All user-supplied text is inserted with `addTextElement()` and `document.createTextNode()`. Test payloads such as `<script>alert(1)</script>` and `<img src=x onerror=alert(1)>` appear as harmless text.
- **No plaintext answers.** Each answer is hashed with SHA-256 and a fresh 16-byte random salt from `crypto.getRandomValues()`. Only the salt and hash are stored.
- **Safe contact link.** The email is validated against `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, and the `mailto:` subject and body are passed through `encodeURIComponent()`.
- **Database rules** validate the record shape and make reports write-once.
**Known limitations (demo scope)**
 
- The `items` node is **publicly readable**, so contact emails, verification questions, salts and hashes can be read by anyone who queries the database directly.
- The answer check runs **in the browser**, so it is a basic deterrent, not a secure identity check. Short, guessable answers could be recovered offline from the public salt and hash.
- There are **no accounts, moderation or rate limiting**, and reporters cannot edit or delete their own reports.
- Email format is validated only in the browser, not by the database rules.
**Before using FindIt with real users**, move `contactEmail` and the verification hash to private storage, verify claims in a server-side function (for example a Firebase Cloud Function), add authentication, and enable Firebase App Check and moderation.
 
## Testing
 
Testing was manual and black-box, in a browser against the Firebase backend.
 
| ID | Test case | Result |
| --- | --- | --- |
| TC-01 | Lost / Found toggle updates the type, `aria-pressed` and the location label | Pass |
| TC-02 | Form validation and submission: hashing, write to Firebase, form reset, live counters | Pass |
| TC-03 | Image validation and compression: non-images rejected, large images resized and compressed | Pass |
| TC-04 | Claim verification: wrong answer rejected, correct answer (any case or spacing) reveals the link | Pass |
| TC-05 | Offline and Firebase error handling: status messages shown, button re-enabled | Pass |
 
Security checks (XSS payloads, hashing, email handling and database rules) and responsive and accessibility audits also passed. Compression reduces photo payloads by **80–92%** compared with raw mobile camera photos.
 
**To re-run the checks after a change:** toggle Lost and Found; submit a valid report; upload a large image and a non-image file; try a wrong and then the correct answer; disconnect the network and retry; paste script payloads into every text field; and check the layout at 320px, 640px and 1440px.
 
## Accessibility and responsiveness
 
- **Layout:** fluid grid from 320px to 1440px with no horizontal overflow. At 640px and below, the hero buttons stack and the statistics become compact rows. `overflow-wrap: anywhere` keeps long text inside cards.
- **Landmarks and labels:** `<header>`, `<nav>`, `<main>`, `<section>`, `<article>` and `<footer>`, plus an explicit `<label>` on every form control.
- **Keyboard:** a visible `:focus-visible` outline on all interactive elements.
- **Screen readers:** `role="status"` and `aria-live="polite"` on form, list and per-card claim messages; descriptive `alt` text on photos.
- **Theme:** a header button switches between light and dark modes.
The interface was checked against WCAG 2.1 Level AA.
 
## Roadmap
 
1. **Security:** private storage for emails and hashes, server-side claim verification, rate limiting.
2. **Accounts and moderation:** authentication, edit and close reports, mark items as returned, Firebase App Check.
3. **Discovery:** search and filters by category, date and location; pagination beyond 50 reports.
4. **Matching:** suggested matches between lost and found reports.
5. **Engagement:** email or push notifications, installable web app, photos in dedicated file storage.
## Demo walkthrough
 
1. Open the site while connected to the internet.
2. Select **Report Lost Item**, then switch to **Found** to show that the toggle sets the report type.
3. Submit a test report with a made-up item, a test email and a verification question. A photo is optional.
4. Point out the new card in **Recent Reports** and the updated counters.
5. Enter a wrong answer to show that it is rejected, then the correct answer to show the email link.
6. Toggle dark mode and narrow the browser window to show the responsive layout.
## License
 
No license has been added to this repository yet, so all rights are reserved by default. To allow others to reuse the code, add a `LICENSE` file (for example MIT).
 
## Author
 
Built by [@himanshoojaiswal](https://github.com/himanshoojaiswal).
 
