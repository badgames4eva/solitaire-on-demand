# Fire TV Remote Control Reference for Solitaire On Demand

## Overview
Solitaire On Demand now supports multiple types of Fire TV remotes using both traditional key names and Android KeyEvent constants. This ensures compatibility across all Fire TV devices and remote control types.

## Supported Remote Types
1. **Fire TV Remote App** - Uses traditional key names
2. **Physical Fire TV Remote** - Uses Android KeyEvent constants
3. **Voice Remote** - Uses Android KeyEvent constants  
4. **Game Controller** - Uses Android KeyEvent constants
5. **Third-party remotes** - May use either format

## Button Mappings

### Navigation Controls
| Button | Android KeyCode | Key Name | Function |
|--------|----------------|----------|----------|
| D-Pad Up | 19 (KEYCODE_DPAD_UP) | ArrowUp | Navigate up in menus/game |
| D-Pad Down | 20 (KEYCODE_DPAD_DOWN) | ArrowDown | Navigate down in menus/game |  
| D-Pad Left | 21 (KEYCODE_DPAD_LEFT) | ArrowLeft | Navigate left in menus/game |
| D-Pad Right | 22 (KEYCODE_DPAD_RIGHT) | ArrowRight | Navigate right in menus/game |
| D-Pad Center | 23 (KEYCODE_DPAD_CENTER) | Enter | Select focused item |
| A Button (Game Controller) | 96 (KEYCODE_BUTTON_A) | Enter | Select focused item |

### System Controls  
| Button | Android KeyCode | Key Name | Function |
|--------|----------------|----------|----------|
| Back | 4 (KEYCODE_BACK) | GoBack/Escape | Go back/Exit screens (Fixed: Direct call to UI manager) |
| Menu | 82 (KEYCODE_MENU) | ContextMenu | Open main menu |
| Home | N/A (System) | N/A | Return to Fire TV home (cannot be intercepted) |

### Media Controls (Game Functions)
| Button | Android KeyCode | Key Name | Game Function |
|--------|----------------|----------|---------------|
| Play/Pause | 85 (KEYCODE_MEDIA_PLAY_PAUSE) | MediaPlayPause | Draw cards from stock pile |
| Rewind | 89 (KEYCODE_MEDIA_REWIND) | MediaRewind | Undo last move |
| Fast Forward | 90 (KEYCODE_MEDIA_FAST_FORWARD) | MediaFastForward | Show hint |
| Channel Up | 166 (KEYCODE_CHANNEL_UP) | N/A | Show hint (alternative) |
| Channel Down | 167 (KEYCODE_CHANNEL_DOWN) | N/A | Undo move (alternative) |

### Keyboard Shortcuts (Testing/Development)
| Key | Function |
|-----|----------|
| Arrow Keys | D-Pad navigation |
| Enter/Space | Select |
| Escape/Backspace | Back |
| Tab | Menu |
| H | Hint (Fast Forward) |
| U | Undo (Rewind) |
| M | Menu |
| P | Play/Pause (Draw from stock) |
| 1-7 | Quick select tableau columns |
| F12 | Toggle debug panel |

## Implementation Details

### Dual Support Architecture
The game implements a dual-layer approach to handle different Fire TV remote types:

1. **Primary Handler (app.js)**: Handles Android KeyEvent constants (keyCode numbers)
2. **TV Remote Handler (tv-remote.js)**: Handles both key names and KeyEvent constants
3. **Fallback Support**: Keyboard events for development/testing

### Android KeyEvent Constants Reference
Based on the official Android KeyEvent class:

```javascript
// Navigation
KEYCODE_DPAD_CENTER = 23
KEYCODE_DPAD_LEFT = 21  
KEYCODE_DPAD_RIGHT = 22
KEYCODE_DPAD_UP = 19
KEYCODE_DPAD_DOWN = 20

// System
KEYCODE_BACK = 4
KEYCODE_MENU = 82

// Media Controls
KEYCODE_MEDIA_PLAY_PAUSE = 85
KEYCODE_MEDIA_REWIND = 89
KEYCODE_MEDIA_FAST_FORWARD = 90
KEYCODE_CHANNEL_UP = 166
KEYCODE_CHANNEL_DOWN = 167

// Game Controller
KEYCODE_BUTTON_A = 96
```

### Event Handling Flow
1. **Fire TV Remote Press** → Android KeyEvent with keyCode
2. **Primary Handler** → Maps keyCode to game function
3. **TV Remote Handler** → Handles navigation and UI focus
4. **Game Logic** → Executes the appropriate action
5. **Debug Logging** → Records all events for troubleshooting

### Custom Events Dispatched
The system dispatches these custom events for modular handling:

- `tvback` - Back button pressed
- `tvmenu` - Menu button pressed  
- `tvplay` - Play/Pause button pressed
- `tvskipbackward` - Rewind button pressed
- `tvfastforward` - Fast Forward button pressed
- `tvchannelup` - Channel Up button pressed
- `tvchanneldown` - Channel Down button pressed

## Game-Specific Controls

### In-Game Actions
- **⏯️ Play/Pause**: Draw cards from stock pile (most common action)
- **⏪ Rewind**: Undo last move (if available based on difficulty)
- **⏩ Fast Forward**: Show hint (if available based on difficulty)
- **☰ Menu**: Return to main menu
- **🔙 Back**: Navigate back through screens

### Menu Navigation
- **D-Pad**: Navigate between menu options
- **Select**: Choose menu option
- **Back**: Return to previous screen or exit app
- **Menu**: Always return to main menu

### Focus Management
The game uses intelligent focus management:
- **Visual Indicators**: Focused elements are highlighted
- **Smart Navigation**: Calculates shortest distance between UI elements
- **Auto-Focus**: Automatically focuses appropriate elements when screens change
- **Scroll Management**: Auto-scrolls to keep focused elements visible

## Debug Features

### Debug Panel (F12)
- **Key Event Logging**: Shows all key presses with codes
- **Function Call Tracking**: Shows which game functions are triggered
- **Real-time Monitoring**: Live view of remote control events
- **Clear Log**: Reset debug information

### Console Commands
Available in browser console (`debugSolitaire` object):
- `testKeyboard()` - Test navigation system
- `testDistance()` - Test distance calculations
- `getCurrentFocus()` - See currently focused element
- `getNavState()` - Check navigation state

## Troubleshooting

### Remote Not Working
1. Check if debug panel shows key events (F12)
2. Verify keyCode values in console logs
3. Ensure game is focused (click on game area)
4. Try keyboard shortcuts to test functionality

### Navigation Issues  
1. Check if elements have `focusable` class
2. Verify element visibility (not hidden/disabled)
3. Use distance testing functions to debug navigation
4. Check console for TV remote handler messages

### Performance
- All key events are logged for debugging
- Distance calculations are optimized for real-time use
- Focus management updates only when needed
- Custom events prevent duplicate processing

## Compatibility Notes

- **All Fire TV Devices**: Supports both old and new Fire TV models
- **Remote Apps**: Works with Fire TV mobile app
- **Game Controllers**: Compatible with Fire TV game controllers  
- **Voice Remotes**: Full support for voice remote buttons
- **Development**: Keyboard fallback for testing without Fire TV

This comprehensive remote support ensures Solitaire On Demand works seamlessly across all Fire TV devices and remote control types.
