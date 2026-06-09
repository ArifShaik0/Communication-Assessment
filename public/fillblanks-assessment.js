// Fill in the Blanks Assessment Module

class FillBlanksAssessment {
    constructor() {
        this.questions = [];
        this.userAnswers = [];
        this.currentQuestionIndex = 0;
        this.isInitialized = false;
        
        this.initializeElements();
        this.initializeEventListeners();
    }

    initializeElements() {
        this.elements = {
            loading: document.getElementById('fillblanks-loading'),
            instructions: document.getElementById('fillblanks-instructions'),
            startBtn: document.getElementById('fillblanks-start-btn'),
            quiz: document.getElementById('fillblanks-quiz'),
            questionContainer: document.getElementById('fillblanks-question-container'),
            current: document.getElementById('fillblanks-current'),
            total: document.getElementById('fillblanks-total'),
            totalQuestions: document.getElementById('fillblanks-total-questions'),
            prevBtn: document.getElementById('fillblanks-prev-btn'),
            nextBtn: document.getElementById('fillblanks-next-btn'),
            submitBtn: document.getElementById('fillblanks-submit-btn'),
            progress: document.getElementById('fillblanks-progress'),
            answered: document.getElementById('fillblanks-answered'),
            results: document.getElementById('fillblanks-results'),
            score: document.getElementById('fillblanks-score'),
            feedback: document.getElementById('fillblanks-feedback')
        };
    }

