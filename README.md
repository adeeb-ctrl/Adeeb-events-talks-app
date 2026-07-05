# BigQuery Release Notes Dashboard

A high-fidelity single-page web dashboard built with **Python Flask** and **Vanilla HTML/CSS/JavaScript**. It fetches Google Cloud's official BigQuery Release Notes feed, parses consolidated updates into segmented categorized cards, and provides instant client-side searching, category filtering, and direct social sharing.

---

## ✨ Features

- **Dashboard Statistics**: Dynamic numerical counters measuring total releases, features, fixes, and changes currently loaded.
- **Visual Categorization**: Color-coded timeline entries mapped to specific update types:
  - **Feature** (Teal)
  - **Fix** (Cyan)
  - **Change** (Orange)
  - **Deprecation** (Red)
  - **Announcement** (Purple)
- **Fast Search & Filter**: Instant browser-side text search and category badges for low latency.
- **Smart Cache Layer**: 5-minute server-side in-memory caching to avoid feed rate-limiting, with automatic stale-cache fallbacks and manual user force-refreshing.
- **X/Twitter Composer Modal**: Formats release details into a custom tweet, includes description-truncating helpers, and tracks character limits (accounting for X's 23-character URL standard).

---

## 📂 Project Structure

- **[app.py](file:///C:/Users/Adeeb%20Ur%20Rahman/Desktop/agy-cli-projects/bq-releases-notes/app.py)**: Backend routing controller, caching logic, and XML parsing middleware.
- **[templates/index.html](file:///C:/Users/Adeeb%20Ur%20Rahman/Desktop/agy-cli-projects/bq-releases-notes/templates/index.html)**: Main dashboard view structure using responsive templates and native SVG assets.
- **[static/style.css](file:///C:/Users/Adeeb%20Ur%20Rahman/Desktop/agy-cli-projects/bq-releases-notes/static/style.css)**: Tech-noir design stylesheet containing glassmorphic utilities and visual micro-animations.
- **[static/app.js](file:///C:/Users/Adeeb%20Ur%20Rahman/Desktop/agy-cli-projects/bq-releases-notes/static/app.js)**: Client-side state manager handling real-time view updates, search-indexing, and social share modals.
- **[.gitignore](file:///C:/Users/Adeeb%20Ur%20Rahman/Desktop/agy-cli-projects/bq-releases-notes/.gitignore)**: Standard version control ignore list for Python virtual environments and caches.

---

## 🚀 Setup & Installation

### Prerequisites
- **Python 3.8+**
- **pip** (Python package installer)

### 1. Clone & Navigate
If you haven't already, clone this repository and enter the directory:
```bash
git clone https://github.com/adeeb-ctrl/Adeeb-events-talks-app.git
cd Adeeb-events-talks-app
```

### 2. Configure Virtual Environment (Recommended)
Set up a clean virtual environment to manage dependencies:
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
Install the required packages (Flask):
```bash
pip install flask
```

### 4. Run the Application
Start the local development server:
```bash
python app.py
```

Open your browser and navigate to:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## ⚙️ Architecture Breakdown

### Server-Side (`app.py`)
1. **Network Fetcher**: Downloads `https://docs.cloud.google.com/feeds/bigquery-release-notes.xml` with a 15-second timeout safeguard.
2. **HTML Splitter**: Google groups daily notes together. The server uses regular expressions to segment content on `<h3>` tag boundaries, isolating each type of announcement.
3. **Caching**: Retains parsed results for 300 seconds. If a connection issue occurs but a cache exists, it serves the cache with a warning.

### Client-Side (`app.js` & `style.css`)
1. **State Store**: Holds the state array representing active search queries, selected filters, and sorting direction.
2. **Render Loop**: Destroys and rebuilds the feed cards programmatically in the DOM when state variables change.
3. **Twitter Web Intent**: Uses a textarea modal to let users edit tweets before opening `https://twitter.com/intent/tweet?text=` in a new tab.
