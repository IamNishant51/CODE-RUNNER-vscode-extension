# Change Log

All notable changes to the "Advanced Code Runner" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.0.0] - 2025-08-28

### 🎉 Major Release - Complete Overhaul

#### ✨ Added
- **Multi-language support**: C, C++, Python, Java, JavaScript, TypeScript, Go, Rust, Ruby, PHP, and C#
- **Language templates**: Pre-built boilerplate code for all supported languages
- **Smart input detection**: Automatically detects when programs need user input
- **Execution time tracking**: Shows how long your code took to run
- **Command line arguments**: Support for passing arguments to your programs
- **Context menu integration**: Right-click any supported file to run it
- **Keyboard shortcuts**: Ctrl+F5 to run current file, Ctrl+Shift+R for panel
- **Modern UI redesign**: Beautiful dark-themed interface with status indicators
- **Code formatting**: Basic code formatting for C-style languages
- **Save to workspace**: Save code directly to your workspace from the panel
- **Better error handling**: Colored error messages and improved error reporting
- **Configuration options**: Customizable executor commands and settings

#### 🔧 Technical Improvements
- **Modular architecture**: Separate language configurations for easy extension
- **Enhanced process management**: Better handling of multiple language processes
- **Cross-platform compatibility**: Improved support for Windows, macOS, and Linux
- **Memory management**: Automatic cleanup of temporary files and processes
- **TypeScript strict mode**: Full type safety and better code quality

#### 🎨 UI/UX Enhancements
- **Status indicators**: Visual feedback for running, success, and error states
- **Language information**: Shows compilation type, extensions, and features
- **Responsive design**: Mobile-friendly interface for different screen sizes
- **Interactive elements**: Hover effects and better button styling
- **Progress tracking**: Real-time execution feedback

#### 📚 Documentation
- **Comprehensive README**: Complete documentation with examples and usage
- **Configuration guide**: Detailed settings and customization options
- **Language support table**: Overview of all supported languages and features
- **Installation instructions**: Multiple installation methods
- **Troubleshooting guide**: Common issues and solutions

#### 🚀 Commands Added
- `Code Runner: Open Panel` - Open the main runner interface
- `Code Runner: Run Current File` - Quick run active file
- `Code Runner: Create Template` - Generate language templates
- `Code Runner: Open Settings` - Access configuration

#### ⚙️ Settings Added
- `codeRunner.executorMap` - Custom executor commands for each language
- `codeRunner.runInTerminal` - Option to run in integrated terminal
- `codeRunner.clearPreviousOutput` - Auto-clear output option
- `codeRunner.saveFileBeforeRun` - Auto-save before execution
- `codeRunner.showExecutionMessage` - Toggle execution messages

### 🔄 Changed
- **Extension name**: "C-C++-runner" → "Advanced Code Runner"
- **File detection**: Improved auto-detection from file extensions
- **Output format**: Enhanced output with timestamps and status messages
- **Input handling**: Smarter input prompt detection and management

### 🐛 Fixed
- **Process cleanup**: Proper termination of background processes
- **Memory leaks**: Fixed temporary file accumulation
- **Cross-platform paths**: Consistent file path handling
- **Error messages**: More descriptive error reporting
- **Input timing**: Better synchronization of input/output

### 📦 Dependencies
- Updated TypeScript to latest version
- Enhanced webpack configuration
- Improved ESLint rules
- Better VS Code API integration

## [0.0.1] - 2025-08-20

### Added
- Initial release with basic C, C++, and Python support
- Simple webview interface
- Basic compilation and execution
- Interactive input support
- Dark theme UI