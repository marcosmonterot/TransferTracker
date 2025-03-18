// Global variables
let allPlayers = [];
let filteredPlayers = [];
let currentFilters = {
    club: '',
    position: '',
    nationality: '',
    marketValue: '',
    favorites: false,
    search: ''
};

// DOM elements
const playersContainer = document.getElementById('players-container');
const loadingSpinner = document.getElementById('loading-spinner');
const errorContainer = document.getElementById('error-container');
const searchInput = document.getElementById('search-input');
const clubFilter = document.getElementById('club-filter');
const positionFilter = document.getElementById('position-filter');
const nationalityFilter = document.getElementById('nationality-filter');
const marketValueFilter = document.getElementById('market-value-filter');
const favoritesFilter = document.getElementById('favorites-filter');
const sortSelect = document.getElementById('sort-select');
const activeFiltersContainer = document.getElementById('active-filters');
const refreshButton = document.getElementById('refresh-data');
const playerCount = document.getElementById('player-count');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadPlayers();
    
    // Set up event listeners
    searchInput.addEventListener('input', handleSearch);
    clubFilter.addEventListener('change', () => applyFilter('club', clubFilter.value));
    positionFilter.addEventListener('change', () => applyFilter('position', positionFilter.value));
    nationalityFilter.addEventListener('change', () => applyFilter('nationality', nationalityFilter.value));
    marketValueFilter.addEventListener('change', () => applyFilter('marketValue', marketValueFilter.value));
    favoritesFilter.addEventListener('change', () => applyFilter('favorites', favoritesFilter.checked));
    sortSelect && sortSelect.addEventListener('change', sortPlayers);
    refreshButton.addEventListener('click', refreshData);
    
    // Setup favorite lists event listeners
    document.getElementById('new-list-form').addEventListener('submit', createNewList);
    document.getElementById('edit-list-form').addEventListener('submit', saveListChanges);
    document.getElementById('confirm-delete-btn').addEventListener('click', deleteList);
    document.getElementById('edit-list-btn').addEventListener('click', showEditListModal);
    document.getElementById('delete-list-btn').addEventListener('click', showDeleteListModal);
    
    // Load favorite lists when modal is opened
    document.getElementById('favListsModal').addEventListener('show.bs.modal', function () {
        loadFavoriteLists('favorite-lists-container');
    });
});

// Load players from API
function loadPlayers() {
    showLoading(true);
    
    fetch('/api/players')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load player data');
            }
            return response.json();
        })
        .then(players => {
            allPlayers = players;
            filteredPlayers = [...players];
            
            // Populate filter dropdowns
            populateFilterOptions();
            
            // Display players
            displayPlayers();
            showLoading(false);
        })
        .catch(error => {
            console.error('Error loading players:', error);
            showError('Failed to load player data. Please try refreshing the page.');
            showLoading(false);
        });
}

// Display loading spinner
function showLoading(isLoading) {
    if (isLoading) {
        loadingSpinner.classList.remove('d-none');
        playersContainer.classList.add('d-none');
        errorContainer.classList.add('d-none');
    } else {
        loadingSpinner.classList.add('d-none');
        playersContainer.classList.remove('d-none');
    }
}

// Display error message
function showError(message) {
    errorContainer.textContent = message;
    errorContainer.classList.remove('d-none');
}

// Populate filter dropdown options
function populateFilterOptions() {
    const clubs = new Set();
    const positions = new Set();
    const nationalities = new Set();
    
    allPlayers.forEach(player => {
        clubs.add(player.club);
        positions.add(player.position);
        nationalities.add(player.nationality);
    });
    
    // Add options to filters
    populateSelectOptions(clubFilter, clubs);
    populateSelectOptions(positionFilter, positions);
    populateSelectOptions(nationalityFilter, nationalities);
}

// Helper function to populate select elements
function populateSelectOptions(selectElement, options) {
    // Clear existing options except the first one (All)
    selectElement.innerHTML = '<option value="">All</option>';
    
    // Add new options
    Array.from(options).sort().forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        selectElement.appendChild(optionElement);
    });
}

