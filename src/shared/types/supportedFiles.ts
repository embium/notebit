export const supportedTextFileTypes = [
  // **General Plain Text & Logs**
  'txt',
  'text',
  'log',
  'out', // Often used for program output/logs
  'err', // Often used for error logs
  'nfo', // Information files (often text)
  'info', // Information files
  'asc', // ASCII text (eg, ASCII art, PGP messages)
  'me', // Often used for README files

  // **Markup & Documentation**
  'md',
  'markdown',
  'rst', // reStructuredText
  'tex', // LaTeX source
  'latex', // LaTeX source (alternative)
  'sty', // LaTeX Style file
  'cls', // LaTeX Class file
  'bib', // BibTeX bibliography database
  'rtf', // Rich Text Format (partially text-readable)
  'sgml', // Standard Generalized Markup Language
  'xml',
  'xsd', // XML Schema Definition
  'xsl', // Extensible Stylesheet Language
  'xslt', // XSL Transformations
  'dtd', // Document Type Definition
  'ent', // XML Entity file
  'html',
  'htm',
  'xhtml',
  'tpl', // Template files (various engines)
  'tmpl', // Template files (alternative)
  'hbs', // Handlebars template
  'mustache', // Mustache template
  'adoc', // AsciiDoc
  'asciidoc', // AsciiDoc (alternative)
  'org', // Emacs Org-mode
  'pod', // Perl Old Documentation
  'man', // Manual page source (Unix/Linux)

  // **Configuration Files**
  'ini',
  'inf', // Setup Information (Windows)
  'cfg',
  'conf',
  'config',
  'cnf', // Often MySQL config or similar
  'rc', // Run Commands / Resource Config (eg, bashrc, vimrc)
  'profile', // Shell profile configuration
  'properties', // Java properties
  'yaml',
  'yml',
  'toml',
  'plist', // Property List (Apple - often XML or binary, but text version exists)
  'gitattributes',
  'gitconfig',
  'gitignore',
  'gitmodules',
  'dockerignore',
  'editorconfig',
  'npmrc',
  'yarnrc',
  'babelrc',
  'eslintrc',
  'eslintignore',
  'prettierrc',
  'prettierignore',
  'env', // Environment variables
  'service', // systemd service file
  'desktop', // Linux desktop entry file
  'reg', // Windows Registry export

  // **Data Serialization / Exchange Formats**
  'json',
  'jsonl', // JSON Lines
  'geojson', // GeoJSON
  'csv',
  'tsv',
  'psv', // Pipe Separated Values
  'sql', // Structured Query Language
  'ddl', // Data Definition Language (SQL)
  'dml', // Data Manipulation Language (SQL)
  'fods', // Flat OpenDocument Spreadsheet (XML-based)
  'fodt', // Flat OpenDocument Text (XML-based)

  // **Source Code - Web (Client & Server)**
  'js',
  'mjs', // Module JavaScript
  'cjs', // CommonJS JavaScript
  'jsx',
  'ts',
  'tsx',
  'css',
  'scss',
  'sass',
  'less',
  'styl', // Stylus CSS preprocessor
  'vue', // Vuejs single file component
  'svelte', // Svelte component
  'php',
  'phtml', // PHP/HTML mixed file
  'asp', // Active Server Pages (Classic)
  'aspx', // ASPNET Web Forms (often contains HTML/text)
  'ascx', // ASPNET User Control
  'cshtml', // C# HTML (ASPNET MVC/Razor)
  'vbhtml', // VBNET HTML (ASPNET MVC/Razor)
  'jsp', // JavaServer Pages
  'jspx', // JavaServer Pages XML
  'tag', // JSP Tag file
  'rb', // Ruby (often for web backends)
  'py', // Python (often for web backends)
  'pl', // Perl (used in CGI, etc)
  'cgi', // Common Gateway Interface scripts (various languages)
  'cfm', // ColdFusion Markup Language
  'cfc', // ColdFusion Component

  // **Source Code - General Purpose Languages**
  'c',
  'h', // C/C++ Header
  'cpp',
  'cxx',
  'cc', // C++ (alternative)
  'hpp',
  'hxx', // C++ Header (alternative)
  'hh', // C++ Header (alternative)
  'cs', // C#
  'java',
  'scala',
  'groovy',
  'gvy',
  'gy',
  'gsh',
  'kt', // Kotlin
  'kts', // Kotlin Script
  'go',
  'rs', // Rust
  'swift',
  'm', // Objective-C or MATLAB
  'mm', // Objective-C++
  'pl', // Perl
  'pm', // Perl Module
  'pyw', // Python (Windowed, script usually still text)
  'r', // R language
  'lisp', // Lisp
  'cl', // Common Lisp
  'el', // Emacs Lisp
  'scm', // Scheme
  'ss', // Scheme (alternative)
  'clj', // Clojure
  'cljs', // ClojureScript
  'cljc', // Clojure/ClojureScript common code
  'lua',
  'dart',
  'pas', // Pascal
  'pp', // Pascal (FreePascal)
  'inc', // Include file (Pascal, PHP, etc)
  'd', // D language
  'di', // D language interface file
  'nim', // Nim language
  'cr', // Crystal language
  'fs', // F#
  'fsi', // F# signature file
  'fsx', // F# script file
  'hs', // Haskell
  'lhs', // Literate Haskell
  'erl', // Erlang
  'hrl', // Erlang Header
  'ex', // Elixir
  'exs', // Elixir Script
  'vb', // Visual Basic
  'vbs', // VBScript
  'bas', // BASIC (various forms)
  'f', // Fortran (fixed-form)
  'f90', // Fortran (free-form)
  'f95', // Fortran
  'f03', // Fortran
  'f08', // Fortran
  'for', // Fortran (alternative)
  'ada', // Ada
  'ads', // Ada specification
  'adb', // Ada body
  'tcl', // Tcl script
  'cob', // COBOL
  'cbl', // COBOL (alternative)

  // **Source Code - Assembly**
  'asm',
  's', // Assembly (Unix/gcc convention)

  // **Source Code - Shaders**
  'glsl', // OpenGL Shading Language
  'vert', // Vertex Shader (often GLSL)
  'frag', // Fragment Shader (often GLSL)
  'tesc', // Tesselation Control Shader
  'tese', // Tesselation Evaluation Shader
  'geom', // Geometry Shader
  'comp', // Compute Shader
  'hlsl', // High-Level Shading Language (DirectX)
  'fx', // Effect file (often HLSL)

  // **Scripting Languages**
  'sh',
  'bash',
  'zsh',
  'csh',
  'ksh',
  'fish', // Fish shell script
  'bat',
  'cmd',
  'ps1', // PowerShell script
  'psm1', // PowerShell module
  'psd1', // PowerShell data file
  'applescript', // AppleScript
  'scpt', // AppleScript (compiled, but text variant exists or can be decompiled)
  'au3', // AutoIt script
  'jsf', // JScript (Windows Script Host)
  'awk', // AWK script
  'sed', // SED script

  // **Build System / Package Management**
  'gradle', // Gradle build script (Groovy or Kotlin)
  'kts', // Kotlin Script (used for Gradle Kotlin DSL)
  'pom', // Project Object Model (Maven - XML)
  'xml', // Often used (eg, Ant build files)
  'make', // Makefile
  'mk', // Makefile (alternative)
  'cmake', // CMake script
  'CMakeListstxt', // CMake list file (often filenamed like this)
  'gemspec', // RubyGems specification
  'Gemfile', // Ruby Bundler dependency file
  'Rakefile', // Ruby Rake task file
  'packagejson', // Nodejs package manifest
  'composerjson', // PHP Composer manifest
  'requirementstxt', // Python pip requirements
  'setuppy', // Python setup script
  'pyprojecttoml', // Python project metadata (PEP 518)
  'csproj', // C# Project file (XML)
  'vbproj', // VBNET Project file (XML)
  'vcxproj', // C++ Project file (Visual Studio - XML)
  'sln', // Visual Studio Solution file (mostly text)
];

export const supportedDocumentFileTypes = ['docx', 'pptx', 'odt', 'odp', 'ods'];
