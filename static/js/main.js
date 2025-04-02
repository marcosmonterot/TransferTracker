// Global variables
let allPlayers = [];
let filteredPlayers = [];
let currentFilters = {
    league: '',
    club: '',
    position: '',
    nationality: '',
    marketValue: '',
    favorites: false,
    search: '',
    // Rango de valor de mercado personalizado
    minMarketValue: null,
    maxMarketValue: null,
    // Rango de edad
    minAge: null,
    maxAge: null,
    // Pie preferido
    foot: '',
    // Rango de altura
    minHeight: null,
    maxHeight: null,
    // Contrato hasta
    contract: ''
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
    
    // Nuevos filtros adicionales
    
    // Filtros de rango de valor de mercado
    document.getElementById('min-value-filter').addEventListener('change', (e) => {
        currentFilters.minMarketValue = e.target.value ? parseFloat(e.target.value) : null;
        filterPlayers();
        displayPlayers();
        updateActiveFilters();
    });
    
    document.getElementById('max-value-filter').addEventListener('change', (e) => {
        currentFilters.maxMarketValue = e.target.value ? parseFloat(e.target.value) : null;
        filterPlayers();
        displayPlayers();
        updateActiveFilters();
    });
    
    // Filtros de rango de edad
    document.getElementById('min-age-filter').addEventListener('change', (e) => {
        currentFilters.minAge = e.target.value ? parseInt(e.target.value) : null;
        filterPlayers();
        displayPlayers();
        updateActiveFilters();
    });
    
    document.getElementById('max-age-filter').addEventListener('change', (e) => {
        currentFilters.maxAge = e.target.value ? parseInt(e.target.value) : null;
        filterPlayers();
        displayPlayers();
        updateActiveFilters();
    });
    
    // Filtro de pie preferido
    document.getElementById('foot-filter').addEventListener('change', (e) => {
        currentFilters.foot = e.target.value;
        filterPlayers();
        displayPlayers();
        updateActiveFilters();
    });
    
    // Filtros de rango de altura
    document.getElementById('min-height-filter').addEventListener('change', (e) => {
        currentFilters.minHeight = e.target.value ? parseInt(e.target.value) : null;
        filterPlayers();
        displayPlayers();
        updateActiveFilters();
    });
    
    document.getElementById('max-height-filter').addEventListener('change', (e) => {
        currentFilters.maxHeight = e.target.value ? parseInt(e.target.value) : null;
        filterPlayers();
        displayPlayers();
        updateActiveFilters();
    });
    
    // Filtro de contrato
    document.getElementById('contract-filter').addEventListener('change', (e) => {
        currentFilters.contract = e.target.value;
        filterPlayers();
        displayPlayers();
        updateActiveFilters();
    });
    
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
    const leagues = new Set();
    const positions = new Set();
    const nationalities = new Set();
    
    allPlayers.forEach(player => {
        if (player.league) leagues.add(player.league);
        positions.add(player.position);
        nationalities.add(player.nationality);
    });
    
    // Add options to filters
    const leagueFilter = document.getElementById('league-filter');
    populateSelectOptions(leagueFilter, leagues);
    populateSelectOptions(positionFilter, positions);
    populateSelectOptions(nationalityFilter, nationalities);
    
    // Initial population of clubs
    updateClubFilter();
    
    // Add event listener for league filter
    leagueFilter.addEventListener('change', () => {
        // When league changes, update club filter first
        updateClubFilter();
        // Then apply the league filter
        applyFilter('league', leagueFilter.value);
    });
}

