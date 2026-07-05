// Application State
let appState = {
    feedData: null,
    filteredEntries: [], // Currently displayed entries
    searchQuery: '',
    activeFilter: 'all', // 'all', 'Feature', 'Fix', 'Change', etc.
    sortOrder: 'desc',   // 'desc' (newest first) or 'asc' (oldest first)
};

// DOM Elements
const elements = {
    refreshBtn: document.getElementById('btn-refresh'),
    lastUpdatedText: document.getElementById('last-updated-time'),
    searchInput: document.getElementById('search-input'),
    searchClear: document.getElementById('search-clear'),
    filterBadges: document.querySelectorAll('.filter-badge'),
    sortDescBtn: document.getElementById('sort-desc'),
    sortAscBtn: document.getElementById('sort-asc'),
    releasesFeed: document.getElementById('releases-feed'),
    emptyState: document.getElementById('feed-empty-state'),
    resetFiltersBtn: document.getElementById('btn-reset-filters'),
    exportBtn: document.getElementById('btn-export'),
    
    // Stats
    statTotalVal: document.getElementById('stat-total-val'),
    statFeatureVal: document.getElementById('stat-feature-val'),
    statFixVal: document.getElementById('stat-fix-val'),
    statChangeVal: document.getElementById('stat-change-val'),
    
    // Alert
    alertContainer: document.getElementById('api-warning-alert'),
    alertMsg: document.getElementById('api-warning-msg'),
    
    // Modal
    tweetModal: document.getElementById('tweet-modal'),
    tweetTextArea: document.getElementById('tweet-text-area'),
    tweetCharCounter: document.getElementById('tweet-char-counter'),
    tweetCharWarning: document.getElementById('tweet-char-warning'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnCancelTweet: document.getElementById('btn-cancel-tweet'),
    btnSubmitTweet: document.getElementById('btn-submit-tweet')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    fetchReleases();
});

// Setup Event Listeners
function setupEventListeners() {
    // Refresh feed
    elements.refreshBtn.addEventListener('click', () => {
        fetchReleases(true);
    });

    // Export to CSV
    elements.exportBtn.addEventListener('click', exportToCSV);

    // Search filter
    elements.searchInput.addEventListener('input', (e) => {
        appState.searchQuery = e.target.value.trim().toLowerCase();
        toggleSearchClearButton();
        renderPage();
    });

    // Clear search
    elements.searchClear.addEventListener('click', () => {
        elements.searchInput.value = '';
        appState.searchQuery = '';
        toggleSearchClearButton();
        elements.searchInput.focus();
        renderPage();
    });

    // Category filter badges
    elements.filterBadges.forEach(badge => {
        badge.addEventListener('click', () => {
            elements.filterBadges.forEach(b => b.classList.remove('active'));
            badge.classList.add('active');
            appState.activeFilter = badge.getAttribute('data-filter');
            renderPage();
        });
    });

    // Sort buttons
    elements.sortDescBtn.addEventListener('click', () => {
        elements.sortAscBtn.classList.remove('active');
        elements.sortDescBtn.classList.add('active');
        appState.sortOrder = 'desc';
        renderPage();
    });

    elements.sortAscBtn.addEventListener('click', () => {
        elements.sortDescBtn.classList.remove('active');
        elements.sortAscBtn.classList.add('active');
        appState.sortOrder = 'asc';
        renderPage();
    });

    // Reset filters button in empty state
    elements.resetFiltersBtn.addEventListener('click', resetFilters);

    // Warning Alert close
    const alertCloseBtn = elements.alertContainer.querySelector('.alert-close');
    if (alertCloseBtn) {
        alertCloseBtn.addEventListener('click', () => {
            elements.alertContainer.style.display = 'none';
        });
    }

    // Tweet Modal Character Count
    elements.tweetTextArea.addEventListener('input', updateCharCount);

    // Close Modal Events
    elements.btnCloseModal.addEventListener('click', closeTweetModal);
    elements.btnCancelTweet.addEventListener('click', closeTweetModal);
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) {
            closeTweetModal();
        }
    });

    // Submit Tweet
    elements.btnSubmitTweet.addEventListener('click', executeTweet);
}

