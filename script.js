// // const YOUTUBE_API_KEY = "AIzaSyBOYFbe_C9RET02XfrdPTynEP_Vg_gHPw8";
// const PEXELS_API_KEY = "YmnLd7qyMnbqHLH2XsqfIpUBkCkkRcIxr3bmIixBhA4yrRKWjxsogYuV";
// const JAMENDO_CLIENT_ID = "ff65f083";
// // const YOUTUBE_API_KEY = "AIzaSyCS86l48a-RXk5qeG7zVmWhzK7cyFiOmmM";

/**
 * @file Manages a dynamic media gallery with content from APIs (Pexels, Jamendo, YouTube, Open Library) and user uploads.
 * @summary This script handles API fetching, infinite scrolling, search functionality, filtering, audio playback, and modal displays for a comprehensive media gallery.
 * @author Gemini
 */

// Wait for the entire HTML document to be fully loaded and parsed before running the script.
document.addEventListener("DOMContentLoaded", () => {

    // --- API Configuration ---
    // IMPORTANT: Replace these placeholder keys with your actual API keys.
    // Pexels for high-quality photos and videos.
    const PEXELS_API_KEY = "YmnLd7qyMnbqHLH2XsqfIpUBkCkkRcIxr3bmIixBhA4yrRKWjxsogYuV";
    // Jamendo for royalty-free music.
    const JAMENDO_CLIENT_ID = "ff65f083";
    // YouTube for a vast library of videos.
    const YOUTUBE_API_KEY = "AIzaSyCS86l48a-RXk5qeG7zVmWhzK7cyFiOmmM"; // Replace this with your key

    // --- DOM Element Selectors ---
    // Caching DOM elements for faster access and better performance.
    const mainHeader = document.querySelector("header");
    const gallerySection = document.getElementById("gallery");
    const toggleButtons = document.querySelectorAll(".toggle-btn");
    const mediaSections = document.querySelectorAll(".media-category");
    const mediaUpload = document.getElementById("media-upload");
    const searchInput = document.getElementById("media-search");
    const clearSearchBtn = document.getElementById("clear-search-btn");

    // Modal elements for displaying content in a popup view.
    const modal = document.getElementById("modal");
    const modalImage = document.getElementById("modal-image");
    const modalCaption = document.getElementById("modal-caption");
    const closeBtn = modal.querySelector(".close-btn");

    const audioModal = document.getElementById("audio-modal");
    const audioModalContent = document.getElementById("audio-modal-content");
    const audioCloseBtn = audioModal.querySelector(".close-btn");

    const bookModal = document.getElementById("book-modal");
    const bookModalContent = document.getElementById("book-modal-content");
    const bookCloseBtn = bookModal.querySelector(".close-btn");

    // Grid and loader elements for each media category.
    const allGrids = document.querySelectorAll(".media-grid");
    const mediaCollageGrid = document.getElementById("media-collage-grid");
    const imageLoader = document.querySelector("#images .loading-indicator");
    const audioGrid = document.querySelector(".audio-grid");
    const videoGrid = document.querySelector(".video-grid");
    const pdfGrid = document.querySelector(".pdf-grid");
    const audioLoader = document.querySelector("#audio .loading-indicator");
    const videoLoader = document.querySelector("#video .loading-indicator");
    const bookLoader = document.querySelector("#pdf .loading-indicator");

    // --- State Management ---
    // Variables to keep track of the application's state.
    let currentSearchQuery = 'random'; // The current term being searched for.
    let searchHistory = []; // Stores past search queries.
    let activeFilter = 'all'; // The currently active filter ('all', 'uploaded', or a search term).
    let pexelsPage = 1, audioPage = 1, bookPage = 1; // Pagination for API requests.
    let youtubePageToken = ''; // Token for YouTube API pagination.
    let isFetchingPexels = false, isFetchingAudio = false, isFetchingYouTube = false, isFetchingBooks = false; // Flags to prevent multiple simultaneous API requests.
    let loadedContent = { // Tracks which search queries have been loaded for each category.
        images: new Set(['random']),
        audio: new Set(),
        video: new Set(),
        pdf: new Set()
    };
    let currentlyPlayingAudio = null; // The audio element that is currently playing.
    let currentlyPlayingCard = null; // The audio card corresponding to the currently playing audio.

    // --- CORE EVENT LISTENERS ---
    // Attaching event listeners to various DOM elements to handle user interactions.

    // Handle file uploads when the user selects files.
    if (mediaUpload) mediaUpload.addEventListener("change", handleFileUpload);

    // Close the image modal when the close button is clicked.
    if (closeBtn) closeBtn.addEventListener("click", () => {
        if (modal) {
            modal.style.display = "none";
            modal.classList.remove('active');
        }
    });

    // Close the audio modal when the close button is clicked.
    if (audioCloseBtn) audioCloseBtn.addEventListener("click", () => {
        if (audioModal) {
            audioModal.style.display = "none";
            audioModal.classList.remove('active');
            // Dispatch a custom event to handle cleanup when the modal is closed.
            audioModal.dispatchEvent(new Event('close'));
        }
    });

    // Close the book modal when the close button is clicked.
    if (bookCloseBtn) bookCloseBtn.addEventListener("click", () => {
        if (bookModal) {
            bookModal.style.display = "none";
            bookModal.classList.remove('active');
        }
    });

    // Close modals if the user clicks outside of the modal content.
    window.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.style.display = "none";
            modal.classList.remove('active');
        }
        if (e.target === audioModal) {
            audioModal.style.display = "none";
            audioModal.classList.remove('active');
            audioModal.dispatchEvent(new Event('close'));
        }
        if (e.target === bookModal) {
            bookModal.style.display = "none";
            bookModal.classList.remove('active');
        }
    });

    // Adjust the sticky header offset on window resize.
    window.addEventListener('resize', setStickyTopOffset);
    // Handle scroll events to manage header and navigation visibility.
    window.addEventListener('scroll', handleScrollStateChange, { passive: true });

    // Handle search input interactions.
    if (searchInput) {
        // Execute search when the Enter key is pressed.
        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                executeSearch();
            }
        });
        // Show/hide the clear search button and reset view if input is cleared.
        searchInput.addEventListener('input', () => {
            const hasText = searchInput.value.length > 0;
            if (clearSearchBtn) clearSearchBtn.style.display = hasText ? 'flex' : 'none';
            if (!hasText && currentSearchQuery !== 'random') {
                resetToDefaultView();
            }
        });
    }

    // Clear the search input and reset the view when the clear button is clicked.
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearSearchBtn.style.display = 'none';
            searchInput.focus();
            resetToDefaultView();
        });
    }

    // Add click listeners to the main toggle buttons to switch between media sections.
    toggleButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const targetId = e.currentTarget.dataset.target;
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                showSection(targetId);
                // Smoothly scroll the selected section into view.
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // --- SCROLL, STICKY HEADER, AND NAVIGATION LOGIC ---

    /**
     * Sets a CSS custom property for the top offset of sticky elements,
     * based on the main header's height. This ensures sticky elements
     * appear below the header.
     */
    function setStickyTopOffset() {
        if (!mainHeader) return;
        const headerHeight = mainHeader.offsetHeight;
        document.documentElement.style.setProperty('--sticky-top-offset', `${headerHeight}px`);
    }

    // Observer to initially show the 'images' section when the gallery comes into view.
    const initialLoadObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // If no section is active, default to showing the 'images' section.
                if (!document.querySelector('.media-category.active')) {
                    showSection('images');
                }
                // Stop observing once the gallery is visible.
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.01 });

    /**
     * Manages the active state of toggle buttons based on the scroll position
     * relative to the gallery section. Also updates navigation button visibility.
     */
    function handleScrollStateChange() {
        if (!gallerySection || !mainHeader) return;
        const galleryRect = gallerySection.getBoundingClientRect();
        const headerHeight = mainHeader.offsetHeight;

        // Check if the gallery section is under the header.
        if (galleryRect.top <= headerHeight && galleryRect.bottom > headerHeight) {
            const currentActiveId = document.querySelector('.media-category.active')?.id || 'images';
            const activeButton = document.querySelector(`.toggle-btn[data-target="${currentActiveId}"]`);
            toggleButtons.forEach(btn => btn.classList.remove('active'));
            if (activeButton) activeButton.classList.add('active');
        } else {
            // If the gallery is not in the "active" scroll area, deactivate all toggle buttons.
            toggleButtons.forEach(btn => btn.classList.remove('active'));
        }
        // Update the visibility of the up/down scroll buttons within the active grid.
        updateNavButtonsVisibility();
    }

    /**
     * Attaches a single click event listener to the gallery section to handle
     * clicks on the "scroll to top" and "scroll to bottom" buttons within media grids.
     */
    function attachNavigationEventListeners() {
        gallerySection.addEventListener('click', function(event) {
            const upBtn = event.target.closest('.scroll-to-top-btn');
            const downBtn = event.target.closest('.scroll-to-bottom-btn');
            const grid = event.target.closest('.media-category')?.querySelector('.media-grid');

            if (upBtn && grid && grid.firstElementChild) {
                grid.firstElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            if (downBtn && grid && grid.lastElementChild) {
                grid.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
        });
    }

    /**
     * Shows or hides the scroll-to-top and scroll-to-bottom navigation buttons
     * based on the scroll position within the active media grid.
     */
    function updateNavButtonsVisibility() {
        const activeCategory = document.querySelector('.media-category.active');
        if (!activeCategory) return;

        const grid = activeCategory.querySelector('.media-grid');
        const upBtn = activeCategory.querySelector('.scroll-to-top-btn');
        const downBtn = activeCategory.querySelector('.scroll-to-bottom-btn');

        if (!grid || !upBtn || !downBtn) return;

        // Only show buttons if there's enough content to scroll.
        const hasEnoughContent = grid.children.length > 3;
        if (!hasEnoughContent) {
            upBtn.classList.remove('visible');
            downBtn.classList.remove('visible');
            return;
        }

        const firstItem = grid.firstElementChild;
        const lastItem = grid.lastElementChild;
        const headerHeight = mainHeader.offsetHeight;

        const firstItemRect = firstItem.getBoundingClientRect();
        // Show the "up" button if the first item is scrolled past the header.
        const isFirstItemScrolledPast = firstItemRect.bottom < headerHeight;
        upBtn.classList.toggle('visible', isFirstItemScrolledPast);

        const lastItemRect = lastItem.getBoundingClientRect();
        // Show the "down" button if the last item is not yet visible in the viewport.
        const isLastItemBelowViewport = lastItemRect.bottom > window.innerHeight;
        downBtn.classList.toggle('visible', isLastItemBelowViewport);
    }

    // --- AUDIO PLAYER LOGIC ---

    /**
     * Toggles play/pause for a given audio element. Pauses any other playing audio.
     * @param {HTMLAudioElement} audioElement - The audio element to play or pause.
     */
    function playPauseAudio(audioElement) {
        if (audioElement.paused) {
            // If another audio is playing, pause it first.
            if (currentlyPlayingAudio && currentlyPlayingAudio !== audioElement) {
                currentlyPlayingAudio.pause();
            }
            audioElement.play();
            currentlyPlayingAudio = audioElement; // Set the current audio.
            currentlyPlayingCard = audioElement.closest('.audio-card'); // Set the current card.
        } else {
            audioElement.pause();
        }
    }

    /**
     * Updates the play/pause button icon based on the audio element's state.
     * @param {HTMLAudioElement} audioElement - The audio element.
     * @param {HTMLElement} playBtn - The play/pause button element.
     */
    function updatePlayButtonIcon(audioElement, playBtn) {
        const icon = playBtn.querySelector('img');
        if (!icon) return;
        icon.src = audioElement.paused ? 'Images/play.svg' : 'Images/pause.svg';
        icon.alt = audioElement.paused ? 'Play' : 'Pause';
    }

    /**
     * Synchronizes the play/pause button icons across all audio cards and the audio modal
     * to reflect the current state of the audio player.
     */
    function syncAllPlayButtons() {
        // Sync buttons on all audio cards in the grid.
        document.querySelectorAll('.audio-card').forEach(card => {
            const btn = card.querySelector('.play-pause-btn');
            const audio = card.querySelector('audio');
            if (btn && audio) {
                updatePlayButtonIcon(audio, btn);
            }
        });

        // Sync the button in the audio modal if it's active.
        if (audioModal.classList.contains('active') && currentlyPlayingCard) {
            const modalBtn = audioModalContent.querySelector('.play-pause-btn');
            const cardAudio = currentlyPlayingCard.querySelector('audio');
            if (modalBtn && cardAudio) {
                updatePlayButtonIcon(cardAudio, modalBtn);
            }
        }
    }

    /**
     * Updates the width of the progress bar to reflect the current playback time.
     * @param {HTMLAudioElement} audioElement - The audio element.
     * @param {HTMLElement} progressBar - The progress bar element.
     */
    function updateProgressBar(audioElement, progressBar) {
        if (!audioElement.duration) return;
        const percentage = (audioElement.currentTime / audioElement.duration) * 100;
        progressBar.style.width = `${percentage}%`;
    }

    /**
     * Sets the audio playback position based on a click on the progress bar.
     * @param {HTMLAudioElement} audioElement - The audio element.
     * @param {HTMLElement} progressBarContainer - The container of the progress bar.
     * @param {MouseEvent} event - The click event.
     */
    function setAudioPosition(audioElement, progressBarContainer, event) {
        const width = progressBarContainer.clientWidth;
        const clickX = event.offsetX;
        const duration = audioElement.duration;
        if (duration) {
            audioElement.currentTime = (clickX / width) * duration;
        }
    }

    // --- TOGGLE & SECTION DISPLAY LOGIC ---

    /**
     * Shows a specific media section and hides others. Fetches content for the
     * section if it hasn't been loaded for the current query yet.
     * @param {string} targetId - The ID of the media section to show (e.g., 'images', 'audio').
     */
    function showSection(targetId) {
        // Deactivate all sections, then activate the target one.
        mediaSections.forEach(section => section.classList.remove('active'));
        const targetSection = document.getElementById(targetId);
        if (targetSection) targetSection.classList.add('active');

        // Update UI states.
        handleScrollStateChange();
        syncActiveFilter(targetId);

        // Determine the correct query for fetching content based on the active filter.
        const queryForFetch = (activeFilter === 'all' || activeFilter === 'uploaded') ? currentSearchQuery : activeFilter;

        // If content is already loaded or is from user uploads, no need to fetch.
        if (activeFilter === 'uploaded' || (loadedContent[targetId] && loadedContent[targetId].has(queryForFetch))) {
            return;
        }

        // Fetch content based on the target section ID.
        switch (targetId) {
            case 'images':
                fetchFromPexels(queryForFetch, 'images');
                break;
            case 'audio':
                fetchFromJamendo(queryForFetch);
                break;
            case 'video':
                fetchFromYouTube(queryForFetch);
                fetchFromPexels(queryForFetch, 'videos');
                break;
            case 'pdf':
                fetchFromOpenLibrary(queryForFetch);
                break;
        }
    }


    // --- FILTER LOGIC ---

    /**
     * Updates the visual state of filter buttons and filters the displayed media items
     * in the currently active section.
     * @param {string} currentSectionId - The ID of the currently active media section.
     */
    function syncActiveFilter(currentSectionId) {
        // Toggle 'active' class on filter buttons across all filter bars.
        document.querySelectorAll('.filter-bar').forEach(bar => {
            bar.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.filter === activeFilter);
            });
        });

        const activeGrid = document.querySelector(`#${currentSectionId} .media-grid`);
        if (!activeGrid) return;

        // Show or hide media items based on the active filter.
        activeGrid.querySelectorAll('.media-item').forEach(item => {
            let show = false;
            if (activeFilter === 'all') {
                show = true;
            } else if (activeFilter === 'uploaded') {
                show = item.dataset.source === 'uploaded';
            } else {
                // For search-based filters, show items matching that query.
                show = item.dataset.query === activeFilter;
            }
            // Use 'flex' for certain card types, 'block' for others.
            item.style.display = show ? (item.classList.contains('audio-card') || item.classList.contains('book-card') ? 'flex' : 'block') : 'none';
        });
    }

    /**
     * Loads search history from local storage.
     */
    function loadSearchHistory() {
        const storedHistory = localStorage.getItem('gallerySearchHistory');
        if (storedHistory) {
            searchHistory = JSON.parse(storedHistory);
        }
    }

    /**
     * Saves the current search history to local storage.
     */
    function saveSearchHistory() {
        localStorage.setItem('gallerySearchHistory', JSON.stringify(searchHistory));
    }

    /**
     * Adds a new search query to the history if it's not already present.
     * @param {string} query - The search query to add.
     */
    function addFilter(query) {
        query = query.toLowerCase().trim();
        if (query && !searchHistory.includes(query)) {
            searchHistory.push(query);
            saveSearchHistory();
            renderFilterBars(); // Re-render the filter bars to include the new filter.
        }
    }

    /**
     * Renders the filter buttons for each search query in the history.
     */
    function renderFilterBars() {
        document.querySelectorAll(".filter-bar").forEach(bar => {
            // Clear existing search filter buttons.
            bar.querySelectorAll('.filter-btn-wrapper').forEach(wrapper => wrapper.remove());
            // Create and append a new button for each query in the history.
            searchHistory.forEach(query => {
                const wrapper = document.createElement('div');
                wrapper.className = 'filter-btn-wrapper';
                const filterBtn = document.createElement('button');
                filterBtn.className = 'filter-btn';
                filterBtn.dataset.filter = query;
                filterBtn.dataset.filterType = 'search';
                filterBtn.textContent = query.charAt(0).toUpperCase() + query.slice(1);
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'filter-delete-btn';
                deleteBtn.innerHTML = '&times;';
                deleteBtn.dataset.query = query;
                wrapper.appendChild(filterBtn);
                wrapper.appendChild(deleteBtn);
                bar.appendChild(wrapper);
            });
        });
        // Attach event listeners to the newly created buttons.
        attachFilterEventListeners();
    }

    /**
     * Attaches click event listeners to all filter and delete-filter buttons.
     */
    function attachFilterEventListeners() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            // Remove any old listener before adding a new one to prevent duplicates.
            btn.removeEventListener('click', handleFilterClick);
            btn.addEventListener('click', handleFilterClick);
        });
        document.querySelectorAll('.filter-delete-btn').forEach(btn => {
            btn.removeEventListener('click', handleDeleteFilter);
            btn.addEventListener('click', handleDeleteFilter);
        });
    }

    /**
     * Handles the click event for deleting a filter.
     * @param {MouseEvent} event - The click event.
     */
    function handleDeleteFilter(event) {
        event.stopPropagation(); // Prevent the filter button's click event from firing.
        const queryToDelete = event.currentTarget.dataset.query;
        searchHistory = searchHistory.filter(q => q !== queryToDelete);
        saveSearchHistory();
        renderFilterBars();
        // Reset to the 'all' filter view.
        activeFilter = 'all';
        syncActiveFilter(document.querySelector('.media-category.active')?.id);
    }

    /**
     * Handles the click event for applying a filter.
     * @param {MouseEvent} event - The click event.
     */
    function handleFilterClick(event) {
        const clickedBtn = event.currentTarget;
        activeFilter = clickedBtn.dataset.filter;
        // The section is re-rendered with the new filter applied.
        const currentSectionId = clickedBtn.closest('.media-category').id;
        showSection(currentSectionId);
    }

    // --- SEARCH & RESET LOGIC ---

    /**
     * Executes a new search for the query in the search input.
     * It clears existing API-sourced content and fetches new data from all APIs.
     */
    async function executeSearch() {
        const query = searchInput.value.trim();
        if (!query) return;

        const activeSectionBeforeSearch = document.querySelector('.media-category.active')?.id || 'images';
        currentSearchQuery = query.toLowerCase();
        addFilter(currentSearchQuery);
        activeFilter = 'all'; // Reset filter to 'all' for new search results.

        // Reset state for the new search.
        loadedContent = { images: new Set(), audio: new Set(), video: new Set(), pdf: new Set() };
        resetAllPagesAndGrids();

        // Show loading indicators.
        imageLoader.textContent = "Searching...";
        audioLoader.textContent = "Searching...";
        videoLoader.textContent = "Searching...";
        bookLoader.textContent = "Searching...";
        [imageLoader, audioLoader, videoLoader, bookLoader].forEach(l => l.style.display = 'block');

        // Fetch from all APIs concurrently.
        await Promise.all([
            fetchFromPexels(query, 'both'),
            fetchFromJamendo(query),
            fetchFromYouTube(query),
            fetchFromOpenLibrary(query)
        ]);

        // Restore the view to the section that was active before the search.
        const targetSection = document.getElementById(activeSectionBeforeSearch);
        showSection(activeSectionBeforeSearch);

        if (targetSection) {
            targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    /**
     * Resets the gallery to its default view (random content).
     */
    function resetToDefaultView() {
        if (currentSearchQuery === 'random') return;
        currentSearchQuery = 'random';
        activeFilter = 'all';
        loadedContent = { images: new Set(['random']), audio: new Set(), video: new Set(), pdf: new Set() };
        resetAllPagesAndGrids();

        const activeSectionId = document.querySelector('.media-category.active')?.id;
        if (activeSectionId) {
            // Re-fetch default content for the currently active section.
            showSection(activeSectionId);
        }
    }

    /**
     * Resets pagination and clears API-sourced content from all grids.
     */
    function resetAllPagesAndGrids() {
        pexelsPage = 1;
        audioPage = 1;
        bookPage = 1;
        youtubePageToken = '';
        // Remove only items fetched from an API, keeping user-uploaded content.
        allGrids.forEach(grid => {
            grid.querySelectorAll('.media-item[data-source="api"]').forEach(item => item.remove());
        });
    }

    // --- UI HELPER & FILE HANDLING ---

    /**
     * Handles files selected by the user for upload.
     * @param {Event} event - The file input change event.
     */
    function handleFileUpload(event) {
        const files = event.target.files;
        for (const file of files) {
            // Display each selected file in the gallery.
            displayMedia({
                type: file.type,
                url: URL.createObjectURL(file),
                originalUrl: URL.createObjectURL(file),
                isUploaded: true,
                alt_description: file.name
            }, true);
        }
    }

    /**
     * Creates and appends a media item to the appropriate grid.
     * @param {object} media - The media object containing data like type, URL, etc.
     * @param {boolean} [isUploaded=false] - Flag indicating if the media is user-uploaded.
     */
    function displayMedia(media, isUploaded = false) {
        // Delegate to specialized functions for audio and book cards.
        if (media.type.startsWith("audio")) {
            displayAudioCard(media, isUploaded);
            return;
        }
        if (media.type === 'book') {
            displayBookCard(media);
            return;
        }

        const mediaItem = document.createElement("div");
        mediaItem.classList.add("media-item");
        mediaItem.dataset.source = isUploaded ? 'uploaded' : (media.source_api || 'api');
        mediaItem.dataset.query = isUploaded ? '' : currentSearchQuery;

        let targetGrid;
        // Determine the correct grid based on media type.
        if (media.type.startsWith("image")) {
            targetGrid = document.querySelector("#images .media-grid");
        } else if (media.type.startsWith("video")) {
            targetGrid = document.querySelector("#video .media-grid");
        } else if (media.type.includes("pdf")) {
            targetGrid = document.querySelector("#pdf .media-grid");
        }

        if (!targetGrid) return;

        // Create the specific element (img, video, iframe) for the media type.
        if (media.type.startsWith("image")) {
            const img = document.createElement("img");
            img.src = media.url;
            img.alt = media.alt_description || "Gallery Image";
            img.addEventListener("click", () => openImageModal(media));
            mediaItem.appendChild(img);
        } else if (media.type.startsWith("video")) {
            if (media.source_api === 'pexels') {
                const video = document.createElement('video');
                video.src = media.url;
                video.poster = media.poster;
                video.controls = true;
                video.loop = true;
                mediaItem.appendChild(video);
            } else { // Assumes YouTube
                const iframe = document.createElement("iframe");
                iframe.src = media.url;
                iframe.title = media.title || "Embedded Video";
                iframe.setAttribute("frameborder", "0");
                iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture");
                iframe.setAttribute("allowfullscreen", "");
                mediaItem.appendChild(iframe);
            }
        } else if (media.type.includes("pdf")) {
            const pdfLink = document.createElement("a");
            pdfLink.href = media.url;
            pdfLink.target = "_blank";
            pdfLink.innerHTML = `<div class="pdf-icon">📄</div><span class="pdf-link">View PDF</span>`;
            mediaItem.appendChild(pdfLink);
        }

        // Add a delete button for user-uploaded items.
        if (isUploaded) {
            const deleteBtn = document.createElement("button");
            deleteBtn.classList.add("delete-btn");
            deleteBtn.innerHTML = "×";
            deleteBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                mediaItem.remove();
            });
            mediaItem.appendChild(deleteBtn);
        }

        targetGrid.appendChild(mediaItem);
        // Update navigation buttons as the grid content has changed.
        updateNavButtonsVisibility();
    }


    /**
     * Creates and displays a card for an audio track.
     * @param {object} trackData - The data for the audio track.
     * @param {boolean} [isUploaded=false] - Whether the audio was uploaded by the user.
     */
    function displayAudioCard(trackData, isUploaded = false) {
        const audioItem = document.createElement("div");
        audioItem.className = "media-item audio-card";
        audioItem.id = `audio-card-${trackData.id || Date.now()}`;
        audioItem.dataset.source = isUploaded ? 'uploaded' : 'api';
        audioItem.dataset.query = isUploaded ? '' : currentSearchQuery;
        audioItem.style.display = 'flex';

        const placeholderImage = 'https://via.placeholder.com/300x300?text=Music';
        audioItem.innerHTML = `
        <img src="${trackData.image || placeholderImage}" alt="${trackData.name}" class="audio-card-image">
        <div class="audio-card-info">
            <h3 class="audio-card-title">${trackData.name || 'Unknown Track'}</h3>
            <p class="audio-card-artist">${trackData.artist_name || 'Unknown Artist'}</p>
            <div class="audio-player-controls">
                <button class="play-pause-btn"><img src="Images/play.svg" alt="Play"></button>
                <div class="progress-bar-container"><div class="progress-bar"></div></div>
            </div>
        </div>`;

        // Create an Audio object and attach it to the card (not visible).
        const audioElement = new Audio(trackData.audio || trackData.url);
        audioItem.appendChild(audioElement);

        // Get references to the interactive elements within the card.
        const playBtn = audioItem.querySelector('.play-pause-btn');
        const progressBarContainer = audioItem.querySelector('.progress-bar-container');
        const progressBar = audioItem.querySelector('.progress-bar');

        // Attach event listeners for audio controls.
        playBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card click event from firing.
            playPauseAudio(audioElement);
        });

        audioElement.addEventListener('play', syncAllPlayButtons);
        audioElement.addEventListener('pause', syncAllPlayButtons);
        audioElement.addEventListener('ended', syncAllPlayButtons);
        audioElement.addEventListener('timeupdate', () => updateProgressBar(audioElement, progressBar));

        progressBarContainer.addEventListener('click', (e) => {
            e.stopPropagation();
            setAudioPosition(audioElement, progressBarContainer, e);
        });

        // Open the audio modal when the card itself is clicked.
        audioItem.addEventListener('click', () => openAudioModal(trackData, audioItem.id));
        audioGrid.appendChild(audioItem);
        updateNavButtonsVisibility();
    }

    /**
     * Creates and displays a card for a book.
     * @param {object} bookData - The data for the book.
     */
    function displayBookCard(bookData) {
        const bookItem = document.createElement("div");
        bookItem.className = "media-item book-card";
        bookItem.dataset.source = 'api';
        bookItem.dataset.query = currentSearchQuery;
        bookItem.style.display = 'flex';

        const placeholderImage = 'https://via.placeholder.com/250x375?text=No+Cover';
        bookItem.innerHTML = `
            <img src="${bookData.imgSrc || placeholderImage}" alt="Cover of ${bookData.title}" class="book-card-image">
            <div class="book-card-info">
                <h3 class="book-card-title">${bookData.title || 'Unknown Title'}</h3>
                <p class="book-card-author">${bookData.author || 'Unknown Author'}</p>
            </div>`;

        // Open the book modal when the card is clicked.
        bookItem.addEventListener('click', () => openBookModal(bookData));

        pdfGrid.appendChild(bookItem);
        updateNavButtonsVisibility();
    }


    // --- MODAL FUNCTIONS ---

    /**
     * Opens the image modal and displays the selected image and its caption.
     * @param {object} mediaData - The data for the image to be displayed.
     */
    function openImageModal(mediaData) {
        if (!modal || !modalImage || !modalCaption) return;

        modalImage.src = mediaData.originalUrl || mediaData.url;
        modalCaption.textContent = mediaData.alt_description || '';

        modal.style.display = 'flex';
        // Use a short timeout to allow the display change to render before adding the transition class.
        setTimeout(() => modal.classList.add('active'), 10);
    }

    /**
     * Opens the audio modal and populates it with the selected track's details and controls.
     * @param {object} trackData - The data for the audio track.
     * @param {string} cardId - The ID of the audio card that was clicked.
     */
    function openAudioModal(trackData, cardId) {
        if (!audioModal) return;
        const originalCard = document.getElementById(cardId);
        if (!originalCard) return;
        const audioElement = originalCard.querySelector('audio');
        if (!audioElement) return;

        currentlyPlayingCard = originalCard; // Link the modal to the original card.

        const placeholderImage = 'https://via.placeholder.com/300x300?text=Music';
        // Populate the modal with the track's information and player controls.
        audioModalContent.innerHTML = `
        <img src="${trackData.image || placeholderImage}" alt="${trackData.name}" class="audio-card-image">
        <h3 class="audio-card-title">${trackData.name || 'Unknown Track'}</h3>
        <p class="audio-card-artist">${trackData.artist_name || 'Unknown Artist'}</p>
        <div class="audio-player-controls">
            <button class="play-pause-btn"><img src="Images/play.svg" alt="Play"></button>
            <div class="progress-bar-container"><div class="progress-bar"></div></div>
        </div>`;

        const playBtn = audioModalContent.querySelector('.play-pause-btn');
        const progressBarContainer = audioModalContent.querySelector('.progress-bar-container');
        const progressBar = audioModalContent.querySelector('.progress-bar');

        // The modal controls the audio element from the original card.
        playBtn.addEventListener('click', () => playPauseAudio(audioElement));

        // Create a listener for time updates to update the modal's progress bar.
        const timeUpdateListener = () => updateProgressBar(audioElement, progressBar);
        audioElement.addEventListener('timeupdate', timeUpdateListener);

        // Clean up the time update listener when the modal is closed to prevent memory leaks.
        audioModal.addEventListener('close', () => {
            audioElement.removeEventListener('timeupdate', timeUpdateListener);
            currentlyPlayingCard = null;
        }, { once: true });

        progressBarContainer.addEventListener('click', (e) => setAudioPosition(audioElement, progressBarContainer, e));

        syncAllPlayButtons(); // Ensure the modal's play button icon is correct on open.
        audioModal.style.display = 'flex';
        audioModal.classList.add('active');
    }

    /**
     * Opens the book modal and displays the book's details.
     * @param {object} bookData - The data for the book.
     */
    function openBookModal(bookData) {
        if (!bookModal) return;
        const placeholderImage = 'https://via.placeholder.com/250x375?text=No+Cover';

        // Clean up and format the book description.
        let descriptionHTML = '';
        if (bookData.description && bookData.description !== "No description available.") {
            const cleanDescription = bookData.description
                .replace(/\[\[.*?\]\]/g, '') // Remove wiki-style links
                .replace(/\(source:.*?\)|\{.*?\}|\[.*?\]/g, '') // Remove source notes
                .trim();

            descriptionHTML = `<div class="book-modal-description-container">
                                   <p class="book-modal-description">${cleanDescription}</p>
                               </div>`;
        }

        // Populate the modal with the book's details.
        bookModalContent.innerHTML = `
            <img src="${bookData.imgSrc || placeholderImage}" alt="Cover of ${bookData.title}" class="book-modal-image">
            <div class="book-modal-text-content">
                <h3 class="book-modal-title">${bookData.title || 'Unknown Title'}</h3>
                <p class="book-modal-author">by ${bookData.author || 'Unknown Author'}</p>
                ${descriptionHTML}
                <a href="${bookData.readLink}" target="_blank" class="read-btn">Read on Open Library</a>
            </div>
        `;
        bookModal.style.display = 'flex';
        bookModal.classList.add('active');
    }

    // --- API FETCH FUNCTIONS ---

    /**
     * Fetches images and/or videos from the Pexels API.
     * @param {string} [query='random'] - The search query.
     * @param {string} [type='both'] - The type of media to fetch ('images', 'videos', or 'both').
     */
    async function fetchFromPexels(query = 'random', type = 'both') {
        if (isFetchingPexels) return; // Prevent concurrent fetches.
        isFetchingPexels = true;

        // Use 'nature' as a default for random queries.
        const apiQuery = (query === 'random' || query === '') ? 'nature' : encodeURIComponent(query);
        const headers = { Authorization: PEXELS_API_KEY };

        try {
            const fetches = [];
            // Add fetch promises to the array based on the 'type' parameter.
            if (type === 'both' || type === 'images') {
                imageLoader.style.display = 'block';
                fetches.push(fetch(`https://api.pexels.com/v1/search?query=${apiQuery}&per_page=15&page=${pexelsPage}`, { headers }));
            }
            if (type === 'both' || type === 'videos') {
                videoLoader.style.display = 'block';
                fetches.push(fetch(`https://api.pexels.com/v1/videos/search?query=${apiQuery}&per_page=15&page=${pexelsPage}`, { headers }));
            }

            // Execute all fetch requests in parallel.
            const responses = await Promise.all(fetches);
            // Parse JSON for each successful response.
            const data = await Promise.all(responses.map(res => res.ok ? res.json() : Promise.reject(res.statusText)));

            let dataIndex = 0;
            // Process image data if requested.
            if (type === 'both' || type === 'images') {
                const imageData = data[dataIndex++];
                loadedContent.images.add(query); // Mark this query as loaded for images.
                if (imageData.photos.length === 0 && pexelsPage === 1) {
                    imageLoader.textContent = `No images found for "${query}"`;
                } else {
                    imageData.photos.forEach(photo => displayMedia({ type: "image/jpeg", url: photo.src.medium, originalUrl: photo.src.original, alt_description: photo.alt }));
                    imageLoader.style.display = 'none';
                }
            }

            // Process video data if requested.
            if (type === 'both' || type === 'videos') {
                const videoData = data[dataIndex];
                loadedContent.video.add(query); // Mark this query as loaded for videos.
                if (videoData.videos.length === 0 && pexelsPage === 1) {
                    // No message needed here, as YouTube might still return results.
                } else {
                    videoData.videos.forEach(video => {
                        // Find a standard definition video file.
                        const sdVideo = video.video_files.find(f => f.quality === 'sd');
                        if (sdVideo) {
                            displayMedia({ type: "video/mp4", source_api: 'pexels', url: sdVideo.link, poster: video.image });
                        }
                    });
                    videoLoader.style.display = 'none';
                }
            }
            // Increment page number for the next fetch.
            if (data.length > 0) {
                pexelsPage++;
            }

        } catch (error) {
            console.error("Error fetching from Pexels:", error);
            if (imageLoader) imageLoader.textContent = "Error loading images.";
            if (videoLoader) videoLoader.textContent = "Error loading videos.";
        } finally {
            isFetchingPexels = false; // Reset the flag.
            updateNavButtonsVisibility();
        }
    }


    /**
     * Fetches audio tracks from the Jamendo API.
     * @param {string} [query='random'] - The search query.
     */
    async function fetchFromJamendo(query = 'random') {
        if (isFetchingAudio) return;
        isFetchingAudio = true;
        audioLoader.style.display = 'block';
        const apiQuery = (query === 'random' || query === '') ? 'rock' : encodeURIComponent(query);
        const offset = (audioPage - 1) * 10;
        try {
            const response = await fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=jsonpretty&limit=10&offset=${offset}&search=${apiQuery}`);
            if (response.ok) {
                loadedContent.audio.add(query);
                const data = await response.json();
                if (data.results.length === 0) {
                    if (audioPage === 1) audioLoader.textContent = `No audio found for "${query}"`;
                    else audioLoader.style.display = 'none';
                } else {
                    data.results.forEach(track => displayMedia({ ...track, type: 'audio/mpeg' }));
                    audioPage++;
                    audioLoader.style.display = 'none';
                }
            } else {
                throw new Error(`HTTP Error: ${response.status}`);
            }
        } catch (error) {
            console.error("Error fetching from Jamendo:", error);
            audioLoader.textContent = "Error loading audio.";
        } finally {
            isFetchingAudio = false;
            updateNavButtonsVisibility();
        }
    }

    /**
     * Fetches videos from the YouTube Data API.
     * @param {string} [query='random'] - The search query.
     */
    async function fetchFromYouTube(query = 'random') {
        // Stop if already fetching or if there are no more pages.
        if (isFetchingYouTube || youtubePageToken === null) return;
        isFetchingYouTube = true;
        videoLoader.style.display = 'block';
        const apiQuery = (query === 'random' || query === '') ? 'short film' : encodeURIComponent(query);
        try {
            let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${apiQuery}&type=video&key=${YOUTUBE_API_KEY}&maxResults=9`;
            // Add page token for subsequent pages.
            if (youtubePageToken) url += `&pageToken=${youtubePageToken}`;
            const response = await fetch(url);
            if (response.ok) {
                loadedContent.video.add(query);
                const data = await response.json();
                // Store the token for the next page, or null if it's the last page.
                youtubePageToken = data.nextPageToken || null;
                if (!data.items || data.items.length === 0) {
                    // No message needed here.
                } else {
                    data.items.forEach(video => displayMedia({
                        id: video.id.videoId,
                        type: "video/youtube",
                        url: `https://www.youtube.com/embed/${video.id.videoId}`,
                        title: video.snippet.title
                    }));
                    videoLoader.style.display = 'none';
                }
            } else {
                throw new Error(`HTTP Error: ${response.statusText}`);
            }
        } catch (error) {
            console.error("Error fetching from YouTube:", error);
            videoLoader.textContent = "Error. Check API Key.";
        } finally {
            isFetchingYouTube = false;
            updateNavButtonsVisibility();
        }
    }

    /**
     * Fetches book data from the Open Library API.
     * @param {string} [query='random'] - The search query.
     */
    async function fetchFromOpenLibrary(query = 'random') {
        if (isFetchingBooks) return;
        isFetchingBooks = true;
        bookLoader.style.display = 'block';
        const apiQuery = (query === 'random' || query === '') ? 'classic literature' : encodeURIComponent(query);
        const offset = (bookPage - 1) * 10;
        try {
            // First, get a list of books matching the query.
            const response = await fetch(`https://openlibrary.org/search.json?q=${apiQuery}&limit=10&offset=${offset}`);
            if (response.ok) {
                loadedContent.pdf.add(query);
                const data = await response.json();
                if (data.docs.length === 0) {
                    if (bookPage === 1) bookLoader.textContent = `No books found for "${query}"`;
                    else bookLoader.style.display = 'none';
                } else {
                    // Then, fetch detailed information (including description) for each book.
                    const bookDetailPromises = data.docs
                        .filter(doc => doc.key)
                        .map(doc => fetch(`https://openlibrary.org${doc.key}.json`).then(res => res.ok ? res.json() : null).catch(() => null));
                    const bookDetails = await Promise.all(bookDetailPromises);

                    data.docs.forEach((doc, index) => {
                        const details = bookDetails[index];
                        let description = "No description available.";
                        if (details && details.description) {
                            // Description can be a string or an object with a 'value' property.
                            description = typeof details.description === 'string' ? details.description : details.description.value;
                        }
                        displayMedia({
                            id: doc.key,
                            type: 'book',
                            title: doc.title,
                            author: doc.author_name?.join(", ") || "Unknown",
                            imgSrc: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
                            readLink: `https://openlibrary.org${doc.key}`,
                            description: description
                        });
                    });
                    bookPage++;
                    bookLoader.style.display = 'none';
                }
            } else {
                throw new Error(`HTTP Error: ${response.status}`);
            }
        } catch (err) {
            console.error("Error fetching from Open Library:", err);
            bookLoader.textContent = "Error loading books.";
        } finally {
            isFetchingBooks = false;
            updateNavButtonsVisibility();
        }
    }


    // --- INFINITE SCROLL LOGIC ---
    // Add a scroll listener to the window to detect when the user is near the bottom of the page.
    window.addEventListener('scroll', () => {
        // Trigger fetch when the user is 500 pixels from the bottom.
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            const activeSection = document.querySelector('.media-category.active');
            if (!activeSection) return;

            // Determine the active filter and query to fetch more content for.
            const activeFilterInScroll = activeSection.querySelector('.filter-btn.active')?.dataset.filter || 'all';
            if (activeFilterInScroll === 'uploaded') return; // Don't fetch for uploaded filter.
            const queryToFetch = (activeFilterInScroll === 'all') ? currentSearchQuery : activeFilterInScroll;

            // Call the appropriate fetch function for the active section.
            switch (activeSection.id) {
                case 'images':
                    fetchFromPexels(queryToFetch, 'images');
                    break;
                case 'audio':
                    fetchFromJamendo(queryToFetch);
                    break;
                case 'video':
                    fetchFromYouTube(queryToFetch);
                    fetchFromPexels(queryToFetch, 'videos');
                    break;
                case 'pdf':
                    fetchFromOpenLibrary(queryToFetch);
                    break;
            }
        }
    }, { passive: true }); // Use passive listener for better scroll performance.

    // --- COLLAGE FUNCTIONS ---

    /**
     * Initializes the collage on the landing page by fetching a variety of media.
     */
    async function initializeCollage() {
        try {
            const collagePool = [];
            const NUMBER_OF_ITEMS_TO_SHOW = 12;

            // Fetch a small amount of data from all APIs simultaneously.
            const [pexelsImgRes, pexelsVidRes, jamendoRes, youtubeRes, openLibRes] = await Promise.all([
                fetch(`https://api.pexels.com/v1/search?query=art&per_page=10`, { headers: { Authorization: PEXELS_API_KEY } }),
                fetch(`https://api.pexels.com/v1/videos/search?query=nature&per_page=10`, { headers: { Authorization: PEXELS_API_KEY } }),
                fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=jsonpretty&limit=10&orderby=popularity_month`),
                fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=documentary&type=video&key=${YOUTUBE_API_KEY}&maxResults=10`),
                fetch(`https://openlibrary.org/search.json?q=adventure&limit=10`)
            ]);

            // Process responses and add media items to the collage pool.
            if (pexelsImgRes.ok) {
                const data = await pexelsImgRes.json();
                if (data.photos) data.photos.forEach(p => collagePool.push({ type: "image/jpeg", url: p.src.large, originalUrl: p.src.original, alt_description: p.alt }));
            }
            if (pexelsVidRes.ok) {
                const data = await pexelsVidRes.json();
                if (data.videos) data.videos.forEach(v => {
                    const sdVideo = v.video_files.find(f => f.quality === 'sd');
                    if (sdVideo) collagePool.push({ type: "video/mp4", source_api: 'pexels', url: sdVideo.link, poster: v.image });
                });
            }
            if (jamendoRes.ok) {
                const data = await jamendoRes.json();
                if (data.results) data.results.forEach(t => collagePool.push({ type: "audio/mpeg", url: t.audio, image: t.image, name: t.name, artist_name: t.artist_name }));
            }
            if (youtubeRes.ok) {
                const data = await youtubeRes.json();
                if (data.items) data.items.forEach(v => collagePool.push({ type: "video/youtube", url: `https://www.youtube.com/embed/${v.id.videoId}` }));
            }
            if (openLibRes.ok) {
                const data = await openLibRes.json();
                if (data.docs) data.docs.forEach(d => collagePool.push({ type: 'book', title: d.title, imgSrc: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : `https://via.placeholder.com/128x180?text=No+Image`, readLink: `https://openlibrary.org${d.key}` }));
            }

            // Shuffle the pool and take a slice to display in the collage.
            const shuffledPool = collagePool.sort(() => 0.5 - Math.random());
            const collageMediaItems = shuffledPool.slice(0, NUMBER_OF_ITEMS_TO_SHOW);
            shuffleAndDisplayCollage(collageMediaItems);
        } catch (error) {
            console.error("Failed to initialize collage:", error);
            if (mediaCollageGrid) mediaCollageGrid.innerHTML = '<p class="collage-loader">Could not load collage. Check API keys.</p>';
        }
    }


    /**
     * Creates a DOM element for a collage item.
     * @param {object} media - The media data for the collage item.
     * @returns {HTMLElement} The created collage item element.
     */
    function createCollageItemElement(media) {
        const collageItem = document.createElement("div");
        collageItem.classList.add("collage-item");

        // Create the appropriate media element based on type.
        if (media.type.startsWith("image")) {
            const img = document.createElement("img");
            img.src = media.url;
            img.alt = media.alt_description || "Collage Image";
            img.addEventListener("click", () => openImageModal(media));
            collageItem.appendChild(img);
        } else if (media.type.startsWith("audio")) {
            // Audio is represented by its cover image in the collage.
            const img = document.createElement("img");
            img.src = media.image || 'https://via.placeholder.com/300x300?text=Music';
            img.alt = media.name || "Collage Audio";
            collageItem.appendChild(img);
        } else if (media.type.startsWith("video")) {
            if (media.source_api === 'pexels') {
                // Autoplaying muted video for Pexels.
                const video = document.createElement('video');
                video.src = media.url;
                video.poster = media.poster;
                video.autoplay = true;
                video.loop = true;
                video.muted = true;
                collageItem.appendChild(video);
            } else { // YouTube
                const iframe = document.createElement("iframe");
                iframe.src = media.url;
                iframe.frameBorder = "0";
                iframe.allow = "fullscreen";
                collageItem.appendChild(iframe);
            }
        } else if (media.type === 'book') {
            const img = document.createElement("img");
            img.src = media.imgSrc;
            img.alt = media.title;
            collageItem.appendChild(img);
            // Make the book cover clickable, opening the read link in a new tab.
            collageItem.onclick = () => window.open(media.readLink, "_blank");
        }
        return collageItem;
    }

    /**
     * Clears the collage grid and populates it with new media items.
     * @param {Array<object>} collageMediaItems - An array of media items for the collage.
     */
    function shuffleAndDisplayCollage(collageMediaItems) {
        if (!mediaCollageGrid) return;
        mediaCollageGrid.innerHTML = '';
        if (!collageMediaItems || collageMediaItems.length === 0) {
            mediaCollageGrid.innerHTML = '<p class="collage-loader">Could not load collage preview.</p>';
        } else {
            collageMediaItems.forEach(media => {
                const collageElement = createCollageItemElement(media);
                mediaCollageGrid.appendChild(collageElement);
            });
        }
    }

    // --- INITIAL PAGE LOAD ---

    /**
     * Initializes the application by setting up initial states and event listeners.
     */
    function initializeApp() {
        setStickyTopOffset();
        loadSearchHistory();
        renderFilterBars();
        attachNavigationEventListeners();
        if (gallerySection) {
            // Start observing the gallery section to trigger the initial content load.
            initialLoadObserver.observe(gallerySection);
        }
        initializeCollage();
    }

    // Run the app initialization function.
    initializeApp();
});