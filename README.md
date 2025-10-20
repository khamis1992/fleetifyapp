# Welcome to your Lovable project

## 🚀 Latest Updates

### Phase 7B: Module Expansion (NEW!)
**Fleetify is now a complete ERP solution!**

**Sales & CRM Module:**
- Lead tracking and qualification
- Sales pipeline management (Lead → Qualified → Proposal → Won/Lost)
- Professional quote generation
- Order fulfillment tracking

**Advanced Inventory Management:**
- Multi-warehouse stock tracking
- Real-time inventory movements
- Stock alerts and reorder points
- Inventory analytics (valuation, aging, turnover)
- Automated stock level updates

**Key Features:**
- 15 new database tables
- 45+ performance indexes
- 35+ security policies (RLS)
- 10 new React Query hooks
- Advanced analytics views

👉 **See:** [CHANGELOG_FLEETIFY_REVIEW.md](CHANGELOG_FLEETIFY_REVIEW.md) for Phase 7B details

### Performance Optimization - Phase 1 Complete!
- ⚡ **60% smaller** initial bundle (850KB → 340KB)
- 🔍 **3-5x faster** search queries
- 📊 **65% reduction** in Finance module size
- ⏱️ **34% faster** page loads

👉 **See:** [PERFORMANCE_MASTER_INDEX.md](PERFORMANCE_MASTER_INDEX.md) for complete details

---

## Project info

**URL**: https://lovable.dev/projects/5ff0c8e1-2855-4929-a18d-792957ea202c

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/5ff0c8e1-2855-4929-a18d-792957ea202c) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

### Web Technologies:
- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

### Mobile Technologies:
- Capacitor (for native mobile app generation)
- Android SDK (for APK builds)
- iOS SDK (for IPA builds)

## How can I deploy this project?

### Web Deployment
Simply open [Lovable](https://lovable.dev/projects/5ff0c8e1-2855-4929-a18d-792957ea202c) and click on Share -> Publish.

### Mobile App Deployment
To generate mobile apps (APK/IPA) from this React application:

1. **Quick APK build**: `npm run build:apk`
2. **Verify APK**: `npm run verify:apk`
3. **Manual build**: See [MOBILE_BUILD_GUIDE.md](MOBILE_BUILD_GUIDE.md) for detailed instructions

**APK Output Location**: `build/app/outputs/flutter-apk/app-release.apk`

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