    initializeEventListeners() {
        if (this.elements.startBtn) {
            this.elements.startBtn.addEventListener('click', () => this.startAssessment());
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

        console.log('Initializing Fill in the Blanks Assessment...');
        
        this.resetUI();
        this.showInstructions();
        this.isInitialized = true;
    }

    resetUI() {
        // Show loading initially
        this.elements.loading.style.display = 'block';
        this.elements.instructions.style.display = 'none';
        this.elements.quiz.style.display = 'none';
        this.elements.results.style.display = 'none';
        
        // Reset state
        this.questions = [];
        this.userAnswers = [];
        this.currentQuestionIndex = 0;
    }

    showInstructions() {
        this.elements.loading.style.display = 'none';
        this.elements.instructions.style.display = 'block';
    }

    async startAssessment() {
        try {
            this.elements.startBtn.disabled = true;
            this.elements.startBtn.textContent = 'Generating Questions...';
            
            console.log('Starting fill-in-the-blanks assessment...');
            
            this.elements.instructions.style.display = 'none';
            this.elements.loading.style.display = 'block';

            const response = await fetch('/api/fillblanks/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success && data.questions) {
                this.questions = data.questions;
                this.userAnswers = new Array(data.questions.length).fill(null);
                this.displayQuiz();
            } else {
                throw new Error('Failed to generate fill-in-the-blanks questions');
            }
            
        } catch (error) {
            console.error('Error generating fill-in-the-blanks questions:', error);
            this.showError('Failed to generate questions. Please try again.');
        } finally {
            this.elements.startBtn.disabled = false;
            this.elements.startBtn.textContent = 'Start Assessment';
        }
    }

    displayQuiz() {
        this.elements.loading.style.display = 'none';
        this.elements.quiz.style.display = 'block';
        
        // Setup totals
        this.elements.total.textContent = this.questions.length;
        this.elements.totalQuestions.textContent = this.questions.length;
        this.currentQuestionIndex = 0;
        
        this.displayQuestion();
        this.updateProgress();
        
        console.log('Fill-in-the-blanks quiz displayed');
        console.log('Number of questions:', this.questions.length);
    }

    displayQuestion() {
        if (!this.questions || this.questions.length === 0) return;

        const question = this.questions[this.currentQuestionIndex];
        this.elements.current.textContent = this.currentQuestionIndex + 1;
        
        let questionHtml = `
            <div class="fillblanks-question-content">
                <h4>Question ${this.currentQuestionIndex + 1} of ${this.questions.length}</h4>
                <div class="question-sentence">
                    <p>${question.question}</p>
                </div>
                <div class="options-container">
                    <h5>Choose the best option:</h5>
        `;

        // Display options as radio buttons
        question.options.forEach((option, index) => {
            const isSelected = this.userAnswers[this.currentQuestionIndex] === option;
            questionHtml += `
                <label class="option-label ${isSelected ? 'selected' : ''}">
                    <input type="radio" name="fillblanks-q${this.currentQuestionIndex}" 
                           value="${option}" ${isSelected ? 'checked' : ''}
                           onchange="window.FillBlanksAssessment.saveAnswer('${option.replace(/'/g, "\\'")}')">
                    <span class="option-text">${option}</span>
                </label>
            `;
        });

        questionHtml += `
                </div>
            </div>
        `;

        this.elements.questionContainer.innerHTML = questionHtml;
        this.updateNavigation();
    }

    saveAnswer(answer) {
        this.userAnswers[this.currentQuestionIndex] = answer;
        
        // Update visual selection
        const labels = this.elements.questionContainer.querySelectorAll('.option-label');
        labels.forEach(label => {
            label.classList.remove('selected');
            const input = label.querySelector('input[type="radio"]');
            if (input.value === answer) {
                label.classList.add('selected');
            }
        });
        
        this.updateProgress();
        
        console.log(`Question ${this.currentQuestionIndex + 1} answered:`, answer);
    }

    updateNavigation() {
        // Update navigation buttons
        this.elements.prevBtn.disabled = this.currentQuestionIndex === 0;
        this.elements.nextBtn.style.display = this.currentQuestionIndex < this.questions.length - 1 ? 'inline-block' : 'none';
        this.elements.submitBtn.style.display = this.currentQuestionIndex === this.questions.length - 1 ? 'inline-block' : 'none';
    }

    updateProgress() {
        // Update answered count and progress bar
        const answeredCount = this.userAnswers.filter(answer => answer !== null).length;
        this.elements.answered.textContent = answeredCount;
        
        const progressPercent = (answeredCount / this.questions.length) * 100;
        this.elements.progress.style.width = `${progressPercent}%`;
    }

    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayQuestion();
        }
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            this.displayQuestion();
        }
    }

    async submitQuiz() {
        try {
            console.log('Submitting fill-in-the-blanks quiz...', this.userAnswers);
            
            // Check if all questions are answered
            const unanswered = this.userAnswers.filter(answer => answer === null).length;
            if (unanswered > 0) {
                const confirm = window.confirm(`You have ${unanswered} unanswered questions. Submit anyway?`);
                if (!confirm) return;
            }

            this.elements.submitBtn.disabled = true;
            this.elements.submitBtn.textContent = 'Evaluating...';

            const response = await fetch('/api/fillblanks/evaluate', {
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
            console.log('Fill-in-the-blanks result:', result);
            
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
        let feedbackHtml = '<div class="fillblanks-feedback-content">';
        
        // Summary section
        feedbackHtml += '<div class="quiz-summary">';
        feedbackHtml += '<h4>📊 Grammar Assessment Summary</h4>';
        feedbackHtml += `<p><strong>Questions Correct:</strong> ${result.correctAnswers} out of ${result.totalQuestions}</p>`;
        feedbackHtml += `<p><strong>Percentage:</strong> ${result.percentage}%</p>`;
        
        // Performance level
        let performanceLevel = '';
        let performanceIcon = '';
        if (score >= 90) {
            performanceLevel = 'Excellent';
            performanceIcon = '🌟';
        } else if (score >= 70) {
            performanceLevel = 'Good';
            performanceIcon = '👍';
        } else if (score >= 50) {
            performanceLevel = 'Fair';
            performanceIcon = '⚡';
        } else {
            performanceLevel = 'Needs Improvement';
            performanceIcon = '📚';
        }
        
        feedbackHtml += `<p><strong>Performance Level:</strong> ${performanceIcon} ${performanceLevel}</p>`;
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
            }
            
            feedbackHtml += `<div class="available-options">`;
            feedbackHtml += `<strong>Available Options:</strong> ${questionResult.options.join(', ')}`;
            feedbackHtml += `</div>`;
            
            feedbackHtml += '</div>';
        });
        
        feedbackHtml += '</div>';
        
        // Grammar tips based on performance
        feedbackHtml += '<div class="grammar-tips">';
        feedbackHtml += '<h4>💡 Grammar Tips</h4>';
        if (score >= 80) {
            feedbackHtml += '<p>Excellent grammar skills! Keep practicing to maintain your proficiency.</p>';
        } else if (score >= 60) {
            feedbackHtml += '<p>Good grammar foundation. Focus on the areas you missed to improve further.</p>';
        } else {
            feedbackHtml += '<p>Consider reviewing basic grammar rules. Practice with verb tenses, articles, and prepositions.</p>';
        }
        feedbackHtml += '</div>';
        
        feedbackHtml += '</div>';
        
        this.elements.feedback.innerHTML = feedbackHtml;
        
        // Color code the score
        this.colorCodeScore(score);
        
        // Notify main controller that assessment is complete
        if (window.assessmentController) {
            window.assessmentController.onAssessmentComplete('fillblanks', result.score);
        }
        
        console.log('Fill-in-the-blanks assessment completed with score:', result.score);
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
        this.elements.instructions.style.display = 'block';
        alert(`❌ ${message}`);
    }

    // Reset the assessment for retrying
    reset() {
        this.isInitialized = false;
        this.questions = [];
        this.userAnswers = [];
        this.currentQuestionIndex = 0;
    }
}

// Initialize the fill-in-the-blanks assessment when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.FillBlanksAssessment = new FillBlanksAssessment();
    console.log('Fill in the Blanks Assessment module loaded');
}); 