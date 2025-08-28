# 🚀 Advanced Code Runner (VS Code Extension)

A powerful, feature-rich, multi-language code runner for VS Code with a beautiful dark-themed interface.  
Run **10+ programming languages** directly inside VS Code with advanced features and smart input detection.

---

## ✨ Features

### 🌟 **Core Features**
- 🖤 **Beautiful dark-themed UI** with modern design
- 🌐 **Multi-language support** - 10+ programming languages
- ⚡ **One-click execution** with smart compilation detection
- 📁 **Auto file detection** from active editor
- 💻 **Real-time output** with colored error messages
- ⌨️ **Interactive input support** with smart detection
- 📊 **Execution time tracking**
- 🧹 **Automatic cleanup** of temporary files

### 🔧 **Advanced Features**
- 📋 **Language templates** - Quick start with boilerplate code
- ✨ **Code formatting** for supported languages
- 💾 **Save to workspace** functionality
- ⚙️ **Command line arguments** support
- 🎯 **Context menu integration** 
- ⌨️ **Keyboard shortcuts** (Ctrl+F5 to run, Ctrl+Shift+R for panel)
- 🔗 **Right-click to run** any supported file

### 🌐 **Supported Languages**

| Language     | Extensions       | Compilation | Input Support | Templates |
|-------------|------------------|-------------|---------------|-----------|
| **C**       | `.c`            | ✅ gcc      | ✅            | ✅        |
| **C++**     | `.cpp`, `.cxx`, `.cc` | ✅ g++  | ✅            | ✅        |
| **Python**  | `.py`           | ❌ Interpreted | ✅          | ✅        |
| **Java**    | `.java`         | ✅ javac   | ✅            | ✅        |
| **JavaScript** | `.js`        | ❌ Node.js | ✅            | ✅        |
| **TypeScript** | `.ts`        | ✅ tsc     | ✅            | ✅        |
| **Go**      | `.go`           | ❌ go run  | ✅            | ✅        |
| **Rust**    | `.rs`           | ✅ rustc   | ✅            | ✅        |
| **Ruby**    | `.rb`           | ❌ ruby    | ✅            | ✅        |
| **PHP**     | `.php`          | ❌ php     | ✅            | ✅        |
| **C#**      | `.cs`           | ✅ csc     | ✅            | ✅        |

---

## 📸 Preview