// Filter players based on current filters
function filterPlayers() {
    filteredPlayers = allPlayers.filter(player => {
        // Text search (case insensitive)
        if (currentFilters.search && 
            !player.name.toLowerCase().includes(currentFilters.search.toLowerCase()) &&
            !player.club.toLowerCase().includes(currentFilters.search.toLowerCase()) &&
            !player.nationality.toLowerCase().includes(currentFilters.search.toLowerCase()) &&
            !player.position.toLowerCase().includes(currentFilters.search.toLowerCase())) {
            return false;
        }
        
        // Club filter
        if (currentFilters.club && player.club !== currentFilters.club) {
            return false;
        }
        
        // Position filter
        if (currentFilters.position && player.position !== currentFilters.position) {
            return false;
        }
        
        // Nationality filter
        if (currentFilters.nationality && player.nationality !== currentFilters.nationality) {
            return false;
        }
        
        // Market value filter
        if (currentFilters.marketValue) {
            const value = parseMarketValue(player.market_value);
            
            switch (currentFilters.marketValue) {
                case 'elite':
                    if (player.percentile < 90) return false;
                    break;
                case 'high':
                    if (player.percentile < 70 || player.percentile >= 90) return false;
                    break;
                case 'medium':
                    if (player.percentile < 40 || player.percentile >= 70) return false;
                    break;
                case 'low':
                    if (player.percentile >= 40) return false;
                    break;
            }
        }
        
        // Favorites filter
        if (currentFilters.favorites && !player.favorite) {
            return false;
        }
        
        return true;
    });
    
    // Update active filters display
    updateActiveFilters();
    
    // Update player count
    updatePlayerCount();
    
    // Sort players with the current sorting
    sortPlayers();
}

// Parse market value string to number (in millions)
function parseMarketValue(valueStr) {
    if (!valueStr) return 0;
    
    valueStr = valueStr.replace('€', '').trim();
    
    if (valueStr.includes('m')) {
        return parseFloat(valueStr.replace('m', '').replace(',', '.'));
    } else if (valueStr.includes('k')) {
        return parseFloat(valueStr.replace('k', '').replace(',', '.')) / 1000;
    } else {
        return parseFloat(valueStr) / 1000000;
    }
}

// Apply a filter and update display
function applyFilter(type, value) {
    currentFilters[type] = value;
    filterPlayers();
    displayPlayers();
}

// Handle search input
function handleSearch() {
    currentFilters.search = searchInput.value.trim();
    filterPlayers();
    displayPlayers();
}

// Sort players based on selected option
function sortPlayers() {
    // Always sort by percentile in descending order regardless of select value
    // This ensures players are always sorted by their percentile scores (highest first)
    
    filteredPlayers.sort((a, b) => {
        // Negative multiplier for descending order (highest first)
        return -1 * (a.percentile - b.percentile);
    });
    
    displayPlayers();
}

// Update the active filters display
function updateActiveFilters() {
    activeFiltersContainer.innerHTML = '';
    
    // Create badges for each active filter
    if (currentFilters.search) {
        addFilterBadge('Search', currentFilters.search, () => {
            searchInput.value = '';
            currentFilters.search = '';
            filterPlayers();
            displayPlayers();
        });
    }
    
    if (currentFilters.club) {
        addFilterBadge('Club', currentFilters.club, () => {
            clubFilter.value = '';
            currentFilters.club = '';
            filterPlayers();
            displayPlayers();
        });
    }
    
    if (currentFilters.position) {
        addFilterBadge('Position', currentFilters.position, () => {
            positionFilter.value = '';
            currentFilters.position = '';
            filterPlayers();
            displayPlayers();
        });
    }
    
    if (currentFilters.nationality) {
        addFilterBadge('Nationality', currentFilters.nationality, () => {
            nationalityFilter.value = '';
            currentFilters.nationality = '';
            filterPlayers();
            displayPlayers();
        });
    }
    
    if (currentFilters.marketValue) {
        const labels = {
            'elite': 'Elite (90%+)',
            'high': 'High (70-89%)',
            'medium': 'Medium (40-69%)',
            'low': 'Low (<40%)'
        };
        
        addFilterBadge('Value', labels[currentFilters.marketValue], () => {
            marketValueFilter.value = '';
            currentFilters.marketValue = '';
            filterPlayers();
            displayPlayers();
        });
    }
    
    if (currentFilters.favorites) {
        addFilterBadge('Only Favorites', '', () => {
            favoritesFilter.checked = false;
            currentFilters.favorites = false;
            filterPlayers();
            displayPlayers();
        });
    }
}