// Reset Filters Utility
function resetFilters() {
    elements.searchInput.value = '';
    appState.searchQuery = '';
    toggleSearchClearButton();
    
    elements.filterBadges.forEach(b => b.classList.remove('active'));
    document.querySelector('.filter-badge[data-filter="all"]').classList.add('active');
    appState.activeFilter = 'all';
    
    renderPage();
}

// Show/Hide search clear icon
function toggleSearchClearButton() {
    if (appState.searchQuery) {
        elements.searchClear.style.display = 'flex';
    } else {
        elements.searchClear.style.display = 'none';
    }
}

// Fetch Release Notes
async function fetchReleases(forceRefresh = false) {
    // Show spinner and disable button
    elements.refreshBtn.classList.add('loading');
    elements.refreshBtn.disabled = true;
    
    // If it's a force refresh, we might want to show loading skeletons again
    if (forceRefresh) {
        showSkeletons();
    }
    
    try {
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            appState.feedData = result.data;
            
            // Format Last Updated Text
            if (appState.feedData.fetched_at) {
                const fetchDate = new Date(appState.feedData.fetched_at * 1000);
                elements.lastUpdatedText.textContent = `Synced: ${fetchDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}`;
            }
            
            // Handle warning (e.g. stale cache due to fetch error)
            if (result.warning) {
                elements.alertMsg.textContent = result.warning;
                elements.alertContainer.style.display = 'flex';
            } else {
                elements.alertContainer.style.display = 'none';
            }
            
            renderPage();
        } else {
            showErrorState(result.error || 'Failed to fetch release notes.');
        }
    } catch (error) {
        showErrorState(`Network error: ${error.message}`);
    } finally {
        // Reset refresh button state
        elements.refreshBtn.classList.remove('loading');
        elements.refreshBtn.disabled = false;
    }
}

// Show Shimmer Skeletons
function showSkeletons() {
    elements.emptyState.style.display = 'none';
    elements.releasesFeed.innerHTML = `
        <div class="skeleton-card">
            <div class="skeleton-date"></div>
            <div class="skeleton-item">
                <div class="skeleton-badge"></div>
                <div class="skeleton-text"></div>
                <div class="skeleton-text short"></div>
            </div>
        </div>
        <div class="skeleton-card">
            <div class="skeleton-date"></div>
            <div class="skeleton-item">
                <div class="skeleton-badge"></div>
                <div class="skeleton-text"></div>
                <div class="skeleton-text short"></div>
            </div>
        </div>
    `;
}

// Display Error Info in feed container
function showErrorState(errorMsg) {
    elements.releasesFeed.innerHTML = '';
    elements.emptyState.style.display = 'none';
    
    elements.alertMsg.textContent = errorMsg;
    elements.alertContainer.className = "alert alert-warning";
    elements.alertContainer.style.display = 'flex';
    
    elements.statTotalVal.textContent = '-';
    elements.statFeatureVal.textContent = '-';
    elements.statFixVal.textContent = '-';
    elements.statChangeVal.textContent = '-';
}

