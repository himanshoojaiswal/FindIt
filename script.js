
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import {
    getDatabase,
    onValue,
    push,
    ref,
    set
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

// Connect the page to the project's Firebase Realtime Database.
const firebaseConfig = {
    apiKey: "AIzaSyCoM6WtWxcoqYznCwmTqztMJb3FZYXVMYk",
    authDomain: "findit-e90db.firebaseapp.com",
    databaseURL: "https://findit-e90db-default-rtdb.firebaseio.com",
    projectId: "findit-e90db",
    storageBucket: "findit-e90db.firebasestorage.app",
    messagingSenderId: "347806413711",
    appId: "1:347806413711:web:57fd168c19adbba95c91fa",
    measurementId: "G-YEHKRHRMET"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const form = document.getElementById("reportForm");
const itemList = document.getElementById("itemList");
const formMessage = document.getElementById("formMessage");
const listingsMessage = document.getElementById("listingsMessage");
const submitButton = document.getElementById("submitReport");
const placeLabel = document.getElementById("placeLabel");
const reportTypeButtons = document.querySelectorAll(".HoriBtnCont button");
const themeToggle = document.getElementById("themeToggle");
const defaultItemImage = "asset/item-placeholder.svg";
const itemDialog = document.getElementById("itemDialog");
const itemDialogImage = document.getElementById("itemDialogImage");
const itemDialogType = document.getElementById("itemDialogType");
const itemDialogDate = document.getElementById("itemDialogDate");
const itemDialogTitle = document.getElementById("itemDialogTitle");
const itemDialogPlace = document.getElementById("itemDialogPlace");
const itemDialogDetails = document.getElementById("itemDialogDetails");
const itemDialogQuestion = document.getElementById("itemDialogQuestion");
const itemDialogAnswer = document.getElementById("itemDialogAnswer");
const verifyItemButton = document.getElementById("verifyItemButton");
const itemDialogMessage = document.getElementById("itemDialogMessage");
const itemDialogActions = document.getElementById("itemDialogActions");
let selectedType = "lost";
let activeReport = null;

// Restore the chosen appearance and keep it across page visits.
function setTheme(theme) {
    const isDark = theme === "dark";
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    themeToggle.textContent = isDark ? "Light mode" : "Dark mode";
    themeToggle.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
    themeToggle.setAttribute("aria-pressed", String(isDark));
}

setTheme(localStorage.getItem("findit-theme") || "light");
themeToggle.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("findit-theme", nextTheme);
});

function setReportImage(image, source, alt) {
    image.alt = alt;
    image.onerror = () => {
        image.onerror = null;
        image.src = defaultItemImage;
    };
    image.src = typeof source === "string" && source ? source : defaultItemImage;
}

function openItemDialog(item) {
    activeReport = item;
    const isFound = item.type === "found";
    itemDialogType.textContent = isFound ? "Found" : "Lost";
    itemDialogType.className = `item-type ${item.type}`;
    itemDialogDate.textContent = Number.isFinite(item.createdAt)
        ? new Date(item.createdAt).toLocaleDateString()
        : "";
    itemDialogTitle.textContent = item.title;
    itemDialogPlace.textContent = `${isFound ? "Found at" : "Lost at"}: ${item.place}`;
    itemDialogDetails.textContent = item.detail;
    itemDialogQuestion.textContent = item.verificationQuestion;
    itemDialogAnswer.value = "";
    itemDialogMessage.textContent = "";
    itemDialogActions.replaceChildren();
    verifyItemButton.disabled = false;
    setReportImage(itemDialogImage, item.image, `Item image: ${item.title}`);
    itemDialog.showModal();
}

document.getElementById("closeItemDialog").addEventListener("click", () => itemDialog.close());
itemDialog.addEventListener("click", (event) => {
    if (event.target === itemDialog) {
        itemDialog.close();
    }
});
itemDialog.addEventListener("close", () => {
    activeReport = null;
});