// Helper to add filter badge
function addFilterBadge(type, value, removeCallback) {
    const badge = document.createElement('span');
    badge.classList.add('badge', 'bg-primary', 'filter-badge', 'me-2');
    badge.innerHTML = `${type}: ${value} <i class="fas fa-times-circle"></i>`;
    badge.addEventListener('click', removeCallback);
    activeFiltersContainer.appendChild(badge);
}

// Update player count
function updatePlayerCount() {
    playerCount.textContent = filteredPlayers.length;
}

// Display players based on current filters and sorting
function displayPlayers() {
    playersContainer.innerHTML = '';
    
    if (filteredPlayers.length === 0) {
        playersContainer.innerHTML = `
            <div class="col-12 text-center py-5">
                <h4>No players match your filters</h4>
                <p>Try adjusting your search criteria or clear some filters.</p>
                <button class="btn btn-outline-primary" onclick="resetFilters()">
                    <i class="fas fa-sync-alt me-2"></i>Reset All Filters
                </button>
            </div>
        `;
        return;
    }
    
    filteredPlayers.forEach(player => {
        const card = createPlayerCard(player);
        playersContainer.appendChild(card);
    });
}

// Create a card element for a player
function createPlayerCard(player) {
    // Determine percentile class
    let percentileClass = 'percentile-below';
    if (player.percentile >= 90) {
        percentileClass = 'percentile-elite';
    } else if (player.percentile >= 70) {
        percentileClass = 'percentile-good';
    } else if (player.percentile >= 40) {
        percentileClass = 'percentile-average';
    }
    
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 mb-4';
    
    col.innerHTML = `
        <div class="card h-100 player-card football-bg" data-player-id="${player.id}">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="card-title mb-0">${player.name}</h5>
                <div class="d-flex">
                    <button class="btn btn-sm btn-outline-warning me-2" onclick="addToFavoriteList('${player.id}', '${player.name}')">
                        <i class="fas fa-list"></i>
                    </button>
                    <div class="favorite-btn" onclick="toggleFavorite('${player.id}')">
                        <i class="fas fa-star favorite-icon ${player.favorite ? 'active' : ''}"></i>
                    </div>
                </div>
            </div>
            <div class="card-body position-relative">
                <div class="${percentileClass} percentile-badge">${player.percentile}</div>
                <ul class="list-group list-group-flush">
                    <li class="list-group-item d-flex justify-content-between">
                        <span><i class="fas fa-futbol me-2"></i>Club:</span>
                        <span class="fw-bold">${player.club}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between">
                        <span><i class="fas fa-running me-2"></i>Position:</span>
                        <span class="fw-bold">${player.position}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between">
                        <span><i class="fas fa-flag me-2"></i>Nationality:</span>
                        <span class="fw-bold">${player.nationality}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between">
                        <span><i class="fas fa-euro-sign me-2"></i>Market Value:</span>
                        <span class="fw-bold">${player.market_value}</span>
                    </li>
                </ul>
                <div class="mt-3">
                    <div class="comment-box mb-2 ${player.comment ? '' : 'd-none'}" id="comment-box-${player.id}">
                        <p class="small m-0"><i class="fas fa-comment me-2"></i>${player.comment || ''}</p>
                    </div>
                    <div class="input-group">
                        <input type="text" class="form-control form-control-sm" placeholder="Añadir comentario" 
                               id="comment-input-${player.id}" value="${player.comment || ''}">
                        <button class="btn btn-sm btn-outline-primary" onclick="saveComment('${player.id}')">
                            <i class="fas fa-save"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return col;
}

// Abrir el modal para añadir a una lista de favoritos
function addToFavoriteList(playerId, playerName) {
    // Guardar el ID del jugador en el modal
    document.getElementById('player-id-to-add').value = playerId;
    document.getElementById('player-name-to-add').textContent = playerName;
    
    // Cargar las listas de favoritos
    loadFavoriteLists('select-list-container', playerId);
    
    // Mostrar el modal
    const selectFavListModal = new bootstrap.Modal(document.getElementById('selectFavListModal'));
    selectFavListModal.show();
}

// Toggle favorite status for a player
function toggleFavorite(playerId) {
    fetch('/api/toggle_favorite', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ player_id: playerId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update the player in our arrays
            const updatePlayer = player => {
                if (player.id === playerId) {
                    player.favorite = data.favorite;
                }
                return player;
            };
            
            allPlayers = allPlayers.map(updatePlayer);
            filteredPlayers = filteredPlayers.map(updatePlayer);
            
            // Update the UI
            const starIcon = document.querySelector(`.card[data-player-id="${playerId}"] .favorite-icon`);
            if (starIcon) {
                if (data.favorite) {
                    starIcon.classList.add('active');
                } else {
                    starIcon.classList.remove('active');
                }
            }
            
            // If favorites filter is active, we might need to refilter
            if (currentFilters.favorites) {
                filterPlayers();
                displayPlayers();
            }
        }
    })
    .catch(error => console.error('Error toggling favorite:', error));
}

// Save a comment for a player
function saveComment(playerId) {
    const commentInput = document.getElementById(`comment-input-${playerId}`);
    const comment = commentInput.value.trim();
    
    fetch('/api/add_comment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            player_id: playerId,
            comment: comment
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update the player in our arrays
            const updatePlayer = player => {
                if (player.id === playerId) {
                    player.comment = comment;
                }
                return player;
            };
            
            allPlayers = allPlayers.map(updatePlayer);
            filteredPlayers = filteredPlayers.map(updatePlayer);
            
            // Update the comment box
            const commentBox = document.getElementById(`comment-box-${playerId}`);
            if (comment) {
                commentBox.querySelector('p').innerHTML = `<i class="fas fa-comment me-2"></i>${comment}`;
                commentBox.classList.remove('d-none');
            } else {
                commentBox.classList.add('d-none');
            }
            
            // Show a temporary success message
            const commentInput = document.getElementById(`comment-input-${playerId}`);
            const originalPlaceholder = commentInput.placeholder;
            commentInput.placeholder = 'Comment saved!';
            commentInput.classList.add('is-valid');
            
            setTimeout(() => {
                commentInput.placeholder = originalPlaceholder;
                commentInput.classList.remove('is-valid');
            }, 2000);
        }
    })
    .catch(error => console.error('Error saving comment:', error));
}

// Reset all filters
function resetFilters() {
    // Reset filter values
    searchInput.value = '';
    clubFilter.value = '';
    positionFilter.value = '';
    nationalityFilter.value = '';
    marketValueFilter.value = '';
    favoritesFilter.checked = false;
    
    // Reset filter object
    currentFilters = {
        club: '',
        position: '',
        nationality: '',
        marketValue: '',
        favorites: false,
        search: ''
    };
    
    // Reset filtered players
    filteredPlayers = [...allPlayers];
    
    // Update display
    updateActiveFilters();
    updatePlayerCount();
    displayPlayers();
}

// Refresh data from the server
function refreshData() {
    const button = refreshButton;
    const originalContent = button.innerHTML;
    
    // Show loading state
    button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Refreshing...';
    button.disabled = true;
    
    fetch('/api/refresh_data', {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Reload players
            loadPlayers();
            
            // Reset filters
            resetFilters();
            
            // Show success message
            button.innerHTML = '<i class="fas fa-check me-2"></i>Data refreshed!';
            button.classList.remove('btn-primary');
            button.classList.add('btn-success');
            
            setTimeout(() => {
                button.innerHTML = originalContent;
                button.classList.remove('btn-success');
                button.classList.add('btn-primary');
                button.disabled = false;
            }, 2000);
        } else {
            // Show error
            button.innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i>Error';
            button.classList.remove('btn-primary');
            button.classList.add('btn-danger');
            
            setTimeout(() => {
                button.innerHTML = originalContent;
                button.classList.remove('btn-danger');
                button.classList.add('btn-primary');
                button.disabled = false;
            }, 2000);
            
            showError('Failed to refresh data: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error refreshing data:', error);
        
        button.innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i>Error';
        button.classList.remove('btn-primary');
        button.classList.add('btn-danger');
        
        setTimeout(() => {
            button.innerHTML = originalContent;
            button.classList.remove('btn-danger');
            button.classList.add('btn-primary');
            button.disabled = false;
        }, 2000);
        
        showError('Failed to refresh data. Please try again later.');
    });
}
