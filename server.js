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
const bcrypt = require('bcrypt');
const ROUNDS = 15;

// our modules loaded from cwd

const { Connection } = require('./connection');
const cs304 = require('./cs304');
const { devNull } = require('os');

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
app.use(serveStatic('assets'));

app.set('view engine', 'ejs');

const mongoUri = cs304.getMongoUri();

app.use(cookieSession({
    name: 'session',
    keys: ['horsebattery'],

    // Cookie Options
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// ================================================================
// database variables

const DB = 'newwithtags';
const POSTS = 'posts';
const LIKES = 'likes';
const USERS = 'users';
const COUNTERS = 'counters';


// ================================================================
// file upload functions and variables

/**
 * Returns formatted time as a string
 * @param {date object} dateObj 
 * @returns formatted time string 
 */
function timeString(dateObj) {
    if (!dateObj) {
        dateObj = new Date();
    };
    d2 = (val) => val < 10 ? '0'+val : ''+val;
    let hh = d2(dateObj.getHours());
    let mm = d2(dateObj.getMinutes());
    let ss = d2(dateObj.getSeconds());
    return hh+mm+ss;
}

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/assets/uploads/')
    },
    filename: function (req, file, cb) {
        let parts = file.originalname.split('.');
        let ext = parts[parts.length-1];
        let hhmmss = timeString();
        cb(null, file.fieldname + '-' + hhmmss + '.' + ext);
    }
});

var upload = multer({ storage: storage,
                    // max fileSize in bytes
                    limits: {fileSize: 100_000_000 }
});



// ================================================================
// helper functions

/**
 * Increases the counter document in the counters collection associated with the given key by 1.
 * @param {collection} counters 
 * @param {string} key 
 * @returns the document after the update
 */
async function incrCounter (counters, key) {
    let result = await counters.findOneAndUpdate({collection: key},
                                                 {$inc: {counter: 1}}, 
                                                 {returnDocument: "after"});
    return result.counter;
};

/**
 * Function to return the first n most popular cities and tags.
 * @returns an array of cities and an array of tags, both of length n.
 */
async function getNumCitiesAndTags(n) {
    let sortedCities = await sortCitiesByNumPosts();
    let sortedTags = await sortTagsByNumPosts(); 

    if (sortedCities.length > n) {
        sortedCities = sortedCities.slice(0,n);
    };
    if (sortedTags.length > n) {
        sortedTags = sortedTags.slice(0,n);
    };

    return [sortedCities, sortedTags];
};

/**
 * Function to sort all posts in database by likes in decreasing order
 * @returns an array of sorted posts
 */
async function sortPostsByLikes () {
    const db = await Connection.open(mongoUri, DB); // connects to newwithtags database
    const posts = db.collection(POSTS);
    let sortedPosts = await posts.aggregate([
        {
            $lookup: {
                from: "likes",
                localField: "postID",
                foreignField: "postID",
                as: "likes"
            }
        },
        {
            $addFields: {
                numLikes: { $size: "$likes" }
            }
        },
        {
            $sort: {numLikes: -1} // sort posts by num of likes in decr. order
        }
    ]).toArray();

    return sortedPosts;
};

/**
 * Function to sort all posts by date created, in descending order from most liked to least liked
 * @returns an array 
 */
async function sortPostsByNewest () {
    const db = await Connection.open(mongoUri, DB);
    const posts = db.collection(POSTS);
    
    let sortedPosts = await posts.aggregate([
        {
            $sort: {date: 1} // sort posts by num of likes in decr. order
        }
    ]).toArray();

    return sortedPosts;
};

/**
 * Function to sort all the cities used in the database by most used to least used. 
 * @returns an array of sorted cities and the number of times they're used.
 */
async function sortCitiesByNumPosts() {
    const db = await Connection.open(mongoUri, DB);
    const posts = db.collection(POSTS);

    let sortedCities = await posts.aggregate([
        {
            $group: {_id: "$city", count: {$sum: 1}}
        }, 
        {
            $sort: {count: -1}
        },
        {
            $project: {city: 1, count: 1}
        }
    ]).toArray();
    
    return sortedCities;
};

/**
 * Function to sort all the tags used in the database by most used to least used. 
 * @returns an array of sorted tags and the number of times they're used.
 */
async function sortTagsByNumPosts() {
    const db = await Connection.open(mongoUri, DB);
    const posts = db.collection(POSTS);

    let sortedTags = await posts.aggregate([
        {
            $unwind: "$tags"
        },
        {
            $group: {_id: "$tags", count: {$sum: 1}}
        }, 
        {
            $sort: {count: -1}
        },
        {
            $project: {tags: 1, count: 1}
        }
    ]).toArray();

    return sortedTags;
};

/**
 * Function to get the current date and time as a string in the format "YY-MM-DD HH-MM-SS"
 * @returns the current date and time as a formatted string
 */
