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
// custom routes here

const DB = 'newwithtags';
const POSTS = 'posts';
const LIKES = 'likes';
const USERS = 'users';
const COUNTERS = 'counters';


// file upload

/**
 * 
 * @param {*} dateObj 
 * @returns 
 */
function timeString(dateObj) {
    if( !dateObj) {
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
    //console.log(result);
    return result.counter;
}

app.get('/searchCity/', async(req, res) => {
    const cityTag = req.query.city;
    console.log(cityTag);

    const db = await Connection.open(mongoUri, DB);
    const postsDB = db.collection(POSTS);

    let findCity = await postsDB.find({city: cityTag}).toArray();
    console.log(findCity);

    if (findCity.length == 0){
        req.flash('error', "Sorry, this city does not exist.");
        return res.redirect('/');
    } else {
        let redirectURL = "/city/" + cityTag;
        res.redirect(redirectURL);
    };
});


/**
 * handles search city lookup
 */
app.get('/city/:city', async(req, res) => { // CHANGE BACK
    const cityTag = req.params.city;
    console.log('hello');
    console.log(`PRINT: ${req}`)
    console.log(`you submitted ${cityTag}`);
    const db = await Connection.open(mongoUri, DB); // connects to newwithtags database
    const postsDB = db.collection(POSTS);

    let findCity = await postsDB.find({city: cityTag}).toArray();
    console.log(findCity);
    if (findCity.length == 0){
        return res.render('search.ejs', {searchError: "Sorry, this city does not exist."});
    } else {
        // let imageOut = findCity[0].imageURL;
        // let pID = findCity[0].postId;

        return res.render('search.ejs', {posts: findCity});
    }
});

app.get('/searchTags/', async(req, res) => {
    const styleTag = req.query.tags;
    console.log(`you submitted ${styleTag}`);

    const db = await Connection.open(mongoUri, "newwithtags"); // connects to newwithtags database
    const postsDB = db.collection(POSTS);

    let findTag = await postsDB.find({tags: styleTag}).toArray();
    console.log(findTag);

    if (findTag.length == 0){
    return res.render('search.ejs', {searchError: "Sorry, this city does not exist."});

    } else {
        let noHash = styleTag.split("#")[1];
        let redirectURL = "/tag/" + noHash;
        res.redirect(redirectURL);
    }
});


/**
 * handles search tag lookup
 */
app.get('/tag/:tags', async(req, res) => {
    const styleTag = "#" + req.params.tags;
    console.log(styleTag);

    const db = await Connection.open(mongoUri, "newwithtags"); // connects to newwithtags database
    const postsDB = db.collection(POSTS);

    let findTag = await postsDB.find({tags: styleTag}).toArray();
    // let findTag = await postsDB.aggregate([
    //     {$group: {_id: "$city"}}
    // ]).toArray();
    console.log(findTag);

    if (findTag.length == 0){
        return res.render('search.ejs', {searchError: "Sorry, this tag does not exist."});
    } else {
        // let imageOut = findCity[0].imageURL;
        // let pID = findCity[0].postId;
        
        return res.render('search.ejs', {posts: findTag});
    }
})

/**
 * 
 * @returns 
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
 * @returns 
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
    const likes = db.collection(LIKES);

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
 * Gets the current date and time as a string in the format "YY-MM-DD HH-MM-SS"
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
}

// main page. This shows the use of session cookies
app.get('/', async (req, res) => {
    let uid = req.session.uid || 'unknown';
    let visits = req.session.visits || 0;
    visits++;
    req.session.visits = visits;
    console.log('uid', uid);

    let sortedPostsByLiked = await sortPostsByLikes();
    let sortedPostsByNewest = await sortPostsByNewest();
    let sortedCities = await sortCitiesByNumPosts();
    let sortedTags = await sortTagsByNumPosts(); 

    /* console.log(sortedPostsByLiked);
    console.log(sortedPostsByNewest);
    console.log(sortedCities);
    console.log(sortedTags); */
    

    if (sortedCities.length > 5) {
        sortedCities = sortedCities.slice(0,5);
    };
    if (sortedTags.length > 5) {
        sortedTags = sortedTags.slice(0,5);
    };

    return res.render('index.ejs', {uid, visits, posts: sortedPostsByLiked, 
                                    cities: sortedCities, 
                                    tags: sortedTags});
});

