import * as vscode from "vscode";
import * as child_process from "child_process";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
const activeProcesses: Map<string, child_process.ChildProcessWithoutNullStreams> = new Map();
export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand("codeRunner.openPanel", () => {
            const panel = vscode.window.createWebviewPanel(
                "codeRunner",
                "Code Runner",
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                }
            );
            const panelId = `panel-${Date.now()}-${Math.random().toString(36).substring(7)}`;

            const activeEditor = vscode.window.activeTextEditor;
            let initialCode = "";
            let initialLanguage = "cpp";

            if (activeEditor) {
                initialCode = activeEditor.document.getText();
                const fileName = activeEditor.document.fileName;
                if (fileName.endsWith(".cpp") || fileName.endsWith(".c")) {
                    initialLanguage = "cpp";
                } else if (fileName.endsWith(".py")) {
                    initialLanguage = "python";
                } else if (fileName.endsWith(".c")) {
                    initialLanguage = "c";
                }
            }

            panel.webview.html = getWebviewContent(initialCode, initialLanguage);

            panel.webview.onDidReceiveMessage(async (message) => {
                if (message.command === "runCode") {
                    const language = message.language;
                    const fileName = message.fileName;
                    if (activeProcesses.has(panelId)) {
                        activeProcesses.get(panelId)?.kill('SIGKILL'); 
                        activeProcesses.delete(panelId);
                        panel.webview.postMessage({ command: "removeInputPrompt" }); 
                    }

                    if (!fileName) {
                        panel.webview.postMessage({
                            command: "appendOutput",
                            output: "❌ Error: Please enter a file name (e.g., main.cpp).\n",
                        });
                        return;
                    }

                    panel.webview.postMessage({
                        command: "clearOutput", 
                    });
                    panel.webview.postMessage({
                        command: "appendOutput",
                        output: "Running code...\n",
                    });

                    try {
                        const process = await runCodeProcess(language, fileName);
                        activeProcesses.set(panelId, process);

                        process.stdout.on("data", (data) => {
                            const chunk = data.toString();
                            panel.webview.postMessage({ command: "appendOutput", output: chunk });
                            const lowerChunk = chunk.toLowerCase();
                            const requiresInput =
                                lowerChunk.includes("enter") || 
                                lowerChunk.includes("subject") && lowerChunk.includes(":") || 
                                lowerChunk.includes("name:") || 
                                lowerChunk.includes("students:"); 

                            if (requiresInput && process.stdin.writable) {
                                panel.webview.postMessage({ command: "requestInput" });
                            }
                        });

                        process.stderr.on("data", (data) => {
                            const chunk = data.toString();
                            panel.webview.postMessage({ command: "appendOutput", output: `Error: ${chunk}` });
                            if (process.stdin.writable) { 
                                panel.webview.postMessage({ command: "requestInput" });
                            }
                        });
                        process.on("close", (code) => {
                            panel.webview.postMessage({ command: "removeInputPrompt" }); 
                            activeProcesses.delete(panelId);
                            if (code !== 0) {
                                panel.webview.postMessage({
                                    command: "appendOutput",
                                    output: `\nProgram exited with code ${code}.`,
                                });
                            } else {
                                panel.webview.postMessage({
                                    command: "appendOutput",
                                    output: `\nProgram finished.`,
                                });
                            }
                        });
                        process.on("error", (spawnErr) => {
                            panel.webview.postMessage({
                                command: "appendOutput",
                                output: `\n❌ Failed to run program: ${spawnErr.message}`,
                            });
                            panel.webview.postMessage({ command: "removeInputPrompt" });
                            activeProcesses.delete(panelId);
                        });
                    } catch (err: any) {
                        panel.webview.postMessage({
                            command: "appendOutput",
                            output: `\n❌ Error: ${err.message || err.toString()}`,
                        });
                        panel.webview.postMessage({ command: "removeInputPrompt" });
                        activeProcesses.delete(panelId);
                    }
                } else if (message.command === "clearOutput") {
                    panel.webview.postMessage({ command: "clearOutput" });
                    panel.webview.postMessage({ command: "removeInputPrompt" });
                    if (activeProcesses.has(panelId)) {
                        activeProcesses.get(panelId)?.kill('SIGKILL');
                        activeProcesses.delete(panelId);
                    }
                } else if (message.command === "sendInput") {
                    const input = message.input;
                    const process = activeProcesses.get(panelId);
                    if (process && process.stdin && !process.stdin.writableEnded) {
                        panel.webview.postMessage({ command: "appendOutput", output: input + "\n" });
                        process.stdin.write(input + "\n");
                        panel.webview.postMessage({ command: "removeInputPrompt" });
                    } else {
                        panel.webview.postMessage({ command: "appendOutput", output: "\nNo active program to send input to or stdin not writable.\n" });
                        panel.webview.postMessage({ command: "removeInputPrompt" });
                    }
                }
            });
            panel.onDidDispose(() => {
                if (activeProcesses.has(panelId)) {
                    activeProcesses.get(panelId)?.kill('SIGKILL');
                    activeProcesses.delete(panelId);
                }
            });
        })
    );
}

