// start app with 'npm run dev' in a terminal window
// go to http://localhost:port/ to view your deployment!
// every time you change something in server.js and save, your deployment will automatically reload

// to exit, type 'ctrl + c', then press the enter key in a terminal window
// if you're prompted with 'terminate batch job (y/n)?', type 'y', then press the enter key in the same terminal

// standard modules, loaded from node_modules
const path = require('path');
require("dotenv").config({ path: path.join(process.env.HOME, '.cs304env') });
const express = require('express');
const morgan = require('morgan');
const serveStatic = require('serve-static');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const flash = require('express-flash');
const multer = require('multer');
const bcrypt = require('bcrypt');
const ROUNDS = 15;
const fs = require('node:fs/promises');

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

const CITIES = ['wellesley', 'boston', 'tokyo', 'jakarta', 'delhi', 'mumbai', 'shanghai',
    'são paulo', 'seoul', 'mexico city', 'cairo', 'new york city', 'beijing',
    'bangkok', 'moscow', 'buenos aires', 'lagos', 'istanbul', 'milan',
    'bangalore', 'osaka', 'chengdu', 'tehran', 'rio de jane', 'toronto', 'athens',
    'chennai', 'los angeles', 'london', 'paris', 'rome', 'prague', 'sydney', 'lima',
    'wuhan', 'nanyang', 'hangzhou', 'amsterdam', 'dubai', 'dublin', 'stockholm', 'cairo',
    'nagoya', 'taipei', 'berlin', 'washington D.C.', 'vienna', 'lisbon', 'edinburgh',
    'chicago', 'nanjing', 'fuyang', 'montreal', 'vilnius', 'frankfurt', 'vancouver',
    'johannesburg', 'bogotá', 'melbourne', 'venice', 'hong kong', 'santiago', 'las vegas', 
    'madrid', 'baghdad', 'singapore', 'san francisco', 'honolulu', 'munich',
    'houston', 'barcelona', 'copenhagen', 'miami'];

const numButtons = 5;

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
    d2 = (val) => val < 10 ? '0' + val : '' + val;
    let hh = d2(dateObj.getHours());
    let mm = d2(dateObj.getMinutes());
    let ss = d2(dateObj.getSeconds());
    return hh + mm + ss;
}

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/assets/uploads/')
    },
    filename: function (req, file, cb) {
        let parts = file.originalname.split('.');
        let ext = parts[parts.length - 1];
        let hhmmss = timeString();
        cb(null, file.fieldname + '-' + hhmmss + '.' + ext);
    }
});

var upload = multer({
    storage: storage,
    // max fileSize in bytes
    limits: { fileSize: 100_000_000 }
});

// ================================================================
// helper functions

/**
 * Increases the counter document in the counters collection 
 * associated with the given key by 1.
 * @param {collection} counters 
 * @param {string} key 
 * @returns the document after the update
 */
async function incrCounter(counters, key) {
    let result = await counters.findOneAndUpdate({ collection: key },
        { $inc: { counter: 1 } },
        { returnDocument: "after" });
    return result.counter;
};

/**
 * Function to return the first n most popular cities and tags.
 * @returns an array of cities and an array of tags, both of length n.
 */
async function getNumCitiesAndTags(n) {
    let sortedCities = await sortCitiesByNumPosts(n);
    let sortedTags = await sortTagsByNumPosts(n);

    console.log("sortedCities", sortedCities)
    console.log("sortedTags", sortedTags)

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
            $sort: {date: -1} // sort posts by num of likes in decr. order
        }
    ]).toArray();

    return sortedPosts;
};

/**
 * Function to sort all the cities that are both used and not 
 * used in the database by most used to least used. 
 * @returns an array of sorted cities as strings
 */