// Keep the selected report type and its button label in sync.
function setReportType(type) {
    selectedType = type;
    const isFound = type === "found";
    placeLabel.textContent = isFound ? "Where did you find it?" : "Where did you lose it?";

    reportTypeButtons.forEach((button) => {
        const active = button.value === type;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });
}

document.getElementById("H_BtnReportLost").addEventListener("click", () => {
    setReportType("lost");
    document.getElementById("report").scrollIntoView({ behavior: "smooth" });
});

document.getElementById("H_BtnReportFound").addEventListener("click", () => {
    setReportType("found");
    document.getElementById("report").scrollIntoView({ behavior: "smooth" });
});

reportTypeButtons.forEach((button) => {
    button.addEventListener("click", () => setReportType(button.value));
});

// Make a random value used to make each answer hash different.
function makeSalt() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Turn an answer into a one-way hash before saving or checking it.
async function hashAnswer(salt, answer) {
    const data = new TextEncoder().encode(`${salt}:${answer.trim().toLowerCase()}`);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Read an image file so it can be saved with a report.
function readAsDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => resolve(reader.result));
        reader.addEventListener("error", () => reject(new Error("The selected image could not be read.")));
        reader.readAsDataURL(blob);
    });
}

// Resize and compress an optional photo to keep it small.
async function prepareImage(file) {
    if (!file) {
        return "";
    }
    if (!file.type.startsWith("image/")) {
        throw new Error("Please choose an image file.");
    }

    const image = await createImageBitmap(file);
    const scale = Math.min(1, 600 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) {
        throw new Error("Your browser could not prepare the image.");
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.close();

    const compressedImage = await new Promise((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.65);
    });
    if (!compressedImage) {
        throw new Error("Your browser could not prepare the image.");
    }
    if (compressedImage.size > 250 * 1024) {
        throw new Error("That image is still too large. Please choose a smaller image.");
    }
    return readAsDataUrl(compressedImage);
}

// Create a text element safely, then add it to a parent element.
function addTextElement(parent, tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) {
        element.className = className;
    }
    element.textContent = text;
    parent.append(element);
    return element;
}

// Build a compact, keyboard-accessible summary card for one report.
function makeItemCard(item) {
    const card = document.createElement("article");
    card.className = "item-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-haspopup", "dialog");
    card.setAttribute("aria-label", `View full report for ${item.title}`);

    const imageWrap = document.createElement("div");
    imageWrap.className = "item-image-wrap";
    const image = document.createElement("img");
    image.className = "item-image";
    setReportImage(image, item.image, "");
    image.loading = "lazy";
    imageWrap.append(image);
    card.append(imageWrap);

    const content = document.createElement("div");
    content.className = "item-card-content";
    const type = item.type === "found" ? "Found" : "Lost";
    const heading = document.createElement("div");
    heading.className = "item-card-heading";
    addTextElement(heading, "h3", "item-title", item.title);
    addTextElement(heading, "span", `item-type ${item.type === "found" ? "found" : "lost"}`, type);
    content.append(heading);

    addTextElement(content, "p", "item-detail", item.detail);
    addTextElement(content, "p", "item-place", `${item.type === "found" ? "Found at" : "Lost at"}: ${item.place}`);
    if (Number.isFinite(item.createdAt)) {
        addTextElement(content, "p", "item-date", new Date(item.createdAt).toLocaleDateString());
    }
    addTextElement(content, "span", "item-view-link", "View full details");

    card.append(content);
    card.addEventListener("click", () => openItemDialog(item));
    card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openItemDialog(item);
        }
    });
    return card;
}

