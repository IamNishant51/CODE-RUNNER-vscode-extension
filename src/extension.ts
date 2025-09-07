import * as vscode from "vscode";
import * as child_process from "child_process";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

interface LanguageConfig {
    name: string;
    extensions: string[];
    defaultFileName: string;
    compileCommand?: string;
    runCommand: string;
    hasCompileStep: boolean;
    supportsInput: boolean;
    template: string;
}

const SUPPORTED_LANGUAGES: { [key: string]: LanguageConfig } = {
    cpp: {
        name: "C++",
        extensions: [".cpp", ".cxx", ".cc"],
        defaultFileName: "main.cpp",
        compileCommand: "g++ -std=c++17 -O2 -Wall",
        runCommand: "{executable}",
        hasCompileStep: true,
        supportsInput: true,
        template: `#include <iostream>
#include <vector>
#include <string>
using namespace std;

int main() {
    cout << "Hello, C++!" << endl;
    return 0;
}`
    },
    c: {
        name: "C",
        extensions: [".c"],
        defaultFileName: "main.c",
        compileCommand: "gcc -std=c11 -O2 -Wall",
        runCommand: "{executable}",
        hasCompileStep: true,
        supportsInput: true,
        template: `#include <stdio.h>
#include <stdlib.h>

int main() {
    printf("Hello, C!\\n");
    return 0;
}`
    },
    python: {
        name: "Python",
        extensions: [".py"],
        defaultFileName: "main.py",
        runCommand: "python {file}",
        hasCompileStep: false,
        supportsInput: true,
        template: `#!/usr/bin/env python3
"""
Python Code Runner Template
"""

def main():
    print("Hello, Python!")

if __name__ == "__main__":
    main()`
    },
    java: {
        name: "Java",
        extensions: [".java"],
        defaultFileName: "Main.java",
        compileCommand: "javac",
        runCommand: "java {className}",
        hasCompileStep: true,
        supportsInput: true,
        template: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
    }
}`
    },
    javascript: {
        name: "JavaScript",
        extensions: [".js"],
        defaultFileName: "main.js",
        runCommand: "node {file}",
        hasCompileStep: false,
        supportsInput: true,
        template: `// JavaScript Code Runner Template
console.log("Hello, JavaScript!");

// Example with user input (uncomment to use)
// const readline = require('readline');
// const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout
// });
// rl.question('Enter your name: ', (name) => {
//     console.log(\`Hello, \${name}!\`);
//     rl.close();
// });`
    },
    typescript: {
        name: "TypeScript",
        extensions: [".ts"],
        defaultFileName: "main.ts",
        compileCommand: "tsc --target es2020 --module commonjs",
        runCommand: "node {jsFile}",
        hasCompileStep: true,
        supportsInput: true,
        template: `// TypeScript Code Runner Template
interface Greeter {
    name: string;
}

function greet(greeter: Greeter): void {
    console.log(\`Hello, \${greeter.name}!\`);
}

const user: Greeter = { name: "TypeScript" };
greet(user);`
    },
    go: {
        name: "Go",
        extensions: [".go"],
        defaultFileName: "main.go",
        runCommand: "go run {file}",
        hasCompileStep: false,
        supportsInput: true,
        template: `package main

import (
    "fmt"
    "bufio"
    "os"
)

func main() {
    fmt.Println("Hello, Go!")
    
    // Example with user input (uncomment to use)
    // fmt.Print("Enter your name: ")
    // scanner := bufio.NewScanner(os.Stdin)
    // scanner.Scan()
    // name := scanner.Text()
    // fmt.Printf("Hello, %s!\\n", name)
}`
    },
    rust: {
        name: "Rust",
        extensions: [".rs"],
        defaultFileName: "main.rs",
        runCommand: "rustc {file} -o {executable} && {executable}",
        hasCompileStep: false, // Combined compile and run
        supportsInput: true,
        template: `use std::io;

fn main() {
    println!("Hello, Rust!");
    
    // Example with user input (uncomment to use)
    // println!("Enter your name:");
    // let mut input = String::new();
    // io::stdin().read_line(&mut input).expect("Failed to read line");
    // println!("Hello, {}!", input.trim());
}`
    },
    ruby: {
        name: "Ruby",
        extensions: [".rb"],
        defaultFileName: "main.rb",
        runCommand: "ruby {file}",
        hasCompileStep: false,
        supportsInput: true,
        template: `#!/usr/bin/env ruby
# Ruby Code Runner Template

puts "Hello, Ruby!"

# Example with user input (uncomment to use)
# print "Enter your name: "
# name = gets.chomp
# puts "Hello, #{name}!"`
    },
    php: {
        name: "PHP",
        extensions: [".php"],
        defaultFileName: "main.php",
        runCommand: "php {file}",
        hasCompileStep: false,
        supportsInput: true,
        template: `<?php
// PHP Code Runner Template

echo "Hello, PHP!\\n";

// Example with user input (uncomment to use)
// echo "Enter your name: ";
// $name = trim(fgets(STDIN));
// echo "Hello, $name!\\n";
?>`
    },
    csharp: {
        name: "C#",
        extensions: [".cs"],
        defaultFileName: "Program.cs",
        compileCommand: "csc",
        runCommand: "{executable}",
        hasCompileStep: true,
        supportsInput: true,
        template: `using System;

namespace CodeRunner
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Hello, C#!");
            
            // Example with user input (uncomment to use)
            // Console.Write("Enter your name: ");
            // string name = Console.ReadLine();
            // Console.WriteLine($"Hello, {name}!");
        }
    }
}`
    }
};

