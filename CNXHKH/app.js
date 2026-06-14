// State and Constants
const CHAPTERS = [1, 2, 3, 4, 5, 6, 7];
let quizDataCache = {};

let state = {
    mode: '', // 'practice', 'exam', 'fun'
    questions: [], // Current list of questions
    currentIndex: 0,
    answers: [], // User's chosen answer index for each question
    funPool: [], // Remaining unused questions for Fun/Hardcore Mode
    funTimer: null,
    timeLeft: 15,
    hardcorePenalty: 'auto5', // 'auto5' or 'wheel'
    settings: {
        practiceChapter: 1,
        practiceShuffleQ: false,
        practiceShuffleA: false,
        examConfig: {},
        examShuffleQ: true,
        examShuffleA: true
    }
};

// DOM Elements
const elements = {
    btnBackHome: document.getElementById('btn-back-home'),
    screens: document.querySelectorAll('.screen'),
    
    // Home
    cardPractice: document.getElementById('card-practice'),
    cardExam: document.getElementById('card-exam'),
    cardFun: document.getElementById('card-fun'),
    cardHardcore: document.getElementById('card-hardcore'),
    cardDaiHoi: document.getElementById('card-daihoi'),
    btnStartHardcore: document.getElementById('btn-start-hardcore'),
    
    // Practice Config
    practiceChapterGrid: document.getElementById('practice-chapter-grid'),
    practiceShuffleQ: document.getElementById('practice-shuffle-q'),
    practiceShuffleA: document.getElementById('practice-shuffle-a'),
    btnStartPractice: document.getElementById('btn-start-practice'),
    
    // Exam Config
    examChapterList: document.getElementById('exam-chapter-list'),
    examShuffleQ: document.getElementById('exam-shuffle-q'),
    examShuffleA: document.getElementById('exam-shuffle-a'),
    examTotalQ: document.getElementById('exam-total-q'),
    btnStartExam: document.getElementById('btn-start-exam'),
    
    // Quiz
    progressBar: document.getElementById('progress-bar'),
    questionCounter: document.getElementById('question-counter'),
    quizModeBadge: document.getElementById('quiz-mode-badge'),
    questionText: document.getElementById('question-text'),
    optionsContainer: document.getElementById('options-container'),
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    btnSubmit: document.getElementById('btn-submit'),
    
    // Fun Mode specific
    timerContainer: document.getElementById('timer-container'),
    timerBar: document.getElementById('timer-bar'),
    wheelAside: document.getElementById('wheel-aside'),
    penaltyWheel: document.getElementById('penalty-wheel'),
    wheelResultText: document.getElementById('wheel-result-text'),
    wheelSubtitle: document.getElementById('wheel-subtitle'),
    
    // Modes
    cardExtreme: document.getElementById('card-extreme'),
    
    // Result
    resultScreen: document.getElementById('result-screen'),
    scoreCirclePath: document.getElementById('score-circle-path'),
    scoreText: document.getElementById('score-text'),
    scoreCorrect: document.getElementById('score-correct'),
    scoreTotal: document.getElementById('score-total'),
    btnReview: document.getElementById('btn-review'),
    btnPlayAgain: document.getElementById('btn-play-again')
};

// Initialization
async function init() {
    setupEventListeners();
    renderPracticeChapters();
    await renderExamChapters();
}

