UNIGO DELIVERIES WEBSITE + ADMIN BACKEND
========================================
Customer website target: https://unigo-deliveries002.netlify.app

WHAT IS INCLUDED
- Customer home page with category links: All, Breakfast, Main Dishes, Special Orders, Plain, Snacks, Chips & Bhajia, Beverages and Extras.
- Search meals, add/remove quantities in cart, checkout and fixed KSh 10 delivery fee.
- Payment method is Pay on Delivery only.
- Order creation returns a tracking code; customer can track Received, Preparing, Out for delivery, Delivered or Cancelled.
- After an order is marked Delivered, customer can submit feedback.
- Admin login, menu management and order status management.
- WhatsApp order confirmation to 254700452927 and UniGo till number 3192949.

IMPORTANT: THE WEBSITE IS NOT LIVE-DEPLOYED BY THIS ZIP
Netlify hosts the customer website, but the tracking, feedback and admin features need the Node.js backend and MySQL database running online. The website will not issue a working tracking code until this backend is deployed and configured.

DEPLOYMENT CHECKLIST
1. Create a MySQL database and run schema.sql in it. This creates admins, menu_items and orders tables.
2. Deploy this project folder to a Node.js host that supports a persistent Express server.
3. Add environment variables from .env.example in that host dashboard:
   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET,
   ADMIN_EMAIL, ADMIN_PASSWORD, ALLOWED_ORIGIN.
   Set ALLOWED_ORIGIN=https://unigo-deliveries002.netlify.app
   Use a strong private JWT_SECRET and admin password. Never share them in chat.
4. Create the first admin account by running: npm run create-admin
5. Copy the deployed backend URL. In public/index.html change API_BASE_URL="" to that backend URL, e.g. https://your-api-host.example
6. Upload the contents of the public folder to the Netlify site named unigo-deliveries002 (or deploy the public folder as the site publish directory).
7. Open the site, submit a test order, verify WhatsApp opens, and check that the tracking code can be looked up.
8. Log in at https://YOUR-BACKEND-URL/admin and update the test order status to Preparing, Out for delivery and Delivered. The customer tracking page will show each status.

PHONE-ONLY NOTE
You can do the setup using Chrome and your phone, but copying files, editing API_BASE_URL and deploying a Node backend is easier with a laptop. Do not paste passwords, database credentials or JWT secrets into public code or WhatsApp.

IMAGE STORAGE NOTE
The starter admin uploads images to the server's local public/uploads folder. Some hosting providers use temporary filesystems. Before relying on uploaded menu photos in production, use persistent disk storage or an image service such as Cloudinary.

MENU / PRICE NOTES
The customer menu is preloaded from the menu supplied by the business owner. The category tabs are built into the customer page. The admin menu editor is available for its original menu_items table; changing those entries does not currently rewrite the category-based customer menu in index.html. Update the menu array in index.html when changing the customer-facing menu until category-aware menu syncing is added.