async function sortCitiesByNumPosts(n) {
    const db = await Connection.open(mongoUri, DB);
    const posts = db.collection(POSTS);

    let sortedCityDicts = await posts.aggregate([
        {
            $group: { _id: "$city", count: { $sum: 1 } }
        },
        {
            $sort: { count: -1 }
        },
        {
            $project: { city: 1 }
        }
    ]).toArray();

    let sortedPresentCities = [];

    sortedCityDicts.forEach((elt) => {
        sortedPresentCities.push(elt._id);
    });

    let absentCities = CITIES.filter((elt) => {
        return !sortedPresentCities.includes(elt);
    });

    let sortedCities = sortedPresentCities.concat(absentCities);

    return capitalizeCities(sortedCities.slice(0, n));
};

/**
 * Function to sort all the tags used in the database by most used to least used. 
 * @returns an array of sorted tags and the number of times they're used.
 */
async function sortTagsByNumPosts(n) {
    const db = await Connection.open(mongoUri, DB);
    const posts = db.collection(POSTS);

    let sortedTagDicts = await posts.aggregate([
        {
            $unwind: "$tags"
        },
        {
            $group: { _id: "$tags", count: { $sum: 1 } }
        },
        {
            $sort: { count: -1 }
        },
        {
            $project: { tags: 1, count: 1 }
        }
    ]).limit(n).toArray();

    let sortedTags = [];
    sortedTagDicts.forEach((elt) => {
        sortedTags.push(elt._id);
    });

    return sortedTags;
};

/**
 * Function to capitalize all words in a single city string
 * @param {string} city 
 * @returns properly-capitalized string city
 */
function capitalizeCity(city) {
    let words = city.split(' ');
    newWords = words.map((word) => { 
        return word.charAt(0).toUpperCase() + word.slice(1) 
    });
    return newWords.join(' ');
}

/**
 * Function to capitalize all words in all cities in an array 
 * @param {array} cities 
 * @returns a new array of newly-capitalized cities
 */
function capitalizeCities(cities) {
    let capitalizedCities = [];
    cities.forEach((city) => {
        capitalizedCities.push(capitalizeCity(city));
    });

    return capitalizedCities;
}

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
async function insertUser(username, firstName, lastName, email, password) {
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
        {
            $setOnInsert: {
                userID: username,
                userFirstName: firstName,
                userLastName: lastName,
                password: password,
                email: email,
                dateCreated: date
            }
        },
        { upsert: true });
};


// ================================================================
// custom routes here

// Main page
app.get('/', async (req, res) => {
    let uid = req.session.uid || false;
    let logged_in = req.session.logged_in || false;
    console.log('uid', uid);

    let sortedPostsByLiked = await sortPostsByLikes();

    let [sortedCities, sortedTags] = await getNumCitiesAndTags(numButtons);

    let capitalizedSortedCities = capitalizeCities(sortedCities);
    console.log("capitalizedSortedCities", capitalizedSortedCities)

    return res.render('index.ejs', {
        uid: uid,
        logged_in: logged_in,
        posts: sortedPostsByLiked,
        cities: capitalizedSortedCities,
        tags: sortedTags
    });
});

/**
 * Action Get from Search Bar Form for Filtering Tags or Cities
 * Redirects URL to filters image gallery with certain tags/cities, 
 * Flashes error message if none found.
 */
