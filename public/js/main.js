const hookRegionSorter = () => {
    const regionSelect = document.getElementById('region-filter');
    if (regionSelect) {
        regionSelect.addEventListener('change', () => {
            const selectedRegion = regionSelect.value;
            const url = new URL(window.location.href);

            if (selectedRegion && selectedRegion !== 'all') {
                url.searchParams.set('region', selectedRegion);
            } else {
                url.searchParams.delete('region');
            }
            
            window.location.href = url.toString();
        });
    }
};

const hookSeasonSorter = () => {
    const seasonSelect = document.getElementById('season-filter');
    if (seasonSelect) {
        seasonSelect.addEventListener('change', () => {
            const selectedSeason = seasonSelect.value;
            const url = new URL(window.location.href);

            if (selectedSeason && selectedSeason !== 'all') {
                url.searchParams.set('season', selectedSeason);
            } else {
                url.searchParams.delete('season');
            }
            
            window.location.href = url.toString();
        });
    }
};

const hookTrainsCatalog = async () => {
    const listEl = document.getElementById('trains-list');
    const templateEl = document.getElementById('train-card-template');
    const loadingEl = document.getElementById('trains-loading');
    const errorEl = document.getElementById('trains-error');

    if (!listEl || !templateEl) {
        return;
    }

    try {
        const response = await fetch('/api/trains');
        if (!response.ok) {
            throw new Error(`Failed to load trains (${response.status})`);
        }

        const payload = await response.json();
        const trains = payload.trains || [];
        const fragment = document.createDocumentFragment();

        trains.forEach((train) => {
            const card = templateEl.content.cloneNode(true);
            const imageEl = card.querySelector('[data-field="image"]');

            imageEl.src = train.imageUrl;
            imageEl.alt = train.imageAlt || `${train.name} train`;

            card.querySelector('[data-field="name"]').textContent = train.name;
            card.querySelector('[data-field="operator"]').textContent = train.operator;
            card.querySelector('[data-field="type"]').textContent = train.type;
            card.querySelector('[data-field="speed"]').textContent = `${train.maxSpeedKmh} km/h`;
            card.querySelector('[data-field="seats"]').textContent = `${train.capacity} seats`;
            card.querySelector('[data-field="power"]').textContent = train.powerSource;
            card.querySelector('[data-field="description"]').textContent = train.description;
            card.querySelector('[data-field="best-for"]').textContent = train.bestFor;

            fragment.appendChild(card);
        });

        listEl.replaceChildren(fragment);
        if (loadingEl) {
            loadingEl.hidden = true;
        }
    } catch (error) {
        if (loadingEl) {
            loadingEl.hidden = true;
        }
        if (errorEl) {
            errorEl.hidden = false;
            errorEl.textContent = 'Unable to load trains right now. Please try again in a moment.';
        }
    }
};

const hookBookingsHydration = async () => {
    const listEl = document.getElementById('bookings-list');
    const templateEl = document.getElementById('booking-card-template');
    const passengerTemplateEl = document.getElementById('passenger-card-template');
    const loadingEl = document.getElementById('bookings-loading');
    const errorEl = document.getElementById('bookings-error');
    const emptyEl = document.getElementById('bookings-empty');
    const paginationEl = document.getElementById('bookings-pagination');
    const pageInfoEl = document.getElementById('bookings-page-info');
    const previousButton = document.getElementById('bookings-previous');
    const nextButton = document.getElementById('bookings-next');
    const filtersForm = document.getElementById('booking-filters');
    const ticketClassFilter = document.getElementById('booking-ticket-class');
    const startDateFilter = document.getElementById('booking-start-date');
    const endDateFilter = document.getElementById('booking-end-date');
    const clearFiltersButton = document.getElementById('booking-clear-filters');

    if (!listEl || !templateEl || !passengerTemplateEl || !loadingEl || !errorEl || !emptyEl
        || !paginationEl || !pageInfoEl || !previousButton || !nextButton || !filtersForm
        || !ticketClassFilter || !startDateFilter || !endDateFilter || !clearFiltersButton) {
        return;
    }

    let currentPage = 1;
    let activeFilters = { ticketClass: null, startDate: null, endDate: null };

    const updatePagination = (pagination) => {
        pageInfoEl.textContent = pagination.totalItems === 0
            ? 'No bookings'
            : `Page ${pagination.page} of ${pagination.totalPages} (${pagination.totalItems} bookings)`;
        previousButton.disabled = !pagination.hasPreviousPage;
        nextButton.disabled = !pagination.hasNextPage;
        paginationEl.hidden = false;
    };

    const loadPage = async (page) => {
        loadingEl.hidden = false;
        errorEl.hidden = true;
        emptyEl.hidden = true;
        paginationEl.hidden = true;
        listEl.replaceChildren();
        previousButton.disabled = true;
        nextButton.disabled = true;

        try {
            const query = new URLSearchParams({ page: String(page), limit: '10' });
            Object.entries(activeFilters).forEach(([key, value]) => {
                if (value) {
                    query.set(key, value);
                }
            });

            const response = await fetch(`/api/bookings?${query.toString()}`);
            if (!response.ok) {
                throw new Error(`Failed to load bookings (${response.status})`);
            }

            const payload = await response.json();
            if (!Array.isArray(payload.bookings) || !payload.pagination) {
                throw new Error('Invalid bookings response');
            }

            const fragment = document.createDocumentFragment();
            payload.bookings.forEach((booking) => {
                const card = templateEl.content.cloneNode(true);

                card.querySelector('#booking-reference p').textContent = `Booking Reference: ${booking.id}`;
                card.querySelector('#ticket-class p').textContent = `Ticket Class: ${booking.ticketClass}`;
                card.querySelector('#selected-day p').textContent = `Selected Day: ${booking.selectedDay}`;
                card.querySelector('#booked-on p').textContent = `Booked On: ${booking.createdAt}`;

                const passengersEl = card.querySelector('#passengers');
                (booking.passengers || []).forEach((passenger) => {
                    const passengerCard = passengerTemplateEl.content.cloneNode(true);
                    passengerCard.querySelector('#passenger-name').textContent = `Passenger Name: ${passenger.firstName} ${passenger.lastName}`;
                    passengerCard.querySelector('#passenger-email').textContent = `Passenger Email: ${passenger.email}`;
                    passengerCard.querySelector('#passenger-phone').textContent = `Passenger Phone: ${passenger.phone}`;
                    passengersEl.appendChild(passengerCard);
                });

                fragment.appendChild(card);
            });

            listEl.replaceChildren(fragment);
            currentPage = payload.pagination.page;
            loadingEl.hidden = true;
            emptyEl.hidden = payload.bookings.length > 0;
            updatePagination(payload.pagination);
        } catch (error) {
            loadingEl.hidden = true;
            errorEl.textContent = 'Unable to load bookings right now. Please try again in a moment.';
            errorEl.hidden = false;
            console.error(error);
        }
    };

    previousButton.addEventListener('click', () => {
        if (currentPage > 1) {
            loadPage(currentPage - 1);
        }
    });

    nextButton.addEventListener('click', () => {
        if (!nextButton.disabled) {
            loadPage(currentPage + 1);
        }
    });

    filtersForm.addEventListener('submit', (event) => {
        event.preventDefault();
        activeFilters = {
            ticketClass: ticketClassFilter.value || null,
            startDate: startDateFilter.value || null,
            endDate: endDateFilter.value || null
        };
        currentPage = 1;
        loadPage(currentPage);
    });

    clearFiltersButton.addEventListener('click', () => {
        filtersForm.reset();
        activeFilters = { ticketClass: null, startDate: null, endDate: null };
        currentPage = 1;
        loadPage(currentPage);
    });

    loadPage(currentPage);
};

