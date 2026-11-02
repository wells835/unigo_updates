UNIGO DELIVERIES — COMPLETE BACKEND (Node.js + Express + MySQL)

This backend now supports:
- Admin login and menu add/edit/delete/availability
- Customer order submission with server-calculated totals and KSh 10 delivery fee
- Unique order tracking codes
- Public order tracking
- Feedback after delivery
- Admin order list and status updates

IMPORTANT: This is the backend folder. Keep your currently working Netlify customer website as it is for now.

FILES
server.js              Express API
schema.sql             MySQL database and tables
public/admin.html      Admin page (menu management; see note below)
package.json           Node dependencies and start command
.env.example           Environment variable template
scripts/create-admin.js Script to create the first admin login

DEPLOYMENT OVERVIEW
1. Create a MySQL database with a managed database provider.
2. Run schema.sql in that database (e.g. using the provider's SQL console or phpMyAdmin).
3. Upload these backend files to your GitHub repository root. Do not upload your .env file or passwords.
4. Create a Web Service on Render connected to that GitHub repository. Build command: npm install. Start command: npm start.
5. Add Render environment variables from .env.example using your real database connection details and a long random JWT_SECRET. Set ALLOWED_ORIGIN=https://unigo-deliveries002.netlify.app.
6. After deployment, test https://YOUR-RENDER-SERVICE.onrender.com/api/health. It should show database connected.
7. Set API_BASE_URL in the customer site's index.html to the Render URL (no trailing slash), then republish the customer site to Netlify.

ADMIN LOGIN
Create the admin user after setting the environment variables in the Render service. In Render Shell run:
  npm run create-admin
Follow the prompts. Do not share the password with anyone.
Then visit https://YOUR-RENDER-SERVICE.onrender.com/admin.

CUSTOMER WEBSITE CONNECTION
In the customer site's index.html, find:
  const WHATSAPP_NUMBER="254700452927",API_BASE_URL="";
Change only API_BASE_URL to your Render URL, for example:
  const WHATSAPP_NUMBER="254700452927",API_BASE_URL="https://your-service.onrender.com";
Use your actual Render URL, not the example.

ORDER STATUSES
Received → Confirmed → Preparing → Ready for pickup → Out for delivery → Delivered
Cancelled is also available.
Feedback can be submitted after status becomes Delivered.

IMPORTANT NOTES
- Your customer website hosted on Netlify remains separate from this backend.
- The supplied admin.html is the existing menu-management interface. Order management endpoints are included in the API; a dedicated order-management screen can be added after deployment if needed.
- Uploaded menu photos are stored on the server filesystem. On Render's standard ephemeral filesystem, uploaded photos may disappear after redeploy/restart. For permanent photo storage, connect Cloudinary or another object-storage service before relying on uploads.
- Never put DB credentials or JWT_SECRET in frontend code or commit them to GitHub.
- Do not change the Netlify customer site's files until you have backed them up.