app.get('/search/', async (req, res) => {
    const search = req.query.search;

    // Handles Error when Search is null or undefined
    if (!search) {
        console.log("Search is missing from query string; ignoring this request to /search");
        return res.redirect('/');
    };

    const searched = search.toLowerCase();
    const db = await Connection.open(mongoUri, DB);
    const postsDB = db.collection(POSTS);

    // Recognizes if search contained multiple items
    if (searched.includes(",")) {
        console.log("You are searching multiple tags!")
        var searchList = searched.split(",");

        if (searchList[0].includes("#")) { //filters multiple tags
            var tagList = [];
            searchList.forEach((elt) => {
                tagList.push(elt.split("#")[1])
            })

            let findTags = await postsDB.find({ tags: { $in: tagList } }).toArray();

            if (findTags.length == 0) {
                req.flash("error", "Sorry, these tags do not exist.")
                return res.redirect('/');
            } else {
                let [sortedCities, sortedTags] = await getNumCitiesAndTags(numButtons);

                return res.render('index.ejs', {
                    uid: req.session.uid,
                    logged_in: req.session.logged_in,
                    posts: findTags,
                    cities: sortedCities,
                    tags: sortedTags
                });
            }
        } else {
            console.log("You are searching a city and tags!")
            const searchedCity = searchList[0].toLowerCase();

            var tagList = [];
            var restSearch = searchList.slice(1);
            restSearch.forEach((elt) => {
                tagList.push(elt.split("#")[1])
            })

            // Look ups posts that have city and tags of either in tagList
            let findPosts = await postsDB.find(
                { $and: [{ city: searchedCity }, { tags: { $in: tagList } }] }
            ).toArray();

            if (findPosts.length == 0) {
                req.flash("error", "Sorry, these tags do not exist.")
                return res.redirect('/');
            } else {
                let [sortedCities, sortedTags] = await getNumCitiesAndTags(numButtons);

                return res.render('index.ejs', {
                    uid: req.session.uid,
                    logged_in: req.session.logged_in,
                    posts: findPosts,
                    cities: sortedCities,
                    tags: sortedTags
                });
            }
        }
    }

    // Handles individual searches of city or tag
    if (searched.charAt(0) == "#") {
        console.log(`You submitted ${searched}`);
        const styleTag = searched.split("#")[1];

        let findTag = await postsDB.find({ tags: styleTag }).toArray();

        if (findTag.length == 0) {
            req.flash("error", "Sorry, this tag does not exist.")
            return res.redirect('/');
        } else {
            let redirectURL = "/tag/" + styleTag;
            res.redirect(redirectURL);
        }
    } else {
        console.log(`You submitted ${searched}`);

        let findCity = await postsDB.find({ city: searched }).toArray();

        if (findCity.length == 0) {
            req.flash('error', "Sorry, this city does not exist.");
            return res.redirect('/');
        } else {
            let redirectURL = "/city/" + searched;
            res.redirect(redirectURL);
        };
    }
});

/**
 * Renders Filtered Image City Gallery
 * Recalculates the top 5 cities when rendered
 */
app.get('/city/:city', async (req, res) => {
    let city = req.params.city.toLowerCase();
    const db = await Connection.open(mongoUri, DB);
    const postsDB = db.collection(POSTS);

    let findCity = await postsDB.find({ city: city }).toArray();

    if (findCity.length == 0) {
        req.flash("error", "Sorry, this city does not exist.")
        return res.redirect('/');
    } else {
        let [sortedCities, sortedTags] = await getNumCitiesAndTags(numButtons);

        return res.render('index.ejs', {
            uid: req.session.uid,
            logged_in: req.session.logged_in,
            posts: findCity,
            cities: sortedCities,
            tags: sortedTags
        });
    }
});

/**
 * Renders Filtered Tagged Image Gallery
 * Recalculates the top 5 tags when rendered
 * have it be query string instead of limiting to one tag
 */
app.get('/tag/:tag', async (req, res) => {
    const styleTag = req.params.tag;

    const db = await Connection.open(mongoUri, DB);
    const postsDB = db.collection(POSTS);

    let findTag = await postsDB.find({ tags: styleTag }).toArray();

    if (findTag.length == 0) {
        req.flash("error", "Sorry, this tag does not exist.")
        return res.redirect('/');
    } else {
        let [sortedCities, sortedTags] = await getNumCitiesAndTags(numButtons);

        return res.render('index.ejs', {
            uid: req.session.uid,
            logged_in: req.session.logged_in,
            posts: findTag,
            cities: sortedCities,
            tags: sortedTags
        });
    };
});

