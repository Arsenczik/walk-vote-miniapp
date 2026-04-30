console.log('🟢 app.js started');

const TG = window.Telegram?.WebApp;
let currentUser = { id: 'user1', name: 'Арсен' };
let events = [];
let selectedCategory = '🍖';

document.addEventListener('DOMContentLoaded', () => {
    console.log('🟢 DOM loaded');
    
    if (TG) {
        TG.ready();
        TG.expand();
    }
    
    setupCategoryPicker();
    loadEvents();
    startPulseUpdates();
    
    // Закрытие модалок
    const eventModal = document.getElementById('eventModal');
    if (eventModal) {
        eventModal.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeEventModal();
        });
    }
    
    const profileModal = document.getElementById('profileModal');
    if (profileModal) {
        profileModal.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeProfileModal();
        });
    }
    
    console.log('🟢 Init complete');
});

// ========================================
// 📡 ЗАГРУЗКА СОБЫТИЙ
// ========================================

async function loadEvents() {
    console.log('📡 Loading events...');
    try {
        const res = await fetch('/api/events');
        console.log('📡 Response:', res.status);
        const data = await res.json();
        console.log('📡 Data:', data);
        events = Array.isArray(data) ? data : [];
    } catch (err) {
        console.error('❌ Load error:', err);
        events = [];
    }
    renderEvents();
}

// ========================================
// 🎨 ОТРИСОВКА
// ========================================

