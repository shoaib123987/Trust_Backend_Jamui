// server.js
const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');

const app = express();
app.use(cors({
    origin: [
        'https://alihasanrahmanifoundation.org',
        'http://localhost:4200'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// VERY IMPORTANT 🔥
app.options('*', cors());
app.use(bodyParser.json());

// Serve static files (uploads)
app.use('/uploads', express.static('uploads'));

// ------------------------- MongoDB Connection -------------------------
const uri = "mongodb+srv://TrustJamui:123456%40Shoaib@trustjamui.tdsogqv.mongodb.net/TrustJamuiDB?retryWrites=true&w=majority";

mongoose.connect(uri, {
    serverSelectionTimeoutMS: 30000
})
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log("Mongo Error:", err));

// ------------------------- Razorpay Setup -------------------------
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ------------------------- Nodemailer Setup -------------------------
const transporter = nodemailer.createTransport({
    host: "server4.gosecureserver.in",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ------------------------- Multer Setup for Video & Author Image -------------------------
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage }).fields([
    { name: 'video', maxCount: 1 },
    { name: 'authorImg', maxCount: 1 }
]);

// ------------------------- MongoDB Schemas -------------------------

// Takrir Schema
const takrirSchema = new mongoose.Schema({
    videoUrl: { type: String, required: true },
    authorImg: { type: String },
    authorName: { type: String, required: true },
    date: { type: String, required: true },
    topic: { type: String, required: true },
    description: { type: String, required: true },
}, { timestamps: true });
const Takrir = mongoose.model('Takrir', takrirSchema);

// NamazTime Schema (har Namaz ka time + iqamah)
const namazTimeSchema = new mongoose.Schema({
    fajr: { time: { type: String }, iqamah: { type: String } },
    zuhr: { time: { type: String }, iqamah: { type: String } },
    asr: { time: { type: String }, iqamah: { type: String } },
    maghrib: { time: { type: String }, iqamah: { type: String } },
    isha: { time: { type: String }, iqamah: { type: String } },
    jumma: { time: { type: String }, iqamah: { type: String } }
}, { timestamps: true });
const NamazTime = mongoose.model('NamazTime', namazTimeSchema);

// ------------------------- Razorpay Create Order Endpoint -------------------------
app.post('/create-order', async (req, res) => {
    const { amount, currency, receipt } = req.body;
    try {
        const options = {
            amount: amount * 100,
            currency: currency || 'INR',
            receipt: receipt || `receipt_${Date.now()}`
        };
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error creating order');
    }
});

// ------------------------- Payment Success Email Endpoint -------------------------
app.post('/send-success-mail', async (req, res) => {
    const { name, email, mobile, amount, paymentId } = req.body;
    try {
   const info= await transporter.sendMail({
  from: `"Ali Hasan Rahmani Foundation" <${process.env.EMAIL_USER}>`,
  to: email,
  subject: '🌙 JazakAllah Khair for Your Donation',
  html: `
  <div style="font-family: Arial, sans-serif; background-color:#f4f6f9; padding:20px;">
    
    <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 5px 15px rgba(0,0,0,0.1);">
      
      <!-- Header -->
      <div style="background:#2755b0; color:#fff; padding:20px; text-align:center;">
        <h2 style="margin:0;">🤲 Thank You for Your Donation</h2>
        <p style="margin:5px 0 0;">May Allah bless you abundantly</p>
      </div>

      <!-- Body -->
      <div style="padding:25px; color:#333;">
        
        <h3 style="margin-top:0;">Assalamu Alaikum ${name},</h3>
        
        <p>
          We sincerely thank you for your generous contribution. Your support means a lot and helps us continue our mission.
        </p>

        <div style="background:#f1f5ff; padding:15px; border-radius:8px; margin:20px 0;">
          <p><strong>💰 Donation Amount:</strong> ₹${amount}</p>
          <p><strong>🧾 Payment ID:</strong> ${paymentId}</p>
        </div>

        <p>
          Your kindness and generosity will not go unnoticed. May Allah (SWT) accept your donation, multiply your rewards, and grant you barakah in your wealth and life.
        </p>

        <p>
          <strong>Dua for you:</strong><br/>
          🤲 "May Allah grant you happiness, success, and Jannah. May He ease your difficulties and bless you with endless الخير."
        </p>

        <p>
          Your support helps us serve the community and spread الخير. We truly appreciate your trust in us.
        </p>

        <p style="margin-top:30px;">
          Warm regards,<br/>
          <strong>AL-ALI HASAN RAHMANI WELFARE FOUNDATION (AAHRWF)</strong>
        </p>
      </div>

      <!-- Footer -->
      <div style="background:#f4f6f9; text-align:center; padding:15px; font-size:12px; color:#777;">
        <p style="margin:0;">© 2026 All Rights Reserved</p>
        <p style="margin:5px 0 0;">This is an automated email, please do not reply.</p>
      </div>

    </div>

  </div>
  `
});

        await transporter.sendMail({
          from: `"Ali Hasan Rahmani Foundation" <${process.env.EMAIL_USER}>`,
            to: 'admin@alihasanrahmanifoundation.org',
            subject: 'New Donation Received',
            html: `<h2>Donation Details</h2>
                   <p>Name: ${name}</p>
                   <p>Email: ${email}</p>
                   <p>Mobile: ${mobile}</p>
                   <p>Amount: ₹${amount}</p>
                   <p>Payment ID: ${paymentId}</p>
                   <p>Status: Success</p>`
        });

        res.json({ success: true });
          console.log("✅ USER EMAIL SENT:", info.response);
    } catch (err) {
        console.error(err);
        console.log("❌ USER EMAIL ERROR:", err);
        res.status(500).json({ success: false, message: 'Email sending failed' });
    }
});

// ------------------------- Takrir Upload Endpoint -------------------------
app.post('/upload-takrir', upload, async (req, res) => {
    try {
        const { authorName, date, description, topic } = req.body;
        const videoFile = req.files['video'] ? req.files['video'][0] : null;
        const imageFile = req.files['authorImg'] ? req.files['authorImg'][0] : null;

        if (!videoFile || !authorName || !date || !description || !topic) {
            return res.status(400).json({ message: 'Mandatory fields missing!' });
        }

        const takrir = new Takrir({
            videoUrl: videoFile.path,
            authorImg: imageFile ? imageFile.path : '',
            authorName,
            date,
            topic,
            description
        });

        await takrir.save();
        res.json({ success: true, message: 'Takrir uploaded successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ------------------------- Get All Takrir Endpoint -------------------------
app.get('/takrirs', async (req, res) => {
    try {
        const takrirs = await Takrir.find().sort({ createdAt: -1 });
        res.json(takrirs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch Takrirs' });
    }
});

// ------------------------- Namaz Time CRUD Endpoints -------------------------

// GET Namaz Times
app.get('/namaztimes', async (req, res) => {
    try {
        const times = await NamazTime.findOne();
        res.json(times || {});
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch namaz times' });
    }
});

// CREATE/UPDATE Namaz Times
app.post('/namaztime', async (req, res) => {
    try {
        const { fajr, zuhr, asr, maghrib, isha, jumma } = req.body;

        // Validate required fields
        if (!fajr || !zuhr || !asr || !maghrib || !isha || !jumma) {
            return res.status(400).json({ message: 'All Namaz fields with time & iqamah are mandatory!' });
        }

        let times = await NamazTime.findOne();
        if (!times) {
            times = new NamazTime({ fajr, zuhr, asr, maghrib, isha, jumma });
        } else {
            times.fajr = fajr;
            times.zuhr = zuhr;
            times.asr = asr;
            times.maghrib = maghrib;
            times.isha = isha;
            times.jumma = jumma;
        }

        await times.save();
        res.json({ success: true, message: 'Namaz times updated successfully!' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ------------------------- Start Server -------------------------
const port = 3000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
