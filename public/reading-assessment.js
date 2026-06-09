// Reading Assessment Module - Azure Speech SDK Implementation

class ReadingAssessment {
    constructor() {
        this.currentSentence = '';
        this.recognizer = null;
        this.isRecording = false;
        this.isInitialized = false;
        this.azureConfig = null;
        
        this.initializeElements();
        this.initializeEventListeners();
    }

    initializeElements() {
        this.elements = {
            loading: document.getElementById('reading-loading'),
            sentence: document.getElementById('reading-sentence'),
            controls: document.getElementById('reading-controls'),
            recordBtn: document.getElementById('reading-record-btn'),
            stopBtn: document.getElementById('reading-stop-btn'),
            status: document.getElementById('reading-status'),
            results: document.getElementById('reading-results'),
            score: document.getElementById('reading-score'),
            feedback: document.getElementById('reading-feedback')
        };
    }

    initializeEventListeners() {
        if (this.elements.recordBtn) {
            this.elements.recordBtn.addEventListener('click', () => this.startRecording());
        }
        
        if (this.elements.stopBtn) {
            this.elements.stopBtn.addEventListener('click', () => this.stopRecording());
        }
    }

    async initialize() {
        if (this.isInitialized) {
            return;
        }

        console.log('Initializing Reading Assessment...');
        
        // Check if Speech SDK is available
        if (!window.SpeechSDK) {
            this.showError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
            return;
        }

        this.resetUI();
        await this.loadAzureConfig();
        await this.generateSentence();
        this.isInitialized = true;
    }

    async loadAzureConfig() {
        try {
            const response = await fetch('/api/azure-config');
            this.azureConfig = await response.json();
            console.log('Azure configuration loaded');
        } catch (error) {
            console.error('Failed to load Azure configuration:', error);
            this.showError('Failed to load speech configuration. Please refresh the page.');
        }
    }

    resetUI() {
        // Show loading, hide everything else
        this.elements.loading.style.display = 'block';
        this.elements.sentence.style.display = 'none';
        this.elements.controls.style.display = 'none';
        this.elements.results.style.display = 'none';
        
        // Reset recording state
        this.isRecording = false;
        this.elements.recordBtn.style.display = 'inline-block';
        this.elements.stopBtn.style.display = 'none';
        this.elements.status.textContent = '';
        this.elements.status.className = 'recording-status';
    }

    async generateSentence() {
        try {
            console.log('Generating sentence for reading assessment...');
            
            const response = await fetch('/api/reading/generate-sentence', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.sentence) {
                this.currentSentence = data.sentence;
                this.displaySentence();
            } else {
                throw new Error('No sentence received from server');
            }
            
        } catch (error) {
            console.error('Error generating sentence:', error);
            this.showError('Failed to generate sentence. Please try refreshing the page.');
        }
    }

    displaySentence() {
        this.elements.loading.style.display = 'none';
        this.elements.sentence.style.display = 'block';
        this.elements.controls.style.display = 'block';
        
        this.elements.sentence.textContent = this.currentSentence;
        
        console.log('Sentence displayed:', this.currentSentence);
    }

