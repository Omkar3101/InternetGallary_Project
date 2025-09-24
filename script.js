// // const YOUTUBE_API_KEY = "AIzaSyBOYFbe_C9RET02XfrdPTynEP_Vg_gHPw8";
// const PEXELS_API_KEY = "YmnLd7qyMnbqHLH2XsqfIpUBkCkkRcIxr3bmIixBhA4yrRKWjxsogYuV";
// const JAMENDO_CLIENT_ID = "ff65f083";
// // const YOUTUBE_API_KEY = "AIzaSyCS86l48a-RXk5qeG7zVmWhzK7cyFiOmmM";

document.addEventListener("DOMContentLoaded", () => {
    // API Keys - IMPORTANT: Replace with your actual YouTube API Key
    const PEXELS_API_KEY = "YmnLd7qyMnbqHLH2XsqfIpUBkCkkRcIxr3bmIixBhA4yrRKWjxsogYuV";
    const JAMENDO_CLIENT_ID = "ff65f083";
    const YOUTUBE_API_KEY = "AIzaSyCS86l48a-RXk5qeG7zVmWhzK7cyFiOmmM"; // Replace this with your key

    // --- DOM Element Selectors ---
    const mainHeader = document.querySelector("header");
    const gallerySection = document.getElementById("gallery");
    const toggleButtons = document.querySelectorAll(".toggle-btn");
    const mediaSections = document.querySelectorAll(".media-category");
    const mediaUpload = document.getElementById("media-upload");
    const modal = document.getElementById("modal");
    const modalImage = document.getElementById("modal-image");
    const modalCaption = document.getElementById("modal-caption");
    const closeBtn = modal.querySelector(".close-btn");
    const searchInput = document.getElementById("media-search");
    const clearSearchBtn = document.getElementById("clear-search-btn");
    const audioModal = document.getElementById("audio-modal");
    const audioModalContent = document.getElementById("audio-modal-content");
    const audioCloseBtn = audioModal.querySelector(".close-btn");
    const bookModal = document.getElementById("book-modal");
    const bookModalContent = document.getElementById("book-modal-content");
    const bookCloseBtn = bookModal.querySelector(".close-btn");


    // Grids & Loaders
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
    let currentSearchQuery = 'random';
    let searchHistory = [];
    let activeFilter = 'all';
    let pexelsPage = 1, audioPage = 1, bookPage = 1;
    let youtubePageToken = '';
    let isFetchingPexels = false, isFetchingAudio = false, isFetchingYouTube = false, isFetchingBooks = false;
    let loadedContent = {
        images: new Set(['random']), audio: new Set(), video: new Set(), pdf: new Set()
    };
    let currentlyPlayingAudio = null;
    let currentlyPlayingCard = null;

    // --- CORE EVENT LISTENERS ---
    if (mediaUpload) mediaUpload.addEventListener("change", handleFileUpload);
    if (closeBtn) closeBtn.addEventListener("click", () => {
        if (modal) {
            modal.style.display = "none";
            modal.classList.remove('active');
        }
    });
    if (audioCloseBtn) audioCloseBtn.addEventListener("click", () => {
        if (audioModal) {
            audioModal.style.display = "none";
            audioModal.classList.remove('active');
            audioModal.dispatchEvent(new Event('close'));
        }
    });
    if (bookCloseBtn) bookCloseBtn.addEventListener("click", () => {
        if (bookModal) {
            bookModal.style.display = "none";
            bookModal.classList.remove('active');
        }
    });

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
    window.addEventListener('resize', setStickyTopOffset);
    window.addEventListener('scroll', handleScrollStateChange, { passive: true });

    if (searchInput) {
        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') { event.preventDefault(); executeSearch(); }
        });
        searchInput.addEventListener('input', () => {
            const hasText = searchInput.value.length > 0;
            if (clearSearchBtn) clearSearchBtn.style.display = hasText ? 'flex' : 'none';
            if (!hasText && currentSearchQuery !== 'random') {
                resetToDefaultView();
            }
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearSearchBtn.style.display = 'none';
            searchInput.focus();
            resetToDefaultView();
        });
    }

    toggleButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const targetId = e.currentTarget.dataset.target;
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                showSection(targetId);
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // --- SCROLL, STICKY HEADER, AND NAVIGATION LOGIC ---
    function setStickyTopOffset() {
        if (!mainHeader) return;
        const headerHeight = mainHeader.offsetHeight;
        document.documentElement.style.setProperty('--sticky-top-offset', `${headerHeight}px`);
    }

    const initialLoadObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (!document.querySelector('.media-category.active')) {
                    showSection('images');
                }
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.01 });

    function handleScrollStateChange() {
        if (!gallerySection || !mainHeader) return;
        const galleryRect = gallerySection.getBoundingClientRect();
        const headerHeight = mainHeader.offsetHeight;

        if (galleryRect.top <= headerHeight && galleryRect.bottom > headerHeight) {
            const currentActiveId = document.querySelector('.media-category.active')?.id || 'images';
            const activeButton = document.querySelector(`.toggle-btn[data-target="${currentActiveId}"]`);
            toggleButtons.forEach(btn => btn.classList.remove('active'));
            if (activeButton) activeButton.classList.add('active');
        } else {
            toggleButtons.forEach(btn => btn.classList.remove('active'));
        }
        updateNavButtonsVisibility();
    }

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

    function updateNavButtonsVisibility() {
        const activeCategory = document.querySelector('.media-category.active');
        if (!activeCategory) return;
    
        const grid = activeCategory.querySelector('.media-grid');
        const upBtn = activeCategory.querySelector('.scroll-to-top-btn');
        const downBtn = activeCategory.querySelector('.scroll-to-bottom-btn');
    
        if (!grid || !upBtn || !downBtn) return;
    
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
        const isFirstItemScrolledPast = firstItemRect.bottom < headerHeight;
        upBtn.classList.toggle('visible', isFirstItemScrolledPast);
    
        const lastItemRect = lastItem.getBoundingClientRect();
        const isLastItemBelowViewport = lastItemRect.bottom > window.innerHeight;
        downBtn.classList.toggle('visible', isLastItemBelowViewport);
    }

    // --- AUDIO PLAYER LOGIC ---
    function playPauseAudio(audioElement) {
        if (audioElement.paused) {
            if (currentlyPlayingAudio && currentlyPlayingAudio !== audioElement) {
                currentlyPlayingAudio.pause();
            }
            audioElement.play();
            currentlyPlayingAudio = audioElement;
            currentlyPlayingCard = audioElement.closest('.audio-card');
        } else {
            audioElement.pause();
        }
    }

    function updatePlayButtonIcon(audioElement, playBtn) {
        const icon = playBtn.querySelector('img');
        if (!icon) return;
        icon.src = audioElement.paused ? 'Images/play.svg' : 'Images/pause.svg';
        icon.alt = audioElement.paused ? 'Play' : 'Pause';
    }

    function syncAllPlayButtons() {
        document.querySelectorAll('.audio-card').forEach(card => {
            const btn = card.querySelector('.play-pause-btn');
            const audio = card.querySelector('audio');
            if (btn && audio) {
                updatePlayButtonIcon(audio, btn);
            }
        });

        if (audioModal.classList.contains('active') && currentlyPlayingCard) {
            const modalBtn = audioModalContent.querySelector('.play-pause-btn');
            const cardAudio = currentlyPlayingCard.querySelector('audio');
            if (modalBtn && cardAudio) {
                updatePlayButtonIcon(cardAudio, modalBtn);
            }
        }
    }

    function updateProgressBar(audioElement, progressBar) {
        if (!audioElement.duration) return;
        const percentage = (audioElement.currentTime / audioElement.duration) * 100;
        progressBar.style.width = `${percentage}%`;
    }

    function setAudioPosition(audioElement, progressBarContainer, event) {
        const width = progressBarContainer.clientWidth;
        const clickX = event.offsetX;
        const duration = audioElement.duration;
        if (duration) {
            audioElement.currentTime = (clickX / width) * duration;
        }
    }
    
    // --- TOGGLE & SECTION DISPLAY LOGIC ---
    function showSection(targetId) {
        mediaSections.forEach(section => section.classList.remove('active'));
        const targetSection = document.getElementById(targetId);
        if (targetSection) targetSection.classList.add('active');
        handleScrollStateChange();
        syncActiveFilter(targetId);

        const queryForFetch = (activeFilter === 'all' || activeFilter === 'uploaded') ? currentSearchQuery : activeFilter;

        if (activeFilter === 'uploaded' || (loadedContent[targetId] && loadedContent[targetId].has(queryForFetch))) {
            return;
        }

        switch (targetId) {
            case 'images': fetchFromPexels(queryForFetch, 'images'); break;
            case 'audio': fetchFromJamendo(queryForFetch); break;
            case 'video':
                fetchFromYouTube(queryForFetch);
                fetchFromPexels(queryForFetch, 'videos');
                break;
            case 'pdf': fetchFromOpenLibrary(queryForFetch); break;
        }
    }

    // --- FILTER LOGIC ---
    function syncActiveFilter(currentSectionId) {
        document.querySelectorAll('.filter-bar').forEach(bar => {
            bar.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.filter === activeFilter);
            });
        });

        const activeGrid = document.querySelector(`#${currentSectionId} .media-grid`);
        if (!activeGrid) return;

        activeGrid.querySelectorAll('.media-item').forEach(item => {
            let show = false;
            if (activeFilter === 'all') {
                show = true;
            } else if (activeFilter === 'uploaded') {
                show = item.dataset.source === 'uploaded';
            } else {
                show = item.dataset.query === activeFilter;
            }
            item.style.display = show ? (item.classList.contains('audio-card') || item.classList.contains('book-card') ? 'flex' : 'block') : 'none';
        });
    }

    function loadSearchHistory() {
        const storedHistory = localStorage.getItem('gallerySearchHistory');
        if (storedHistory) {
            searchHistory = JSON.parse(storedHistory);
        }
    }

    function saveSearchHistory() {
        localStorage.setItem('gallerySearchHistory', JSON.stringify(searchHistory));
    }

    function addFilter(query) {
        query = query.toLowerCase().trim();
        if (query && !searchHistory.includes(query)) {
            searchHistory.push(query);
            saveSearchHistory();
            renderFilterBars();
        }
    }

    function renderFilterBars() {
        document.querySelectorAll(".filter-bar").forEach(bar => {
            bar.querySelectorAll('.filter-btn-wrapper').forEach(wrapper => wrapper.remove());
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
        attachFilterEventListeners();
    }

    function attachFilterEventListeners() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.removeEventListener('click', handleFilterClick);
            btn.addEventListener('click', handleFilterClick);
        });
        document.querySelectorAll('.filter-delete-btn').forEach(btn => {
            btn.removeEventListener('click', handleDeleteFilter);
            btn.addEventListener('click', handleDeleteFilter);
        });
    }

    function handleDeleteFilter(event) {
        event.stopPropagation();
        const queryToDelete = event.currentTarget.dataset.query;
        searchHistory = searchHistory.filter(q => q !== queryToDelete);
        saveSearchHistory();
        renderFilterBars();
        activeFilter = 'all';
        syncActiveFilter(document.querySelector('.media-category.active')?.id);
    }

    function handleFilterClick(event) {
        const clickedBtn = event.currentTarget;
        activeFilter = clickedBtn.dataset.filter;
        const currentSectionId = clickedBtn.closest('.media-category').id;
        showSection(currentSectionId);
    }

    // --- SEARCH & RESET LOGIC ---
    async function executeSearch() {
        const query = searchInput.value.trim();
        if (!query) return;

        const activeSectionBeforeSearch = document.querySelector('.media-category.active')?.id || 'images';
        currentSearchQuery = query.toLowerCase();
        addFilter(currentSearchQuery);
        activeFilter = 'all';

        loadedContent = { images: new Set(), audio: new Set(), video: new Set(), pdf: new Set() };
        resetAllPagesAndGrids();
        
        imageLoader.textContent = "Searching..."; audioLoader.textContent = "Searching...";
        videoLoader.textContent = "Searching..."; bookLoader.textContent = "Searching...";
        [imageLoader, audioLoader, videoLoader, bookLoader].forEach(l => l.style.display = 'block');

        await Promise.all([
            fetchFromPexels(query, 'both'),
            fetchFromJamendo(query),
            fetchFromYouTube(query),
            fetchFromOpenLibrary(query)
        ]);
        
        const targetSection = document.getElementById(activeSectionBeforeSearch);
        showSection(activeSectionBeforeSearch);
        
        if (targetSection) {
            targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function resetToDefaultView() {
        if (currentSearchQuery === 'random') return;
        currentSearchQuery = 'random';
        activeFilter = 'all';
        loadedContent = { images: new Set(['random']), audio: new Set(), video: new Set(), pdf: new Set() };
        resetAllPagesAndGrids();
        
        const activeSectionId = document.querySelector('.media-category.active')?.id;
        if (activeSectionId) {
            showSection(activeSectionId);
        }
    }

    function resetAllPagesAndGrids() {
        pexelsPage = 1; audioPage = 1; bookPage = 1; youtubePageToken = '';
        allGrids.forEach(grid => {
            grid.querySelectorAll('.media-item[data-source="api"]').forEach(item => item.remove());
        });
    }

    // --- UI HELPER & FILE HANDLING ---
    function handleFileUpload(event) {
        const files = event.target.files;
        for (const file of files) {
            displayMedia({
                type: file.type, url: URL.createObjectURL(file),
                originalUrl: URL.createObjectURL(file), isUploaded: true,
                alt_description: file.name
            }, true);
        }
    }

    function displayMedia(media, isUploaded = false) {
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

        if (media.type.startsWith("image")) {
            targetGrid = document.querySelector("#images .media-grid");
        } else if (media.type.startsWith("video")) {
            targetGrid = document.querySelector("#video .media-grid");
        } else if (media.type.includes("pdf")) {
            targetGrid = document.querySelector("#pdf .media-grid");
        }
        
        if (!targetGrid) return;

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
            } else {
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
        updateNavButtonsVisibility();
    }

    function displayAudioCard(trackData, isUploaded = false) {
        const audioItem = document.createElement("div");
        audioItem.className = "media-item audio-card";
        audioItem.id = `audio-card-${trackData.id || Date.now()}`;
        audioItem.dataset.source = isUploaded ? 'uploaded' : 'api';
        audioItem.dataset.query = isUploaded ? '' : currentSearchQuery;
        audioItem.style.display = 'flex';

        const placeholderImage = 'https://via.placeholder.com/300x300?text=Music';
        audioItem.innerHTML = `<img src="${trackData.image || placeholderImage}" alt="${trackData.name}" class="audio-card-image"><div class="audio-card-info"><h3 class="audio-card-title">${trackData.name || 'Unknown Track'}</h3><p class="audio-card-artist">${trackData.artist_name || 'Unknown Artist'}</p><div class="audio-player-controls"><button class="play-pause-btn"><img src="Images/play.svg" alt="Play"></button><div class="progress-bar-container"><div class="progress-bar"></div></div></div></div>`;
        
        const audioElement = new Audio(trackData.audio || trackData.url);
        audioItem.appendChild(audioElement);

        const playBtn = audioItem.querySelector('.play-pause-btn');
        const progressBarContainer = audioItem.querySelector('.progress-bar-container');
        const progressBar = audioItem.querySelector('.progress-bar');
        
        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
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

        audioItem.addEventListener('click', () => openAudioModal(trackData, audioItem.id));
        audioGrid.appendChild(audioItem);
        updateNavButtonsVisibility();
    }
    
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
        
        bookItem.addEventListener('click', () => openBookModal(bookData));

        pdfGrid.appendChild(bookItem);
        updateNavButtonsVisibility();
    }

    // --- MODAL FUNCTIONS ---

    function openImageModal(mediaData) {
        if (!modal || !modalImage || !modalCaption) return;
        
        modalImage.src = mediaData.originalUrl || mediaData.url;
        modalCaption.textContent = mediaData.alt_description || '';

        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }

    function openAudioModal(trackData, cardId) {
        if (!audioModal) return;
        const originalCard = document.getElementById(cardId);
        if (!originalCard) return;
        const audioElement = originalCard.querySelector('audio');
        if (!audioElement) return;

        currentlyPlayingCard = originalCard;

        const placeholderImage = 'https://via.placeholder.com/300x300?text=Music';
        audioModalContent.innerHTML = `<img src="${trackData.image || placeholderImage}" alt="${trackData.name}" class="audio-card-image"><h3 class="audio-card-title">${trackData.name || 'Unknown Track'}</h3><p class="audio-card-artist">${trackData.artist_name || 'Unknown Artist'}</p><div class="audio-player-controls"><button class="play-pause-btn"><img src="Images/play.svg" alt="Play"></button><div class="progress-bar-container"><div class="progress-bar"></div></div></div>`;
        
        const playBtn = audioModalContent.querySelector('.play-pause-btn');
        const progressBarContainer = audioModalContent.querySelector('.progress-bar-container');
        const progressBar = audioModalContent.querySelector('.progress-bar');

        playBtn.addEventListener('click', () => playPauseAudio(audioElement));
        
        const timeUpdateListener = () => updateProgressBar(audioElement, progressBar);
        audioElement.addEventListener('timeupdate', timeUpdateListener);

        audioModal.addEventListener('close', () => {
            audioElement.removeEventListener('timeupdate', timeUpdateListener);
            currentlyPlayingCard = null;
        }, { once: true });

        progressBarContainer.addEventListener('click', (e) => setAudioPosition(audioElement, progressBarContainer, e));

        syncAllPlayButtons();
        audioModal.style.display = 'flex';
        audioModal.classList.add('active');
    }

    function openBookModal(bookData) {
        if (!bookModal) return;
        const placeholderImage = 'https://via.placeholder.com/250x375?text=No+Cover';

        let descriptionHTML = '';
        if (bookData.description && bookData.description !== "No description available.") {
            const cleanDescription = bookData.description
                .replace(/\[\[.*?\]\]/g, '')
                .replace(/\(source:.*?\)|\{.*?\}|\[.*?\]/g, '')
                .trim();

            descriptionHTML = `<div class="book-modal-description-container">
                                   <p class="book-modal-description">${cleanDescription}</p>
                               </div>`;
        }

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
    
    async function fetchFromPexels(query = 'random', type = 'both') {
        if (isFetchingPexels) return;
        isFetchingPexels = true;
        
        const apiQuery = (query === 'random' || query === '') ? 'nature' : encodeURIComponent(query);
        const headers = { Authorization: PEXELS_API_KEY };

        try {
            const fetches = [];
            if (type === 'both' || type === 'images') {
                imageLoader.style.display = 'block';
                fetches.push(fetch(`https://api.pexels.com/v1/search?query=${apiQuery}&per_page=15&page=${pexelsPage}`, { headers }));
            }
            if (type === 'both' || type === 'videos') {
                videoLoader.style.display = 'block';
                fetches.push(fetch(`https://api.pexels.com/v1/videos/search?query=${apiQuery}&per_page=15&page=${pexelsPage}`, { headers }));
            }

            const responses = await Promise.all(fetches);
            const data = await Promise.all(responses.map(res => res.ok ? res.json() : Promise.reject(res.statusText)));
            
            let dataIndex = 0;
            if (type === 'both' || type === 'images') {
                const imageData = data[dataIndex++];
                loadedContent.images.add(query);
                if (imageData.photos.length === 0 && pexelsPage === 1) {
                    imageLoader.textContent = `No images found for "${query}"`;
                } else {
                    imageData.photos.forEach(photo => displayMedia({ type: "image/jpeg", url: photo.src.medium, originalUrl: photo.src.original, alt_description: photo.alt }));
                    imageLoader.style.display = 'none';
                }
            }

            if (type === 'both' || type === 'videos') {
                const videoData = data[dataIndex];
                loadedContent.video.add(query);
                if (videoData.videos.length === 0 && pexelsPage === 1) {
                    // No message needed here
                } else {
                    videoData.videos.forEach(video => {
                        const sdVideo = video.video_files.find(f => f.quality === 'sd');
                        if (sdVideo) {
                            displayMedia({ type: "video/mp4", source_api: 'pexels', url: sdVideo.link, poster: video.image });
                        }
                    });
                    videoLoader.style.display = 'none';
                }
            }

            if (data.length > 0) {
                 pexelsPage++;
            }

        } catch (error) {
            console.error("Error fetching from Pexels:", error);
            if(imageLoader) imageLoader.textContent = "Error loading images.";
            if(videoLoader) videoLoader.textContent = "Error loading videos.";
        } finally {
            isFetchingPexels = false;
            updateNavButtonsVisibility();
        }
    }


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
            } else { throw new Error(`HTTP Error: ${response.status}`); }
        } catch (error) {
            console.error("Error fetching from Jamendo:", error);
            audioLoader.textContent = "Error loading audio.";
        } finally {
            isFetchingAudio = false;
            updateNavButtonsVisibility();
        }
    }

    async function fetchFromYouTube(query = 'random') {
        if (isFetchingYouTube || youtubePageToken === null) return;
        isFetchingYouTube = true;
        videoLoader.style.display = 'block';
        const apiQuery = (query === 'random' || query === '') ? 'short film' : encodeURIComponent(query);
        try {
            let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${apiQuery}&type=video&key=${YOUTUBE_API_KEY}&maxResults=9`;
            if (youtubePageToken) url += `&pageToken=${youtubePageToken}`;
            const response = await fetch(url);
            if (response.ok) {
                loadedContent.video.add(query);
                const data = await response.json();
                youtubePageToken = data.nextPageToken || null;
                if (!data.items || data.items.length === 0) {
                    // No message needed here
                } else {
                    data.items.forEach(video => displayMedia({ id: video.id.videoId, type: "video/youtube", url: `https://www.youtube.com/embed/${video.id.videoId}`, title: video.snippet.title }));
                    videoLoader.style.display = 'none';
                }
            } else { throw new Error(`HTTP Error: ${response.statusText}`); }
        } catch (error) {
            console.error("Error fetching from YouTube:", error);
            videoLoader.textContent = "Error. Check API Key.";
        } finally {
            isFetchingYouTube = false;
            updateNavButtonsVisibility();
        }
    }

    async function fetchFromOpenLibrary(query = 'random') {
        if (isFetchingBooks) return;
        isFetchingBooks = true;
        bookLoader.style.display = 'block';
        const apiQuery = (query === 'random' || query === '') ? 'classic literature' : encodeURIComponent(query);
        const offset = (bookPage - 1) * 10;
        try {
            const response = await fetch(`https://openlibrary.org/search.json?q=${apiQuery}&limit=10&offset=${offset}`);
            if (response.ok) {
                loadedContent.pdf.add(query);
                const data = await response.json();
                if (data.docs.length === 0) {
                    if (bookPage === 1) bookLoader.textContent = `No books found for "${query}"`;
                    else bookLoader.style.display = 'none';
                } else {
                    const bookDetailPromises = data.docs
                        .filter(doc => doc.key)
                        .map(doc => fetch(`https://openlibrary.org${doc.key}.json`).then(res => res.ok ? res.json() : null).catch(() => null));
                    const bookDetails = await Promise.all(bookDetailPromises);
                    data.docs.forEach((doc, index) => {
                        const details = bookDetails[index];
                        let description = "No description available.";
                        if (details && details.description) {
                            description = typeof details.description === 'string' ? details.description : details.description.value;
                        }
                        displayMedia({ id: doc.key, type: 'book', title: doc.title, author: doc.author_name?.join(", ") || "Unknown", imgSrc: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null, readLink: `https://openlibrary.org${doc.key}`, description: description });
                    });
                    bookPage++;
                    bookLoader.style.display = 'none';
                }
            } else { throw new Error(`HTTP Error: ${response.status}`); }
        } catch (err) {
            console.error("Error fetching from Open Library:", err);
            bookLoader.textContent = "Error loading books.";
        } finally {
            isFetchingBooks = false;
            updateNavButtonsVisibility();
        }
    }


    // --- INFINITE SCROLL LOGIC ---
    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            const activeSection = document.querySelector('.media-category.active');
            if (!activeSection) return;
            const activeFilterInScroll = activeSection.querySelector('.filter-btn.active')?.dataset.filter || 'all';
            if (activeFilterInScroll === 'uploaded') return;
            const queryToFetch = (activeFilterInScroll === 'all') ? currentSearchQuery : activeFilterInScroll;
            
            switch (activeSection.id) {
                case 'images': fetchFromPexels(queryToFetch, 'images'); break;
                case 'audio': fetchFromJamendo(queryToFetch); break;
                case 'video':
                    fetchFromYouTube(queryToFetch);
                    fetchFromPexels(queryToFetch, 'videos');
                    break;
                case 'pdf': fetchFromOpenLibrary(queryToFetch); break;
            }
        }
    }, { passive: true });

    // --- COLLAGE FUNCTIONS ---
    async function initializeCollage() {
        try {
            const collagePool = [];
            const NUMBER_OF_ITEMS_TO_SHOW = 12;
            const [pexelsImgRes, pexelsVidRes, jamendoRes, youtubeRes, openLibRes] = await Promise.all([
                fetch(`https://api.pexels.com/v1/search?query=art&per_page=10`, { headers: { Authorization: PEXELS_API_KEY } }),
                fetch(`https://api.pexels.com/v1/videos/search?query=nature&per_page=10`, { headers: { Authorization: PEXELS_API_KEY } }),
                fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=jsonpretty&limit=10&orderby=popularity_month`),
                fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=documentary&type=video&key=${YOUTUBE_API_KEY}&maxResults=10`),
                fetch(`https://openlibrary.org/search.json?q=adventure&limit=10`)
            ]);
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
            const shuffledPool = collagePool.sort(() => 0.5 - Math.random());
            const collageMediaItems = shuffledPool.slice(0, NUMBER_OF_ITEMS_TO_SHOW);
            shuffleAndDisplayCollage(collageMediaItems);
        } catch (error) {
            console.error("Failed to initialize collage:", error);
            if (mediaCollageGrid) mediaCollageGrid.innerHTML = '<p class="collage-loader">Could not load collage. Check API keys.</p>';
        }
    }

    function createCollageItemElement(media) {
        const collageItem = document.createElement("div");
        collageItem.classList.add("collage-item");
        if (media.type.startsWith("image")) {
            const img = document.createElement("img");
            img.src = media.url;
            img.alt = media.alt_description || "Collage Image";
            img.addEventListener("click", () => openImageModal(media));
            collageItem.appendChild(img);
        } else if (media.type.startsWith("audio")) {
            const audio = document.createElement("audio");
            audio.controls = true;
            audio.src = media.url;
            collageItem.appendChild(audio);
        } else if (media.type.startsWith("video")) {
            if (media.source_api === 'pexels') {
                const video = document.createElement('video');
                video.src = media.url;
                video.poster = media.poster;
                video.autoplay = true;
                video.loop = true;
                video.muted = true;
                collageItem.appendChild(video);
            } else {
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
            collageItem.onclick = () => window.open(media.readLink, "_blank");
        }
        return collageItem;
    }

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
    function initializeApp() {
        setStickyTopOffset();
        loadSearchHistory();
        renderFilterBars();
        attachNavigationEventListeners();
        if (gallerySection) {
            initialLoadObserver.observe(gallerySection);
        }
        initializeCollage();
    }

    initializeApp();
});