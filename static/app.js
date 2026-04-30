// ========================================
// 🔥 EVENT MANAGER — ВАЙБ-ФРОНТ
// ========================================

const TG = window.Telegram?.WebApp;
if (window.Telegram?.WebApp?.initDataUnsafe?.user) {     const tgUser = window.Telegram.WebApp.initDataUnsafe.user;     currentUser = { id: tgUser.id.toString(), name: tgUser.first_name }; } // Заглушка, потом из Telegram
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
    
    // Закрытие модалок по клику вне карточки
    document.getElementById('eventModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeEventModal();
    });
    document.getElementById('profileModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeProfileModal();
    });
    
    // Закрытие формы создания по свайпу вниз (мобилки)
    let touchStartY = 0;
    document.getElementById('createForm').addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    });
    document.getElementById('createForm').addEventListener('touchmove', (e) => {
        const touchY = e.touches[0].clientY;
        if (touchY - touchStartY > 100) {
            hideCreateForm();
        }
    });
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
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Request failed');
        }
        return await res.json();
    } catch (err) {
        console.error('API Error:', err);
        showToast('❌ Ошибка соединения');
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
        updatePulse();
    }
    
    isLoading = false;
}

// ========================================
// 🎨 ОТРИСОВКА КАРТОЧЕК
// ========================================

