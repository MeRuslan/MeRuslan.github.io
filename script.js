document.addEventListener('DOMContentLoaded', () => {
    // --- VALIDATION LOGIC ---

    // Validation state tracking
    const validationState = {
        channelName: false,
        sources: false,
        samplePosts: true // Optional field, so default to true
    };

    // Helper function to set validation state
    const setValidationState = (input, icon, state, message) => {
        // Remove existing validation classes
        input.classList.remove('is-valid', 'is-invalid');

        // Add appropriate class and update icon
        switch (state) {
            case 'success':
                input.classList.add('is-valid');
                icon.innerHTML = '<span class="text-success">✓ ' + message + '</span>';
                break;
            case 'error':
                input.classList.add('is-invalid');
                icon.innerHTML = '<span class="text-danger">✗ ' + message + '</span>';
                break;
            case 'warning':
                icon.innerHTML = '<span class="text-warning">⚠ ' + message + '</span>';
                break;
            case 'loading':
                icon.innerHTML = '<span class="text-primary">⏳ ' + message + '</span>';
                break;
            case 'info':
                icon.innerHTML = '<span class="text-muted">ℹ ' + message + '</span>';
                break;
        }
    };

    // Channel name validation
    const validateChannelName = async (channelName) => {
        const channelInput = document.getElementById('channelName');
        const validationIcon = document.getElementById('channelNameValidation');

        if (!channelName || channelName.length < 2) {
            setValidationState(channelInput, validationIcon, 'error', 'Channel name too short');
            validationState.channelName = false;
            updateNextButtonState(); // Update button state
            return;
        }

        // Clean channel name - remove @ if present
        const cleanChannelName = channelName.replace('@', '');

        setValidationState(channelInput, validationIcon, 'loading', 'Checking channel...');

        try {
            // Basic format validation (fallback since we can't access Telegram API directly from web)
            const channelRegex = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/;
            if (channelRegex.test(cleanChannelName)) {
                setValidationState(channelInput, validationIcon, 'success', 'Channel name format is valid');
                validationState.channelName = true;
            } else {
                setValidationState(channelInput, validationIcon, 'error', 'Invalid channel name format (5-32 chars, letters/numbers/underscore)');
                validationState.channelName = false;
            }
        } catch (error) {
            setValidationState(channelInput, validationIcon, 'error', 'Validation error');
            validationState.channelName = false;
        }
        updateNextButtonState(); // Update button state
    };

    // Source URLs validation
    const validateSourceUrls = async (sourcesText) => {
        const sourcesInput = document.getElementById('sources');
        const validationIcon = document.getElementById('sourcesValidation');

        if (!sourcesText.trim()) {
            setValidationState(sourcesInput, validationIcon, 'error', 'At least one source URL required');
            validationState.sources = false;
            updateNextButtonState(); // Update button state
            return;
        }

        const urls = sourcesText.split('\n').filter(url => url.trim() !== '');

        if (urls.length === 0) {
            setValidationState(sourcesInput, validationIcon, 'error', 'No valid URLs found');
            validationState.sources = false;
            updateNextButtonState(); // Update button state
            return;
        }

        setValidationState(sourcesInput, validationIcon, 'loading', `Checking ${urls.length} URLs...`);

        let validUrls = 0;
        const validationResults = [];

        for (const url of urls) {
            try {
                const urlObj = new URL(url.trim());

                // Enhanced validation: check for common feed patterns
                const isFeedUrl = /\/(rss|feed|atom)(\.xml|\.rss)?(\?.*)?$/i.test(urlObj.pathname) ||
                                 /\/(index\.xml|rss\.xml|feed\.xml)$/i.test(urlObj.pathname);

                if (isFeedUrl) {
                    validUrls++;
                    validationResults.push({ url, status: 'feed' });
                } else {
                    validUrls++;
                    validationResults.push({ url, status: 'valid' });
                }
            } catch (error) {
                validationResults.push({ url, status: 'invalid' });
            }
        }

        const feedCount = validationResults.filter(r => r.status === 'feed').length;

        if (validUrls === urls.length) {
            const message = feedCount > 0 ?
                `All ${urls.length} URLs valid (${feedCount} detected as feeds)` :
                `All ${urls.length} URLs valid`;
            setValidationState(sourcesInput, validationIcon, 'success', message);
            validationState.sources = true;
        } else if (validUrls > 0) {
            setValidationState(sourcesInput, validationIcon, 'warning', `${validUrls}/${urls.length} URLs are valid`);
            validationState.sources = true; // Accept partial validation
        } else {
            setValidationState(sourcesInput, validationIcon, 'error', 'No valid URLs found');
            validationState.sources = false;
        }
        updateNextButtonState(); // Update button state
    };

    // Sample posts validation and parsing
    const validateSamplePosts = (postsText) => {
        const postsInput = document.getElementById('samplePosts');
        const validationIcon = document.getElementById('samplePostsValidation');

        if (!postsText.trim()) {
            setValidationState(postsInput, validationIcon, 'info', 'Sample posts are optional');
            validationState.samplePosts = true;
            updateNextButtonState(); // Update button state
            return [];
        }

        // Split on double line breaks
        const posts = postsText.split('\n\n').filter(post => post.trim() !== '');

        if (posts.length === 0) {
            setValidationState(postsInput, validationIcon, 'warning', 'No valid posts found');
            validationState.samplePosts = true; // Still optional
        } else {
            setValidationState(postsInput, validationIcon, 'success', `${posts.length} sample posts found`);
            validationState.samplePosts = true;
        }
        updateNextButtonState(); // Update button state
        return posts;
    };

    // Check if all validations pass
    const canProceedToNext = () => {
        return validationState.channelName && validationState.sources && validationState.samplePosts;
    };

    // Validate current step before allowing navigation
    const validateCurrentStep = () => {
        const activeStepId = document.querySelector('.wizard-step.active').id;

        switch (activeStepId) {
            case 'step-1':
                return validationState.channelName;
            case 'step-2':
                return validationState.sources;
            case 'step-3':
                // Check if a publication style is selected
                return document.querySelector('input[name="publicationStyle"]:checked') !== null;
            case 'step-4':
                return validationState.samplePosts;
            case 'step-5':
                // Check if media option is selected
                return document.querySelector('input[name="addMedia"]:checked') !== null;
            case 'step-6':
                // Check if postscript option is selected, and if yes, validate the text
                const psNoteSelected = document.querySelector('input[name="addPsNote"]:checked');
                if (!psNoteSelected) return false;

                if (psNoteSelected.value === 'true') {
                    const psNoteText = document.getElementById('psNoteText').value;
                    return psNoteText.trim().length > 0;
                }
                return true;
            case 'step-7':
                // Check if operating mode is selected
                return document.querySelector('input[name="operatingMode"]:checked') !== null;
            case 'step-8-auto':
                // Validate auto mode settings
                const syncScheduleAuto = document.getElementById('syncScheduleAuto');
                const minInterval = document.getElementById('minInterval');
                const maxPosts = document.getElementById('maxPosts');
                return syncScheduleAuto && syncScheduleAuto.value &&
                       minInterval && minInterval.value &&
                       maxPosts && maxPosts.value;
            case 'step-8-review':
                // Validate review mode settings
                const syncScheduleReview = document.getElementById('syncScheduleReview');
                return syncScheduleReview && syncScheduleReview.value;
            case 'step-ad-schedule':
                // Check if ad schedule option is selected
                return document.querySelector('input[name="enableAdSchedule"]:checked') !== null;
            default:
                return true; // Allow navigation for steps without specific validation
        }
    };

    // Update next button state based on validation
    const updateNextButtonState = () => {
        const isValid = validateCurrentStep();
        nextBtn.disabled = !isValid;

        if (!isValid) {
            nextBtn.classList.add('btn-secondary');
            nextBtn.classList.remove('btn-primary');
            nextBtn.textContent = 'Complete this step first';
        } else {
            nextBtn.classList.remove('btn-secondary');
            nextBtn.classList.add('btn-primary');
            nextBtn.textContent = 'Next';
        }
    };

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
    const totalSteps = 10; // Updated total number of logical steps

    // --- AD SCHEDULE LOGIC ---
    let adScheduleData = {};
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    let isDragging = false;
    let dragMode = null; // 'block' or 'unblock'
    let dragStartTime = null; // Track the start time of the drag

    const initializeAdSchedule = () => {
        for (let day = 0; day < 7; day++) {
            adScheduleData[day] = {};
            for (let hour = 0; hour < 24; hour++) {
                adScheduleData[day][hour] = false; // false = available, true = blocked
            }
        }
    };

    const generateScheduleGrid = () => {
        const grid = document.getElementById('scheduleGrid');
        grid.innerHTML = '';

        console.log('Starting grid generation...'); // Debug log

        // Empty top-left corner
        const emptyCorner = document.createElement('div');
        emptyCorner.style.backgroundColor = '#f0f0f0'; // Temporary visual aid
        grid.appendChild(emptyCorner);

        // Hour headers
        for (let hour = 0; hour < 24; hour++) {
            const hourHeader = document.createElement('div');
            hourHeader.className = 'hour-header';
            hourHeader.textContent = hour.toString().padStart(2, '0');
            grid.appendChild(hourHeader);
        }

        // Days and time slots
        for (let day = 0; day < 7; day++) {
            // Day label
            const dayLabel = document.createElement('div');
            dayLabel.className = 'day-label';
            dayLabel.textContent = days[day];
            grid.appendChild(dayLabel);

            // Time slots for this day
            for (let hour = 0; hour < 24; hour++) {
                const timeSlot = document.createElement('div');
                timeSlot.className = 'time-slot';
                timeSlot.dataset.day = day;
                timeSlot.dataset.hour = hour;

                // Click handler
                timeSlot.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    isDragging = true;
                    dragStartTime = Date.now(); // Track when drag started
                    const isCurrentlyBlocked = adScheduleData[day][hour];
                    dragMode = isCurrentlyBlocked ? 'unblock' : 'block';
                    toggleTimeSlot(day, hour, dragMode === 'block');
                });

                timeSlot.addEventListener('mouseenter', (e) => {
                    if (isDragging && dragMode) {
                        toggleTimeSlot(day, hour, dragMode === 'block');
                    }
                });

                timeSlot.addEventListener('click', (e) => {
                    e.preventDefault();
                    // Only handle click if it wasn't part of a drag operation
                    const timeSinceMouseDown = Date.now() - (dragStartTime || 0);
                    if (!isDragging && timeSinceMouseDown > 150) {
                        const isCurrentlyBlocked = adScheduleData[day][hour];
                        toggleTimeSlot(day, hour, !isCurrentlyBlocked);
                    }
                });

                grid.appendChild(timeSlot);
            }
        }

        console.log('Grid generation completed. Total children:', grid.children.length); // Debug log

        // Stop dragging on mouse up
        document.addEventListener('mouseup', () => {
            isDragging = false;
            dragMode = null;
        });
    };

    const toggleTimeSlot = (day, hour, blocked) => {
        adScheduleData[day][hour] = blocked;
        const timeSlot = document.querySelector(`[data-day="${day}"][data-hour="${hour}"]`);
        if (blocked) {
            timeSlot.classList.add('blocked');
        } else {
            timeSlot.classList.remove('blocked');
        }
    };

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

        // Update next button state based on current step validation
        updateNextButtonState();
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
        // Check validation before proceeding
        if (!validateCurrentStep()) {
            return; // Don't proceed if validation fails
        }

        let nextStepId = '';
        const activeStepId = document.querySelector('.wizard-step.active').id;

        if (activeStepId === 'step-7') {
            // Conditional step based on mode selection
            const mode = document.querySelector('input[name="operatingMode"]:checked').value;
            nextStepId = (mode === 'auto') ? 'step-8-auto' : 'step-8-review';
            showStep(nextStepId);
        } else if (activeStepId === 'step-8-auto' || activeStepId === 'step-8-review') {
            showStep('step-ad-schedule');
        } else if (activeStepId === 'step-ad-schedule') {
            showStep('step-9');
        }
        else {
            if (currentStep < steps.length - 1) {
               currentStep++;
               const nextStep = steps.find(step => !step.id.includes('auto') && !step.id.includes('review') && !step.id.includes('ad-schedule') && steps.indexOf(step) === currentStep);
               if (nextStep) showStep(steps.indexOf(nextStep));
            }
        }
    });

    prevBtn.addEventListener('click', () => {
        const activeStepId = document.querySelector('.wizard-step.active').id;

        if (activeStepId === 'step-8-auto' || activeStepId === 'step-8-review') {
            showStep('step-7');
        } else if (activeStepId === 'step-ad-schedule') {
            const mode = document.querySelector('input[name="operatingMode"]:checked').value;
            const prevStepId = (mode === 'auto') ? 'step-8-auto' : 'step-8-review';
            showStep(prevStepId);
        } else if (activeStepId === 'step-9') {
            showStep('step-ad-schedule');
        }
        else {
            if (currentStep > 0) {
                currentStep--;
                const prevStep = steps.find(step => !step.id.includes('auto') && !step.id.includes('review') && !step.id.includes('ad-schedule') && steps.indexOf(step) === currentStep);
                if (prevStep) showStep(steps.indexOf(prevStep));
            }
        }
    });

    // --- INPUT VALIDATION EVENT LISTENERS ---

    // Channel name validation with debounce
    let channelNameTimeout;
    document.getElementById('channelName').addEventListener('input', (e) => {
        clearTimeout(channelNameTimeout);
        channelNameTimeout = setTimeout(() => {
            validateChannelName(e.target.value);
        }, 500); // 500ms debounce
    });

    // Sources validation with debounce
    let sourcesTimeout;
    document.getElementById('sources').addEventListener('input', (e) => {
        clearTimeout(sourcesTimeout);
        sourcesTimeout = setTimeout(() => {
            validateSourceUrls(e.target.value);
        }, 1000); // 1s debounce for URL checking
    });

    // Sample posts validation
    document.getElementById('samplePosts').addEventListener('input', (e) => {
        validateSamplePosts(e.target.value);
    });

    // Add event listeners for radio buttons that affect validation
    document.querySelectorAll('input[name="publicationStyle"]').forEach(radio => {
        radio.addEventListener('change', updateNextButtonState);
    });

    document.querySelectorAll('input[name="addMedia"]').forEach(radio => {
        radio.addEventListener('change', updateNextButtonState);
    });

    document.querySelectorAll('input[name="addPsNote"]').forEach(radio => {
        radio.addEventListener('change', updateNextButtonState);
    });

    document.querySelectorAll('input[name="operatingMode"]').forEach(radio => {
        radio.addEventListener('change', updateNextButtonState);
    });

    document.querySelectorAll('input[name="enableAdSchedule"]').forEach(radio => {
        radio.addEventListener('change', updateNextButtonState);
    });

    // Add event listeners for text inputs and selects that affect validation
    // These will be added when the elements exist in the DOM
    document.addEventListener('DOMContentLoaded', () => {
        const psNoteText = document.getElementById('psNoteText');
        if (psNoteText) {
            psNoteText.addEventListener('input', updateNextButtonState);
        }

        const syncScheduleAuto = document.getElementById('syncScheduleAuto');
        if (syncScheduleAuto) {
            syncScheduleAuto.addEventListener('change', updateNextButtonState);
        }

        const minInterval = document.getElementById('minInterval');
        if (minInterval) {
            minInterval.addEventListener('input', updateNextButtonState);
        }

        const maxPosts = document.getElementById('maxPosts');
        if (maxPosts) {
            maxPosts.addEventListener('input', updateNextButtonState);
        }

        const syncScheduleReview = document.getElementById('syncScheduleReview');
        if (syncScheduleReview) {
            syncScheduleReview.addEventListener('change', updateNextButtonState);
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

    // Ad schedule toggle logic
    const adScheduleRadios = document.querySelectorAll('input[name="enableAdSchedule"]');
    const adScheduleContainer = document.getElementById('adScheduleContainer');
    adScheduleRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            console.log('Ad schedule radio changed:', e.target.value); // Debug log
            if (e.target.value === 'true') {
                adScheduleContainer.classList.remove('hidden');
                const scheduleGrid = document.getElementById('scheduleGrid');
                console.log('Schedule grid element:', scheduleGrid); // Debug log
                console.log('Grid has children:', scheduleGrid.hasChildNodes()); // Debug log

                // Always generate the grid when enabling
                console.log('Generating schedule grid...'); // Debug log
                generateScheduleGrid();
                console.log('Grid children after generation:', scheduleGrid.children.length); // Debug log
            } else {
                adScheduleContainer.classList.add('hidden');
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
            const adScheduleEnabled = document.querySelector('input[name="enableAdSchedule"]:checked').value === 'true';

            const collectedData = {
                channelName: document.getElementById('channelName').value,
                sources: document.getElementById('sources').value.split('\n').filter(url => url.trim() !== ''),
                publicationStyle: document.querySelector('input[name="publicationStyle"]:checked').value,
                samplePosts: validateSamplePosts(document.getElementById('samplePosts').value), // Parse as array
                addMedia: document.querySelector('input[name="addMedia"]:checked').value === 'true',
                postscript: {
                    enabled: psNoteEnabled,
                    text: psNoteEnabled ? document.getElementById('psNoteText').value : null,
                },
                mode: mode,
                schedule: {},
                adSchedule: {
                    enabled: adScheduleEnabled,
                    blockedSlots: adScheduleEnabled ? adScheduleData : null
                }
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

    // Initialize ad schedule data
    initializeAdSchedule();

    // Initial UI setup
    updateUI();
});