function setupEventListeners() {
    elements.btnBackHome.addEventListener('click', () => navigate('home-screen'));
    elements.cardPractice.addEventListener('click', () => navigate('practice-config-screen'));
    elements.cardExam.addEventListener('click', () => navigate('exam-config-screen'));
    if (elements.cardDaiHoi) {
        elements.cardDaiHoi.addEventListener('click', startDaiHoiMode);
    }
    elements.cardFun.addEventListener('click', startFunMode);
    elements.cardHardcore.addEventListener('click', () => {
        pendingMode = 'hardcore';
        document.querySelector('#hardcore-config-screen h2').innerText = 'Chế độ Cường Độ Cao';
        document.querySelector('#hardcore-config-screen h2').style = 'color: #dc2626;';
        document.querySelector('#hardcore-config-screen .icon-bubble').className = 'icon-bubble hardcore-icon';
        document.querySelector('#hardcore-config-screen .icon-bubble').innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
        navigate('hardcore-config-screen');
    });
    
    if (elements.cardExtreme) {
        elements.cardExtreme.addEventListener('click', () => {
            pendingMode = 'extreme';
            document.querySelector('#hardcore-config-screen h2').innerText = 'Chế độ Căng Cực';
            document.querySelector('#hardcore-config-screen h2').style = 'background: linear-gradient(135deg, #ef4444, #f97316); -webkit-background-clip: text; -webkit-text-fill-color: transparent;';
            document.querySelector('#hardcore-config-screen .icon-bubble').className = 'icon-bubble extreme-icon';
            document.querySelector('#hardcore-config-screen .icon-bubble').innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`;
            navigate('hardcore-config-screen');
        });
    }
    
    elements.btnStartPractice.addEventListener('click', startPractice);
    elements.btnStartExam.addEventListener('click', startExam);
    elements.btnStartHardcore.addEventListener('click', startHardcore);
    
    elements.btnNext.addEventListener('click', nextQuestion);
    elements.btnPrev.addEventListener('click', prevQuestion);
    elements.btnSubmit.addEventListener('click', showResult);
    
    elements.btnPlayAgain.addEventListener('click', () => navigate('home-screen'));
    elements.btnReview.addEventListener('click', showReview);
    
    document.getElementById('btn-close-modal')?.addEventListener('click', (e) => {
        e.preventDefault();
        elements.wheelAside.classList.remove('active-modal');
        document.getElementById('modal-overlay')?.classList.remove('active');
        
        applyPenaltyLogic(); // Apply penalty ONLY when user explicitly accepts it
        
        // Prevent ghost clicks on underlying elements
        if (elements.btnNext) {
            elements.btnNext.style.pointerEvents = 'none';
            setTimeout(() => {
                elements.btnNext.style.pointerEvents = 'auto';
            }, 400);
        }
    });
}

// Navigation
function navigate(screenId) {
    elements.screens.forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    
    if (screenId === 'home-screen' || screenId === 'result-screen') {
        document.body.classList.remove('hardcore-theme');
    }
    
    if (screenId === 'home-screen') {
        elements.btnBackHome.classList.add('hidden');
    } else {
        elements.btnBackHome.classList.remove('hidden');
    }
}

// Data Fetching
async function loadChapterData(chapterNum) {
    if (quizDataCache[chapterNum]) return quizDataCache[chapterNum];
    try {
        const res = await fetch(`questions/chuong_${chapterNum}_questions.json?t=${new Date().getTime()}`);
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        quizDataCache[chapterNum] = data;
        return data;
    } catch (e) {
        console.error(`Failed to load chapter ${chapterNum}.`, e);
        return [];
    }
}

// Config Renders
function renderPracticeChapters() {
    elements.practiceChapterGrid.innerHTML = '';
    CHAPTERS.forEach(num => {
        const btn = document.createElement('button');
        btn.className = `chapter-btn ${num === state.settings.practiceChapter ? 'selected' : ''}`;
        btn.innerText = `Chương ${num}`;
        btn.addEventListener('click', () => {
            document.querySelectorAll('#practice-chapter-grid .chapter-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            state.settings.practiceChapter = num;
        });
        elements.practiceChapterGrid.appendChild(btn);
    });
}

async function renderExamChapters() {
    elements.examChapterList.innerHTML = '';
    let totalQuestionsAvailable = 0;
    
    for (let num of CHAPTERS) {
        const data = await loadChapterData(num);
        if (!data || data.length === 0) continue; 
        
        const maxQ = data.length;
        totalQuestionsAvailable += maxQ;
        
        const defaultQ = Math.min(10, maxQ);
        state.settings.examConfig[num] = defaultQ;
        
        const item = document.createElement('div');
        item.className = 'exam-chapter-item';
        item.innerHTML = `
            <span>Chương ${num} <span style="color:var(--text-muted); font-size:0.9rem">(Tối đa: ${maxQ})</span></span>
            <input type="number" min="0" max="${maxQ}" value="${defaultQ}" data-chapter="${num}">
        `;
        
        const input = item.querySelector('input');
        input.addEventListener('input', (e) => {
            let val = parseInt(e.target.value) || 0;
            if (val > maxQ) { val = maxQ; e.target.value = maxQ; }
            if (val < 0) { val = 0; e.target.value = 0; }
            state.settings.examConfig[num] = val;
            updateExamTotal();
        });
        
        elements.examChapterList.appendChild(item);
    }
    updateExamTotal();
}

function updateExamTotal() {
    let total = 0;
    Object.values(state.settings.examConfig).forEach(val => total += val);
    elements.examTotalQ.innerText = total;
    elements.btnStartExam.disabled = total === 0;
}

// Shuffling
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function prepareQuestions(dataList, shuffleQ, shuffleA) {
    let questions = [...dataList];
    if (shuffleQ) questions = shuffleArray(questions);
    
    return questions.map(q => {
        let options = [...q.options];
        let correctIndex = q.answer - 1; 
        let correctText = options[correctIndex];
        
        if (shuffleA) {
            options = shuffleArray(options);
            correctIndex = options.indexOf(correctText);
        }
        
        return {
            originalQuestion: q.question,
            options: options,
            correctIndex: correctIndex
        };
    });
}

// Start Modes
async function startPractice() {
    elements.btnStartPractice.disabled = true;
    elements.btnStartPractice.innerText = 'Đang tải...';
    
    const chapterNum = state.settings.practiceChapter;
    state.settings.practiceShuffleQ = elements.practiceShuffleQ.checked;
    state.settings.practiceShuffleA = elements.practiceShuffleA.checked;
    
    const rawData = await loadChapterData(chapterNum);
    if (!rawData || rawData.length === 0) { alert('Dữ liệu chưa tải được!'); return; }
    
    state.questions = prepareQuestions(rawData, state.settings.practiceShuffleQ, state.settings.practiceShuffleA);
    state.mode = 'practice';
    
    startQuiz();
    elements.btnStartPractice.disabled = false;
    elements.btnStartPractice.innerHTML = `<span>Bắt đầu Luyện tập</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
}

async function startExam() {
    elements.btnStartExam.disabled = true;
    elements.btnStartExam.innerText = 'Đang tải...';
    
    state.settings.examShuffleQ = elements.examShuffleQ.checked;
    state.settings.examShuffleA = elements.examShuffleA.checked;
    
    let rawData = [];
    for (let num of CHAPTERS) {
        const count = state.settings.examConfig[num];
        if (count > 0) {
            let chData = await loadChapterData(num);
            if (chData && chData.length > 0) {
                chData = shuffleArray(chData).slice(0, count);
                rawData = rawData.concat(chData);
            }
        }
    }
    
    if (rawData.length === 0) { alert('Dữ liệu chưa tải được!'); return; }
    
    state.questions = prepareQuestions(rawData, state.settings.examShuffleQ, state.settings.examShuffleA);
    state.mode = 'exam';
    
    startQuiz();
    elements.btnStartExam.disabled = false;
    elements.btnStartExam.innerHTML = `<span>Bắt đầu Thi thử</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
}

async function startFunMode() {
    elements.cardFun.style.opacity = '0.5';
    
    let allQs = [];
    for (let num of CHAPTERS) {
        const chData = await loadChapterData(num);
        if (chData && chData.length > 0) {
            allQs = allQs.concat(chData);
        }
    }
    
    if (allQs.length === 0) {
        alert('Dữ liệu rỗng.');
        elements.cardFun.style.opacity = '1';
        return;
    }
    
    allQs = shuffleArray(allQs);
    const prepared = prepareQuestions(allQs, true, true);
    
    const targetQCount = Math.min(500, prepared.length);
    state.questions = prepared.slice(0, targetQCount);
    state.funPool = prepared.slice(targetQCount);
    
    state.mode = 'fun';
    elements.cardFun.style.opacity = '1';
    
    startQuiz();
}

async function startHardcore() {
    elements.btnStartHardcore.disabled = true;
    elements.btnStartHardcore.innerText = 'Đang tải...';
    
    state.hardcorePenalty = document.querySelector('input[name="hardcore-penalty"]:checked').value;
    
    let allQs = [];
    for (let num of CHAPTERS) {
        const chData = await loadChapterData(num);
        if (chData && chData.length > 0) {
            allQs = allQs.concat(chData);
        }
    }
    
    if (allQs.length === 0) { alert('Dữ liệu rỗng.'); elements.btnStartHardcore.disabled = false; return; }
    
    if (pendingMode === 'extreme') {
        let extremeQs = [...allQs];
        extremeQs = shuffleArray(extremeQs);
        const needed = 1200 - extremeQs.length;
        if (needed > 0) {
            const extraQs = extremeQs.slice(0, needed);
            const duplicatedQs = extraQs.map(q => JSON.parse(JSON.stringify(q)));
            extremeQs = extremeQs.concat(duplicatedQs);
        }
        allQs = extremeQs;
    }
    
    allQs = shuffleArray(allQs);
    const prepared = prepareQuestions(allQs, true, true);
    
    state.questions = prepared;
    state.funPool = []; // No extra pool because we use ALL questions
    
    state.mode = pendingMode;
    
    elements.btnStartHardcore.disabled = false;
    elements.btnStartHardcore.innerHTML = `<span>Sẵn sàng chịu phạt!</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
    
    document.body.classList.add('hardcore-theme');
    startQuiz();
}

async function startDaiHoiMode() {
    elements.cardDaiHoi.style.opacity = '0.5';
    
    try {
        const res = await fetch(`DaiHoi.json?t=${new Date().getTime()}`);
        if (!res.ok) throw new Error('Network response was not ok');
        const rawData = await res.json();
        
        if (!rawData || rawData.length === 0) { alert('Dữ liệu rỗng.'); elements.cardDaiHoi.style.opacity = '1'; return; }
        
        state.questions = prepareQuestions(rawData, true, true);
        state.mode = 'daihoi';
        elements.cardDaiHoi.style.opacity = '1';
        
        startQuiz();
    } catch (e) {
        console.error('Failed to load DaiHoi.json', e);
        alert('Không tải được dữ liệu Đại Hội!');
        elements.cardDaiHoi.style.opacity = '1';
    }
}

function startQuiz() {
    state.currentIndex = 0;
    state.answers = new Array(state.questions.length).fill(null);
    
    let modeLabel = 'Luyện tập';
    if (state.mode === 'exam') modeLabel = 'Thi thử';
    else if (state.mode === 'fun') modeLabel = 'Vui Vẻ';
    else if (state.mode === 'hardcore') modeLabel = 'Cường Độ Cao';
    else if (state.mode === 'extreme') modeLabel = 'Căng Cực';
    else if (state.mode === 'daihoi') modeLabel = 'Đại Hội';
    
    elements.quizModeBadge.innerText = modeLabel;
    elements.quizModeBadge.className = `mode-indicator ${state.mode === 'fun' ? 'fun' : ''}`;
    
    const quizLayout = document.querySelector('.quiz-layout');
    
    if (state.mode === 'fun' || ((state.mode === 'hardcore' || state.mode === 'extreme') && state.hardcorePenalty === 'wheel')) {
        quizLayout.classList.add('has-aside');
        elements.timerContainer.classList.remove('hidden');
        elements.btnPrev.classList.add('hidden'); // No going back
        elements.wheelAside.classList.remove('hidden');
    } else {
        quizLayout.classList.remove('has-aside');
        elements.wheelAside.classList.add('hidden');
        
        if (state.mode === 'hardcore' || state.mode === 'extreme') {
            elements.timerContainer.classList.remove('hidden');
            elements.btnPrev.classList.add('hidden');
        } else {
            elements.timerContainer.classList.add('hidden');
            elements.btnPrev.classList.remove('hidden');
        }
    }
    
    navigate('quiz-screen');
    renderQuestion();
}

// Timer Logic for Fun Mode
function startTimer() {
    state.timeLeft = 15;
    elements.timerBar.style.width = '100%';
    
    if (state.mode === 'hardcore' || state.mode === 'extreme') {
        elements.timerBar.style.background = 'rgb(239, 68, 68)';
    } else {
        elements.timerBar.style.background = 'var(--success)';
    }
    
    clearInterval(state.funTimer);
    
    state.funTimer = setInterval(() => {
        state.timeLeft -= 0.1;
        const percentage = (state.timeLeft / 15) * 100;
        
        elements.timerBar.style.width = `${percentage}%`;
        
        if (state.mode === 'hardcore' || state.mode === 'extreme') {
            const r = Math.floor((239 * percentage) / 100);
            const g = Math.floor((68 * percentage) / 100);
            const b = Math.floor((68 * percentage) / 100);
            elements.timerBar.style.background = `rgb(${r}, ${g}, ${b})`;
        } else {
            if (percentage < 50 && percentage >= 20) {
                elements.timerBar.style.background = '#f59e0b';
            } else if (percentage < 20) {
                elements.timerBar.style.background = 'var(--error)';
            }
        }
        
        if (state.timeLeft <= 0) {
            clearInterval(state.funTimer);
            elements.timerBar.style.width = '0%';
            handleTimeout();
        }
    }, 100);
}

function stopTimer() {
    clearInterval(state.funTimer);
}

function handleTimeout() {
    state.answers[state.currentIndex] = -1; // -1 means timeout/wrong
    
    const btns = elements.optionsContainer.querySelectorAll('.option-btn');
    btns.forEach(b => b.disabled = true);
    
    const q = state.questions[state.currentIndex];
    btns[q.correctIndex].classList.add('correct');
    
    triggerWheelSequence();
}

// Quiz Render
function renderQuestion() {
    const q = state.questions[state.currentIndex];
    elements.questionCounter.innerText = `${state.currentIndex + 1}/${state.questions.length}`;
    elements.questionText.innerText = q.originalQuestion;
    
    const progress = ((state.currentIndex) / state.questions.length) * 100;
    elements.progressBar.style.width = `${progress}%`;
    
    elements.optionsContainer.innerHTML = '';
    
    const hasAnswered = state.answers[state.currentIndex] !== null;
    const isPracticeOrFun = state.mode === 'practice' || state.mode === 'fun' || state.mode === 'hardcore' || state.mode === 'extreme' || state.mode === 'daihoi';
    
    q.options.forEach((optText, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn fade-in-up';
        btn.style.animationDelay = `${index * 0.1}s`;
        btn.innerHTML = `<span style="font-weight:700; color:var(--primary); margin-right:8px;">${String.fromCharCode(65 + index)}.</span> ${optText}`;
        
        if (hasAnswered) {
            if (state.answers[state.currentIndex] === index) btn.classList.add('selected');
            
            if (isPracticeOrFun) {
                if (index === q.correctIndex) {
                    btn.classList.add('correct');
                } else if (state.answers[state.currentIndex] === index) {
                    btn.classList.add('incorrect');
                }
                btn.disabled = true;
            }
        }
        
        btn.addEventListener('click', () => handleOptionSelect(index));
        elements.optionsContainer.appendChild(btn);
    });
    
    // Reset wheel aside state
    if (state.mode === 'fun' || state.mode === 'hardcore' || state.mode === 'extreme') {
        elements.wheelAside.classList.add('disabled');
        elements.wheelResultText.classList.add('hidden');
        elements.wheelSubtitle.innerText = 'Đang chờ...';
        elements.penaltyWheel.style.transition = 'none';
        elements.penaltyWheel.style.transform = `rotate(0deg)`;
        if ((state.mode === 'hardcore' || state.mode === 'extreme') && state.hardcorePenalty === 'auto5') {
            // Already hidden by CSS and JS layout logic
        } else {
            elements.penaltyWheel.parentElement.classList.remove('hidden');
        }
        
        elements.wheelAside.classList.remove('active-modal');
        document.getElementById('modal-overlay')?.classList.remove('active');
    }
    
    document.getElementById('auto-penalty-msg').classList.add('hidden');
    
    updateNavButtons();
    
    if ((state.mode === 'fun' || state.mode === 'hardcore' || state.mode === 'extreme') && !hasAnswered) {
        startTimer();
    } else {
        stopTimer();
    }
}

function handleOptionSelect(index) {
    const isPracticeOrFun = state.mode === 'practice' || state.mode === 'fun' || state.mode === 'hardcore' || state.mode === 'extreme' || state.mode === 'daihoi';
    const q = state.questions[state.currentIndex];
    
    if (isPracticeOrFun && state.answers[state.currentIndex] !== null) return;
    
    if (state.mode === 'fun' || state.mode === 'hardcore' || state.mode === 'extreme') stopTimer();
    
    state.answers[state.currentIndex] = index;
    
    const btns = elements.optionsContainer.querySelectorAll('.option-btn');
    const isCorrect = (index === q.correctIndex);
    
    if (isPracticeOrFun) {
        btns.forEach(b => b.disabled = true);
        if (isCorrect) {
            btns[index].classList.add('correct');
            updateNavButtons(); // Instantly show 'Next' button
        } else {
            btns[index].classList.add('incorrect');
            btns[q.correctIndex].classList.add('correct');
            
            if (!isCorrect) {
                if (state.mode === 'fun' || state.mode === 'hardcore' || state.mode === 'extreme') {
                    triggerWheelSequence();
                } else {
                    updateNavButtons();
                }
            }
        }
    } else {
        btns.forEach(b => b.classList.remove('selected'));
        btns[index].classList.add('selected');
        updateNavButtons();
    }
}

function updateNavButtons() {
    if (state.mode !== 'fun' && state.mode !== 'hardcore' && state.mode !== 'extreme') {
        elements.btnPrev.disabled = state.currentIndex === 0;
    }
    
    const isLast = state.currentIndex === state.questions.length - 1;
    const hasAnswered = state.answers[state.currentIndex] !== null;
    const canProceed = hasAnswered || state.mode === 'exam';
    
    if (isLast) {
        elements.btnNext.classList.add('hidden');
        elements.btnSubmit.classList.remove('hidden');
        elements.btnSubmit.disabled = !canProceed;
    } else {
        elements.btnSubmit.classList.add('hidden');
        elements.btnNext.classList.remove('hidden');
        elements.btnNext.disabled = !canProceed;
    }
}

function nextQuestion() {
    if (state.currentIndex < state.questions.length - 1) {
        state.currentIndex++;
        renderQuestion();
    } else {
        showResult(); 
    }
}

function prevQuestion() {
    if (state.currentIndex > 0) {
        state.currentIndex--;
        renderQuestion();
    }
}

// Wheel Logic
let currentPenaltyIndex = -1;

function triggerWheelSequence() {
    elements.wheelAside.classList.remove('disabled');
    
    if ((state.mode === 'hardcore' || state.mode === 'extreme') && state.hardcorePenalty === 'auto5') {
        currentPenaltyIndex = 2; // +5 index
        document.getElementById('auto-penalty-msg').classList.remove('hidden');
        applyPenaltyLogic();
        return;
    }
    
    elements.wheelAside.classList.add('active-modal');
    document.getElementById('modal-overlay')?.classList.add('active');
    document.getElementById('btn-close-modal')?.classList.remove('show-btn');
    document.getElementById('btn-close-modal')?.classList.add('hidden');
    
    elements.wheelSubtitle.innerText = 'Oops! Đang quay hình phạt...';
    
    // Ensure CSS resets
    elements.penaltyWheel.style.transition = 'none';
    elements.penaltyWheel.style.transform = `rotate(0deg)`;
    
    // Force browser reflow to reliably trigger the transition
    void elements.penaltyWheel.offsetWidth;
    
    spinWheel();
}

function spinWheel() {
    const rand = Math.random() * 100;
    if (rand < 29.66) currentPenaltyIndex = 0; // Redo
    else if (rand < 59.32) currentPenaltyIndex = 1; // +3
    else if (rand < 88.98) currentPenaltyIndex = 2; // +5
    else if (rand < 98.98) currentPenaltyIndex = 3; // +10
    else currentPenaltyIndex = 4; // +20
    
    const targetDeg = 360 * 5 - (currentPenaltyIndex * 72 + 36);
    
    elements.penaltyWheel.style.transition = 'transform 0.8s cubic-bezier(0.25, 0.1, 0.2, 1.05)';
    elements.penaltyWheel.style.transform = `rotate(${targetDeg}deg)`;
    
    setTimeout(() => {
        showWheelResult();
    }, 850); 
}

function showWheelResult() {
    const msgs = [
        "Bạn được tha! Hãy làm lại câu này nhé.",
        "Hình phạt: Cộng thêm 3 câu vào đề!",
        "Hình phạt: Cộng thêm 5 câu vào đề!",
        "Xui quá! Cộng thêm 10 câu vào đề!",
        "JACKPOT! Cộng thêm 20 câu vào đề!"
    ];
    
    elements.wheelSubtitle.innerText = 'Đã có kết quả!';    
    elements.wheelResultText.innerText = msgs[currentPenaltyIndex];
    elements.wheelResultText.classList.remove('hidden');
    
    // Phân nhánh logic Desktop / Mobile
    if (window.innerWidth <= 1024) {
        // Mobile & Tablet: Hiển thị nút "Chấp nhận hình phạt" để người dùng bấm
        document.getElementById('btn-close-modal')?.classList.remove('hidden');
        document.getElementById('btn-close-modal')?.classList.add('show-btn');
    } else {
        // Desktop: Áp dụng hình phạt ngay lập tức để nút "Câu tiếp theo" sáng lên luôn
        applyPenaltyLogic();
    }
}

function applyPenaltyLogic() {
    if (currentPenaltyIndex === 0) {
        // Redo: clear answer and re-render immediately (no auto-timeout)
        state.answers[state.currentIndex] = null;
        renderQuestion();
    } else {
        // Add questions
        let addCount = 0;
        if (currentPenaltyIndex === 1) addCount = 3;
        else if (currentPenaltyIndex === 2) addCount = 5;
        else if (currentPenaltyIndex === 3) addCount = 10;
        else if (currentPenaltyIndex === 4) addCount = 20;
        
        for (let i = 0; i < addCount; i++) {
            if (state.funPool.length > 0) {
                const q = state.funPool.shift();
                state.questions.push(q);
                state.answers.push(null);
            } else {
                const randomIdx = Math.floor(Math.random() * state.questions.length);
                const duplicateQ = JSON.parse(JSON.stringify(state.questions[randomIdx]));
                state.questions.push(duplicateQ);
                state.answers.push(null);
            }
        }
        
        // Update the counter immediately so the user sees the penalty!
        elements.questionCounter.innerText = `${state.currentIndex + 1}/${state.questions.length}`;
        
        // Show next button so user can manually proceed
        updateNavButtons();
    }
}


// Results
function showResult() {
    elements.progressBar.style.width = `100%`;
    stopTimer();
    
    let correctCount = 0;
    state.questions.forEach((q, i) => {
        if (state.answers[i] === q.correctIndex) {
            correctCount++;
        }
    });
    
    elements.scoreCorrect.innerText = correctCount;
    elements.scoreTotal.innerText = state.questions.length;
    
    const percentage = Math.round((correctCount / state.questions.length) * 100) || 0;
    elements.scoreText.innerText = `${percentage}%`;
    
    const strokeColor = percentage >= 80 ? '#10b981' : percentage >= 50 ? '#f59e0b' : '#ef4444';
    elements.scoreCirclePath.style.stroke = strokeColor;
    
    setTimeout(() => {
        elements.scoreCirclePath.setAttribute('stroke-dasharray', `${percentage}, 100`);
    }, 100);
    
    const existingReview = document.querySelector('.review-list');
    if (existingReview) existingReview.remove();
    
    navigate('result-screen');
}

function showReview() {
    let reviewList = document.querySelector('.review-list');
    if (!reviewList) {
        reviewList = document.createElement('div');
        reviewList.className = 'review-list fade-in-up';
        
        state.questions.forEach((q, i) => {
            const userAnswerIndex = state.answers[i];
            const isCorrect = userAnswerIndex === q.correctIndex;
            
            const item = document.createElement('div');
            item.className = `review-item ${isCorrect ? 'correct-item' : 'incorrect-item'}`;
            
            const qTitle = document.createElement('div');
            qTitle.className = 'review-q';
            qTitle.innerText = `Câu ${i + 1}: ${q.originalQuestion}`;
            
            const userAnsDiv = document.createElement('div');
            if (userAnswerIndex !== null && userAnswerIndex >= 0) {
                userAnsDiv.className = `review-ans ${isCorrect ? 'user-ans-correct' : 'user-ans'}`;
                userAnsDiv.innerText = `Đáp án của bạn: ${String.fromCharCode(65 + userAnswerIndex)}. ${q.options[userAnswerIndex]}`;
            } else {
                userAnsDiv.className = 'review-ans user-ans';
                userAnsDiv.innerText = userAnswerIndex === -1 ? `Đáp án của bạn: (Hết giờ)` : `Đáp án của bạn: Chưa trả lời`;
            }
            
            item.appendChild(qTitle);
            item.appendChild(userAnsDiv);
            
            if (!isCorrect) {
                const correctAnsDiv = document.createElement('div');
                correctAnsDiv.className = 'review-ans correct-ans';
                correctAnsDiv.innerText = `Đáp án đúng: ${String.fromCharCode(65 + q.correctIndex)}. ${q.options[q.correctIndex]}`;
                item.appendChild(correctAnsDiv);
            }
            
            reviewList.appendChild(item);
        });
        
        document.querySelector('.result-card').appendChild(reviewList);
    }
}

// Start App
init();
