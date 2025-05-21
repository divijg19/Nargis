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

    // Couple data for split parallax effect
    const couples = [
        { left: 0, right: 0, label: 'Guts & Casca' },
        { left: 1, right: 1, label: 'Naruto & Hinata' },
        { left: 2, right: 2, label: 'Ichigo & Orihime' },
        { left: 3, right: 3, label: 'Kisuke & Yoruichi' },
        { left: 4, right: 4, label: 'Inuyasha & Kagome' },
        { left: 5, right: 5, label: 'Yusuke & Keiko' },
        { left: 6, right: 6, label: 'Edward & Winry' },
        { left: 7, right: 7, label: 'Roy Mustang & Riza Hawkeye' },
        { left: 8, right: 8, label: 'Ban & Elaine' },
        { left: 9, right: 9, label: 'Asuna & Kirito' },
        { left: 10, right: 10, label: 'Dante & Lady' },
        { left: 11, right: 11, label: 'Cloud & Tifa' },
        { left: 12, right: 12, label: 'Geralt & Yennefer' },
        { left: 13, right: 13, label: 'Aragorn & Arwen' },
        { left: 14, right: 14, label: 'Jon Snow & Ygritte' },
        { left: 15, right: 15, label: 'Batman & Catwoman' },
        { left: 16, right: 16, label: 'Peter Parker & Mary Jane Watson' }
    ];
    const coupleImageMap = [
        { left: 'guts.png', right: 'casca.png', label: 'Guts & Casca' },
        { left: 'hinata.png', right: 'naruto.png', label: 'Naruto & Hinata' },
        { left: 'ichigo.png', right: 'orihime.png', label: 'Ichigo & Orihime' },
        { left: 'kisuke.png', right: 'yoruichi.png', label: 'Kisuke & Yoruichi' },
        { left: 'inuyasha.png', right: 'kagome.png', label: 'Inuyasha & Kagome' },
        { left: 'yusuke.png', right: 'keiko.png', label: 'Yusuke & Keiko' },
        { left: 'edward.png', right: 'winry.png', label: 'Edward & Winry' },
        { left: 'roy.png', right: 'riza.png', label: 'Roy Mustang & Riza Hawkeye' },
        { left: 'ban.png', right: 'elaine.png', label: 'Ban & Elaine' },
        { left: 'asuna.png', right: 'kirito.png', label: 'Asuna & Kirito' },
        { left: 'dante.png', right: 'lady.png', label: 'Dante & Lady' },
        { left: 'cloud.png', right: 'tifa.png', label: 'Cloud & Tifa' },
        { left: 'geralt.png', right: 'yennefer.png', label: 'Geralt & Yennefer' },
        { left: 'aragorn.png', right: 'arwen.png', label: 'Aragorn & Arwen' },
        { left: 'jon.png', right: 'ygritte.png', label: 'Jon Snow & Ygritte' },
        { left: 'batman.png', right: 'catwoman.png', label: 'Batman & Catwoman' },
        { left: 'peter.png', right: 'mj.png', label: 'Peter Parker & Mary Jane Watson' }
    ];

    // Inject couple images into parallax-couples container
    const parallaxContainer = document.querySelector('.parallax-couples');
    parallaxContainer.innerHTML = '';
    for (let i = 0; i < coupleImageMap.length; i++) {
        const leftDiv = document.createElement('div');
        leftDiv.className = 'anime-couple left-couple';
        leftDiv.dataset.couple = i;
        leftDiv.innerHTML = `<img src="images/${coupleImageMap[i].left}" alt="${coupleImageMap[i].label.split(' & ')[0]}" />`;
        parallaxContainer.appendChild(leftDiv);
        const rightDiv = document.createElement('div');
        rightDiv.className = 'anime-couple right-couple';
        rightDiv.dataset.couple = i;
        rightDiv.innerHTML = `<img src="images/${coupleImageMap[i].right}" alt="${coupleImageMap[i].label.split(' & ')[1]}" />`;
        parallaxContainer.appendChild(rightDiv);
    }

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
                leftEl.style.opacity = 1;
                rightEl.style.opacity = 1;
                // Animate them split to the side
                const progress = Math.min(1, Math.max(0, (scrollY - sectionStart) / (sectionEnd - sectionStart)));
                leftEl.style.transform = `translateY(${-progress * 40}px) translateX(${progress * 18}vw)`;
                rightEl.style.transform = `translateY(${-progress * 40}px) translateX(-${progress * 18}vw)`;
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

// Scroll indicator and active nav link highlight
window.addEventListener('scroll', function() {
    // Scroll Indicator
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollTop = window.scrollY;
    const percent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    const indicator = document.getElementById('scrollIndicator');
    if (indicator) indicator.style.width = percent + '%';

    // Active nav link highlight
    const sections = ['home', 'letter', 'confess', 'wall'];
    let current = sections[0];
    for (let i = 0; i < sections.length; i++) {
        const section = document.getElementById(sections[i]);
        if (section && section.getBoundingClientRect().top - 120 <= 0) {
            current = sections[i];
        }
    }
    document.querySelectorAll('.navbar-links a').forEach(a => {
        a.classList.remove('text-pink-800', 'font-bold', 'bg-pink-100');
        if (a.getAttribute('href') === '#' + current) {
            a.classList.add('text-pink-800', 'font-bold', 'bg-pink-100');
        }
    });
});

function showResponse() {
    const responseSection = document.getElementById("responseSection");
    if (responseSection) {
        responseSection.style.display = "block";
        responseSection.scrollIntoView({ behavior: "smooth" });
    }
}
