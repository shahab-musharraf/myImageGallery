// external modules
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const ejs = require('ejs');
const multer = require('multer');
const mongoose = require('mongoose');

// inbuilt modules
const path = require('path');

// creating server
const app = express();

// telling to app to work on ejs extension files
app.set("view engine", "ejs");

// declaring middlewares
app.use(session({
    secret: "key",
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false
    }
}))

app.use(passport.initialize());
app.use(passport.session());

// connecting application to google auth
passport.use(new GoogleStrategy({
    clientID: "606917114564-ae8jrtq8opuiotgdi6l3bf9kjvetb8i4.apps.googleusercontent.com",
    clientSecret: "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",
    callbackURL: "http://localhost:3000/auth/google/callback"
}, function(accessToken, refreshToken, profile, cb){
    // mongoose save query
    cb(null, profile);
}));

passport.serializeUser(function(user, cb){
    cb(null, user);
});
passport.deserializeUser(function(obj, cb){
    cb(null, obj);
})

// again a middleware
app.use(express.static(path.join(__dirname, "public")))
app.use(express.urlencoded({extended: false}))

// connecting mongoose
mongoose.connect('mongodb://localhost:27017/image-gallery', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const imageSchema = new mongoose.Schema({
    email: String,
    image:{
        data: Buffer,
        contentType: String
    }
});
const Image = mongoose.model('Images', imageSchema);
const storage = multer.memoryStorage();
const upload = multer({storage: storage})



app.get('/login', (req,res)=>{
    res.render(path.join(__dirname, "login.ejs")) 
})

app.get('/home', (req, res) => {
    if(req.isAuthenticated()){
        res.render(path.join(__dirname, 'home.ejs'), {user: req.user});
    }
    else {
        res.redirect('/login')
    }
})

app.post('/upload',upload.single('image'), async (req, res)=> {
    try {
        const newImage = new Image({
            email: req.body.email,
            image: {
                data: req.file.buffer,
                contentType: req.file.mimetype
            }
        })
        await newImage.save();
        res.status(201).redirect('/gallery')
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
})

app.get('/gallery', async (req, res)=> {
    
    if(req.isAuthenticated()){
        const images = await Image.find({email: req.user.emails[0].value})
        res.render(path.join(__dirname, 'gallery.ejs'), {user: req.user, images: images});
    }
    else {
        res.redirect('/login')
    }
})

app.get('/auth/google', passport.authenticate("google", {
    scope: ["profile", "email"]
}))

app.get('/auth/google/callback', passport.authenticate("google", {failureRedirect: '/login'}), async (req,res)=>{
    res.redirect('/home')
})

app.get('/logout', (req, res)=>{
    req.logout(function(err){
        if(err){
            console.log(err);
        }
        else {
            res.redirect('/login');
        }
    })
})


app.listen(3000, ()=>{
    console.log(`Server is listening on port ${3000}`)
})