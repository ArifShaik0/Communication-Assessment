// Story Summarization Assessment Module - Azure Speech SDK Implementation

class StoryAssessment {
    constructor() {
        this.currentStory = '';
        this.audioUrl = '';
        this.recognizer = null;
        this.isRecording = false;
        this.isInitialized = false;
        this.azureConfig = null;
        this.playCount = 2;
        this.userSummary = '';
        
        this.initializeElements();
        this.initializeEventListeners();
    }

    initializeElements() {
        this.elements = {
            loading: document.getElementById('story-loading'),
            player: document.getElementById('story-player'),
            audio: document.getElementById('story-audio'),
            playCount: document.getElementById('story-play-count'),
            summarySection: document.getElementById('story-summary-section'),
            recordBtn: document.getElementById('story-record-btn'),
            stopBtn: document.getElementById('story-stop-btn'),
            status: document.getElementById('story-status'),
            results: document.getElementById('story-results'),
            score: document.getElementById('story-score'),
            feedback: document.getElementById('story-feedback')
        };
    }

    initializeEventListeners() {
        if (this.elements.recordBtn) {
            this.elements.recordBtn.addEventListener('click', () => this.startRecording());
        }
        
        if (this.elements.stopBtn) {
            this.elements.stopBtn.addEventListener('click', () => this.stopRecording());
        }

        // Audio player event listeners
        if (this.elements.audio) {
            this.elements.audio.addEventListener('play', () => {
                if (this.playCount > 0) {
                    this.playCount--;
                    this.elements.playCount.textContent = this.playCount;
                    
                    if (this.playCount === 0) {
                        // Show summary section after audio has been played
                        this.elements.audio.addEventListener('ended', () => {
                            this.elements.summarySection.style.display = 'block';
                        }, { once: true });
                    } else {
                        this.elements.summarySection.style.display = 'block';
                    }
                }
            });
            
            this.elements.audio.addEventListener('error', (e) => {
                console.error('Audio playback error:', e);
                this.showError('Audio playback failed. Please try refreshing the page.');
            });
        }
    }

    async initialize() {
        if (this.isInitialized) {
            return;
        }

        console.log('Initializing Story Assessment...');
        
        // Check if Speech SDK is available
        if (!window.SpeechSDK) {
            this.showError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
            return;
        }

        this.resetUI();
        await this.loadAzureConfig();
        await this.generateStoryAndAudio();
        this.isInitialized = true;
    }

    async loadAzureConfig() {
        try {
            const response = await fetch('/api/azure-config');
            this.azureConfig = await response.json();
            console.log('Azure configuration loaded for story assessment');
        } catch (error) {
            console.error('Failed to load Azure configuration:', error);
            this.showError('Failed to load speech configuration. Please refresh the page.');
        }
    }

    resetUI() {
        // Show loading, hide everything else
        this.elements.loading.style.display = 'block';
        this.elements.player.style.display = 'none';
        this.elements.results.style.display = 'none';
        
        // Reset state
        this.playCount = 2;
        this.userSummary = '';
        this.isRecording = false;
        this.elements.recordBtn.style.display = 'inline-block';
        this.elements.stopBtn.style.display = 'none';
        this.elements.status.textContent = '';
        this.elements.status.className = 'recording-status';
        this.elements.summarySection.style.display = 'none';
        
        // Reset audio
        if (this.elements.audio) {
            this.elements.audio.src = '';
        }
    }

    async generateStoryAndAudio() {
        try {
            console.log('Generating story and audio...');
            
            const response = await fetch('/api/story/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.story && data.audioUrl) {
                this.currentStory = data.story;
                this.audioUrl = data.audioUrl;
                this.displayStoryContent();
            } else {
                throw new Error('Incomplete story content received from server');
            }
            
        } catch (error) {
            console.error('Error generating story content:', error);
            this.showError('Failed to generate story content. Please try refreshing the page.');
        }
    }

    displayStoryContent() {
        this.elements.loading.style.display = 'none';
        this.elements.player.style.display = 'block';
        
        // Set audio source
        this.elements.audio.src = this.audioUrl;
        this.elements.audio.load();
        
        // Reset play count display
        this.elements.playCount.textContent = this.playCount;
        
        console.log('Story content displayed');
        console.log('Story:', this.currentStory);
        console.log('Audio URL:', this.audioUrl);
    }

    async startRecording() {
        if (this.isRecording || !this.azureConfig) return;

        try {
            console.log('Starting story summary recording with Azure Speech SDK...');
            
            const SpeechSDK = window.SpeechSDK;
            
            // Create speech configuration for continuous recognition
            const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
                this.azureConfig.subscriptionKey, 
                this.azureConfig.region
            );
            speechConfig.speechRecognitionLanguage = 'en-US';

            // Create audio configuration
            const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();

            // Create speech recognizer for continuous recognition
            this.recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

            this.userSummary = '';
            this.isRecording = true;
            
            // Update UI
            this.elements.recordBtn.style.display = 'none';
            this.elements.stopBtn.style.display = 'inline-block';
            this.elements.status.textContent = '🎤 Recording... Summarize the story you just heard';
            this.elements.status.className = 'recording-status recording';
            
            // Handle recognition events
            this.recognizer.recognizing = (s, e) => {
                // Show intermediate results
                const interim = this.userSummary + e.result.text;
                this.elements.status.textContent = `🎤 Recording... "${interim}"`;
            };

            this.recognizer.recognized = (s, e) => {
                if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech && e.result.text.trim()) {
                    this.userSummary += e.result.text + ' ';
                    this.elements.status.textContent = `🎤 Recording... "${this.userSummary.trim()}"`;
                }
            };

