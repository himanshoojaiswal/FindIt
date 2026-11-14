# FindIt: Simple Project Guide

## What the project does

FindIt is a campus lost-and-found website. Someone can post a lost or found item, and other people can browse the reports. A person who thinks an item belongs to them answers a verification question. If the answer matches, the page offers a link to email the reporter.

## How to show it to a judge

1. Open the website while connected to the internet.
2. Show the Lost and Found buttons and explain that they choose the kind of report.
3. Submit a test report with a made-up item, test email, and verification question. A photo is optional.
4. Point out the report in Recent Reports and the updated totals.
5. Enter the correct answer to show the email link. If there is time, enter a wrong answer to show that it is checked.

Use made-up test information. This demo's database listings and email addresses can be read publicly.

## The project files

- `index.html` contains the page content: headings, buttons, form fields, report list, and help text.
- `CSS/style.css` controls the page's colors, spacing, layout, and mobile-friendly appearance.
- `script/script.js` makes the page interactive, checks form data, and reads and writes reports in Firebase.
- `database.rules.json` contains Firebase rules for reading and adding reports.

## JavaScript in plain language

The script runs in this order:

1. **Connect to Firebase.** The configuration tells the page which Realtime Database to use.
2. **Find the page elements.** For example, the script keeps references to the form, buttons, and report list so it can update them.
3. **Choose Lost or Found.** `setReportType` remembers the choice and changes the form label.
4. **Prepare report data.** The form handler checks the answer, creates its hash, and prepares an optional small photo.
5. **Save the report.** Firebase stores the report under `items`.
6. **Show reports.** `onValue` listens for changes in `items`; `renderItems` updates the totals and creates a card for each valid report.
7. **Check a claim.** Each card hashes the answer a visitor enters. A matching hash reveals a `mailto:` link to contact the reporter.

### A few JavaScript terms

- **Function:** A named group of steps, such as `renderItems`.
- **Event listener:** Code that waits for an action, such as a button click or form submission.
- **`async` / `await`:** A way to wait for an operation that takes time, such as talking to Firebase or processing a photo.
- **Hash:** A fixed-looking result calculated from text. The submitted answer itself is not saved, but this demo's browser-side check is not strong security.
- **Realtime Database:** Firebase storage that can notify the page when saved data changes.

## Questions a judge may ask

**What problem does FindIt solve?**  
It gives people on campus one place to share lost and found item reports.

**How does a report get from the form to the listings?**  
JavaScript reads the form, then saves the report to Firebase Realtime Database. The page listens for database changes and redraws the report cards and totals.

**Why can someone choose Lost or Found?**  
The selected choice is saved as the report type. It also changes the location prompt and the label shown on the report card.

**Why is there a verification question?**  
It gives a potential owner a way to show that they recognize a detail about the item before contacting the reporter.

**Is the verification answer fully private or secure?**  
No. The answer text is not saved, but the question, email, salt, and hash are publicly readable in this demo, and the browser performs the comparison. It is a basic demonstration, not a secure identity check. Do not use real private information.

**Why are photos resized?**  
Smaller photos take less space and are quicker to load.

**What happens if the internet or Firebase is unavailable?**  
The page cannot load or save reports. It displays an error message rather than pretending the operation succeeded.

**How could the project be improved?**  
Add user accounts and moderation, keep contact details private, and move verification to a trusted server instead of relying on browser-side checks.

## Important demo limitation

The current Firebase rules allow anyone to read the reports and allow new reports to be added. The page also stores each report's contact email and image with the report. This setup is suitable only for a demo with test information; it should be changed before using FindIt with real users.