const hookScheduleHydration = () => {
    const detailEl = document.querySelector('.route-detail[data-trip-id]');
    if (!detailEl) {
        return;
    }

    const tripId = detailEl.dataset.tripId;
    const loadingEl = document.getElementById('schedules-loading');
    const errorEl = document.getElementById('schedules-error');
    const emptyEl = document.getElementById('schedules-empty');
    const listEl = document.getElementById('schedules-list');
    const templateEl = document.getElementById('schedule-card-template');
    const monthButtons = document.querySelectorAll('.month-badge[data-month]');

    if (!loadingEl || !errorEl || !emptyEl || !listEl || !templateEl) {
        return;
    }

    const renderSchedules = (schedules) => {
        listEl.replaceChildren();

        const fragment = document.createDocumentFragment();

        schedules.forEach((schedule) => {
            const card = templateEl.content.cloneNode(true);

            card.querySelector('[data-field="departure-time"]').textContent = schedule.departureTime;
            card.querySelector('[data-field="arrival-time"]').textContent = schedule.arrivalTime;

            const daysEl = card.querySelector('[data-field="days"]');
            (schedule.daysOfWeek || []).forEach((day) => {
                const dayEl = document.createElement('span');
                dayEl.className = 'day-badge';
                dayEl.textContent = day;
                daysEl.appendChild(dayEl);
            });

            card.querySelector('[data-field="book-link"]').href = `/trips/booking/${schedule.id}`;

            fragment.appendChild(card);
        });

        listEl.appendChild(fragment);
    };

    const loadSchedules = async (month) => {
        loadingEl.hidden = false;
        errorEl.hidden = true;
        emptyEl.hidden = true;
        listEl.replaceChildren();

        try {
            const url = month === undefined
                ? `/api/trips/${encodeURIComponent(tripId)}/schedules`
                : `/api/trips/${encodeURIComponent(tripId)}/schedules?month=${encodeURIComponent(month)}`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load schedules (${response.status})`);
            }

            const schedules = await response.json();

            loadingEl.hidden = true;

            if (Array.isArray(schedules) && schedules.length === 0) {
                emptyEl.hidden = false;
            } else {
                renderSchedules(schedules);
            }
        } catch (error) {
            loadingEl.hidden = true;
            emptyEl.hidden = true;
            errorEl.hidden = false;
            console.error('Error loading schedules:', error);
        }
    };

    monthButtons.forEach((button) => {
        button.addEventListener('click', () => {
            monthButtons.forEach((otherButton) => {
                otherButton.setAttribute('aria-pressed', 'false');
            });
            button.setAttribute('aria-pressed', 'true');

            loadSchedules(button.dataset.month);
        });
    });

    loadSchedules();
};

document.addEventListener('DOMContentLoaded', () => {
    hookRegionSorter();
    hookSeasonSorter();
    hookTrainsCatalog();
    hookBookingsHydration();
    hookScheduleHydration();
});