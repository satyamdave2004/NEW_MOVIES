const express = require('express');
const mongoose = require('mongoose');
const {ObjectId, MongoClient , ServerApiVersion } = require('mongodb');
const axios = require('axios');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
require("dotenv").config();
const session = require('express-session');
const bcrypt = require('bcrypt');
const MongoStore = require('connect-mongo');

const { renderHeader, renderDivider, renderDetailsCard, renderChargesTable, renderFooter, renderBorder } = require('./pdf_func');
const {calculateCharges, printException,urlExists  } = require('./funcs');

const app = express();
const port = process.env.PORT||2602;

// Middleware
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));


// MongoDB connection for the original MongoDB part
//const mongoUri = "mongodb+srv://tvseries200413:SATYAM13@smsd.qqpws0x.mongodb.net/?retryWrites=true&w=majority&appName=SMSD";
const mongoUri = "mongodb://localhost:27017/mudata";

let mongoClient;
let mdata;
let users;

async function connectMongoDB() {
    try {
        mongoClient = new MongoClient(mongoUri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
        await mongoClient.connect();
        console.log("✅ Connected successfully!");

        const db = mongoClient.db("mudata");
        mdata = db.collection("data");
        users = db.collection("users");

        // You can now use mdata
     

    } catch (error) {
        console.error("❌ Connection error:", error);
    }
}

connectMongoDB().catch(console.error);


// Session configuration (add after app.use(express.static...))
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key_here',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: mongoUri,
        collectionName: 'sessions'
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
}));

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    res.redirect('/login');
}


// Login Routes
app.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    const user = await users.findOne({ username });
    if (!user) return res.status(400).send('Invalid credentials');
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).send('Invalid credentials');
    
    req.session.user = { id: user._id,username: user.username};
    res.redirect('/');
});

// Signup Routes
app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    
    // Check if user exists
    const existingUser = await users.findOne({ username });
    if (existingUser) return res.status(400).send('Username already exists');
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user
    await users.insertOne({
        username,
        password: hashedPassword,
        createdAt: new Date()
    });
    
    res.redirect('/login');
});

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).send('Logout failed');
        res.redirect('/login');
    });
});

// Routes
app.get('/',requireAuth, (req, res) => {
    res.render('index');
});

app.post('/search',requireAuth, async (req, res) => {
    const { name, year } = req.body; // Get parameters from the form
    
    if (!name) {
        return res.status(400).send('Name is required');
    }

    // Redirect based on whether the year is provided
    if (year) {
        res.redirect(`/pr/${name}?year=${year}`);
    } else {
        res.redirect(`/pr/${name}`);
    }
});


app.get('/pr/:name',requireAuth, async (req, res) => {
    const { name } = req.params;
    const { year } = req.query;
    const apiKey = "d738823c";
    
    try {
        let apiUrl;
        if (year) {
            apiUrl = `http://www.omdbapi.com/?t=${name}&y=${year}&apikey=${apiKey}`;
        } else {
            apiUrl = `http://www.omdbapi.com/?t=${name}&apikey=${apiKey}`;
        }
        
        const response = await axios.get(apiUrl);
        const data = response.data;
        let data2 = {};
        let ep = 1;
        let ru = null;
        let releaseDateString = '2000-01-01';
        
        if (data) {
            const imdbId = data.imdbID || "notes";
            
            try {
                ru = parseInt(data.Runtime?.replace(' min', '')) || null;
            } catch (error) {
                // pass
            }
            
            if (imdbId) {
                const mzurl = `https://api.tvmaze.com/lookup/shows?imdb=${imdbId}`;
                console.log(mzurl);
                
                if (await urlExists(mzurl)) {
                    const response2 = await axios.get(mzurl);
                    data2 = response2.data;
                    
                    const runtStr = data2.averageRuntime || data.Runtime || '0';
                    console.log("hello", runtStr);
                    ru = parseInt(runtStr) || 0;
                    
                    const response3 = await axios.get(`https://api.tvmaze.com/shows/${data2.id}/episodes`);
                    const data3 = response3.data;
                    ep = data3.length;
                } else {
                    data2 = { error: "No TVMaze Data Found" };
                }
                
                releaseDateString = data2.ended || data.Released || 'N/A';
            }
            
            let released;
            if (releaseDateString !== 'N/A') {
                try {
                    released = moment(releaseDateString, ["DD MMM YYYY", "YYYY-MM-DD"]).format("YYYY-MM-DD");
                } catch (error) {
                    released = "2000-01-01";
                }
            } else {
                released = "2000-01-01";
            }
            
            res.render("index2", { data, data2, Released: released, ep, ru });
        } else {
            res.send("<h1 style='color:red'>No Data Found</h1> <a href='/'>click here to enter data manually</a>");
        }
    } catch (error) {
        console.log(error);
        res.send(`<h1 style='color:red'>An error occurred: ${error.message}</h1>`);
    }
});

