import * as vscode from "vscode";
import * as child_process from "child_process";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("codeRunner.openPanel", () => {
      const panel = vscode.window.createWebviewPanel(
        "codeRunner",
        "Code Runner", // Title of the panel
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true, // Keep the state even when hidden
        }
      );

      // Get the currently active editor's content and language
      const activeEditor = vscode.window.activeTextEditor;
      let initialCode = "";
      let initialLanguage = "cpp"; // Default to C++

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
          const code = message.code;
          const language = message.language;
          const fileName = message.fileName; // Get filename from webview

          if (!fileName) {
            panel.webview.postMessage({
              command: "showOutput",
              output: "❌ Error: Please enter a file name (e.g., main.cpp).",
            });
            return;
          }

          panel.webview.postMessage({
            command: "showOutput",
            output: "Running code...", // Show a running indicator
          });

          try {
            const output = await runCodeWithInput(language, code, fileName);
            panel.webview.postMessage({ command: "showOutput", output });
          } catch (err: any) { // Keep any here for broader error catching from child_process
            panel.webview.postMessage({
              command: "showOutput",
              output: "❌ Error: " + (err.message || err.toString()),
            });
          }
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
                background: #fafbfc;
                color: #24292f;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                line-height: 1.5;
            }
            
            .header {
                background: #ffffff;
                border-bottom: 1px solid #d0d7de;
                padding: 20px 32px;
            }
            
            .header h1 {
                font-size: 20px;
                font-weight: 600;
                color: #24292f;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .logo {
                width: 24px;
                height: 24px;
                background: #24292f;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
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
                background: #ffffff;
                border: 1px solid #d0d7de;
                border-radius: 8px;
                padding: 24px;
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
                color: #656d76;
            }
            
            .input, .select {
                height: 40px;
                padding: 8px 12px;
                border: 1px solid #d0d7de;
                border-radius: 6px;
                font-size: 14px;
                background: #ffffff;
                color: #24292f;
                transition: border-color 0.2s ease;
                outline: none;
                font-family: ui-monospace, 'SF Mono', Monaco, 'Cascadia Code', monospace;
            }
            
            .input:focus, .select:focus {
                border-color: #0969da;
                box-shadow: inset 0 0 0 1px #0969da;
            }
            
            .run-button {
                height: 40px;
                background: #1f883d;
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
            
            .run-button:hover {
                background: #1a7f37;
            }
            
            .run-button:active {
                background: #166f2c;
            }
            
            .output-section {
                flex: 1;
                background: #ffffff;
                border: 1px solid #d0d7de;
                border-radius: 8px;
                display: flex;
                flex-direction: column;
                min-height: 400px;
            }
            
            .output-header {
                padding: 16px 20px;
                border-bottom: 1px solid #d0d7de;
                background: #f6f8fa;
                border-radius: 8px 8px 0 0;
            }
            
            .output-title {
                font-size: 14px;
                font-weight: 600;
                color: #24292f;
            }
            
            .output-content {
                flex: 1;
                padding: 20px;
                font-family: ui-monospace, 'SF Mono', Monaco, 'Cascadia Code', monospace;
                font-size: 13px;
                line-height: 1.6;
                color: #24292f;
                background: #ffffff;
                white-space: pre-wrap;
                word-wrap: break-word;
                overflow-y: auto;
                border-radius: 0 0 8px 8px;
            }
            
            .output-content:empty::before {
                content: 'Run your code to see output here...';
                color: #8c959f;
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
                </div>
                <div class="output-content" id="output"></div>
            </div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();

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
                    document.getElementById("output").textContent = "❌ Please enter a file name.";
                    return;
                }
                
                document.getElementById("output").textContent = "⏳ Running code...";
                vscode.postMessage({ command: "runCode", code: "", language, fileName });
            }

            window.addEventListener("message", (event) => {
                const message = event.data;
                if (message.command === "showOutput") {
                    document.getElementById("output").textContent = message.output;
                }
            });
        </script>
    </body>
    </html>
  `;
}

async function runCodeWithInput(
  language: string,
  code: string,
  fileName: string
): Promise<string> {
  // Since we're not getting code from the webview anymore, we need to read it from the file
  const tempDir = path.join(os.tmpdir(), "vscode-code-runner-temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const filePath = path.join(tempDir, fileName);
  
  // Check if the file exists in the workspace
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    throw new Error("No workspace folder is open. Please open a folder containing your code files.");
  }

  const workspaceFilePath = path.join(workspaceFolders[0].uri.fsPath, fileName);
  
  if (!fs.existsSync(workspaceFilePath)) {
    throw new Error(`File "${fileName}" not found in workspace. Please ensure the file exists in your workspace folder.`);
  }

  // Read the code from the workspace file
  const fileCode = fs.readFileSync(workspaceFilePath, 'utf8');
  fs.writeFileSync(filePath, fileCode);

  return new Promise((resolve, reject) => {
    let command: string;

    if (language === "cpp" || language === "c") {
      const exePath = path.join(tempDir, path.parse(fileName).name + (os.platform() === "win32" ? ".exe" : ""));
      command = language === "cpp" ? "g++" : "gcc";
      const fullCommand = `${command} "${filePath}" -o "${exePath}"`;

      child_process.exec(
        fullCommand,
        { cwd: tempDir },
        (err: child_process.ExecException | null, stdout: string, stderr: string) => {
          if (err) {
            fs.unlinkSync(filePath);
            return reject(new Error(`Compilation failed:\n${stderr || stdout || err.message}`));
          }

          const runCmd = os.platform() === "win32" ? `"${exePath}"` : exePath;
          const child = child_process.spawn(runCmd, [], {
            cwd: tempDir,
            shell: true,
          });

          let output = "";
          child.stdout.on("data", async (data) => {
            output += data.toString();
            if (output.toLowerCase().includes("enter") || output.includes("?")) {
              const userInput = await vscode.window.showInputBox({
                prompt: "Program needs input:",
                placeHolder: "Type your input here...",
              });
              if (userInput !== undefined) {
                child.stdin.write(userInput + "\n");
              } else {
                child.kill();
              }
            }
          });

          child.stderr.on("data", (data) => {
            output += data.toString();
          });

          child.on("close", (code) => {
            try {
              fs.unlinkSync(filePath);
              if (fs.existsSync(exePath)) fs.unlinkSync(exePath);
            } catch (cleanupErr) {
              console.error("Cleanup error:", cleanupErr);
            }
            if (code !== 0) {
              return reject(new Error(`Program exited with code ${code}:\n${output}`));
            }
            resolve(output);
          });

          child.on("error", (spawnErr) => {
            reject(new Error(`Failed to run program: ${spawnErr.message}`));
          });
        }
      );
    } else if (language === "python") {
      command = "python";
      const child = child_process.spawn(command, [filePath], {
        cwd: tempDir,
        shell: true,
      });

      let output = "";
      child.stdout.on("data", async (data) => {
        output += data.toString();
        if (output.toLowerCase().includes("enter") || output.includes("?")) {
          const userInput = await vscode.window.showInputBox({
            prompt: "Program needs input:",
            placeHolder: "Type your input here...",
          });
          if (userInput !== undefined) {
            child.stdin.write(userInput + "\n");
          } else {
            child.kill();
          }
        }
      });

      child.stderr.on("data", (data) => {
        output += data.toString();
      });

      child.on("close", (code) => {
        try {
          fs.unlinkSync(filePath);
        } catch (cleanupErr) {
          console.error("Cleanup error:", cleanupErr);
        }
        if (code !== 0) {
          return reject(new Error(`Program exited with code ${code}:\n${output}`));
        }
        resolve(output);
      });

      child.on("error", (spawnErr) => {
        reject(new Error(`Failed to run program: ${spawnErr.message}`));
      });
    } else {
      resolve("Language not supported.");
    }
  });
}

export function deactivate() {
  // Clean up the temporary directory on deactivate if necessary
  const tempDir = path.join(os.tmpdir(), "vscode-code-runner-temp");
  if (fs.existsSync(tempDir)) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.error("Failed to clean up temporary directory:", e);
    }
  }
}