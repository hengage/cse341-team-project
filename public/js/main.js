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
    if (!listEl || !templateEl || !passengerTemplateEl) {
        return;
    }

    try {
        const response = await fetch('/api/bookings');
        if (!response.ok) {
            throw new Error(`Failed to load bookings (${response.status})`);
        }

        const payload = await response.json();
        const bookings = payload || [];
        const fragment = document.createDocumentFragment();

        bookings.forEach((booking) => {
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
        listEl.appendChild(fragment);
    } catch (error) {
        console.error(error);
        return;
    }
};

const hookUsersHydration = async () => {
    const listEl = document.getElementById('users-list');
    const templateEl = document.getElementById('user-card-template');
    const updateTemplateEl = document.getElementById('user-update-template');
    const paginationTemplateEl = document.getElementById('users-pagination-template');
    
    if (!listEl || !templateEl || !updateTemplateEl) {
        return;
    }

    let currentPage = 1;
    let limit = 3;
    let search = '';
    let filter = '';

    const searchInputEl = document.getElementById('search');
    const searchButtonEl = document.getElementById('search-button');
    const filterAdminEl = document.getElementById('filter-admin');
    const filterUserEl = document.getElementById('filter-user');
    
    try {
        const renderUsers = (payload) => {
            const fragment = document.createDocumentFragment();
            fragment.id = 'users-fragment';
            payload.users.forEach((user) => {
                const card = templateEl.content.cloneNode(true);
                const userCard = card.querySelector('div');
                userCard.dataset.userId = user._id;

                userCard.querySelector('#user-id').textContent = `Id: ${user._id}`;
                userCard.querySelector('#user-display-name').textContent = `Display Name: ${user.displayName}`;
                userCard.querySelector('#user-username').textContent = `Username: ${user.username}`;
                userCard.querySelector('#user-email').textContent = `Email: ${user.email}`;
                userCard.querySelector('#user-role').textContent = `Role: ${user.role.name}`;

                fragment.appendChild(card);
            });

            if (payload.totalPages === 0) {
                listEl.innerHTML = '<p>No users found.</p>';
                return;
            }

            const paginationControls = paginationTemplateEl.content.cloneNode(true);
            if (payload.hasPreviousPage) {
                paginationControls.querySelector('#previous-page').disabled = false;
            } else {
                paginationControls.querySelector('#previous-page').disabled = true;
            }

            if (payload.hasNextPage) {
                paginationControls.querySelector('#next-page').disabled = false;
            } else {
                paginationControls.querySelector('#next-page').disabled = true;
            }

            paginationControls.querySelector('#current-page').textContent = payload.totalPages > 1 ? `${payload.page} of ${payload.totalPages}` : '1';

            paginationControls.querySelector('#previous-page').addEventListener('click', async () => {
                currentPage = currentPage - 1;
                renderUsers(await loadAllUsers());
            });
            paginationControls.querySelector('#next-page').addEventListener('click', async () => {
                currentPage = currentPage + 1;
                renderUsers(await loadAllUsers());
            });

            listEl.innerHTML = '';

            listEl.appendChild(fragment);

            listEl.appendChild(paginationControls);
        };

        const loadAllUsers = async () => {
            const response = await fetch(`/api/users?q=${search}&filter=${filter}&page=${currentPage}&limit=${limit}`);
            if (!response.ok) {
                throw new Error(`Failed to load users (${response.status})`);
            }
            const payload = await response.json();

            if (!Array.isArray(payload.users)) {
                payload.users = [payload.users];
            }
            return payload || [];
        };

        const payload = await loadAllUsers();
        renderUsers(payload);

        listEl.addEventListener('click', async (event) => {
            const button = event.target.closest('button[data-action]');
            if (!button) return;
            const card = button.closest('[data-user-id]');
            const userId = card.dataset.userId;

            if (button.dataset.action === 'delete') {
                await fetch(`/api/users/${userId}`, { method: 'DELETE' });
                card.remove();
                renderUsers(payload);
            }
            if (button.dataset.action === 'update') {
                const user = payload.users.find(u => u._id === userId);
                const updateForm = updateTemplateEl.content.cloneNode(true);
                updateForm.querySelector('[data-user-id]').dataset.userId = user._id;
                updateForm.querySelector('#update-display-name').value = user.displayName;
                updateForm.querySelector('#update-username').value = user.username;
                updateForm.querySelector('#update-email').value = user.email;
                updateForm.querySelector(`#update-role[value="${user.role.name}"]`).checked = true;

                updateForm.querySelector('form').addEventListener('submit', async (event) => {
                    event.preventDefault();
                    const formData = new FormData(event.target);
                    const updatedUser = {
                        displayName: formData.get('update-display-name'),
                        username: formData.get('update-username'),
                        email: formData.get('update-email'),
                        role: formData.get('update-role')
                    };
                    console.log(formData.forEach((value, key) => console.log(`${key}: ${value}`)));
                    await fetch(`/api/users/${user._id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatedUser)
                    });
                    listEl.innerHTML = '';
                    renderUsers(await loadAllUsers());
                });

                card.replaceWith(updateForm);
            }
            if (button.dataset.action === 'cancel') {
                const user = payload.users.find(u => u._id === userId);
                const newCard = templateEl.content.cloneNode(true);
                newCard.querySelector('[data-user-id]').dataset.userId = user._id;
                newCard.querySelector('#user-id').textContent = `Id: ${user._id}`;
                newCard.querySelector('#user-display-name').textContent = `Display Name: ${user.displayName}`;
                newCard.querySelector('#user-username').textContent = `Username: ${user.username}`;
                newCard.querySelector('#user-email').textContent = `Email: ${user.email}`;
                newCard.querySelector('#user-role').textContent = `Role: ${user.role.name}`;
                
                card.replaceWith(newCard);
            }
        });

        searchButtonEl.addEventListener('click', async () => {
            search = searchInputEl.value;
            
            if (filterAdminEl.checked) {
                filter = 'admin';
            } else if (filterUserEl.checked) {
                filter = 'user';
            }
            
            currentPage = 1;
            renderUsers(await loadAllUsers());
        });
    } catch (error) {
        console.error(error);
        return;
    }
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
    hookUsersHydration();
    hookScheduleHydration();
});