function renderEvents() {
    const grid = document.getElementById('eventsGrid');
    if (!grid) {
        console.error('❌ eventsGrid not found!');
        return;
    }
    
    if (!events || events.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-emoji">🦗</div>
                <p>Пока тихо...</p>
                <p style="font-size: 13px;">Жми на <b>+</b> и создавай движуху!</p>
            </div>`;
        return;
    }
    
    const sorted = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));
    grid.innerHTML = sorted.map((event, index) => createEventCard(event, index)).join('');
}

function createEventCard(event, index) {
    const isGoing = event.participants?.includes(currentUser.id);
    const participantCount = event.participants?.length || 0;
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7'];
    const avatars = (event.participants || []).slice(0, 3).map((p, i) => {
        const initial = (p[0] || '?').toUpperCase();
        return `<span class="avatar" style="background-color: ${colors[i % colors.length]};">${initial}</span>`;
    }).join('');
    const moreCount = participantCount > 3 ? `<span class="more">+${participantCount - 3}</span>` : '';
    
    return `
        <div class="event-card" onclick="openEventModal('${event.id}')">
            <div class="card-emoji">${event.category || '🎉'}</div>
            <div class="card-info">
                <h3>${escapeHtml(event.name)}</h3>
                <div class="card-date">${formatDate(event.date)} · ${escapeHtml(event.creator_name || 'Анон')}</div>
                <div class="participants-preview">
                    ${avatars}
                    ${moreCount}
                </div>
            </div>
            <button class="rsvp-btn ${isGoing ? 'going' : 'not-going'}" 
                    onclick="event.stopPropagation(); quickRSVP('${event.id}', ${isGoing})">
                ${isGoing ? '✅' : '🔥'}
            </button>
        </div>`;
}

// ========================================
// 🎯 RSVP
// ========================================

async function quickRSVP(eventId, currentlyGoing) {
    const endpoint = currentlyGoing ? '/api/leave' : '/api/join';
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event_id: eventId, user_id: currentUser.id })
        });
        if (res.ok) {
            const event = events.find(e => e.id === eventId);
            if (event) {
                if (currentlyGoing) {
                    event.participants = event.participants.filter(p => p !== currentUser.id);
                } else {
                    if (!event.participants) event.participants = [];
                    event.participants.push(currentUser.id);
                }
                renderEvents();
            }
        }
    } catch (err) {
        console.error('RSVP error:', err);
    }
}

// ========================================
// 📅 СОЗДАНИЕ
// ========================================

function showCreateForm() {
    const form = document.getElementById('createForm');
    if (form) {
        form.style.display = 'flex';
        setTimeout(() => document.getElementById('eventName')?.focus(), 300);
    }
}

function hideCreateForm() {
    const form = document.getElementById('createForm');
    if (form) form.style.display = 'none';
}

async function createEvent() {
    const name = document.getElementById('eventName')?.value?.trim();
    const description = document.getElementById('eventDesc')?.value?.trim();
    const date = document.getElementById('eventDate')?.value;
    
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
                description,
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
            loadEvents();
        }
    } catch (err) {
        console.error('Create error:', err);
        alert('Ошибка создания');
    }
}

// ========================================
// 🖼️ МОДАЛКИ
// ========================================

function openEventModal(eventId) {
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    
    const isGoing = event.participants?.includes(currentUser.id);
    const participantCount = event.participants?.length || 0;
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7'];
    
    let participantsHtml = '<p style="color: #999;">Пока никто</p>';
    if (event.participants?.length > 0) {
        participantsHtml = event.participants.map((p, i) => {
            const initial = (p[0] || '?').toUpperCase();
            return `<span class="participant-badge">
                <span class="avatar" style="background-color: ${colors[i % 5]}; width: 26px; height: 26px; font-size: 11px; margin-left: 0;">${initial}</span>
                ${escapeHtml(p)}
            </span>`;
        }).join('');
    }
    
    const modal = document.getElementById('modalContent');
    if (modal) {
        modal.innerHTML = `
            <div class="modal-emoji">${event.category || '🎉'}</div>
            <h2>${escapeHtml(event.name)}</h2>
            <div class="modal-date">📅 ${formatDateFull(event.date)}</div>
            <div class="modal-creator">👤 ${escapeHtml(event.creator_name || 'Некто')}</div>
            ${event.description ? `<p>${escapeHtml(event.description)}</p>` : ''}
            <p>👥 Участники (${participantCount})</p>
            <div class="participants-list">${participantsHtml}</div>
            <div class="modal-actions">
                <button class="rsvp-btn ${isGoing ? 'going' : 'not-going'}" onclick="quickRSVP('${event.id}', ${isGoing}); closeEventModal();">
                    ${isGoing ? '✅ Я ИДУ' : '🔥 БУДУ!'}
                </button>
                <button onclick="closeEventModal()" style="background:#3a3a3a; color:white; border:none; border-radius:12px; padding:14px;">Закрыть</button>
            </div>`;
    }
    
    const eventModal = document.getElementById('eventModal');
    if (eventModal) eventModal.style.display = 'flex';
}

function closeEventModal() {
    const modal = document.getElementById('eventModal');
    if (modal) modal.style.display = 'none';
    loadEvents();
}

// ========================================
// 👤 ПРОФИЛЬ
// ========================================

async function showMyProfile() {
    try {
        const res = await fetch(`/api/profile/${currentUser.id}`);
        const data = await res.json();
        
        const profileContent = document.getElementById('profileContent');
        if (!profileContent) return;
        
        if (data.error) {
            profileContent.innerHTML = `<div style="text-align:center;padding:20px;"><p>${data.error}</p><button onclick="closeProfileModal()" style="padding:10px 20px;background:#3a3a3a;color:white;border:none;border-radius:10px;">Закрыть</button></div>`;
        } else {
            const { user, achievements, stats } = data;
            let achHtml = achievements?.map(a => 
                `<span class="achievement-badge"><span class="achievement-emoji">${a.emoji}</span> ${a.name}</span>`
            ).join('') || '<p>Нет ачивок</p>';
            
            profileContent.innerHTML = `
                <div style="text-align:center;"><div style="font-size:64px;">👤</div><h2>${escapeHtml(user.name)}</h2></div>
                <div class="stats-grid">
                    <div class="stat-card"><div class="stat-value">${stats.created}</div><div class="stat-label">Создано</div></div>
                    <div class="stat-card"><div class="stat-value">${stats.attended}</div><div class="stat-label">Посещено</div></div>
                </div>
                <p>🏆 Ачивки</p><div class="achievements-list">${achHtml}</div>
                <button onclick="closeProfileModal()" style="width:100%;padding:14px;background:#3a3a3a;color:white;border:none;border-radius:12px;">Закрыть</button>`;
        }
        
        const profileModal = document.getElementById('profileModal');
        if (profileModal) profileModal.style.display = 'flex';
    } catch (err) {
        console.error('Profile error:', err);
        alert('Не удалось загрузить профиль');
    }
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) modal.style.display = 'none';
}

// ========================================
// ⚙️ УТИЛИТЫ
// ========================================

function setupCategoryPicker() {
    document.querySelectorAll('.cat-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.cat-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            selectedCategory = opt.dataset.cat;
        });
    });
    const first = document.querySelector('.cat-option');
    if (first) first.classList.add('active');
}

function startPulseUpdates() {
    updatePulse();
    setInterval(updatePulse, 10000);
}

function updatePulse() {
    const pulseText = document.getElementById('pulseText');
    if (!pulseText) return;
    if (!events?.length) {
        pulseText.textContent = 'Ждём первую движуху... 🎉';
        return;
    }
    const recent = events[events.length - 1];
    pulseText.textContent = `${recent.creator_name || 'Кто-то'} создал "${recent.name}"`;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatDateFull(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

console.log('🟢 app.js loaded successfully!');
