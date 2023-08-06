const express = require('express');
const app = express();
const User = require('./models/user');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');

mongoose.connect('mongodb://localhost:27017/node', {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => {
        console.log("Connection Open!!")
    })
    .catch(err => {
        console.log("Oh no Error!!")
        console.log(err)
    })

app.set('view engine', 'ejs');
app.set('views', 'views');
app.use(express.urlencoded({
    extended: true
}));
app.use(session({
    secret: 'notagoodsecret',
    resave: true,
    saveUninitialized: true
}))

const requireLogin = (req, res, next) => {
    if (!req.session.user_id) {
        return res.redirect('/login')
    }
    next();
}


app.get('/home', (req, res) => {
    res.render('home')
})

app.get('/register', (req, res) => {
    res.render('register')
})

app.post('/register', async(req, res) => {
    const {
        password,
        username,
        fullName
    } = req.body;
    const hash = await bcrypt.hash(password, 12);
    const user = new User({
        username,
        password: hash,
        fullName
    })
    await user.save();
    req.session.user_id = user._id;
    res.redirect('/')
})

app.get('/login', (req, res) => {
    res.render('login')
})

app.post('/login', async(req, res) => {
    const {
        username,
        password
    } = req.body;
    const foundUser = await User.findAndValidate(username, password)
    if (foundUser) {
        req.session.user_id = foundUser._id;
        res.redirect('/secret');
    } else {
        res.redirect('/login');
    }
})

app.get('/logout', (req, res) => {
    req.session.user_id = null;
    res.redirect('http://localhost:3010/login');
})

app.get('/secret', requireLogin, (req, res) => {
    res.redirect('http://localhost:3004/')
})

app.get('/', (req, res) => {
    res.redirect('/login')
})

const port =  3010;
app.listen(port, () => {
    console.log(`Serving Your app on ${port} `);
})