/* ============================================
   AI Judge – Roast Me | App Logic
   ============================================ */

(function () {
    'use strict';

    // --- DOM Elements ---
    const uploadCard = document.getElementById('uploadCard');
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const previewImage = document.getElementById('previewImage');
    const removeBtn = document.getElementById('removeBtn');
    const roastBtn = document.getElementById('roastBtn');
    const btnText = roastBtn.querySelector('.btn-text');
    const btnLoading = roastBtn.querySelector('.btn-loading');
    const loadingCard = document.getElementById('loadingCard');
    const resultCard = document.getElementById('resultCard');
    const resultImage = document.getElementById('resultImage');
    const verdictTitle = document.getElementById('verdictTitle');
    const roastLevelBadge = document.getElementById('roastLevelBadge');
    const levelText = document.getElementById('levelText');
    const roastText = document.getElementById('roastText');
    const downloadBtn = document.getElementById('downloadBtn');
    const shareBtn = document.getElementById('shareBtn');
    const shareMenu = document.getElementById('shareMenu');
    const roastAgainBtn = document.getElementById('roastAgainBtn');
    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toastText');
    const memeCanvas = document.getElementById('memeCanvas');

    // --- State ---
    let selectedFile = null;
    let currentRoastData = null;

    // --- Background Particles ---
    function createParticles() {
        const container = document.getElementById('bgParticles');
        const colors = ['#a855f7', '#ec4899', '#6366f1', '#22d3ee'];
        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            const size = Math.random() * 120 + 40;
            particle.style.cssText = `
                width: ${size}px;
                height: ${size}px;
                background: ${colors[i % colors.length]};
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                animation-delay: ${Math.random() * -20}s;
                animation-duration: ${15 + Math.random() * 15}s;
            `;
            container.appendChild(particle);
        }
    }

    // --- File Upload ---
    function handleFiles(files) {
        const file = files[0];
        if (!file) return;

        // Validate type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            showToast('Please upload a JPEG, PNG, or WebP image.');
            return;
        }

        // Validate size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image too large! Maximum size is 5MB.');
            return;
        }

        selectedFile = file;
        showPreview(file);
    }

    function showPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            uploadZone.style.display = 'none';
            previewContainer.style.display = 'block';
            roastBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    }

    function removePhoto() {
        selectedFile = null;
        previewImage.src = '';
        fileInput.value = '';
        previewContainer.style.display = 'none';
        uploadZone.style.display = 'block';
        roastBtn.disabled = true;
    }

    // --- Drag & Drop ---
    uploadZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
    removeBtn.addEventListener('click', removePhoto);

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });

    // --- Roast Me ---
    roastBtn.addEventListener('click', async () => {
        if (!selectedFile) return;

        // Show loading
        setLoadingState(true);
        uploadCard.style.display = 'none';
        loadingCard.style.display = 'block';
        resultCard.style.display = 'none';

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await fetch('/api/roast', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Something went wrong');
            }

            const data = await response.json();
            currentRoastData = data;
            showResult(data);
        } catch (error) {
            showToast(error.message || 'Failed to generate roast. Try again!');
            loadingCard.style.display = 'none';
            uploadCard.style.display = 'block';
            setLoadingState(false);
        }
    });

    function setLoadingState(loading) {
        if (loading) {
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline-flex';
            roastBtn.disabled = true;
        } else {
            btnText.style.display = 'inline-flex';
            btnLoading.style.display = 'none';
            roastBtn.disabled = false;
        }
    }

    function showResult(data) {
        loadingCard.style.display = 'none';
        resultCard.style.display = 'block';

        // Set image
        resultImage.src = data.image;

        // Set verdict
        verdictTitle.textContent = data.verdict;

        // Set level
        const levelMap = { 'Mild': 'level-mild', 'Medium': 'level-medium', 'Brutal': 'level-brutal' };
        roastLevelBadge.className = 'roast-level-badge ' + (levelMap[data.level] || 'level-medium');
        levelText.textContent = data.level;

        // Set roast text
        roastText.textContent = `"${data.roast}"`;
    }

    // --- Roast Again ---
    roastAgainBtn.addEventListener('click', () => {
        resultCard.style.display = 'none';
        uploadCard.style.display = 'block';
        shareMenu.style.display = 'none';
        removePhoto();
        setLoadingState(false);
        currentRoastData = null;
    });

    // --- Download Meme ---
    downloadBtn.addEventListener('click', async () => {
        if (!currentRoastData) return;

        try {
            const canvas = memeCanvas;
            const ctx = canvas.getContext('2d');

            // Load user image
            const img = new Image();
            img.crossOrigin = 'anonymous';

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = currentRoastData.image;
            });

            // Canvas dimensions
            const cw = 600;
            const imgH = Math.min(img.height * (cw / img.width), 500);
            const textAreaH = 200;
            const ch = imgH + textAreaH;

            canvas.width = cw;
            canvas.height = ch;

            // Background
            ctx.fillStyle = '#0a0a1a';
            ctx.fillRect(0, 0, cw, ch);

            // User image
            ctx.drawImage(img, 0, 0, cw, imgH);

            // Gradient overlay on image bottom
            const grad = ctx.createLinearGradient(0, imgH - 80, 0, imgH);
            grad.addColorStop(0, 'rgba(10,10,26,0)');
            grad.addColorStop(1, 'rgba(10,10,26,1)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, imgH - 80, cw, 80);

            // Text area
            const textY = imgH + 20;

            // Verdict
            ctx.fillStyle = '#a855f7';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('VERDICT', cw / 2, textY);

            ctx.fillStyle = '#f0f0ff';
            ctx.font = 'bold 28px Inter, sans-serif';
            ctx.fillText(currentRoastData.verdict, cw / 2, textY + 35);

            // Roast text (with word wrapping)
            ctx.fillStyle = '#9d9dba';
            ctx.font = '500 16px Inter, sans-serif';
            wrapText(ctx, `"${currentRoastData.roast}"`, cw / 2, textY + 65, cw - 60, 22);

            // Level badge
            const levelColors = { 'Mild': '#22c55e', 'Medium': '#f59e0b', 'Brutal': '#ef4444' };
            ctx.fillStyle = levelColors[currentRoastData.level] || '#f59e0b';
            ctx.font = 'bold 13px Inter, sans-serif';
            ctx.fillText(`🔥 ${currentRoastData.level.toUpperCase()}`, cw / 2, textY + 130);

            // Branding
            ctx.fillStyle = '#5e5e7e';
            ctx.font = '500 12px Inter, sans-serif';
            ctx.fillText('AI Judge ⚖️ • aijudge.roastme', cw / 2, ch - 15);

            // Download
            const link = document.createElement('a');
            link.download = `ai-judge-roast-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            showToast('Roast downloaded! 🔥');
        } catch (err) {
            showToast('Could not generate meme image.');
            console.error(err);
        }
    });

    function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let currentY = y;

        for (const word of words) {
            const testLine = line + word + ' ';
            if (ctx.measureText(testLine).width > maxWidth && line !== '') {
                ctx.fillText(line.trim(), x, currentY);
                line = word + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line.trim(), x, currentY);
    }

    // --- Share ---
    shareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Try Web Share API first (mobile)
        if (navigator.share) {
            navigator.share({
                title: `AI Judge Verdict: ${currentRoastData.verdict}`,
                text: `${currentRoastData.roast}\n\n🔥 Roast Level: ${currentRoastData.level}\n⚖️ Try it yourself!`,
            }).catch(() => {
                // User cancelled or not supported, show fallback
                toggleShareMenu();
            });
        } else {
            toggleShareMenu();
        }
    });

    function toggleShareMenu() {
        shareMenu.style.display = shareMenu.style.display === 'none' ? 'block' : 'none';
    }

    // Close share menu on outside click
    document.addEventListener('click', (e) => {
        if (!shareMenu.contains(e.target) && e.target !== shareBtn) {
            shareMenu.style.display = 'none';
        }
    });

    // Share options
    document.querySelectorAll('.share-option').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!currentRoastData) return;
            const platform = btn.dataset.platform;
            const text = `⚖️ AI Judge Verdict: ${currentRoastData.verdict}\n\n"${currentRoastData.roast}"\n\n🔥 Roast Level: ${currentRoastData.level}\n\nGet roasted 👉`;

            switch (platform) {
                case 'whatsapp':
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                    break;
                case 'twitter':
                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
                    break;
                case 'copy':
                    navigator.clipboard.writeText(text).then(() => {
                        showToast('Copied to clipboard! 📋');
                    }).catch(() => {
                        showToast('Could not copy text.');
                    });
                    break;
            }

            shareMenu.style.display = 'none';
        });
    });

    // --- Toast ---
    let toastTimer;
    function showToast(message) {
        clearTimeout(toastTimer);
        toastText.textContent = message;
        toast.style.display = 'flex';
        toastTimer = setTimeout(() => {
            toast.style.display = 'none';
        }, 3500);
    }

    // --- Init ---
    createParticles();

})();