function getWebviewContent(initialCode: string, initialLanguage: string): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Code Runner</title>
        <style>
            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }

            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                background: #0d1117;
                color: #c9d1d9;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                line-height: 1.5;
            }

            .header {
                background: #161b22;
                border-bottom: 1px solid #30363d;
                padding: 20px 32px;
            }

            .header h1 {
                font-size: 20px;
                font-weight: 600;
                color: #c9d1d9;
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .logo {
                width: 24px;
                height: 24px;
                background: #58a6ff;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #0d1117;
                font-size: 12px;
                font-weight: 700;
            }

            .container {
                flex: 1;
                max-width: 800px;
                width: 100%;
                margin: 0 auto;
                padding: 32px;
                display: flex;
                flex-direction: column;
                gap: 24px;
            }

            .controls {
                background: #161b22;
                border: 1px solid #30363d;
                border-radius: 8px;
                padding: 24px;
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            .control-grid {
                display: grid;
                grid-template-columns: 1fr 140px 100px;
                gap: 16px;
                align-items: end;
            }

            .field {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .label {
                font-size: 13px;
                font-weight: 500;
                color: #8b949e;
            }

            .input, .select {
                height: 40px;
                padding: 8px 12px;
                border: 1px solid #30363d;
                border-radius: 6px;
                font-size: 14px;
                background: #0d1117;
                color: #c9d1d9;
                transition: border-color 0.2s ease;
                outline: none;
                font-family: ui-monospace, 'SF Mono', Monaco, 'Cascadia Code', monospace;
            }

            .input:focus, .select:focus {
                border-color: #58a6ff;
                box-shadow: inset 0 0 0 1px #58a6ff;
            }

            .run-button, .clear-button {
                height: 40px;
                color: #ffffff;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: background-color 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                padding: 0 16px;
            }

            .run-button {
                background: #238636;
            }

            .run-button:hover {
                background: #2ea043;
            }

            .run-button:active {
                background: #196c2e;
            }

            .clear-button {
                background: #6a737d;
            }

            .clear-button:hover {
                background: #8b949e;
            }

            .clear-button:active {
                background: #545d68;
            }

            .output-section {
                flex: 1;
                background: #161b22;
                border: 1px solid #30363d;
                border-radius: 8px;
                display: flex;
                flex-direction: column;
                min-height: 400px;
            }

            .output-header {
                padding: 16px 20px;
                border-bottom: 1px solid #30363d;
                background: #21262d;
                border-radius: 8px 8px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .output-title {
                font-size: 14px;
                font-weight: 600;
                color: #c9d1d9;
            }

            .output-content {
                flex: 1;
                padding: 20px;
                font-family: ui-monospace, 'SF Mono', Monaco, 'Cascadia Code', monospace;
                font-size: 13px;
                line-height: 1.6;
                color: #c9d1d9;
                background: #0d1117;
                white-space: pre-wrap; /* Preserve whitespace and newlines */
                word-wrap: break-word;
                overflow-y: auto;
                border-radius: 0 0 8px 8px;
                display: flex;
                flex-direction: column;
            }

            .output-content:empty:not(:has(.input-prompt-line))::before {
                content: 'Run your code to see output here...';
                color: #8b949e;
                font-style: italic;
            }

            .play-icon {
                width: 0;
                height: 0;
                border-left: 6px solid currentColor;
                border-top: 4px solid transparent;
                border-bottom: 4px solid transparent;
                margin-left: 1px;
            }

            .input-prompt-line {
                display: flex;
                align-items: center;
                margin-top: auto; /* Pushes input field to the bottom */
                width: 100%;
                box-sizing: border-box;
            }

            .input-prompt-line input {
                flex-grow: 1;
                padding: 5px 8px;
                border: 1px solid #58a6ff;
                border-radius: 4px;
                background-color: #0d1117;
                color: #ffffff;
                font-family: ui-monospace, 'SF Mono', Monaco, 'Cascadia Code', monospace;
                font-size: 13px;
                outline: none;
                margin-left: 5px;
            }

            .input-prompt-line input:focus {
                box-shadow: 0 0 0 1px #58a6ff;
            }

            .input-prompt-prefix {
                color: #58a6ff;
                font-weight: bold;
            }

            @media (max-width: 640px) {
                .container {
                    padding: 20px 16px;
                }

                .control-grid {
                    grid-template-columns: 1fr;
                    gap: 16px;
                }

                .controls {
                    padding: 20px;
                }

                .header {
                    padding: 16px 20px;
                }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>
                <div class="logo">CR</div>
                Code Runner
            </h1>
        </div>

        <div class="container">
            <div class="controls">
                <div class="control-grid">
                    <div class="field">
                        <label class="label">File Name</label>
                        <input type="text" class="input" id="fileName" placeholder="main.cpp" value="${initialLanguage === 'cpp' ? 'main.cpp' : initialLanguage === 'c' ? 'main.c' : 'main.py'}" />
                    </div>
                    <div class="field">
                        <label class="label">Language</label>
                        <select class="select" id="language">
                            <option value="cpp" ${initialLanguage === 'cpp' ? 'selected' : ''}>C++</option>
                            <option value="c" ${initialLanguage === 'c' ? 'selected' : ''}>C</option>
                            <option value="python" ${initialLanguage === 'python' ? 'selected' : ''}>Python</option>
                        </select>
                    </div>
                    <button class="run-button" onclick="runCode()">
                        <div class="play-icon"></div>
                        Run
                    </button>
                </div>
            </div>

            <div class="output-section">
                <div class="output-header">
                    <div class="output-title">Output</div>
                    <button class="clear-button" onclick="clearOutput()">Clear</button>
                </div>
                <div class="output-content" id="output">
                    </div>
            </div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            const outputElement = document.getElementById("output");

            document.getElementById('language').addEventListener('change', (event) => {
                const language = event.target.value;
                const fileNameInput = document.getElementById('fileName');
                if (language === 'cpp') {
                    fileNameInput.value = 'main.cpp';
                } else if (language === 'c') {
                    fileNameInput.value = 'main.c';
                } else if (language === 'python') {
                    fileNameInput.value = 'main.py';
                }
            });

            function runCode() {
                const fileName = document.getElementById("fileName").value;
                const language = document.getElementById("language").value;

                if (!fileName.trim()) {
                    outputElement.innerHTML = "❌ Please enter a file name.";
                    return;
                }

                outputElement.innerHTML = ""; // Clear existing output and input prompt
                vscode.postMessage({ command: "runCode", code: "", language, fileName });
            }

            function clearOutput() {
                outputElement.innerHTML = ""; // Clear HTML content
                vscode.postMessage({ command: "clearOutput" });
            }

            function createInputPrompt() {
                let inputPromptLine = outputElement.querySelector('.input-prompt-line');
                if (!inputPromptLine) { // Only create if it doesn't exist
                    inputPromptLine = document.createElement('div');
                    inputPromptLine.className = 'input-prompt-line';
                    inputPromptLine.innerHTML = \`
                        <span class="input-prompt-prefix">&gt;</span>
                        <input type="text" class="program-input-field" placeholder="">
                    \`;
                    outputElement.appendChild(inputPromptLine);
                }

                const inputField = inputPromptLine.querySelector('.program-input-field');
                if (inputField) {
                    inputField.value = ''; // Clear previous input
                    inputField.disabled = false; // Enable if it was disabled
                    inputField.focus(); // Focus the input field immediately

                    // Ensure listener is only added once
                    if (!inputField.dataset.listenerAdded) {
                        inputField.dataset.listenerAdded = 'true'; // Mark as added
                        inputField.addEventListener('keydown', function(event) {
                            if (event.key === 'Enter') {
                                const inputValue = inputField.value;
                                inputField.disabled = true; // Disable input after sending
                                vscode.postMessage({ command: 'sendInput', input: inputValue });
                                // The input will be echoed by the extension's appendOutput, so no need to update DOM here directly
                            }
                        });
                    }
                }
                // Scroll to bottom to show input field
                outputElement.scrollTop = outputElement.scrollHeight;
            }

            function removeInputPrompt() {
                const inputPromptLine = outputElement.querySelector('.input-prompt-line');
                if (inputPromptLine) {
                    inputPromptLine.remove();
                }
            }

            window.addEventListener("message", (event) => {
                const message = event.data;
                switch (message.command) {
                    case "appendOutput":
                        // Create a span or div for each output chunk to maintain structure
                        const outputSpan = document.createElement('span');
                        outputSpan.textContent = message.output;
                        // Before appending, remove the input prompt if it exists, then re-add if needed
                        const existingInputPrompt = outputElement.querySelector('.input-prompt-line');
                        if (existingInputPrompt) {
                            outputElement.insertBefore(outputSpan, existingInputPrompt);
                        } else {
                            outputElement.appendChild(outputSpan);
                        }
                        // Explicitly add a newline after the prompt when input is requested
                        // This fixes the cramped output like "Roll Number:Nishant"
                        if (message.output.includes("Enter Roll Number:") || 
                            message.output.includes("Enter Name:") ||
                            message.output.includes("Subject ") && message.output.includes(": ") ||
                            message.output.includes("Enter number of students:")) {
                                outputElement.appendChild(document.createElement('br')); // Add a line break for visual separation
                        }
                        outputElement.scrollTop = outputElement.scrollHeight; // Scroll to bottom
                        break;
                    case "clearOutput":
                        outputElement.innerHTML = "";
                        break;
                    case "requestInput":
                        createInputPrompt();
                        break;
                    case "removeInputPrompt":
                        removeInputPrompt();
                        break;
                }
            });
        </script>
    </body>
    </html>
  `;
}
async function runCodeProcess(
    language: string,
    fileName: string
): Promise<child_process.ChildProcessWithoutNullStreams> { 
    const tempDir = path.join(os.tmpdir(), "vscode-code-runner-temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const filePath = path.join(tempDir, fileName);
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        throw new Error("No workspace folder is open. Please open a folder containing your code files.");
    }
    const workspaceFilePath = path.join(workspaceFolders[0].uri.fsPath, fileName);

    if (!fs.existsSync(workspaceFilePath)) {
        throw new Error(`File "${fileName}" not found in workspace. Please ensure the file exists in your workspace folder.`);
    }
    const fileContent = fs.readFileSync(workspaceFilePath, 'utf8');
    fs.writeFileSync(filePath, fileContent);

    return new Promise((resolve, reject) => {
        let command: string;
        let childProcess: child_process.ChildProcessWithoutNullStreams;

        if (language === "cpp" || language === "c") {
            const exePath = path.join(tempDir, path.parse(fileName).name + (os.platform() === "win32" ? ".exe" : ""));
            command = language === "cpp" ? "g++" : "gcc";
            const fullCommand = `${command} "${filePath}" -o "${exePath}"`;

            child_process.exec(
                fullCommand,
                { cwd: tempDir },
                (err: child_process.ExecException | null, stdout: string, stderr: string) => {
                    if (err) {
                        try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
                        return reject(new Error(`Compilation failed:\n${stderr || stdout || err.message}`));
                    }

                    const runCmd = os.platform() === "win32" ? `"${exePath}"` : exePath;
                    childProcess = child_process.spawn(runCmd, [], {
                        cwd: tempDir,
                        shell: true,
                    });
                    childProcess.on('exit', () => {
                        try {
                            fs.unlinkSync(filePath);
                            if (fs.existsSync(exePath)) fs.unlinkSync(exePath);
                        } catch (cleanupErr) {
                            console.error("Cleanup error:", cleanupErr);
                        }
                    });

                    resolve(childProcess); 
                }
            );
        } else if (language === "python") {
            command = "python";
            childProcess = child_process.spawn(command, [filePath], {
                cwd: tempDir,
                shell: true,
            });
            childProcess.on('exit', () => {
                try {
                    fs.unlinkSync(filePath);
                } catch (cleanupErr) {
                    console.error("Cleanup error:", cleanupErr);
                }
            });

            resolve(childProcess); 
        } else {
            reject("Language not supported.");
        }
    });
}
export function deactivate() {
    activeProcesses.forEach(proc => {
        try {
            proc.kill('SIGKILL'); 
        } catch (e) {
            console.error("Failed to kill process during deactivate:", e);
        }
    });
    activeProcesses.clear();

    const tempDir = path.join(os.tmpdir(), "vscode-code-runner-temp");
    if (fs.existsSync(tempDir)) {
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) {
            console.error("Failed to clean up temporary directory:", e);
        }
    }
}