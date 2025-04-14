const smartGrid = document.getElementById('smart-grid');
const moodGrid = document.getElementById('mood-grid');
const timeGrid = document.getElementById('time-grid');
const genreList = document.getElementById('genre-list');
const yearSlider = document.getElementById('year-slider');
const yearValue = document.getElementById('year-value');
const resetButton = document.getElementById('reset-filters');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const moodOptions = document.querySelectorAll('.mood-option');
const surpriseButton = document.getElementById('surprise-btn');
const historyList = document.getElementById('history-list');
const clearHistoryButton = document.getElementById('clear-history');
const modal = document.getElementById('movie-modal');
const modalClose = document.querySelector('.modal-close');
const watchButton = document.getElementById('watch-button');
const similarButton = document.getElementById('similar-button');

const API_BASE_URL = 'http://localhost:5000/api';

function fetchRecommendations(tabType) {
    const grid = document.getElementById(`${tabType}-grid`);
    if (!grid) {
        console.error(`Grid element not found for tab type: ${tabType}-grid`);
        return;
    }
    grid.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Finding your perfect matches...</p>
        </div>
    `;

    let params = `type=${tabType}&count=12`;
    if (tabType === 'mood') {
        const activeMood = document.querySelector('.mood-option.active');
        if (activeMood) {
            params += `&mood=${activeMood.getAttribute('data-mood')}`;
        }
    } else if (tabType === 'time') {
        const timeSelect = document.getElementById('time-select');
        const daySelect = document.getElementById('day-select');
        if (timeSelect && daySelect) {
            params += `&time=${timeSelect.value}&day=${daySelect.value}`;
        }
    }

    fetch(`${API_BASE_URL}/recommendations?${params}`)
        .then(response => response.json())
        .then(data => {
            if (data.results && data.results.length > 0) {
                displayMovies(data.results, grid);
            } else {
                grid.innerHTML = '<p>No recommendations found. Try adjusting your filters.</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching recommendations:', error);
            grid.innerHTML = '<p>Error loading recommendations. Please try again later.</p>';
        });
}

function fetchMoodRecommendations(mood) {
    tabs.forEach(t => t.classList.remove('active'));
    const moodTab = document.querySelector('[data-tab="mood"]');
    if (moodTab) {
        moodTab.classList.add('active');
    }

    tabContents.forEach(content => content.classList.remove('active'));
    const moodTabContent = document.getElementById('mood-tab');
    if (moodTabContent) {
        moodTabContent.classList.add('active');
    }

    if (!moodGrid) {
        console.error('Mood grid element not found');
        return;
    }
    moodGrid.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Finding ${mood.toLowerCase()} content for you...</p>
        </div>
    `;

    fetch(`${API_BASE_URL}/recommendations?type=mood&mood=${mood}&count=12`)
        .then(response => response.json())
        .then(data => {
            if (data.results && data.results.length > 0) {
                displayMovies(data.results, moodGrid);
            } else {
                moodGrid.innerHTML = '<p>No recommendations found for this mood. Try another one!</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching mood recommendations:', error);
            moodGrid.innerHTML = '<p>Error loading recommendations. Please try again later.</p>';
        });
}