// Get to sort posts on the home page by either newest or most liked.
app.get('/sort', async (req,res) => {
    let sortBy = req.query.sortBy;
    console.log(sortBy);

    let uid = req.session.uid || false;
    let logged_in = req.session.logged_in || false;
    console.log('uid', uid);

    let [sortedCities, sortedTags] = await getNumCitiesAndTags(numButtons);

    // Sort by Newest
    if (sortBy == "Newest") {
        console.log('newest');
        let sortedPostsByNewest = await sortPostsByNewest();

        return res.render('index.ejs', {uid: uid, 
                                        logged_in: logged_in, 
                                        posts: sortedPostsByNewest, 
                                        cities: sortedCities, 
                                        tags: sortedTags});
    // Sort by Liked
    } else if (sortBy == "Liked") {
        console.log('liked');
        let sortedPostsByLiked = await sortPostsByLikes();
        return res.render('index.ejs', {uid: uid, 
                                        logged_in: logged_in, 
                                        posts: sortedPostsByLiked, 
                                        cities: sortedCities, 
                                        tags: sortedTags});
    } else {
        req.flash("error", "Please select a sorting method.");
        return res.redirect('/');
    };
}); 

// get for /post-single/:id for a specific post
app.get('/post-single/:id', async (req, res) => {
    const postID = parseInt(req.params.id);
    const db = await Connection.open(mongoUri, DB);
    const posts = db.collection(POSTS);

    let findPost = await posts.findOne({ postID: postID });

    // calculate the number of likes
    const likes = db.collection(LIKES);
    var matched = await likes.find({ postID: postID }).toArray();
    var numLikes = matched.length

    let likeString = "Likes";
    if (numLikes == 1) {
        likeString = "Like";
    };

    let uid = req.session.uid || false;
    let logged_in = req.session.logged_in || false;
    console.log("CURRENT LOGIN: ", uid, logged_in)

    if (logged_in) {
        // check if this user has already liked the post 
        var alreadyLiked = true;
        var userLiked = await likes.findOne({ postID: postID, userID: uid, });
        if (userLiked == null) {
            // if the current user has not liked the post, it is not alreadyLiked
            alreadyLiked = false;
        }
    } else {
        alreadyLiked = false;
    }

    return res.render('post-single.ejs', {
        findPost,
        uid: uid,
        logged_in: logged_in,
        postID: postID,
        numLikes: numLikes,
        likeString: likeString,
        alreadyLiked: alreadyLiked,
        capitalizeCity: capitalizeCity
    });
});

// Ajax route to like a post. Returns a json to update the page.
app.post('/likeAjax/:id', async (req,res) => {
    var uid = req.session.uid || false;
    var logged_in = req.session.logged_in || false;
    var postID = parseInt(req.params.id);
    if (!logged_in) {
        return res.json({error: true, action: "error"});
    } else {
        var numLikes = await likePost(uid, postID);
        return res.json({error: false, likes: numLikes, postID: postID, uid: uid, action: "like"});
    }
});

/* Asynchronous helper function to update the database with a new like */
async function likePost(uid, postID) {
    const db = await Connection.open(mongoUri, DB);
    const likeDoc = await db.collection(LIKES).insertOne(
        { postID: postID, userID: uid },
        { upsert: false });
    console.log("User with ID", uid, "liked post with ID", postID);
    console.log(likeDoc);
    
    var matched = await db.collection(LIKES).find({ postID: postID }).toArray();
    var numLikes = matched.length;
    return numLikes;
}

// Ajax route to unlike a post. Returns a json to update the page.
app.post('/unlikeAjax/:id', async (req,res) => {
    var uid = req.session.uid || false;
    var logged_in = req.session.logged_in || false;
    var postID = parseInt(req.params.id);
    if (!logged_in) {
        return res.json({error: true, action: "error"});
    } else {
        var numLikes = await unlikePost(uid, postID);
        return res.json({error: false, likes: numLikes, postID: postID, uid: uid, action: "unlike"});
    }
});