function getDateAndTime() {
    let dateObj = new Date(); 
    let the_day = dateObj.getDate();
    let the_month = dateObj.getMonth() + 1; // Add 1 because Jan is 0, etc.
    let the_year = dateObj.getFullYear();

    let the_hour = dateObj.getHours();
    let the_minute = dateObj.getMinutes();
    let the_second = dateObj.getSeconds();

    let date = the_year + "-" + the_month + "-" + the_day + " " + the_hour + ":" + the_minute + ":" + the_second;
    return date;
};

// helper function to create a new user
async function insertUser (username, firstName, lastName, email, password) {
    const db = await Connection.open(mongoUri, DB);

    let dateObj = new Date(); 
    let the_day = dateObj.getDate();
    let the_month = dateObj.getMonth() + 1; // Add 1 because Jan is 0, etc.
    let the_year = dateObj.getFullYear();
    let date = the_year + "-" + the_month + "-" + the_day

    // insert if username does not exist
    let users = db.collection(USERS)
    await users.updateOne({
        userID: username
    }, 
    { $setOnInsert: {
        userID: username,
        userFirstName: firstName, 
        userLastName: lastName, 
        password: password,
        email: email, 
        dateCreated: date
    }}, 
    {upsert: true});
};



// ================================================================
// custom routes here

// Main page
app.get('/', async (req, res) => {
    let uid = req.session.uid || false;
    let logged_in = req.session.logged_in || false;
    let visits = req.session.visits || 0;
    visits++;
    req.session.visits = visits;
    console.log('uid', uid);

    let sortedPostsByLiked = await sortPostsByLikes();

    let [sortedCities, sortedTags] = await getNumCitiesAndTags(5);

    return res.render('index.ejs', {uid: uid, 
                                    logged_in: logged_in, 
                                    visits: visits, 
                                    posts: sortedPostsByLiked, 
                                    cities: sortedCities, 
                                    tags: sortedTags});
});

// 
app.get('/searchCity/', async(req, res) => {
    const cityTag = req.query.city.toLowerCase();

    const db = await Connection.open(mongoUri, DB);
    const postsDB = db.collection(POSTS);

    let findCity = await postsDB.find({city: cityTag}).toArray();

    if (findCity.length == 0){
        req.flash('error', "Sorry, this city does not exist.");
        return res.redirect('/');
    } else {
        let redirectURL = "/city/" + cityTag;
        res.redirect(redirectURL);
    };
});

// handles search city
app.get('/city/:city', async(req, res) => { 
    let city = req.params.city;
    const db = await Connection.open(mongoUri, DB); 
    const postsDB = db.collection(POSTS);

    let findCity = await postsDB.find({city: city}).toArray();

    if (findCity.length == 0){
        req.flash("error", "Sorry, this city does not exist.")
        return res.redirect('/');
    } else {
        let [sortedCities, sortedTags] = await getNumCitiesAndTags(5);
        
        return res.render('index.ejs', {uid: req.session.uid, 
                                        logged_in: req.session.logged_in,
                                        posts: findCity, 
                                        cities: sortedCities, 
                                        tags: sortedTags});
    }
});

//
app.get('/searchTags/', async(req, res) => {
    const styleTag = req.query.tags.toLowerCase();
    console.log(`you submitted ${styleTag}`);

    const db = await Connection.open(mongoUri, DB); 
    const postsDB = db.collection(POSTS);

    let findTag = await postsDB.find({tags: styleTag}).toArray();
    console.log(findTag);

    if (findTag.length == 0){
        req.flash("error", "Sorry, this tag does not exist.")
        return res.redirect('/');
    } else {
        let redirectURL = "/tag/" + styleTag;
        res.redirect(redirectURL);
    }
});

//handles search tag lookup 
app.get('/tag/:tag', async(req, res) => {
    const styleTag = req.params.tag;

    const db = await Connection.open(mongoUri, DB); 
    const postsDB = db.collection(POSTS);

    let findTag = await postsDB.find({tags: styleTag}).toArray();

    if (findTag.length == 0) {
        req.flash("error", "Sorry, this tag does not exist.")
        return res.redirect('/');
    } else {
        let [sortedCities, sortedTags] = await getNumCitiesAndTags(5);
        
        return res.render('index.ejs', {uid: req.session.uid, 
                                        logged_in: req.session.logged_in,
                                        posts: findTag, 
                                        cities: sortedCities, 
                                        tags: sortedTags});
    };
});

// get for /post-single
app.get('/post-single', (req, res) => {
    return res.render('post-single.ejs', {uid: req.session.uid, logged_in: req.session.logged_in});
});

// get for /post-single/:id for a specific post
app.get('/post-single/:id', async (req, res) => {
    const postID = parseInt(req.params.id);
    const db = await Connection.open(mongoUri, DB);
    const posts = db.collection(POSTS);

    let findPost = await posts.findOne({postID: postID}); 

    return res.render('post-single.ejs', {findPost, uid: req.session.uid, logged_in: req.session.logged_in});
});