function fetchSimilarMovies(movieTitle) {
    const activeTab = document.querySelector('.tab.active');
    if (!activeTab) return;
    const activeTabId = activeTab.getAttribute('data-tab');
    const grid = document.getElementById(`${activeTabId}-grid`);
    if (!grid) return;

    grid.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Finding similar content...</p>
        </div>
    `;

    fetch(`${API_BASE_URL}/recommendations?type=similar&title=${encodeURIComponent(movieTitle)}&count=12`)
        .then(response => response.json())
        .then(data => {
            if (data.results && data.results.length > 0) {
                displayMovies(data.results, grid);
            } else {
                grid.innerHTML = '<p>No similar content found.</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching similar movies:', error);
            grid.innerHTML = '<p>Error loading similar content. Please try again later.</p>';
        });
}

function fetchSurpriseRecommendation() {
    document.body.classList.add('loading-state');
    fetch(`${API_BASE_URL}/surprise`)
        .then(response => response.json())
        .then(data => {
            document.body.classList.remove('loading-state');
            if (data.status === 'success' && data.data) {
                openMovieModal(data.data);
            } else {
                alert('Could not find a surprise recommendation. Please try again.');
            }
        })
        .catch(error => {
            document.body.classList.remove('loading-state');
            console.error('Error fetching surprise recommendation:', error);
            alert('Error loading surprise recommendation. Please try again later.');
        });
}

function applyFilters() {
    const activeTab = document.querySelector('.tab.active');
    if (!activeTab) return;
    const activeTabId = activeTab.getAttribute('data-tab');
    const grid = document.getElementById(`${activeTabId}-grid`);
    if (!grid) return;

    grid.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Applying your filters...</p>
        </div>
    `;

    const checkedGenres = Array.from(document.querySelectorAll('#genre-list input:checked'))
        .map(checkbox => checkbox.value);
    const currentYearValue = yearSlider ? yearSlider.value : '1950';
    const contentTypeElement = document.getElementById('content-type');
    const currentContentType = contentTypeElement ? contentTypeElement.value : 'all';

    let params = new URLSearchParams();
    params.append('count', '12');

    if (checkedGenres.length > 0) {
        params.append('genres', checkedGenres.join(','));
    }

    params.append('year_min', currentYearValue);
    params.append('year_max', '2025'); // Assuming a max year or fetch dynamically if needed
    params.append('type', currentContentType);

    fetch(`${API_BASE_URL}/filter?${params.toString()}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                if (data.data && data.data.length > 0) {
                    displayMovies(data.data, grid);
                } else {
                    grid.innerHTML = '<p>No content found matching your filters. Try broadening your criteria.</p>';
                }
            } else {
                grid.innerHTML = '<p>Error applying filters. Please try again.</p>';
            }
        })
        .catch(error => {
            console.error('Error applying filters:', error);
            grid.innerHTML = '<p>Error loading filtered content. Please try again later.</p>';
        });
}


function loadGenres() {
    if (!genreList) return;
    fetch(`${API_BASE_URL}/genres`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success' && data.data) {
                genreList.innerHTML = '';
                data.data.forEach(genre => {
                    const genreOption = document.createElement('div');
                    genreOption.className = 'genre-option';
                    const genreId = `genre-${genre.toLowerCase().replace(/[\s&]/g, '-')}`;
                    genreOption.innerHTML = `
                        <input type="checkbox" id="${genreId}" value="${genre}">
                        <label for="${genreId}">${genre}</label>
                    `;
                    genreList.appendChild(genreOption);
                });

                document.querySelectorAll('#genre-list input').forEach(checkbox => {
                    checkbox.addEventListener('change', applyFilters);
                });
            }
        })
        .catch(error => {
            console.error('Error loading genres:', error);
        });
}

function displayMovies(movies, grid) {
    if (!grid) return;
    grid.innerHTML = '';
    if (!movies || movies.length === 0) {
        grid.innerHTML = '<p>No movies found matching your criteria.</p>';
        return;
    }

    movies.forEach(movie => {
        const movieCard = document.createElement('div');
        movieCard.className = 'movie-card';

        const posterPath = movie.poster_path
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : '/api/placeholder/200/300'; // Keep a fallback placeholder

        const movieYear = movie.year || (movie.release_date ? movie.release_date.substring(0, 4) : '');
        const movieDuration = movie.runtime || movie.duration || '';
        const genres = movie.genres ? (Array.isArray(movie.genres) ? movie.genres.map(g => g.name || g).join(', ') : movie.genres) : ''; // Handle both array of objects and strings
        const movieTitle = movie.title || 'Untitled';
        const movieId = movie.id || Math.random().toString(36).substring(7); // Ensure an ID exists

        movieCard.innerHTML = `
            <img src="${posterPath}" alt="${movieTitle}" class="movie-poster">
            <div class="movie-info">
                 <h3 class="movie-title">${movieTitle}</h3>
                <div class="movie-meta">
                    <span>${movieYear}</span>
                    ${movieDuration ? `<span>${movieDuration} min</span>` : ''}
                </div>
                <div class="movie-genres">${genres}</div>
                 <div class="watched-toggle" data-id="${movieId}" data-title="${movieTitle}">
                    <i class="far fa-clock"></i>
                    Watch Later
                </div>
            </div>
        `;
        grid.appendChild(movieCard);

        movieCard.addEventListener('click', () => {
            openMovieModal(movie);
        });

        const watchToggle = movieCard.querySelector('.watched-toggle');
        if (watchToggle) {
             watchToggle.addEventListener('click', (e) => {
                 e.stopPropagation();
                 // Replace with actual toggle watch later logic if needed
                 alert(`Toggled "Watch Later" for "${movieTitle}"`);
             });
        }
    });
}


function openMovieModal(movie) {
    if (!modal) return;
    const movieTitle = movie.title || 'Untitled';
    const movieId = movie.id || '';
    const movieYear = movie.year || (movie.release_date ? movie.release_date.substring(0, 4) : '');
    const movieDuration = movie.runtime || movie.duration || '';
    const movieRating = movie.vote_average || movie.rating || '';
    const movieGenres = movie.genres ? (Array.isArray(movie.genres) ? movie.genres.map(g => g.name || g).join(', ') : movie.genres) : '';
    const movieDescription = movie.overview || movie.description || 'No description available.';
    const posterPath = movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : '/api/placeholder/500/750'; // Fallback placeholder

    document.getElementById('modal-title').textContent = movieTitle;
    document.getElementById('modal-year').textContent = movieYear;
    document.getElementById('modal-duration').textContent = movieDuration ? `${movieDuration} min` : '';
    document.getElementById('modal-rating').textContent = movieRating ? movieRating.toFixed(1) : '';
    document.getElementById('modal-genres').textContent = movieGenres;
    document.getElementById('modal-description').textContent = movieDescription;
    const modalPoster = document.getElementById('modal-poster');
    if (modalPoster) modalPoster.src = posterPath;

    if (watchButton) {
        watchButton.setAttribute('data-id', movieId);
        watchButton.setAttribute('data-title', movieTitle);
        const watchHistory = getWatchHistory();
        const isWatched = watchHistory.some(item => item.id === movieId.toString());
        watchButton.innerHTML = isWatched
            ? '<i class="fas fa-check"></i> Watched'
            : '<i class="fas fa-check"></i> Mark as Watched';
    }
    if (similarButton) {
        similarButton.setAttribute('data-id', movieId);
        similarButton.setAttribute('data-title', movieTitle);
    }

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent background scroll when modal is open
}

function getWatchHistory() {
    const history = localStorage.getItem('watchHistory');
    try {
        return history ? JSON.parse(history) : [];
    } catch (e) {
        console.error("Error parsing watch history:", e);
        return [];
    }
}

function addToWatchHistory(movieId, movieTitle) {
    if (!movieId || !movieTitle) return;
    const watchHistory = getWatchHistory();
    const watchedItem = {
        id: movieId.toString(), // Ensure consistent ID type
        title: movieTitle,
        date: new Date().toISOString()
    };
    // Prevent duplicates
    const existingIndex = watchHistory.findIndex(item => item.id === watchedItem.id);
    if (existingIndex > -1) {
        watchHistory.splice(existingIndex, 1); // Remove existing if present
    }
    watchHistory.unshift(watchedItem);

    localStorage.setItem('watchHistory', JSON.stringify(watchHistory));
    loadWatchHistory();

    // Update modal button state immediately if modal is open and showing this movie
    if (modal && modal.style.display === 'block' && watchButton && watchButton.getAttribute('data-id') === movieId.toString()) {
         watchButton.innerHTML = '<i class="fas fa-check"></i> Watched';
    }
}


function loadWatchHistory() {
    if (!historyList) return;
    const watchHistory = getWatchHistory();
    if (watchHistory.length === 0) {
        historyList.innerHTML = '<p>You haven\'t watched anything yet.</p>';
        return;
    }

    historyList.innerHTML = '';
    watchHistory.forEach(item => {
        const historyItem = document.createElement('li');
        historyItem.className = 'history-item';

        let formattedDate = 'Date unavailable';
        try {
            const date = new Date(item.date);
            formattedDate = `${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
        } catch (e) {
            console.error("Error formatting history date:", e);
        }


        historyItem.innerHTML = `
            <div class="history-title">
                <i class="fas fa-check-circle"></i>
                 ${item.title || 'Untitled'}
            </div>
            <div class="history-date">${formattedDate}</div>
            <div class="remove-history" data-id="${item.id}">
                 <i class="fas fa-times"></i>
            </div>
        `;

        historyList.appendChild(historyItem);

        const removeBtn = historyItem.querySelector('.remove-history');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeFromHistory(item.id);
            });
        }

        historyItem.addEventListener('click', () => {
             // Fetch full movie details if needed, or use stored basic info
             // For now, just alerting as fetching requires more logic
             alert(`Workspaceing details for ${item.title} (ID: ${item.id}) - Implement fetch logic here.`);
             // Example: fetch(`${API_BASE_URL}/movie/${item.id}`).then(res => res.json()).then(movieData => openMovieModal(movieData));
        });
    });
}

