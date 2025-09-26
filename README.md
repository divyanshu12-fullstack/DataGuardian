# DataGuardian: Your Digital Privacy Guardian 🛡️

**Tagline:** "Know, Control, and Protect Every Byte of Your Data."

DataGuardian is a comprehensive browser extension designed to act as a powerful, user-friendly privacy dashboard. It demystifies the opaque world of online data tracking by meticulously identifying and categorizing trackers, leveraging advanced AI to simplify complex privacy policies, and providing users with granular, real-time control over their personal information.

---

## The Problem: A Digital World Built on Hidden Data Exchange

The modern internet operates on a foundation of data. While this enables incredible services, it has created a significant power imbalance. Users are routinely monitored across websites by a vast network of third-party trackers, and the "agreements" governing this data collection—privacy policies—are intentionally dense, lengthy, and filled with legal jargon.

This leads to critical challenges for every internet user:

- **Pervasive Invisibility:** Users have no easy way to see the sheer volume of trackers operating silently on a given webpage. This tracking builds a detailed profile of their behavior, interests, and personal life without their explicit, informed consent.
- **Weaponized Complexity:** Privacy policies are a form of "malicious compliance." They technically disclose data practices but in a format that is nearly impossible for a non-lawyer to understand, rendering the concept of consent meaningless.
- **Illusion of Control:** Standard browser settings offer minimal, all-or-nothing controls. Users are forced to either accept invasive tracking to use a service or opt out entirely, lacking the tools to make nuanced decisions about their data.

DataGuardian was built to systematically dismantle these problems by replacing opacity with transparency and powerlessness with empowerment.

---

## 🚶 A User's Journey Through DataGuardian

To understand how DataGuardian works in practice, let's walk through the user experience from the first click to taking full control of your privacy.

### 1. The First Glance: The Popup View

When you're on a website and click the DataGuardian icon in your browser's toolbar, the **Popup View** appears. This is your initial, quick-glance dashboard.

<table>
  <tr>
    <td><img width="400" alt="Popup View 1" src="https://github.com/user-attachments/assets/c8cc973e-e2c3-41dc-a7f4-8be70c614a7d"></td>
    <td><img width="400" alt="Popup View 2" src="https://github.com/user-attachments/assets/de58a651-4b37-4dce-aa89-29eb5b004b01"></td>
  </tr>
    <tr>
    <td colspan="2" align="center"><img width="400" alt="Popup View 3" src="https://github.com/user-attachments/assets/d041ec87-edf6-4cfa-9dcf-c1877e200b7d"></td>
  </tr>
</table>

Here's what you see and can do:

- **Privacy Grade:** At the very top, you'll see a prominent letter grade (from A+ to F). This is the site's overall **Privacy Score**, giving you an immediate sense of its trustworthiness.
- **AI Privacy Snapshot:** A compact, AI-generated summary gives you the most critical information from the site's privacy policy in one-liners: what data they collect, who they share it with, and the single most important risk.
- **Trackers Detected:** A clear list shows you the categories of trackers found on the page (e.g., Advertising, Analytics) and the total number of trackers detected.
- **One-Click Privacy Modes:** You have three simple but powerful buttons to control the site's behavior instantly:
  - 🛡️ **Stealth:** The highest level of protection. Blocks all detected trackers, ensuring maximum privacy.
  - 🔬 **Research:** A balanced mode. It allows tracker requests to go through but attempts to strip them of personal identifiers.
  - ⚪ **None:** This is the default mode. All protections are off, and trackers are allowed to function as they normally would.

Your choice of mode is saved for that specific site, so you can set your preferences once and DataGuardian will remember them on your next visit.

### 2. The Deep Dive: The Full Report View

The "View Full Report & Controls" button takes you to the comprehensive **Full Report View**, the central command center for your privacy.

#### a. AI-Powered Privacy Analysis

At the top is the complete AI-driven summary of the website's privacy policy, broken down into:
- **What They Collect:** A clear, bulleted list of the types of data the site gathers.
- **Who They Share With:** A list of the third parties or categories of partners your data is shared with.
- **Key Privacy Risks:** The most significant potential risks, explained in simple terms.

<table>
  <tr>
    <td><img width="400" alt="AI Analysis 1" src="https://github.com/user-attachments/assets/4feaac15-934f-4dc7-879d-044169f17738"></td>
    <td><img width="400" alt="AI Analysis 2" src="https://github.com/user-attachments/assets/72728354-68b7-4ae0-ae4d-12aef0145eb8"></td>
  </tr>
  <tr>
    <td><img width="400" alt="AI Analysis 3" src="https://github.com/user-attachments/assets/c2e04830-bc78-49f2-9788-d4a5bc0630eb"></td>
    <td><img width="400" alt="AI Analysis 4" src="https://github.com/user-attachments/assets/9ad16c65-fff7-4430-bbcf-73192f00aa96"></td>
  </tr>
    <tr>
    <td colspan="2" align="center"><img width="400" alt="AI Analysis 5" src="https://github.com/user-attachments/assets/ee1b703c-a6db-40ca-a844-7d9ef00e17a4"></td>
  </tr>
