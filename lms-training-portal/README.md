# LMS Training Portal

A professional, custom-built training portal for employees to view assigned courses, track progress, and complete training from a beautiful dashboard.

## Features

- **Microsoft 365 Integration** - Sign in with work account
- **Role-Based Access** - Employees see only their assigned courses
- **Real-Time Data** - Connected to SharePoint lists
- **Progress Tracking** - Visual progress bars and completion status
- **Mobile Responsive** - Works on desktop, tablet, and mobile
- **Mark Complete** - Update course status directly from portal
- **Material Access** - Links to course materials

## Quick Start

1. Install dependencies: `npm install`
2. Create `.env` file (copy from `.env.example`)
3. Add Azure AD credentials to `.env`
4. Run locally: `npm start`
5. Deploy to Vercel: See SETUP_INSTRUCTIONS.md

## File Structure

```
lms-training-portal/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx      - Main dashboard showing courses
│   │   └── CourseCard.jsx     - Individual course card
│   ├── services/
│   │   └── sharePointAPI.js   - SharePoint data fetching
│   ├── App.jsx                - Main app with auth
│   ├── App.css                - Styling
│   └── index.js               - React entry point
├── public/
│   └── index.html             - HTML template
├── .env.example               - Environment variables template
├── package.json               - Dependencies
├── vercel.json                - Vercel deployment config
├── SETUP_INSTRUCTIONS.md      - Detailed setup guide
└── README.md                  - This file
```

## Environment Variables

Create a `.env` file with:

```
REACT_APP_CLIENT_ID=your_azure_app_id
REACT_APP_TENANT_ID=your_tenant_id
REACT_APP_AUTHORITY=https://login.microsoftonline.com/your_tenant_id
REACT_APP_SHAREPOINT_SITE=https://sarasanalytics.sharepoint.com/sites/training-library
```

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm build
```

## Deployment

Deploy to Vercel (free):
1. Push code to GitHub
2. Import project to Vercel
3. Set environment variables
4. Deploy

See SETUP_INSTRUCTIONS.md for detailed steps.

## Security

- ✅ Employees authenticate via Microsoft 365
- ✅ SharePoint list permissions enforce data isolation
- ✅ Each employee sees only their own courses
- ✅ Managers can only modify their department's enrollments
- ✅ All data is real-time from SharePoint

## Support

See SETUP_INSTRUCTIONS.md troubleshooting section or contact IT support.
