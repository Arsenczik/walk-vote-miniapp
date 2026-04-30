// app.js
const tg = window.Telegram?.WebApp;
let currentUser = { id: 'user1', name: 'Ты' }; // Заглушка, потом через Telegram
let events = [];
let selectedCategory = '🍖';
let currentEventId = null;

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    if (tg) {
        tg.ready();
        tg.expand();
        // tg.MainButton.setText('Создать встречу').show().onClick(showCreateForm);
    }
    
    loadEvents();
    setupCategoryPicker();
    updatePulse();
    
    // Закрытие модалки по клику вне карточки
    document.getElementById('eventModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });
});

// Загрузка событий
async function loadEvents() {
    try {
        const res = await fetch('/api/events');
        events = await res.json();
        renderEvents();
    } catch (err) {
        console.error('Ошибка загрузки:', err);
    }
}

// Отрисовка карточек
function renderEvents() {
    const grid = document.getElementById('eventsGrid');
    
    if (events.length === 0) {
        grid.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                <div style="font-size: 48px; margin-bottom: 16px;">🦗</div>
                <p>Пока тишина... Создай первую движуху!</p>
            </div>`;
        return;
    }
    
    grid.innerHTML = events.map(event => {
        const isGoing = event.participants?.includes(currentUser.id);
        const participantCount = event.participants?.length || 0;
        const creator = event.creator_name || 'Некто';
        
        // Генерируем аватарки участников
        const avatars = (event.participants || []).slice(0, 3).map((p, i) => {
            const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7'];
            return `<span class="avatar" style="background-color: ${colors[i]};">${p[0].toUpperCase()}</span>`;
        }).join('');
        
        const moreCount = participantCount > 3 ? `<span class="more">+${participantCount - 3}</span>` : '';
        
        return `
            <div class="event-card" onclick="openModal('${event.id}')">
                <div class="card-emoji">${event.category || '🎉'}</div>
                <div class="card-info">
                    <h3>${event.name}</h3>
                    <div class="card-date">${formatDate(event.date)}</div>
                    <div class="participants-preview">
                        ${avatars}
                        ${moreCount}
                    </div>
                </div>
                <button class="rsvp-btn ${isGoing ? 'going' : 'not-going'}" 
                        onclick="event.stopPropagation(); toggleRSVP('${event.id}')">
                    ${isGoing ? 'ИДУ ✅' : 'ПОЙДУ?'}
                </button>
            </div>`;
    }).join('');
}

// Переключение RSVP
async function toggleRSVP(eventId) {
    const isGoing = events.find(e => e.id === eventId)?.participants?.includes(currentUser.id);
    
    try {
        const res = await fetch(`/api/${isGoing ? 'leave' : 'join'}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event_id: eventId, user_id: currentUser.id })
        });
        
        if (res.ok) {
            await loadEvents();
            updatePulse();
        }
    } catch (err) {
        console.error('Ошибка RSVP:', err);
    }
}

// Открытие модалки с деталями
function openModal(eventId) {
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    
    currentEventId = eventId;
    const isGoing = event.participants?.includes(currentUser.id);
    const participants = (event.participants || []).map(p => {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7'];
        return `<span class="participant-badge">
            <span class="avatar" style="background-color: ${colors[Math.floor(Math.random() * colors.length)]}; width: 24px; height: 24px; font-size: 10px;">
                ${p[0].toUpperCase()}
            </span>
            ${p}
        </span>`;
    }).join('');
    
    document.getElementById('modalContent').innerHTML = `
        <div class="modal-emoji">${event.category || '🎉'}</div>
        <h2>${event.name}</h2>
        <p class="modal-date">📅 ${formatDate(event.date)}</p>
        ${event.description ? `<p style="margin-bottom: 16px; color: var(--text-secondary);">${event.description}</p>` : ''}
        <p style="margin-bottom: 8px;">👥 Участники (${event.participants?.length || 0}):</p>
        <div class="participants-list">
            ${participants}
        </div>
        <button class="rsvp-btn ${isGoing ? 'going' : 'not-going'}" 
                style="width: 100%; padding: 14px; margin-bottom: 8px;"
                onclick="toggleRSVP('${eventId}')">
            ${isGoing ? '✅ Я ИДУ (отменить)' : '🔥 БУДУ!'}
        </button>
        <button class="modal-close" onclick="closeModal()">Закрыть</button>
    `;
    
    document.getElementById('eventModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('eventModal').style.display = 'none';
    loadEvents(); // Обновляем карточки
}

// Показ формы создания
function showCreateForm() {
    document.getElementById('createForm').style.display = 'flex';
}

function hideCreateForm() {
    document.getElementById('createForm').style.display = 'none';
}

// Выбор категории
function setupCategoryPicker() {
    document.querySelectorAll('.cat-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.cat-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            selectedCategory = opt.dataset.cat;
        });
    });
    // Активируем первую категорию
    document.querySelector('.cat-option[data-cat="🍖"]')?.classList.add('active');
}

// Создание события
async function createEvent() {
    const name = document.getElementById('eventName').value.trim();
    const desc = document.getElementById('eventDesc').value.trim();
    const date = document.getElementById('eventDate').value;
    
    if (!name || !date) {
        alert('Название и дата обязательны!');
        return;
    }
    
    try {
        const res = await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                description: desc,
                date,
                category: selectedCategory,
                creator_id: currentUser.id
            })
        });
        
        if (res.ok) {
            hideCreateForm();
            document.getElementById('eventName').value = '';
            document.getElementById('eventDesc').value = '';
            document.getElementById('eventDate').value = '';
            await loadEvents();
        }
    } catch (err) {
        console.error('Ошибка создания:', err);
    }
}

// Обновление пульса
function updatePulse() {
    const recentEvent = events[events.length - 1];
    const pulseText = document.getElementById('pulse-text');
    
    if (pulseText && recentEvent) {
        pulseText.textContent = `🔥 ${recentEvent.creator_name || 'Кто-то'} создал "${recentEvent.name}"`;
    }
}

// Форматирование даты
function formatDate(dateStr) {
    if (!dateStr) return 'Дата не указана';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Профиль (заглушка)
function showMyProfile() {
    alert('👤 Твой профиль и ачивки будут здесь!\n\nСкоро появится...');
}