/* Asynchronous helper function to delete a like from the database */
async function unlikePost(uid, postID) {
    const db = await Connection.open(mongoUri, DB);
    var unlikeDoc = await db.collection(LIKES).deleteOne(
        { postID: postID, userID: uid });
    console.log("User with ID", uid, "unliked post with ID", postID);
    console.log(unlikeDoc);

    var matched = await db.collection(LIKES).find({ postID: postID }).toArray();
    var numLikes = matched.length;
    return numLikes;
}

/**
 * Renders the create page to make a new post. 
 * If the user is not logged in, redirects to the home and flashes an error message. 
 */
app.get('/create', async (req, res) => {
    if (req.session.logged_in == true) {
        let sortedCities = await sortCitiesByNumPosts(CITIES.length);
        console.log(sortedCities)
        return res.render('create.ejs', {
            uid: req.session.uid,
            logged_in: req.session.logged_in,
            cityList: sortedCities
        });
    } else {
        req.flash('error', "You are not logged in. Please log in to create a post.");
        return res.redirect("/login");
    };
});

/**
 * Post request to update the database with a new post created with the create page. 
 * Handles file upload and flashes an error if the upload fails. 
 */
app.post('/create', upload.single('imageUpload'), async (req, res) => {
    const uid = req.session.uid;

    let db = await Connection.open(mongoUri, DB);
    let counters = db.collection(COUNTERS);

    let postID = await incrCounter(counters, POSTS);
    let posts = db.collection(POSTS);

    let city = req.body.city.toLowerCase();
    console.log(req.body)
    console.log(city)
    let tagsInitial = req.body.tags.split(" ");
    let description = req.body.description;
    console.log("description", description)
    let alttext = req.body.alttext;
    let imageUpload = './public/assets/uploads/' + req.file.filename;

    // change the permissions of the file to be world-readable
    let val = await fs.chmod(imageUpload, 0o664);
    console.log('chmod val', val);

    console.log('file', req.file);

    // filter out any tags that don't start with # or are just #
    let tagsWithHash = tagsInitial.filter((elt) => elt[0] == '#' && elt != '#');

    // find all the unique tags
    let uniqueTags = [];
    tagsWithHash.forEach((elt) => {
        if (!uniqueTags.includes(elt)) {
            uniqueTags.push(elt);
        };
    });

    // get rid of # in front of tags
    let tags = uniqueTags.map((elt) => { return elt.slice(1) });

    let date = getDateAndTime();

    let insertPost = await posts.insertOne({
        postID: postID,
        userID: uid,
        imageURL: "../assets/uploads/" + req.file.filename,
        comments: [],
        tags: tags,
        city: city,
        date: date,
        caption: description,
        alttext: alttext
    });
    console.log(insertPost);

    if (insertPost.acknowledged) { // if successfully inserted, redirect to the new post's post-single page
        console.log('successfully inserted post');
        req.flash("info", "Successfully posted.");
        return res.redirect('/post-single/' + postID);
    } else {
        console.log('failed to insert post');
        req.flash("error", "Post failed. Please try again.");
        return res.redirect('/create');
    };
});

// Get for /edit/:id to render the edit page.
app.get('/edit/:id', async (req, res) => {
    let postID = parseInt(req.params.id);

    let db = await Connection.open(mongoUri, DB);
    let posts = db.collection(POSTS);

    let post = await posts.findOne({ postID: postID });
    let sortedCities = await sortCitiesByNumPosts(CITIES.length);

    if (req.session.logged_in == true && req.session.uid == post.userID) {
        return res.render('edit.ejs', {
            uid: req.session.uid,
            logged_in: req.session.logged_in,
            cityList: sortedCities,
            post: post
        });
    } else {
        if (req.session.logged_in != true) {
            req.flash('error', "You are not logged in. Please log in to edit this post.");
            return res.redirect("/login");
        } else if (req.session.uid != post.userID) {
            req.flash('error', "You do not have permission to edit this post.");
            return res.redirect("/");
        };
    };
});

