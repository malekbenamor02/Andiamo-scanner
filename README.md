# Andiamo Scanner

A standalone QR code scanning application for Andiamo Events, designed to work offline and sync with the main database when online.

## Features

- **QR Code Scanning**: Real-time QR code detection using device camera
- **Offline Support**: Scans are stored locally when offline and synced when connection is restored
- **Ambassador Authentication**: Secure login for approved ambassadors
- **Event Selection**: Choose which event to scan for
- **PWA Support**: Installable as a mobile app
- **Dark Theme**: Optimized for outdoor event scanning

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (same as main application)
- **Offline Storage**: IndexedDB
- **QR Detection**: jsQR library
- **PWA**: Vite PWA plugin

## Installation

1. **Clone the repository** (if separate) or navigate to the scanner directory:
   ```bash
   cd scanner-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Build for production**:
   ```bash
   npm run build
   ```

## Usage

### For Ambassadors

1. **Login**: Use your ambassador phone number and password
2. **Select Event**: Choose the event you're scanning for
3. **Start Scanning**: Point camera at QR codes
4. **View Results**: See validation results immediately
5. **Offline Queue**: Check pending scans when offline

### For Administrators

- The scanner connects to the same Supabase database as the main application
- All scan data is stored in the `scans` table
- Offline scans are automatically synced when connection is restored

## Database Schema

The scanner uses the same database as the main application:

### Tables Used
- `ambassadors` - Authentication and user data
- `events` - Event information for selection
- `scans` - Scan records and validation results

### Offline Storage
- `scanner-db` (IndexedDB) - Local storage for offline scans
- Automatic sync when online

## Development

### Project Structure
```
scanner-app/
├── src/
│   ├── components/
│   │   ├── Scanner.tsx      # Main scanning interface
│   │   ├── Login.tsx        # Authentication
│   │   └── OfflineQueue.tsx # Offline scan management
│   ├── hooks/
│   │   └── useOfflineStore.ts # Offline data management
│   ├── lib/
│   │   └── supabase.ts      # Database client
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
├── public/                  # Static assets
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

### Key Features

#### Offline Functionality
- Scans are stored in IndexedDB when offline
- Automatic sync when connection is restored
- Visual indicators for online/offline status

#### Camera Integration
- Uses device camera for QR scanning
- Optimized for mobile devices
- Fallback handling for camera permissions

#### Security
- Ambassador authentication required
- Phone number validation (Tunisian format)
- Secure data transmission

## Deployment

### Vercel
1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Netlify
1. Build the project: `npm run build`
2. Upload the `dist` folder to Netlify
3. Set environment variables in Netlify dashboard

### Manual Deployment
1. Build: `npm run build`
2. Upload `dist` folder to your web server
3. Ensure HTTPS for camera access

## Mobile Installation

### iOS Safari
1. Open the scanner in Safari
2. Tap the share button
3. Select "Add to Home Screen"

### Android Chrome
1. Open the scanner in Chrome
2. Tap the menu button
3. Select "Add to Home Screen"

## Troubleshooting

### Camera Not Working
- Ensure HTTPS is enabled
- Check camera permissions
- Try refreshing the page

### Offline Sync Issues
- Check network connection
- Verify Supabase credentials
- Clear browser cache if needed

### Performance Issues
- Close other camera-using apps
- Restart the browser
- Check device memory

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the Andiamo Events platform. 