function renderEvents() {
    const grid = document.getElementById('eventsGrid');
    
    if (!events || events.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-emoji">🦗</div>
                <p>Пока тихо...</p>
                <p style="font-size: 13px; color: #666; margin-top: 6px;">Жми на <b style="color: var(--accent);">+</b> и создавай движуху!</p>
            </div>`;
        return;
    }
    
    // Сортируем по дате (ближайшие сверху)
    const sorted = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    grid.innerHTML = sorted.map((event, index) => createEventCard(event, index)).join('');
}

function createEventCard(event, index) {
    const isGoing = event.participants?.includes(currentUser.id);
    const participantCount = event.participants?.length || 0;
    
    // Генерация аватарок (максимум 3)
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#ff9ff3', '#54a0ff'];
    const avatars = (event.participants || []).slice(0, 3).map((p, i) => {
        const initial = (p[0] || '?').toUpperCase();
        return `<span class="avatar" style="background-color: ${colors[i % colors.length]};">${initial}</span>`;
    }).join('');
    
    const moreCount = participantCount > 3 ? `<span class="more">+${participantCount - 3}</span>` : '';
    const timeStr = formatDate(event.date);
    
    return `
        <div class="event-card" onclick="openEventModal('${event.id}')" style="animation-delay: ${index * 0.05}s;">
            <div class="card-emoji">${event.category || '🎉'}</div>
            <div class="card-info">
                <h3>${escapeHtml(event.name)}</h3>
                <div class="card-date">${timeStr} · ${escapeHtml(event.creator_name || 'Анон')}</div>
                <div class="participants-preview">
                    ${avatars}
                    ${moreCount}
                    ${participantCount === 0 ? '<span style="font-size: 11px; color: #777; margin-left: 4px;">Пока никого</span>' : ''}
                </div>
            </div>
            <button class="rsvp-btn ${isGoing ? 'going' : 'not-going'}" 
                    onclick="event.stopPropagation(); quickRSVP('${event.id}', ${isGoing})">
                ${isGoing ? '✅' : '🔥'}
            </button>
        </div>`;
}

// ========================================
// 🎯 RSVP (быстрое переключение)
// ========================================

async function quickRSVP(eventId, currentlyGoing) {
    const endpoint = currentlyGoing ? '/api/leave' : '/api/join';
    const body = JSON.stringify({ event_id: eventId, user_id: currentUser.id });
    
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body
        });
        
        if (res.ok) {
            // Оптимистичное обновление (без перезагрузки всех событий)
            const event = events.find(e => e.id === eventId);
            if (event) {
                if (!event.participants) event.participants = [];
                if (currentlyGoing) {
                    event.participants = event.participants.filter(p => p !== currentUser.id);
                } else {
                    if (!event.participants.includes(currentUser.id)) {
                        event.participants.push(currentUser.id);
                    }
                }
                renderEvents();
                updatePulse();
            }
        }
    } catch (err) {
        console.error('RSVP Error:', err);
        showToast('❌ Не получилось');
    }
}

// ========================================
// 📅 СОЗДАНИЕ СОБЫТИЯ
// ========================================

async function createEvent() {
    const nameEl = document.getElementById('eventName');
    const descEl = document.getElementById('eventDesc');
    const dateEl = document.getElementById('eventDate');
    
    const name = nameEl.value.trim();
    const description = descEl.value.trim();
    const date = dateEl.value;
    
    // Валидация
    if (!name) {
        shakeElement(nameEl);
        showToast('📝 Название обязательно!');
        return;
    }
    if (!date) {
        shakeElement(dateEl);
        showToast('📅 Выбери дату!');
        return;
    }
    
    // Проверка что дата в будущем
    if (new Date(date) < new Date()) {
        shakeElement(dateEl);
        showToast('⏰ Дата должна быть в будущем!');
        return;
    }
    
    const body = JSON.stringify({
        name,
        description,
        date,
        category: selectedCategory,
        creator_id: currentUser.id
    });
    
    try {
        const res = await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body
        });
        
        if (res.ok) {
            hideCreateForm();
            // Очищаем форму
            nameEl.value = '';
            descEl.value = '';
            dateEl.value = '';
            selectedCategory = '🍖';
            document.querySelectorAll('.cat-option').forEach(o => o.classList.remove('active'));
            document.querySelector('.cat-option[data-cat="🍖"]')?.classList.add('active');
            
            await loadEvents();
            showToast('✅ Событие создано!');
        } else {
            const err = await res.json();
            showToast('❌ ' + (err.error || 'Ошибка создания'));
        }
    } catch (err) {
        console.error('Create Error:', err);
        showToast('❌ Ошибка соединения');
    }
}

// ========================================
// 🖼️ МОДАЛКИ
// ========================================

function showCreateForm() {
    const form = document.getElementById('createForm');
    form.style.display = 'flex';
    // Установка даты по умолчанию (завтра, 19:00)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 0, 0, 0);
    const defaultDate = tomorrow.toISOString().slice(0, 16);
    if (!document.getElementById('eventDate').value) {
        document.getElementById('eventDate').value = defaultDate;
    }
    setTimeout(() => form.classList.add('active'), 10);
    // Фокус на поле названия
    setTimeout(() => document.getElementById('eventName').focus(), 300);
}

function hideCreateForm() {
    const form = document.getElementById('createForm');
    form.classList.remove('active');
    setTimeout(() => {
        form.style.display = 'none';
    }, 300);
}

// Открыть модалку события
async function openEventModal(eventId) {
    const event = events.find(e => e.id === eventId);
    if (!event) {
        // Пробуем загрузить с API
        const data = await apiRequest(`/api/events/${eventId}`);
        if (!data || data.error) {
            showToast('❌ Событие не найдено');
            return;
        }
        // Обновляем в списке
        const idx = events.findIndex(e => e.id === eventId);
        if (idx >= 0) {
            events[idx] = data;
        } else {
            events.push(data);
        }
        return openEventModal(eventId); // Рекурсивно, теперь найдёт
    }
    
    const isGoing = event.participants?.includes(currentUser.id);
    const participantCount = event.participants?.length || 0;
    const isCreator = event.creator_id === currentUser.id;
    
    // Генерируем список участников с аватарками
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#ff9ff3', '#54a0ff', '#5f27cd'];
    let participantsHtml = '<p style="color: #999; font-size: 14px;">Пока никто не записался</p>';
    
    if (event.participants && event.participants.length > 0) {
        participantsHtml = event.participants.map((p, i) => {
            const initial = (p[0] || '?').toUpperCase();
            const isMe = p === currentUser.id;
            return `
                <span class="participant-badge" style="${isMe ? 'border: 2px solid var(--accent);' : ''}">
                    <span class="avatar" style="background-color: ${colors[i % colors.length]}; width: 26px; height: 26px; font-size: 11px; margin-left: 0;">
                        ${initial}
                    </span>
                    ${escapeHtml(p)}
                    ${isMe ? ' (ты)' : ''}
                    ${p === event.creator_id ? ' 👑' : ''}
                </span>`;
        }).join('');
    }
    
    document.getElementById('modalContent').innerHTML = `
        <div class="modal-emoji">${event.category || '🎉'}</div>
        <h2>${escapeHtml(event.name)}</h2>
        <div class="modal-date">📅 ${formatDateFull(event.date)}</div>
        <div class="modal-creator">👤 Организатор: ${escapeHtml(event.creator_name || 'Некто')}</div>
        ${event.description ? `<p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;">${escapeHtml(event.description)}</p>` : ''}
        
        <p style="margin-bottom: 10px; font-weight: 600;">👥 Участники (${participantCount})</p>
        <div class="participants-list">
            ${participantsHtml}
        </div>
        
        <div class="modal-actions">
            <button class="rsvp-btn ${isGoing ? 'going' : 'not-going'}" 
                    style="flex: 2; padding: 14px;"
                    onclick="modalRSVP('${event.id}', ${isGoing})">
                ${isGoing ? '✅ Я ИДУ (отменить)' : '🔥 БУДУ!'}
            </button>
            <button style="flex: 1; padding: 14px; background: #3a3a3a; color: white; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer;"
                    onclick="closeEventModal()">
                ✕
            </button>
        </div>
    `;
    
    document.getElementById('eventModal').style.display = 'flex';
}

async function modalRSVP(eventId, currentlyGoing) {
    await quickRSVP(eventId, currentlyGoing);
    closeEventModal();
    // Небольшая задержка и переоткрытие с обновлёнными данными
    setTimeout(() => openEventModal(eventId), 200);
}

function closeEventModal() {
    document.getElementById('eventModal').style.display = 'none';
    loadEvents(); // Обновляем карточки на фоне
}

// ========================================
// 👤 ПРОФИЛЬ И ЛИДЕРБОРД
// ========================================

async function showMyProfile() {
    const profileData = await apiRequest(`/api/profile/${currentUser.id}`);
    
    if (!profileData || profileData.error) {
        document.getElementById('profileContent').innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 48px;">😕</div>
                <p>Профиль не найден</p>
                <button class="modal-close" style="margin-top: 16px; padding: 12px 24px; background: #3a3a3a; color: white; border: none; border-radius: 12px; cursor: pointer;" onclick="closeProfileModal()">Закрыть</button>
            </div>`;
        document.getElementById('profileModal').style.display = 'flex';
        return;
    }
    
    const { user, achievements, stats } = profileData;
    
    // Ачивки
    let achievementsHtml = '<p style="color: #999; font-size: 14px;">Пока нет ачивок. Участвуй в движухах!</p>';
    if (achievements && achievements.length > 0) {
        achievementsHtml = achievements.map(a => `
            <span class="achievement-badge">
                <span class="achievement-emoji">${a.emoji}</span>
                ${a.name}
            </span>
        `).join('');
    }
    
    document.getElementById('profileContent').innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 64px; margin-bottom: 8px;">👤</div>
            <h2>${escapeHtml(user.name)}</h2>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${stats.created}</div>
                <div class="stat-label">Создано событий</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.attended}</div>
                <div class="stat-label">Посещено</div>
            </div>
        </div>
        
        <p style="font-weight: 600; margin-bottom: 10px;">🏆 Ачивки (${achievements.length})</p>
        <div class="achievements-list">
            ${achievementsHtml}
        </div>
        
        <button onclick="showLeaderboard()" style="width: 100%; padding: 14px; background: var(--accent); color: #000; border: none; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer; margin-bottom: 8px;">
            📊 Рейтинг активности
        </button>
        <button onclick="closeProfileModal()" style="width: 100%; padding: 14px; background: #3a3a3a; color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer;">
            Закрыть
        </button>
    `;
    
    document.getElementById('profileModal').style.display = 'flex';
}

async function showLeaderboard() {
    const data = await apiRequest('/api/leaderboard');
    
    if (!data || data.length === 0) {
        document.getElementById('profileContent').innerHTML += `
            <div style="text-align: center; padding: 20px; color: #999;">
                <p>Нет данных для рейтинга</p>
                <button onclick="showMyProfile()" style="margin-top: 12px; padding: 10px 20px; background: #3a3a3a; color: white; border: none; border-radius: 10px; cursor: pointer;">← Назад</button>
            </div>`;
        return;
    }
    
    const medals = ['🥇', '🥈', '🥉'];
    
    document.getElementById('profileContent').innerHTML = `
        <h2 style="text-align: center; margin-bottom: 20px;">📊 Рейтинг активности</h2>
        
        <div style="display: flex; flex-direction: column; gap: 10px;">
            ${data.slice(0, 10).map((entry, i) => {
                const isMe = entry.user.id === currentUser.id;
                const medal = i < 3 ? medals[i] : `${i + 1}.`;
                return `
                    <div style="display: flex; align-items: center; gap: 12px; background: ${isMe ? 'rgba(78, 205, 196, 0.1)' : 'var(--bg-card)'}; padding: 12px 16px; border-radius: 14px; ${isMe ? 'border: 2px solid var(--accent);' : ''}">
                        <span style="font-size: 22px; min-width: 32px;">${medal}</span>
                        <span style="flex: 1; font-weight: 600;">${escapeHtml(entry.user.name)} ${isMe ? '(ты)' : ''}</span>
                        <span style="color: var(--text-secondary); font-size: 13px;">🏆 ${entry.achievements}</span>
                        <span style="font-weight: 700; color: var(--accent);">${entry.score} очков</span>
                    </div>`;
            }).join('')}
        </div>
        
        <button onclick="showMyProfile()" style="width: 100%; padding: 14px; background: #3a3a3a; color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 16px;">
            ← Назад к профилю
        </button>
    `;
}

function closeProfileModal() {
    document.getElementById('profileModal').style.display = 'none';
}

// ========================================
// 🎯 КАТЕГОРИИ
// ========================================

function setupCategoryPicker() {
    document.querySelectorAll('.cat-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.cat-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            selectedCategory = opt.dataset.cat;
        });
    });
    // Активируем первую
    const first = document.querySelector('.cat-option[data-cat="🍖"]');
    if (first) first.classList.add('active');
}

// ========================================
// 💓 ПУЛЬС КОМЬЮНИТИ
// ========================================

function startPulseUpdates() {
    updatePulse();
    setInterval(updatePulse, 10000); // Обновляем каждые 10 секунд
}

function updatePulse() {
    const pulseText = document.getElementById('pulseText');
    if (!pulseText) return;
    
    if (!events || events.length === 0) {
        pulseText.textContent = 'Ждём первую движуху... 🎉';
        return;
    }
    
    // Случайный факт из жизни комьюнити
    const totalParticipants = events.reduce((sum, e) => sum + (e.participants?.length || 0), 0);
    const sortedByDate = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));
    const nextEvent = sortedByDate.find(e => new Date(e.date) > new Date());
    
    const messages = [];
    
    if (nextEvent) {
        messages.push(`Ближайшее: ${nextEvent.category || '🎉'} ${escapeHtml(nextEvent.name)} — ${formatDate(nextEvent.date)}`);
    }
    
    const recentEvent = events[events.length - 1];
    if (recentEvent) {
        messages.push(`${recentEvent.creator_name || 'Кто-то'} создал "${escapeHtml(recentEvent.name)}"`);
    }
    
    if (totalParticipants > 0) {
        messages.push(`Всего ${totalParticipants} участий в движухах`);
    }
    
    // Выбираем случайное сообщение
    const msg = messages[Math.floor(Math.random() * messages.length)] || 'Движухи ждут! 🔥';
    pulseText.textContent = msg;
}

// ========================================
// 🛠️ УТИЛИТЫ
// ========================================

function formatDate(dateStr) {
    if (!dateStr) return 'Дата не указана';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const isTomorrow = d.toDateString() === tomorrow.toDateString();
        
        const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        
        if (isToday) return `Сегодня · ${time}`;
        if (isTomorrow) return `Завтра · ${time}`;
        
        const day = d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
        return `${day} · ${time}`;
    } catch {
        return dateStr;
    }
}

function formatDateFull(dateStr) {
    if (!dateStr) return 'Дата не указана';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('ru-RU', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dateStr;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function shakeElement(el) {
    el.style.animation = 'none';
    el.offsetHeight; // trigger reflow
    el.style.animation = 'shake 0.5s ease';
    el.style.borderColor = '#ff6b6b';
    setTimeout(() => {
        el.style.animation = '';
        el.style.borderColor = '';
    }, 500);
}

function showToast(message) {
    // Удаляем старый тост если есть
    const oldToast = document.querySelector('.toast');
    if (oldToast) oldToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 60px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--bg-card);
        color: var(--text-primary);
        padding: 12px 24px;
        border-radius: 12px;
        font-weight: 600;
        font-size: 14px;
        z-index: 999;
        box-shadow: 0 8px 30px rgba(0,0,0,0.5);
        border: 1px solid #444;
        animation: slideDown 0.3s ease;
        white-space: nowrap;
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// Добавляем анимации для тостов и шейка
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    @keyframes slideUp {
        from { transform: translateX(-50%) translateY(0); opacity: 1; }
        to { transform: translateX(-50%) translateY(-20px); opacity: 0; }
    }
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-8px); }
        50% { transform: translateX(8px); }
        75% { transform: translateX(-4px); }
    }
`;
document.head.appendChild(styleSheet);

// ========================================
// ⌨️ ГОРЯЧИЕ КЛАВИШИ (для десктопа)
// ========================================

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeEventModal();
        closeProfileModal();
        hideCreateForm();
    }
    if (e.key === 'n' && e.ctrlKey) {
        e.preventDefault();
        showCreateForm();
    }
});