//
app.get('/create', (req, res) => {
    if (req.session.logged_in == true) {
        return res.render('create.ejs', {uid: req.session.uid, logged_in: req.session.logged_in});
    } else {
        req.flash('error', "You are not logged in. Please log in to create a post.");
        return res.redirect("/");
    }
    
});

//
app.post('/create', upload.single('imageUpload'), async (req, res) => {
    const uid = req.session.uid;

    let db = await Connection.open(mongoUri, DB);
    let counters = db.collection(COUNTERS);

    let postID = await incrCounter(counters, POSTS);
    let posts = db.collection(POSTS);

    let city = req.body.city.toLowerCase();
    let tagsInitial = req.body.tags.split(" ");
    let caption = req.body.description;
    let imageUpload = '/assets/uploads/' + req.file.filename;

    console.log('file', req.file);

    let tagsWithHash = tagsInitial.filter((elt) => elt[0] == '#');
    let tags = tagsWithHash.map((elt) => {return elt.slice(1)});

    let date = getDateAndTime();
    
    let insertPost = await posts.insertOne({postID: postID, 
                                            imageURL: imageUpload, 
                                            comments: [],
                                            tags: tags,
                                            city: city, 
                                            date: date,
                                            caption: caption});

    if (insertPost.acknowledged) { // if succesfully inserted, redirect to the new post's post-single page
        console.log('succesfully inserted post');
        req.flash("info", "Successfully posted.");
        return res.redirect('/post-single/' + postID);
    } else {
        console.log('failed to insert post');
        req.flash("error", "Post failed. Please try again.");
        return res.redirect('/create');
    };
});

//
app.get('/profile', async (req, res) => {
    if (req.session.logged_in) {
        var db = await Connection.open(mongoUri, DB);
        const currentUser = await db.collection(USERS).findOne({userID: req.session.uid});
        console.log("CURRENT USER", currentUser);
        return res.render('profile.ejs', {user: currentUser, uid: req.session.uid, logged_in: req.session.logged_in});
    } else {
        req.flash('error', "Please log in to view your profile.");
        return res.redirect("/");
    };
});

//
app.post('/comment/:postID', async (req, res) => {
    if (req.session.logged_in) {
        let commentText = req.body.comment;
        let user = parseInt(req.session.uid);
        let postID = parseInt(req.params.postID);

        let date = getDateAndTime();

        let comment = {text: commentText, userID: user, date: date}
        
        let db = await Connection.open(mongoUri, DB);
        const posts = db.collection(POSTS);

        let addComment = await posts.updateOne(
            { postID: postID },
            { $push: { comments: comment } }
        );

        return res.redirect("/post-single/" + postID);
    } else {
        let postID = parseInt(req.params.postID);
        req.flash("error", "Error: Please log in to leave a comment."); 
        return res.redirect("/post-single/" + postID);
    }
});

// render login page 
app.get("/login", (req, res) => {
    return res.render("login.ejs", {uid: req.session.uid, logged_in: req.session.logged_in});
})

// process user login
app.post("/login", async (req, res) => {
    username = req.body.username;
    password = req.body.password;
    const db = await Connection.open(mongoUri, DB);
    let userdict = await db.collection(USERS).findOne({userID: username}, {projection: {password: 1}});
    let correctPassword = userdict.password;
    result = await bcrypt.compare(password, correctPassword);
    console.log('login status:', "\t", result);
    if (result == true) {
        console.log("succesful login for", username);
        req.session.uid = username;
        req.session.logged_in = true;
        req.flash("info", `Logged in as ` + username + '.');
        return res.redirect("/");
    } else {
        console.log("failed login for", username);
        req.session.uid = false;
        req.session.logged_in = false;
        req.flash("error", "Login failed. Check your username and password and try again.")
        return res.redirect("/login");
    }
});

// endpoint to create a new user
app.post("/join", async (req, res) => {
    let hash = await bcrypt.hash(req.body.password, ROUNDS);
    insertUser (
        req.body.username, 
        req.body.first, 
        req.body.last, 
        req.body.email, 
        hash); 
    console.log('signup/stored', "\t", hash);
    req.flash('info', 'Account created for ' + req.body.first + '. You are now logged in.');
    return res.redirect("/");
  });


// shows how logins might work via Ajax
// app.post('/set-uid-ajax/', (req, res) => {
//     console.log(Object.keys(req.body));
//     console.log(req.body);
//     let uid = req.body.uid;
//     if(!logged_in) {
//         res.send({error: 'no uid'}, 400);
//         return;
//     }
//     req.session.uid = req.body.uid;
//     req.session.logged_in = true;
//     console.log('logged in via ajax as ', req.body.uid);
//     res.send({error: false});
// });

// conventional non-Ajax logout, so redirects
app.post('/logout', (req, res) => {
    console.log('in logout');
    req.session.uid = false;
    req.session.logged_in = false;
    res.redirect('/');
});


// ================================================================
// postlude

const serverPort = cs304.getPort(8080);

// this is last, because it never returns
app.listen(serverPort, function() {
    console.log(`open http://localhost:${serverPort}`);
});