</table>

#### b. Granular Privacy Controls

Below the AI analysis, the **Privacy Controls panel** lets you become the master of your data.
- **Per-Category Toggles:** You'll see a list of all tracker categories detected (Advertising, Social, Analytics, etc.), each with its own on/off toggle.
- **Customized Protection:** Simply flip the switch for any category to block or allow it. Your custom ruleset is automatically saved for this site.

<p align="center">
  <img width="400" alt="Granular Controls" src="https://github.com/user-attachments/assets/04ee3e36-3b31-4431-8c45-8c7e7a59db07">
</p>

#### c. Interactive Data Flow Visualization

This view features a powerful visualization of the tracker network.
- **See Your Data's Journey:** This interactive graph shows you a map of where your data is going, with the website at the center connected to all the third-party companies tracking you.
- **Explore the Network:** You can click and drag the nodes to see the connections more clearly.

<table>
  <tr>
    <td><img width="400" alt="Data Flow 1" src="https://github.com/user-attachments/assets/7db0247c-0ee1-4ffb-b22b-f3c15801ac45"></td>
    <td><img width="400" alt="Data Flow 2" src="https://github.com/user-attachments/assets/e5fd0faa-a3f2-4559-917b-783d2c105129"></td>
  </tr>
  <tr>
    <td><img width="400" alt="Data Flow 3" src="https://github.com/user-attachments/assets/0036d0e6-1fec-405c-97ef-6946a9a07d88"></td>
    <td><img width="400" alt="Data Flow 4" src="https://github.com/user-attachments/assets/1ee64614-ba50-4504-b2f8-20a568ca0563"></td>
  </tr>
</table>

---

## 🛠️ Architectural Overview

DataGuardian operates on a client-server architecture:
- **Frontend (The Browser Extension):** Built with **React** and **Vite**, this is the user-facing component responsible for the UI, real-time tracker interception, and managing settings.
- **Backend (The Analysis Engine):** A **Node.js/Express** server that handles AI-powered analysis, scraping privacy policies, and communicating with the Gemini API.

This separation ensures the extension remains lightweight and fast.

---

## Functionality Deep Dive: How Each Feature Works

- **1. Real-Time Tracker Detection and Blocking:** The extension's service worker (`background.js`) uses the `chrome.webRequest` API to intercept all outgoing network requests. Each request is checked against a comprehensive `privacy_rules.json` blocklist.
- **2. User Controls & Settings Persistence:** The `privacyManager.js` module handles all user settings, saving your choices on a per-site basis to `chrome.storage.local`.
- **3. AI-Powered Privacy Policy Demystification:** Our backend scrapes privacy policies, sends them to the **Gemini API** for analysis, and caches the results for fast delivery.
- **4. At-a-Glance Privacy Scoring:** A weighted algorithm in `scoring.js` calculates a score based on the number and severity of trackers.
- **5. Interactive Data Flow Visualization:** The `TrackerNetworkVisualization.jsx` component uses **D3.js** to render a force-directed graph of the tracker network.

---

## 💻 Technology Stack

- **Frontend:** React 18, Vite, Tailwind CSS
- **Data Visualization:** D3.js
- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose
- **Caching:** Redis
- **AI Engine:** Google Gemini API
- **Browser Integration:** Chrome Extension Manifest V3 APIs

---

## 🚀 Getting Started: Local Development Setup

### Prerequisites
- Node.js (v18+), npm
- Google Chrome (or other Chromium browser)
- MongoDB database access
- Google Gemini API key

### Installation & Setup
1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/amanpatre/dataguardian_test.git](https://github.com/amanpatre/dataguardian_test.git)
    cd dataguardian_test
    ```
2.  **Configure the Backend:**
    ```bash
    cd backend
    cp .env.example .env
    # Edit the .env file with your credentials
    npm install
    ```
3.  **Configure the Frontend:**
    ```bash
    cd ../frontend
    npm install
    ```
4.  **Run the System:**
    ```bash
    # In the backend directory, start the server
    npm start

    # In the frontend directory, build the extension
    npm run build
    ```
### Loading the Extension in Chrome
1.  Open Chrome and navigate to `chrome://extensions`.
2.  Enable **"Developer mode"**.
3.  Click **"Load unpacked"**.
4.  Select the `frontend/dist` directory. The DataGuardian icon will appear in your toolbar.
