require("dotenv").config();
const mysql=require("mysql2/promise");
const bcrypt=require("bcryptjs");
(async()=>{
  const email=process.env.ADMIN_EMAIL;
  const password=process.env.ADMIN_PASSWORD;
  if(!email||!password||password==="change_this_password"){console.error("Set ADMIN_EMAIL and a strong ADMIN_PASSWORD in .env first.");process.exit(1)}
  const db=await mysql.createConnection({host:process.env.DB_HOST,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,port:Number(process.env.DB_PORT||3306)});
  const hash=await bcrypt.hash(password,12);
  await db.execute("INSERT INTO admins(email,password_hash) VALUES(?,?) ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash)",[email.toLowerCase(),hash]);
  await db.end();console.log("Admin account created/updated for "+email);
})().catch(e=>{console.error(e.message);process.exit(1)});
