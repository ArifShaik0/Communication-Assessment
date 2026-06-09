// Reading Comprehension Assessment Module

class ComprehensionAssessment {
    constructor() {
        this.currentPassage = '';
        this.currentQuestions = [];
        this.userAnswers = [];
        this.currentQuestionIndex = 0;
        this.isInitialized = false;
        this.topic = 'technology';
        this.difficulty = 'intermediate';
        
        this.initializeElements();
        this.initializeEventListeners();
    }

    initializeElements() {
        this.elements = {
            loading: document.getElementById('comprehension-loading'),
            setup: document.getElementById('comprehension-setup'),
            topicSelect: document.getElementById('comprehension-topic'),
            difficultySelect: document.getElementById('comprehension-difficulty'),
            generateBtn: document.getElementById('comprehension-generate-btn'),
            quiz: document.getElementById('comprehension-quiz'),
            passage: document.getElementById('comprehension-passage'),
            topicBadge: document.getElementById('comprehension-topic-badge'),
            difficultyBadge: document.getElementById('comprehension-difficulty-badge'),
            questionsSection: document.getElementById('comprehension-questions-section'),
            questionDisplay: document.getElementById('comprehension-question-display'),
            currentQ: document.getElementById('comprehension-current-q'),
            totalQ: document.getElementById('comprehension-total-q'),
            prevBtn: document.getElementById('comprehension-prev-btn'),
            nextBtn: document.getElementById('comprehension-next-btn'),
            submitBtn: document.getElementById('comprehension-submit-btn'),
            results: document.getElementById('comprehension-results'),
            score: document.getElementById('comprehension-score'),
            feedback: document.getElementById('comprehension-feedback')
        };
    }

    initializeEventListeners() {
        if (this.elements.generateBtn) {
            this.elements.generateBtn.addEventListener('click', () => this.generateContent());
        }

        if (this.elements.prevBtn) {
            this.elements.prevBtn.addEventListener('click', () => this.previousQuestion());
        }
        
        if (this.elements.nextBtn) {
            this.elements.nextBtn.addEventListener('click', () => this.nextQuestion());
        }

        if (this.elements.submitBtn) {
            this.elements.submitBtn.addEventListener('click', () => this.submitQuiz());
        }
    }

    async initialize() {
        if (this.isInitialized) {
            return;
        }

        console.log('Initializing Reading Comprehension Assessment...');
        
        this.resetUI();
        this.showSetup();
        this.isInitialized = true;
    }

    resetUI() {
        // Show loading initially
        this.elements.loading.style.display = 'block';
        this.elements.setup.style.display = 'none';
        this.elements.quiz.style.display = 'none';
        this.elements.results.style.display = 'none';
        
        // Reset state
        this.currentPassage = '';
        this.currentQuestions = [];
        this.userAnswers = [];
        this.currentQuestionIndex = 0;
    }

    showSetup() {
        this.elements.loading.style.display = 'none';
        this.elements.setup.style.display = 'block';
    }

    async generateContent() {
        try {
            this.elements.generateBtn.disabled = true;
            this.elements.generateBtn.textContent = 'Generating...';
            
            this.topic = this.elements.topicSelect.value;
            this.difficulty = this.elements.difficultySelect.value;
            
            console.log('Generating reading comprehension content...', { topic: this.topic, difficulty: this.difficulty });
            
            this.elements.setup.style.display = 'none';
            this.elements.loading.style.display = 'block';

            const response = await fetch('/api/comprehension/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    topic: this.topic,
                    difficulty: this.difficulty
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success && data.passage && data.questions) {
                this.currentPassage = data.passage;
                this.currentQuestions = data.questions;
                this.userAnswers = new Array(data.questions.length).fill(null);
                this.displayContent();
            } else {
                throw new Error('Failed to generate reading comprehension content');
            }
            
        } catch (error) {
            console.error('Error generating reading comprehension content:', error);
            this.showError('Failed to generate reading comprehension content. Please try again.');
        } finally {
            this.elements.generateBtn.disabled = false;
            this.elements.generateBtn.textContent = 'Generate Reading Test';
        }
    }

    displayContent() {
        this.elements.loading.style.display = 'none';
        this.elements.quiz.style.display = 'block';
        
        // Set topic and difficulty badges
        this.elements.topicBadge.textContent = this.topic;
        this.elements.difficultyBadge.textContent = this.difficulty;
        
        // Display passage
        this.elements.passage.textContent = this.currentPassage;
        
        // Setup questions
        this.elements.totalQ.textContent = this.currentQuestions.length;
        this.currentQuestionIndex = 0;
        
        this.displayQuestion();
        
        console.log('Reading comprehension content displayed');
        console.log('Passage length:', this.currentPassage.length, 'words');
        console.log('Number of questions:', this.currentQuestions.length);
    }

    displayQuestion() {
        if (!this.currentQuestions || this.currentQuestions.length === 0) return;

        const question = this.currentQuestions[this.currentQuestionIndex];
        this.elements.currentQ.textContent = this.currentQuestionIndex + 1;
        
        let questionHtml = `
            <div class="question-content">
                <h4>Question ${this.currentQuestionIndex + 1}</h4>
                <p class="question-text">${question.question}</p>
                <div class="options-container">
        `;

        // Display options
        Object.entries(question.options).forEach(([key, value]) => {
            const isSelected = this.userAnswers[this.currentQuestionIndex] === key;
            questionHtml += `
                <label class="option-label ${isSelected ? 'selected' : ''}">
                    <input type="radio" name="comprehension-q${this.currentQuestionIndex}" 
                           value="${key}" ${isSelected ? 'checked' : ''}
                           onchange="window.ComprehensionAssessment.saveAnswer('${key}')">
                    <span class="option-key">${key}.</span>
                    <span class="option-text">${value}</span>
                </label>
            `;
        });

        questionHtml += `
                </div>
            </div>
        `;

        this.elements.questionDisplay.innerHTML = questionHtml;
        this.updateNavigation();
    }

