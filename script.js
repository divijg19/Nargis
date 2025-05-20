document.addEventListener("DOMContentLoaded", function() {
    // Animate proposal message
    const proposalMessage = document.querySelector(".proposal-message");
    if (proposalMessage) {
        proposalMessage.style.opacity = 0;
        proposalMessage.style.transform = "translateY(30px)";
        setTimeout(() => {
            proposalMessage.style.opacity = 1;
            proposalMessage.style.transform = "translateY(0)";
        }, 600);
    }

    // Couple data for featured label
    const couples = [
        { label: 'Guts & Casca' },
        { label: 'Naruto & Hinata' },
        { label: 'Ichigo & Orihime' },
        { label: 'Kisuke & Yoruichi' },
        { label: 'Inuyasha & Kagome' },
        { label: 'Yusuke & Keiko' },
        { label: 'Edward & Winry' },
        { label: 'Roy Mustang & Riza Hawkeye' },
        { label: 'Ban & Elaine' },
        { label: 'Asuna & Kirito' },
        { label: 'Dante & Lady' },
        { label: 'Cloud & Tifa' },
        { label: 'Geralt & Yennefer' },
        { label: 'Aragorn & Arwen' },
        { label: 'Jon Snow & Ygritte' },
        { label: 'Batman & Catwoman' },
        { label: 'Peter Parker & Mary Jane Watson' }
    ];
    const coupleCount = couples.length;
    const coupleHeight = window.innerHeight * 0.9;
    const leftCoupleEls = Array.from(document.querySelectorAll('.left-couple'));
    const rightCoupleEls = Array.from(document.querySelectorAll('.right-couple'));
    const featuredCouple = document.querySelector('.featured-couple');

    function updateCoupleParallax() {
        const scrollY = window.scrollY;
        for (let i = 0; i < coupleCount; i++) {
            const sectionStart = i * coupleHeight * 0.9;
            const sectionEnd = (i + 1) * coupleHeight * 0.9;
            const leftEl = leftCoupleEls[i];
            const rightEl = rightCoupleEls[i];
            if (scrollY >= sectionStart && scrollY < sectionEnd) {
                // Show this couple
                leftEl.style.opacity = 1;
                rightEl.style.opacity = 1;
                // Animate them walking toward each other
                const progress = Math.min(1, Math.max(0, (scrollY - sectionStart) / (sectionEnd - sectionStart)));
                leftEl.style.transform = `translateY(${-progress * 40}px) translateX(${progress * 18}vw)`;
                rightEl.style.transform = `translateY(${-progress * 40}px) translateX(-${progress * 18}vw)`;
                // Update featured couple label
                if (featuredCouple) featuredCouple.textContent = couples[i].label;
            } else {
                leftEl.style.opacity = 0;
                rightEl.style.opacity = 0;
            }
        }
    }
    window.addEventListener('scroll', updateCoupleParallax);
    window.addEventListener('resize', updateCoupleParallax);
    updateCoupleParallax();

    // Confession form logic with localStorage and like feature
    const confessionForm = document.getElementById('confessionForm');
    const confessionInput = document.getElementById('confessionInput');
    const confessionsList = document.getElementById('confessionsList');

    // Load confessions from localStorage or use demo
    let confessions = JSON.parse(localStorage.getItem('confessions') || 'null') || [
        { text: "You are the light that guides me through my darkest days.", likes: 2 },
        { text: "Every moment with you feels like a scene from my favorite anime.", likes: 1 },
        { text: "I never believed in soulmates until I met you.", likes: 0 },
        { text: "If loving you is a dream, I never want to wake up.", likes: 3 }
    ];
    renderConfessions();

    if (confessionForm) {
        confessionForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const text = confessionInput.value.trim();
            if (text) {
                const confession = { text, likes: 0 };
                confessions.unshift(confession);
                saveConfessions();
                addConfessionCard(confession, true);
                confessionInput.value = '';
            }
        });
    }

    function saveConfessions() {
        localStorage.setItem('confessions', JSON.stringify(confessions));
    }

    function renderConfessions() {
        confessionsList.innerHTML = '';
        confessions.forEach(confession => addConfessionCard(confession));
    }

    function addConfessionCard(confession, animate = false) {
        const card = document.createElement('div');
        card.className = 'confession-card';
        card.innerHTML = `
            <div class="confession-body">${escapeHTML(confession.text)}</div>
            <div class="confession-actions">
                <button class="like-btn" title="Like">❤️</button>
                <span class="like-count">${confession.likes}</span>
            </div>
        `;
        const likeBtn = card.querySelector('.like-btn');
        const likeCount = card.querySelector('.like-count');
        likeBtn.addEventListener('click', () => {
            confession.likes++;
            likeCount.textContent = confession.likes;
            likeBtn.classList.add('liked');
            saveConfessions();
        });
        if (animate) {
            card.style.opacity = 0;
            card.style.transform = 'translateY(30px)';
            confessionsList.prepend(card);
            setTimeout(() => {
                card.style.transition = 'all 0.7s cubic-bezier(.23,1.01,.32,1)';
                card.style.opacity = 1;
                card.style.transform = 'translateY(0)';
            }, 50);
        } else {
            confessionsList.appendChild(card);
        }
    }

    function escapeHTML(str) {
        return str.replace(/[&<>"']/g, function(tag) {
            const charsToReplace = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            };
            return charsToReplace[tag] || tag;
        });
    }

    // Animate proposal message with GSAP
    if (proposalMessage) {
        gsap.fromTo(proposalMessage, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.2, delay: 0.5, ease: "power3.out" });
    }
});

function showResponse() {
    const responseSection = document.getElementById("responseSection");
    if (responseSection) {
        responseSection.style.display = "block";
        responseSection.scrollIntoView({ behavior: "smooth" });
    }
}