app.post('/generate_bill',requireAuth, async (req, res) => {
    const { name, content_type, episodes, episode_runtime, release_date, imdb_rating, poster } = req.body;
    
    const formattedDate = moment(release_date, 'YYYY-MM-DD').format('DD-MM-YYYY');
    const totalRuntime = episodes * episode_runtime;
    
       const invoice = calculateCharges({
    content_type: content_type, 
    episodes: episodes,
    episode_runtime: episode_runtime,
    imdb_rating: imdb_rating,
    release_date: release_date
});
    let totalCharges= invoice.subtotal;
    let smst = invoice.smst;
    let totalWithTax= invoice.grandTotal;

    let finalPoster = poster;
    if (poster === "find") {
        const apiKey = "d738823c";
        const apiUrl = `http://www.omdbapi.com/?t=${name}&apikey=${apiKey}`;
        const response = await axios.get(apiUrl);
        finalPoster = response.data.Poster;
    } else if (poster === 'N/A') {
        finalPoster = "https://placehold.co/300x400.png?text=No+Poster";
    }
    
    // Add to database
    try {
        const existingEntry = await mdata.findOne({ name,  userId: new ObjectId(req.session.user.id)});
        
        if (!existingEntry) {   
            let today=moment().format('DD-MM-YYYY');         ``
            const mentry = {
                name,
                ep: episodes,
                rtime: episode_runtime,
                rating: imdb_rating,
                ctyp: content_type,
                date: formattedDate,
                trtime: totalRuntime,
                charge: totalCharges,
                smst,
                total_charges: totalWithTax,
                poster: finalPoster,
                bill_date: today,
                billed: false,
                userId: req.session.user.id
            };
            
            await mdata.insertOne(mentry);
            console.log(`entry of ${name} done`);
            
        }
        
        res.render('display', {
            name,
            content_type,
            episodes,
            episode_runtime,
            release_date: formattedDate,
            imdb_rating,
            total_charges: totalCharges,
            smst,
            total_with_tax: totalWithTax
        });
    } catch (error) {
        res.status(500).send(`Error: ${error.message}`);
    }
});

app.post('/download_pdf2',requireAuth, async (req, res) => {
    try {
        const { name, content_type, episodes, episode_runtime,  imdb_rating } = req.body;
        let {release_date}=req.body;
        release_date = moment(release_date,'DD-MM-YYYY' ).format('YYYY-MM-DD');
            const invoice = calculateCharges({
            content_type,
            episodes,
            episode_runtime,
            imdb_rating,
            release_date
        });
        release_date = moment(release_date, 'YYYY-MM-DD').format('DD-MM-YYYY');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(name)}_Invoice.pdf"`);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'");
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

        const doc = new PDFDocument({
            margin: 0,
            size: 'A4',
            layout: 'portrait',
            info: {
                Title: `${name} Invoice`,
                Author: 'Cinema Bill System'
            }
        });

        doc.pipe(res);

        renderHeader(doc);
        renderDivider(doc);
        renderDetailsCard(doc, { name, content_type, episode_runtime, release_date, imdb_rating,episodes });
        renderChargesTable(doc, invoice,content_type);
        renderFooter(doc);
        renderBorder(doc);

        doc.end();

    } catch (error) {
        console.error("PDF generation error:", error.message, error.stack);
        res.status(500).send("Failed to generate PDF.");
    }
});
app.get("/display",requireAuth, async (req, res) => {
    try {
         const userId = req.session.user.id;
         console.log(userId)
        const allData = await mdata.find({userId}).sort({ _id: 1 }).toArray();
        res.render("disp", { dt: allData });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.get("/show",requireAuth, async (req, res) => {
    try {
        const userId =req.session.user.id;
        data = await mdata.find({userId}).sort({ _id: 1 }).toArray();
        res.render("show", { data });
    } catch (error) {
        res.status(500).send(error.message);
    }
});


// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