const activeProcesses: Map<string, child_process.ChildProcessWithoutNullStreams> = new Map();

// Helper Functions
function detectLanguageFromFileName(fileName: string): string | null {
    const ext = path.extname(fileName).toLowerCase();
    for (const [lang, config] of Object.entries(SUPPORTED_LANGUAGES)) {
        if (config.extensions.includes(ext)) {
            return lang;
        }
    }
    return null;
}

function requiresInput(output: string): boolean {
    const lowerOutput = output.toLowerCase();
    const inputPatterns = [
        'enter', 'input', 'type', 'name:', 'age:', 'number:', 
        'choose', 'select', 'press', ':', '>', 'scanf', 'cin >>', 
        'readline', 'input()', 'gets', 'getchar'
    ];
    return inputPatterns.some(pattern => lowerOutput.includes(pattern));
}

function formatCStyleCode(code: string): string {
    // Basic C-style code formatter
    let formatted = code;
    let indentLevel = 0;
    const lines = formatted.split('\n');
    const formattedLines: string[] = [];
    
    for (let line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            formattedLines.push('');
            continue;
        }
        
        // Decrease indent for closing braces
        if (trimmed.startsWith('}')) {
            indentLevel = Math.max(0, indentLevel - 1);
        }
        
        // Add indentation
        const indent = '    '.repeat(indentLevel);
        formattedLines.push(indent + trimmed);
        
        // Increase indent for opening braces
        if (trimmed.endsWith('{')) {
            indentLevel++;
        }
    }
    
    return formattedLines.join('\n');
}