verifyItemButton.addEventListener("click", async () => {
    if (!activeReport) {
        return;
    }
    const report = activeReport;
    if (!itemDialogAnswer.value.trim()) {
        itemDialogMessage.textContent = "Enter an answer before checking it.";
        return;
    }

    verifyItemButton.disabled = true;
    itemDialogMessage.textContent = "";
    itemDialogActions.replaceChildren();
    try {
        const answerHash = await hashAnswer(report.verificationSalt, itemDialogAnswer.value);
        if (activeReport !== report) {
            return;
        }
        if (answerHash !== report.verificationHash) {
            itemDialogMessage.textContent = "That answer doesn't match. Check the item details and try again.";
            return;
        }
        if (typeof report.contactEmail !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(report.contactEmail)) {
            itemDialogMessage.textContent = "This report does not have a valid contact email.";
            return;
        }

        const itemType = report.type === "found" ? "found" : "lost";
        const contactLink = document.createElement("a");
        contactLink.className = "contact-link";
        contactLink.href = `mailto:${report.contactEmail}?subject=${encodeURIComponent(`FindIt: ${report.title}`)}&body=${encodeURIComponent(`Hello, I think I can identify your ${itemType} item. I answered the verification question correctly. Please contact me so we can arrange its return.`)}`;
        contactLink.textContent = "Email the reporter";
        itemDialogMessage.textContent = "Your answer is correct. You can now contact the reporter.";
        itemDialogActions.replaceChildren(contactLink);
    } catch (error) {
        console.error("Could not check the verification answer:", error);
        itemDialogMessage.textContent = "Could not check the answer. Please try again.";
    } finally {
        verifyItemButton.disabled = false;
    }
});

// Validate database records, update the totals, and show the report cards.
function renderItems(value) {
    const items = Object.entries(value || {})
        .map(([id, item]) => ({ id, ...item }))
        .filter((item) => (
            (item.type === "lost" || item.type === "found")
            && typeof item.title === "string"
            && typeof item.detail === "string"
            && typeof item.place === "string"
            && typeof item.verificationQuestion === "string"
            && typeof item.verificationSalt === "string"
            && typeof item.verificationHash === "string"
        ))
        .sort((first, second) => (second.createdAt || 0) - (first.createdAt || 0));

    itemList.replaceChildren();
    document.getElementById("total_report").textContent = String(items.length);
    document.getElementById("total_lost").textContent = String(items.filter((item) => item.type === "lost").length);
    document.getElementById("total_found").textContent = String(items.filter((item) => item.type === "found").length);

    if (items.length === 0) {
        listingsMessage.textContent = "No reports yet. Be the first to add one.";
        return;
    }

    listingsMessage.textContent = "";
    items.forEach((item) => itemList.append(makeItemCard(item)));
}

// Listen for database changes so the listings stay up to date.
onValue(
    ref(database, "items"),
    (snapshot) => {
        renderItems(snapshot.val());
    },
    (error) => {
        console.error("Could not load reports from Firebase:", error);
        listingsMessage.textContent = "Could not load reports. Check your Firebase Realtime Database settings and internet connection.";
    }
);

// Check the form, prepare its data, and save the new report.
form.addEventListener("submit", async (event) => {
    event.preventDefault();
    formMessage.textContent = "";
    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    try {
        const values = new FormData(form);
        const answer = String(values.get("verificationAnswer") || "").trim();
        if (answer.length < 2) {
            throw new Error("Please enter an answer with at least two characters.");
        }

        const salt = makeSalt();
        const verificationHash = await hashAnswer(salt, answer);
        const image = await prepareImage(document.getElementById("ItemPic").files[0]);
        const newItem = push(ref(database, "items"));
        await set(newItem, {
            type: selectedType,
            title: String(values.get("ItemTitle")).trim(),
            detail: String(values.get("ItemDetail")).trim(),
            place: String(values.get("ItemPlace")).trim(),
            contactEmail: String(values.get("contactEmail")).trim(),
            verificationQuestion: String(values.get("verificationQuestion")).trim(),
            verificationSalt: salt,
            verificationHash,
            image,
            createdAt: Date.now()
        });

        form.reset();
        formMessage.textContent = "Your report was added.";
    } catch (error) {
        console.error("Could not submit the report:", error);
        formMessage.textContent = error instanceof Error
            ? `Could not submit your report: ${error.message}`
            : "Could not submit your report. Please try again.";
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Submit Report";
    }
});

setReportType("lost");