// Main Render Function
function renderPage() {
    if (!appState.feedData || !appState.feedData.entries) return;
    
    const entries = appState.feedData.entries;
    let totalStats = { total: 0, feature: 0, fix: 0, change: 0 };
    let filteredEntries = [];
    
    // Process and filter entries
    entries.forEach(entry => {
        // Filter the individual items inside each day's entry
        const matchedItems = entry.items.filter(item => {
            // Count stats for overall entries (before search filters, but including standard counts)
            // This displays standard stats on overall available feed items
            const lowerType = item.type.toLowerCase();
            if (lowerType === 'feature') totalStats.feature++;
            else if (lowerType === 'fix') totalStats.fix++;
            else totalStats.change++;
            totalStats.total++;
            
            // 1. Filter by category
            if (appState.activeFilter !== 'all' && item.type !== appState.activeFilter) {
                return false;
            }
            
            // 2. Filter by search query
            if (appState.searchQuery) {
                const searchMatch = 
                    entry.title.toLowerCase().includes(appState.searchQuery) ||
                    item.type.toLowerCase().includes(appState.searchQuery) ||
                    item.text.toLowerCase().includes(appState.searchQuery);
                return searchMatch;
            }
            
            return true;
        });
        
        if (matchedItems.length > 0) {
            filteredEntries.push({
                ...entry,
                items: matchedItems
            });
        }
    });
    
    // Update Stats Display
    elements.statTotalVal.textContent = totalStats.total;
    elements.statFeatureVal.textContent = totalStats.feature;
    elements.statFixVal.textContent = totalStats.fix;
    elements.statChangeVal.textContent = totalStats.change;
    
    // Sort logic
    filteredEntries.sort((a, b) => {
        const dateA = new Date(a.title);
        const dateB = new Date(b.title);
        return appState.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    // Save globally for exports
    appState.filteredEntries = filteredEntries;
    
    // Render Feed List
    elements.releasesFeed.innerHTML = '';
    
    if (filteredEntries.length === 0) {
        elements.emptyState.style.display = 'block';
    } else {
        elements.emptyState.style.display = 'none';
        
        filteredEntries.forEach(entry => {
            const cardEl = document.createElement('div');
            cardEl.className = 'release-card';
            
            // Card Day Header
            let itemsHtml = '';
            entry.items.forEach(item => {
                itemsHtml += `
                    <div class="release-item" data-type="${escapeHtml(item.type)}">
                        <div class="release-item-header">
                            <span class="type-badge">${escapeHtml(item.type)}</span>
                            <div class="item-actions">
                                <button class="btn-icon btn-copy-item" title="Copy text to clipboard"
                                    data-date="${escapeHtml(entry.title)}"
                                    data-type="${escapeHtml(item.type)}"
                                    data-text="${escapeHtml(item.text)}"
                                    data-link="${escapeHtml(entry.link)}">
                                    <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" class="copy-svg"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                </button>
                                <button class="btn-icon btn-tweet-item" title="Share this item on X / Twitter"
                                    data-date="${escapeHtml(entry.title)}"
                                    data-type="${escapeHtml(item.type)}"
                                    data-text="${escapeHtml(item.text)}"
                                    data-link="${escapeHtml(entry.link)}">
                                    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                                </button>
                            </div>
                        </div>
                        <div class="item-content">${item.html}</div>
                    </div>
                `;
            });
            
            cardEl.innerHTML = `
                <div class="card-header-day">
                    <span class="date-badge">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        ${escapeHtml(entry.title)}
                    </span>
                    <a href="${escapeHtml(entry.link)}" target="_blank" rel="noopener noreferrer" class="doc-link">
                        <span>Original Feed Link</span>
                        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
                    </a>
                </div>
                <div class="card-items-container">
                    ${itemsHtml}
                </div>
            `;
            
            elements.releasesFeed.appendChild(cardEl);
        });
        
        // Add Listeners to newly rendered items
        setupItemActionListeners();
    }
}

// Setup listeners for copy and tweet buttons
function setupItemActionListeners() {
    // Tweet Buttons
    const tweetButtons = document.querySelectorAll('.btn-tweet-item');
    tweetButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const button = e.currentTarget;
            const date = button.getAttribute('data-date');
            const type = button.getAttribute('data-type');
            const text = button.getAttribute('data-text');
            const link = button.getAttribute('data-link');
            
            openTweetModal(date, type, text, link);
        });
    });

    // Copy Buttons
    const copyButtons = document.querySelectorAll('.btn-copy-item');
    copyButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const button = e.currentTarget;
            const date = button.getAttribute('data-date');
            const type = button.getAttribute('data-type');
            const text = button.getAttribute('data-text');
            const link = button.getAttribute('data-link');
            
            // Format copy string
            const copyContent = `BigQuery Release Update (${date})\n[${type}]: ${text}\n\nLink: ${link}`;
            
            try {
                await navigator.clipboard.writeText(copyContent);
                
                // Show visual confirmation checkmark
                const originalHTML = button.innerHTML;
                button.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" stroke="#10b981" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" class="checkmark-svg"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                button.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                button.style.backgroundColor = 'rgba(16, 185, 129, 0.08)';
                
                // Reset after 2 seconds
                setTimeout(() => {
                    button.innerHTML = originalHTML;
                    button.style.borderColor = '';
                    button.style.backgroundColor = '';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy text: ', err);
            }
        });
    });
}