### 🎨 **Modern Interface**
![Advanced Code Runner Interface](https://github.com/user-attachments/assets/bc5b1bef-78e7-4904-b9a6-dca946ce5fce)

### 🔥 **Multi-Language Support**
![Multi-Language Support](https://github.com/user-attachments/assets/9caf8a57-50f5-4510-9fc7-560ebb3f14b3)

---

## 🚀 Installation

### **Method 1: From Source (Recommended)**
1. Clone the repository:
   ```bash
   git clone https://github.com/IamNishant51/CODE-RUNNER-vscode-extension.git
   cd CODE-RUNNER-vscode-extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run compile
   ```

4. Package the extension:
   ```bash
   npm run package
   ```

5. Install in VS Code:
   - Open VS Code
   - Press `Ctrl+Shift+P`
   - Run "Extensions: Install from VSIX..."
   - Select the generated `.vsix` file

### **Method 2: Development Mode**
1. Clone and open in VS Code
2. Press `F5` to run in development mode
3. Test in the new Extension Development Host window

---

## 🎯 Usage

### **Quick Start**
1. Open any supported code file (`.c`, `.cpp`, `.py`, `.java`, etc.)
2. Press `Ctrl+F5` or right-click → "Run Current File"
3. Or open Command Palette (`Ctrl+Shift+P`) → "Code Runner: Open Panel"

### **Commands**
- `Code Runner: Open Panel` - Open the main runner interface
- `Code Runner: Run Current File` - Quick run active file
- `Code Runner: Create Template` - Generate language templates
- `Code Runner: Open Settings` - Access configuration

### **Keyboard Shortcuts**
- `Ctrl+F5` (`Cmd+F5` on Mac) - Run current file
- `Ctrl+Shift+R` (`Cmd+Shift+R` on Mac) - Open runner panel

### **Templates**
Create boilerplate code for any supported language:
1. Command Palette → "Code Runner: Create Template"
2. Select language
3. Enter filename
4. Template is created and opened automatically

---

## ⚙️ Configuration

### **Settings**
Access via File → Preferences → Settings → Search "Code Runner"

```json
{
  "codeRunner.executorMap": {
    "c": "gcc $fileName -o $fileNameWithoutExt && ./$fileNameWithoutExt",
    "cpp": "g++ $fileName -o $fileNameWithoutExt && ./$fileNameWithoutExt",
    "python": "python $fileName",
    "java": "javac $fileName && java $fileNameWithoutExt",
    "javascript": "node $fileName",
    "typescript": "tsc $fileName && node $fileNameWithoutExt.js",
    "go": "go run $fileName",
    "rust": "rustc $fileName -o $fileNameWithoutExt && ./$fileNameWithoutExt",
    "ruby": "ruby $fileName",
    "php": "php $fileName",
    "csharp": "csc $fileName && ./$fileNameWithoutExt.exe"
  },
  "codeRunner.runInTerminal": false,
  "codeRunner.clearPreviousOutput": true,
  "codeRunner.saveFileBeforeRun": true,
  "codeRunner.showExecutionMessage": true
}
```

### **Prerequisites**
Make sure you have the required compilers/interpreters installed:

- **C/C++**: GCC/G++ (`sudo apt install gcc g++` on Ubuntu)
- **Python**: Python 3.x (`python.org`)
- **Java**: JDK 8+ (`sudo apt install openjdk-11-jdk`)
- **Node.js**: For JavaScript/TypeScript (`nodejs.org`)
- **Go**: Go compiler (`golang.org`)
- **Rust**: Rust toolchain (`rustup.rs`)
- **Ruby**: Ruby interpreter (`ruby-lang.org`)
- **PHP**: PHP interpreter (`php.net`)
- **C#**: .NET SDK (`dotnet.microsoft.com`)

---

## 🆕 What's New in v1.0.0

### **Major Enhancements**
- ✅ **10+ language support** (previously only C/C++/Python)
- ✅ **Language templates** with boilerplate code
- ✅ **Smart input detection** for interactive programs
- ✅ **Execution time tracking** 
- ✅ **Command line arguments** support
- ✅ **Code formatting** capabilities
- ✅ **Context menu integration**
- ✅ **Keyboard shortcuts**
- ✅ **Modern UI redesign** with status indicators
- ✅ **Better error handling** with colored output
- ✅ **Configuration options** for customization

### **Technical Improvements**
- 🔧 Modular language configuration system
- 🔧 Enhanced process management
- 🔧 Better memory cleanup
- 🔧 Cross-platform compatibility improvements
- 🔧 TypeScript strict mode compliance

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### **Development Setup**
```bash
git clone https://github.com/IamNishant51/CODE-RUNNER-vscode-extension.git
cd CODE-RUNNER-vscode-extension
npm install
npm run watch  # For development with auto-reload
```

---

## 📋 Roadmap

### **Upcoming Features**
- [ ] **Code editor integration** - Edit code directly in the panel
- [ ] **Debug mode support** - Integrate with VS Code debugger
- [ ] **Multiple file projects** - Support for multi-file compilation
- [ ] **Custom build configurations** - Project-specific settings
- [ ] **Performance profiling** - Memory and CPU usage tracking
- [ ] **Output export** - Save results to file
- [ ] **Collaborative features** - Share code snippets
- [ ] **Cloud compilation** - Remote execution support

### **Language Additions**
- [ ] **Kotlin** support
- [ ] **Swift** support  
- [ ] **Dart** support
- [ ] **Scala** support
- [ ] **Perl** support

---

## 🐛 Known Issues

- TypeScript compilation may require global `tsc` installation
- C# support requires .NET SDK installation
- Some languages may need PATH configuration
- Input detection might need refinement for complex prompts

Report issues at: [GitHub Issues](https://github.com/IamNishant51/CODE-RUNNER-vscode-extension/issues)

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Nishant Unavane** - [@IamNishant51](https://github.com/IamNishant51)

---

## 🌟 Support

If you find this extension helpful, please:
- ⭐ **Star** the repository
- 🐛 **Report** any issues
- 💡 **Suggest** new features
- 📢 **Share** with others

---

## 📞 Contact

- **GitHub**: [@IamNishant51](https://github.com/IamNishant51)
- **Repository**: [CODE-RUNNER-vscode-extension](https://github.com/IamNishant51/CODE-RUNNER-vscode-extension)
- **Issues**: [Report a Bug](https://github.com/IamNishant51/CODE-RUNNER-vscode-extension/issues)

---

<div align="center">

**Made with ❤️ for the coding community**

</div>