    async startRecording() {
        if (this.isRecording || !this.currentSentence || !this.azureConfig) return;

        try {
            console.log('Starting recording with Azure Speech SDK...');
            
            const SpeechSDK = window.SpeechSDK;
            
            // Create speech configuration
            const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
                this.azureConfig.subscriptionKey, 
                this.azureConfig.region
            );
            speechConfig.speechRecognitionLanguage = 'en-US';

            // Create audio configuration
            const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();

            // Create pronunciation assessment configuration
            const pronunciationAssessmentConfig = new SpeechSDK.PronunciationAssessmentConfig(
                this.currentSentence,
                SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
                SpeechSDK.PronunciationAssessmentGranularity.Word,
                true
            );

            // Create speech recognizer
            this.recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
            pronunciationAssessmentConfig.applyTo(this.recognizer);

            this.isRecording = true;
            
            // Update UI
            this.elements.recordBtn.style.display = 'none';
            this.elements.stopBtn.style.display = 'inline-block';
            this.elements.status.textContent = '🎤 Recording... Please read the sentence above';
            this.elements.status.className = 'recording-status recording';
            
            // Start recognition
            this.recognizer.recognizeOnceAsync(result => {
                this.isRecording = false;
                this.elements.recordBtn.style.display = 'inline-block';
                this.elements.stopBtn.style.display = 'none';
                this.elements.status.className = 'recording-status';

                if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                    const paResult = SpeechSDK.PronunciationAssessmentResult.fromResult(result);
                    this.processResults(paResult, result.text);
                } else {
                    this.elements.status.textContent = '❌ No speech detected. Please try again.';
                    console.error('Speech recognition failed:', result);
                }
            });
            
        } catch (error) {
            console.error('Error starting recording:', error);
            this.showError('Could not start recording. Please check your microphone permissions.');
            this.isRecording = false;
            this.elements.recordBtn.style.display = 'inline-block';
            this.elements.stopBtn.style.display = 'none';
        }
    }

    stopRecording() {
        if (this.recognizer && this.isRecording) {
            console.log('Stopping recording...');
            this.recognizer.stopContinuousRecognitionAsync();
            this.isRecording = false;
            this.elements.recordBtn.style.display = 'inline-block';
            this.elements.stopBtn.style.display = 'none';
            this.elements.status.textContent = '';
        }
    }

    async processResults(paResult, recognizedText) {
        console.log('Processing pronunciation results:', paResult);
        
        this.elements.status.textContent = '⏳ Processing results...';
        
        try {
            // Prepare result data
            const resultData = {
                pronunciationScore: paResult.pronunciationScore || 0,
                accuracyScore: paResult.accuracyScore || 0,
                fluencyScore: paResult.fluencyScore || 0,
                completenessScore: paResult.completenessScore || 0,
                recognizedText: recognizedText || '',
                detailResult: paResult.detailResult
            };

            // Store results on server for logging
            await fetch('/api/reading/store-result', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    result: resultData,
                    referenceText: this.currentSentence
                })
            });
            
            this.displayResults(resultData);
            
        } catch (error) {
            console.error('Error processing results:', error);
            this.showError('Failed to process results. Please try again.');
        }
    }

    displayResults(result) {
        // Hide status and show results
        this.elements.status.textContent = '';
        this.elements.results.style.display = 'block';
        
        // Extract pronunciation score
        const pronunciationScore = Math.round(result.pronunciationScore || 0);
        
        // Display score
        this.elements.score.textContent = pronunciationScore;
        
        // Generate feedback
        let feedback = this.generateFeedback(result);
        this.elements.feedback.innerHTML = feedback;
        
        // Color code the score
        this.colorCodeScore(pronunciationScore);
        
        // Notify main controller that assessment is complete
        if (window.assessmentController) {
            window.assessmentController.onAssessmentComplete('reading', result.pronunciationScore);
        }
        
        console.log('Reading assessment completed with score:', result.pronunciationScore);
    }

    generateFeedback(result) {
        const pronunciationScore = result.pronunciationScore || 0;
        const accuracyScore = result.accuracyScore || 0;
        const fluencyScore = result.fluencyScore || 0;
        const completenessScore = result.completenessScore || 0;
        const recognizedText = result.recognizedText || '';
        
        let feedback = '<div class="detailed-feedback">';
        
        // Show what was recognized vs expected
        feedback += '<div class="recognition-comparison">';
        feedback += '<h4>Speech Recognition:</h4>';
        feedback += `<p><strong>Expected:</strong> "${this.currentSentence}"</p>`;
        feedback += `<p><strong>You said:</strong> "${recognizedText}"</p>`;
        feedback += '</div>';
        
        // Overall feedback
        if (pronunciationScore >= 80) {
            feedback += '<p><strong>Excellent pronunciation!</strong> Your speech is clear and accurate.</p>';
        } else if (pronunciationScore >= 60) {
            feedback += '<p><strong>Good pronunciation!</strong> You\'re doing well with some room for improvement.</p>';
        } else if (pronunciationScore >= 40) {
            feedback += '<p><strong>Fair pronunciation.</strong> Keep practicing to improve clarity.</p>';
        } else {
            feedback += '<p><strong>Needs improvement.</strong> Focus on pronunciation practice to enhance clarity.</p>';
        }
        
        // Detailed scores
        if (accuracyScore > 0 || fluencyScore > 0 || completenessScore > 0) {
            feedback += '<div class="score-breakdown">';
            feedback += '<h4>Detailed Breakdown:</h4>';
            feedback += '<ul>';
            if (accuracyScore > 0) feedback += `<li>Accuracy: ${Math.round(accuracyScore)}/100</li>`;
            if (fluencyScore > 0) feedback += `<li>Fluency: ${Math.round(fluencyScore)}/100</li>`;
            if (completenessScore > 0) feedback += `<li>Completeness: ${Math.round(completenessScore)}/100</li>`;
            feedback += '</ul>';
            feedback += '</div>';
        }
        
        // Word-level feedback
        if (result.detailResult && result.detailResult.Words) {
            const words = result.detailResult.Words;
            const problematicWords = words.filter(word => 
                word.PronunciationAssessment && word.PronunciationAssessment.AccuracyScore < 60
            );
            
            if (problematicWords.length > 0) {
                feedback += '<div class="word-feedback">';
                feedback += '<h4>Words to Practice:</h4>';
                feedback += '<div class="word-list">';
                problematicWords.forEach(word => {
                    const score = Math.round(word.PronunciationAssessment.AccuracyScore);
                    const color = score >= 80 ? '#28a745' : score >= 60 ? '#ffc107' : '#dc3545';
                    feedback += `<span class="word-item" style="color: ${color}"><strong>${word.Word}</strong> (${score}%)</span> `;
                });
                feedback += '</div>';
                feedback += '</div>';
            }
        }
        
        feedback += '</div>';
        return feedback;
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
        
        // Show retry option
        if (!this.currentSentence) {
            // If no sentence was generated, try to generate again
            setTimeout(() => {
                this.generateSentence();
            }, 2000);
        }
    }

    // Reset the assessment for retrying
    reset() {
        this.isInitialized = false;
        this.currentSentence = '';
        this.isRecording = false;
        
        if (this.recognizer) {
            try {
                this.recognizer.close();
            } catch (e) {
                console.log('Error closing recognizer:', e);
            }
            this.recognizer = null;
        }
    }
}

// Initialize the reading assessment when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.ReadingAssessment = new ReadingAssessment();
    console.log('Reading Assessment module loaded with Azure Speech SDK');
}); 