function removeFromHistory(movieId) {
    if (!movieId) return;
    let watchHistory = getWatchHistory();
    watchHistory = watchHistory.filter(item => item.id !== movieId.toString());
    localStorage.setItem('watchHistory', JSON.stringify(watchHistory));
    loadWatchHistory();
}

function clearWatchHistory() {
    localStorage.removeItem('watchHistory');
    loadWatchHistory();
}


function resetFilters() {
    if (moodOptions) {
        moodOptions.forEach(option => option.classList.remove('active'));
    }
    const timeSelect = document.getElementById('time-select');
    if (timeSelect) timeSelect.value = 'current';
    const daySelect = document.getElementById('day-select');
    if (daySelect) daySelect.value = 'current';

    if (genreList) {
        document.querySelectorAll('#genre-list input').forEach(checkbox => {
            checkbox.checked = false;
        });
    }
    if (yearSlider) {
        yearSlider.value = 1950; // Or your desired default min year
    }
     if (yearValue) {
        yearValue.textContent = yearSlider ? yearSlider.value : '1950';
     }

    const contentType = document.getElementById('content-type');
    if (contentType) contentType.value = 'all';

    applyFilters(); // Call applyFilters instead of the old updateRecommendations
}

function setupEventListeners() {
    if (tabs) {
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-tab');
                if (!tabId) return;

                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                if (tabContents) {
                    tabContents.forEach(content => content.classList.remove('active'));
                    const correspondingContent = document.getElementById(`${tabId}-tab`);
                    if (correspondingContent) {
                        correspondingContent.classList.add('active');
                    }
                }

                fetchRecommendations(tabId);
            });
        });
    }

    if (moodOptions) {
        moodOptions.forEach(option => {
            option.addEventListener('click', () => {
                moodOptions.forEach(o => o.classList.remove('active'));
                option.classList.add('active');
                const mood = option.getAttribute('data-mood');
                if (mood) {
                    fetchMoodRecommendations(mood);
                }
            });
        });
    }

    if (yearSlider) {
        yearSlider.addEventListener('input', () => {
            if (yearValue) yearValue.textContent = yearSlider.value;
            clearTimeout(yearSlider.timeout);
            yearSlider.timeout = setTimeout(() => {
                applyFilters();
            }, 500);
        });
    }

    const contentType = document.getElementById('content-type');
    if (contentType) contentType.addEventListener('change', applyFilters);

    const timeSelect = document.getElementById('time-select');
    if (timeSelect) {
        timeSelect.addEventListener('change', () => {
            const activeTab = document.querySelector('.tab.active');
            if (activeTab && activeTab.getAttribute('data-tab') === 'time') {
                fetchRecommendations('time');
            }
        });
    }

    const daySelect = document.getElementById('day-select');
    if (daySelect) {
        daySelect.addEventListener('change', () => {
            const activeTab = document.querySelector('.tab.active');
            if (activeTab && activeTab.getAttribute('data-tab') === 'time') {
                fetchRecommendations('time');
            }
        });
    }

    if (resetButton) resetButton.addEventListener('click', resetFilters);
    if (surpriseButton) surpriseButton.addEventListener('click', fetchSurpriseRecommendation);
    if (clearHistoryButton) clearHistoryButton.addEventListener('click', clearWatchHistory);

    if (modalClose) {
        modalClose.addEventListener('click', () => {
            if (modal) modal.style.display = 'none';
             document.body.style.overflow = ''; // Restore scroll
        });
    }

    window.addEventListener('click', (e) => {
        if (modal && e.target === modal) {
            modal.style.display = 'none';
             document.body.style.overflow = ''; // Restore scroll
        }
    });

    if (watchButton) {
        watchButton.addEventListener('click', () => {
            const movieId = watchButton.getAttribute('data-id');
            const movieTitle = watchButton.getAttribute('data-title');
            addToWatchHistory(movieId, movieTitle);
            if (modal) modal.style.display = 'none';
             document.body.style.overflow = ''; // Restore scroll
        });
    }

    if (similarButton) {
        similarButton.addEventListener('click', () => {
            const movieTitle = similarButton.getAttribute('data-title');
            if (movieTitle) {
                fetchSimilarMovies(movieTitle);
            }
            if (modal) modal.style.display = 'none';
             document.body.style.overflow = ''; // Restore scroll
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadGenres();
    setupEventListeners();
    loadWatchHistory();
    // Fetch initial recommendations for the default tab (assuming 'smart')
    const initialTab = document.querySelector('.tab.active') || document.querySelector('.tab');
    const initialTabId = initialTab ? initialTab.getAttribute('data-tab') : 'smart'; // Default to 'smart' if no tab is active
    fetchRecommendations(initialTabId);
});