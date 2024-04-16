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
const { add } = require('lodash');

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
    console.log(result);
    return result.counter;
}

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
    if (findCity.length == 0){
        return res.render('search.ejs', {searchError: "Sorry, this city does not exist."});
    } else {
        let imageOut = findCity[0].imageURL;
        let pID = findCity[0].postId;

        let redirectURL = "/city/" + cityTag;
        res.redirect(redirectURL);

        return res.render('search.ejs', {imageLoad: imageOut, id: pID});
    }
});


/**
 * handles search tag lookup
 */
app.get('/tag/:tags', async(req, res) => {
    const styleTag = req.params.tags;
    const db = await Connection.open(mongoUri, "newwithtags");
    const postsDB = db.collection(POSTS);

    let findTag = await postsDB.find({tags: styleTag}).toArray(); // need to check what styleTag looks like to edit find()

    return res.render();
})

/**
 * Function to sort all posts by likes, in descending order from most liked to least liked
 */
async function sortPostsByLikes () {
    const db = await Connection.open(mongoUri, DB);
    const posts = db.collection(POSTS);
    const likes = db.collection(LIKES);
    
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

    console.log(sortedPostsByLiked);
    console.log(sortedPostsByNewest);
    console.log(sortedCities);
    console.log(sortedTags);
    

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
    console.log(postID);
    const db = await Connection.open(mongoUri, DB);
    const posts = db.collection(POSTS);

    let findPost = await posts.findOne({postID: postID}); 
    console.log(findPost);

    return res.render('post-single.ejs', {findPost});
});

app.get('/create', (req, res) => {
    return res.render('create.ejs');
});

app.post('/create', async (req, res) => {
    let db = await Connection.open(mongoUri, DB);
    let counters = db.collection(COUNTERS);

    let postID = await incrCounter(counters, POSTS);
    let posts = db.collection(POSTS);

    let city = req.body.citytoLowerCase();
    let tags = req.body.tags.split(" ");
    let caption = req.body.description;
    let imageUpload = req.body.imageUpload;

    // do date and time
    let dateObj = new Date(); 
    let the_day = dateObj.getDate();
    let the_month = dateObj.getMonth() + 1; // Add 1 because Jan is 0, etc.
    let the_year = dateObj.getFullYear();

    let the_hour = dateObj.getHours();
    let the_minute = dateObj.getMinutes();
    let the_second = dateObj.getSeconds();

    let date = the_year + "-" + the_month + "-" + the_day + " " + the_hour + ":" + the_minute + ":" + the_second;

    console.log(postID, city, tags, caption, imageUpload, date);
    
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

app.get('/profile', (req, res) => {
    return res.render('profile.ejs');
});

app.post('/comment/:postID', async (req, res) => {
    let commentText = req.body.comment;
    let user = parseInt(req.session.uid);
    let postID = parseInt(req.params.postID);
    console.log(postID);

    let date = getDateAndTime();

    let comment = {text: commentText, userID: user, date: date}
    
    console.log(comment);

    let db = await Connection.open(mongoUri, DB);
    const posts = db.collection(POSTS);

    let addComment = await posts.updateOne(
        { postID: postID },
        { $push: { comments: comment } }
    );

    console.log("successfully added comment?:", addComment)

    return res.redirect("/post-single/" + postID);
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
