document.addEventListener('DOMContentLoaded', () => {
    // --- TELEGRAM WEBAPP SETUP ---
    const tg = window.Telegram.WebApp;
    tg.ready(); // Inform Telegram the app is ready
    tg.expand(); // Expand the app to full height

    // Set user's name, with a fallback for local testing
    const user = tg.initDataUnsafe?.user;
    if (user?.first_name) {
        document.getElementById('username').textContent = user.first_name;
    }

    // --- WIZARD LOGIC ---
    const steps = Array.from(document.querySelectorAll('.wizard-step'));
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const finishBtn = document.getElementById('finishBtn');
    const progressBar = document.getElementById('progressBar');

    let currentStep = 0;
    const totalSteps = 9; // Total number of logical steps

    const updateUI = () => {
        // Update progress bar
        progressBar.style.width = `${((currentStep + 1) / totalSteps) * 100}%`;

        // Show/hide steps
        steps.forEach((step, index) => {
            // We need a special way to identify which step is active
            const stepId = step.getAttribute('id');
            const isActive = document.querySelector('.wizard-step.active').getAttribute('id') === stepId;
            if (isActive) {
                 step.classList.add('active');
            } else {
                 step.classList.remove('active');
            }
        });

        // Update button visibility
        prevBtn.style.visibility = currentStep === 0 ? 'hidden' : 'visible';

        const activeStepId = document.querySelector('.wizard-step.active').id;
        if (activeStepId === 'step-9') {
            nextBtn.classList.add('hidden');
            finishBtn.classList.remove('hidden');
        } else {
            nextBtn.classList.remove('hidden');
            finishBtn.classList.add('hidden');
        }
    };

    const showStep = (stepIndexOrId) => {
        document.querySelector('.wizard-step.active').classList.remove('active');
        if (typeof stepIndexOrId === 'number') {
            steps[stepIndexOrId].classList.add('active');
            currentStep = steps.findIndex(step => step.id === steps[stepIndexOrId].id);
        } else {
            document.getElementById(stepIndexOrId).classList.add('active');
            currentStep = steps.findIndex(step => step.id === stepIndexOrId);
        }
        updateUI();
    };

    nextBtn.addEventListener('click', () => {
        let nextStepId = '';
        const activeStepId = document.querySelector('.wizard-step.active').id;

        if (activeStepId === 'step-7') {
            // Conditional step based on mode selection
            const mode = document.querySelector('input[name="operatingMode"]:checked').value;
            nextStepId = (mode === 'auto') ? 'step-8-auto' : 'step-8-review';
            showStep(nextStepId);
        } else if (activeStepId === 'step-8-auto' || activeStepId === 'step-8-review') {
            showStep('step-9');
        }
        else {
            if (currentStep < steps.length - 1) {
               currentStep++;
               const nextStep = steps.find(step => !step.id.includes('auto') && !step.id.includes('review') && steps.indexOf(step) === currentStep);
               if (nextStep) showStep(steps.indexOf(nextStep));
            }
        }
    });

    prevBtn.addEventListener('click', () => {
        const activeStepId = document.querySelector('.wizard-step.active').id;

        if (activeStepId === 'step-8-auto' || activeStepId === 'step-8-review') {
            showStep('step-7');
        } else if (activeStepId === 'step-9') {
            const mode = document.querySelector('input[name="operatingMode"]:checked').value;
            const prevStepId = (mode === 'auto') ? 'step-8-auto' : 'step-8-review';
            showStep(prevStepId);
        }
        else {
            if (currentStep > 0) {
                currentStep--;
                const prevStep = steps.find(step => !step.id.includes('auto') && !step.id.includes('review') && steps.indexOf(step) === currentStep);
                if (prevStep) showStep(steps.indexOf(prevStep));
            }
        }
    });

    // --- CONDITIONAL INPUT LOGIC ---
    const psNoteRadios = document.querySelectorAll('input[name="addPsNote"]');
    const psNoteInputContainer = document.getElementById('psNoteInputContainer');
    psNoteRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'true') {
                psNoteInputContainer.classList.remove('hidden');
            } else {
                psNoteInputContainer.classList.add('hidden');
            }
        });
    });

    // --- DATA SUBMISSION ---
    finishBtn.addEventListener('click', () => {
        // Change button text to show activity
        finishBtn.textContent = 'Sending...';
        finishBtn.disabled = true;

        try {
            // 1. Gather all data into an object
            const mode = document.querySelector('input[name="operatingMode"]:checked').value;
            const psNoteEnabled = document.querySelector('input[name="addPsNote"]:checked').value === 'true';

            const collectedData = {
                channelName: document.getElementById('channelName').value,
                sources: document.getElementById('sources').value.split('\n').filter(url => url.trim() !== ''),
                publicationStyle: document.querySelector('input[name="publicationStyle"]:checked').value,
                samplePosts: document.getElementById('samplePosts').value,
                addMedia: document.querySelector('input[name="addMedia"]:checked').value === 'true',
                postscript: {
                    enabled: psNoteEnabled,
                    text: psNoteEnabled ? document.getElementById('psNoteText').value : null,
                },
                mode: mode,
                schedule: {},
            };

            if (mode === 'auto') {
                collectedData.schedule = {
                    sync: document.getElementById('syncScheduleAuto').value,
                    minInterval: document.getElementById('minInterval').value,
                    maxPostsPerDay: document.getElementById('maxPosts').value,
                };
            } else { // review mode
                collectedData.schedule = {
                    sync: document.getElementById('syncScheduleReview').value,
                };
            }

            // 2. Convert to JSON string
            const jsonData = JSON.stringify(collectedData, null, 2);

            // **DEBUGGING STEP:** Log the data to the console
            console.log("Attempting to send data:", jsonData);

            // 3. Send data to Telegram bot
            // This function only works when the page is opened inside Telegram
            console.log("Tg object:", tg);

            tg.sendData(jsonData);

            // 4. IMPORTANT: Do not call tg.close() immediately.
            // The sendData function implicitly signals the app can be closed.
            // Calling close() yourself can sometimes interrupt the data sending process.
            // If you must close it, do it after a short delay:
            setTimeout(() => tg.close(), 500);

        } catch (error) {
            // **DEBUGGING STEP:** If anything fails, show an alert
            console.error("Failed to send data:", error);
            alert("Error: Could not send data. \n\n" + error.message + "\n\nThis usually means you are not running the app inside Telegram.");

            // Re-enable the button if it failed
            finishBtn.textContent = 'Finish';
            finishBtn.disabled = false;
        }
    });


    // Initial UI setup
    updateUI();
});