// Post for /edit/:id to get form data and actually edit the post.
app.post('/edit/:id', async (req, res) => {
    const postID = parseInt(req.params.id);

    let db = await Connection.open(mongoUri, DB);
    let posts = db.collection(POSTS);

    let oldPost = await posts.findOne({ postID: postID });

    if (!oldPost) {
        req.flash('error', 'Post not found.');
        res.redirect('/');
    };

    let city = req.body.city.toLowerCase();
    let tagsInitial = req.body.tags.split(" ");
    let caption = req.body.description;

    let tagsWithHash = tagsInitial.filter((elt) => elt[0] == '#' && elt != '#');
    let tagsWithoutHash = tagsWithHash.map((elt) => { return elt.slice(1) });
    let tags = [];

    tagsWithoutHash.forEach((elt) => { // get rid of duplicate tags
        if (!tags.includes(elt)) {
            tags.push(elt);
        };
    });

    let editPost = await posts.updateOne({ postID: postID },
        {
            $set: {
                tags: tags,
                city: city,
                caption: caption
            }
        });

    if (editPost.acknowledged) { 
        // if successfully edited, redirect to the new post's post-single page
        req.flash("info", "Successfully edited.");
        return res.redirect('/post-single/' + postID);
    } else {
        req.flash("error", "Edit failed. Please try again.");
        return res.redirect('/edit/' + postID);
    };
});

/* Confirmation page to delete a post */
app.get("/delete/:id", async (req, res) => {
    const db = await Connection.open(mongoUri, DB);
    var post = await db.collection(POSTS).findOne({ postID: parseInt(req.params.id) });
    console.log(post);
    return res.render('delete.ejs', {
        uid: req.session.uid,
        logged_in: req.session.logged_in,
        post: post
    })
})

/* Functionality to delete a post. Takes the ID of the post to delete. 
Removes it from the database and flashes a confirmation message on the home page. */
app.post("/delete/:id", async (req, res) => {
    var postID = parseInt(req.params.id);
    let db = await Connection.open(mongoUri, DB);
    let deleted = await db.collection(POSTS).deleteOne({ postID: postID });
    console.log("Deleted", deleted.deletedCount, "post with ID", postID);
    req.flash("info", "Deleted post.");
    return res.redirect("/");
})

/**
 * Post for deleting a comment. Takes the ID of the post to delete and gets the 
 * text, userID, and date of the comment in the body of the request. Flashes confirmation.
 */
app.post('/delete-comment/:id', async (req, res) => {
    const postID = parseInt(req.params.id);
    const text = req.body.commentText;
    const userID = req.body.userID;
    const date = req.body.date;

    let db = await Connection.open(mongoUri, DB);
    let posts = db.collection(POSTS);
    
    let deleteComment = await posts.updateOne(
        { postID: postID },
        { $pull: { comments: {text: text, userID: userID, date: date} } }
    );

    if (deleteComment.modifiedCount == true) {
        req.flash("info", "Deleted comment.");
    } else {
        req.flash("error", "Failed to delete comment. Please try again.");
    };
    
    return res.redirect("/post-single/" + postID);
})

/**
 * Renders the profile page, which shows the logged in user's information and the user's posts. 
 * If the user is not logged in, redirects to the home and flashes an error message. 
 */
app.get('/profile/posted', async (req, res) => {
    if (req.session.logged_in) {
        const db = await Connection.open(mongoUri, DB);
        const posts = db.collection(POSTS);
        const currentUser = await db.collection(USERS).findOne({ userID: req.session.uid });
        console.log("CURRENT USER", currentUser);

        let userPosts = await posts.find({ userID: currentUser.userID }).sort({ date: -1 }).toArray();

        console.log(userPosts)
        return res.render('profile.ejs', {
            user: currentUser,
            uid: req.session.uid,
            logged_in: req.session.logged_in,
            posts: userPosts,
            action: "Posted"
        });
    } else {
        req.flash('error', "Please log in to view your profile.");
        return res.redirect("/login");
    };
});

