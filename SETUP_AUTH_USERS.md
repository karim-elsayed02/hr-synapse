# Setting Up Authentication Users in Supabase

Since you have an existing Supabase project, you need to create authentication users for your staff members. Here's how:

## Method 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://supabase.com/dashboard/project/gbwmybvrhmjkyeaefidh
2. Navigate to **Authentication** > **Users** in the left sidebar
3. Click **Add User** button
4. Create the following users:

### Admin User
- **Email**: admin@synapseuk.org
- **Password**: (choose a secure password)
- **Auto Confirm User**: ✓ (checked)

### Chief Officers
Create these users with the same process:

- **Umar Humza Saifuddin (CEO)**
  - Email: umar@synapseuk.org
  - Password: (choose a secure password)
  
- **Mohsin Mohammad (CFO)**
  - Email: mohsin@synapseuk.org
  - Password: (choose a secure password)
  
- **Zara S Khan (COO)**
  - Email: zara@synapseuk.org
  - Password: (choose a secure password)

## Method 2: Using Supabase API

If you prefer to create users programmatically, you can use the Supabase Admin API:

\`\`\`javascript
// This requires your Supabase service role key (keep it secret!)
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://gbwmybvrhmjkyeaefidh.supabase.co',
  'YOUR_SERVICE_ROLE_KEY' // Get this from Project Settings > API
)

// Create admin user
await supabase.auth.admin.createUser({
  email: 'admin@synapseuk.org',
  password: 'SecurePassword123!',
  email_confirm: true,
  user_metadata: {
    full_name: 'System Administrator',
    role: 'admin'
  }
})
\`\`\`

## After Creating Users

1. Run the SQL script `05_create_auth_users.sql` to set up the trigger for automatic profile creation
2. The profiles should automatically link to the auth users
3. Users can now log in with their email and password

## Troubleshooting

If you still get "Invalid login credentials":
- Verify the user exists in Authentication > Users
- Check that "Auto Confirm User" was enabled
- Ensure the email matches exactly (case-sensitive)
- Try resetting the password through the dashboard