            this.recognizer.canceled = (s, e) => {
                console.log('Recognition canceled:', e.reason);
                this.stopRecording();
            };

            // Start continuous recognition
            this.recognizer.startContinuousRecognitionAsync(
                () => {
                    console.log('Continuous recognition started');
                },
                (err) => {
                    console.error('Failed to start recognition:', err);
                    this.showError('Failed to start recording. Please check microphone permissions.');
                    this.isRecording = false;
                    this.elements.recordBtn.style.display = 'inline-block';
                    this.elements.stopBtn.style.display = 'none';
                }
            );
            
        } catch (error) {
            console.error('Error starting story recording:', error);
            this.showError('Could not start recording. Please check your microphone permissions.');
            this.isRecording = false;
            this.elements.recordBtn.style.display = 'inline-block';
            this.elements.stopBtn.style.display = 'none';
        }
    }

    stopRecording() {
        if (this.recognizer && this.isRecording) {
            console.log('Stopping story recording...');
            
            this.recognizer.stopContinuousRecognitionAsync(
                () => {
                    this.isRecording = false;
                    this.elements.recordBtn.style.display = 'inline-block';
                    this.elements.stopBtn.style.display = 'none';
                    this.elements.status.textContent = '⏳ Processing your summary...';
                    this.elements.status.className = 'recording-status';
                    
                    // Process the recorded summary
                    this.processSummary();
                },
                (err) => {
                    console.error('Error stopping recognition:', err);
                    this.isRecording = false;
                }
            );
        }
    }

    async processSummary() {
        if (!this.userSummary.trim()) {
            this.showError('No summary was recorded. Please try again.');
            this.elements.status.textContent = '';
            return;
        }

        try {
            console.log('Processing story summary:', this.userSummary);
            
            this.elements.status.textContent = '🔄 Evaluating your summary...';
            
            const response = await fetch('/api/story/evaluate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userSummary: this.userSummary.trim()
                })
            });

            if (!response.ok) {
                throw new Error(`Evaluation failed: ${response.status}`);
            }

            const result = await response.json();
            console.log('Story evaluation result:', result);
            
            this.displayResults(result);
            
        } catch (error) {
            console.error('Error processing story summary:', error);
            this.showError('Failed to evaluate summary. Please try again.');
        }
    }

    displayResults(result) {
        // Hide status and show results
        this.elements.status.textContent = '';
        this.elements.player.style.display = 'none';
        this.elements.results.style.display = 'block';
        
        // Display score
        const score = Math.round(result.score || 0);
        this.elements.score.textContent = score;
        
        // Generate feedback display
        let feedbackHtml = '<div class="story-feedback-content">';
        
        // Show original story
        feedbackHtml += '<div class="original-story">';
        feedbackHtml += '<h4>📖 Original Story:</h4>';
        feedbackHtml += `<p class="story-text">"${result.originalStory}"</p>`;
        feedbackHtml += '</div>';
        
        // Show user summary
        feedbackHtml += '<div class="user-summary">';
        feedbackHtml += '<h4>📝 Your Summary:</h4>';
        feedbackHtml += `<p class="summary-text">"${this.userSummary.trim()}"</p>`;
        feedbackHtml += '</div>';
        
        // Show AI feedback
        feedbackHtml += '<div class="ai-feedback">';
        feedbackHtml += '<h4>🤖 AI Evaluation:</h4>';
        feedbackHtml += `<div class="feedback-text">${result.feedback.replace(/\n/g, '<br>')}</div>`;
        feedbackHtml += '</div>';
        
        feedbackHtml += '</div>';
        
        this.elements.feedback.innerHTML = feedbackHtml;
        
        // Color code the score
        this.colorCodeScore(score);
        
        // Notify main controller that assessment is complete
        if (window.assessmentController) {
            window.assessmentController.onAssessmentComplete('story', result.score);
        }
        
        console.log('Story assessment completed with score:', result.score);
    }

    colorCodeScore(score) {
        const scoreElement = this.elements.score;
        
        // Remove existing color classes
        scoreElement.classList.remove('score-excellent', 'score-good', 'score-fair', 'score-poor');
        
        // Add appropriate color class
        if (score >= 80) {
            scoreElement.classList.add('score-excellent');
            scoreElement.style.color = '#28a745';
        } else if (score >= 60) {
            scoreElement.classList.add('score-good');
            scoreElement.style.color = '#ffc107';
        } else if (score >= 40) {
            scoreElement.classList.add('score-fair');
            scoreElement.style.color = '#fd7e14';
        } else {
            scoreElement.classList.add('score-poor');
            scoreElement.style.color = '#dc3545';
        }
    }

    showError(message) {
        this.elements.loading.style.display = 'none';
        this.elements.status.textContent = `❌ ${message}`;
        this.elements.status.style.color = '#dc3545';
        this.elements.status.className = 'recording-status error';
    }

    // Reset the assessment for retrying
    reset() {
        this.isInitialized = false;
        this.currentStory = '';
        this.audioUrl = '';
        this.userSummary = '';
        this.playCount = 2;
        this.isRecording = false;
        
        if (this.recognizer) {
            try {
                this.recognizer.stopContinuousRecognitionAsync();
                this.recognizer.close();
            } catch (e) {
                console.log('Error closing story recognizer:', e);
            }
            this.recognizer = null;
        }
        
        if (this.elements.audio) {
            this.elements.audio.pause();
            this.elements.audio.src = '';
        }
    }
}

// Initialize the story assessment when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.StoryAssessment = new StoryAssessment();
    console.log('Story Assessment module loaded with Azure Speech SDK');
}); 