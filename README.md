# Nargis - A Modern Confession Website ✨

[![Website](https://img.shields.io/website?url=https%3A%2F%2Fdivij.github.io%2Fnargis)](https://divij.github.io/nargis)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://github.com/divij/nargis)

A beautiful, modern, and responsive confession website dedicated to Nargis, featuring elegant theme toggling, glassmorphism effects, and interactive animations. Built with vanilla HTML, CSS, and JavaScript following modern web development best practices.

## 🌟 Features

- **🌞🌙 Elegant Theme Toggle**: Seamless switching between light and dark themes with emoji icons
- **💾 Persistent Preferences**: Theme choice saved to localStorage with system preference detection
- **✨ Glassmorphism Effects**: Modern frosted glass aesthetic with backdrop blur
- **📱 Fully Responsive**: Perfect display across all devices and screen sizes
- **💌 Interactive Confessions**: Add, like, and view confessions with smooth animations
- **🎨 Beautiful Typography**: Custom fonts and carefully crafted text styling
- **⚡ Performance Optimized**: Fast loading with minimal dependencies
- **♿ Accessibility First**: Proper ARIA labels, keyboard navigation, and semantic HTML

## 🎨 Color Schemes

### Light Theme

- **Background**: Pale white (#fdf6f3)
- **Primary**: Cherry red (#e52d27)
- **Secondary**: Dark pink (#b31217)
- **Text**: Dark brown (#2d1a1a)

### Dark Theme

- **Background**: Hunter green (#1a3a1a)
- **Primary**: Yellow/Gold (#f7e017)
- **Secondary**: Ultramarine blue (#3f51b5)
- **Accent**: Emerald green (#50c878)
- **Text**: Gold (#f7e017)

## 🚀 Quick Start

### Development Server

```bash
# Clone the repository
git clone https://github.com/divij/nargis.git
cd nargis

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to view the website.

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
nargis/
├── src/                    # Source files
│   └── index.html         # Main HTML file
├── assets/                # Static assets
│   ├── css/              # Stylesheets
│   │   └── main.css      # Main CSS file
│   ├── js/               # JavaScript files
│   │   └── main.js       # Main JavaScript file
│   └── images/           # Image assets
├── docs/                 # Documentation
├── tests/                # Test files
├── package.json          # Project configuration
└── README.md            # Project documentation
```

## 🔧 Technologies Used

- **HTML5**: Semantic markup and accessibility
- **CSS3**: Custom properties, flexbox, grid, animations
- **Vanilla JavaScript**: ES6+ features, classes, modules
- **Local Storage**: Theme and data persistence
- **Modern Web APIs**: Intersection Observer, Media Queries

## 🎯 Key Components

### Theme Manager

- **Class-based architecture** for theme management
- **localStorage integration** for persistence
- **System preference detection** (prefers-color-scheme)
- **Smooth transitions** between themes

### Confession System

- **Real-time form handling** with validation
- **Local storage persistence** for confessions
- **Interactive like system** with animations
- **XSS protection** with HTML escaping

### Navigation

- **Smooth scrolling** to sections
- **Active section highlighting** based on scroll position
- **Responsive design** with mobile-first approach

## 🧪 Testing

### Manual Testing

1. **Theme Toggle**: Test switching between light/dark themes
2. **Responsive Design**: Test on various screen sizes
3. **Confession System**: Test adding and liking confessions
4. **Navigation**: Test smooth scrolling and active states
5. **Persistence**: Test localStorage functionality

### Debug Pages

- `debug-theme.html` - Minimal theme testing
- `test-complete.html` - Full feature testing

## 🔧 Configuration

### Environment Variables

No environment variables required - runs entirely client-side.

### Build Configuration

- **Development**: Live server with hot reload
- **Production**: Optimized static files
- **Testing**: Debug pages for feature testing

## 📱 Browser Support

- **Chrome**: 88+
- **Firefox**: 85+
- **Safari**: 14+
- **Edge**: 88+
- **Mobile browsers**: iOS Safari 14+, Chrome Mobile 88+

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow semantic HTML structure
- Use CSS custom properties for theming
- Write vanilla JavaScript (no frameworks)
- Ensure accessibility compliance
- Test across multiple browsers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Divij**

- Email: divij@example.com
- GitHub: [@divij](https://github.com/divij)

## 🙏 Acknowledgments

- Inspired by modern glassmorphism design trends
- Color palettes carefully selected for emotional impact
- Typography choices made for readability and elegance
- Accessibility guidelines followed for inclusive design

## 📝 Changelog

### v3.0.0 (Current)

- **NEW**: Restructured codebase with modern architecture
- **NEW**: Enhanced theme system with better persistence
- **IMPROVED**: Performance optimizations and code organization
- **IMPROVED**: Better responsive design and accessibility
- **FIXED**: All theme toggle issues and edge cases

### v2.0.0

- **NEW**: Complete theme toggle system implementation
- **NEW**: Glassmorphism effects and modern styling
- **NEW**: Interactive confession system with likes
- **IMPROVED**: Mobile responsiveness and animations

### v1.0.0

- Initial release with basic website structure

---

Made with ❤️ for Nargis
