/* Qwixx Scorecard Logic */

// Game state
let state = {
    red: { crossed: [], locked: false },
    yellow: { crossed: [], locked: false },
    green: { crossed: [], locked: false },
    blue: { crossed: [], locked: false },
    penalties: [false, false, false, false],
    history: []
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    updateDisplay();
});

// Cross out a number
function crossNumber(row, value) {
    const rowState = state[row];
    
    // Check if row is locked
    if (rowState.locked) return;
    
    // Check if already crossed
    if (rowState.crossed.includes(value)) return;
    
    // Check if number is to the right of all crossed numbers (according to row direction)
    const valid = isValidCross(row, value);
    if (!valid) {
        showMessage('Numbers must be crossed from left to right!', 'error');
        return;
    }
    
    // Save state for undo
    saveHistory();
    
    // Add to crossed
    rowState.crossed.push(value);
    rowState.crossed.sort((a, b) => {
        // Red and yellow: ascending (2-12)
        // Green and blue: descending (12-2)
        if (row === 'red' || row === 'yellow') return a - b;
        return b - a;
    });
    
    // Check if max number crossed (can lock)
    const maxVal = (row === 'red' || row === 'yellow') ? 12 : 2;
    if (value === maxVal && rowState.crossed.length >= 5) {
        // Auto-prompt to lock? Nah, let them click the lock
    }
    
    updateDisplay();
    saveState();
}

// Check if cross is valid (left-to-right rule)
function isValidCross(row, value) {
    const crossed = state[row].crossed;
    
    // Red and yellow: must be >= all crossed (ascending 2-12)
    if (row === 'red' || row === 'yellow') {
        if (crossed.length === 0) return true;
        return value >= Math.max(...crossed);
    }
    
    // Green and blue: must be <= all crossed (descending 12-2)
    if (row === 'green' || row === 'blue') {
        if (crossed.length === 0) return true;
        return value <= Math.min(...crossed);
    }
    
    return true;
}

// Toggle lock on a row
function toggleLock(row) {
    const rowState = state[row];
    
    // Can only lock if >= 5 crosses and max number is crossed
    const maxVal = (row === 'red' || row === 'yellow') ? 12 : 2;
    const hasMax = rowState.crossed.includes(maxVal);
    
    if (!rowState.locked && rowState.crossed.length < 5) {
        showMessage('Need 5+ crosses to lock!', 'error');
        return;
    }
    
    if (!rowState.locked && !hasMax) {
        showMessage(`Must cross ${maxVal} to lock!`, 'error');
        return;
    }
    
    saveHistory();
    rowState.locked = !rowState.locked;
    updateDisplay();
    saveState();
}

// Toggle penalty
function togglePenalty(index) {
    saveHistory();
    state.penalties[index] = !state.penalties[index];
    updateDisplay();
    saveState();
}

// Calculate score for a row
function calculateRowScore(crossedCount) {
    if (crossedCount === 0) return 0;
    // Triangular number: n(n+1)/2
    return crossedCount * (crossedCount + 1) / 2;
}

// Calculate total score
function calculateTotal() {
    const rows = ['red', 'yellow', 'green', 'blue'];
    let total = 0;
    
    rows.forEach(row => {
        const crossed = state[row].crossed.length;
        // Add extra point for lock
        const extra = state[row].locked ? 1 : 0;
        const score = calculateRowScore(crossed) + extra;
        total += score;
    });
    
    // Penalties
    const penaltyCount = state.penalties.filter(p => p).length;
    const penaltyScore = penaltyCount * -5;
    
    return { total, penaltyScore };
}

// Update display
function updateDisplay() {
    const rows = ['red', 'yellow', 'green', 'blue'];
    
    // Update each row
    rows.forEach(row => {
        const rowState = state[row];
        const buttons = document.querySelectorAll(`.${row}-row .number`);
        
        buttons.forEach(btn => {
            const val = parseInt(btn.dataset.value);
            
            // Crossed
            if (rowState.crossed.includes(val)) {
                btn.classList.add('crossed');
            } else {
                btn.classList.remove('crossed');
            }
            
            // Disabled (left of crossed for red/yellow, right for green/blue)
            const minCrossed = rowState.crossed.length > 0 ? 
                (row === 'red' || row === 'yellow' ? Math.max(...rowState.crossed) : Math.min(...rowState.crossed)) : null;
            
            if (!rowState.locked && minCrossed !== null) {
                if ((row === 'red' || row === 'yellow') && val < minCrossed) {
                    btn.classList.add('skipped');
                } else if ((row === 'green' || row === 'blue') && val > minCrossed) {
                    btn.classList.add('skipped');
                }
            }
        });
        
        // Lock icon
        const lockIcon = document.querySelector(`.${row}-row .lock-icon`);
        if (rowState.locked) {
            lockIcon.classList.add('locked');
            document.querySelector(`.${row}-row`).classList.add('locked');
        } else {
            lockIcon.classList.remove('locked');
            document.querySelector(`.${row}-row`).classList.remove('locked');
        }
        
        // Row score
        const crossed = rowState.crossed.length;
        const extra = rowState.locked ? 1 : 0;
        const score = calculateRowScore(crossed) + extra;
        document.getElementById(`score-${row}`).textContent = score;
    });
    
    // Penalties
    state.penalties.forEach((active, i) => {
        const btn = document.querySelectorAll('.penalty')[i];
        if (active) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    
    // Total score
    const { total, penaltyScore } = calculateTotal();
    document.getElementById('total-score').textContent = total;
    document.getElementById('score-penalties').textContent = penaltyScore;
}

// Save state to localStorage
function saveState() {
    localStorage.setItem('qwixx-state', JSON.stringify(state));
}

// Load state from localStorage
function loadState() {
    const saved = localStorage.getItem('qwixx-state');
    if (saved) {
        state = JSON.parse(saved);
    }
}

// Save history for undo
function saveHistory() {
    state.history.push(JSON.stringify(state));
    if (state.history.length > 10) {
        state.history.shift();
    }
}

// Undo last action
function undoLast() {
    if (state.history.length === 0) {
        showMessage('Nothing to undo!', 'error');
        return;
    }
    
    const lastState = state.history.pop();
    state = JSON.parse(lastState);
    updateDisplay();
    saveState();
}

// New game - clear all
function newGame() {
    if (!confirm('Start a new game? All progress will be lost.')) return;
    
    state = {
        red: { crossed: [], locked: false },
        yellow: { crossed: [], locked: false },
        green: { crossed: [], locked: false },
        blue: { crossed: [], locked: false },
        penalties: [false, false, false, false],
        history: []
    };
    
    updateDisplay();
    saveState();
}

// Show message
function showMessage(msg, type = 'info') {
    // Could add a toast notification here
    console.log(`${type}: ${msg}`);
}
