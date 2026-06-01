# LMS Training Portal - Setup Instructions

Your React training portal is now ready! Follow these steps to get it running.

---

## ✅ Step 1: Install Dependencies

Open PowerShell in the project folder and run:

```powershell
npm install
```

This installs all required packages (React, Azure auth, SharePoint API client, etc.)

---

## 🔐 Step 2: Register App in Azure AD

This is required so the portal can authenticate employees with Office 365.

### 2.1 Go to Azure Portal

1. Open: https://portal.azure.com
2. Sign in with your admin account
3. Search for **"App registrations"** (use the search bar at top)
4. Click **"App registrations"** in the results

### 2.2 Create New Registration

1. Click **"+ New registration"**
2. Enter:
   - Name: **"LMS Training Portal"**
   - Supported account types: **"Accounts in this organizational directory only"**
3. Click **"Register"**

### 2.3 Copy Credentials

You'll see the app details page. Copy these values:

**Application (client) ID:**
```
Click the copy icon next to the ID
Save it: REACT_APP_CLIENT_ID
```

**Directory (tenant) ID:**
```
Click the copy icon next to the ID
Save it: REACT_APP_TENANT_ID
```

### 2.4 Add Redirect URIs

1. Click **"Authentication"** in left sidebar
2. Click **"+ Add a platform"**
3. Choose **"Single-page application"** (SPA)
4. Add these redirect URIs:
   - `http://localhost:3000`
   - `http://localhost:3000/` (with trailing slash)
5. Click **"Configure"** and then **"Save"**

### 2.5 Grant SharePoint Permission

1. Click **"API permissions"** in left sidebar
2. Click **"+ Add a permission"**
3. Search for and click **"SharePoint"**
4. Select **"Delegated permissions"**
5. Check these permissions:
   - ☑ `AllSites.Read`
   - ☑ `Sites.Read.All`
   - ☑ `user.read`
6. Click **"Add permissions"**

---

## 📝 Step 3: Create .env File

1. In the project folder, copy the `.env.example` file to `.env`

   ```powershell
   copy .env.example .env
   ```

2. Open `.env` with a text editor (Notepad)

3. Fill in your values from Step 2:

   ```
   REACT_APP_CLIENT_ID=paste_your_client_id_here
   REACT_APP_TENANT_ID=paste_your_tenant_id_here
   REACT_APP_AUTHORITY=https://login.microsoftonline.com/paste_your_tenant_id_here
   REACT_APP_SHAREPOINT_SITE=https://sarasanalytics.sharepoint.com/sites/training-library
   ```

   **Example:**
   ```
   REACT_APP_CLIENT_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
   REACT_APP_TENANT_ID=9f8e7d6c-5b4a-3210-fedc-ba9876543210
   REACT_APP_AUTHORITY=https://login.microsoftonline.com/9f8e7d6c-5b4a-3210-fedc-ba9876543210
   REACT_APP_SHAREPOINT_SITE=https://sarasanalytics.sharepoint.com/sites/training-library
   ```

4. Save the file

---

## 🚀 Step 4: Test Locally

Run the app on your computer:

```powershell
npm start
```

This opens http://localhost:3000 in your browser.

### What you should see:

1. **Login Page** - "Training Portal" with "Sign In with Microsoft 365" button
2. Click the button and sign in with your Office 365 account
3. You'll see your **dashboard** with:
   - Welcome message
   - 4 stat cards (Courses Assigned, Completed, In Progress, Completion Rate)
   - List of your assigned courses
4. Click any course to see details and mark it complete

### Test with a real employee:

1. Have an employee sign in (they'll need access to your SharePoint site)
2. Verify they see ONLY their own courses (not other employees' courses)
3. Click a course and click "Mark Complete" to test the update

---

## 🌐 Step 5: Deploy to Vercel (Free Hosting)

### 5.1 Push to GitHub

1. Create a GitHub account if you don't have one: https://github.com
2. Create a new repository: https://github.com/new
   - Name: `lms-training-portal`
   - Public or Private (your choice)
   - Click **"Create repository"**
3. Follow GitHub's instructions to push your code:

   ```powershell
   cd C:\Users\AnudeepKolla\lms-training-portal
   git init
   git add .
   git commit -m "Initial LMS training portal"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/lms-training-portal.git
   git push -u origin main
   ```

### 5.2 Deploy to Vercel

1. Go to: https://vercel.com
2. Click **"Sign Up"** and sign in with GitHub
3. Click **"Import Project"**
4. Select your `lms-training-portal` repository
5. Click **"Import"**
6. On the Environment Variables screen, add:
   - `REACT_APP_CLIENT_ID` = (from Azure)
   - `REACT_APP_TENANT_ID` = (from Azure)
   - `REACT_APP_AUTHORITY` = `https://login.microsoftonline.com/YOUR_TENANT_ID`
7. Click **"Deploy"**

Wait 2-3 minutes for deployment to complete.

### 5.3 Update Azure AD Redirect URIs

Once deployed, you'll get a URL like: `https://lms-training-portal-abc123.vercel.app`

Add this to Azure AD:
1. Go back to Azure Portal
2. Find your **"LMS Training Portal"** app registration
3. Click **"Authentication"**
4. Under "Single-page application", add your Vercel URL:
   - `https://lms-training-portal-abc123.vercel.app`
5. Click **"Save"**

---

## 📊 Step 6: Share with Employees

Your app is now live! Share this with employees:

**Email:**
```
Subject: Your Training Portal is Ready! 📚

Hi everyone,

Your new training portal is now available! Access your training courses and track your progress here:

🔗 https://lms-training-portal-abc123.vercel.app

Just sign in with your Microsoft 365 account (your company email).

You'll see:
✓ All your assigned training courses
✓ Your progress and completion status
✓ Access to course materials
✓ Ability to mark courses complete

Questions? Contact [your IT support email]
```

---

## 🔧 Troubleshooting

### Issue: "Login failed" or "App not registered"
**Fix:** Make sure the app is registered in Azure AD and the credentials are correct in `.env`

### Issue: "Cannot fetch courses from SharePoint"
**Fix:** Make sure:
1. The SharePoint site URL is correct in `.env`
2. The app has SharePoint permissions (AllSites.Read)
3. The employee has access to the training library site

### Issue: "App works locally but not on Vercel"
**Fix:** Make sure environment variables are set on Vercel dashboard and match Azure AD redirect URIs

### Issue: Only seeing some courses, not all
**Fix:** This is correct! Employees see ONLY their assigned courses. Check that the course is assigned to them in the Employee Enrollments list.

---

## ✨ Features Included

✅ **Microsoft 365 Authentication** - Employees sign in with their work account
✅ **Course Dashboard** - See all assigned courses at a glance
✅ **Progress Tracking** - Visual progress bars for each course
✅ **Completion Tracking** - Mark courses as complete
✅ **Mobile Responsive** - Works on phones and tablets
✅ **Real-time Data** - Pulls live data from SharePoint lists
✅ **Secure** - Role-based access control via Azure AD

---

## 📈 Next Steps

1. **Deploy this portal** (today - 30 min)
2. **Share with employees** (this week)
3. **Monitor usage** (first week)
4. **Create manager dashboards** (next week)
5. **Build Power BI dashboards** (optional, if you get licenses)

---

## 🎉 You're Done!

Your professional, custom-built training portal is ready. Employees can now:
- View their assigned training
- Track progress
- Mark courses complete
- Access course materials

All from a beautiful, mobile-friendly interface that pulls live data from your SharePoint lists!

Questions? Check the troubleshooting section or contact your IT support team.
