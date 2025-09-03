# Development Notes

## Mobile Testing Setup

To test the app on your mobile device:

### 1. Start the dev server with network access:
```bash
npm run dev -- --host 0.0.0.0
```

### 2. Find your computer's IP address:
**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your active network connection (usually starts with 192.168.x.x)

**Mac/Linux:**
```bash
ifconfig
```
Look for your network interface (usually en0 or wlan0)

### 3. Connect from your phone:
- Make sure your phone is on the same WiFi network as your computer
- Open your phone's browser
- Go to: `http://YOUR_IP_ADDRESS:3000`
- Example: `http://192.168.1.100:3000`

### Alternative method:
```bash
npm run dev -- --host
```
This will show you the network URL directly in the terminal.

## Quick Commands

```bash
# Standard dev server (localhost only)
npm run dev

# Dev server accessible from network (for mobile testing)
npm run dev -- --host 0.0.0.0

# Build for production
npm run build

# Start production server
npm run start

# Run tests
npm test

# Lint code
npm run lint
```

## Mobile Testing Tips

- Use Chrome DevTools mobile emulation for quick testing
- Test on actual devices for touch interactions
- Check responsive breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Test both portrait and landscape orientations
- Verify touch targets are at least 44px for accessibility

## Project Structure Quick Reference

- `/app` - Next.js App Router pages and API routes
- `/components` - Reusable React components
- `/lib` - Utility functions and configurations
- `/ranks.ts` - Rank system definitions and logic
- `/supabase` - Database schema and migrations