// Update club filter based on selected league
function updateClubFilter() {
    const leagueFilter = document.getElementById('league-filter');
    const selectedLeague = leagueFilter.value;
    
    // Get clubs for the selected league, or all clubs if no league is selected
    const clubs = new Set();
    allPlayers.forEach(player => {
        if (!selectedLeague || player.league === selectedLeague) {
            clubs.add(player.club);
        }
    });
    
    // Update club filter options
    populateSelectOptions(clubFilter, clubs);
    
    // If current selected club is not in the filtered set, reset it
    if (currentFilters.club && !clubs.has(currentFilters.club)) {
        clubFilter.value = '';
        currentFilters.club = '';
        filterPlayers();
        displayPlayers();
    }
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
        
        // League filter
        if (currentFilters.league && player.league !== currentFilters.league) {
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
        
        // Custom market value range filter
        if (currentFilters.minMarketValue !== null || currentFilters.maxMarketValue !== null) {
            const value = parseMarketValue(player.market_value);
            
            if (currentFilters.minMarketValue !== null && value < currentFilters.minMarketValue) {
                return false;
            }
            
            if (currentFilters.maxMarketValue !== null && value > currentFilters.maxMarketValue) {
                return false;
            }
        }
        
        // Age range filter
        if (currentFilters.minAge !== null || currentFilters.maxAge !== null) {
            const age = player.age ? parseInt(player.age) : 0;
            
            if (currentFilters.minAge !== null && age < currentFilters.minAge) {
                return false;
            }
            
            if (currentFilters.maxAge !== null && age > currentFilters.maxAge) {
                return false;
            }
        }
        
        // Preferred foot filter
        if (currentFilters.foot && player.foot !== currentFilters.foot) {
            return false;
        }
        
        // Height range filter
        if (currentFilters.minHeight !== null || currentFilters.maxHeight !== null) {
            const height = player.height ? parseInt(player.height) : 0;
            
            if (currentFilters.minHeight !== null && height < currentFilters.minHeight) {
                return false;
            }
            
            if (currentFilters.maxHeight !== null && height > currentFilters.maxHeight) {
                return false;
            }
        }
        
        // Contract expiry filter
        if (currentFilters.contract) {
            if (currentFilters.contract === 'free') {
                if (player.contract !== 'Free agent') {
                    return false;
                }
            } else {
                const contractYear = player.contract ? player.contract.split('.')[2] : null;
                if (contractYear !== currentFilters.contract) {
                    return false;
                }
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
    
    if (currentFilters.league) {
        addFilterBadge('League', currentFilters.league, () => {
            const leagueFilter = document.getElementById('league-filter');
            leagueFilter.value = '';
            currentFilters.league = '';
            // Update club filter when league filter is removed
            updateClubFilter();
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
    
    // Custom market value range
    if (currentFilters.minMarketValue !== null || currentFilters.maxMarketValue !== null) {
        let rangeText = '';
        if (currentFilters.minMarketValue !== null && currentFilters.maxMarketValue !== null) {
            rangeText = `€${currentFilters.minMarketValue}m - €${currentFilters.maxMarketValue}m`;
        } else if (currentFilters.minMarketValue !== null) {
            rangeText = `≥ €${currentFilters.minMarketValue}m`;
        } else if (currentFilters.maxMarketValue !== null) {
            rangeText = `≤ €${currentFilters.maxMarketValue}m`;
        }
        
        addFilterBadge('Market Value', rangeText, () => {
            document.getElementById('min-value-filter').value = '';
            document.getElementById('max-value-filter').value = '';
            currentFilters.minMarketValue = null;
            currentFilters.maxMarketValue = null;
            filterPlayers();
            displayPlayers();
        });
    }
    
    // Age range
    if (currentFilters.minAge !== null || currentFilters.maxAge !== null) {
        let rangeText = '';
        if (currentFilters.minAge !== null && currentFilters.maxAge !== null) {
            rangeText = `${currentFilters.minAge} - ${currentFilters.maxAge} years`;
        } else if (currentFilters.minAge !== null) {
            rangeText = `≥ ${currentFilters.minAge} years`;
        } else if (currentFilters.maxAge !== null) {
            rangeText = `≤ ${currentFilters.maxAge} years`;
        }
        
        addFilterBadge('Age', rangeText, () => {
            document.getElementById('min-age-filter').value = '';
            document.getElementById('max-age-filter').value = '';
            currentFilters.minAge = null;
            currentFilters.maxAge = null;
            filterPlayers();
            displayPlayers();
        });
    }
    
    // Preferred foot
    if (currentFilters.foot) {
        addFilterBadge('Foot', currentFilters.foot, () => {
            document.getElementById('foot-filter').value = '';
            currentFilters.foot = '';
            filterPlayers();
            displayPlayers();
        });
    }
    
    // Height range
    if (currentFilters.minHeight !== null || currentFilters.maxHeight !== null) {
        let rangeText = '';
        if (currentFilters.minHeight !== null && currentFilters.maxHeight !== null) {
            rangeText = `${currentFilters.minHeight} - ${currentFilters.maxHeight} cm`;
        } else if (currentFilters.minHeight !== null) {
            rangeText = `≥ ${currentFilters.minHeight} cm`;
        } else if (currentFilters.maxHeight !== null) {
            rangeText = `≤ ${currentFilters.maxHeight} cm`;
        }
        
        addFilterBadge('Height', rangeText, () => {
            document.getElementById('min-height-filter').value = '';
            document.getElementById('max-height-filter').value = '';
            currentFilters.minHeight = null;
            currentFilters.maxHeight = null;
            filterPlayers();
            displayPlayers();
        });
    }
    
    // Contract expiry
    if (currentFilters.contract) {
        const contractText = currentFilters.contract === 'free' ? 'Free Agents' : `Expires ${currentFilters.contract}`;
        addFilterBadge('Contract', contractText, () => {
            document.getElementById('contract-filter').value = '';
            currentFilters.contract = '';
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
    
    // Preparar los comentarios para mostrar
    const hasComments = player.comments && player.comments.length > 0;
    
    // Generar HTML para los comentarios existentes
    let commentsHtml = '';
    if (hasComments) {
        commentsHtml = player.comments.map(comment => `
            <div class="comment-item mb-1 p-1 border-bottom">
                <p class="small m-0">${comment.text}</p>
                <small class="text-muted">${comment.timestamp}</small>
            </div>
        `).join('');
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
                <div class="text-center mb-3">
                    <img src="${player.photo_url}" alt="${player.name}" class="player-photo img-fluid rounded" 
                         onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=1e88e5&color=fff&size=150';">
                </div>
                <div class="${percentileClass} percentile-badge">${player.percentile}</div>
                <ul class="list-group list-group-flush">
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <span><i class="fas fa-futbol me-2"></i>Club:</span>
                        <span class="fw-bold d-flex align-items-center">
                            <img src="${player.club_badge_url}" alt="${player.club}" class="club-badge me-2" 
                                onerror="this.style.display='none';">
                            ${player.club}
                        </span>
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
                    <li class="list-group-item d-flex justify-content-between">
                        <span><i class="fas fa-globe me-2"></i>League:</span>
                        <span class="fw-bold">${player.league || 'Unknown'}</span>
                    </li>
                </ul>
                
                <!-- Información adicional de Transfermarkt (colapsable) -->
                <div class="accordion mt-3" id="accordion-${player.id}">
                    <div class="accordion-item">
                        <h2 class="accordion-header" id="heading-${player.id}">
                            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" 
                                data-bs-target="#collapse-${player.id}" aria-expanded="false" aria-controls="collapse-${player.id}">
                                Información adicional
                            </button>
                        </h2>
                        <div id="collapse-${player.id}" class="accordion-collapse collapse" 
                            aria-labelledby="heading-${player.id}" data-bs-parent="#accordion-${player.id}">
                            <div class="accordion-body p-2">
                                <ul class="list-group list-group-flush">
                                    <li class="list-group-item d-flex justify-content-between">
                                        <span><i class="fas fa-birthday-cake me-2"></i>Fecha de nacimiento:</span>
                                        <span class="fw-bold">${player.birth_date || 'No disponible'}</span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between">
                                        <span><i class="fas fa-user me-2"></i>Edad:</span>
                                        <span class="fw-bold">${player.age || 'No disponible'}</span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between">
                                        <span><i class="fas fa-ruler-vertical me-2"></i>Altura:</span>
                                        <span class="fw-bold">${player.height || 'No disponible'}</span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between">
                                        <span><i class="fas fa-shoe-prints me-2"></i>Pie preferido:</span>
                                        <span class="fw-bold">${player.preferred_foot || 'No disponible'}</span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between">
                                        <span><i class="fas fa-calendar-check me-2"></i>Fichado:</span>
                                        <span class="fw-bold">${player.joined || 'No disponible'}</span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between">
                                        <span><i class="fas fa-file-contract me-2"></i>Contrato hasta:</span>
                                        <span class="fw-bold">${player.contract_expires || 'No disponible'}</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Comentarios -->
                <div class="mt-3">
                    <div class="comment-box mb-2 ${hasComments ? '' : 'd-none'}" id="comment-box-${player.id}">
                        <div class="comments-container" style="max-height: 150px; overflow-y: auto;">
                            ${commentsHtml}
                        </div>
                    </div>
                    <div class="input-group">
                        <input type="text" class="form-control form-control-sm" placeholder="Añadir comentario" 
                               id="comment-input-${player.id}">
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
    
    if (!comment) {
        alert('Por favor, introduce un comentario');
        return;
    }
    
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
            // Actualizar el jugador en nuestros arrays
            const updatePlayer = player => {
                if (player.id === playerId) {
                    player.comments = data.comments;
                }
                return player;
            };
            
            allPlayers = allPlayers.map(updatePlayer);
            filteredPlayers = filteredPlayers.map(updatePlayer);
            
            // Actualizar la caja de comentarios
            const commentBox = document.getElementById(`comment-box-${playerId}`);
            const commentsContainer = commentBox.querySelector('.comments-container');
            
            // Generar HTML para los comentarios
            const commentsHtml = data.comments.map(comment => `
                <div class="comment-item mb-1 p-1 border-bottom">
                    <p class="small m-0">${comment.text}</p>
                    <small class="text-muted">${comment.timestamp}</small>
                </div>
            `).join('');
            
            // Actualizar la UI
            commentsContainer.innerHTML = commentsHtml;
            commentBox.classList.remove('d-none');
            
            // Limpiar el input y mostrar mensaje de éxito
            commentInput.value = '';
            const originalPlaceholder = commentInput.placeholder;
            commentInput.placeholder = '¡Comentario guardado!';
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
    const leagueFilter = document.getElementById('league-filter');
    if (leagueFilter) leagueFilter.value = '';
    positionFilter.value = '';
    nationalityFilter.value = '';
    marketValueFilter.value = '';
    favoritesFilter.checked = false;
    
    // Reset range inputs
    document.getElementById('min-value-filter').value = '';
    document.getElementById('max-value-filter').value = '';
    document.getElementById('min-age-filter').value = '';
    document.getElementById('max-age-filter').value = '';
    document.getElementById('min-height-filter').value = '';
    document.getElementById('max-height-filter').value = '';
    
    // Reset select inputs
    document.getElementById('foot-filter').value = '';
    document.getElementById('contract-filter').value = '';
    
    // Reset club filter after league filter
    clubFilter.value = '';
    
    // Reset filter object
    currentFilters = {
        league: '',
        club: '',
        position: '',
        nationality: '',
        marketValue: '',
        favorites: false,
        search: '',
        minMarketValue: null,
        maxMarketValue: null,
        minAge: null,
        maxAge: null,
        foot: '',
        minHeight: null,
        maxHeight: null,
        contract: ''
    };
    
    // Update club filter with all clubs (since no league is selected)
    updateClubFilter();
    clubFilter.value = '';
    
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

// ==================== FUNCIONES PARA GESTIONAR LISTAS DE FAVORITOS ====================

// Cargar listas de favoritos desde el servidor
function loadFavoriteLists(containerId, selectedPlayerId = null) {
    const container = document.getElementById(containerId);
    
    // Mostrar spinner de carga
    container.innerHTML = `
        <div class="text-center py-3">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
        </div>
    `;
    
    fetch('/api/favorite_lists')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Limpiar contenedor
                container.innerHTML = '';
                
                // Verificar si hay listas
                if (Object.keys(data.lists).length === 0) {
                    container.innerHTML = `
                        <div class="alert alert-info">
                            No tienes listas de favoritos. ¡Crea una nueva!
                        </div>
                    `;
                    return;
                }
                
                // Ordenar listas (default primero, luego por nombre)
                const sortedLists = Object.entries(data.lists).sort((a, b) => {
                    if (a[0] === 'default') return -1;
                    if (b[0] === 'default') return 1;
                    return a[1].name.localeCompare(b[1].name);
                });
                
                // Añadir cada lista al contenedor
                sortedLists.forEach(([listId, list]) => {
                    const listElement = document.createElement('a');
                    listElement.href = '#';
                    listElement.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
                    listElement.setAttribute('data-list-id', listId);
                    
                    // Si estamos en el modal de selección para añadir jugador
                    if (selectedPlayerId) {
                        listElement.addEventListener('click', (e) => {
                            e.preventDefault();
                            addPlayerToList(listId, selectedPlayerId);
                        });
                        
                        // Verificar si el jugador ya está en esta lista
                        const isInList = list.players.includes(selectedPlayerId);
                        if (isInList) {
                            listElement.classList.add('active');
                        }
                    } else {
                        // Estamos en el modal principal de gestión de listas
                        listElement.addEventListener('click', (e) => {
                            e.preventDefault();
                            showListDetails(listId, list);
                        });
                    }
                    
                    listElement.innerHTML = `
                        <div>
                            <i class="fas fa-${listId === 'default' ? 'star' : 'list'} me-2"></i>
                            ${list.name}
                        </div>
                        <span class="badge bg-primary rounded-pill">${list.players.length}</span>
                    `;
                    
                    container.appendChild(listElement);
                });
                
                // Si no estamos en el modal de selección, mostrar detalles de la primera lista
                if (!selectedPlayerId && sortedLists.length > 0) {
                    showListDetails(sortedLists[0][0], sortedLists[0][1]);
                }
            } else {
                container.innerHTML = `
                    <div class="alert alert-danger">
                        Error cargando listas: ${data.message || 'Error desconocido'}
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error cargando listas de favoritos:', error);
            container.innerHTML = `
                <div class="alert alert-danger">
                    Error de conexión al cargar listas.
                </div>
            `;
        });
}

// Mostrar detalles de una lista seleccionada
function showListDetails(listId, list) {
    const nameElement = document.getElementById('selected-list-name');
    const descriptionElement = document.getElementById('selected-list-description');
    const playersContainer = document.getElementById('list-players-container');
    const editButton = document.getElementById('edit-list-btn');
    const deleteButton = document.getElementById('delete-list-btn');
    
    // Actualizar nombre y descripción
    nameElement.textContent = list.name;
    descriptionElement.textContent = list.description || 'Sin descripción';
    
    // Resaltar la lista seleccionada
    document.querySelectorAll('#favorite-lists-container .list-group-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`#favorite-lists-container [data-list-id="${listId}"]`).classList.add('active');
    
    // Mostrar/ocultar botones de edición y eliminación
    if (listId === 'default') {
        // Solo permitir editar la lista predeterminada, no eliminarla
        editButton.classList.remove('d-none');
        deleteButton.classList.add('d-none');
    } else {
        editButton.classList.remove('d-none');
        deleteButton.classList.remove('d-none');
    }
    
    // Cargar jugadores de la lista
    playersContainer.innerHTML = `
        <div class="text-center py-3">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
        </div>
    `;
    
    // Verificar si hay jugadores en la lista
    if (list.players.length === 0) {
        playersContainer.innerHTML = `
            <div class="alert alert-info">
                No hay jugadores en esta lista.
            </div>
        `;
        return;
    }
    
    // Filtrar jugadores de la lista del array global
    const listPlayers = allPlayers.filter(player => list.players.includes(player.id));
    
    if (listPlayers.length === 0) {
        playersContainer.innerHTML = `
            <div class="alert alert-warning">
                Los jugadores de esta lista no están cargados actualmente.
            </div>
        `;
        return;
    }
    
    // Crear mini tarjetas para cada jugador
    playersContainer.innerHTML = '';
    listPlayers.forEach(player => {
        const playerCard = document.createElement('div');
        playerCard.className = 'card mb-2';
        
        // Determinar clase de percentil
        let percentileClass = 'text-danger';
        if (player.percentile >= 90) {
            percentileClass = 'text-success';
        } else if (player.percentile >= 70) {
            percentileClass = 'text-primary';
        } else if (player.percentile >= 40) {
            percentileClass = 'text-warning';
        }
        
        playerCard.innerHTML = `
            <div class="card-body p-2">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${player.name}</strong>
                        <small class="d-block text-muted">${player.position} | ${player.club}</small>
                    </div>
                    <div class="d-flex align-items-center">
                        <span class="badge ${percentileClass} me-2">${player.percentile}</span>
                        <button class="btn btn-sm btn-outline-danger" 
                                onclick="removePlayerFromList('${listId}', '${player.id}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        playersContainer.appendChild(playerCard);
    });
}

// Crear una nueva lista de favoritos
function createNewList(event) {
    event.preventDefault();
    
    const nameInput = document.getElementById('new-list-name');
    const descriptionInput = document.getElementById('new-list-description');
    
    const name = nameInput.value.trim();
    const description = descriptionInput.value.trim();
    
    if (!name) {
        alert('El nombre de la lista es obligatorio');
        return;
    }
    
    fetch('/api/favorite_lists', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: name,
            description: description
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Limpiar formulario
            nameInput.value = '';
            descriptionInput.value = '';
            
            // Recargar listas
            loadFavoriteLists('favorite-lists-container');
            
            // Mostrar mensaje de éxito
            alert(`Lista "${name}" creada con éxito`);
        } else {
            alert('Error al crear la lista: ' + (data.message || 'Error desconocido'));
        }
    })
    .catch(error => {
        console.error('Error creando lista:', error);
        alert('Error de conexión al crear la lista');
    });
}

// Mostrar modal para editar una lista
function showEditListModal() {
    const listId = document.querySelector('#favorite-lists-container .list-group-item.active').getAttribute('data-list-id');
    const listName = document.getElementById('selected-list-name').textContent;
    const listDescription = document.getElementById('selected-list-description').textContent;
    
    // Llenar el formulario de edición
    document.getElementById('edit-list-id').value = listId;
    document.getElementById('edit-list-name').value = listName;
    document.getElementById('edit-list-description').value = listDescription === 'Sin descripción' ? '' : listDescription;
    
    // Mostrar el modal
    const editListModal = new bootstrap.Modal(document.getElementById('editListModal'));
    editListModal.show();
}

// Guardar cambios en una lista
function saveListChanges(event) {
    event.preventDefault();
    
    const listId = document.getElementById('edit-list-id').value;
    const name = document.getElementById('edit-list-name').value.trim();
    const description = document.getElementById('edit-list-description').value.trim();
    
    if (!name) {
        alert('El nombre de la lista es obligatorio');
        return;
    }
    
    fetch(`/api/favorite_lists/${listId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: name,
            description: description
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Cerrar modal
            bootstrap.Modal.getInstance(document.getElementById('editListModal')).hide();
            
            // Recargar listas
            loadFavoriteLists('favorite-lists-container');
            
            // Mostrar mensaje de éxito
            alert(`Lista "${name}" actualizada con éxito`);
        } else {
            alert('Error al actualizar la lista: ' + (data.message || 'Error desconocido'));
        }
    })
    .catch(error => {
        console.error('Error actualizando lista:', error);
        alert('Error de conexión al actualizar la lista');
    });
}

// Mostrar modal para confirmar eliminación de lista
function showDeleteListModal() {
    const listId = document.querySelector('#favorite-lists-container .list-group-item.active').getAttribute('data-list-id');
    const listName = document.getElementById('selected-list-name').textContent;
    
    // Guardar ID y nombre para confirmación
    document.getElementById('delete-list-id').value = listId;
    document.getElementById('delete-list-name').textContent = listName;
    
    // Mostrar el modal
    const deleteListModal = new bootstrap.Modal(document.getElementById('deleteListModal'));
    deleteListModal.show();
}

// Eliminar una lista
function deleteList() {
    const listId = document.getElementById('delete-list-id').value;
    
    fetch(`/api/favorite_lists/${listId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Cerrar modal
            bootstrap.Modal.getInstance(document.getElementById('deleteListModal')).hide();
            
            // Recargar listas
            loadFavoriteLists('favorite-lists-container');
            
            // Mostrar mensaje de éxito
            alert('Lista eliminada con éxito');
        } else {
            alert('Error al eliminar la lista: ' + (data.message || 'Error desconocido'));
        }
    })
    .catch(error => {
        console.error('Error eliminando lista:', error);
        alert('Error de conexión al eliminar la lista');
    });
}

// Añadir un jugador a una lista de favoritos
function addPlayerToList(listId, playerId) {
    fetch(`/api/favorite_lists/${listId}/players`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            player_id: playerId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Actualizar UI
            const listItem = document.querySelector(`#select-list-container [data-list-id="${listId}"]`);
            if (listItem) {
                listItem.classList.add('active');
                
                // Actualizar contador
                const badge = listItem.querySelector('.badge');
                if (badge) {
                    badge.textContent = data.players.length;
                }
            }
            
            // Si es la lista por defecto, actualizar el estado de favorito del jugador
            if (listId === 'default') {
                // Actualizar el icono de favorito en la tarjeta del jugador
                const player = allPlayers.find(p => p.id === playerId);
                if (player) {
                    player.favorite = true;
                    
                    const starIcon = document.querySelector(`.card[data-player-id="${playerId}"] .favorite-icon`);
                    if (starIcon) {
                        starIcon.classList.add('active');
                    }
                }
            }
            
            // Mostrar mensaje de éxito
            const toast = document.createElement('div');
            toast.className = 'position-fixed bottom-0 end-0 p-3';
            toast.style.zIndex = '5';
            toast.innerHTML = `
                <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
                    <div class="toast-header">
                        <strong class="me-auto">Jugador añadido</strong>
                        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                    </div>
                    <div class="toast-body">
                        Jugador añadido a la lista con éxito.
                    </div>
                </div>
            `;
            document.body.appendChild(toast);
            
            // Eliminar el toast después de 3 segundos
            setTimeout(() => {
                toast.remove();
            }, 3000);
        } else {
            alert('Error al añadir el jugador a la lista: ' + (data.message || 'Error desconocido'));
        }
    })
    .catch(error => {
        console.error('Error añadiendo jugador a la lista:', error);
        alert('Error de conexión al añadir el jugador a la lista');
    });
}

// Eliminar un jugador de una lista
function removePlayerFromList(listId, playerId) {
    fetch(`/api/favorite_lists/${listId}/players/${playerId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Recargar detalles de la lista
            const list = document.querySelector(`#favorite-lists-container [data-list-id="${listId}"]`);
            if (list) {
                // Actualizar contador
                const badge = list.querySelector('.badge');
                if (badge) {
                    badge.textContent = data.players.length;
                }
                
                // Simular click para recargar detalles
                list.click();
            }
            
            // Si es la lista por defecto, actualizar el estado de favorito del jugador
            if (listId === 'default') {
                // Actualizar el icono de favorito en la tarjeta del jugador
                const player = allPlayers.find(p => p.id === playerId);
                if (player) {
                    player.favorite = false;
                    
                    const starIcon = document.querySelector(`.card[data-player-id="${playerId}"] .favorite-icon`);
                    if (starIcon) {
                        starIcon.classList.remove('active');
                    }
                    
                    // Si el filtro de favoritos está activo, recargar lista
                    if (currentFilters.favorites) {
                        filterPlayers();
                        displayPlayers();
                    }
                }
            }
        } else {
            alert('Error al eliminar el jugador de la lista: ' + (data.message || 'Error desconocido'));
        }
    })
    .catch(error => {
        console.error('Error eliminando jugador de la lista:', error);
        alert('Error de conexión al eliminar el jugador de la lista');
    });
}
