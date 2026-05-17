// AI Landscape Application
document.addEventListener('DOMContentLoaded', () => {
    // State
    let currentTrack = 'all';
    let currentType = 'all';
    let searchQuery = '';
    let currentMode = 'action'; // 'action' or 'browse'

    // Format star count (e.g., 15400 -> "15.4k")
    function formatStars(count) {
        if (!count || count < 0) return null;
        if (count >= 1000000) {
            return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        }
        if (count >= 1000) {
            return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        }
        return count.toString();
    }

    // DOM Elements - Action Mode
    const heroAction = document.getElementById('hero-action');
    const actionInput = document.getElementById('action-input');
    const searchResults = document.getElementById('search-results');
    const resultsGrid = document.getElementById('results-grid');
    const resultsCount = document.getElementById('results-count');
    const clearSearch = document.getElementById('clear-search');
    const browseToggle = document.getElementById('browse-toggle');
    const quickActionChips = document.querySelectorAll('.action-chip');

    // DOM Elements - Browse Mode
    const landscapeControls = document.getElementById('landscape-controls');
    const backToSearch = document.getElementById('back-to-search');
    const expandAllBtn = document.getElementById('expand-all');
    const collapseAllBtn = document.getElementById('collapse-all');
    const statsBar = document.getElementById('stats-bar');
    const landscape = document.getElementById('landscape');
    const trackButtons = document.querySelectorAll('.track-btn');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const visibleCountEl = document.getElementById('visible-count');
    const categoryCountEl = document.getElementById('category-count');
    const tooltip = document.getElementById('tooltip');

    // Initialize
    setupEventListeners();

    // Get all tools as flat array for searching
    function getAllTools() {
        const tools = [];
        ['users', 'developers'].forEach(track => {
            if (!landscapeData[track]) return;
            landscapeData[track].forEach(category => {
                category.subcategories.forEach(subcategory => {
                    subcategory.tools.forEach(tool => {
                        tools.push({
                            ...tool,
                            categoryName: category.name,
                            subcategoryName: subcategory.name,
                            track: track
                        });
                    });
                });
            });
        });
        return tools;
    }

    // Search by intent - enhanced search with relevance scoring
    function searchByIntent(query) {
        if (!query || query.trim() === '') {
            return [];
        }

        const queryLower = query.toLowerCase().trim();
        const words = queryLower.split(/\s+/).filter(w => w.length > 1);

        if (words.length === 0) {
            return [];
        }

        const allTools = getAllTools();

        return allTools
            .map(tool => ({
                tool,
                score: calculateRelevanceScore(tool, words, queryLower)
            }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 40)
            .map(item => item.tool);
    }

    // Calculate relevance score for a tool
    function calculateRelevanceScore(tool, queryWords, fullQuery) {
        let score = 0;
        const nameLower = tool.name.toLowerCase();
        const descLower = tool.desc.toLowerCase();
        const categoryLower = tool.categoryName?.toLowerCase() || '';
        const subcategoryLower = tool.subcategoryName?.toLowerCase() || '';

        // Exact name match (highest priority)
        if (nameLower === fullQuery) {
            score += 100;
        }

        // Name contains full query
        if (nameLower.includes(fullQuery)) {
            score += 50;
        }

        // Word-by-word matching
        for (const word of queryWords) {
            // Name matches
            if (nameLower.includes(word)) {
                score += 15;
            }

            // Subcategory matches (very relevant for intent)
            if (subcategoryLower.includes(word)) {
                score += 12;
            }

            // Category matches
            if (categoryLower.includes(word)) {
                score += 8;
            }

            // Description matches
            if (descLower.includes(word)) {
                score += 5;
            }
        }

        // Boost for matching multiple words
        const matchedWords = queryWords.filter(word =>
            nameLower.includes(word) ||
            descLower.includes(word) ||
            categoryLower.includes(word) ||
            subcategoryLower.includes(word)
        );

        if (matchedWords.length > 1) {
            score += matchedWords.length * 3;
        }

        return score;
    }

    // Render search results in flat grid
    function renderSearchResults(tools) {
        if (tools.length === 0) {
            resultsGrid.innerHTML = `
                <div class="no-results">
                    <p>No tools found. Try different keywords or</p>
                    <button class="browse-link" id="browse-from-empty">browse all tools</button>
                </div>
            `;
            resultsCount.textContent = '0 tools found';

            // Add event listener for the browse link
            const browseLink = document.getElementById('browse-from-empty');
            if (browseLink) {
                browseLink.addEventListener('click', () => switchMode('browse'));
            }
            return;
        }

        resultsCount.textContent = `${tools.length} tool${tools.length === 1 ? '' : 's'} found`;

        resultsGrid.innerHTML = tools.map(tool => createResultCardHTML(tool)).join('');
    }

    // Create result card HTML (larger than landscape cards)
    function createResultCardHTML(tool) {
        const initial = tool.name.charAt(0).toUpperCase();
        const badgeClass = `badge-${tool.type}`;
        const typeLabel = tool.type === 'oss' ? 'OSS' : tool.type === 'saas' ? 'SaaS' : 'Commercial';

        let domain = '';
        try {
            domain = new URL(tool.url).hostname.replace('www.', '');
        } catch (e) {
            domain = '';
        }

        const logoUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '';
        const stars = formatStars(tool.github_stars);
        const starsHtml = stars ? `<span class="stars-badge" title="${tool.github_stars.toLocaleString()} GitHub stars"><svg class="star-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z"/></svg>${stars}</span>` : '';

        return `
            <div class="result-card"
                 data-name="${tool.name}"
                 data-url="${tool.url}"
                 data-desc="${tool.desc}"
                 data-type="${tool.type}"
                 data-category="${tool.categoryName || ''}"
                 data-subcategory="${tool.subcategoryName || ''}">
                <div class="result-icon" data-initial="${initial}">
                    ${logoUrl ? `<img src="${logoUrl}" alt="${tool.name}" loading="lazy" onerror="this.parentElement.textContent=this.parentElement.dataset.initial">` : initial}
                </div>
                <div class="result-info">
                    <div class="result-name">${tool.name}</div>
                    <div class="result-desc">${tool.desc}</div>
                    <div class="result-meta">
                        <span class="result-category">${tool.subcategoryName || tool.categoryName || ''}</span>
                        ${starsHtml}
                        <span class="badge ${badgeClass}">${typeLabel}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Switch between action and browse modes
    function switchMode(mode) {
        currentMode = mode;

        if (mode === 'action') {
            heroAction.classList.remove('hidden');
            searchResults.classList.remove('hidden');
            landscapeControls.classList.add('hidden');
            statsBar.classList.add('hidden');
            landscape.classList.add('hidden');

            // Focus the search input
            actionInput.focus();
        } else {
            heroAction.classList.add('hidden');
            searchResults.classList.add('hidden');
            landscapeControls.classList.remove('hidden');
            statsBar.classList.remove('hidden');
            landscape.classList.remove('hidden');

            // Render landscape if not already
            renderLandscape();
            updateStats();
        }
    }

    // Handle search input
    function handleSearch(query) {
        searchQuery = query;

        if (query.trim() === '') {
            searchResults.classList.add('hidden');
            return;
        }

        searchResults.classList.remove('hidden');
        const results = searchByIntent(query);
        renderSearchResults(results);
    }

    // Render the landscape grid (browse mode)
    function renderLandscape() {
        landscape.innerHTML = '';

        const tracks = currentTrack === 'all'
            ? ['users', 'developers']
            : [currentTrack];

        tracks.forEach(track => {
            landscapeData[track].forEach(category => {
                const categoryEl = createCategoryElement(category, track);
                if (categoryEl) {
                    landscape.appendChild(categoryEl);
                }
            });
        });

        updateStats();
    }

    // Create a category element
    function createCategoryElement(category, track) {
        const filteredSubcategories = category.subcategories.map(sub => ({
            ...sub,
            tools: filterTools(sub.tools)
        })).filter(sub => sub.tools.length > 0);

        if (filteredSubcategories.length === 0) return null;

        const categoryEl = document.createElement('div');
        categoryEl.className = 'category collapsed';
        categoryEl.dataset.track = track;

        const toolCount = filteredSubcategories.reduce((sum, sub) => sum + sub.tools.length, 0);

        categoryEl.innerHTML = `
            <div class="category-header ${track}">
                <h2 class="category-title">
                    ${category.name}
                    <span class="category-count">${toolCount}</span>
                </h2>
                <svg class="category-toggle" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </div>
            <div class="category-content">
                ${filteredSubcategories.map(sub => createSubcategoryHTML(sub)).join('')}
            </div>
        `;

        // Add collapse toggle
        const header = categoryEl.querySelector('.category-header');
        header.addEventListener('click', () => {
            categoryEl.classList.toggle('collapsed');
        });

        return categoryEl;
    }

    // Create subcategory HTML
    function createSubcategoryHTML(subcategory) {
        return `
            <div class="subcategory">
                <h3 class="subcategory-title">${subcategory.name}</h3>
                <div class="tools-grid">
                    ${subcategory.tools.map(tool => createToolCardHTML(tool)).join('')}
                </div>
            </div>
        `;
    }

    // Create tool card HTML
    function createToolCardHTML(tool) {
        const initial = tool.name.charAt(0).toUpperCase();
        const badgeClass = `badge-${tool.type}`;
        const typeLabel = tool.type === 'oss' ? 'OSS' : tool.type === 'saas' ? 'SaaS' : 'Commercial';

        let domain = '';
        try {
            domain = new URL(tool.url).hostname.replace('www.', '');
        } catch (e) {
            domain = '';
        }

        const logoUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '';
        const stars = formatStars(tool.github_stars);
        const starsHtml = stars ? `<span class="stars-badge stars-badge-sm" title="${tool.github_stars.toLocaleString()} GitHub stars"><svg class="star-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z"/></svg>${stars}</span>` : '';

        return `
            <div class="tool-card"
                 data-name="${tool.name}"
                 data-url="${tool.url}"
                 data-desc="${tool.desc}"
                 data-type="${tool.type}"
                 data-stars="${tool.github_stars || ''}">
                <div class="tool-icon" data-initial="${initial}">
                    ${logoUrl ? `<img src="${logoUrl}" alt="${tool.name}" loading="lazy" onerror="this.parentElement.textContent=this.parentElement.dataset.initial">` : initial}
                </div>
                <div class="tool-name">${tool.name}</div>
                <div class="tool-badges">
                    ${starsHtml}
                    <span class="badge ${badgeClass}">${typeLabel}</span>
                </div>
            </div>
        `;
    }

    // Filter tools based on current state (for browse mode)
    function filterTools(tools) {
        return tools.filter(tool => {
            if (currentType !== 'all' && tool.type !== currentType) {
                return false;
            }
            return true;
        });
    }

    // Update stats display
    function updateStats() {
        let visibleCount = 0;
        let categoryCount = 0;

        const tracks = currentTrack === 'all'
            ? ['users', 'developers']
            : [currentTrack];

        tracks.forEach(track => {
            landscapeData[track].forEach(category => {
                let categoryHasTools = false;
                category.subcategories.forEach(sub => {
                    const filtered = filterTools(sub.tools);
                    visibleCount += filtered.length;
                    if (filtered.length > 0) categoryHasTools = true;
                });
                if (categoryHasTools) categoryCount++;
            });
        });

        visibleCountEl.textContent = visibleCount;
        categoryCountEl.textContent = categoryCount;
    }

    // Setup event listeners
    function setupEventListeners() {
        // Action mode search input
        let searchTimeout;
        actionInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                handleSearch(e.target.value.trim());
            }, 150);
        });

        // Quick action chips
        quickActionChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const query = chip.dataset.query;
                actionInput.value = query;
                handleSearch(query);
            });
        });

        // Clear search
        clearSearch.addEventListener('click', () => {
            actionInput.value = '';
            searchQuery = '';
            searchResults.classList.add('hidden');
            actionInput.focus();
        });

        // Browse toggle
        browseToggle.addEventListener('click', () => switchMode('browse'));

        // Back to search
        backToSearch.addEventListener('click', () => switchMode('action'));

        // Expand all categories
        expandAllBtn.addEventListener('click', () => {
            document.querySelectorAll('.category.collapsed').forEach(cat => {
                cat.classList.remove('collapsed');
            });
            // Switch to columns layout for dense packing
            landscape.classList.add('all-expanded');
        });

        // Collapse all categories
        collapseAllBtn.addEventListener('click', () => {
            document.querySelectorAll('.category:not(.collapsed)').forEach(cat => {
                cat.classList.add('collapsed');
            });
            // Switch back to flex layout for uniform boxes
            landscape.classList.remove('all-expanded');
        });

        // Track toggle (browse mode)
        trackButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                trackButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentTrack = btn.dataset.track;
                renderLandscape();
            });
        });

        // Type filter (browse mode)
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentType = btn.dataset.type;
                renderLandscape();
            });
        });

        // Result card click - open URL
        resultsGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.result-card');
            if (card) {
                const url = card.dataset.url;
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        });

        // Tool card click - open URL (browse mode)
        landscape.addEventListener('click', (e) => {
            const card = e.target.closest('.tool-card');
            if (card) {
                const url = card.dataset.url;
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        });

        // Tool card hover - show tooltip (browse mode)
        landscape.addEventListener('mouseover', (e) => {
            const card = e.target.closest('.tool-card');
            if (card) {
                showTooltip(card);
            }
        });

        landscape.addEventListener('mouseout', (e) => {
            const card = e.target.closest('.tool-card');
            if (card) {
                hideTooltip();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Focus search on '/' key
            if (e.key === '/' && document.activeElement !== actionInput) {
                e.preventDefault();
                if (currentMode !== 'action') {
                    switchMode('action');
                }
                actionInput.focus();
            }
            // Escape to clear search or go back
            if (e.key === 'Escape') {
                if (currentMode === 'browse') {
                    switchMode('action');
                } else {
                    actionInput.value = '';
                    searchQuery = '';
                    searchResults.classList.add('hidden');
                    actionInput.blur();
                }
            }
        });
    }

    // Show tooltip
    function showTooltip(card) {
        const name = card.dataset.name;
        const desc = card.dataset.desc;
        const stars = card.dataset.stars;
        const starsHtml = stars ? `<div class="tooltip-stars"><svg viewBox="0 0 16 16" fill="#e3b341" style="width:12px;height:12px;"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z"/></svg>${parseInt(stars).toLocaleString()} stars</div>` : '';

        tooltip.innerHTML = `
            <div class="tooltip-title">${name}</div>
            <div class="tooltip-desc">${desc}</div>
            ${starsHtml}
            <div class="tooltip-link">Click to visit</div>
        `;

        const rect = card.getBoundingClientRect();

        let left = rect.left + (rect.width / 2);
        let top = rect.bottom + 10;

        if (left + 150 > window.innerWidth) {
            left = window.innerWidth - 160;
        }
        if (left < 10) {
            left = 10;
        }
        if (top + 100 > window.innerHeight) {
            top = rect.top - 80;
        }

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.classList.add('visible');
    }

    // Hide tooltip
    function hideTooltip() {
        tooltip.classList.remove('visible');
    }
});