    saveAnswer(answer) {
        this.userAnswers[this.currentQuestionIndex] = answer;
        
        // Update visual selection
        const labels = this.elements.questionDisplay.querySelectorAll('.option-label');
        labels.forEach(label => {
            label.classList.remove('selected');
            const input = label.querySelector('input[type="radio"]');
            if (input.value === answer) {
                label.classList.add('selected');
            }
        });
        
        console.log(`Question ${this.currentQuestionIndex + 1} answered:`, answer);
    }

    updateNavigation() {
        // Update navigation buttons
        this.elements.prevBtn.disabled = this.currentQuestionIndex === 0;
        this.elements.nextBtn.style.display = this.currentQuestionIndex < this.currentQuestions.length - 1 ? 'inline-block' : 'none';
        this.elements.submitBtn.style.display = this.currentQuestionIndex === this.currentQuestions.length - 1 ? 'inline-block' : 'none';
    }

    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayQuestion();
        }
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.currentQuestions.length - 1) {
            this.currentQuestionIndex++;
            this.displayQuestion();
        }
    }

    async submitQuiz() {
        try {
            console.log('Submitting reading comprehension quiz...', this.userAnswers);
            
            // Check if all questions are answered
            const unanswered = this.userAnswers.filter(answer => answer === null).length;
            if (unanswered > 0) {
                const confirm = window.confirm(`You have ${unanswered} unanswered questions. Submit anyway?`);
                if (!confirm) return;
            }

            this.elements.submitBtn.disabled = true;
            this.elements.submitBtn.textContent = 'Evaluating...';

            const response = await fetch('/api/comprehension/evaluate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userAnswers: this.userAnswers
                })
            });

            if (!response.ok) {
                throw new Error(`Evaluation failed: ${response.status}`);
            }

            const result = await response.json();
            console.log('Reading comprehension result:', result);
            
            this.displayResults(result);
            
        } catch (error) {
            console.error('Error submitting quiz:', error);
            this.showError('Failed to evaluate quiz. Please try again.');
        } finally {
            this.elements.submitBtn.disabled = false;
            this.elements.submitBtn.textContent = 'Submit Quiz';
        }
    }

    displayResults(result) {
        // Hide quiz and show results
        this.elements.quiz.style.display = 'none';
        this.elements.results.style.display = 'block';
        
        // Display score
        const score = Math.round(result.score || 0);
        this.elements.score.textContent = score;
        
        // Generate detailed feedback
        let feedbackHtml = '<div class="comprehension-feedback-content">';
        
        // Summary section
        feedbackHtml += '<div class="quiz-summary">';
        feedbackHtml += '<h4>📊 Quiz Summary</h4>';
        feedbackHtml += `<p><strong>Topic:</strong> ${this.topic}</p>`;
        feedbackHtml += `<p><strong>Difficulty:</strong> ${this.difficulty}</p>`;
        feedbackHtml += `<p><strong>Questions Correct:</strong> ${result.correctAnswers} out of ${result.totalQuestions}</p>`;
        feedbackHtml += `<p><strong>Percentage:</strong> ${result.percentage}%</p>`;
        feedbackHtml += '</div>';
        
        // Question by question breakdown
        feedbackHtml += '<div class="question-breakdown">';
        feedbackHtml += '<h4>📝 Question Breakdown</h4>';
        
        result.results.forEach((questionResult, index) => {
            const statusIcon = questionResult.isCorrect ? '✅' : '❌';
            const statusClass = questionResult.isCorrect ? 'correct' : 'incorrect';
            
            feedbackHtml += `<div class="question-result ${statusClass}">`;
            feedbackHtml += `<h5>${statusIcon} Question ${questionResult.questionIndex}</h5>`;
            feedbackHtml += `<p class="question-text">${questionResult.question}</p>`;
            feedbackHtml += `<p><strong>Your Answer:</strong> ${questionResult.userAnswer || 'Not answered'}</p>`;
            
            if (!questionResult.isCorrect) {
                feedbackHtml += `<p><strong>Correct Answer:</strong> ${questionResult.correctAnswer}</p>`;
                if (questionResult.options && questionResult.correctAnswer) {
                    feedbackHtml += `<p><strong>Explanation:</strong> ${questionResult.options[questionResult.correctAnswer]}</p>`;
                }
            }
            
            feedbackHtml += '</div>';
        });
        
        feedbackHtml += '</div>';
        feedbackHtml += '</div>';
        
        this.elements.feedback.innerHTML = feedbackHtml;
        
        // Color code the score
        this.colorCodeScore(score);
        
        // Notify main controller that assessment is complete
        if (window.assessmentController) {
            window.assessmentController.onAssessmentComplete('comprehension', result.score);
        }
        
        console.log('Reading comprehension assessment completed with score:', result.score);
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
        this.elements.setup.style.display = 'block';
        alert(`❌ ${message}`);
    }

    // Reset the assessment for retrying
    reset() {
        this.isInitialized = false;
        this.currentPassage = '';
        this.currentQuestions = [];
        this.userAnswers = [];
        this.currentQuestionIndex = 0;
    }
}

// Initialize the reading comprehension assessment when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.ComprehensionAssessment = new ComprehensionAssessment();
    console.log('Reading Comprehension Assessment module loaded');
}); 