app.get('/post-single', (req, res) => {
    return res.render('post-single.ejs');
});

app.get('/post-single/:id', async (req, res) => {
    const postID = parseInt(req.params.id);
    //console.log(postID);
    const db = await Connection.open(mongoUri, DB);
    const posts = db.collection(POSTS);

    let findPost = await posts.findOne({postID: postID}); 
    //console.log(findPost);

    return res.render('post-single.ejs', {findPost});
});

app.get('/create', (req, res) => {
    return res.render('create.ejs');
});

app.post('/create', upload.single('imageUpload'), async (req, res) => {
    const uid = req.session.uid;
    console.log("entered post for create")

    if (!uid) {
        req.flash('info', "You are not logged in");
        return res.redirect('/login');
    };

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

    //console.log(postID, city, tags, caption, imageUpload, date);
    
    let insertPost = await posts.insertOne({postID: postID, 
                                            imageURL: imageUpload, 
                                            comments: [],
                                            tags: tags,
                                            city: city, 
                                            date: date,
                                            caption: caption});

    console.log("inserting post", insertPost);

    //return res.sendFile(path.join(__dirname, pathname));
    return res.render('create.ejs');
    
});

app.get('/profile', (req, res) => {
    return res.render('profile.ejs');
});

app.post('/comment/:postID', async (req, res) => {
    let commentText = req.body.comment;
    let user = parseInt(req.session.uid);
    let postID = parseInt(req.params.postID);
    //console.log(postID);

    let date = getDateAndTime();

    let comment = {text: commentText, userID: user, date: date}
    
    //console.log(comment);

    let db = await Connection.open(mongoUri, DB);
    const posts = db.collection(POSTS);

    let addComment = await posts.updateOne(
        { postID: postID },
        { $push: { comments: comment } }
    );

    //console.log("successfully added comment?:", addComment)

    return res.redirect("/post-single/" + postID);
});

// render login page 
app.get("/login", (req, res) => {
    return res.render("login.ejs", {});
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
        return res.redirect("/")
    } else {
        console.log("failed login for", username);
        // todo: flash error
        return res.redirect("/")
    }
});

// helper function to create a new user
async function insertUser(username, firstName, lastName, email, password){
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
}

// endpoint to create a new user
app.post("/join", async (req, res) => {
    let hash = await bcrypt.hash(req.body.password, ROUNDS);
    insertUser(
        req.body.username, 
        req.body.first, 
        req.body.last, 
        req.body.email, 
        hash); 
    console.log('signup/stored', "\t", hash);
    return res.render("login.ejs", {});
  });



/**
 * 
 * @param {*} viewerId 
 * @param {*} ownerId 
 * @returns 
 */
function isAuthorizedToView(viewerId, ownerId) {
    console.log('auth?', viewerId, ownerId);
    return viewerId === ownerId;
};

// the photos of the logged-in user

/* app.get('/myphotos', async (req, res) => {
    const db = await Connection.open(mongoUri, DB);
    const fileCol = db.collection(FILES);
    const uid = req.session.uid;
    console.log(uid);
    if (!uid) {
        console.log("not logged in");
        req.flash('info', "You are not logged in");
        return res.redirect('/login');
    }
    const uploads = await db.collection(FILES).find({owner: username}).toArray();
    const users = await db.collection(USERS).find({}).toArray();
    //const userId = req.session.userId;
    //return res.render('auth.ejs', {username, userId, users, uploads});
}); */

// The :username in the URL (endpoint) is the username of the person
// whose photos we want to view.

/* app.get('/photos/:username', async (req, res) => {
    const photoOwner = req.params.username; // username of owner of photos
    const username = req.session.username;   // 
    if (!username) {
        console.log("not logged in");
        req.flash('info', "You are not logged in");
        return res.redirect('/login');
    }
    if (!isAuthorizedToView(username, photoOwner)) {
        console.log("not authorized");
        req.flash('info', "You are not allowed to view this person's photos")
        // send them to the main page
        return res.redirect('/')
    }
    // database lookup
    const db = await Connection.open(mongoUri, DB);
    const fileCol = db.collection(FILES);
    const uploads = await db.collection(FILES).find({owner: photoOwner}).toArray();
    const users = await db.collection(USERS).find({}).toArray();
    const userId = req.session.userId;
    return res.render('auth.ejs', {username, userId, users, uploads});
}); */




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
