
        const problemInput = document.getElementById('problemInput');
        const equationDisplay = document.getElementById('equation-display');
        const solutionDisplay = document.getElementById('solution-display');
        const buttons = document.querySelectorAll('.btn, .special-btn');
        const imageUpload = document.getElementById('imageUpload');
        const solveButton = document.getElementById('solveButton');
        const loadingSpinner = document.getElementById('loadingSpinner');
        const buttonText = document.getElementById('buttonText');
        
        let currentEquation = '';
        let solving = false;
        
        // frontend now calls your Netlify function
const response = await fetch("/.netlify/functions/proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload) // same payload you already build
});
        // Live input debounce
        let debounceTimeout;
        const debounceSolve = () => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(solveProblem, 1000); // 1-second delay for API call
        };

        problemInput.addEventListener('input', debounceSolve);
        solveButton.addEventListener('click', solveProblem);

        buttons.forEach(button => {
            button.addEventListener('click', (event) => {
                const value = button.dataset.value;
                if (value === 'AC') {
                    currentEquation = '';
                    problemInput.value = '';
                } else if (value === 'DEL') {
                    if (currentEquation.endsWith('}')) {
                        let braceCount = 1;
                        let i = currentEquation.length - 2;
                        while(i >= 0 && braceCount > 0) {
                            if (currentEquation[i] === '}') braceCount++;
                            else if (currentEquation[i] === '{') braceCount--;
                            i--;
                        }
                        currentEquation = currentEquation.slice(0, i + 1);
                    } else if (currentEquation.endsWith('{xx}') || currentEquation.endsWith('{yy}') || currentEquation.endsWith('{tt}') || currentEquation.endsWith('{xy}')) {
                         currentEquation = currentEquation.slice(0, -6);
                    } else if (currentEquation.endsWith('{x}') || currentEquation.endsWith('{y}') || currentEquation.endsWith('_{t}')) {
                        currentEquation = currentEquation.slice(0, -4);
                    } else if (currentEquation.endsWith('\\frac{\\partial^4}{\\partial x^4}')) {
                         currentEquation = currentEquation.slice(0, -30);
                    } else if (currentEquation.endsWith('\\frac{\\partial^3}{\\partial x^3}')) {
                         currentEquation = currentEquation.slice(0, -29);
                    } else if (currentEquation.endsWith('\\frac{\\partial^2}{\\partial x^2}')) {
                         currentEquation = currentEquation.slice(0, -29);
                    } else if (currentEquation.endsWith('\\frac{\\partial}{\\partial x}')) {
                         currentEquation = currentEquation.slice(0, -27);
                    } else if (currentEquation.endsWith('\\frac{d^4}{dx^4}')) {
                         currentEquation = currentEquation.slice(0, -17);
                    } else if (currentEquation.endsWith('\\frac{d^3}{dx^3}')) {
                         currentEquation = currentEquation.slice(0, -16);
                    } else if (currentEquation.endsWith('\\frac{d^2}{dx^2}')) {
                         currentEquation = currentEquation.slice(0, -16);
                    } else if (currentEquation.endsWith('\\frac{d}{dx}')) {
                         currentEquation = currentEquation.slice(0, -12);
                    } else if (currentEquation.endsWith('\\int')) {
                        currentEquation = currentEquation.slice(0, -5);
                    } else if (currentEquation.length > 0) {
                        currentEquation = currentEquation.slice(0, -1);
                    }
                } else {
                    currentEquation += value;
                }
                updateEquationDisplay();
                debounceSolve();
            });
        });

        imageUpload.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64Data = reader.result.split(',')[1];
                    solveProblem(null, base64Data);
                };
                reader.readAsDataURL(file);
            }
        });

        function updateEquationDisplay() {
            equationDisplay.innerHTML = `$${currentEquation.trim() || ''}\\,$`;
            MathJax.typesetPromise([equationDisplay]).catch((err) => {
                console.error('MathJax rendering failed:', err);
                equationDisplay.innerHTML = `<p class="text-red-400">Error: Cannot render. Raw text: ${currentEquation}</p>`;
            });
        }

        async function solveProblem(event, imageData = null) {
            if (solving) return;
            
            const textInput = problemInput.value.trim();
            const equationInput = currentEquation.trim();
            const combinedInput = textInput + ' ' + equationInput;
            
            if (!combinedInput && !imageData) {
                solutionDisplay.innerHTML = '<p class="text-center text-gray-400">Please enter a problem or upload an image.</p>';
                return;
            }

            if (!apiKey) {
                solutionDisplay.innerHTML = '<p class="text-red-400 text-center">API Key is missing. Please edit the code to add your key.</p>';
                return;
            }
            
            solving = true;
            buttonText.textContent = "";
            loadingSpinner.classList.remove('hidden');
            solveButton.disabled = true;
            solutionDisplay.innerHTML = '<div class="flex justify-center items-center h-full"><div class="spinner"></div></div>';
            
            const systemPrompt = "You are a world-class mathematical solver, specializing in Ordinary Differential Equations (ODEs), Partial Differential Equations (PDEs), and integrals. When a user provides a problem, you will:\n\n1. Identify the type of problem (ODE, PDE, or Integral) and its order (up to 4th order, if applicable).\n2. Provide a clear, step-by-step solution, explaining each stage of the process.\n3. Format all mathematical equations using LaTeX. Use '$' for inline math and '$$' for display-style equations. All math MUST be in LaTeX.\n4. Explain any underlying concepts relevant to the solution method.\n5. Provide the final, clear answer at the end.\n6. For word problems, clearly state the mathematical equation you derived from the text before solving it.\n7. Do not include any introductory or concluding conversational text outside of the solution itself.";

            let parts = [{ text: `Solve the following mathematical problem: ${combinedInput}` }];
            if (imageData) {
                parts = [{
                    text: "Solve the mathematical problem in this image. Please describe the problem first, then provide a step-by-step solution."
                },
                {
                    inlineData: {
                        mimeType: "image/png",
                        data: imageData
                    }
                }];
            }
            
            const payload = {
                contents: [{ parts: parts }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
            };

            try {
                const response = await fetch(API_URL + apiKey, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error.message || 'Failed to get a response from the API.');
                }

                const result = await response.json();
                const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

                if (text) {
                    solutionDisplay.innerHTML = text;
                    MathJax.typesetPromise([solutionDisplay]).catch((err) => {
                        console.error('MathJax rendering failed:', err);
                        solutionDisplay.innerHTML = `<p class="text-red-400">An error occurred while rendering the math. Here is the raw text:</p><pre>${text}</pre>`;
                    });
                } else {
                    solutionDisplay.innerHTML = 'No solution found. Please try rephrasing the problem.';
                }
            } catch (error) {
                console.error('Error:', error);
                solutionDisplay.innerHTML = `<p class="text-red-400">An error occurred: ${error.message}</p>`;
            } finally {
                solving = false;
                buttonText.textContent = "Solve";
                loadingSpinner.classList.add('hidden');
                solveButton.disabled = false;
            }
        }
        // Initialize display
        updateEquationDisplay();