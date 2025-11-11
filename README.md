# Solitaire On Demand

A progressive web app for classic solitaire games with TV remote support and multiple difficulty levels. Play both Klondike and Spider solitaire variants.

## Features

### Core Gameplay
- **Two Solitaire Variants**:
  - **Klondike Solitaire**: Classic 7-column layout with foundation building
  - **Spider Solitaire**: 10-column layout with sequence completion gameplay
- **Multiple Difficulty Levels**:
  - **Klondike Easy**: Winnable deals with unlimited undos and hints
  - **Klondike Medium**: Classic gameplay with limited undos and hints
  - **Klondike Hard**: Draw-3 cards mode with minimal assistance
  - **Spider 1-Suit**: Easier Spider with only Spades (52 cards)
  - **Spider 2-Suit**: Medium Spider with Spades and Hearts (104 cards)
  - **Spider 4-Suit**: Hard Spider with all suits (104 cards)
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
- `Card`: Individual playing card with game logic for both variants
- `Deck`: Multi-deck system supporting 52-card (Klondike) and 104-card (Spider) games
- `GameState`: Complete game state management with variant-specific logic
- `DifficultyManager`: Handles difficulty settings and features
- `HintSystem`: Provides move suggestions and analysis
- `TVRemoteHandler`: TV remote navigation and input
- `UIManager`: User interface and rendering with dynamic layout switching
- `SolitaireGame`: Main game controller

### Game Variants and Difficulty

#### Klondike Solitaire
Traditional solitaire with 7 tableau columns and 4 foundation piles.

| Feature | Easy | Medium | Hard |
|---------|------|--------|------|
| Winnable Deals | ✓ | ✗ | ✗ |
| Draw Count | 1 | 1 | 3 |
| Hints | ✓ | ✓ | ✗ |
| Auto-complete | ✓ | ✓ | ✗ |
| Undo Limit | Unlimited | 10 | 3 |
| Score Multiplier | 0.8x | 1.0x | 1.5x |

#### Spider Solitaire
Build complete sequences from King to Ace in the same suit within 10 tableau columns.

| Feature | 1-Suit | 2-Suit | 4-Suit |
|---------|--------|--------|--------|
| Suits Used | Spades only | Spades & Hearts | All 4 suits |
| Total Cards | 52 | 104 | 104 |
| Difficulty | Easy | Medium | Hard |
| Objective | Build 4 sequences | Build 8 sequences | Build 8 sequences |
| Strategy | Focus on rank order | Manage 2 suit colors | Complex suit management |

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

## Game Rules

### Klondike Solitaire
- **Objective**: Move all cards to 4 foundation piles (Ace to King by suit)
- **Tableau**: 7 columns with cards dealt face-down and face-up
- **Stock**: Remaining cards dealt 1 or 3 at a time to waste pile
- **Building**: Tableau builds down by alternating colors, foundations build up by suit
- **Moving**: Can move single cards or sequences between tableau columns

### Spider Solitaire
- **Objective**: Build complete sequences from King to Ace in the same suit
- **Tableau**: 10 columns with 54 cards dealt (6 face-down + 4 face-up in first 4 columns, 5 face-down + 1 face-up in remaining 6)
- **Stock**: 50 remaining cards dealt 10 at a time (one to each column)
- **Building**: Tableau builds down by rank (any suit), but sequences can only be moved if same suit
- **Completion**: Complete K-A sequences are automatically removed when formed

## Game Statistics Tracked

- Games played and won (by variant and difficulty)
- Win percentage
- Average game time
- Best completion time
- Number of moves per game
- Stock pile cycles (Klondike)
- Sequences completed (Spider)
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

- **Additional Variants**: FreeCell, Pyramid, TriPeaks solitaire
- **Multiplayer Support**: Online competitive play
- **Achievement System**: Unlock rewards for milestones
- **Custom Themes**: Different visual styles
- **Sound Effects**: Audio feedback for actions
- **Advanced Statistics**: Detailed analytics and graphs
- **Tournament Mode**: Timed challenges and leaderboards
- **Spider Enhancements**: Hint system and auto-complete for Spider variant

## License

This project is open source and available under the MIT License.
