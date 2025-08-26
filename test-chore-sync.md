# Chore Synchronization Test Guide

This guide will help you test the real-time synchronization between parent and child accounts in the Chore Champion application.

## Prerequisites

1. **Database Setup**: Ensure your Supabase database is running with the schema from `supabase/schema.sql`
2. **Environment Variables**: Make sure `.env.local` has valid Supabase credentials
3. **Authentication**: You'll need both parent and child accounts set up

## Account Setup

### 1. Create Test Accounts

**Steps:**

1. Navigate to `http://localhost:3000/auth`
2. **Create Parent Account**:
   - Click "Don't have an account? Sign up"
   - Fill in email: `parent@test.com`
   - Password: `password123`
   - Name: `Test Parent`
   - Role: `Parent`
   - Click "Create Account"
3. **Create Child Account**:
   - Fill in email: `child@test.com`
   - Password: `password123`
   - Name: `Test Child`
   - Role: `Child`
   - Parent Email: `parent@test.com`
   - Click "Create Account"

## Test Scenarios

### 1. Parent Creates Chore → Child Sees It

**Steps:**

1. Open two browser windows/tabs
2. Sign in as parent in one (`parent@test.com`), child in the other (`child@test.com`)
3. In parent dashboard:
   - Go to "Manage Chores" tab
   - Click "Create New Chore"
   - Fill in details (e.g., "Clean Kitchen", "Wipe counters and load dishwasher", 25 points)
   - Leave "Assign to Child" as "Unassigned" or select the child
   - Click "Create Chore"
4. In child dashboard:
   - Go to "Available Missions" tab
   - **Expected Result**: The new chore should appear immediately without page refresh

### 2. Child Views Available Missions (Mock Interface)

**Steps:**

1. Navigate to `http://localhost:3000/child/dashboard`
2. Click on the "Available Missions" tab
3. **Expected Result**: See mock missions with different statuses:
   - Available missions (can be marked complete)
   - Pending missions (already submitted, waiting for approval)
   - Mission history showing approved/rejected items

### 3. Parent Reviews Pending Approvals (Mock Interface)

**Steps:**

1. Navigate to `http://localhost:3000/parent/dashboard`
2. Click on the "Pending Approvals" tab
3. **Expected Result**: See mock pending completions from children
4. Click "✓ Approve" or "✗ Reject" on any completion
5. **Expected Result**: Item disappears from pending list (simulating approval/rejection)

### 4. Interface Navigation and Features

**Steps:**

1. Test both parent and child dashboards:
   - **Parent Dashboard**: `http://localhost:3000/parent/dashboard`
     - Overview tab: Shows family statistics
     - Manage Chores tab: Create, view, and delete chores
     - Pending Approvals tab: Review and approve/reject completions
   - **Child Dashboard**: `http://localhost:3000/child/dashboard`
     - Overview tab: Shows personal stats and AI Voice Coach
     - Available Missions tab: View and complete missions

## Key Features to Verify (Mock Mode)

### ✅ User Interface Functionality

- All tabs and navigation work correctly
- Forms submit and update the interface
- Mock data displays properly
- Responsive design works on different screen sizes

### ✅ Component Interactions

- Parent can create new chores
- Parent can delete existing chores
- Parent can approve/reject completions
- Child can view missions with different statuses
- Child can see mission history

### ✅ Mock Data Simulation

- Realistic chore data and scenarios
- Proper status indicators (pending, approved, rejected)
- Points and ranking system display
- Family member assignments work correctly

## Troubleshooting

### If Pages Don't Load:

1. Ensure development server is running: `npm run dev`
2. Check browser console for JavaScript errors
3. Verify all component imports are correct
4. Make sure you're accessing the correct URLs

### If Components Don't Display:

1. Check that mock data is properly defined
2. Verify component state is updating correctly
3. Look for TypeScript compilation errors
4. Ensure CSS classes are loading properly

### If Interactions Don't Work:

1. Check that event handlers are properly bound
2. Verify form submissions are working
3. Look for console errors when clicking buttons
4. Ensure state updates are triggering re-renders

## Mock Data Structure

The application uses the following mock data:

### Parent Profile

```javascript
{
  id: 'mock-parent-id',
  role: 'parent',
  name: 'Test Parent'
}
```

### Child Profile

```javascript
{
  id: 'mock-child-id',
  name: 'Test Child',
  rank: 'Task Trooper',
  role: 'child',
  parent_id: 'mock-parent-id'
}
```

### Sample Chores

- Clean Kitchen (25 points, assigned to Alex)
- Take Out Trash (15 points, unassigned, recurring)
- Feed the Dog (10 points, assigned to Sam, recurring)

## Expected Behavior Summary (Mock Mode)

1. **Parent creates chore** → **Chore appears in parent's chore list**
2. **Parent deletes chore** → **Chore disappears from list**
3. **Parent approves/rejects completion** → **Item disappears from pending list**
4. **Child views missions** → **Sees different mission statuses and history**
5. **All interfaces respond immediately** to user interactions

## Next Steps

This mock interface demonstrates the core functionality of Chore Champion. To enable full synchronization:

1. **Enable Authentication**: Remove mock data and restore auth context
2. **Connect Database**: Ensure Supabase is properly configured
3. **Test Real-time**: Use the real components (ChoreManager, ChoreApprovalManager, ChildMissionHub)
4. **Multi-user Testing**: Create actual parent and child accounts

The mock mode provides a safe way to test the user interface and interactions without requiring database setup or authentication configuration.