/* On the profile page, get the list of posts that the user has liked. 
Then, render the profile page (profile.ejs) with a gallery of liked posts. */
app.get('/profile/liked', async (req, res) => {
    const db = await Connection.open(mongoUri, DB);
    const likes = db.collection(LIKES);
    const posts = db.collection(POSTS);
    const currentUser = await db.collection(USERS).findOne({ userID: req.session.uid });

    let userLikedPosts = await likes.aggregate([
        {
            $match: {
                userID: req.session.uid
            }
        },
        {
            $lookup: {
                from: "posts",
                localField: "postID",
                foreignField: "postID",
                as: "likedPosts"
            },
        },
        {
            $unwind: "$likedPosts"
        },
        {
            $replaceRoot: {
                newRoot: "$likedPosts"
            }
        }
    ]).toArray();

    console.log(userLikedPosts);

    return res.render('profile.ejs', {
        user: currentUser,
        uid: req.session.uid,
        logged_in: req.session.logged_in,
        posts: userLikedPosts,
        action: "Liked"
    });
});

/**
 * Post request to handle commenting. 
 * Adds the comment to the database of comments if the user is logged in. 
 * If the user is not logged in, redirects to the home and flashes an error message. 
 */
app.post('/comment/:postID', async (req, res) => {
    if (req.session.logged_in) {
        let commentText = req.body.comment;
        let user = req.session.uid;
        let postID = parseInt(req.params.postID);

        let date = getDateAndTime();

        let comment = { text: commentText, userID: user, date: date }

        let db = await Connection.open(mongoUri, DB);
        const posts = db.collection(POSTS);

        let addComment = await posts.updateOne(
            { postID: postID },
            { $push: { comments: comment } }
        );
        console.log(addComment);

        return res.redirect("/post-single/" + postID);
    } else {
        let postID = parseInt(req.params.postID);
        req.flash("error", "Please log in to leave a comment.");
        return res.redirect("/post-single/" + postID);
    }
});

// render login page 
app.get("/login", (req, res) => {
    let uid = req.session.uid || false;
    let logged_in = req.session.logged_in || false;
    return res.render("login.ejs", { uid: uid, logged_in: logged_in });
})

/**
 * Processes a user login. 
 * If the user enters an incorrect username or password, flashes an error message. 
 */
app.post("/login", async (req, res) => {
    username = req.body.username;
    password = req.body.password;
    const db = await Connection.open(mongoUri, DB);
    let userdict = await db.collection(USERS).findOne(
        { userID: username }, { projection: { password: 1 } }
    );
    if (userdict == null) {
        console.log("failed login for", username);
        req.session.uid = false;
        req.session.logged_in = false;
        req.flash("error", "Login failed. Check your username and password and try again.")
        return res.redirect("/login");
    } else {
        let correctPassword = userdict.password;
        result = await bcrypt.compare(password, correctPassword);
        console.log('login status:', "\t", result);
        if (result == true) {
            console.log("successful login for", username);
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
    }

});

/**
 * Creates a new user in the database. 
 * If the username already exists, it does nothing. 
 */
app.post("/join", async (req, res) => {
    let hash = await bcrypt.hash(req.body.password, ROUNDS);
    insertUser(
        req.body.username,
        req.body.first,
        req.body.last,
        req.body.email,
        hash);
    console.log('signup stored', "\t", hash);
    req.session.uid = req.body.username;
    req.session.logged_in = true;
    req.flash('info', 'Account created for ' + req.body.first + '. You are now logged in.');
    return res.redirect("/");
});

// conventional non-Ajax logout, so redirects
app.post('/logout', (req, res) => {
    console.log('in logout');
    req.session.uid = false;
    req.session.logged_in = false;
    req.flash("error", "Successfully logged out.")
    res.redirect('/');
});


// ================================================================
// postlude

const serverPort = cs304.getPort(8080);

// this is last, because it never returns
app.listen(serverPort, function () {
    console.log(`open http://localhost:${serverPort}`);
});