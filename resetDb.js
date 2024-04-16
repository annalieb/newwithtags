const path = require('path');
require("dotenv").config({ path: path.join(process.env.HOME, '.cs304env')});
const { Connection } = require('./connection');
const cs304 = require('./cs304');

const mongoUri = cs304.getMongoUri();
const bcrypt = require('bcrypt');
const ROUNDS = 15;

const DBname = "newwithtags";
const POSTS = "posts";
const USERS = "users";
const LIKES = "likes";

/**
 * Lists all documents from the specified collection in the specified database.
 * @param {*} db 
 * @param {*} collection 
 * @returns 
 */
async function findDocuments(db, collection) {
  documents = await db.collection(collection).find({}).toArray();
  return documents;
}

/**
 * Inserts document(s) into the specified collection of newwithtags
 * @param {database} db
 * @param {list} ls
 * @return true if successfully inserted, false otherwise
 */
async function insertDocuments(db, collection, ls) {
  await db.collection(collection).insertMany(ls);

  // test to see if we successfully inserted post(s)
  let findInsertedDocuments = await findDocuments(db, collection);
  if (findInsertedDocuments.length == 0) {
    return false;
  } else {
    return true;
  }
}

/**
 * Deletes all documents from a collection
 * @param {database} db 
 * @param {collection} collection
 * @returns true if everything is deleted from collection, false otherwise
 */
async function deleteDocuments(db, collection) {
  await db.collection(collection).deleteMany({});
  
  let findDeletedPosts = await findDocuments(db, collection);

  if (findDeletedPosts.length == 0) {
    return true;
  } else {
    return false;
  }
}

/**
 * Main function to call the functions
 */
async function main() {
  const myDB = await Connection.open(mongoUri, DBname);

  // sample posts
  const post1 = {
    postID: 20001,
    imageURL: "../assets/uploads/img1.jpeg",
    comments: [
        {text: "I love this city!!", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"}, 
        {text: "Love your coat!", 
        userID: "mm124", 
        date: "2023-12-20 4:30:52"}
    ], 
    tags: [
        "#cottagecore", 
        "#fairycore"
    ],
    city: "boston",
    date: "2023-12-10 3:26:23",
    caption: "new city!! (this is the least liked post)"
  };

  const post2 = {
    postID: 20002,
    imageURL: "../assets/uploads/img2.jpeg",
    comments: [
        {text: "beautiful", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"}, 
        {text: "Love your coat!", 
        userID: "mm124", 
        date: "2023-12-20 4:30:52"},
        {text: "hey gurl", 
        userID: "sl120", 
        date: "2023-12-20 4:30:52"},
        {text: "Love your coat!", 
        userID: "al117", 
        date: "2023-12-20 4:18:56"},
        {text: "hi!", 
        userID: "mm124", 
        date: "2023-12-20 4:30:52"},
        {text: "cuteeeeee!", 
        userID: "mo104", 
        date: "2023-12-20 4:24:52"}
    ], 
    tags: [
        "#businesscasual", 
        "#city",
        "#corporate"
    ],
    city: "boston",
    date: "2023-12-20 3:26:23",
    caption: "check out my new coat! (this is the middle liked post)"
  };

  const post3 = {
    postID: 20003,
    imageURL: "../assets/uploads/img3.jpeg",
    comments: [
        {text: "this is so cool", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"}, 
    ], 
    tags: [
        "#cottagecore", 
        "#pastel",
        "#balletflats"
    ],
    city: "seattle",
    date: "2023-12-30 3:26:23",
    caption: "this city is so incredibly rainy but beautiful. (this is the most liked post)"
  };

  // sample users

  // all users will have the same password for now: 
  const user1 = {
    userID: "mo104", 
    userFirstName: "Maria", 
    userLastName: "Ordal", 
    password: await bcrypt.hash("123456", ROUNDS), 
    email: "mo104@wellesley.edu",
    dateCreated: "2023-12-20"
  };
  const user2 = {
    userID: "mm124", 
    userFirstName: "Maya",
    userLastName: "Mau",
    password: await bcrypt.hash("123456", ROUNDS),
    email: "mm124@wellesley.edu",
    dateCreated: "2023-11-20"
  };

  const user3 = {
    userID: "sl120", 
    userFirstName: "Soo",
    userLastName: "Lee",
    password: await bcrypt.hash("123456", ROUNDS),
    email: "sl120@wellesley.edu",
    dateCreated: "2024-04-16"
  };

  const user4 = {
    userID: "al117", 
    userFirstName: "Anna",
    userLastName: "Lieb",
    password: await bcrypt.hash("123456", ROUNDS),
    email: "al117@wellesley.edu",
    dateCreated: "2024-04-17"
  };

  // sample likes
  const like1 = {postID: 20001, userID: "mo104"};
  const like2 = {postID: 20002, userID: "mm124"};
  const like3 = {postID: 20002, userID: "mo104"};
  const like4 = {postID: 20003, userID: "sl120"};
  const like5 = {postID: 20003, userID: "al117"};
  const like6 = {postID: 20003, userID: "mo104"};


  let lsPosts = [post1, post2, post3];
  let lsUsers = [user1, user2, user3, user4];
  let lsLikes = [like1, like2, like3, like4, like5, like6];

  // delete all data from each collection
  let deletePosts = await deleteDocuments(myDB, POSTS);
  console.log("successfully deletePosts:", deletePosts);

  let deleteUsers = await deleteDocuments(myDB, USERS);
  console.log("successfully deleteUsers:", deleteUsers);

  let deleteLikes = await deleteDocuments(myDB, LIKES);
  console.log("successfully deleteLikes:", deleteLikes);
  
  // insert all data into each collection
  await insertDocuments(myDB, POSTS, lsPosts);
  await insertDocuments(myDB, USERS, lsUsers);
  await insertDocuments(myDB, LIKES, lsLikes);

  // print out all data
  let postsAfter = await findDocuments(myDB, POSTS);
  console.log("find posts after inserting:", postsAfter);

  let usersAfter = await findDocuments(myDB, USERS);
  console.log("find users after inserting:", usersAfter);

  let likesAfter = await findDocuments(myDB, LIKES);
  console.log("find likes after inserting:", likesAfter);


  await Connection.close();
}

main().catch(console.error);


