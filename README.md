# Universe Explorer

An interactive 3D universe exploration web application built with React, Three.js, and React Three Fiber. Explore the solar system, stars, galaxies, and beyond with real astronomical data and stunning visual effects.

![Universe Explorer](https://img.shields.io/badge/React-18.3-blue)
![Three.js](https://img.shields.io/badge/Three.js-0.168-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Vite](https://img.shields.io/badge/Vite-5.0-purple)

## Features

### 🌌 Solar System Exploration
- **All 8 planets** with accurate Keplerian orbital mechanics
- **Major moons** (Moon, Galilean moons, Titan, Enceladus, etc.)
- **Real-time positions** calculated from orbital elements
- **Scalable views**: true-scale mode or visual-scale mode

### 🌟 Deep Space
- **Hipparcos star catalog** (~100,000 stars) with magnitude filtering
- **Constellation lines** and labels
- **Milky Way galaxy** with procedural dust lanes and spiral arms
- **External galaxies** (Andromeda, LMC, SMC, etc.)

### 🌍 Planetary Surfaces
- **Deep surface zoom** for Earth, Moon, and Mars
- **Real elevation data** from NASA (SRTM, LRO LOLA, MGS MOLA)
- **Surface region info** with feature names, types, coordinates, elevation

### 🌈 Visual Effects
- **Procedural atmosphere** with Fresnel glow and Rayleigh scattering
- **Day/night terminator** with city lights on Earth
- **Real eclipse mechanics** (solar and lunar eclipses with umbra/penumbra)
- **Procedural aurora** at Earth's poles
- **ISS tracker** with real-time position from Open Notify API
- **Asteroid belt** and **Kuiper belt** with thousands of objects

### 📱 Mobile & Accessibility
- **Touch controls**: pinch-to-zoom, drag-to-rotate, tap-to-select
- **Responsive UI** with mobile-first design
- **Screen reader support** with live region announcements
- **Keyboard navigation** with focus trapping
- **High contrast mode** support
- **Reduced motion** support

### 🔧 Developer Features
- **Screenshot capture** (press `S` or click button) - downloads 2x resolution PNG
- **Share view URLs** (press `Shift+S`) - encodes camera, time, selected object, settings
- **Low-performance mode** for older devices
- **Time control** from real-time to 10,000,000× speed
- **Date picker** for historical/future events

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd universe-explorer

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
# Type-check and build
npm run build

# Preview production build locally
npm run preview
```

## Deployment

### Deploy to Vercel (Recommended)

**Option 1: Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Option 2: GitHub Integration**
1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import the repository
4. Vercel auto-detects Vite/React - just click Deploy

The `vercel.json` included handles SPA routing correctly.

## Project Structure

```
universe-explorer/
├── public/                 # Static assets
├── src/
│   ├── components/         # React components
│   │   ├── UI/             # UI components (buttons, panels, etc.)
│   │   ├── SolarSystem/    # Solar system specific components
│   │   └── ...             # Core 3D components (Planet, Sun, etc.)
│   ├── context/            # React Context providers
│   ├── data/               # Astronomical data (planets, stars, galaxies)
│   ├── engine/             # Core simulation engine (orbital mechanics, etc.)
│   ├── hooks/              # Custom React hooks
│   ├── styles/             # Global CSS with CSS custom properties
│   ├── types/              # TypeScript type definitions
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # Entry point
│   └── vite-env.d.ts       # Vite type declarations
├── index.html              # HTML template
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vercel.json             # Vercel SPA routing config
```

## Key Technologies

| Category | Technology |
|----------|------------|
| Framework | React 18 + Vite 5 |
| 3D Rendering | @react-three/fiber, @react-three/drei, three.js |
| Post-processing | @react-three/postprocessing, postprocessing |
| State Management | Zustand, React Context |
| Styling | CSS Custom Properties (CSS Variables) |
| Language | TypeScript |

## Controls

| Action | Mouse/Trackpad | Touch | Keyboard |
|--------|---------------|-------|----------|
| Rotate | Left drag | Single finger drag | - |
| Zoom | Scroll / Right drag | Pinch | - |
| Pan | Shift + drag | Two finger drag | - |
| Select object | Click | Tap | - |
| Screenshot | - | - | `S` |
| Share view | - | - | `Shift+S` |
| Play/Pause | - | - | `Space` |
| Speed up/down | - | - | `←` / `→` |

## Configuration

### Environment Variables
Create `.env.local` for local overrides:
```env
VITE_API_URL=https://api.example.com
```

### Quality Presets
- `ultra` - Maximum quality, all effects enabled
- `high` - High quality, all effects enabled
- `medium` - Balanced (default)
- `low` - Reduced star count, simplified effects

## Performance Tips

1. **Enable Low Performance Mode** in settings for older devices
2. **Reduce Star Count** in settings if experiencing low FPS
3. **Disable Bloom/FXAA** in settings for integrated graphics
4. **Use Visual Scale** (not true-scale) for smoother navigation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run build` to verify
5. Submit a Pull Request

## License

MIT License - feel free to use for personal or commercial projects.

## Acknowledgments

- **NASA/JPL** for planetary data and elevation models
- **Hipparcos/Tycho** for star catalog data
- **Open Notify API** for ISS position data
- **Three.js community** for the amazing 3D library
- **React Three Fiber** team for the React renderer