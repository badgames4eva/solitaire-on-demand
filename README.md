# Solitaire On Demand

A progressive web app for Klondike Solitaire with TV remote support and multiple difficulty levels.

## Features

### Core Gameplay
- **Classic Klondike Solitaire** with standard rules
- **Multiple Difficulty Levels**:
  - **Easy**: Winnable deals with unlimited undos and hints
  - **Medium**: Classic gameplay with limited undos and hints
  - **Hard**: Draw-3 cards mode with minimal assistance
- **Smart Hint System** with move suggestions and game analysis
- **Undo Functionality** with difficulty-based limits
- **Auto-complete** when all cards can be moved to foundations

### TV Remote Support
- **Fire TV Compatible** with full D-pad navigation
- **Keyboard Fallback** for testing and desktop use
- **Focus Management** with visual indicators
- **Long Press Detection** for additional actions
- **Accessible Navigation** optimized for 10-foot UI

### Progressive Web App
- **Offline Play** with service worker caching
- **Installable** on devices and TV platforms
- **Responsive Design** for various screen sizes
- **Game State Persistence** with automatic save/restore
- **Statistics Tracking** with local storage

### User Interface
- **Clean Design** optimized for TV viewing
- **Smooth Animations** for card movements
- **Visual Feedback** for valid moves and hints
- **Game Statistics** with win rates and timing
- **Settings Panel** for customization

## Technical Implementation

### Architecture
- **Modular Design** with separate classes for each system
- **Event-Driven** communication between components
- **State Management** with comprehensive game state tracking
- **Error Handling** with graceful degradation

### Key Classes
- `Card`: Individual playing card with game logic
- `Deck`: 52-card deck with shuffling and dealing
- `GameState`: Complete game state management
- `DifficultyManager`: Handles difficulty settings and features
- `HintSystem`: Provides move suggestions and analysis
- `TVRemoteHandler`: TV remote navigation and input
- `UIManager`: User interface and rendering
- `SolitaireGame`: Main game controller

### Difficulty System
Each difficulty level has different features:

| Feature | Easy | Medium | Hard |
|---------|------|--------|------|
| Winnable Deals | ✓ | ✗ | ✗ |
| Draw Count | 1 | 1 | 3 |
| Hints | ✓ | ✓ | ✗ |
| Auto-complete | ✓ | ✓ | ✗ |
| Undo Limit | Unlimited | 10 | 3 |
| Score Multiplier | 0.8x | 1.0x | 1.5x |

### TV Remote Controls
- **D-pad**: Navigate between game areas
- **Select**: Interact with focused element
- **Back**: Return to previous screen
- **Menu**: Access main menu from game
- **Long Press**: Show additional information

## Installation

### For Development
1. Clone or download the project files
2. Serve the files using a local web server
3. Open in a web browser or Fire TV browser

### As PWA
1. Open the game in a compatible browser
2. Use "Add to Home Screen" or "Install App"
3. Launch from home screen for full-screen experience

### For Fire TV
1. Deploy to Fire TV compatible hosting
2. Include the `manifest.toml` file for TV features
3. Test with Fire TV browser or as a web app

## File Structure

```
solitaire-on-demand/
├── index.html              # Main HTML file
├── styles.css              # All CSS styles
├── manifest.json           # PWA manifest
├── manifest.toml           # Fire TV manifest
├── sw.js                   # Service worker
├── README.md               # This file
└── js/
    ├── card.js             # Card class
    ├── deck.js             # Deck management
    ├── game-state.js       # Game state management
    ├── difficulty.js       # Difficulty and hint systems
    ├── tv-remote.js        # TV remote handler
    ├── ui.js               # UI management
    ├── game.js             # Main game controller
    └── app.js              # Application entry point
```

## Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Fire TV Browser**: Full TV remote support
- **Mobile Browsers**: Touch and keyboard input
- **Progressive Enhancement**: Graceful fallbacks

## Game Statistics Tracked

- Games played and won
- Win percentage
- Average game time
- Best completion time
- Number of moves per game
- Stock pile cycles
- Empty columns created

## Keyboard Shortcuts

- **Ctrl+H**: Show hint
- **Ctrl+U**: Undo move
- **Ctrl+N**: New game
- **Ctrl+M**: Main menu
- **Arrow Keys**: Navigate (when not on Fire TV)
- **Enter/Space**: Select
- **Escape**: Back

## Development Notes

### TV Remote Implementation
The TV remote system uses the Fire TV `TVEventHandler` API when available, with keyboard fallbacks for development. Focus management is handled through CSS classes and JavaScript navigation logic.

### Difficulty Algorithm
- **Easy Mode**: Uses a reverse-solve algorithm to ensure winnable deals
- **Hard Mode**: Strategically places important cards (Aces, low cards) deeper in the deck
- **Hint System**: Analyzes all possible moves and prioritizes by strategic value

### Performance Considerations
- Efficient DOM updates with minimal reflows
- Card animations use CSS transforms
- Game state serialization for save/restore
- Service worker caching for offline play

## Future Enhancements

- **Multiplayer Support**: Online competitive play
- **Achievement System**: Unlock rewards for milestones
- **Custom Themes**: Different visual styles
- **Sound Effects**: Audio feedback for actions
- **Advanced Statistics**: Detailed analytics and graphs
- **Tournament Mode**: Timed challenges and leaderboards

## License

This project is open source and available under the MIT License.