// Export Filtered Release Notes to CSV
function exportToCSV() {
    if (!appState.filteredEntries || appState.filteredEntries.length === 0) {
        alert("No release notes available to export.");
        return;
    }

    let csvRows = [];
    // CSV Header row
    csvRows.push('"Date","Type","Description","Link"');
    
    appState.filteredEntries.forEach(entry => {
        entry.items.forEach(item => {
            // Escape quotes by doubling them
            const dateStr = entry.title.replace(/"/g, '""');
            const typeStr = item.type.replace(/"/g, '""');
            const textStr = item.text.replace(/"/g, '""');
            const linkStr = entry.link.replace(/"/g, '""');
            
            csvRows.push(`"${dateStr}","${typeStr}","${textStr}","${linkStr}"`);
        });
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const downloadLink = document.createElement("a");
    downloadLink.setAttribute("href", url);
    
    // Set file name with current date
    const dateFormatted = new Date().toISOString().slice(0, 10);
    downloadLink.setAttribute("download", `bigquery_release_notes_${dateFormatted}.csv`);
    downloadLink.style.visibility = 'hidden';
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

// Open Tweet Composer Modal
function openTweetModal(date, type, text, link) {
    // Generate pre-formatted text
    const composedText = formatTweetText(date, type, text, link);
    elements.tweetTextArea.value = composedText;
    
    // Update count and show modal
    updateCharCount();
    elements.tweetModal.classList.add('active');
    
    // Focus text-area
    setTimeout(() => {
        elements.tweetTextArea.focus();
        elements.tweetTextArea.setSelectionRange(elements.tweetTextArea.value.length, elements.tweetTextArea.value.length);
    }, 100);
}

// Close Modal
function closeTweetModal() {
    elements.tweetModal.classList.remove('active');
}

// Generate pre-formatted Tweet string
function formatTweetText(date, type, text, link) {
    const header = `🚀 BigQuery Update (${date})\n`;
    
    // Only display type prefix if it represents a meaningful subcategory
    const typePrefix = type && type !== 'Announcement' && type !== 'Update' ? `[${type}] ` : '';
    
    const footer = `\n\nDetails: ${link}\n#BigQuery #GoogleCloud`;
    
    // Twitter's URL count is always 23 chars for any URL.
    // Calculate length budget for description:
    // 280 (total limit) - (header length) - (typePrefix length) - 23 (for link) - 26 (for footer tags/labels)
    const urlPlaceholderOffset = link ? 23 : 0;
    const literalLinkLen = link ? link.length : 0;
    
    // Since we display link literally in composer, but Twitter shortens it to 23 chars, 
    // we want to truncate description text to fit in X's backend validator.
    // X limit calculation:
    const occupiedLength = header.length + typePrefix.length + urlPlaceholderOffset + 27; // 27 is len of footer without link
    const descriptionBudget = 280 - occupiedLength;
    
    let cleanText = text;
    if (cleanText.length > descriptionBudget) {
        cleanText = cleanText.substring(0, descriptionBudget - 3) + '...';
    }
    
    return `${header}${typePrefix}${cleanText}${footer}`;
}

// Update Tweet character counter and validity warnings
function updateCharCount() {
    const text = elements.tweetTextArea.value;
    
    // Twitter counts URL as exactly 23 characters regardless of length.
    // We should parse text to find links and count them as 23.
    // Let's implement an accurate Twitter-style char counter:
    let twitterLength = text.length;
    
    // Find URL matches
    const urlPattern = /https?:\/\/[^\s]+/g;
    const matches = text.match(urlPattern);
    
    if (matches) {
        matches.forEach(url => {
            // Subtract literal URL length, add 23
            twitterLength = twitterLength - url.length + 23;
        });
    }
    
    elements.tweetCharCounter.textContent = `${twitterLength} / 280`;
    
    // Class names & Warnings
    elements.tweetCharCounter.classList.remove('warning', 'danger');
    elements.tweetCharWarning.style.display = 'none';
    elements.btnSubmitTweet.disabled = false;
    
    if (twitterLength > 280) {
        elements.tweetCharCounter.classList.add('danger');
        elements.tweetCharWarning.style.display = 'flex';
    } else if (twitterLength > 250) {
        elements.tweetCharCounter.classList.add('warning');
    }
}

// Perform Share Web Intent
function executeTweet() {
    const tweetText = elements.tweetTextArea.value;
    
    // Open X / Twitter Web Intent in new tab
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(intentUrl, '_blank');
    
    closeTweetModal();
}

// HTML Escaping Utility
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
