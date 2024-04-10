// start app with 'npm run dev' in a terminal window
// go to http://localhost:port/ to view your deployment!
// every time you change something in server.js and save, your deployment will automatically reload

// to exit, type 'ctrl + c', then press the enter key in a terminal window
// if you're prompted with 'terminate batch job (y/n)?', type 'y', then press the enter key in the same terminal

// standard modules, loaded from node_modules
const path = require('path');
require("dotenv").config({ path: path.join(process.env.HOME, '.cs304env')});
const express = require('express');
const morgan = require('morgan');
const serveStatic = require('serve-static');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const flash = require('express-flash');
const multer = require('multer');

// our modules loaded from cwd

const { Connection } = require('./connection');
const cs304 = require('./cs304');

// Create and configure the app

const app = express();

// Morgan reports the final status code of a request's response
app.use(morgan('tiny'));

app.use(cs304.logStartRequest);

// This handles POST data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cs304.logRequestData);  // tell the user about any request data
app.use(flash());


app.use(serveStatic('public'));
app.set('view engine', 'ejs');

const mongoUri = cs304.getMongoUri();

app.use(cookieSession({
    name: 'session',
    keys: ['horsebattery'],

    // Cookie Options
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// ================================================================
// custom routes here

//const DB = process.env.USER; // will this get newwithtags database?
const DB = 'newwithtags';
const POSTS = 'posts';
const LIKES = 'likes';
const USERS = 'users';

/**
 * 
 * @param {*} counters 
 * @param {*} key 
 * @returns 
 */
async function incrCounter(counters, key) {
    // this will update the document and return the document after the update
    let result = await counters.findOneAndUpdate({collection: key},
                                                 {$inc: {counter: 1}}, 
                                                 {returnDocument: "after"});
    return result.counter;
}

// Insert a new recipe into the database
app.post('/insert', async (req, res) => {
    let db = await Connection.open(mongoUri, DB)
    let counters = db.collection(COUNTERS);
    let newId = await incrCounter(counters, 'recipe');
    let recipes = db.collection(RECIPES);
    recipes.insert({rid: newId, name: req.body.name});
    return res.redirect('/');
});


// main page. This shows the use of session cookies
app.get('/', (req, res) => {
    let uid = req.session.uid || 'unknown';
    let visits = req.session.visits || 0;
    visits++;
    req.session.visits = visits;
    console.log('uid', uid);
    return res.render('index.ejs', {uid, visits});
});

app.get('/post-single', (req, res) => {
    return res.render('post-single.ejs');
});

app.get('/create', (req, res) => {
    return res.render('create.ejs');
});

app.post('/create', async (req, res) => {
    let postID = 1;
    let city = req.body.city;
    let tags = req.body.tags;
    let caption = req.body.description;
    let imageUpload = req.body.imageUpload;
    let date = '2024-09-24'; // make date object

    if (!city) {
        req.flash('error', "Missing Input: City is missing");
    } 

    const db = await Connection.open(mongoUri, DB);
    const posts = db.collection(POSTS);

    console.log(postID, city, tags, caption, imageUpload, date);
    
    // generate ID - counter? what scott talked about
    let insertPost = await posts.insertOne({postID: postID, 
                                            imageURL: imageUpload, 
                                            comments: [],
                                            tags: tags,
                                            city: city, 
                                            date: date,
                                            caption: caption});
    console.log("inserting post", insertPost);

    return res.render('create.ejs');
    
});

// shows how logins might work by setting a value in the session
// This is a conventional, non-Ajax, login, so it redirects to main page 
app.post('/set-uid/', (req, res) => {
    console.log('in set-uid');
    req.session.uid = req.body.uid;
    req.session.logged_in = true;
    res.redirect('/');
});

// shows how logins might work via Ajax
app.post('/set-uid-ajax/', (req, res) => {
    console.log(Object.keys(req.body));
    console.log(req.body);
    let uid = req.body.uid;
    if(!uid) {
        res.send({error: 'no uid'}, 400);
        return;
    }
    req.session.uid = req.body.uid;
    req.session.logged_in = true;
    console.log('logged in via ajax as ', req.body.uid);
    res.send({error: false});
});

// conventional non-Ajax logout, so redirects
app.post('/logout/', (req, res) => {
    console.log('in logout');
    req.session.uid = false;
    req.session.logged_in = false;
    res.redirect('/');
});

// two kinds of forms (GET and POST), both of which are pre-filled with data
// from previous request, including a SELECT menu. Everything but radio buttons

app.get('/form/', (req, res) => {
    console.log('get form');
    return res.render('form.ejs', {action: '/form/', data: req.query });
});

app.post('/form/', (req, res) => {
    console.log('post form');
    return res.render('form.ejs', {action: '/form/', data: req.body });
});


// ================================================================
// postlude

const serverPort = cs304.getPort(8080);

// this is last, because it never returns
app.listen(serverPort, function() {
    console.log(`open http://localhost:${serverPort}`);
});
