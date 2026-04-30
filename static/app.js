console.log('🟢 app.js started');

const TG = window.Telegram?.WebApp;
let currentUser = { id: 'user1', name: 'Арсен' };
let events = [];
let selectedCategory = '🍖';

document.addEventListener('DOMContentLoaded', () => {
    console.log('🟢 DOM loaded');
    loadEvents();
    startPulseUpdates();
    setupCategoryPicker();
    console.log('🟢 Init complete');
});

async function loadEvents() {
    try {
        const res = await fetch('/api/events');
        const data = await res.json();
        events = Array.isArray(data) ? data : [];
    } catch (err) {
        events = [];
    }
    renderEvents();
}

function renderEvents() {
    const grid = document.getElementById('eventsGrid');
    if (!grid) return;
    
    if (!events || events.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-emoji">🦗</div>
                <p>Пока тихо...</p>
            </div>`;
        return;
    }
    
    const sorted = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));
    grid.innerHTML = sorted.map((event, index) => {
        const isGoing = event.participants?.includes(currentUser.id);
        const count = event.participants?.length || 0;
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1'];
        const avatars = (event.participants || []).slice(0, 3).map((p, i) => {
            return `<span class="avatar" style="background-color: ${colors[i]}; width: 24px; height: 24px; font-size: 10px; margin-left:0;">${(p[0]||'?').toUpperCase()}</span>`;
        }).join('');
        
        return `
            <div class="event-card" onclick="openEventModal('${event.id}')">
                <div class="card-emoji">${event.category || '🎉'}</div>
                <div class="card-info">
                    <h3>${event.name || ''}</h3>
                    <div class="card-date">${event.date || ''}</div>
                    <div class="participants-preview">${avatars} ${count > 3 ? '+'+(count-3) : ''}</div>
                </div>
                <button class="rsvp-btn ${isGoing ? 'going' : 'not-going'}" 
                        onclick="event.stopPropagation(); quickRSVP('${event.id}', ${isGoing})">
                    ${isGoing ? '✅' : '🔥'}
                </button>
            </div>`;
    }).join('');
}

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
    } catch (err) {}
}

function openEventModal(eventId) {
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    
    const isGoing = event.participants?.includes(currentUser.id);
    const modal = document.getElementById('modalContent');
    if (!modal) return;
    
    modal.innerHTML = `
        <div class="modal-emoji">${event.category || '🎉'}</div>
        <h2>${event.name || ''}</h2>
        <p>📅 ${event.date || ''}</p>
        <p>👤 ${event.creator_name || ''}</p>
        ${event.description ? '<p>' + event.description + '</p>' : ''}
        <p>👥 Участники: ${event.participants?.length || 0}</p>
        <button class="rsvp-btn ${isGoing ? 'going' : 'not-going'}" 
                onclick="quickRSVP('${event.id}', ${isGoing}); closeEventModal();"
                style="width:100%; padding:14px; margin-bottom:8px;">
            ${isGoing ? '✅ Я ИДУ' : '🔥 БУДУ!'}
        </button>
        <button onclick="closeEventModal()" style="width:100%; padding:14px; background:#3a3a3a; color:white; border:none; border-radius:12px;">
            Закрыть
        </button>`;
    
    document.getElementById('eventModal').style.display = 'flex';
}

async function showMyProfile() {
    try {
        const res = await fetch(`/api/profile/${currentUser.id}`);
        const data = await res.json();
        const pc = document.getElementById('profileContent');
        if (!pc) return;
        
        if (data.error) {
            pc.innerHTML = '<p>' + data.error + '</p><button onclick="closeProfileModal()">Закрыть</button>';
        } else {
            pc.innerHTML = `
                <h2>${data.user.name}</h2>
                <p>Создано: ${data.stats.created} | Посещено: ${data.stats.attended}</p>
                <p>Ачивки: ${data.achievements?.length || 0}</p>
                <button onclick="closeProfileModal()" style="width:100%; padding:14px; background:#3a3a3a; color:white; border:none; border-radius:12px;">Закрыть</button>`;
        }
        document.getElementById('profileModal').style.display = 'flex';
    } catch (err) {}
}

function setupCategoryPicker() {
    document.querySelectorAll('.cat-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.cat-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            selectedCategory = opt.dataset.cat;
        });
    });
}

function startPulseUpdates() {
    updatePulse();
    setInterval(updatePulse, 10000);
}

function updatePulse() {
    const pt = document.getElementById('pulseText');
    if (!pt) return;
    if (!events?.length) {
        pt.textContent = 'Ждём первую движуху...';
        return;
    }
    pt.textContent = 'Событий: ' + events.length;
}

console.log('🟢 app.js done');
