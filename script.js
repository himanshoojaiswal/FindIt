
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
let selectedType = "lost";

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

// Build the card shown for one lost or found report.
function makeItemCard(item) {
    const card = document.createElement("article");
    card.className = "item-card";

    const type = item.type === "found" ? "Found" : "Lost";
    addTextElement(card, "span", `item-type ${item.type === "found" ? "found" : "lost"}`, type);
    addTextElement(card, "h3", "item-title", item.title);

    if (item.image) {
        const image = document.createElement("img");
        image.className = "item-image";
        image.src = item.image;
        image.alt = `Photo of ${item.title}`;
        image.loading = "lazy";
        card.append(image);
    }

    addTextElement(card, "p", "item-detail", item.detail);
    addTextElement(card, "p", "item-place", `${item.type === "found" ? "Found at" : "Lost at"}: ${item.place}`);
    if (Number.isFinite(item.createdAt)) {
        addTextElement(card, "p", "item-date", new Date(item.createdAt).toLocaleDateString());
    }

    const question = document.createElement("p");
    question.className = "verification-question";
    const questionLabel = document.createElement("strong");
    questionLabel.textContent = "Verification question: ";
    question.append(questionLabel, document.createTextNode(item.verificationQuestion));
    card.append(question);

    const answerLabel = document.createElement("label");
    answerLabel.className = "claim-label";
    answerLabel.textContent = "Your answer";
    const answerInput = document.createElement("input");
    answerInput.type = "text";
    answerInput.maxLength = 120;
    answerInput.autocomplete = "off";
    answerLabel.append(answerInput);
    card.append(answerLabel);

    const contactControls = document.createElement("div");
    contactControls.className = "claim-controls";
    const checkButton = document.createElement("button");
    checkButton.type = "button";
    checkButton.textContent = "Check answer to contact";
    const result = document.createElement("span");
    result.className = "claim-result";
    result.setAttribute("aria-live", "polite");
    contactControls.append(checkButton, result);
    card.append(contactControls);

    checkButton.addEventListener("click", async () => {
        result.textContent = "";
        if (!answerInput.value.trim()) {
            result.textContent = "Enter an answer first.";
            return;
        }
        checkButton.disabled = true;
        try {
            const answerHash = await hashAnswer(item.verificationSalt, answerInput.value);
            if (answerHash !== item.verificationHash) {
                result.textContent = "That answer does not match. Check with the item owner.";
                return;
            }
            if (typeof item.contactEmail !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.contactEmail)) {
                result.textContent = "This report does not have a valid contact email.";
                return;
            }

            const contactLink = document.createElement("a");
            contactLink.className = "contact-link";
            contactLink.href = `mailto:${item.contactEmail}?subject=${encodeURIComponent(`FindIt: ${item.title}`)}&body=${encodeURIComponent(`Hello, I think I can identify your ${type.toLowerCase()} item. I answered the verification question correctly. Please contact me so we can arrange its return.`)}`;
            contactLink.textContent = "Email the reporter";
            result.replaceChildren(contactLink);
        } catch (error) {
            console.error("Could not check the verification answer:", error);
            result.textContent = "Could not check the answer. Please try again.";
        } finally {
            checkButton.disabled = false;
        }
    });

    return card;
}

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
