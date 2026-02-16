const app = {
    values: ['50k', '100k', '200k', '300k', '400k', '500k'],
    envelopes: [], // Array of DOM elements
    gridElement: null,
    startBtn: null,
    confirmBtn: null,
    overlay: null,
    closeOverlayBtn: null,
    isShuffling: false,
    selectedEnvelope: null,
    isGameActive: false,

    init() {
        this.gridElement = document.getElementById('grid');
        this.startBtn = document.getElementById('start-btn');
        this.confirmBtn = document.getElementById('confirm-btn');
        this.overlay = document.getElementById('celebration-overlay');
        this.closeOverlayBtn = document.getElementById('close-overlay');

        this.renderEnvelopes();
        this.bindEvents();
    },

    renderEnvelopes() {
        this.gridElement.innerHTML = '';
        this.envelopes = [];

        this.values.forEach((value, index) => {
            const el = document.createElement('div');
            el.className = 'envelope-item';
            el.dataset.index = index;
            el.dataset.value = value;

            // Front side (Value) - Initially Visible
            const front = document.createElement('div');
            front.className = 'face front';
            front.textContent = value;

            // Back side (Decoration) - Initially Hidden (behind)
            const back = document.createElement('div');
            back.className = 'face back';
            back.innerHTML = '<span class="deco-text">Lì Xì</span><span class="icon">🧧</span>';

            el.appendChild(front);
            el.appendChild(back);
            this.gridElement.appendChild(el);
            this.envelopes.push(el);
        });
    },

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startGame());
        this.confirmBtn.addEventListener('click', () => this.confirmSelection());
        this.closeOverlayBtn.addEventListener('click', () => this.hideOverlay());

        // Event delegation for envelopes
        this.gridElement.addEventListener('click', (e) => {
            const envelope = e.target.closest('.envelope-item');
            if (envelope) {
                this.onEnvelopeClick(envelope);
            }
        });
    },

    async startGame() {
        if (this.isShuffling) return;
        this.startBtn.disabled = true;
        this.abortShuffle = false;

        // Reset to initial clean sorted state
        this.renderEnvelopes();

        // Wait for user to see the values
        await this.wait(1000);

        this.isGameActive = true;
        this.isShuffling = true;
        this.selectedEnvelope = null;
        this.confirmBtn.classList.add('hidden');
        this.confirmBtn.disabled = true;

        // 1. Flip all to back
        this.envelopes.forEach(env => {
            env.classList.remove('selected', 'revealed');
            env.classList.add('flipped');
        });

        // Wait for flip animation to finish
        await this.wait(600);

        // 2. Prepare for shuffling (Switch to absolute positioning)
        this.setupAbsolutePositioning();
        this.gridElement.classList.add('shuffling');

        // 3. Shuffle Animation
        await this.performShuffle();

        this.gridElement.classList.remove('shuffling');
        this.isShuffling = false;
        // Keep start button disabled until game finishes or we explicitly enable it (e.g. if we want to allow cancel).
        // Current logic enables it at game over.
    },

    setupAbsolutePositioning() {
        // Store current positions
        const positions = this.envelopes.map(env => ({
            left: env.offsetLeft,
            top: env.offsetTop,
            width: env.offsetWidth,
            height: env.offsetHeight
        }));

        // Apply fixed positions to break out of grid flow
        this.envelopes.forEach((env, i) => {
            env.style.position = 'absolute';
            env.style.left = positions[i].left + 'px';
            env.style.top = positions[i].top + 'px';
            env.style.width = positions[i].width + 'px';
            env.style.height = positions[i].height + 'px';
            env.style.margin = '0';
        });
    },

    async performShuffle() {
        const steps = 12; // Number of swaps
        const speed = 250; // Match CSS transition or slightly longer

        for (let i = 0; i < steps; i++) {
            if (this.abortShuffle) break;

            // Pick two random indices
            const idx1 = Math.floor(Math.random() * this.envelopes.length);
            const idx2 = Math.floor(Math.random() * this.envelopes.length);

            if (idx1 === idx2) {
                i--; // Retry
                continue;
            }

            // Swap visual positions (left/top)
            this.swapPositions(this.envelopes[idx1], this.envelopes[idx2]);

            // Wait for movement
            await this.wait(speed);
        }
    },

    swapPositions(el1, el2) {
        const tempLeft = el1.style.left;
        const tempTop = el1.style.top;

        el1.style.left = el2.style.left;
        el1.style.top = el2.style.top;

        el2.style.left = tempLeft;
        el2.style.top = tempTop;
    },

    onEnvelopeClick(target) {
        if (!this.isGameActive) return;

        // Allow clicking during shuffle to stop it and select immediately
        if (this.isShuffling) {
            this.abortShuffle = true;
            this.isShuffling = false;
            // Remove shuffling class immediately
            this.gridElement.classList.remove('shuffling');
        }

        if (this.selectedEnvelope) {
            this.selectedEnvelope.classList.remove('selected');
        }

        this.selectedEnvelope = target;
        target.classList.add('selected');

        this.confirmBtn.classList.remove('hidden');
        this.confirmBtn.disabled = false;
    },

    confirmSelection() {
        if (!this.selectedEnvelope) return;

        const targetEl = this.selectedEnvelope;
        const frontFace = targetEl.querySelector('.front');
        const originalValue = targetEl.dataset.value;

        // RIGGING: Ensure selected is 500k
        if (originalValue !== '500k') {
            // Find the real 500k envelope
            const realWinner = this.envelopes.find(e => e.dataset.value === '500k');

            // Swap contents logically so we don't duplicate 500k
            if (realWinner) {
                realWinner.dataset.value = originalValue;
                realWinner.querySelector('.front').textContent = originalValue;
            }

            targetEl.dataset.value = '500k';
            frontFace.textContent = '500k';
        }

        // Reveal the selected one
        targetEl.classList.remove('flipped'); // Show front
        targetEl.classList.add('revealed');

        // Show Overlay
        setTimeout(() => {
            this.overlay.classList.add('visible');
            this.overlay.classList.remove('hidden');
        }, 800);

        this.confirmBtn.classList.add('hidden');
        this.startBtn.textContent = "Chơi Lại";
        this.startBtn.disabled = false; // Allow replay
        this.isGameActive = false; // Stop further clicks
    },

    hideOverlay() {
        this.overlay.classList.remove('visible');
        setTimeout(() => {
            this.overlay.classList.add('hidden');
            // Auto reset game so they can pick again
            this.resetGame();
        }, 500);
    },

    resetGame() {
        this.isGameActive = false;
        this.isShuffling = false;
        this.startBtn.disabled = false;
        this.startBtn.textContent = "Bốc Lại";
        this.confirmBtn.classList.add('hidden');
        this.confirmBtn.disabled = true;

        // Clear grid and re-render
        this.renderEnvelopes();

        // Trigger start automatically? 
        // User asked: "khi show thăm cho phép chọn bốc lại" (When showing, allow choosing to pick again).
        // So clicking the "Close" button (which we will rename to "Bốc lại") should probably just reset the UI 
        // and maybe not start shuffling immediately, OR start shuffling immediately?
        // Usually "Bốc lại" implies starting the process.
        // Let's just reset to "Ready" state.

        // Remove styles from previous shuffle
        // renderEnvelopes dopes this by recreating elements.
    },

    // Helper to wait
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