async function createTemplateFile(language: string, fileName: string, template: string) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage("No workspace folder is open.");
        return;
    }

    const filePath = path.join(workspaceFolders[0].uri.fsPath, fileName);
    
    // Check if file already exists
    if (fs.existsSync(filePath)) {
        const overwrite = await vscode.window.showWarningMessage(
            `File ${fileName} already exists. Overwrite?`,
            'Yes', 'No'
        );
        if (overwrite !== 'Yes') {
            return;
        }
    }

    try {
        fs.writeFileSync(filePath, template, 'utf8');
        vscode.window.showInformationMessage(`Template created: ${fileName}`);
        
        // Open the created file
        const document = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(document);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to create template: ${error}`);
    }
}
export function activate(context: vscode.ExtensionContext) {
    // Register main code runner panel command
    context.subscriptions.push(
        vscode.commands.registerCommand("codeRunner.openPanel", () => {
            createCodeRunnerPanel();
        })
    );

    // Register quick run command for current file
    context.subscriptions.push(
        vscode.commands.registerCommand("codeRunner.runCurrentFile", () => {
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor) {
                vscode.window.showErrorMessage("No active file to run.");
                return;
            }
            const fileName = path.basename(activeEditor.document.fileName);
            const language = detectLanguageFromFileName(fileName);
            if (!language) {
                vscode.window.showErrorMessage("Unsupported file type for code runner.");
                return;
            }
            createCodeRunnerPanel(activeEditor.document.getText(), language, fileName);
        })
    );

    // Register template creation command
    context.subscriptions.push(
        vscode.commands.registerCommand("codeRunner.createTemplate", async () => {
            const languageItems = Object.keys(SUPPORTED_LANGUAGES).map(key => ({
                label: SUPPORTED_LANGUAGES[key].name,
                value: key
            }));

            const selected = await vscode.window.showQuickPick(languageItems, {
                placeHolder: "Select a language template to create"
            });

            if (selected) {
                const config = SUPPORTED_LANGUAGES[selected.value];
                const fileName = await vscode.window.showInputBox({
                    prompt: `Enter filename for ${config.name} template`,
                    value: config.defaultFileName
                });

                if (fileName) {
                    createTemplateFile(selected.value, fileName, config.template);
                }
            }
        })
    );

    // Register settings command
    context.subscriptions.push(
        vscode.commands.registerCommand("codeRunner.openSettings", () => {
            vscode.commands.executeCommand('workbench.action.openSettings', 'codeRunner');
        })
    );

    function createCodeRunnerPanel(initialCode?: string, initialLanguage?: string, fileName?: string) {
        const panel = vscode.window.createWebviewPanel(
            "codeRunner",
            "Advanced Code Runner",
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );
        
        const panelId = `panel-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        // Auto-detect from active editor if not provided
        if (!initialCode || !initialLanguage) {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                initialCode = initialCode || activeEditor.document.getText();
                const detectedLang = detectLanguageFromFileName(activeEditor.document.fileName);
                initialLanguage = initialLanguage || detectedLang || "cpp";
                fileName = fileName || path.basename(activeEditor.document.fileName);
            } else {
                initialCode = initialCode || "";
                initialLanguage = initialLanguage || "cpp";
                fileName = fileName || SUPPORTED_LANGUAGES[initialLanguage].defaultFileName;
            }
        }

        panel.webview.html = getWebviewContent(initialCode, initialLanguage, fileName);

        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case "runCode":
                    await handleRunCode(panel, panelId, message);
                    break;
                case "clearOutput":
                    handleClearOutput(panel, panelId);
                    break;
                case "sendInput":
                    handleSendInput(panel, panelId, message.input);
                    break;
                case "getTemplate":
                    handleGetTemplate(panel, message.language);
                    break;
                case "saveFile":
                    await handleSaveFile(message.fileName, message.code);
                    break;
                case "formatCode":
                    await handleFormatCode(panel, message.language, message.code);
                    break;
            }
        });

        panel.onDidDispose(() => {
            if (activeProcesses.has(panelId)) {
                activeProcesses.get(panelId)?.kill('SIGKILL');
                activeProcesses.delete(panelId);
            }
        });
    }

    async function handleRunCode(panel: vscode.WebviewPanel, panelId: string, message: any) {
        const { language, fileName, code, args } = message;
        
        if (activeProcesses.has(panelId)) {
            activeProcesses.get(panelId)?.kill('SIGKILL'); 
            activeProcesses.delete(panelId);
            panel.webview.postMessage({ command: "removeInputPrompt" }); 
        }

        if (!fileName) {
            panel.webview.postMessage({
                command: "appendOutput",
                output: "❌ Error: Please enter a file name.\n",
            });
            return;
        }

        panel.webview.postMessage({ command: "clearOutput" });
        panel.webview.postMessage({
            command: "appendOutput",
            output: `🚀 Running ${SUPPORTED_LANGUAGES[language]?.name || language} code...\n`,
        });

        const startTime = Date.now();

        try {
            const process = await runCodeProcess(language, fileName, code, args);
            activeProcesses.set(panelId, process);

            process.stdout.on("data", (data) => {
                const chunk = data.toString();
                panel.webview.postMessage({ command: "appendOutput", output: chunk });
                
                // Smart input detection
                if (requiresInput(chunk) && process.stdin.writable) {
                    panel.webview.postMessage({ command: "requestInput" });
                }
            });

            process.stderr.on("data", (data) => {
                const chunk = data.toString();
                panel.webview.postMessage({ 
                    command: "appendOutput", 
                    output: `🔴 ${chunk}`,
                    isError: true 
                });
            });

            process.on("close", (code) => {
                const endTime = Date.now();
                const executionTime = endTime - startTime;
                
                panel.webview.postMessage({ command: "removeInputPrompt" }); 
                activeProcesses.delete(panelId);
                
                if (code !== 0) {
                    panel.webview.postMessage({
                        command: "appendOutput",
                        output: `\n❌ Program exited with code ${code} (${executionTime}ms)`,
                    });
                } else {
                    panel.webview.postMessage({
                        command: "appendOutput",
                        output: `\n✅ Program finished successfully (${executionTime}ms)`,
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
    }

    function handleClearOutput(panel: vscode.WebviewPanel, panelId: string) {
        panel.webview.postMessage({ command: "clearOutput" });
        panel.webview.postMessage({ command: "removeInputPrompt" });
        if (activeProcesses.has(panelId)) {
            activeProcesses.get(panelId)?.kill('SIGKILL');
            activeProcesses.delete(panelId);
        }
    }

    function handleSendInput(panel: vscode.WebviewPanel, panelId: string, input: string) {
        const process = activeProcesses.get(panelId);
        if (process && process.stdin && !process.stdin.writableEnded) {
            panel.webview.postMessage({ command: "appendOutput", output: input + "\n" });
            process.stdin.write(input + "\n");
            panel.webview.postMessage({ command: "removeInputPrompt" });
        } else {
            panel.webview.postMessage({ 
                command: "appendOutput", 
                output: "\n❌ No active program to send input to.\n" 
            });
            panel.webview.postMessage({ command: "removeInputPrompt" });
        }
    }

    function handleGetTemplate(panel: vscode.WebviewPanel, language: string) {
        const config = SUPPORTED_LANGUAGES[language];
        if (config) {
            panel.webview.postMessage({
                command: "setTemplate",
                template: config.template,
                fileName: config.defaultFileName
            });
        }
    }

    async function handleSaveFile(fileName: string, code: string) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage("No workspace folder is open.");
            return;
        }

        const filePath = path.join(workspaceFolders[0].uri.fsPath, fileName);
        try {
            fs.writeFileSync(filePath, code, 'utf8');
            vscode.window.showInformationMessage(`File saved: ${fileName}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save file: ${error}`);
        }
    }

    async function handleFormatCode(panel: vscode.WebviewPanel, language: string, code: string) {
        // Basic formatting - could be enhanced with language-specific formatters
        let formattedCode = code;
        
        // Simple indentation fixes for C-style languages
        if (['cpp', 'c', 'java', 'csharp', 'javascript', 'typescript'].includes(language)) {
            formattedCode = formatCStyleCode(code);
        }

        panel.webview.postMessage({
            command: "setFormattedCode",
            code: formattedCode
        });
    }
}

function getWebviewContent(initialCode: string, initialLanguage: string, initialFileName?: string): string {
    const languageOptions = Object.keys(SUPPORTED_LANGUAGES).map(lang => {
        const config = SUPPORTED_LANGUAGES[lang];
        return `<option value="${lang}" ${lang === initialLanguage ? 'selected' : ''}>${config.name}</option>`;
    }).join('');

    const defaultFileName = initialFileName || SUPPORTED_LANGUAGES[initialLanguage]?.defaultFileName || 'main.cpp';

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Advanced Code Runner</title>
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
                background: linear-gradient(135deg, #161b22, #1c2128);
                border-bottom: 1px solid #30363d;
                padding: 20px 32px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
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
                width: 28px;
                height: 28px;
                background: linear-gradient(135deg, #58a6ff, #388bfd);
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #ffffff;
                font-size: 12px;
                font-weight: 700;
                box-shadow: 0 2px 8px rgba(88,166,255,0.3);
            }

            .container {
                flex: 1;
                max-width: 1200px;
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
                border-radius: 12px;
                padding: 24px;
                display: flex;
                flex-direction: column;
                gap: 20px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            }

            .control-row {
                display: grid;
                grid-template-columns: 1fr 180px 120px 100px 100px;
                gap: 16px;
                align-items: end;
            }

            .control-actions {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                margin-top: 16px;
            }

            .field {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .label {
                font-size: 13px;
                font-weight: 500;
                color: #8b949e;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .input, .select, .textarea {
                height: 42px;
                padding: 10px 14px;
                border: 1px solid #30363d;
                border-radius: 8px;
                font-size: 14px;
                background: #0d1117;
                color: #c9d1d9;
                transition: all 0.2s ease;
                outline: none;
                font-family: ui-monospace, 'SF Mono', Monaco, 'Cascadia Code', monospace;
            }

            .textarea {
                height: auto;
                min-height: 42px;
                resize: vertical;
                font-family: ui-monospace, 'SF Mono', Monaco, 'Cascadia Code', monospace;
            }

            .input:focus, .select:focus, .textarea:focus {
                border-color: #58a6ff;
                box-shadow: 0 0 0 2px rgba(88,166,255,0.2);
            }

            .btn {
                height: 42px;
                color: #ffffff;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 0 16px;
                position: relative;
                overflow: hidden;
            }

            .btn-primary {
                background: linear-gradient(135deg, #238636, #2ea043);
                box-shadow: 0 2px 8px rgba(35,134,54,0.3);
            }

            .btn-primary:hover {
                background: linear-gradient(135deg, #2ea043, #46954a);
                transform: translateY(-1px);
                box-shadow: 0 4px 16px rgba(35,134,54,0.4);
            }

            .btn-secondary {
                background: linear-gradient(135deg, #6a737d, #8b949e);
            }

            .btn-secondary:hover {
                background: linear-gradient(135deg, #8b949e, #9ca3a9);
                transform: translateY(-1px);
            }

            .btn-outline {
                background: transparent;
                border: 1px solid #30363d;
                color: #c9d1d9;
            }

            .btn-outline:hover {
                background: #21262d;
                border-color: #58a6ff;
            }

            .output-section {
                flex: 1;
                background: #161b22;
                border: 1px solid #30363d;
                border-radius: 12px;
                display: flex;
                flex-direction: column;
                min-height: 400px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            }

            .output-header {
                padding: 16px 20px;
                border-bottom: 1px solid #30363d;
                background: #21262d;
                border-radius: 12px 12px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .output-title {
                font-size: 14px;
                font-weight: 600;
                color: #c9d1d9;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .status-indicator {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #6a737d;
                animation: pulse 2s infinite;
            }

            .status-indicator.running {
                background: #f85149;
                animation: pulse 1s infinite;
            }

            .status-indicator.success {
                background: #3fb950;
                animation: none;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }

            .output-content {
                flex: 1;
                padding: 20px;
                font-family: ui-monospace, 'SF Mono', Monaco, 'Cascadia Code', monospace;
                font-size: 13px;
                line-height: 1.6;
                color: #c9d1d9;
                background: #0d1117;
                white-space: pre-wrap;
                word-wrap: break-word;
                overflow-y: auto;
                border-radius: 0 0 12px 12px;
                display: flex;
                flex-direction: column;
            }

            .output-content:empty:not(:has(.input-prompt-line))::before {
                content: '🚀 Ready to run your code! Select a language and hit Run.';
                color: #8b949e;
                font-style: italic;
            }

            .play-icon {
                width: 0;
                height: 0;
                border-left: 8px solid currentColor;
                border-top: 5px solid transparent;
                border-bottom: 5px solid transparent;
                margin-left: 2px;
            }

            .icon {
                width: 16px;
                height: 16px;
                fill: currentColor;
            }

            .input-prompt-line {
                display: flex;
                align-items: center;
                margin-top: auto;
                width: 100%;
                box-sizing: border-box;
                background: rgba(88,166,255,0.1);
                padding: 8px;
                border-radius: 6px;
                border: 1px solid rgba(88,166,255,0.3);
            }

            .input-prompt-line input {
                flex-grow: 1;
                padding: 8px 12px;
                border: 1px solid #58a6ff;
                border-radius: 6px;
                background-color: #0d1117;
                color: #ffffff;
                font-family: ui-monospace, 'SF Mono', Monaco, 'Cascadia Code', monospace;
                font-size: 13px;
                outline: none;
                margin-left: 8px;
            }

            .input-prompt-prefix {
                color: #58a6ff;
                font-weight: bold;
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .language-info {
                background: rgba(88,166,255,0.1);
                border: 1px solid rgba(88,166,255,0.3);
                border-radius: 6px;
                padding: 12px;
                margin-bottom: 16px;
                font-size: 12px;
                color: #8b949e;
            }

            .args-field {
                grid-column: span 2;
            }

            @media (max-width: 768px) {
                .container {
                    padding: 20px 16px;
                }

                .control-row {
                    grid-template-columns: 1fr;
                    gap: 16px;
                }

                .control-actions {
                    flex-direction: column;
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
                <div class="logo">ACR</div>
                Advanced Code Runner
            </h1>
        </div>

        <div class="container">
            <div class="controls">
                <div id="languageInfo" class="language-info"></div>
                
                <div class="control-row">
                    <div class="field">
                        <label class="label">📄 File Name</label>
                        <input type="text" class="input" id="fileName" placeholder="main.cpp" value="${defaultFileName}" />
                    </div>
                    <div class="field">
                        <label class="label">🌐 Language</label>
                        <select class="select" id="language">
                            ${languageOptions}
                        </select>
                    </div>
                    <div class="field args-field">
                        <label class="label">⚙️ Arguments (optional)</label>
                        <input type="text" class="input" id="args" placeholder="arg1 arg2..." />
                    </div>
                </div>

                <div class="control-actions">
                    <button class="btn btn-outline" onclick="loadTemplate()">
                        📋 Load Template
                    </button>
                    <button class="btn btn-outline" onclick="saveFile()">
                        💾 Save File
                    </button>
                    <button class="btn btn-outline" onclick="formatCode()">
                        ✨ Format
                    </button>
                    <button class="btn btn-secondary" onclick="clearOutput()">
                        🗑️ Clear
                    </button>
                    <button class="btn btn-primary" onclick="runCode()">
                        <div class="play-icon"></div>
                        Run Code
                    </button>
                </div>
            </div>

            <div class="output-section">
                <div class="output-header">
                    <div class="output-title">
                        <div class="status-indicator" id="statusIndicator"></div>
                        Output Console
                    </div>
                    <div id="executionTime" style="font-size: 12px; color: #8b949e;"></div>
                </div>
                <div class="output-content" id="output"></div>
            </div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            const outputElement = document.getElementById("output");
            const statusIndicator = document.getElementById("statusIndicator");
            const languageSelect = document.getElementById('language');
            const fileNameInput = document.getElementById('fileName');
            const languageInfo = document.getElementById('languageInfo');

            // Language configurations
            const languages = ${JSON.stringify(SUPPORTED_LANGUAGES)};

            function updateLanguageInfo() {
                const selectedLang = languageSelect.value;
                const config = languages[selectedLang];
                if (config) {
                    languageInfo.innerHTML = \`
                        <strong>\${config.name}</strong> • 
                        Extensions: \${config.extensions.join(', ')} • 
                        \${config.hasCompileStep ? 'Compiled' : 'Interpreted'} • 
                        \${config.supportsInput ? 'Supports Input' : 'No Input Support'}
                    \`;
                }
            }

            languageSelect.addEventListener('change', (event) => {
                const language = event.target.value;
                const config = languages[language];
                if (config) {
                    fileNameInput.value = config.defaultFileName;
                    updateLanguageInfo();
                }
            });

            function runCode() {
                const fileName = fileNameInput.value.trim();
                const language = languageSelect.value;
                const args = document.getElementById("args").value.trim();

                if (!fileName) {
                    outputElement.innerHTML = "❌ Please enter a file name.";
                    return;
                }

                statusIndicator.className = "status-indicator running";
                outputElement.innerHTML = "";
                vscode.postMessage({ 
                    command: "runCode", 
                    language, 
                    fileName, 
                    args: args || null 
                });
            }

            function clearOutput() {
                outputElement.innerHTML = "";
                statusIndicator.className = "status-indicator";
                vscode.postMessage({ command: "clearOutput" });
            }

            function loadTemplate() {
                const language = languageSelect.value;
                vscode.postMessage({ command: "getTemplate", language });
            }

            function saveFile() {
                const fileName = fileNameInput.value.trim();
                if (!fileName) {
                    alert("Please enter a file name.");
                    return;
                }
                // For now, we'll save empty content - could be enhanced to get code from editor
                vscode.postMessage({ command: "saveFile", fileName, code: "" });
            }

            function formatCode() {
                const language = languageSelect.value;
                // For now, we'll format empty content - could be enhanced to get code from editor
                vscode.postMessage({ command: "formatCode", language, code: "" });
            }

            function createInputPrompt() {
                let inputPromptLine = outputElement.querySelector('.input-prompt-line');
                if (!inputPromptLine) {
                    inputPromptLine = document.createElement('div');
                    inputPromptLine.className = 'input-prompt-line';
                    inputPromptLine.innerHTML = \`
                        <span class="input-prompt-prefix">
                            ⌨️ Input:
                        </span>
                        <input type="text" class="program-input-field" placeholder="Type your input here...">
                    \`;
                    outputElement.appendChild(inputPromptLine);
                }

                const inputField = inputPromptLine.querySelector('.program-input-field');
                if (inputField) {
                    inputField.value = '';
                    inputField.disabled = false;
                    inputField.focus();

                    if (!inputField.dataset.listenerAdded) {
                        inputField.dataset.listenerAdded = 'true';
                        inputField.addEventListener('keydown', function(event) {
                            if (event.key === 'Enter') {
                                const inputValue = inputField.value;
                                inputField.disabled = true;
                                vscode.postMessage({ command: 'sendInput', input: inputValue });
                            }
                        });
                    }
                }
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
                        const outputSpan = document.createElement('span');
                        outputSpan.textContent = message.output;
                        if (message.isError) {
                            outputSpan.style.color = '#f85149';
                        }
                        
                        const existingInputPrompt = outputElement.querySelector('.input-prompt-line');
                        if (existingInputPrompt) {
                            outputElement.insertBefore(outputSpan, existingInputPrompt);
                        } else {
                            outputElement.appendChild(outputSpan);
                        }
                        
                        outputElement.scrollTop = outputElement.scrollHeight;
                        
                        // Update status for completion messages
                        if (message.output.includes('✅ Program finished')) {
                            statusIndicator.className = "status-indicator success";
                        }
                        break;
                        
                    case "clearOutput":
                        outputElement.innerHTML = "";
                        statusIndicator.className = "status-indicator";
                        break;
                        
                    case "requestInput":
                        createInputPrompt();
                        break;
                        
                    case "removeInputPrompt":
                        removeInputPrompt();
                        break;
                        
                    case "setTemplate":
                        // Could be enhanced to populate a code editor
                        alert("Template loaded! Check your workspace for the new file.");
                        break;
                        
                    case "setFormattedCode":
                        // Could be enhanced to update a code editor
                        alert("Code formatted!");
                        break;
                }
            });

            // Initialize
            updateLanguageInfo();
        </script>
    </body>
    </html>
  `;
}
async function runCodeProcess(
    language: string,
    fileName: string,
    code?: string,
    args?: string
): Promise<child_process.ChildProcessWithoutNullStreams> { 
    const config = SUPPORTED_LANGUAGES[language];
    if (!config) {
        throw new Error(`Unsupported language: ${language}`);
    }

    const tempDir = path.join(os.tmpdir(), "vscode-advanced-code-runner-temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    
    const filePath = path.join(tempDir, fileName);
    
    // Get code content - either from parameter or from workspace file
    let fileContent = code;
    if (!fileContent) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error("No workspace folder is open. Please open a folder containing your code files.");
        }
        const workspaceFilePath = path.join(workspaceFolders[0].uri.fsPath, fileName);

        if (!fs.existsSync(workspaceFilePath)) {
            throw new Error(`File "${fileName}" not found in workspace. Please ensure the file exists in your workspace folder.`);
        }
        fileContent = fs.readFileSync(workspaceFilePath, 'utf8');
    }
    
    fs.writeFileSync(filePath, fileContent);

    return new Promise((resolve, reject) => {
        let childProcess: child_process.ChildProcessWithoutNullStreams;

        // Handle compiled languages
        if (config.hasCompileStep && config.compileCommand) {
            executeCompiledLanguage(language, config, filePath, tempDir, args)
                .then(resolve)
                .catch(reject);
        } else {
            // Handle interpreted languages
            executeInterpretedLanguage(language, config, filePath, tempDir, args)
                .then(resolve)
                .catch(reject);
        }
    });
}

async function executeCompiledLanguage(
    language: string, 
    config: LanguageConfig, 
    filePath: string, 
    tempDir: string, 
    args?: string
): Promise<child_process.ChildProcessWithoutNullStreams> {
    return new Promise((resolve, reject) => {
        const fileName = path.basename(filePath);
        const baseName = path.parse(fileName).name;
        const exePath = path.join(tempDir, baseName + (os.platform() === "win32" ? ".exe" : ""));

        let compileCommand: string;

        switch (language) {
            case 'cpp':
            case 'c':
                compileCommand = `${config.compileCommand} "${filePath}" -o "${exePath}"`;
                break;
            case 'java':
                compileCommand = `javac "${filePath}"`;
                break;
            case 'csharp':
                compileCommand = `csc "${filePath}" -out:"${exePath}"`;
                break;
            case 'typescript':
                const jsPath = path.join(tempDir, baseName + ".js");
                compileCommand = `${config.compileCommand} "${filePath}" --outFile "${jsPath}"`;
                break;
            default:
                return reject(new Error(`Compilation not implemented for ${language}`));
        }

        child_process.exec(compileCommand, { cwd: tempDir }, (err, stdout, stderr) => {
            if (err) {
                try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
                return reject(new Error(`Compilation failed:\\n${stderr || stdout || err.message}`));
            }

            let runCommand: string;
            let runArgs: string[] = [];

            switch (language) {
                case 'cpp':
                case 'c':
                case 'csharp':
                    runCommand = os.platform() === "win32" ? `"${exePath}"` : exePath;
                    break;
                case 'java':
                    runCommand = 'java';
                    runArgs = ['-cp', tempDir, baseName];
                    break;
                case 'typescript':
                    const jsPath = path.join(tempDir, baseName + ".js");
                    runCommand = 'node';
                    runArgs = [jsPath];
                    break;
                default:
                    return reject(new Error(`Execution not implemented for ${language}`));
            }

            if (args) {
                runArgs.push(...args.split(' '));
            }

            const childProcess = child_process.spawn(runCommand, runArgs, {
                cwd: tempDir,
                shell: true,
            });

            childProcess.on('exit', () => {
                // Cleanup
                try {
                    fs.unlinkSync(filePath);
                    if (fs.existsSync(exePath)) fs.unlinkSync(exePath);
                    
                    // Java class files
                    if (language === 'java') {
                        const classFile = path.join(tempDir, baseName + ".class");
                        if (fs.existsSync(classFile)) fs.unlinkSync(classFile);
                    }
                    
                    // TypeScript JS files
                    if (language === 'typescript') {
                        const jsPath = path.join(tempDir, baseName + ".js");
                        if (fs.existsSync(jsPath)) fs.unlinkSync(jsPath);
                    }
                } catch (cleanupErr) {
                    console.error("Cleanup error:", cleanupErr);
                }
            });

            resolve(childProcess);
        });
    });
}

async function executeInterpretedLanguage(
    language: string, 
    config: LanguageConfig, 
    filePath: string, 
    tempDir: string, 
    args?: string
): Promise<child_process.ChildProcessWithoutNullStreams> {
    return new Promise((resolve, reject) => {
        let command: string;
        let cmdArgs: string[] = [];

        switch (language) {
            case 'python':
                command = 'python';
                cmdArgs = [filePath];
                break;
            case 'javascript':
                command = 'node';
                cmdArgs = [filePath];
                break;
            case 'go':
                command = 'go';
                cmdArgs = ['run', filePath];
                break;
            case 'rust':
                const fileName = path.basename(filePath);
                const baseName = path.parse(fileName).name;
                const exePath = path.join(tempDir, baseName + (os.platform() === "win32" ? ".exe" : ""));
                command = 'rustc';
                cmdArgs = [filePath, '-o', exePath, '&&', exePath];
                break;
            case 'ruby':
                command = 'ruby';
                cmdArgs = [filePath];
                break;
            case 'php':
                command = 'php';
                cmdArgs = [filePath];
                break;
            default:
                return reject(new Error(`Language ${language} not supported yet`));
        }

        if (args) {
            cmdArgs.push(...args.split(' '));
        }

        // For Rust, we need special handling due to the && operator
        if (language === 'rust') {
            const fullCommand = cmdArgs.join(' ');
            const childProcess = child_process.spawn(fullCommand, [], {
                cwd: tempDir,
                shell: true,
            });

            childProcess.on('exit', () => {
                try {
                    fs.unlinkSync(filePath);
                    const fileName = path.basename(filePath);
                    const baseName = path.parse(fileName).name;
                    const exePath = path.join(tempDir, baseName + (os.platform() === "win32" ? ".exe" : ""));
                    if (fs.existsSync(exePath)) fs.unlinkSync(exePath);
                } catch (cleanupErr) {
                    console.error("Cleanup error:", cleanupErr);
                }
            });

            resolve(childProcess);
        } else {
            const childProcess = child_process.spawn(command, cmdArgs, {
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

    const tempDir = path.join(os.tmpdir(), "vscode-advanced-code-runner-temp");
    if (fs.existsSync(tempDir)) {
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) {
            console.error("Failed to clean up temporary directory:", e);
        }
    }
}