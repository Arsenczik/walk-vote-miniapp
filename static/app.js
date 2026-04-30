// ========================================
// 🔥 EVENT MANAGER — ВАЙБ-ФРОНТ
// ========================================

const TG = window.Telegram?.WebApp;
let currentUser = { id: 'user1', name: 'Арсен' }; // Заглушка, потом из Telegram
let events = [];
let selectedCategory = '🍖';
let isLoading = false;

// ========================================
// 🚀 ИНИЦИАЛИЗАЦИЯ
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    if (TG) {
        TG.ready();
        TG.expand();
        TG.MainButton.hide();
    }
    
    setupCategoryPicker();
    loadEvents();
    startPulseUpdates();
});

// ========================================
// 📡 API ЗАПРОСЫ
// ========================================

async function apiRequest(url, options = {}) {
    try {
        const res = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        return await res.json();
    } catch (err) {
        console.error('API Error:', err);
        return null;
    }
}

async function loadEvents() {
    if (isLoading) return;
    isLoading = true;
    
    const data = await apiRequest('/api/events');
    if (data) {
        events = Array.isArray(data) ? data : (data.events || []);
        renderEvents();
    }
    
    isLoading = false;
}

// ========================================
// 🎨 ОТРИСОВКА КАРТОЧЕК
// ========================================

function renderEvents() {
    const grid = document.getElementById('eventsGrid');
    
    if (events.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-emoji">🦗</div>
                <p>Пока тихо...</p>
                <p style="font-size: 14px; color: #666; margin-top: 4px;">Самое время создать движуху! 👆</p>
            </div>`;
        return;
    }
    
    // Сортируем по дате
    const sorted = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    grid.innerHTML = sorted.map((event, index) => createEventCard(event, index)).join('');
}

function createEventCard(event, index) {
    const isGoing = event.participants?.includes(currentUser.id);
    const participantCount = event.participants?.length || 0;
    
    // Генерация аватарок
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#ff9ff3', '#54a0ff'];
    const avatars = (event.participants || []).slice(0, 3).map((p, i) => {
        const initial = (p[0] || '?').toUpperCase();
        return `<span class="avatar" style="background-color: ${colors[i % colors.length]};">${initial}</span>`;
    }).join('');
    
    const moreCount = participantCount > 3 ? `<span class="more">+${participantCount - 3}</span>` : '';
    
    return `
        <div class="event-card" onclick="openEventModal('${event.id}')" style="animation-delay: ${index * 0.05}s;">
            <div class="card-emoji">${event.category || '🎉'}</div>
            <div class="card-info">
                <h3>${escapeHtml(event.name)}</h3>
                <div class="card-date">${formatDate(event.date)} • ${event.creator_name || 'Анон'}</div>
                <div class="participants-preview">
                    ${avatars}
                    ${moreCount}
                    ${participantCount === 0 ? '<span style="font-size: 12px; color: #666;">Никого пока</span>' : ''}
                </div>
            </div>
            <button class="rsvp-btn ${isGoing ? 'going' : 'not-going'}" 
                    onclick="event.stopPropagation(); quickRSVP('${event.id}', ${isGoing})">
                ${isGoing ? '✅ ИДУ' : '🔥'}
            </button>
        </div>`;
}

// ========================================
// 🎯 RSVP (быстрое переключение)
// ========================================

async function quickRSVP(eventId, currentlyGoing) {
    const endpoint = currentlyGoing ? '/api/leave' : '/api/join';
    const body = JSON.stringify({ event_id: eventId, user_id: currentUser.id });
    
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
    });
    
    if (res.ok) {
        // Оптимистичное обновление
        const event = events.find(e => e.id === eventId);
        if (event) {
            if (currentlyGoing) {
                event.participants = event.participants.filter(p => p !== currentUser.id);
            } else {
                if (!event.participants) event.participants = [];
                event.participants.push(currentUser.id);
            }
            renderEvents();
            updatePulse();
        }
    }
}

// ========================================
// 📅 СОЗДАНИЕ СОБЫТИЯ
// ========================================

async function createEvent() {
    const name = document.getElementById('eventName').value.trim();
    const description = document.getElementById('eventDesc').value.trim();
    const date = document.getElementById('eventDate').value;
    
    if (!name) {
        shakeElement(document.getElementById('eventName'));
        return;
    }
    if (!date) {
        shakeElement(document.getElementById('eventDate'));
        return;
    }
    
    const body = JSON.stringify({
        name,
        description,
        date,
        category: selectedCategory,
        creator_id: currentUser.id
    });
    
    const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
    });
    
    if (res.ok) {
        hideCreateForm();
        // Очищаем форму
        document.getElementById('eventName').value = '';
        document.getElementById('eventDesc').value = '';
        document.getElementById('eventDate').value = '';
        selectedCategory = '🍖';
        document.querySelectorAll('.cat-option').forEach(o => o.classList.remove('active'));
        document.querySelector('.cat-option[data-cat="🍖"]')?.classList.add('active');
        
        await loadEvents();
        updatePulse();
        
        // Показываем уведомление
        showToast('✅ Событие создано!');
    } else {
        showToast('❌ Ошибка создания');
    }
}

// ========================================
// 🖼️ МОДАЛКИ
// ========================================

function showCreateForm() {
    const form = document.getElementById('createForm');
    form.style.display = 'flex';
    setTimeout(() => form.classList.add('active'), 10);
}

function hideCreateForm() {
    const form = document.getElementById('createForm');
    form.classList.remove('active');
    setTimeout(() => form.style.display = 'none', 300);
}

async function openEventModal(eventId) {
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    
    const isGoing = event.participants?.includes(currentUser.id);
    const participantCount = event.participants?.length || 0;
    
    // Получаем полную инфу об участниках
    let participantsHtml = '';
    if (event.participants && event.participants.length > 0) {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#ff9ff3'];
        participantsHtml = event.participants.map((p, i) => {
            const initial = (p[0] || '?').toUpperCase();
            return `
                <span class="participant-badge">
                    <span class="avatar" style="background-color: ${colors[i % colors.length]}; width: 28px; height: 28px; font-size: 12px; margin-left: 0;">
                        ${initial}
                    </span>
                    ${escapeHtml(p)}
                </span>`;
        }).join('');
    }
